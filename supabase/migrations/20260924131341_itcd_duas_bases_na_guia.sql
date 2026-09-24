-- SUC-02: a base de cálculo (100% × 70%) deixa de ser escolha da simulação.
--
-- A apresentação vai ao cliente ANTES de ele decidir entre a base integral (art. 28,
-- §3º, III do Decreto 2.125/03, que encerra a tributação) e a reduzida (art. 11, §2º, I,
-- que deixa parcela devida na extinção do usufruto) — e as duas estão certas. A partir
-- desta migração a calculadora apura e grava AS DUAS em toda guia que tem a alternativa:
-- a guia da doação com reserva de usufruto e a guia de instituição. A tela só alterna
-- qual delas se vê. Decisão de 24/09/2026.
--
-- Quatro mudanças:
--
--   1. `itcd_simulacao_gia` e `itcd_simulacao_concessao` ganham a MESMA GUIA NA OUTRA
--      BASE, em sete colunas `_alternativa`, ao lado das de sempre: uma linha por guia,
--      com as duas bases, igual nas duas tabelas.
--   2. `itcd_gravar_simulacao` grava as colunas novas a partir de `base_alternativa`, em
--      cada guia e em cada concessão do payload.
--   3. Sai `itcd_simulacao_concessao_base`, que a 20260923180813 criou para a mesma
--      coisa, só na instituição e como "a base que não foi escolhida". Está vazia.
--   4. `pct_base_reserva` e `pct_base_instituicao` FICAM, e mudam de papel: dizem em que
--      base estão as colunas de sempre. As simulações gravadas antes desta migração
--      guardavam ali a base que estava marcada na tela; as novas gravam 100.
--
-- COMPATÍVEL COM O FRONT DE HOJE. Em produção a coluna chega antes do código que a usa
-- (AGENTS.md, "Dois bancos"), e o front publicado não manda `base_alternativa`: a
-- função grava as colunas novas nulas e a guia sai como sempre saiu.
--
-- Idempotente: colunas por `add column if not exists`, travas pelo par `drop ... if
-- exists` + `add`, a função por `create or replace` e a tabela por `drop ... if exists`.

-- ── O QUE ESTA MIGRAÇÃO PRESSUPÕE ──────────────────────────────────────────────
do $$
declare
  t text;
begin
  foreach t in array array['itcd_simulacao', 'itcd_simulacao_doador',
                           'itcd_simulacao_donatario', 'itcd_simulacao_gia',
                           'itcd_simulacao_usufruto', 'itcd_simulacao_concessao',
                           'audit_logs']
  loop
    if to_regclass('public.' || t) is null then
      raise exception
        'public.% não existe. Aplique antes as migrations de schema do ITCD (20260826154524 a 20260831100000).', t;
    end if;
  end loop;
end $$;


-- ══ 1. A OUTRA BASE, NA PRÓPRIA GUIA ════════════════════════════════════════════
--
-- POR QUE COLUNAS, E NÃO A TABELA DA 20260923180813. A tabela foi desenhada para "as
-- bases que não foram escolhidas", aberta a qualquer percentual e a várias linhas por
-- guia. Sem escolha, o caso real é um só e fechado: toda guia com alternativa tem as
-- duas bases, a integral e a reduzida. Dimensão fechada e sempre presente é coluna em
-- todo o schema do ITCD — é assim que as três réguas (contábil, ITR, mercado) estão —,
-- e com as duas bases na mesma linha a guia se lê inteira, sem junção.
--
-- A INTEGRAL MORA NAS COLUNAS DE SEMPRE; A REDUZIDA, NAS NOVAS. `pct_base_alternativa`
-- não é redundante: é o que diz, na própria linha, que ela é a de 70%.
alter table public.itcd_simulacao_gia
  add column if not exists pct_base_alternativa             numeric(5,2),
  add column if not exists vlr_base_alternativa_contabil    numeric(18,2)
    check (vlr_base_alternativa_contabil >= 0),
  add column if not exists vlr_base_alternativa_itr         numeric(18,2)
    check (vlr_base_alternativa_itr >= 0),
  add column if not exists vlr_base_alternativa_mercado     numeric(18,2)
    check (vlr_base_alternativa_mercado >= 0),
  add column if not exists vlr_imposto_alternativo_contabil numeric(18,2)
    check (vlr_imposto_alternativo_contabil >= 0),
  add column if not exists vlr_imposto_alternativo_itr      numeric(18,2)
    check (vlr_imposto_alternativo_itr >= 0),
  add column if not exists vlr_imposto_alternativo_mercado  numeric(18,2)
    check (vlr_imposto_alternativo_mercado >= 0);

alter table public.itcd_simulacao_concessao
  add column if not exists pct_base_alternativa             numeric(5,2),
  add column if not exists vlr_base_alternativa_contabil    numeric(18,2)
    check (vlr_base_alternativa_contabil >= 0),
  add column if not exists vlr_base_alternativa_itr         numeric(18,2)
    check (vlr_base_alternativa_itr >= 0),
  add column if not exists vlr_base_alternativa_mercado     numeric(18,2)
    check (vlr_base_alternativa_mercado >= 0),
  add column if not exists vlr_imposto_alternativo_contabil numeric(18,2)
    check (vlr_imposto_alternativo_contabil >= 0),
  add column if not exists vlr_imposto_alternativo_itr      numeric(18,2)
    check (vlr_imposto_alternativo_itr >= 0),
  add column if not exists vlr_imposto_alternativo_mercado  numeric(18,2)
    check (vlr_imposto_alternativo_mercado >= 0);

-- TUDO OU NADA, E SÓ 70%. As sete vêm juntas — base pela metade não é alternativa, e a
-- apresentação mostraria coluna incompleta — ou ficam todas nulas: doação sem reserva
-- (que só existe em 100%) e guia gravada antes desta migração. Sete nulos e sete
-- preenchidos são os dois únicos estados, e `num_nulls` diz qual.
alter table public.itcd_simulacao_gia
  drop constraint if exists itcd_simulacao_gia_alternativa_ck;
alter table public.itcd_simulacao_gia
  add constraint itcd_simulacao_gia_alternativa_ck check (
    num_nulls(pct_base_alternativa,
              vlr_base_alternativa_contabil, vlr_base_alternativa_itr,
              vlr_base_alternativa_mercado, vlr_imposto_alternativo_contabil,
              vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado) = 7
    or (num_nulls(pct_base_alternativa,
                  vlr_base_alternativa_contabil, vlr_base_alternativa_itr,
                  vlr_base_alternativa_mercado, vlr_imposto_alternativo_contabil,
                  vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado) = 0
        and pct_base_alternativa = 70)
  );

-- Na concessão, a mesma regra, e a RESERVA sem nenhuma: ela não tem guia própria (a
-- `itcd_simulacao_concessao_valores_ck` já a obriga a não ter valor), então não tem
-- base para ter duas.
alter table public.itcd_simulacao_concessao
  drop constraint if exists itcd_simulacao_concessao_alternativa_ck;
alter table public.itcd_simulacao_concessao
  add constraint itcd_simulacao_concessao_alternativa_ck check (
    num_nulls(pct_base_alternativa,
              vlr_base_alternativa_contabil, vlr_base_alternativa_itr,
              vlr_base_alternativa_mercado, vlr_imposto_alternativo_contabil,
              vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado) = 7
    or (origem = 'instituicao'
        and num_nulls(pct_base_alternativa,
                      vlr_base_alternativa_contabil, vlr_base_alternativa_itr,
                      vlr_base_alternativa_mercado, vlr_imposto_alternativo_contabil,
                      vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado) = 0
        and pct_base_alternativa = 70)
  );

comment on column public.itcd_simulacao_gia.pct_base_alternativa is
  'A mesma guia na base reduzida (70,00), ao lado da integral nas colunas de sempre. Nenhuma '
  'das duas é a decisão: quem escolhe é o cliente. Nulo sem reserva de usufruto (a guia só '
  'existe em 100%) e na guia gravada antes de 24/09/2026.';
comment on column public.itcd_simulacao_concessao.pct_base_alternativa is
  'A mesma guia de instituição na base reduzida (70,00), ao lado da integral nas colunas de '
  'sempre. Nenhuma das duas é a decisão: quem escolhe é o cliente. Nulo na reserva, que não '
  'tem guia, e na guia gravada antes de 24/09/2026.';
comment on column public.itcd_simulacao.pct_base_reserva is
  'Em que base estão as colunas de sempre das guias da doação. 100 desde 24/09/2026, quando '
  'as duas bases passaram a ser gravadas; antes, a base que estava marcada na tela.';
comment on column public.itcd_simulacao.pct_base_instituicao is
  'Em que base estão as colunas de sempre das guias de instituição. 100 desde 24/09/2026, '
  'quando as duas bases passaram a ser gravadas; antes, a base que estava marcada na tela.';


-- ══ 2. A GRAVAÇÃO DA SIMULAÇÃO ══════════════════════════════════════════════════
--
-- A mesma função da 20260923180813, com a outra base na própria guia:
--
--   · cada guia e cada concessão do payload pode trazer `base_alternativa`, um objeto
--     `{ pct_base, vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
--     vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado }`, gravado nas colunas
--     `_alternativa` da mesma linha. Ausente ou `null`, as colunas ficam nulas — é o que
--     manda o front publicado hoje, e ele segue gravando como grava;
--   · sai `bases_comparadas`, que ia para a tabela removida abaixo. Payload que ainda
--     traga a chave não quebra: o `jsonb_to_recordset` ignora chave fora da lista;
--   · DOAÇÃO SEM RESERVA NÃO TEM ALTERNATIVA: a redução de 70% é do usufruto. A trava de
--     coluna não alcança isso (a reserva mora na simulação), então a função confere.
create or replace function public.itcd_gravar_simulacao(p jsonb)
returns uuid
language plpgsql
set search_path = public
as $$
declare
  v_id uuid;
  v_versao integer;
  v_diff jsonb;
  v_alternativas integer;
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

  -- `->>` em JSON `null` devolve SQL nulo, como a chave ausente: os dois casos gravam
  -- as sete colunas nulas, que é o estado que a trava aceita.
  insert into public.itcd_simulacao_gia (
    simulacao_id, doador_pessoa_id, donatario_pessoa_id, quotas_recebidas, pct_da_gia,
    vlr_base_contabil, vlr_base_itr, vlr_base_mercado,
    vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado,
    pct_base_alternativa,
    vlr_base_alternativa_contabil, vlr_base_alternativa_itr, vlr_base_alternativa_mercado,
    vlr_imposto_alternativo_contabil, vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado
  )
  select v_id, g.doador_pessoa_id, g.donatario_pessoa_id, g.quotas_recebidas,
         g.pct_da_gia, g.vlr_base_contabil, g.vlr_base_itr, g.vlr_base_mercado,
         g.vlr_imposto_contabil, g.vlr_imposto_itr, g.vlr_imposto_mercado,
         (g.base_alternativa->>'pct_base')::numeric,
         (g.base_alternativa->>'vlr_base_contabil')::numeric,
         (g.base_alternativa->>'vlr_base_itr')::numeric,
         (g.base_alternativa->>'vlr_base_mercado')::numeric,
         (g.base_alternativa->>'vlr_imposto_contabil')::numeric,
         (g.base_alternativa->>'vlr_imposto_itr')::numeric,
         (g.base_alternativa->>'vlr_imposto_mercado')::numeric
  from jsonb_to_recordset(coalesce(p->'gias', '[]'::jsonb)) as g(
    doador_pessoa_id uuid, donatario_pessoa_id uuid, quotas_recebidas integer,
    pct_da_gia numeric, vlr_base_contabil numeric, vlr_base_itr numeric,
    vlr_base_mercado numeric, vlr_imposto_contabil numeric, vlr_imposto_itr numeric,
    vlr_imposto_mercado numeric, base_alternativa jsonb
  );

  if not coalesce((p->'simulacao'->>'com_reserva')::boolean, false) and exists (
    select 1 from public.itcd_simulacao_gia g
    where g.simulacao_id = v_id and g.pct_base_alternativa is not null
  ) then
    raise exception
      'Doação sem reserva de usufruto só existe na base integral: a guia não leva a base de 70%%. A simulação não foi gravada.';
  end if;

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
    vlr_imposto_contabil, vlr_imposto_itr, vlr_imposto_mercado,
    pct_base_alternativa,
    vlr_base_alternativa_contabil, vlr_base_alternativa_itr, vlr_base_alternativa_mercado,
    vlr_imposto_alternativo_contabil, vlr_imposto_alternativo_itr, vlr_imposto_alternativo_mercado
  )
  select v_id, c.de_pessoa_id, c.para_pessoa_id,
         c.origem::public.itcd_origem_usufruto, c.quotas,
         c.vlr_base_contabil, c.vlr_base_itr, c.vlr_base_mercado,
         c.vlr_imposto_contabil, c.vlr_imposto_itr, c.vlr_imposto_mercado,
         (c.base_alternativa->>'pct_base')::numeric,
         (c.base_alternativa->>'vlr_base_contabil')::numeric,
         (c.base_alternativa->>'vlr_base_itr')::numeric,
         (c.base_alternativa->>'vlr_base_mercado')::numeric,
         (c.base_alternativa->>'vlr_imposto_contabil')::numeric,
         (c.base_alternativa->>'vlr_imposto_itr')::numeric,
         (c.base_alternativa->>'vlr_imposto_mercado')::numeric
  from jsonb_to_recordset(coalesce(p->'concessoes', '[]'::jsonb)) as c(
    de_pessoa_id uuid, para_pessoa_id uuid, origem text, quotas integer,
    vlr_base_contabil numeric, vlr_base_itr numeric, vlr_base_mercado numeric,
    vlr_imposto_contabil numeric, vlr_imposto_itr numeric, vlr_imposto_mercado numeric,
    base_alternativa jsonb
  );

  select (select count(*) from public.itcd_simulacao_gia
          where simulacao_id = v_id and pct_base_alternativa is not null)
       + (select count(*) from public.itcd_simulacao_concessao
          where simulacao_id = v_id and pct_base_alternativa is not null)
    into v_alternativas;

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
    || v_alternativas || ' guia(s) também na base de 70%. '
    || 'Imposto contábil do ato: '
    || coalesce(p->'simulacao'->>'vlr_imposto_contabil', '—') || '.'
  );

  return v_id;
end $$;

comment on function public.itcd_gravar_simulacao(jsonb) is
  'Grava o retrato inteiro da simulação de ITCD numa transação só, com as duas bases de '
  'cálculo (100% e 70%) de toda guia que tem a alternativa, nas colunas _alternativa.';

revoke all on function public.itcd_gravar_simulacao(jsonb) from public;
grant execute on function public.itcd_gravar_simulacao(jsonb) to authenticated;


-- ══ 3. SAI A TABELA DAS "BASES COMPARADAS" ═════════════════════════════════════
--
-- Ela só era gravada pela função acima na versão da 20260923180813, e o front publicado
-- nunca a usou: está vazia onde existe. A conferência não apaga dado calada — se houver
-- linha, a migração para e diz, e quem aplica decide o que fazer com ela.
--
-- DOIS `if`, e não um `and`: o Postgres resolve a tabela da consulta ao planejar a
-- expressão inteira, e na segunda execução — já sem a tabela — o `and` quebraria a
-- idempotência. O `if` de dentro só é planejado quando a tabela existe.
do $$
begin
  if to_regclass('public.itcd_simulacao_concessao_base') is not null then
    if exists (select 1 from public.itcd_simulacao_concessao_base) then
      raise exception
        'itcd_simulacao_concessao_base tem linhas. Esta migração não apaga dado: leve-as para as colunas _alternativa da itcd_simulacao_concessao antes de rodá-la.';
    end if;
  end if;
end $$;

-- As policies, o índice e o trigger saem com a tabela; a função do trigger, não.
drop table if exists public.itcd_simulacao_concessao_base;
drop function if exists public.itcd_simulacao_concessao_base_valida();


-- Os tipos citados no corpo da função, conferidos aqui e não no primeiro uso: `create
-- function` em plpgsql não resolve o corpo, e um nome de enum trocado já passou pelo
-- `create` uma vez. `regtype` só resolve o nome, e falha se ele não existir.
do $$
begin
  perform 'public.itcd_papel_usufruto'::regtype;
  perform 'public.itcd_origem_usufruto'::regtype;
  perform 'public.itcd_simulacao_status'::regtype;
end $$;
