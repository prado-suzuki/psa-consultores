

# Fase 4 — Simplificar RLS Policies

## Policies atuais confirmadas

### POLICY 1 — `tax_projects` / SELECT / "Members can view their tax_projects"

```sql
-- ATUAL:
(is_project_member(auth.uid(), id) OR (EXISTS (
  SELECT 1 FROM tax_areas ta
  WHERE ta.id = tax_projects.area_id
    AND ta.estrutura_area_id IS NOT NULL
    AND is_area_member(auth.uid(), ta.estrutura_area_id)
)))
```

### POLICY 2 — `fiscal_tasks` / SELECT / "Members can view their project fiscal_tasks"

```sql
-- ATUAL:
(has_role(auth.uid(), 'team_member') AND (
  project_id IS NULL
  OR is_project_member(auth.uid(), project_id)
  OR (EXISTS (
    SELECT 1 FROM tax_projects tp
    JOIN tax_areas ta ON ta.id = tp.area_id
    WHERE tp.id = fiscal_tasks.project_id
      AND ta.estrutura_area_id IS NOT NULL
      AND is_area_member(auth.uid(), ta.estrutura_area_id)
  ))
))
```

## Migration SQL

Uma única migration com 2 `ALTER POLICY`:

```sql
-- Policy 1: tax_projects SELECT — eliminar JOIN com tax_areas
ALTER POLICY "Members can view their tax_projects"
ON public.tax_projects
USING (
  is_project_member(auth.uid(), id)
  OR (
    tax_projects.estrutura_area_id IS NOT NULL
    AND is_area_member(auth.uid(), tax_projects.estrutura_area_id)
  )
);

-- Policy 2: fiscal_tasks SELECT — eliminar JOIN tax_projects→tax_areas
ALTER POLICY "Members can view their project fiscal_tasks"
ON public.fiscal_tasks
USING (
  has_role(auth.uid(), 'team_member'::app_role)
  AND (
    project_id IS NULL
    OR is_project_member(auth.uid(), project_id)
    OR EXISTS (
      SELECT 1 FROM tax_projects tp
      WHERE tp.id = fiscal_tasks.project_id
        AND tp.estrutura_area_id IS NOT NULL
        AND is_area_member(auth.uid(), tp.estrutura_area_id)
    )
  )
);
```

## O que muda

- **Policy 1**: remove o `EXISTS + JOIN tax_areas`, usa `tax_projects.estrutura_area_id` direto
- **Policy 2**: remove o `JOIN tax_areas ta ON ta.id = tp.area_id`, usa `tp.estrutura_area_id` direto

## O que NÃO muda

- Nenhum arquivo frontend
- Nenhuma tabela/coluna dropada
- Nenhuma outra policy alterada
- Função `is_area_member()` intacta

