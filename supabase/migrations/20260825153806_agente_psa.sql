-- 20260825153806_agente_psa.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

create table if not exists public.agente_config (
  id uuid primary key default gen_random_uuid(),
  escopo text not null unique,
  rotulo text not null,
  ativo boolean not null default true,
  modelo text not null default 'google/gemini-3-flash-preview',
  temperatura numeric(3,2) not null default 0.30,
  prompt_personalizado text,
  nivel_acesso text not null default 'lider',
  max_insights_por_resposta smallint not null default 3,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id) on delete set null,
  constraint agente_config_nivel_acesso_check
    check (nivel_acesso in ('admin', 'lider', 'sublider', 'team_member')),
  constraint agente_config_temperatura_check
    check (temperatura >= 0 and temperatura <= 1)
);

comment on table public.agente_config is
  'Cockpit do Agente PSA: uma linha por escopo (aba onde o balao aparece).';

create table if not exists public.agente_conversas (
  id uuid primary key default gen_random_uuid(),
  escopo text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  titulo text,
  filtros jsonb,
  excluido boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists agente_conversas_user_escopo_idx
  on public.agente_conversas (user_id, escopo, atualizado_em desc);

create table if not exists public.agente_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.agente_conversas(id) on delete cascade,
  papel text not null,
  conteudo text not null,
  campos_usados jsonb,
  metricas jsonb,
  modo text,
  criado_em timestamptz not null default now(),
  constraint agente_mensagens_papel_check check (papel in ('user', 'assistant')),
  constraint agente_mensagens_modo_check
    check (modo is null or modo in ('dados', 'estrategia', 'aprender'))
);

create index if not exists agente_mensagens_conversa_idx
  on public.agente_mensagens (conversa_id, criado_em);

create table if not exists public.agente_insights (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null references public.agente_mensagens(id) on delete cascade,
  conversa_id uuid not null references public.agente_conversas(id) on delete cascade,
  escopo text not null,
  texto text not null,
  categoria text not null default 'observacao',
  severidade text not null default 'media',
  util boolean,
  criado_em timestamptz not null default now(),
  constraint agente_insights_categoria_check
    check (categoria in ('oportunidade', 'risco', 'execucao', 'dado', 'observacao')),
  constraint agente_insights_severidade_check
    check (severidade in ('alta', 'media', 'baixa'))
);

create index if not exists agente_insights_escopo_idx
  on public.agente_insights (escopo, criado_em desc);
create index if not exists agente_insights_mensagem_idx
  on public.agente_insights (mensagem_id);

create table if not exists public.agente_aprendizados (
  id uuid primary key default gen_random_uuid(),
  escopo text not null,
  conversa_id uuid references public.agente_conversas(id) on delete set null,
  mensagem_id uuid references public.agente_mensagens(id) on delete set null,
  tipo text not null default 'correcao',
  pergunta text,
  resposta_original text,
  correcao text not null,
  licao text not null,
  peso smallint not null default 1,
  ativo boolean not null default true,
  criado_por uuid references public.profiles(id) on delete set null,
  criado_em timestamptz not null default now(),
  revisado_por uuid references public.profiles(id) on delete set null,
  revisado_em timestamptz,
  constraint agente_aprendizados_tipo_check
    check (tipo in ('correcao', 'preferencia', 'glossario', 'regra')),
  constraint agente_aprendizados_peso_check check (peso between 1 and 5)
);

create index if not exists agente_aprendizados_escopo_ativo_idx
  on public.agente_aprendizados (escopo, ativo, criado_em desc);

alter table public.agente_config enable row level security;
alter table public.agente_conversas enable row level security;
alter table public.agente_mensagens enable row level security;
alter table public.agente_insights enable row level security;
alter table public.agente_aprendizados enable row level security;

drop policy if exists agente_config_select on public.agente_config;
create policy agente_config_select on public.agente_config
  for select to authenticated using (true);

drop policy if exists agente_config_admin_write on public.agente_config;
create policy agente_config_admin_write on public.agente_config
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists agente_conversas_select on public.agente_conversas;
create policy agente_conversas_select on public.agente_conversas
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists agente_conversas_update_dono on public.agente_conversas;
create policy agente_conversas_update_dono on public.agente_conversas
  for update to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

drop policy if exists agente_mensagens_select on public.agente_mensagens;
create policy agente_mensagens_select on public.agente_mensagens
  for select to authenticated
  using (exists (
    select 1 from public.agente_conversas c
    where c.id = agente_mensagens.conversa_id
      and (c.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role))
  ));

drop policy if exists agente_insights_select on public.agente_insights;
create policy agente_insights_select on public.agente_insights
  for select to authenticated
  using (exists (
    select 1 from public.agente_conversas c
    where c.id = agente_insights.conversa_id
      and (c.user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role))
  ));

drop policy if exists agente_aprendizados_select on public.agente_aprendizados;
create policy agente_aprendizados_select on public.agente_aprendizados
  for select to authenticated using (true);

drop policy if exists agente_aprendizados_admin_write on public.agente_aprendizados;
create policy agente_aprendizados_admin_write on public.agente_aprendizados
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

create or replace function public.agente_config_touch()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists agente_config_touch_trg on public.agente_config;
create trigger agente_config_touch_trg
  before update on public.agente_config
  for each row execute function public.agente_config_touch();

insert into public.agente_config (escopo, rotulo, nivel_acesso, prompt_personalizado)
values (
  'board.estrategico',
  'Board · Estratégico',
  'lider',
  'Você fala com sócio e diretoria da PSA Consultores. Vá direto ao número e à '
  || 'decisão que ele exige. Receita de consultoria é irregular: nunca projete '
  || 'tendência a partir de um mês. Empresa (cluster) e centro de custo são níveis '
  || 'diferentes — centro de custo pertence à ÁREA, não à empresa.'
)
on conflict (escopo) do nothing;
