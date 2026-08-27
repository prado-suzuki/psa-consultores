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