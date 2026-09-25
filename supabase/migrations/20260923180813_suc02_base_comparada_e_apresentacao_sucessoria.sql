-- SUC-02: o que o banco precisa para a apresentação de ITCMD (capítulo 04).
--
-- Três mudanças, todas ADITIVAS. Nenhuma coluna existente muda, e o front de hoje
-- continua funcionando com o banco depois desta migração:
--
--   1. `itcd_simulacao_concessao_base`, tabela nova: a guia de instituição de usufruto
--      apurada nas bases que NÃO foram escolhidas.
--   2. `osg_apresentacao.tipo` passa a aceitar `sucessoria`.
--   3. `itcd_gravar_simulacao` grava a tabela nova e deixa de gravar
--      `itcd_simulacao_gia.vlr_doacao_anterior`.
--
-- A remoção da coluna `vlr_doacao_anterior` NÃO está aqui: está na migração seguinte,
-- 20260923181406. Remover coluna é destrutivo, e o front ainda a lê
-- (`useSimulacoesItcmd`); ela só pode rodar depois que o front parar de ler. Esta aqui
-- pode rodar antes, porque a função abaixo já não depende da coluna.
--
-- Idempotente: tabela, índice e função com guarda; trigger, policies e trava pelo par
-- `drop ... if exists` + `create`.

-- ── O QUE ESTA MIGRAÇÃO PRESSUPÕE ──────────────────────────────────────────────
--
-- Produção recebe migração pela mão de uma pessoa, uma por vez, e não em ordem. Sem a
-- conferência abaixo, `create or replace function` criaria a função com sucesso mesmo
-- faltando tabela, porque o corpo em plpgsql só é validado na primeira execução — e o
-- erro apareceria para quem clicasse em gerar. Aqui a migração para, dizendo o que falta.
do $$
declare
  t text;
begin
  foreach t in array array['itcd_simulacao', 'itcd_simulacao_doador',
                           'itcd_simulacao_donatario', 'itcd_simulacao_gia',
                           'itcd_simulacao_usufruto', 'itcd_simulacao_concessao',
                           'osg_apresentacao', 'audit_logs']
  loop
    if to_regclass('public.' || t) is null then
      raise exception
        'public.% não existe. Aplique antes as migrations de schema do ITCD (20260826154524 a 20260831100000) e a 20260921174136 (osg_apresentacao).', t;
    end if;
  end loop;

  -- As três funções que as policies da tabela nova usam, as mesmas das irmãs.
  if to_regprocedure('public.cliente_id_de_itcd_simulacao(uuid)') is null
     or to_regprocedure('public.status_de_itcd_simulacao(uuid)') is null
     or to_regprocedure('public.cliente_visivel_para(uuid)') is null then
    raise exception
      'Faltam as funções de RLS do ITCD (cliente_id_de_itcd_simulacao, status_de_itcd_simulacao ou cliente_visivel_para). Aplique antes a 20260831210500_itcd_rls_ciclo_de_aprovacao.';
  end if;
end $$;


-- ══ 1. AS OUTRAS BASES DA GUIA DE INSTITUIÇÃO ═══════════════════════════════════
--
-- A guia de instituição de usufruto é apurada numa base escolhida — 100% (base
-- integral, art. 28, §3º, III do Decreto 2.125/03) ou 70% (redução do art. 11, §2º, I)
-- — e essa apuração mora na própria `itcd_simulacao_concessao`, que é o que a
-- calculadora inteira lê. A apresentação validada da Agro Aliança mostra as DUAS lado a
-- lado, porque é essa comparação que o cliente decide: pagar 70% agora é adiar, não
-- economizar.
--
-- POR QUE TABELA, E NÃO COLUNAS NA CONCESSÃO. A régua de valor (contábil · ITR ·
-- mercado) é dimensão fechada e sempre presente, e por isso é coluna em todo o schema
-- do ITCD. A base de cálculo é o contrário: aberta (o banco aceita qualquer percentual
-- entre 0 e 100) e opcional (a reserva não tem guia, e simulação antiga não foi
-- comparada). Dimensão assim é linha, e a linha diz sozinha qual base ela é.
--
-- A BASE ESCOLHIDA NÃO SE REPETE AQUI. Ela está na concessão; esta tabela guarda só as
-- outras. Nenhum valor fica gravado em dois lugares, e o trigger abaixo recusa a linha
-- que repetiria a escolhida.
--
-- O CÁLCULO É DA CALCULADORA, NA GRAVAÇÃO. A apresentação lê; não reapura. É a regra
-- do retrato: se o motor ou a lei mudarem, o número que foi aprovado continua o que era.
create table if not exists public.itcd_simulacao_concessao_base (
  id                   uuid primary key default gen_random_uuid(),
  -- Como nas outras filhas: é por ela que as policies chegam ao cliente e ao status.
  simulacao_id         uuid not null references public.itcd_simulacao(id) on delete cascade,
  -- A guia de instituição que esta linha reapura em outra base.
  concessao_id         uuid not null
                       references public.itcd_simulacao_concessao(id) on delete cascade,
  -- Qual base esta linha é, com 2 casas, como a GIA.
  pct_base             numeric(5,2) not null check (pct_base > 0 and pct_base <= 100),
  -- A apuração nas três réguas, obrigatória: base comparada pela metade não compara.
  vlr_base_contabil    numeric(18,2) not null check (vlr_base_contabil >= 0),
  vlr_base_itr         numeric(18,2) not null check (vlr_base_itr >= 0),
  vlr_base_mercado     numeric(18,2) not null check (vlr_base_mercado >= 0),
  vlr_imposto_contabil numeric(18,2) not null check (vlr_imposto_contabil >= 0),
  vlr_imposto_itr      numeric(18,2) not null check (vlr_imposto_itr >= 0),
  vlr_imposto_mercado  numeric(18,2) not null check (vlr_imposto_mercado >= 0),
  created_at           timestamp with time zone not null default now(),
  -- Uma apuração por base, por guia.
  constraint itcd_simulacao_concessao_base_unica unique (concessao_id, pct_base)
);

comment on table public.itcd_simulacao_concessao_base is
  'A guia de instituição de usufruto apurada nas bases que NÃO foram escolhidas. A '
  'escolhida (itcd_simulacao.pct_base_instituicao) mora na própria '
  'itcd_simulacao_concessao; aqui ficam as outras, para a apresentação comparar 100% com '
  '70%. Gravada pela calculadora, junto com a simulação, e nunca recalculada depois.';
comment on column public.itcd_simulacao_concessao_base.pct_base is
  'O percentual da base de cálculo desta apuração (100,00 = base integral). Nunca é o '
  'da base escolhida: esse fica na concessão.';

-- O `unique` já cobre `concessao_id`. Este serve à cascata e às policies, que chegam
-- pela simulação.
create index if not exists itcd_simulacao_concessao_base_simulacao_idx
  on public.itcd_simulacao_concessao_base (simulacao_id);

-- ── O QUE A TRAVA DE COLUNA NÃO ALCANÇA ─────────────────────────────────────────
--
-- Três regras olham OUTRA tabela, e `check` não faz isso. O `AGENTS.md` manda trigger
-- de validação para esse caso:
--
--   · a linha aponta para uma concessão DA MESMA simulação — senão as policies, que
--     leem `simulacao_id`, julgariam a linha pelo status de outra simulação;
--   · só a INSTITUIÇÃO tem base a comparar — a reserva não tem guia própria, e a
--     `itcd_simulacao_concessao_valores_ck` já a obriga a não ter valor;
--   · a base não é a escolhida — essa já está na concessão, e repetir criaria duas
--     verdades.
create or replace function public.itcd_simulacao_concessao_base_valida()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_simulacao   uuid;
  v_origem      public.itcd_origem_usufruto;
  v_pct_escolha numeric;
begin
  select c.simulacao_id, c.origem into v_simulacao, v_origem
  from public.itcd_simulacao_concessao c
  where c.id = new.concessao_id;

  if v_simulacao is null then
    raise exception 'A concessão % não existe.', new.concessao_id;
  end if;

  if v_simulacao <> new.simulacao_id then
    raise exception
      'A concessão % é de outra simulação: a base comparada tem de pertencer à mesma.',
      new.concessao_id;
  end if;

  if v_origem <> 'instituicao'::public.itcd_origem_usufruto then
    raise exception
      'Só a instituição de usufruto tem guia e base a comparar. A reserva vive dentro da guia da doação.';
  end if;

  select s.pct_base_instituicao into v_pct_escolha
  from public.itcd_simulacao s
  where s.id = new.simulacao_id;

  if new.pct_base = v_pct_escolha then
    -- `format`, e não o `%` do raise: ali `%` é marcador, e o sinal de percentual
    -- depois do número sairia trocado de lugar.
    raise exception using message = format(
      'A base de %s%% é a escolhida nesta simulação, e a apuração dela já está na concessão. Aqui ficam só as outras.',
      new.pct_base);
  end if;

  return new;
end $$;

drop trigger if exists itcd_simulacao_concessao_base_valida
  on public.itcd_simulacao_concessao_base;
create trigger itcd_simulacao_concessao_base_valida
  before insert or update on public.itcd_simulacao_concessao_base
  for each row execute function public.itcd_simulacao_concessao_base_valida();

-- ── RLS: A MESMA DAS IRMÃS ──────────────────────────────────────────────────────
--
-- Lê quem vê o cliente. Grava team_member para cima, e só enquanto a simulação não
-- está aprovada: depois de aprovada, a comparação trava junto com o resto do retrato,
-- porque ela também vai para o cliente.
alter table public.itcd_simulacao_concessao_base enable row level security;

drop policy if exists "osg_cluster_select_itcd_simulacao_concessao_base"
  on public.itcd_simulacao_concessao_base;
create policy "osg_cluster_select_itcd_simulacao_concessao_base"
  on public.itcd_simulacao_concessao_base for select to authenticated
  using (cliente_visivel_para(cliente_id_de_itcd_simulacao(simulacao_id)));

drop policy if exists "team_member+ can write itcd_simulacao_concessao_base"
  on public.itcd_simulacao_concessao_base;
create policy "team_member+ can write itcd_simulacao_concessao_base"
  on public.itcd_simulacao_concessao_base for all to authenticated
  using (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and status_de_itcd_simulacao(simulacao_id) <> 'aprovada'::public.itcd_simulacao_status
  )
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and status_de_itcd_simulacao(simulacao_id) <> 'aprovada'::public.itcd_simulacao_status
  );


-- ══ 2. O CAPÍTULO SUCESSÓRIO NO REGISTRO DE APRESENTAÇÕES ═══════════════════════
--
-- O capítulo 04 grava em `osg_apresentacao` como os capítulos 01 e 02: versão pela
-- unique `(cliente_id, tipo, versao)` e o conteúdo em `snapshot_dados` — as simulações
-- usadas, com o NOME da época, porque o nome pode mudar depois e uma simulação aprovada
-- pode ser apagada por líder. O tipo só precisa caber na trava.
--
-- A lista vai INTEIRA, repetindo a da 20260923153844 e pondo `sucessoria` no fim.
alter table public.osg_apresentacao drop constraint if exists osg_apresentacao_tipo_check;
alter table public.osg_apresentacao add constraint osg_apresentacao_tipo_check
  check (tipo in ('patrimonial', 'societaria', 'sucessoria'));


-- ══ 3. A GRAVAÇÃO DA SIMULAÇÃO ══════════════════════════════════════════════════
--
-- A mesma função da 20260902203616, com duas diferenças:
--
--   · a GUIA DA DOAÇÃO deixa de gravar `vlr_doacao_anterior`. A OSG não acompanha
--     doação anterior (o sistema da SEFAZ acumula sozinho ao emitir a guia), a tela
--     não tem o campo desde 31/08 e o controlador manda sempre nulo. Deixar de gravar
--     aqui é o que permite remover a coluna na 20260923181406 sem quebrar a função.
--     Front antigo que ainda mande a chave no payload não quebra: o
--     `jsonb_to_recordset` ignora chave que não está na lista;
--   · cada concessão do payload pode trazer `bases_comparadas`, uma lista de
--     `{ pct_base, vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
--     vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado }`, gravada em
--     `itcd_simulacao_concessao_base` na mesma transação. Front que não mande nada
--     grava como hoje.
--
-- A concessão da base comparada é achada pela chave natural dela — simulação, de,
-- para, origem, que é `unique` na concessão —, e a função confere que TODA base
-- enviada foi gravada. Base que não achasse a sua guia sumiria calada; aqui ela
-- derruba a gravação inteira.
create or replace function public.itcd_gravar_simulacao(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_versao integer;
  v_diff jsonb;
  v_bases_enviadas integer;
  v_bases_gravadas integer;
begin
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
    vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
    vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado
  )
  select v_id, g.doador_pessoa_id, g.donatario_pessoa_id, g.quotas_recebidas,
         g.pct_da_gia, g.vlr_base_contabil, g.vlr_base_itr, g.vlr_base_mercado,
         g.vlr_imposto_contabil, g.vlr_imposto_itr, g.vlr_imposto_mercado
  from jsonb_to_recordset(coalesce(p->'gias', '[]'::jsonb)) as g(
    doador_pessoa_id uuid, donatario_pessoa_id uuid, quotas_recebidas integer,
    pct_da_gia numeric, vlr_base_contabil numeric, vlr_base_itr numeric,
    vlr_base_mercado numeric, vlr_imposto_contabil numeric, vlr_imposto_itr numeric,
    vlr_imposto_mercado numeric
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

  -- `jsonb_typeof`, e não `coalesce`: a reserva pode vir com `"bases_comparadas": null`,
  -- que é null de JSON e não de SQL. O `coalesce` deixaria passar, e o
  -- `jsonb_array_length` estouraria num escalar.
  select coalesce(sum(jsonb_array_length(
           case when jsonb_typeof(e.j->'bases_comparadas') = 'array'
                then e.j->'bases_comparadas' else '[]'::jsonb end)), 0)
    into v_bases_enviadas
  from jsonb_array_elements(coalesce(p->'concessoes', '[]'::jsonb)) as e(j);

  insert into public.itcd_simulacao_concessao_base (
    simulacao_id, concessao_id, pct_base,
    vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
    vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado
  )
  select v_id, c.id, b.pct_base,
         b.vlr_base_contabil, b.vlr_base_itr, b.vlr_base_mercado,
         b.vlr_imposto_contabil, b.vlr_imposto_itr, b.vlr_imposto_mercado
  from jsonb_array_elements(coalesce(p->'concessoes', '[]'::jsonb)) as e(j)
  cross join lateral jsonb_to_recordset(
    case when jsonb_typeof(e.j->'bases_comparadas') = 'array'
         then e.j->'bases_comparadas' else '[]'::jsonb end
  ) as b(
    pct_base numeric, vlr_base_contabil numeric, vlr_base_itr numeric,
    vlr_base_mercado numeric, vlr_imposto_contabil numeric, vlr_imposto_itr numeric,
    vlr_imposto_mercado numeric
  )
  join public.itcd_simulacao_concessao c
    on c.simulacao_id = v_id
   and c.de_pessoa_id = (e.j->>'de_pessoa_id')::uuid
   and c.para_pessoa_id = (e.j->>'para_pessoa_id')::uuid
   and c.origem = (e.j->>'origem')::public.itcd_origem_usufruto;

  get diagnostics v_bases_gravadas = row_count;
  if v_bases_gravadas <> v_bases_enviadas then
    raise exception
      'Base comparada sem guia: % enviada(s), % gravada(s). A simulação não foi gravada.',
      v_bases_enviadas, v_bases_gravadas;
  end if;

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
    || jsonb_array_length(coalesce(p->'gias', '[]'::jsonb)) || ' guia(s), '
    || v_bases_gravadas || ' base(s) comparada(s). '
    || 'Imposto contábil do ato: '
    || coalesce(p->'simulacao'->>'vlr_imposto_contabil', '—') || '.'
  );

  return v_id;
end $$;

comment on function public.itcd_gravar_simulacao(jsonb) is
  'Grava o retrato inteiro da simulação de ITCD numa transação só, com as bases '
  'comparadas da instituição de usufruto (itcd_simulacao_concessao_base).';

revoke all on function public.itcd_gravar_simulacao(jsonb) from public;
grant execute on function public.itcd_gravar_simulacao(jsonb) to authenticated;

-- Os tipos citados nos corpos, conferidos aqui e não no primeiro uso: `create
-- function` em plpgsql não resolve o corpo, e um nome de enum trocado já passou pelo
-- `create` uma vez. `regtype` só resolve o nome, e falha se ele não existir.
do $$
begin
  perform 'public.itcd_papel_usufruto'::regtype;
  perform 'public.itcd_origem_usufruto'::regtype;
  perform 'public.itcd_simulacao_status'::regtype;
end $$;
