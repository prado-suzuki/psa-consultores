

# Correção: Projetos e tarefas invisíveis para líderes no Tax

## Diagnóstico

As políticas RLS atuais de SELECT em `tax_projects` são:
1. **Admin vê tudo** -- `has_role('admin')`
2. **Criador vê os próprios** -- `created_by = auth.uid()`
3. **Membro vê se estiver em tax_project_members** -- `is_project_member(auth.uid(), id)`

**Falta uma política para `lider` ver todos os projetos.** Líderes como Felipe, Washington e Ricardo só veem projetos onde são membros explícitos ou criadores.

Para `fiscal_tasks`, a política de SELECT para membros exige `is_project_member` mesmo para líderes, limitando a visibilidade.

## Correção

Uma migration SQL para:

1. **Adicionar política SELECT em `tax_projects`** para `lider` ver todos os projetos
2. **Atualizar política SELECT em `fiscal_tasks`** para que `lider` veja todas as tarefas (sem exigir membership)

```sql
-- 1. Líderes veem todos os projetos
CREATE POLICY "Leaders can view all tax_projects"
  ON public.tax_projects FOR SELECT
  TO public
  USING (has_role(auth.uid(), 'lider'::app_role));

-- 2. Corrigir fiscal_tasks: separar lider da checagem de membership
DROP POLICY "Members can view their project fiscal_tasks" ON public.fiscal_tasks;

CREATE POLICY "Leaders can view all fiscal_tasks"
  ON public.fiscal_tasks FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'lider'::app_role));

CREATE POLICY "Members can view their project fiscal_tasks"
  ON public.fiscal_tasks FOR SELECT
  TO authenticated
  USING (
    has_role(auth.uid(), 'team_member'::app_role)
    AND (project_id IS NULL OR is_project_member(auth.uid(), project_id))
  );
```

## Impacto
- **0 alterações de código** -- apenas RLS
- Líderes (Felipe, Washington, Ricardo) passarão a ver todos os projetos e tarefas
- Team members continuam vendo apenas os projetos em que são membros
- Admins permanecem com visão total

