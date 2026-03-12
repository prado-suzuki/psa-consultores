

## Plano: Corrigir RLS de `tax_project_members` e `project_servicos`

### Políticas existentes

**`tax_project_members`** (4 políticas):
- `ALL` → apenas `admin`
- `SELECT` → `is_project_member(auth.uid(), project_id)`
- `INSERT` → `team_member`, `admin`
- `DELETE` → `team_member`, `admin`
- **UPDATE → inexistente** ← causa do erro

Lacunas: `lider` e `sublider` ausentes em INSERT/DELETE.

**`project_servicos`** (6 políticas, com duplicatas):
- `SELECT` × 2 → `admin`, `team_member`, `lider`
- `INSERT` × 2 → uma com `admin/lider`, outra com `admin/team_member/lider`
- `DELETE` × 2 → uma com `admin/lider`, outra com `admin/team_member/lider`
- **UPDATE → inexistente** ← potencial erro futuro

Lacuna: `sublider` ausente em todas; duplicatas a limpar.

---

### Migração SQL (uma única migration)

**1. `tax_project_members`** — adicionar UPDATE e harmonizar INSERT/DELETE:

```sql
-- Dropar INSERT e DELETE antigos (sem lider/sublider)
DROP POLICY "Team members can insert project members" ON public.tax_project_members;
DROP POLICY "Team members can delete project members" ON public.tax_project_members;

-- INSERT com todos os roles
CREATE POLICY "Team can insert tax_project_members"
  ON public.tax_project_members FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lider')
    OR has_role(auth.uid(), 'sublider') OR has_role(auth.uid(), 'team_member')
  );

-- UPDATE (novo)
CREATE POLICY "Team can update tax_project_members"
  ON public.tax_project_members FOR UPDATE
  USING (...mesmos 4 roles...)
  WITH CHECK (...mesmos 4 roles...);

-- DELETE com todos os roles
CREATE POLICY "Team can delete tax_project_members"
  ON public.tax_project_members FOR DELETE
  USING (...mesmos 4 roles...);
```

**2. `project_servicos`** — limpar duplicatas, adicionar UPDATE, incluir `sublider`:

```sql
-- Dropar as 4 políticas duplicadas de INSERT e DELETE
DROP POLICY "admin_lider_insert_project_servicos" ...;
DROP POLICY "Team and lider can insert tax_project_categorias" ...;
DROP POLICY "admin_lider_delete_project_servicos" ...;
DROP POLICY "Team and lider can delete tax_project_categorias" ...;
-- Dropar SELECT duplicado
DROP POLICY "team_lider_select_project_servicos" ...;
DROP POLICY "Team and lider can view tax_project_categorias" ...;

-- Recriar SELECT, INSERT, UPDATE, DELETE — todos com admin/lider/sublider/team_member
```

### O que NÃO será alterado
- Nenhuma policy de `tax_projects` ou `fiscal_tasks`
- Nenhuma alteração no frontend
- A policy `ALL` de admin em `tax_project_members` permanece (é superset)
- A policy `SELECT` por membership em `tax_project_members` permanece

