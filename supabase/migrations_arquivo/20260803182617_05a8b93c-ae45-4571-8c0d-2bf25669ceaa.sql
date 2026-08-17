BEGIN;

-- CREATE TYPE não aceita IF NOT EXISTS → guard, padrão de 20260707130000.
do $$ begin
  if not exists (select 1 from pg_type where typname = 'osg_solicitacao_status') then
    create type public.osg_solicitacao_status as enum ('rascunho', 'enviada', 'encerrada');
  end if;
end $$;

create table if not exists public.solicitacao (
  id                uuid primary key default gen_random_uuid(),
  cliente_id        uuid not null references public.cliente(id) on delete cascade,
  -- De qual OS o pedido nasceu. Nulo quando o consultor monta à mão. SET NULL e
  -- não CASCADE: apagar a OS não pode apagar o pedido de documentos do cliente.
  ordem_servico_id  uuid references public.ordem_servico(id) on delete set null,
  status            public.osg_solicitacao_status not null default 'rascunho',
  enviada_em        timestamptz,
  encerrada_em      timestamptz,
  observacao        text,
  created_at        timestamptz not null default now(),
  -- created_by/updated_by SEM FK: o AGENTS.md proíbe FK direta para auth.users,
  -- e as tabelas irmãs do módulo também deixam essas duas colunas soltas.
  created_by        uuid default auth.uid(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid default auth.uid()
);

-- Sem coluna `ambiente` de propósito: nenhuma tabela irmã do módulo tem
-- (checklist_cliente_item, documento_tipo e produto_documento_tipo não têm).
-- A separação dev/prod chega pelo cliente.

comment on table public.solicitacao is
  'Cabeçalho do pedido de documentos ao cliente. No máximo um não encerrado por cliente.';
comment on column public.solicitacao.status is
  'rascunho = o consultor ainda monta e o cliente não vê; enviada = o cliente vê; encerrada = ciclo fechado, libera abrir outro.';
comment on column public.solicitacao.enviada_em is
  'Preenchido na transição para enviada (ALE-30).';
comment on column public.solicitacao.encerrada_em is
  'Preenchido na transição para encerrada (ALE-30). O encerramento é manual, nunca automático por completude.';
comment on column public.solicitacao.ordem_servico_id is
  'De qual OS o pedido nasceu. Nulo quando montado à mão.';

create index if not exists idx_solicitacao_cliente
  on public.solicitacao (cliente_id);

-- É ESTE índice que garante "uma solicitação ativa por cliente", e não um IF no
-- aplicativo: duas requisições simultâneas passariam pelas duas verificações e
-- criariam dois pedidos. Enquanto existir linha em rascunho ou enviada para o
-- cliente, um segundo insert falha por unicidade. Depois de encerrada, ela sai
-- do índice e um novo rascunho é aceito.
-- A expressão do WHERE precisa ser IMMUTABLE; comparação com valor de enum é.
create unique index if not exists uq_solicitacao_ativa_por_cliente
  on public.solicitacao (cliente_id)
  where status <> 'encerrada'::public.osg_solicitacao_status;

-- Reaproveita a função que já existe (20260707130000, linhas 85-91), não cria outra.
drop trigger if exists trg_solicitacao_updated_at on public.solicitacao;
create trigger trg_solicitacao_updated_at
  before update on public.solicitacao
  for each row execute function public.checklist_touch_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Dois lados que NÃO se confundem:
--   cliente_visivel_para(...)      resolve por CLUSTER  → é o lado da EQUIPE
--   resolve_user_cliente_id(...)   vai do usuário ao cliente pelo representante
--                                  → é o lado do CLIENTE
alter table public.solicitacao enable row level security;

create policy "cluster can view solicitacao"
  on public.solicitacao for select to authenticated
  using (public.cliente_visivel_para(cliente_id));

create policy "cluster team_member can insert solicitacao"
  on public.solicitacao for insert to authenticated
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
              and public.cliente_visivel_para(cliente_id));

create policy "cluster team_member can update solicitacao"
  on public.solicitacao for update to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
         and public.cliente_visivel_para(cliente_id))
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
              and public.cliente_visivel_para(cliente_id));

create policy "cluster team_member can delete solicitacao"
  on public.solicitacao for delete to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
         and public.cliente_visivel_para(cliente_id));

-- Policy aditiva do cliente. O `status = 'enviada'` é o que esconde o rascunho:
-- é a razão de existir desta tarefa. O cliente NÃO recebe policy de escrita.
create policy "cliente can view own solicitacao enviada"
  on public.solicitacao for select to authenticated
  using (cliente_id = public.resolve_user_cliente_id(auth.uid())
         and status = 'enviada'::public.osg_solicitacao_status);

-- ── Permissões ──────────────────────────────────────────────────────────────
grant select, insert, update, delete on public.solicitacao to authenticated;
grant all on public.solicitacao to service_role;
-- Revoga o que a tabela herda do schema para anon. A RLS já barraria (anon não
-- tem policy), mas a EDU-17 precisou de uma migration só para isso depois de
-- descobrir a herança; aqui já nasce fechado.
revoke all on public.solicitacao from anon;

COMMIT;