

## Filtros no header de Cadastro de Projetos

### Resumo
Adicionar 3 selects (Cliente, Produto, Status) + botão "Limpar" direto no componente `FiscalProjetosCadastro.tsx`. Sem hook novo — filtragem local sobre dados já carregados.

### Arquivo: `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**1. Estado dos filtros (~linha 86):**
```typescript
const [filterCliente, setFilterCliente] = useState('');
const [filterProduto, setFilterProduto] = useState('');
const [filterStatus, setFilterStatus] = useState('');
```

**2. Memo para opções únicas e lista filtrada (~linha 91):**
- Extrair clientes únicos, produtos únicos e status únicos do array `projects`
- Aplicar os 3 filtros para gerar `filteredProjects`

**3. UI — linha de filtros entre header e tabela (~linha 331):**
Três `Select` (já importado) lado a lado + botão "Limpar filtros". Layout `flex gap-3 items-end`.

**4. Substituir `projects` por `filteredProjects`** no map da tabela e no contador.

### Escopo
- Apenas `FiscalProjetosCadastro.tsx`
- Zero hooks novos, zero migrations
- Componentes `Select`, `Button` já importados
- Adicionar ícone `Search` ou `Filter` do lucide-react

