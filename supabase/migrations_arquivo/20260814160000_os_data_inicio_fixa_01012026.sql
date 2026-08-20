-- Data de Início das OS em branco passa a ser 01/01/2026 (desfaz 20260814150000).
--
-- O QUE MUDA EM RELAÇÃO À MIGRAÇÃO ANTERIOR
--    `20260814150000_os_data_inicio_backfill.sql` preenchia `data_inicio` das OS
--    nulas derivando a data de cada OS (`data_emissao`, caindo para `created_at`).
--    A decisão foi trocar por uma data única e explícita: 01/01/2026.
--
--    O ALVO CONTINUA O MESMO: só OS com `data_inicio` EM BRANCO. Nenhuma OS que
--    já tem data informada é lida ou alterada por esta migração — nem no passo
--    que desfaz a anterior (ele mexe apenas nas OS registradas no log dela, que
--    estavam em branco antes dela rodar), nem no passo que grava a data nova
--    (filtro `data_inicio is null`).
--
-- POR QUE UMA MIGRAÇÃO NOVA, E NÃO EDITAR A ANTERIOR
--    A anterior já foi commitada e pushada (e1294564), logo pode já ter rodado no
--    banco. Editar o arquivo não desfaria nada do que ela gravou — só faria o
--    histórico mentir. Esta migração é escrita para dar o mesmo resultado final
--    nos dois cenários:
--      · se a anterior JÁ rodou, o passo 1 devolve as datas dela para nulo e o
--        passo 3 regrava 01/01/2026;
--      · se ela AINDA NÃO rodou, o Lovable aplica as duas em sequência — a
--        primeira preenche, esta desfaz e regrava. Resultado idêntico.
--
-- A DATA É LITERAL, SEM EXCEÇÃO
--    Toda OS em branco recebe 01/01/2026, inclusive as que têm `data_fim`
--    anterior a essa data (OS encerradas em 2025 ou antes). Nessas o início fica
--    depois do término, e a criação de projeto em lote vai barrar com "Data de
--    Término deve ser posterior à Data de Início" (src/lib/projetosLote.ts:374).
--    É um caso raro no fluxo real — o seletor de lote só lista OS ABERTAS
--    (useOsAbertasComProdutos) — e tem saída pela interface, diferente do
--    bloqueio original: a Data Fim É editável no cadastro do cliente
--    (ContratosTab.tsx:388), então basta ajustá-la na tela. Essas OS ficam
--    marcadas com `termino_anterior_a_2026 = true` no log abaixo, para você
--    localizá-las de uma vez:
--      select ordem_servico_id from public.ordem_servico_data_inicio_backfill
--       where termino_anterior_a_2026;
--
-- EFEITO NO PAINEL — LEIA ANTES DE APLICAR
--    Com data derivada, cada OS caía no mês real dela. Com data única, as OS que
--    estavam em branco (~60% da base, ver BoardDashboardClientesOs.tsx:198-200)
--    passam a ter início em jan/2026: o gráfico de faturamento por mês ganha um
--    pico concentrado nesse mês, e o recorte por período passa a incluí-las apenas
--    quando o intervalo abrange 01/01/2026. Em troca, nenhuma OS fica travada por
--    falta de data — a data única não depende de a OS ter `data_emissao`.
--    Para distinguir 01/01/2026 real (início de contrato legítimo em 1º de
--    janeiro) de 01/01/2026 preenchida por este backfill, use a tabela de log:
--    só as OS listadas nela receberam a data artificialmente.
--
-- O QUE NÃO É TOCADO
--    · OS com `data_inicio` preenchida — nenhum dado real é sobrescrito;
--    · OS com `excluido = true`;
--    · `updated_at` — não há trigger dela em `ordem_servico`, e tocá-la faria a
--      maior parte da base parecer editada agora. Quando o backfill rodou fica
--      registrado no log;
--    · linhas cuja data já foi ajustada à mão depois da migração anterior: o
--      passo 1 só devolve para nulo o que ainda estiver com o valor que ela
--      gravou.
--
-- CONFERÊNCIA DEPOIS DE APLICAR:
--    select count(*) as preenchidas,
--           count(*) filter (where termino_anterior_a_2026) as termino_antes_de_2026
--      from public.ordem_servico_data_inicio_backfill;
--    select count(*) as ainda_nulas from public.ordem_servico
--     where data_inicio is null and excluido = false;   -- deve ser 0
--
-- REVERSÃO (volta as OS deste backfill para data_inicio nula):
--   update public.ordem_servico os
--      set data_inicio = null
--     from public.ordem_servico_data_inicio_backfill b
--    where b.ordem_servico_id = os.id
--      and os.data_inicio = b.data_inicio_gravada;
--   drop table public.ordem_servico_data_inicio_backfill;

BEGIN;

-- ───────── 1) desfaz o backfill derivado de 20260814150000, se ele rodou ─────────
-- Guardado por to_regclass: se a migração anterior nunca foi aplicada, a tabela
-- de log não existe e não há nada a desfazer.
do $$
begin
  if to_regclass('public.ordem_servico_data_inicio_backfill') is null then
    raise notice 'log de 20260814150000 nao existe: nada a desfazer';
    return;
  end if;

  -- Só devolve para nulo o que ainda está exatamente como aquela migração
  -- gravou. Data corrigida à mão no meio do caminho é dado humano e fica.
  update public.ordem_servico os
     set data_inicio = null
    from public.ordem_servico_data_inicio_backfill b
   where b.ordem_servico_id = os.id
     and os.data_inicio = b.data_inicio_gravada;
end $$;

-- ────────────────── 2) log recriado no formato deste backfill ──────────────────
-- O log anterior já cumpriu o papel (as datas dele foram desfeitas acima), e o
-- formato muda: não há mais "fonte" a registrar, porque a data agora é uma só.
drop table if exists public.ordem_servico_data_inicio_backfill;

create table public.ordem_servico_data_inicio_backfill (
  ordem_servico_id uuid primary key references public.ordem_servico(id) on delete cascade,
  data_inicio_gravada date not null,
  termino_anterior_a_2026 boolean not null default false,
  aplicado_em timestamptz not null default now()
);

comment on table public.ordem_servico_data_inicio_backfill is
  'Log do backfill de ordem_servico.data_inicio (migração 20260814160000): uma linha por OS que estava em branco e recebeu 01/01/2026. É o que permite reverter o backfill e o que separa 01/01/2026 preenchida artificialmente de 01/01/2026 real de contrato — OS fora desta tabela têm data informada no cadastro.';

comment on column public.ordem_servico_data_inicio_backfill.termino_anterior_a_2026 is
  'true quando a OS tem data_fim anterior a 01/01/2026, ou seja, ficou com início depois do término. A data gravada é 01/01/2026 mesmo assim (regra literal); estas OS precisam de ajuste na Data Fim pelo cadastro do cliente antes de virarem projeto.';

alter table public.ordem_servico_data_inicio_backfill enable row level security;

-- Log administrativo: leitura só para admin, nenhuma escrita pela API (quem grava
-- é a migração, via service_role).
drop policy if exists "admin le log de backfill de data_inicio"
  on public.ordem_servico_data_inicio_backfill;

create policy "admin le log de backfill de data_inicio"
  on public.ordem_servico_data_inicio_backfill
  for select
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ─────────────────────── 3) backfill com a data única ───────────────────────
with gravado as (
  update public.ordem_servico os
     set data_inicio = date '2026-01-01'
   where os.data_inicio is null
     and os.excluido = false
  returning os.id, os.data_inicio, (os.data_fim is not null and os.data_fim < date '2026-01-01') as termino_antes
)
insert into public.ordem_servico_data_inicio_backfill
  (ordem_servico_id, data_inicio_gravada, termino_anterior_a_2026)
select id, data_inicio, termino_antes from gravado
-- Idempotente: reaplicar não duplica log (e o update já não encontra linha,
-- porque data_inicio deixou de ser nula).
on conflict (ordem_servico_id) do nothing;

do $$
declare
  v_total int;
  v_termino int;
  v_restam int;
begin
  select count(*), count(*) filter (where termino_anterior_a_2026)
    into v_total, v_termino
    from public.ordem_servico_data_inicio_backfill;

  select count(*) into v_restam
    from public.ordem_servico
   where data_inicio is null and excluido = false;

  raise notice 'data_inicio = 01/01/2026 em % OS (% com data_fim anterior a 2026, precisam de ajuste na Data Fim); % OS seguem sem data_inicio',
    v_total, v_termino, v_restam;
end $$;

COMMIT;
