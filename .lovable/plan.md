

## Adicionar campo Categoria ao formulario de tarefas fiscais

Duas etapas: migration no banco e atualizacao do formulario.

---

### Etapa 1 — Migration

Adicionar coluna `categoria_id` na tabela `fiscal_tasks`:

```sql
ALTER TABLE public.fiscal_tasks
ADD COLUMN categoria_id uuid REFERENCES public.tax_categorias(id) ON DELETE SET NULL;
```

Sem alteracao de RLS (as policies existentes ja cobrem a nova coluna).

---

### Etapa 2 — Atualizar `TaskModal.tsx`

**Remover:**
- Campo `department` do schema Zod, do formulario, do reset e do submit

**Adicionar:**
- `categoria_id: z.string().optional()` ao schema Zod

**Nova query reativa de categorias:**
- Observar `project_id` via `form.watch('project_id')`
- Quando um projeto estiver selecionado, buscar o `area_id` do projeto em `tax_projects`
- Com o `area_id`, buscar categorias em `tax_area_categorias` com join em `tax_categorias` para trazer `id` e `nome`
- Quando o projeto mudar, limpar `categoria_id` via `form.setValue('categoria_id', undefined)`

**Nova ordem dos campos no formulario:**

1. Projeto + Cliente (grid 2 colunas — ja existem, mover para o topo)
2. Categoria (Select condicional — so aparece se projeto selecionado)
3. Titulo
4. Descricao
5. Status + Prioridade (grid 2 colunas)
6. Responsavel (sem Departamento ao lado — campo removido)
7. Data de Vencimento + Horario (grid 2 colunas)
8. Evento Fixo + Recorrente (switches)
9. Frequencia (condicional)
10. Tarefa Pai

---

### Etapa 3 — Atualizar `useFiscalTasks.ts`

- Adicionar `categoria_id` ao tipo `CreateFiscalTaskInput`
- Adicionar `categoria_id` ao tipo `FiscalTask`
- No select da query, incluir join: `categoria:tax_categorias(id, nome)`
- Remover `department` do `CreateFiscalTaskInput` (campo removido do formulario)

**Nota:** O campo `department` continuara existindo na tabela e no tipo `FiscalTask` para nao quebrar filtros/visualizacoes existentes que o utilizam. Apenas o formulario deixa de exibi-lo.

---

### Resumo de alteracoes

| Arquivo | O que muda |
|---------|-----------|
| Migration SQL | Nova coluna `categoria_id` em `fiscal_tasks` |
| `src/hooks/useFiscalTasks.ts` | `categoria_id` nos tipos + join com `tax_categorias` |
| `src/components/equipe/fiscal/tasks/TaskModal.tsx` | Remove campo department, adiciona campo Categoria condicional, reordena campos |

