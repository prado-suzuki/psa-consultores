## Objetivo

No modal de tarefas em `/equipe/tax/projetos/tarefas`, exibir o campo **Horas realizadas** ao lado de **Horas estimadas**. O campo só fica editável quando o status da tarefa for **Concluído**; nos demais status, aparece desabilitado.

## Mudanças

### 1. Banco (migration)
- `ALTER TABLE public.org_tasks ADD COLUMN actual_hours numeric NULL;`
- Sem CHECK constraint, sem mudança de RLS.

### 2. `src/hooks/useOrgTasks.ts`
- Adicionar `actual_hours: number | null` em `OrgTask`.
- Adicionar `actual_hours?: number | null` em `CreateOrgTaskInput`.
- Mutations apenas espalham o payload; quando status sai de `done`, enviar `actual_hours: null`.

### 3. `src/components/equipe/fiscal/tasks/TaskModal.tsx`
- Zod: `actual_hours: z.coerce.number().positive().optional().nullable()` + `superRefine` exigindo `> 0` quando `status === 'done'`.
- Converter o bloco atual do `estimated_hours` (linhas 555–575) em `<div className="grid grid-cols-2 gap-4">` com dois `FormField`:
  - **Horas estimadas** (igual hoje, obrigatório).
  - **Horas realizadas** — sempre visível; `disabled={form.watch('status') !== 'done'}`; placeholder "Disponível ao concluir"; asterisco vermelho só aparece quando status = Concluído.
- No `onSubmit`: `actual_hours: values.status === 'done' ? values.actual_hours : null`.
- No `useEffect` de reset: `actual_hours: (task as any).actual_hours ?? ''`.

### 4. Sem mudanças
`TaskTable`, `TaskKanban`, `TaskCalendar`, `TaskGantt`, KPIs — escopo só do modal.

## Resultado

Linha com dois campos lado a lado: **Horas estimadas** (sempre obrigatório) e **Horas realizadas** (cinza/desabilitado até o usuário marcar como Concluído; aí vira obrigatório).
