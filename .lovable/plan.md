

## Adicionar filtro por Projeto na tela de Tarefas Fiscais

Tres alteracoes pontuais, sem mudanca de RLS ou banco.

---

### 1. Hook `src/hooks/useFiscalTasks.ts`

- Adicionar `projectId?: string` ao tipo `TaskFilters` (linha 49-57)
- Adicionar bloco de filtragem apos o filtro de `department` (~linha 113):
  ```typescript
  if (filters?.projectId) {
    query = query.eq('project_id', filters.projectId);
  }
  ```

### 2. Componente `src/components/equipe/fiscal/tasks/TaskFilters.tsx`

- Receber nova prop `projects: { id: string; name: string }[]`
- Adicionar um `Select` de Projeto entre o select de Responsavel e o botao Filtros:
  - Valor "all" = "Todos os projetos"
  - Lista dos projetos recebidos via prop
  - Largura `w-52`, icone `FolderKanban`
- Handler: `onFiltersChange({ ...filters, projectId: value === 'all' ? undefined : value })`
- Na area de badges ativos, mostrar badge do projeto selecionado com botao X para limpar

### 3. Pagina `src/pages/equipe/fiscal/FiscalDemandasTarefas.tsx`

- Nova query com `useQuery` para buscar projetos:
  ```typescript
  const { data: projects = [] } = useQuery({
    queryKey: ['tax-projects-for-filter'],
    queryFn: async () => {
      const { data } = await supabase
        .from('tax_projects')
        .select('id, name')
        .order('name');
      return data || [];
    },
  });
  ```
- Passar `projects` como prop ao componente `TaskFilters`

### Resumo de arquivos alterados

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useFiscalTasks.ts` | `projectId` no tipo + `.eq()` na query |
| `src/components/equipe/fiscal/tasks/TaskFilters.tsx` | Nova prop + Select de projeto + badge ativo |
| `src/pages/equipe/fiscal/FiscalDemandasTarefas.tsx` | Query de `tax_projects` + passar prop |

