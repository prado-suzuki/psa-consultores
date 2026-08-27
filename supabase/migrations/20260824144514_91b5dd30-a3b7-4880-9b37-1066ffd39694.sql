-- 20260824144514_91b5dd30-a3b7-4880-9b37-1066ffd39694.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

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
