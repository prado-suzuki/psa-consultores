-- EDU-22 · A lista do que foi pedido, sem copiar texto do catálogo.
--
-- Se `solicitacao` é a capa do pedido, esta é a lista: uma linha por documento
-- solicitado. É o papel que hoje é ocupado por checklist_cliente_item.
--
-- Duas mudanças de fundo:
--
-- 1) NÃO copia texto do catálogo. Hoje o envio copia documento, entidade, nota,
--    modulo e categoria por valor (buildOnboardingChecklistRows,
--    src/lib/onboarding.ts), e a cópia envelhece: em 31/07/2026 havia 7 linhas
--    de cliente dizendo entidade = 'Bem' enquanto o catálogo, corrigido depois,
--    dizia 'Cliente'. Aqui, item vindo do catálogo entra com documento,
--    entidade e nota NULOS e a leitura resolve com coalesce (EDU-24).
--    NULO   = herda do catálogo.
--    VALOR  = o analista sobrescreveu de propósito, só para este cliente.
--
-- 2) O status é só a INTENÇÃO do analista (ativo ou dispensado), nunca
--    "recebido": ficou decidido em 31/07/2026 que o arquivo recebido não se
--    liga ao item pedido. O cliente joga o arquivo na gaveta e o analista
--    classifica depois.
--
-- Conferido no banco em 03/08/2026: a tabela e o enum não existem; solicitacao,
-- documento_tipo e o enum osg_doc_grupo existem; as granularidades em uso no
-- catálogo são cliente, matricula_rural, matricula_urbana, pessoa_pf e pessoa_pj.
--
-- Reversão: drop table public.solicitacao_item;
--           drop type public.osg_solicitacao_item_status;

BEGIN;

do $$ begin
  if not exists (select 1 from pg_type where typname = 'osg_solicitacao_item_status') then
    create type public.osg_solicitacao_item_status as enum ('ativo', 'dispensado');
  end if;
end $$;

create table if not exists public.solicitacao_item (
  id              uuid primary key default gen_random_uuid(),
  solicitacao_id  uuid not null references public.solicitacao(id) on delete cascade,
  -- Nulo = documento criado à mão pelo analista, que não existe no catálogo.
  -- RESTRICT e não SET NULL de propósito: como documento/entidade/nota ficam
  -- nulos no item de catálogo, perder o vínculo transformaria a linha num item
  -- manual SEM NENHUM texto. Para tirar um tipo do catálogo, desative-o
  -- (ativo = false), não apague.
  item_padrao_id  uuid references public.documento_tipo(id) on delete restrict,
  -- O "grão" do documento: por qual coisa ele se repete. Mesmo domínio de
  -- documento_tipo.granularidade. NOT NULL sem default: quem grava é obrigado
  -- a dizer o grão. 'bem' entra no domínio porque o catálogo prevê o valor,
  -- ainda que nenhum item o use hoje.
  granularidade   text not null,
  -- A gaveta da área do cliente. É o dado que substitui a adivinhação por texto
  -- que existe hoje. Vem pré-selecionado pela granularidade, mas o analista
  -- pode trocar (ALE-29).
  grupo           public.osg_doc_grupo not null,
  documento       text,
  entidade        text,
  nota            text,
  status          public.osg_solicitacao_item_status not null default 'ativo',
  ordem           integer not null default 0,
  observacao      text,
  created_at      timestamptz not null default now(),
  created_by      uuid default auth.uid(),
  updated_at      timestamptz not null default now(),
  updated_by      uuid default auth.uid(),
  constraint solicitacao_item_granularidade_chk check (
    granularidade in ('pessoa_pf','pessoa_pj','matricula_rural','matricula_urbana','bem','cliente')
  )
);

comment on table public.solicitacao_item is
  'A lista de documentos de um pedido. Item vindo do catálogo NÃO copia texto: documento, entidade e nota ficam nulos e a leitura herda de documento_tipo.';
comment on column public.solicitacao_item.item_padrao_id is
  'Tipo do catálogo. Nulo = documento criado à mão pelo analista.';
comment on column public.solicitacao_item.granularidade is
  'Por qual coisa o documento se repete: pessoa_pf, pessoa_pj, matricula_rural, matricula_urbana, bem ou cliente.';
comment on column public.solicitacao_item.grupo is
  'Gaveta da área do cliente. Dado gravado, não inferido de entidade nem de categoria.';
comment on column public.solicitacao_item.documento is
  'Nulo = herda de documento_tipo.documento. Preenchido = o analista sobrescreveu para este cliente.';
comment on column public.solicitacao_item.entidade is
  'Nulo = herda de documento_tipo.entidade. É só rótulo derivado da granularidade; NUNCA volta a ser eixo de agrupamento (quem agrupa é grupo).';
comment on column public.solicitacao_item.nota is
  'Nulo = herda de documento_tipo.nota. É a instrução que o cliente lê.';
comment on column public.solicitacao_item.status is
  'Intenção do analista: ativo ou dispensado. Nunca "recebido": o arquivo recebido não se liga ao item pedido.';
comment on column public.solicitacao_item.observacao is
  'Motivo, quando o analista dispensa o item.';

create index if not exists idx_solicitacao_item_solicitacao
  on public.solicitacao_item (solicitacao_id);
create index if not exists idx_solicitacao_item_tipo
  on public.solicitacao_item (item_padrao_id);

-- Os dois índices únicos abaixo convivem por causa do NULLS DISTINCT, que é o
-- padrão do Postgres: em índice único, nulo não colide com nulo. Então o
-- primeiro não incomoda o item manual (item_padrao_id nulo) e o segundo não
-- incomoda o item de catálogo (documento e entidade nulos).
create unique index if not exists uq_solicitacao_item_padrao
  on public.solicitacao_item (solicitacao_id, item_padrao_id);
create unique index if not exists uq_solicitacao_item_manual
  on public.solicitacao_item (solicitacao_id, documento, entidade);

drop trigger if exists trg_solicitacao_item_updated_at on public.solicitacao_item;
create trigger trg_solicitacao_item_updated_at
  before update on public.solicitacao_item
  for each row execute function public.checklist_touch_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
-- Mesma forma da solicitacao, mas o cliente_id não está nesta linha: chega-se a
-- ele por subconsulta no cabeçalho.
alter table public.solicitacao_item enable row level security;

create policy "cluster can view solicitacao_item"
  on public.solicitacao_item for select to authenticated
  using (exists (select 1 from public.solicitacao s
                  where s.id = solicitacao_id
                    and public.cliente_visivel_para(s.cliente_id)));

create policy "cluster team_member can insert solicitacao_item"
  on public.solicitacao_item for insert to authenticated
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
              and exists (select 1 from public.solicitacao s
                           where s.id = solicitacao_id
                             and public.cliente_visivel_para(s.cliente_id)));

create policy "cluster team_member can update solicitacao_item"
  on public.solicitacao_item for update to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
         and exists (select 1 from public.solicitacao s
                      where s.id = solicitacao_id
                        and public.cliente_visivel_para(s.cliente_id)))
  with check (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
              and exists (select 1 from public.solicitacao s
                           where s.id = solicitacao_id
                             and public.cliente_visivel_para(s.cliente_id)));

create policy "cluster team_member can delete solicitacao_item"
  on public.solicitacao_item for delete to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
         and exists (select 1 from public.solicitacao s
                      where s.id = solicitacao_id
                        and public.cliente_visivel_para(s.cliente_id)));

-- Policy aditiva do cliente: só enxerga item de solicitação ENVIADA. O rascunho
-- continua invisível, do mesmo jeito que na tabela do cabeçalho.
create policy "cliente can view own solicitacao_item enviada"
  on public.solicitacao_item for select to authenticated
  using (exists (select 1 from public.solicitacao s
                  where s.id = solicitacao_id
                    and s.cliente_id = public.resolve_user_cliente_id(auth.uid())
                    and s.status = 'enviada'::public.osg_solicitacao_status));

grant select, insert, update, delete on public.solicitacao_item to authenticated;
grant all on public.solicitacao_item to service_role;
revoke all on public.solicitacao_item from anon;

COMMIT;
