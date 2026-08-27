-- 20260824143909_cliente_clusters_vinculo_de_qualquer_cluster.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- Vinculo cliente <-> cluster: sublider ou superior passa a vincular QUALQUER cluster.
--
-- Antes, a policy `sublider_or_higher_manage_own_cluster_links` exigia que o
-- `cluster_id` estivesse em `resolve_user_cluster_ids(auth.uid())`, ou seja, o
-- usuario so podia ligar um cliente aos clusters em que ele proprio esta lotado
-- (membro de equipe, gestor de equipe ou gestor de area).
--
-- Isso barrava um caso legitimo e comum: a lider da TAX cadastra uma OS de outro
-- cluster (OSG, por exemplo) para um cliente dela e precisa marcar aquele cluster
-- na ficha. O insert em `cliente_clusters` voltava 42501 e o save da ficha morria
-- no meio, depois de a OS ja ter sido gravada (a edicao nao tem rollback), o que
-- deixava o cliente com OS de um cluster ao qual ele nao estava vinculado.
-- Caso real: cliente "Pedro Leoni" (so TAX) com a OS 155/2026 do cluster OSG.
--
-- A regra fica sendo apenas o piso de papel, que nao muda: `has_role_or_higher`
-- ja inclui admin na hierarquia de 'sublider' (sublider, lider, admin), entao o
-- disjunto de admin que existia na policy antiga era redundante.
--
-- Cobre INSERT, UPDATE e DELETE (FOR ALL), como a policy anterior. Vincular sem
-- poder desvincular quebraria a mesma tela pelo outro lado: desmarcar um cluster
-- na ficha faz DELETE. A protecao contra deixar o cliente sem cluster nenhum
-- continua sendo do trigger `trg_cliente_cluster_last`, que nao e tocado aqui.
--
-- As policies de leitura (`team_member_select_cliente_clusters`, a do portal do
-- cliente) e as de admin seguem intactas.

drop policy if exists sublider_or_higher_manage_own_cluster_links on public.cliente_clusters;

drop policy if exists sublider_or_higher_manage_cliente_clusters on public.cliente_clusters;

create policy sublider_or_higher_manage_cliente_clusters
  on public.cliente_clusters
  as permissive
  for all
  to authenticated
  using (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  with check (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

comment on table public.cliente_clusters is
  'N:N — vincula clientes aos clusters (Tax, Consultoria, OSG). Um cliente pode ser atendido por múltiplos clusters. Sublíder ou superior pode vincular/desvincular qualquer cluster, inclusive um em que não está lotado (ver migration 20260824143909).';
