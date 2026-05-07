# Visibilidade de projetos (RLS de `org_projects`)

## Política atual (SELECT)
- Admin/Líder: vê **todos** os projetos (via `has_role_or_higher('lider')`).
- Team member/Sublíder: vê apenas se for membro do projeto, da área do projeto (`is_area_member`), responsável, líder ou criador.
- Sublíder hoje **não tem** visibilidade ampliada por equipe.

## Política desejada
- **Admin**: continua vendo tudo.
- **Líder**: vê projetos onde **algum membro** do projeto pertence a uma das **áreas** do líder.
- **Sublíder**: vê projetos onde **algum membro** do projeto pertence a uma das **equipes** do sublíder.
- **Membro (team_member)**: vê projetos onde ele próprio está vinculado (`org_project_members`).
- **Fallback mantido** para todos os internos: `responsible_id`, `leader_id` ou `created_by = auth.uid()` continuam concedendo visibilidade.

"Área do líder" = áreas em que o usuário aparece via `estrutura_equipe_membros → estrutura_equipes.area_id` ou como `estrutura_equipes.gestor_id`.
"Equipe do sublíder" = equipes em que o usuário aparece em `estrutura_equipe_membros` ou como `gestor_id`.

## Mudanças (migration)

1. Criar função `public.user_estrutura_area_ids(_user_id uuid) RETURNS SETOF uuid` (SECURITY DEFINER, STABLE) — une áreas via membros de equipe e gestores de equipe.
2. Criar função `public.user_estrutura_equipe_ids(_user_id uuid) RETURNS SETOF uuid` (SECURITY DEFINER, STABLE).
3. Criar função `public.can_view_org_project(_user_id uuid, _project_id uuid) RETURNS boolean` (SECURITY DEFINER, STABLE) com a lógica:
   - admin → true
   - se `is_project_member(_user_id, _project_id)` → true
   - fallback: `responsible_id`/`leader_id`/`created_by` = `_user_id` (consultado em `org_projects`)
   - se `has_role('lider')`: existe `org_project_members opm` JOIN estrutura tal que área do membro ∈ `user_estrutura_area_ids(_user_id)`
   - se `has_role('sublider')`: idem para equipes ∈ `user_estrutura_equipe_ids(_user_id)`
4. Substituir a policy `rls_org_projects_select` para usar `has_role('admin') OR can_view_org_project(auth.uid(), id)`.

As policies de INSERT/UPDATE/DELETE permanecem inalteradas.

## Impacto no frontend
- Nenhuma mudança em código React necessária; `useOrgProjects` continua filtrando pelo que o RLS retornar.
- `useProjectMemberAreas` continua agregando áreas para exibição (não afetado).

## Validação após aplicar
- Logar como líder de uma área X: deve ver projetos cujos membros pertencem a X, mesmo sem `estrutura_area_id` setado no projeto.
- Logar como sublíder de uma equipe Y: deve ver projetos cujos membros pertencem a Y; não deve ver projetos de outras equipes da mesma área.
- Logar como team_member: vê apenas projetos em que está em `org_project_members` (ou é responsável/líder/criador).
- Admin: vê tudo.