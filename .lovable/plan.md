

# Adicionar coluna `estimated_hours` na tabela `fiscal_tasks`

## Diagnóstico

A coluna `estimated_hours` **não existe** na tabela `fiscal_tasks`. O Kanban fiscal tenta renderizar `task.estimated_hours` mas o campo nunca vem do banco.

## Plano

### 1. Migration SQL
```sql
ALTER TABLE public.fiscal_tasks ADD COLUMN estimated_hours numeric;
```

### 2. Atualizar interface `FiscalTask` em `src/hooks/useFiscalTasks.ts`
Adicionar `estimated_hours: number | null;` ao tipo `FiscalTask`.

### 3. Atualizar interface `CreateFiscalTaskInput` em `src/hooks/useFiscalTasks.ts`
Adicionar `estimated_hours?: number;` ao tipo de input.

### 4. Atualizar `TaskModal.tsx`
Adicionar campo "Horas estimadas" no formulário (input numérico, opcional) e incluir no schema zod como `z.number().optional()`.

**4 pontos de edição: 1 migration + 3 arquivos TypeScript.**

