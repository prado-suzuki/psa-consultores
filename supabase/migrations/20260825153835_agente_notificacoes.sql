-- 20260825153835_agente_notificacoes.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

create table if not exists public.agente_notificacoes (
  id uuid primary key default gen_random_uuid(),
  escopo text not null,
  tipo text not null,
  titulo text not null,
  texto text not null,
  severidade text not null default 'alta',
  conversa_id uuid references public.agente_conversas(id) on delete set null,
  mensagem_id uuid references public.agente_mensagens(id) on delete cascade,
  insight_id uuid references public.agente_insights(id) on delete cascade,
  origem_user_id uuid references public.profiles(id) on delete set null,
  criado_em timestamptz not null default now(),
  constraint agente_notificacoes_tipo_check
    check (tipo in ('insight_critico', 'analise_estrategica')),
  constraint agente_notificacoes_severidade_check
    check (severidade in ('alta', 'media', 'baixa'))
);

comment on table public.agente_notificacoes is
  'Fato notificavel do Agente PSA. Enderecado ao ESCOPO, nao a uma pessoa: quem recebe e quem tem o papel exigido pelo agente_config daquele escopo.';

create index if not exists agente_notificacoes_escopo_idx
  on public.agente_notificacoes (escopo, criado_em desc);
create index if not exists agente_notificacoes_recentes_idx
  on public.agente_notificacoes (criado_em desc);

create table if not exists public.agente_notificacoes_vistas (
  notificacao_id uuid not null references public.agente_notificacoes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  dispensada boolean not null default false,
  visto_em timestamptz not null default now(),
  primary key (notificacao_id, user_id)
);

comment on table public.agente_notificacoes_vistas is
  'Marca de leitura por pessoa. A ausencia de linha e o que faz o pop-up aparecer.';

create index if not exists agente_notificacoes_vistas_user_idx
  on public.agente_notificacoes_vistas (user_id, visto_em desc);

alter table public.agente_notificacoes enable row level security;
alter table public.agente_notificacoes_vistas enable row level security;

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

update public.agente_config
set prompt_personalizado = coalesce(prompt_personalizado,
  'Esta tela decide promoção, reajuste e acompanhamento de pessoas com nome e '
  || 'sobrenome. Nunca compare pessoas fora do que a tela mostra, nunca sugira '
  || 'desligamento, e trate percentual de reajuste como sugestão a ser revisada '
  || 'por gente, jamais como decisão tomada.')
where escopo = 'board.desempenho.decisoes';
