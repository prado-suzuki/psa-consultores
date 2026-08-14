-- Backfill da Data de Início das OS antigas (destrava a criação de projetos).
--
-- O PROBLEMA
--    Criar projetos a partir da OS morre em "A OS não possui Data de Início"
--    (validateLoteRow, src/lib/projetosLote.ts:372) e não existe saída pela
--    interface:
--      · na tela de lote as datas do projeto são COPIADAS da OS e não são
--        editáveis — o snapshot é congelado em useProjetosLoteController.ts:27;
--      · no cadastro do cliente a "Data Início" da OS é read-only de propósito
--        (ContratosTab.tsx:377-385, "Data de abertura da OS. Não é editável"),
--        porque mudá-la depois desalinharia a OS do que foi combinado.
--    OS criadas hoje já nascem com data (ContratosTab.tsx:220 grava `hoje`), mas
--    as antigas ficaram nulas — e o comentário do painel registra a escala:
--    ~60% das OS sem `data_inicio` (BoardDashboardClientesOs.tsx:198-200).
--
-- POR QUE `data_emissao` PRIMEIRO, E `created_at` SÓ DEPOIS
--    `data_emissao` é a data real da OS, informada no cadastro — é o dado mais
--    próximo de "abertura da OS", que é o significado da coluna. `created_at` é
--    a data em que a LINHA entrou no banco (importação/digitação), então serve
--    só como último recurso: para essas OS a data é uma aproximação, não um fato
--    do contrato. O fuso é convertido para America/Sao_Paulo antes do ::date —
--    `created_at` é timestamptz e um cadastro feito às 21h no Brasil viraria o
--    dia seguinte se caísse no UTC direto.
--
-- POR QUE O CLAMP EM `data_fim`
--    A mesma validação também rejeita início posterior ao término
--    (projetosLote.ts:374). Em OS com `data_emissao` depois de `data_fim` (dado
--    sujo herdado), preencher pela emissão só trocaria um bloqueio por outro.
--    Nesses casos grava `data_fim` (início = término, que passa na validação) e
--    a linha fica marcada com fonte 'data_fim' no registro abaixo.
--
-- O QUE NÃO É TOCADO
--    · OS com `data_inicio` já preenchida — nenhum dado real é sobrescrito;
--    · OS com `excluido = true` — lixo soft-deletado não precisa destravar nada;
--    · OS sem `data_emissao` E sem `created_at` — ficam nulas em vez de receber
--      um chute; continuam travadas e aparecem na consulta de conferência;
--    · `updated_at` — de propósito. Não há trigger de updated_at em
--      `ordem_servico`, então tocá-la faria ~60% da base parecer "editada agora"
--      em qualquer ordenação por essa coluna. Quando o backfill rodou está
--      registrado na tabela de log, que é o lugar certo.
--
-- EFEITO NO PAINEL (esperado, não é regressão)
--    `BoardDashboardClientesOs` recorta período por `data_inicio` e joga as OS
--    sem data numa coluna própria (SEM_DATA, aggregations.ts:189). Depois deste
--    backfill essas OS saem da coluna "sem data" e entram nos meses reais, e
--    passam a contar no comparativo ano-a-ano (comparativoAnoAnterior), que hoje
--    as ignora dos dois lados. Para separar data real de data aproximada na
--    leitura do painel, consulte a tabela de log por fonte = 'created_at'.
--
-- CONFERÊNCIA ANTES DE APLICAR (rodar no SQL editor, não altera nada):
--    select count(*) filter (where data_inicio is not null)             as ja_tem,
--           count(*) filter (where data_inicio is null
--                              and data_emissao is not null)            as via_emissao,
--           count(*) filter (where data_inicio is null
--                              and data_emissao is null
--                              and created_at is not null)              as via_created_at,
--           count(*) filter (where data_inicio is null
--                              and data_emissao is null
--                              and created_at is null)                  as ficam_nulas
--      from public.ordem_servico
--     where excluido = false;
--
-- REVERSÃO (a tabela de log é o que torna isso possível):
--   update public.ordem_servico os
--      set data_inicio = null
--     from public.ordem_servico_data_inicio_backfill b
--    where b.ordem_servico_id = os.id
--      and os.data_inicio = b.data_inicio_gravada;
--   drop table public.ordem_servico_data_inicio_backfill;

BEGIN;

-- ─────────────────────── registro do que foi preenchido ───────────────────────
-- Sem isto o backfill é irreversível e, pior, indistinguível: ninguém conseguiria
-- responder depois "esta data é do contrato ou foi inferida?". Uma linha por OS
-- tocada, com a fonte da data.
create table if not exists public.ordem_servico_data_inicio_backfill (
  ordem_servico_id uuid primary key references public.ordem_servico(id) on delete cascade,
  data_inicio_gravada date not null,
  fonte text not null check (fonte in ('data_emissao', 'created_at', 'data_fim')),
  aplicado_em timestamptz not null default now()
);

comment on table public.ordem_servico_data_inicio_backfill is
  'Log do backfill de ordem_servico.data_inicio (migração 20260814150000). Uma linha por OS que estava nula e foi preenchida. `fonte` diz de onde a data veio: data_emissao = data real da OS; created_at = aproximada, é a data em que a linha entrou no banco; data_fim = a candidata caía depois do término e foi limitada a ele. Serve para reverter o backfill e para separar data real de data inferida em análise.';

comment on column public.ordem_servico_data_inicio_backfill.fonte is
  'data_emissao | created_at | data_fim — ver comentário da tabela. Só fonte = data_emissao representa data confirmada no cadastro.';

alter table public.ordem_servico_data_inicio_backfill enable row level security;

-- Log administrativo: leitura só para admin, e nenhuma escrita pela API (quem
-- grava é a migração, via service_role).
drop policy if exists "admin le log de backfill de data_inicio"
  on public.ordem_servico_data_inicio_backfill;

create policy "admin le log de backfill de data_inicio"
  on public.ordem_servico_data_inicio_backfill
  for select
  using (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ───────────────────────────────── backfill ──────────────────────────────────
with alvo as (
  select
    os.id,
    os.data_fim,
    coalesce(os.data_emissao, (os.created_at at time zone 'America/Sao_Paulo')::date) as candidata,
    case when os.data_emissao is not null then 'data_emissao' else 'created_at' end   as fonte_base
    from public.ordem_servico os
   where os.data_inicio is null
     and os.excluido = false
     -- Sem nenhuma das duas fontes não há o que gravar: melhor nula que chutada.
     and coalesce(os.data_emissao, (os.created_at at time zone 'America/Sao_Paulo')::date) is not null
),
resolvido as (
  select
    id,
    case when data_fim is not null and candidata > data_fim then data_fim   else candidata  end as data_inicio,
    case when data_fim is not null and candidata > data_fim then 'data_fim' else fonte_base end as fonte
    from alvo
),
gravado as (
  update public.ordem_servico os
     set data_inicio = r.data_inicio
    from resolvido r
   where os.id = r.id
  returning os.id, r.data_inicio, r.fonte
)
insert into public.ordem_servico_data_inicio_backfill (ordem_servico_id, data_inicio_gravada, fonte)
select id, data_inicio, fonte from gravado
-- Migração idempotente: reaplicar não duplica log (e o update já não acha linha,
-- porque data_inicio deixou de ser nula).
on conflict (ordem_servico_id) do nothing;

-- Resumo no log da aplicação: quantas OS por fonte, e quantas continuam travadas.
do $$
declare
  v_emissao int;
  v_created int;
  v_fim int;
  v_restam int;
begin
  select count(*) filter (where fonte = 'data_emissao'),
         count(*) filter (where fonte = 'created_at'),
         count(*) filter (where fonte = 'data_fim')
    into v_emissao, v_created, v_fim
    from public.ordem_servico_data_inicio_backfill;

  select count(*) into v_restam
    from public.ordem_servico
   where data_inicio is null and excluido = false;

  raise notice 'backfill data_inicio: % via data_emissao, % via created_at, % limitadas a data_fim; % OS seguem sem data_inicio',
    v_emissao, v_created, v_fim, v_restam;
end $$;

COMMIT;
