-- GRAVAR A SIMULAÇÃO EM UMA TRANSAÇÃO SÓ.
--
-- O que havia: a tela gravava o pai e depois cada filha em chamadas separadas do
-- PostgREST. Se uma filha falhasse, o código tentava desfazer excluindo o pai — e esse
-- desfazer não é confiável, porque INSERT é de `team_member` para cima e DELETE era de
-- `lider` para cima. Um analista criava, a filha falhava, o rollback era recusado pela
-- RLS e ficava no histórico uma simulação sem doador, sem donatário ou sem GIA: um
-- retrato pela metade, indistinguível de um completo na lista.
--
-- Não há como fazer isso pelo PostgREST: cada requisição é a sua própria transação. A
-- função abaixo recebe o retrato inteiro num `jsonb` e faz os seis inserts no mesmo
-- comando, então ou tudo entra ou nada entra. É plpgsql, e uma função é atômica: erro
-- em qualquer insert desfaz os anteriores sem ninguém pedir.
--
-- SECURITY INVOKER (o padrão), de propósito: a RLS continua valendo linha por linha,
-- com o papel de quem chamou. A função não é um portão para escrever o que a policy
-- proíbe; ela só junta o que já era permitido numa transação.
--
-- A VERSÃO é calculada aqui dentro, e isso conserta um segundo problema: a tela lia o
-- `max(versao)` numa consulta e gravava em outra, então duas abas abertas geravam a
-- mesma versão. Dentro da função a leitura e a escrita estão na mesma transação.

-- ── O QUE ESTA MIGRAÇÃO PRESSUPÕE, CONFERIDO ANTES ───────────────────────────
--
-- Produção não roda esta pasta em ordem: quem aplica é uma pessoa, pelo chat do
-- Lovable, uma migração por vez — o ledger de lá tem nomes próprios e não conhece
-- estes arquivos. Então a ordem não é garantida por mecanismo nenhum, e este arquivo
-- não pode presumir que os anteriores já rodaram.
--
-- Sem as linhas abaixo o desalinho seria SILENCIOSO no pior lugar: `create or replace
-- function` não valida o corpo em plpgsql, então a função seria criada com sucesso
-- referindo coluna e tabela que não existem, e o erro apareceria na cara de quem
-- clicasse em gerar. Foi assim que um nome de enum trocado passou pelo `create` uma
-- vez. Aqui a migração para, dizendo o que aplicar antes.
--
-- Medido em 01/09/2026: produção tem `itcd_simulacao`, `_doador` e `_donatario`, e NÃO
-- tem `_gia`, `_usufruto`, `_concessao`, nem as colunas de usufruto.
do $$
declare
  t text;
  c text;
begin
  foreach t in array array['itcd_simulacao', 'itcd_simulacao_doador',
                           'itcd_simulacao_donatario', 'itcd_simulacao_gia',
                           'itcd_simulacao_usufruto', 'itcd_simulacao_concessao',
                           'audit_logs']
  loop
    if to_regclass('public.' || t) is null then
      raise exception
        'public.% não existe. Aplique antes as migrations de schema do ITCD, de 20260826154524 a 20260831100000.', t;
    end if;
  end loop;

  -- Estas três nascem na 20260828170000 (usufruto), e a função grava nelas.
  foreach c in array array['com_reserva', 'pct_base_reserva', 'pct_base_instituicao']
  loop
    if not exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'itcd_simulacao' and column_name = c
    ) then
      raise exception
        'itcd_simulacao.% não existe. Aplique antes a 20260828170000_itcd_simulacao_usufruto.', c;
    end if;
  end loop;
end $$;

create or replace function public.itcd_gravar_simulacao(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_versao integer;
  v_diff jsonb;
begin
  -- A TRILHA É PARTE DA GRAVAÇÃO, e `audit_logs.performed_by` é NOT NULL. Sem usuário
  -- na sessão o insert do log estouraria com violação de coluna, no fim de tudo; a
  -- mensagem abaixo diz o que aconteceu, antes de escrever qualquer linha.
  if auth.uid() is null then
    raise exception
      'Sessão sem usuário: a simulação não foi gravada porque a trilha de auditoria exige quem fez.';
  end if;

  select coalesce(max(versao), 0) + 1 into v_versao
  from public.itcd_simulacao
  where cliente_id = (p->'simulacao'->>'cliente_id')::uuid;

  insert into public.itcd_simulacao (
    cliente_id, empresa_pessoa_id, status, competencia, vlr_upf, quotas_total,
    vlr_acervo_contabil, vlr_acervo_itr, vlr_acervo_mercado,
    vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado,
    versao, origem_simulacao_id, com_reserva, pct_base_reserva, pct_base_instituicao,
    created_by
  )
  select
    s.cliente_id, s.empresa_pessoa_id, 'gerada'::public.itcd_simulacao_status,
    s.competencia, s.vlr_upf, s.quotas_total,
    s.vlr_acervo_contabil, s.vlr_acervo_itr, s.vlr_acervo_mercado,
    s.vlr_imposto_contabil, s.vlr_imposto_itr, s.vlr_imposto_mercado,
    v_versao, s.origem_simulacao_id, s.com_reserva,
    s.pct_base_reserva, s.pct_base_instituicao,
    auth.uid()
  from jsonb_to_record(p->'simulacao') as s(
    cliente_id uuid, empresa_pessoa_id uuid, competencia text, vlr_upf numeric,
    quotas_total integer, vlr_acervo_contabil numeric, vlr_acervo_itr numeric,
    vlr_acervo_mercado numeric, vlr_imposto_contabil numeric, vlr_imposto_itr numeric,
    vlr_imposto_mercado numeric, origem_simulacao_id uuid, com_reserva boolean,
    pct_base_reserva numeric, pct_base_instituicao numeric
  )
  returning id into v_id;

  -- A ORIGEM PRECISA SER DA MESMA SOCIEDADE. A tela já filtra, e a guarda repete aqui
  -- porque `origem_simulacao_id` é FK livre: pelo PostgREST dava para apontar um ato de
  -- outra empresa e herdar o quadro dela.
  if exists (
    select 1 from public.itcd_simulacao o
    where o.id = (p->'simulacao'->>'origem_simulacao_id')::uuid
      and o.empresa_pessoa_id <> (p->'simulacao'->>'empresa_pessoa_id')::uuid
  ) then
    raise exception
      'Origem de outra sociedade: o ato encadeado tem de partir de uma simulação da mesma empresa.';
  end if;

  insert into public.itcd_simulacao_doador (
    simulacao_id, doador_pessoa_id, quotas, quotas_transmitidas, quotas_final,
    emissao_conjunta, conjuge_pessoa_id, vlr_aporte_moeda, quotas_do_aporte
  )
  select v_id, d.doador_pessoa_id, d.quotas, d.quotas_transmitidas, d.quotas_final,
         d.emissao_conjunta, d.conjuge_pessoa_id, d.vlr_aporte_moeda, d.quotas_do_aporte
  from jsonb_to_recordset(coalesce(p->'doadores', '[]'::jsonb)) as d(
    doador_pessoa_id uuid, quotas integer, quotas_transmitidas integer,
    quotas_final integer, emissao_conjunta boolean, conjuge_pessoa_id uuid,
    vlr_aporte_moeda numeric, quotas_do_aporte integer
  );

  insert into public.itcd_simulacao_donatario (
    simulacao_id, donatario_pessoa_id, quotas_atuais, quotas_legitima,
    quotas_disponivel, quotas_final, percentual, vlr_aporte_moeda, quotas_do_aporte
  )
  select v_id, d.donatario_pessoa_id, d.quotas_atuais, d.quotas_legitima,
         d.quotas_disponivel, d.quotas_final, d.percentual, d.vlr_aporte_moeda,
         d.quotas_do_aporte
  from jsonb_to_recordset(coalesce(p->'donatarios', '[]'::jsonb)) as d(
    donatario_pessoa_id uuid, quotas_atuais integer, quotas_legitima integer,
    quotas_disponivel integer, quotas_final integer, percentual numeric,
    vlr_aporte_moeda numeric, quotas_do_aporte integer
  );

  insert into public.itcd_simulacao_gia (
    simulacao_id, doador_pessoa_id, donatario_pessoa_id, quotas_recebidas, pct_da_gia,
    vlr_doacao_anterior, vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
    vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado
  )
  select v_id, g.doador_pessoa_id, g.donatario_pessoa_id, g.quotas_recebidas,
         g.pct_da_gia, g.vlr_doacao_anterior, g.vlr_base_contabil, g.vlr_base_itr,
         g.vlr_base_mercado, g.vlr_imposto_contabil, g.vlr_imposto_itr,
         g.vlr_imposto_mercado
  from jsonb_to_recordset(coalesce(p->'gias', '[]'::jsonb)) as g(
    doador_pessoa_id uuid, donatario_pessoa_id uuid, quotas_recebidas integer,
    pct_da_gia numeric, vlr_doacao_anterior numeric, vlr_base_contabil numeric,
    vlr_base_itr numeric, vlr_base_mercado numeric, vlr_imposto_contabil numeric,
    vlr_imposto_itr numeric, vlr_imposto_mercado numeric
  );

  insert into public.itcd_simulacao_usufruto (
    simulacao_id, pessoa_id, papel, quotas, quotas_plena, quotas_nua_reserva,
    quotas_nua_instituicao, quotas_usufruto
  )
  select v_id, u.pessoa_id, u.papel::public.itcd_papel_usufruto, u.quotas,
         u.quotas_plena, u.quotas_nua_reserva, u.quotas_nua_instituicao,
         u.quotas_usufruto
  from jsonb_to_recordset(coalesce(p->'usufruto', '[]'::jsonb)) as u(
    pessoa_id uuid, papel text, quotas integer, quotas_plena integer,
    quotas_nua_reserva integer, quotas_nua_instituicao integer, quotas_usufruto integer
  );

  insert into public.itcd_simulacao_concessao (
    simulacao_id, de_pessoa_id, para_pessoa_id, origem, quotas,
    vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
    vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado
  )
  select v_id, c.de_pessoa_id, c.para_pessoa_id,
         c.origem::public.itcd_origem_usufruto, c.quotas,
         c.vlr_base_contabil, c.vlr_base_itr, c.vlr_base_mercado,
         c.vlr_imposto_contabil, c.vlr_imposto_itr, c.vlr_imposto_mercado
  from jsonb_to_recordset(coalesce(p->'concessoes', '[]'::jsonb)) as c(
    de_pessoa_id uuid, para_pessoa_id uuid, origem text, quotas integer,
    vlr_base_contabil numeric, vlr_base_itr numeric, vlr_base_mercado numeric,
    vlr_imposto_contabil numeric, vlr_imposto_itr numeric, vlr_imposto_mercado numeric
  );

  -- ── A TRILHA, DENTRO DA MESMA TRANSAÇÃO ─────────────────────────────────────
  --
  -- Antes o log era escrito pelo cliente, depois da RPC voltar, e de propósito não
  -- propagava falha: a simulação estava gravada e desfazê-la por causa do registro
  -- pareceria pior. O efeito é que uma recusa de RLS no `audit_logs` deixava simulação
  -- gravada sem rastro de quem a criou — e o `AGENTS.md` põe auditoria de CUD como
  -- obrigatória. Aqui dentro não há esse dilema: se o log não entra, nada entra.
  --
  -- `changed_fields` na criação é o de-para com `old` nulo, campo a campo, montado do
  -- próprio payload — mais `versao` e `status`, que são decididos aqui e não vêm da
  -- tela. É o diff que o AGENTS.md pede, e ele nasce do que foi realmente gravado.
  select jsonb_object_agg(campo.k, jsonb_build_object('old', null, 'new', campo.v))
    into v_diff
  from jsonb_each(
    (p->'simulacao')
    || jsonb_build_object('versao', v_versao, 'status', 'gerada')
  ) as campo(k, v);

  insert into public.audit_logs (
    area, entity_type, entity_id, entity_name, action, changed_fields, performed_by, details
  )
  values (
    'osg', 'itcd_simulacao', v_id,
    'Versão ' || v_versao || ' · ' || coalesce(p->'simulacao'->>'competencia', '—'),
    'created', v_diff, auth.uid(),
    jsonb_array_length(coalesce(p->'doadores', '[]'::jsonb)) || ' doador(es), '
    || jsonb_array_length(coalesce(p->'donatarios', '[]'::jsonb)) || ' beneficiário(s), '
    || jsonb_array_length(coalesce(p->'gias', '[]'::jsonb)) || ' guia(s). '
    || 'Imposto contábil do ato: '
    || coalesce(p->'simulacao'->>'vlr_imposto_contabil', '—') || '.'
  );

  return v_id;
end $$;

comment on function public.itcd_gravar_simulacao(jsonb) is
  'Grava o retrato inteiro da simulação de ITCD numa transação só. Substitui a '
  'sequência de inserts da tela, cujo rollback dependia de um DELETE que a RLS '
  'recusava para quem podia criar.';

revoke all on function public.itcd_gravar_simulacao(jsonb) from public;
grant execute on function public.itcd_gravar_simulacao(jsonb) to authenticated;

-- OS TIPOS CITADOS NO CORPO, CONFERIDOS AQUI E NÃO NO PRIMEIRO USO.
--
-- `create function` em plpgsql não resolve o que está dentro do corpo: o corpo é texto
-- até a primeira execução. Esta função foi aplicada uma vez com um nome de enum trocado
-- (`itcd_usufruto_papel`, quando o real é `itcd_papel_usufruto`) e o `create` respondeu
-- sucesso; quem descobriu foi o analista, ao clicar em gerar, com a simulação perdida.
--
-- As duas linhas abaixo fazem o mesmo erro derrubar a MIGRAÇÃO. Não alteram schema:
-- `regtype` só resolve o nome, e falha se ele não existir.
do $$
begin
  perform 'public.itcd_papel_usufruto'::regtype;
  perform 'public.itcd_origem_usufruto'::regtype;
  perform 'public.itcd_simulacao_status'::regtype;
end $$;