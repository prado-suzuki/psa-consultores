## Objetivo

Isolar a **visualização** de projetos por cluster na tela "Cadastro de Projetos" do OSG, mantendo escrita/atribuição cross-cluster e o comportamento do Tax 100% idêntico. Projetos multidisciplinares aparecem em todos os clusters envolvidos.

## Parte A — Banco (migration única, aditiva)

### A1. Pré-checagens (read-only, abortar se faltar)
- `resolve_user_cluster_ids(uuid)` existe em `public`.
- `org_projects`, `org_project_members`, `estrutura_areas` existem.

### A2. Criar 2 funções (CREATE OR REPLACE, transação única)

**`public.org_project_cluster_ids(_project_id uuid) RETURNS uuid[]`**
- `STABLE SECURITY DEFINER`, `search_path=public`.
- União de:
  - `cluster_id` da área principal (`org_projects.estrutura_area_id → estrutura_areas.cluster_id`).
  - `unnest(resolve_user_cluster_ids(opm.user_id))` para cada membro de `org_project_members`.
- `GRANT EXECUTE ... TO authenticated`.

**`public.dashboard_project_ids_for_cluster(_cluster_id uuid, _include_orphans boolean DEFAULT false) RETURNS SETOF uuid`**
- `STABLE SECURITY INVOKER` (respeita RLS de `org_projects`).
- Retorna `p.id` onde `_cluster_id = ANY(org_project_cluster_ids(p.id))` OR (`_include_orphans` AND set vazio).
- `GRANT EXECUTE ... TO authenticated`.

### A3. Pós-validação (read-only)
- Listar as 2 funções em `pg_proc`.
- `count(*)` de `dashboard_project_ids_for_cluster('0523512c-...', false)` (PSA OSG).
- Amostra de projetos multidisciplinares.

### Garantias
- Zero alteração em tabelas, dados, RLS, policies, triggers ou demais funções.
- Reuso integral de `resolve_user_cluster_ids`.
- Impacto comportamental = 0 até o frontend chamar (apenas leitura, sem consumidor atual).

## Parte B — Frontend (somente 3 pontos)

### B1. `src/hooks/useDashboardProjectIds.ts` (novo)
- `useDashboardProjectIds(clusterId: string | null | undefined, includeOrphans: boolean)`.
- `supabase.rpc('dashboard_project_ids_for_cluster', { _cluster_id, _include_orphans })`.
- Retorna `Set<string>` (e `isLoading`). `enabled: !!clusterId`.

### B2. `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` (`ProjetosCadastroContent`)
- Nova prop `area: AreaKey = 'tax'` (default preserva Tax).
- Título dinâmico: `'Projetos OSG'` quando `area==='osg'`, senão `'Projetos Tax'`.
- Trocar `useEstruturaEquipesByCategory('tax')` por `useEstruturaEquipesByCategory(area)`.
- Resolver cluster via `useClusterIdByPageCategory(area)`.
- Filtrar `projects` por `useDashboardProjectIds(clusterId, area==='tax')`:
  - Enquanto `clusterId` não resolver → não exibe projetos de outros clusters (lista vazia ou skeleton).
  - Tax usa `_include_orphans=true` para não perder legado sem área.
- Não tocar em modal de criação/edição nem em nenhuma escrita.

### B3. `src/pages/equipe/osg/OsgProjetos.tsx`
- `<ProjetosCadastroContent area="osg" />`.

### Não-mexer (explícito)
- `useCreateOrgProject` / `useUpdateOrgProject` / `useDeleteOrgProject`.
- Seletores de responsável/membros (cross-cluster permanece).
- RLS de INSERT/UPDATE/DELETE em `org_projects`/`org_project_members`.
- `/equipe/chamados`, `org_tasks`, Tarefas, Clientes (fora de escopo desta tarefa).
- Comportamento da página Tax (área Tax continua via default `area='tax'`).

## Testes a reportar
1. OSG → Cadastro: título "Projetos OSG"; só projetos do cluster PSA OSG; projetos exclusivamente Tax somem.
2. Tax → Cadastro: título "Projetos Tax"; lista idêntica à atual (com legado via `_include_orphans=true`).
3. Multidisciplinar (área de um cluster + membro de outro): aparece nos DOIS clusters.
4. Escrita: criar/editar projeto e atribuir responsável/membro de outro cluster continua funcionando.
5. Chamados inalterado.

## Rollback
- Parte A: `DROP FUNCTION` das 2 funções novas.
- Parte B: reverter os 3 arquivos (sem efeito colateral, pois nada além deles muda).
