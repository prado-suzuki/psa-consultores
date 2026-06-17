## Problema

A política `rls_org_tasks_select` atual está desalinhada da `rls_org_projects_select`:

- **Líder/admin** vê *todas* as tarefas globalmente (sem filtrar por área).
- **Sub-líder** cai no balde genérico de `team_member+` e enxerga tarefas pela área do projeto.
- **Membro comum** vê tarefas por ser membro do projeto ou da área — mais permissivo que a regra do projeto, que exige relação direta (`created_by`, `responsible_id`, `leader_id`, membro do projeto, ou caminho líder/sublíder via `can_view_org_project`).

Resultado: tarefas aparecem com `project` nulo no join porque o usuário tem acesso à tarefa mas não ao projeto.

## Solução

Substituir apenas a política de **SELECT** de `org_tasks` por uma versão alinhada à visibilidade de projeto, reaproveitando `public.can_view_org_project`, que já implementa corretamente os critérios de líder (por área) e sublíder (por equipe).

### Novas regras de SELECT em `org_tasks`

| Papel | Condição |
|---|---|
| Admin | Vê todas as tarefas |
| Líder | Vê tarefa se `project_id IS NOT NULL` E `can_view_org_project(auth.uid(), project_id)` (que para líder exige membro do projeto em uma de suas áreas) |
| Sub-líder | Idem líder, mas `can_view_org_project` resolve por equipe |
| Membro/Team_member | Vê **apenas** se `assigned_to = auth.uid()` |

`INSERT`, `UPDATE` e `DELETE` permanecem intactos.

## Migração (SQL)

```sql
DROP POLICY IF EXISTS rls_org_tasks_select ON public.org_tasks;

CREATE POLICY rls_org_tasks_select
ON public.org_tasks
FOR SELECT
TO authenticated
USING (
  -- Admin: tudo
  public.has_role(auth.uid(), 'admin'::app_role)
  -- Líder/Sub-líder: tarefas de projetos visíveis para eles
  -- (can_view_org_project já resolve área para líder e equipe para sublíder)
  OR (
    project_id IS NOT NULL
    AND (
      public.has_role(auth.uid(), 'lider'::app_role)
      OR public.has_role(auth.uid(), 'sublider'::app_role)
    )
    AND public.can_view_org_project(auth.uid(), project_id)
  )
  -- Membro comum: somente tarefas atribuídas a ele
  OR assigned_to = auth.uid()
);
```

## Casos de borda — decisões propostas (precisam de confirmação)

1. **Tarefas sem `project_id`**: ficam visíveis apenas para admin e para quem está em `assigned_to`. Líder e sublíder *não* veem tarefas órfãs. Compatível com o enunciado.
2. **Criador (`created_by`)**: pela regra estrita, um membro comum que criou uma tarefa **não** a verá se não estiver em `assigned_to`. Isso pode quebrar fluxos onde alguém cria uma tarefa para outro. Recomendo adicionar `OR created_by = auth.uid()` — **aguardando sua confirmação** antes de aplicar.
3. **`responsible_id`/`leader_id` do projeto**: continuam vendo via `can_view_org_project` (que já cobre isso) desde que tenham papel líder/sublíder. Se um responsável for membro comum, ele perde acesso às tarefas — geralmente aceitável porque a regra do projeto também o cobre via outra rota; sinalizo se for problema.

## Validação após aplicar

1. Conta admin → continua vendo todas as tarefas com projeto preenchido.
2. Conta líder de uma área → lista de tarefas inclui só projetos cujos membros pertencem àquela área; `task.project` nunca vem nulo.
3. Conta sublíder de uma equipe → mesma coisa para a equipe.
4. Conta membro comum sem atribuição → não vê tarefas de projetos dos quais participa, só as atribuídas.
5. Conta de automação OSG do bug original → tarefas órfãs de projeto desaparecem; tarefas visíveis trazem `project` populado.

Consulta para sanity check:
```sql
SELECT t.id, t.title, t.project_id, p.id AS join_project
FROM public.org_tasks t
LEFT JOIN public.org_projects p ON p.id = t.project_id
WHERE t.project_id IS NOT NULL AND p.id IS NULL;
-- Deve retornar 0 linhas para o usuário logado.
```

## Antes de aplicar — me confirme:

- (a) Incluir `OR created_by = auth.uid()` para preservar visibilidade do criador?
- (b) Manter tarefas sem `project_id` invisíveis para líder/sublíder (apenas admin + assigned)?