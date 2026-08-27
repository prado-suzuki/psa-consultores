-- 20260821184332_agente_notificacoes.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- ============================================================================
-- Notificações do Agente PSA — o pop-up de análise estratégica / insight crítico
-- ============================================================================
--
-- Complementa `20260821182647_agente_psa.sql`. Duas tabelas:
--
--   agente_notificacoes        — o fato notificável (uma linha por RESPOSTA do
--                                agente, nunca uma por insight: três insights
--                                numa resposta viraria três pop-ups).
--   agente_notificacoes_vistas — quem já viu/dispensou. Tabela separada de
--                                propósito: a notificação NÃO é endereçada a
--                                uma pessoa, e sim ao ESCOPO. Quem tem o papel
--                                exigido pelo `agente_config` daquele escopo
--                                recebe. Fan-out no momento da criação
--                                congelaria a lista de destinatários — líder
--                                promovido amanhã não veria o insight de hoje.
--
-- RLS HABILITADA E SEM POLICY PARA `authenticated`, deliberadamente: leitura e
-- escrita das duas tabelas passam pela edge function `agente-psa` (service
-- role). O motivo é que "quem pode ver este escopo" é a hierarquia de papéis
-- (RANK no index.ts do agente); replicá-la aqui em SQL criaria uma segunda
-- definição da mesma regra de acesso, que sairia de sincronia no primeiro
-- papel novo. O navegador nunca toca nestas tabelas.
--
-- Idempotente: aplicada duas vezes (sandbox pelo CLI, produção pelo Lovable).

create table if not exists public.agente_notificacoes (
  id uuid primary key default gen_random_uuid(),
  escopo text not null,
  -- `insight_critico`: a resposta trouxe insight de severidade alta.
  -- `analise_estrategica`: resposta em modo estratégia com insight de risco
  -- ou oportunidade (severidade menor). Nada além disso notifica.
  tipo text not null,
  titulo text not null,
  texto text not null,
  severidade text not null default 'alta',
  -- Sem coluna de rota: para onde o "Ver" leva é função do escopo, e esse mapa
  -- vive no front (`src/lib/agenteEscopos.ts`), que é quem conhece as rotas.
  conversa_id uuid references public.agente_conversas(id) on delete set null,
  mensagem_id uuid references public.agente_mensagens(id) on delete cascade,
  insight_id uuid references public.agente_insights(id) on delete cascade,
  -- Quem estava conversando quando o insight nasceu. Não é o destinatário:
  -- serve para o pop-up dizer de onde veio, e para não notificar o autor
  -- (ele acabou de ler a resposta na tela).
  origem_user_id uuid references public.profiles(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint agente_notificacoes_tipo_check
    check (tipo in ('insight_critico', 'analise_estrategica')),
  constraint agente_notificacoes_severidade_check
    check (severidade in ('alta', 'media', 'baixa'))
);

comment on table public.agente_notificacoes is
  'Fato notificável do Agente PSA. Endereçado ao ESCOPO, não a uma pessoa: quem recebe é quem tem o papel exigido pelo agente_config daquele escopo.';

create index if not exists agente_notificacoes_escopo_idx
  on public.agente_notificacoes (escopo, criado_em desc);

create index if not exists agente_notificacoes_recentes_idx
  on public.agente_notificacoes (criado_em desc);

create table if not exists public.agente_notificacoes_vistas (
  notificacao_id uuid not null references public.agente_notificacoes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- `true` = a pessoa fechou o pop-up sem abrir. Guardado separado de
  -- "visto" porque dispensar é sinal de ruído, e o cockpit vai querer medir.
  dispensada boolean not null default false,
  visto_em timestamptz not null default now(),
  primary key (notificacao_id, user_id)
);

comment on table public.agente_notificacoes_vistas is
  'Marca de leitura por pessoa. A ausência de linha é o que faz o pop-up aparecer.';

create index if not exists agente_notificacoes_vistas_user_idx
  on public.agente_notificacoes_vistas (user_id, visto_em desc);

alter table public.agente_notificacoes enable row level security;

alter table public.agente_notificacoes_vistas enable row level security;

-- Nenhuma policy para `authenticated` — ver o cabeçalho. Se um dia o pop-up
-- precisar de realtime (que exige leitura direta), a policy vem junto com a
-- função SQL que replica a hierarquia, e não antes.

-- ── Escopos do Board: uma linha por menu e submenu ──────────────────────────
-- O ícone do agente aparece em TODA tela do Board (BoardLayout), então todo
-- escopo precisa de config — sem linha aqui, a função responde 404 e o painel
-- fica sem chat. `on conflict do nothing`: o Estratégico já foi semeado na
-- migration anterior e o texto dele não se sobrescreve.
insert into public.agente_config (escopo, rotulo, nivel_acesso) values
  ('board.projetos',                    'Board · Projetos',              'lider'),
  ('board.clientes',                    'Board · Clientes',              'lider'),
  ('board.ferramentas',                 'Board · Ferramentas',           'lider'),
  ('board.capacidade',                  'Board · Capacidade',            'lider'),
  ('board.operacional',                 'Board · Operacional',           'lider'),
  ('board.logs',                        'Board · Logs da equipe',        'admin'),
  ('board.chamados',                    'Board · Chamados',              'lider'),
  ('board.dashboards',                  'Board · Dashboards',            'lider'),
  ('board.desempenho',                  'Desempenho · Visão geral',      'lider'),
  ('board.desempenho.ciclos',           'Desempenho · Ciclos',           'lider'),
  ('board.desempenho.metas',            'Desempenho · Metas e PPR',      'lider'),
  ('board.desempenho.decisoes',         'Desempenho · Decisões',         'admin'),
  ('board.desempenho.relatorios',       'Desempenho · Relatórios',       'lider'),
  ('board.desempenho.evolucao',         'Desempenho · Evolução',         'lider'),
  ('board.desempenho.feedbacks',        'Desempenho · Feedbacks',        'lider'),
  ('board.desempenho.1a1',              'Desempenho · 1:1s',             'lider'),
  ('board.desempenho.minha-evolucao',   'Minha evolução',                'team_member')
on conflict (escopo) do nothing;

-- Decisões de pessoas fala de promoção e reajuste nominal: o prompt precisa
-- dizer isso, senão o agente trata como número de produção.
update public.agente_config
set prompt_personalizado = coalesce(prompt_personalizado,
  'Esta tela decide promoção, reajuste e acompanhamento de pessoas com nome e '
  || 'sobrenome. Nunca compare pessoas fora do que a tela mostra, nunca sugira '
  || 'desligamento, e trate percentual de reajuste como sugestão a ser revisada '
  || 'por gente, jamais como decisão tomada.')
where escopo = 'board.desempenho.decisoes';
