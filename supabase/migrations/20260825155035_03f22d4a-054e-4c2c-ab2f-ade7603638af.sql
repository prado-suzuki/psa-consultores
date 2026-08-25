-- ============================================================================
-- Agente PSA — assistente conversacional das telas do sistema
-- ============================================================================
--
-- O agente NÃO recalcula número nenhum. Ele responde sobre o snapshot que a
-- TELA publica (ver src/lib/agenteContextoBoard.ts): duas origens para o mesmo
-- número — uma na tela, outra no Deno — seria a pior falha possível numa
-- ferramenta de decisão. O banco aqui guarda só o que a tela não tem:
-- configuração por escopo, conversa, insight gerado e LIÇÃO APRENDIDA.
--
-- Cinco tabelas:
--   agente_config       — uma linha por escopo (aba). Prompt, modelo, nível.
--   agente_conversas    — thread de um usuário em um escopo.
--   agente_mensagens    — turno da conversa + o que foi processado nele.
--   agente_insights     — insight estratégico extraído de uma resposta.
--   agente_aprendizados — correção do usuário virada em lição reinjetada.
--
-- ESCRITA é toda pela edge function `agente-psa` (service role). As policies
-- abaixo cobrem LEITURA e a curadoria do admin — de propósito: sem policy de
-- insert, nenhum cliente escreve mensagem no lugar do agente, e o histórico
-- de aprendizado não pode ser adulterado pelo navegador.
--
-- Idempotente: aplicada duas vezes (sandbox pelo CLI, produção pelo Lovable).

-- ── Config por escopo ───────────────────────────────────────────────────────
create table if not exists public.agente_config (
  id uuid primary key default gen_random_uuid(),
  escopo text not null unique,
  rotulo text not null,
  ativo boolean not null default true,
  modelo text not null default 'google/gemini-3-flash-preview',
  temperatura numeric(3,2) not null default 0.30,
  -- Persona/regras da casa. O prompt final = base do código + isto + lições.
  prompt_personalizado text,
  -- Papel mínimo para conversar neste escopo. Texto, não enum: o enum
  -- `app_role` tem valores (client, timecliente) que não fazem sentido aqui.
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
  'Cockpit do Agente PSA: uma linha por escopo (aba onde o balão aparece).';
comment on column public.agente_config.escopo is
  'Chave estável da tela, ex: board.estrategico. Casada com o snapshot publicado pelo front.';

-- ── Conversas ───────────────────────────────────────────────────────────────
create table if not exists public.agente_conversas (
  id uuid primary key default gen_random_uuid(),
  escopo text not null,
  user_id uuid not null references public.profiles(id) on delete cascade,
  titulo text,
  -- Snapshot dos filtros ativos quando a conversa começou: sem isto, uma
  -- resposta antiga lida meses depois parece errada (era outro recorte).
  filtros jsonb,
  excluido boolean not null default false,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists agente_conversas_user_escopo_idx
  on public.agente_conversas (user_id, escopo, atualizado_em desc);

-- ── Mensagens ───────────────────────────────────────────────────────────────
create table if not exists public.agente_mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid not null references public.agente_conversas(id) on delete cascade,
  papel text not null,
  conteudo text not null,
  -- "Quais informações está processando por resposta" (cockpit): os campos do
  -- snapshot que ESTA resposta usou, como a IA os declarou.
  campos_usados jsonb,
  -- Latência, modelo, tokens, tamanho do contexto. Alimenta o cockpit.
  metricas jsonb,
  modo text,
  criado_em timestamptz not null default now(),
  constraint agente_mensagens_papel_check check (papel in ('user', 'assistant')),
  constraint agente_mensagens_modo_check
    check (modo is null or modo in ('dados', 'estrategia', 'aprender'))
);

create index if not exists agente_mensagens_conversa_idx
  on public.agente_mensagens (conversa_id, criado_em);

-- ── Insights ────────────────────────────────────────────────────────────────
-- Tabela própria, não array dentro da mensagem: "volume de insights gerados"
-- é a métrica que o cockpit mostra, e contar elemento de jsonb por período
-- seria varredura completa a cada abertura da aba.
create table if not exists public.agente_insights (
  id uuid primary key default gen_random_uuid(),
  mensagem_id uuid not null references public.agente_mensagens(id) on delete cascade,
  conversa_id uuid not null references public.agente_conversas(id) on delete cascade,
  escopo text not null,
  texto text not null,
  categoria text not null default 'observacao',
  severidade text not null default 'media',
  -- Feedback do leitor. `null` = ninguém opinou, diferente de "não serviu".
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

-- ── Aprendizados ────────────────────────────────────────────────────────────
-- O "histórico dentro do ambiente de Digital > Acessos". Cada linha é uma
-- correção humana virada em lição, e toda lição ATIVA volta no prompt das
-- conversas seguintes daquele escopo. É o que faz o agente aprender sem
-- fine-tuning: memória curada, versionada e auditável.
create table if not exists public.agente_aprendizados (
  id uuid primary key default gen_random_uuid(),
  escopo text not null,
  conversa_id uuid references public.agente_conversas(id) on delete set null,
  mensagem_id uuid references public.agente_mensagens(id) on delete set null,
  tipo text not null default 'correcao',
  -- O que o usuário perguntou, o que o agente respondeu, e o que estava errado.
  pergunta text,
  resposta_original text,
  correcao text not null,
  -- A frase que entra no prompt. Nasce igual à correção e o admin refina.
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

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.agente_config enable row level security;
alter table public.agente_conversas enable row level security;
alter table public.agente_mensagens enable row level security;
alter table public.agente_insights enable row level security;
alter table public.agente_aprendizados enable row level security;

-- Config: todo autenticado LÊ (o balão precisa saber se está ativo e qual o
-- nível exigido); só admin escreve — o cockpit é do admin.
drop policy if exists agente_config_select on public.agente_config;
create policy agente_config_select on public.agente_config
  for select to authenticated using (true);

drop policy if exists agente_config_admin_write on public.agente_config;
create policy agente_config_admin_write on public.agente_config
  for all to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- Conversa: a própria, sempre; todas, se admin (o cockpit mostra volume da casa).
drop policy if exists agente_conversas_select on public.agente_conversas;
create policy agente_conversas_select on public.agente_conversas
  for select to authenticated
  using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'::public.app_role));

-- Arquivar a própria conversa é do dono. Sem policy de insert: quem cria
-- conversa é a edge function.
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

-- Aprendizado é conhecimento da casa, não do autor: quem conversa com o
-- agente pode ver a lição que já foi ensinada (e não reensinar a mesma).
drop policy if exists agente_aprendizados_select on public.agente_aprendizados;
create policy agente_aprendizados_select on public.agente_aprendizados
  for select to authenticated using (true);

-- Curadoria (desativar lição errada, refinar texto) é do admin.
drop policy if exists agente_aprendizados_admin_write on public.agente_aprendizados;
create policy agente_aprendizados_admin_write on public.agente_aprendizados
  for update to authenticated
  using (public.has_role(auth.uid(), 'admin'::public.app_role))
  with check (public.has_role(auth.uid(), 'admin'::public.app_role));

-- ── updated_at do config ────────────────────────────────────────────────────
-- Trigger, não CHECK com now() (regra inegociável do AGENTS.md).
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

-- ── Escopo inicial: o Estratégico do Board ──────────────────────────────────
-- O agente nasce em UMA tela, com o texto que a diretoria já usa. Cada aba
-- nova ganha uma linha aqui, e nenhum código muda.
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