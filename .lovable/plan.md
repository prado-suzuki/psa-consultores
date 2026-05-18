## Objetivo
Vincular itens do backlog geral (`/equipe/backlog`) a projetos específicos de `public.projects`, mantendo o vínculo opcional e preservando o histórico do backlog mesmo se o projeto for excluído.

## Mudança no banco
Migração única em `public.sprint_backlog_items`:

- Adiciona coluna `project_id uuid` (nullable)
- FK → `public.projects(id)` com `ON DELETE SET NULL` (preserva o item se o projeto for apagado)
- Índice em `project_id` para acelerar a query da aba Backlog dentro do projeto

```sql
ALTER TABLE public.sprint_backlog_items
  ADD COLUMN IF NOT EXISTS project_id uuid
  REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS sprint_backlog_items_project_id_idx
  ON public.sprint_backlog_items(project_id);
```

## Pós-migração
- `src/integrations/supabase/types.ts` é regenerado automaticamente após a aprovação da migração — refletirá a nova coluna `project_id` em `sprint_backlog_items`.
- Frontend (`EquipeBacklog.tsx` e `EquipeProjetos.tsx`) já está pronto para consumir o campo, então nenhuma alteração de código é necessária neste passo.

## Fora de escopo
- Nenhuma mudança em RLS (a tabela mantém as políticas atuais; `project_id` é apenas um campo opcional de relacionamento).
- Nenhum backfill — itens existentes ficam com `project_id = NULL`.
