

## Plan: Autocomplete (Typeahead) no campo de busca por Conta Contábil

### Arquivo: `src/components/equipe/dev/auditoria/BalanceteEfdTab.tsx`

### O que muda

Substituir o `<Input>` simples (linhas 106-113) por um componente autocomplete inline usando `Popover` + lista virtualizada de sugestões.

### Lógica

1. **Extrair contas únicas**: Função recursiva `collectAllContas(nodes)` que percorre toda a árvore de todos os períodos e retorna `Map<cod_cta, descricao_conta>` — deduplica por `cod_cta`. Executada via `useMemo` sobre `periodos`.

2. **Filtrar sugestões**: `useMemo` que filtra as contas únicas pelo `searchTerm` (match em `cod_cta` ou `descricao_conta`, case-insensitive). Limite de 50 resultados para performance.

3. **UI do dropdown**: 
   - `Popover` controlado (`open` = `searchTerm.length >= 1 && suggestions.length > 0 && inputFocused`)
   - `PopoverTrigger` wraps o input existente (mantém ícone Search e estilo)
   - `PopoverContent` com `max-h-[240px] overflow-y-auto` contendo lista de itens clicáveis
   - Cada item mostra `cod_cta` em bold + `descricao_conta` truncado

4. **Seleção**: Ao clicar numa sugestão, preenche `searchTerm` com `cod_cta` e fecha o dropdown. O debounce existente dispara a filtragem da árvore normalmente.

5. **Teclado**: ESC fecha o dropdown. Foco no input mantém o dropdown aberto.

### Nenhum outro arquivo afetado

Toda a lógica é local ao `BalanceteEfdTab`. O `filterContasTree` e o fluxo de dados para `BalanceteTreeTable` permanecem inalterados.

