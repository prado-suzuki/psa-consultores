

## Plan: Adicionar filtros Excel (Conta e Descrição) na aba Balancete da Auditoria Cruzada

### Contexto

As abas EFD ICMS e EFD XML já possuem `ColumnFilterDropdown`. A aba Balancete usa o `BalanceteTreeTable` que renderiza dados hierárquicos via `DynamicTableHeader` — este já suporta a prop `renderHeaderExtra` mas ela não é utilizada no `BalanceteTreeTable`.

### Abordagem

Adicionar filtro/ordenação por coluna nas colunas sticky "Conta" e "Descrição" diretamente no `BalanceteTreeTable`, reutilizando o `ColumnFilterDropdown` existente.

Como os dados são hierárquicos (árvore), a lógica precisa:
1. **Coletar valores únicos** recursivamente de toda a árvore merged (folhas e nós)
2. **Filtrar a árvore** recursivamente — manter nó se ele próprio passa no filtro OU se algum filho passa
3. **Ordenar** nós no mesmo nível pela coluna selecionada

### Alteração: `src/components/equipe/dev/pis-cofins/BalanceteTreeTable.tsx`

**Adicionar:**
- Import do `ColumnFilterDropdown`
- Estado `sortConfig` e `columnFilters` (mesmo padrão da `ApuracaoDataTable`)
- Constante `FILTERABLE_KEYS` mapeando `{ key: 'cod_cta', label: 'Conta' }` e `{ key: 'descricao_conta', label: 'Descrição' }`
- Função recursiva `collectUniqueValues(nodes, key)` → extrai valores únicos da árvore para cascata
- Função recursiva `filterTree(nodes, filters)` → retorna árvore filtrada preservando ancestrais
- Função recursiva `sortTree(nodes, key, direction)` → ordena nós no mesmo nível
- `useMemo` com `cascadingUniqueValues` (para cada coluna, filtra pela outra antes de coletar)
- `useMemo` com `processedTree` que aplica filtros + ordenação sobre `mergedTree`
- Callback `renderHeaderExtra` que retorna `ColumnFilterDropdown` para as colunas filtráveis
- Passar `renderHeaderExtra` para `DynamicTableHeader`
- Usar `processedTree` em vez de `mergedTree` no `renderRows`

**Lógica de filtragem recursiva:**
```text
filterTree(nodes, filters):
  para cada nó:
    selfMatch = nó.cod_cta está no filtro de Conta AND nó.descricao_conta está no filtro de Descrição
    filteredChildren = filterTree(nó.children, filters)
    incluir se selfMatch OU filteredChildren.length > 0
```

**Lógica de cascata:**
Para a coluna "Conta", os valores únicos são computados a partir da árvore filtrada apenas pelo filtro de "Descrição" (e vice-versa), garantindo que os checkboxes reflitam valores disponíveis.

### Nenhum outro arquivo precisa ser alterado

O `BalanceteEfdTab` já passa os dados e o `BalanceteTreeTable` encapsula toda a lógica internamente. A busca por texto existente no `BalanceteEfdTab` continua funcionando em paralelo (filtra antes de passar para o componente).

### Resultado

- Ícone de funil aparece nos headers "Conta" e "Descrição" do Balancete
- Dropdown com ordenação Asc/Desc e checkboxes de valores únicos
- Filtros em cascata entre as duas colunas
- Árvore preserva hierarquia (nós pais visíveis quando filhos passam no filtro)

