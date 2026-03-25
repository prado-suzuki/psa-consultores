

## Ordenação por coluna na tabela de Projetos

### Resumo
Adicionar ordenação clicável nos headers da tabela. Clicar na coluna "Cliente" (ou qualquer outra) ordena a lista alfabeticamente; clicar de novo inverte a ordem.

### Arquivo: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**1. Estado de ordenação (~linha 88):**
```typescript
const [sortColumn, setSortColumn] = useState<string | null>(null);
const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
```

**2. Função de toggle:**
```typescript
const handleSort = (column: string) => {
  if (sortColumn === column) {
    setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
  } else {
    setSortColumn(column);
    setSortDirection('asc');
  }
};
```

**3. Aplicar sort no `filteredProjects` (no useMemo existente ou novo):**
Após filtrar, ordenar com base em `sortColumn` — extraindo o valor textual de cada coluna (ex: `project.external_client?.nome` para Cliente, `project.name` para Projeto, etc.) e usando `localeCompare`.

**4. Headers clicáveis (linhas 428-439):**
Substituir os `<TableHead>` estáticos por botões clicáveis com ícone de seta (ArrowUpDown do lucide-react) indicando a direção da ordenação ativa.

### Colunas com ordenação
- Projeto → `project.name`
- Produto → `project.servico_contratado`
- Cliente → `project.external_client?.nome`
- Área → `getAreaLabel(project)`
- Responsável → `project.responsible?.first_name`
- Status → `project.status`

### Escopo
- Apenas `FiscalProjetosCadastro.tsx`
- Zero migrations, zero hooks novos
- Importar `ArrowUpDown` (ou `ChevronUp`/`ChevronDown`) do lucide-react

