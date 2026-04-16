

# Plano: Restringir visibilidade de projetos/tarefas para sublíder e team_member

## Problema atual

Duas políticas RLS usam `is_area_member()` como condição genérica, permitindo que **qualquer membro da área** (incluindo sublíder e team_member) veja **todos** os projetos e tarefas da área:

1. **`org_projects` → "Members can view their org_projects"**
   ```
   is_project_member(uid, id) OR is_area_member(uid, estrutura_area_id)
   ```
   → Sublíder na área vê TODOS os projetos, mesmo sem ser membro.

2. **`fiscal_tasks` → "Members can view their project fiscal_tasks"**
   ```
   project_id IS NULL OR is_project_member(uid, project_id) OR is_area_member(uid, ...)
   ```
   → Mesma herança: sublíder vê todas as tarefas da área.

## Regra desejada

| Role | org_projects | fiscal_tasks |
|------|-------------|-------------|
| Admin | Tudo | Tudo |
| Líder | Tudo da sua área (`is_area_member`) | Tudo da sua área |
| Sublíder | Só onde é membro (`is_project_member`) ou criador | Só de projetos onde é membro OU `assigned_to = uid` |
| Team member | Só onde é membro ou criador | Só de projetos onde é membro OU `assigned_to = uid` |

## Mudanças (1 migration SQL)

### 1. `org_projects` — substituir policy "Members can view their org_projects"

```sql
DROP POLICY "Members can view their org_projects" ON public.org_projects;

-- Líder: pode ver tudo da sua área
CREATE POLICY "Leaders can view area org_projects"
  ON public.org_projects FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'lider'::app_role)
    AND estrutura_area_id IS NOT NULL
    AND is_area_member(auth.uid(), estrutura_area_id)
  );

-- Sublíder/Team member: apenas membro do projeto ou criador
CREATE POLICY "Members can view their org_projects"
  ON public.org_projects FOR SELECT TO authenticated
  USING (
    is_project_member(auth.uid(), id)
    OR created_by = auth.uid()
  );
```

### 2. `fiscal_tasks` — substituir policy "Members can view their project fiscal_tasks"

```sql
DROP POLICY "Members can view their project fiscal_tasks" ON public.fiscal_tasks;

-- Líder: tarefas de projetos da sua área
CREATE POLICY "Leaders can view area fiscal_tasks"
  ON public.fiscal_tasks FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'lider'::app_role)
    AND (
      project_id IS NULL
      OR EXISTS (
        SELECT 1 FROM org_projects tp
        WHERE tp.id = fiscal_tasks.project_id
          AND tp.estrutura_area_id IS NOT NULL
          AND is_area_member(auth.uid(), tp.estrutura_area_id)
      )
    )
  );

-- Sublíder/Team member: membro do projeto OU atribuído à tarefa
CREATE POLICY "Members can view their fiscal_tasks"
  ON public.fiscal_tasks FOR SELECT TO authenticated
  USING (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (
      project_id IS NULL
      OR is_project_member(auth.uid(), project_id)
      OR assigned_to = auth.uid()
    )
  );
```

### Tabelas não alteradas

- **`projects`**, **`tasks`**, **`sprint_backlog_items`**: Pertencem ao módulo Digital Rotina e usam `has_role_or_higher('team_member')` — são genéricas por design (todos da equipe veem). Não precisam de restrição por projeto.

## Impacto

- Admin: sem mudança (policy própria já existe)
- Líder: continua vendo tudo da sua área via `is_area_member`
- Sublíder: perde visão global da área, passa a ver **apenas** projetos onde é membro + tarefas onde é membro do projeto ou atribuído
- Team member: idem sublíder
- Nenhuma alteração de código frontend necessária — a restrição é puramente via RLS

