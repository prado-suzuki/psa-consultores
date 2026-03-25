

## Reorganizar campos do TaskModal e remover tags/recorrência/evento fixo

### Arquivo: `src/components/equipe/fiscal/tasks/TaskModal.tsx`

**Remover imports:** `X`, `Badge`, `Switch` (não mais usados)

**Schema zod — remover campos:**
- `is_recurring`, `recurrence_type`, `category`, `tags`

**defaultValues — remover:** `is_recurring`, `category`, `tags`

**State — remover:** `tagInput` e `setTagInput`

**form.reset (edição, linha 300-319):** remover `is_recurring`, `recurrence_type`, `category`, `tags`

**form.reset (novo, linha 329-341):** remover `is_recurring`, `category`, `tags`

**onSubmit — remover do input:** `is_recurring`, `recurrence_type`, `category`, `tags`

**Remover:** `const isRecurring = form.watch('is_recurring');` (linha 393)

**JSX — remover blocos:**
- Evento Fixo + Recorrente (linhas 759-794)
- Frequência condicional (linhas 796-821)
- Tags (linhas 853-907)

**JSX — nova ordem com seções:**

```text
SEÇÃO 1: CONTEXTO (h3 label)
  - Cliente (full width select)
  - Projeto * (full width select)
  - Contribuinte (full width select, disabled sem cliente)
  - Serviço (full width select, disabled sem OS/produto)

SEÇÃO 2: TAREFA (h3 label)
  - Título * (input)
  - Descrição (textarea rows=2)
  - Tarefa Pai / subtarefa de (select)

SEÇÃO 3: EXECUÇÃO (h3 label)
  - Status * | Prioridade * (grid 2 cols)
  - Responsável (select)
  - Horas estimadas (input number)
  - Data de Início | Data de Vencimento (grid 2 cols)

Footer: Cancelar | Criar/Salvar
```

Seções separadas por `<h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">`. Container de cada seção usa `space-y-4`. Form principal usa `space-y-6`.

Cliente e Projeto passam de grid 2-cols para full-width (cada um em sua própria linha).

### Não alterado
- Hooks de mutação (`useFiscalTasks.ts`)
- Colunas do banco (`tags`, `is_recurring`, `recurrence_type`, `category`)
- Toda lógica de dependência entre campos (cliente→projeto, projeto→cliente auto-fill, projeto→serviço via OS)
- Nenhuma migração

### Verificação
- Build limpo (`tsc`)

