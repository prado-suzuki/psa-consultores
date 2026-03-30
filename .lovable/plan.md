

## Plano: Adaptar dados hierárquicos da API de Apuração PIS/COFINS

### Contexto

O endpoint `pis_cofins/apuracao` agora retorna `contas` (árvore hierárquica com `children` e `lancamentos`) em vez de `itens_credito` (lista plana). A estrutura é:

```text
periodo
├── contas[]
│   ├── plano_conta, cod_cta, descricao_conta
│   ├── vlr_efd, credito, debito, saldo_periodo, saldo_atual
│   ├── lancamentos[] (itens com cst_pis, aliq_pis, bloco_efd...)
│   └── children[] (recursivo)
└── rateio_receitas (mantido igual)
```

### Estratégia

- **Modo Cliente (EFD)**: Achatar a árvore extraindo todos os `lancamentos` como `itens_credito`, mantendo toda a lógica de cálculo e pivot existente intacta.
- **Modo Prado (BALANCETE) - Resumo**: Novo componente de tabela em árvore que exibe as contas hierarquicamente com expand/collapse, mostrando `credito`, `debito`, `saldo_periodo` e `saldo_atual` por período.

### Alterações

**1. `src/types/pisCofins.ts`** — Novos tipos para estrutura hierárquica

- Adicionar `ContaNode` (nó da árvore: `plano_conta`, `cod_cta`, `descricao_conta`, valores numéricos, `lancamentos[]`, `children[]`)
- Atualizar `PisCofsinPeriodo` para incluir `contas?: ContaNode[]` (campo opcional, coexistindo com `itens_credito` para retrocompatibilidade)

**2. `src/lib/pisCofinsFilters.ts`** — Função de achatamento

- Criar `flattenContasToItens(contas: ContaNode[]): ItemCredito[]` — percorre recursivamente a árvore, extrai todos os `lancamentos` das folhas (contas sem children ou com children vazios)
- Isso alimenta o pipeline existente de cálculo/pivot sem alterá-lo

**3. `src/hooks/usePisCofinsCalculator.ts`** — Adaptador de dados

- No `filteredData` memo, se `data.periodos[].contas` existir e `itens_credito` não, achatar automaticamente usando `flattenContasToItens`
- Expor os dados brutos hierárquicos (`contasTree`) para o componente de árvore do Resumo Prado
- Agregar valores por período para a árvore (cross-period tree com valores pivotados)

**4. `src/components/equipe/dev/pis-cofins/BalanceteTreeTable.tsx`** — Novo componente

- Tabela com linhas aninhadas (indentação visual por nível)
- Cada conta-pai é expansível/colapsável (ícone ChevronRight/Down)
- Colunas: `Conta`, `Descrição`, e para cada período: `Crédito`, `Débito`, `Saldo Período`, `Saldo Atual`
- Contas-pai exibem seus próprios valores agregados
- Estado de expansão local (`Set<string>` de `plano_conta`)
- Botões "Expandir Tudo" / "Colapsar Tudo"
- Reutiliza `DynamicTableHeader` para os cabeçalhos de período com agrupamento por ano

**5. `src/pages/equipe/dev/ApuracaoPisCofins.tsx`** — Integração

- Na aba Resumo, quando `tipoApuracao === 'BALANCETE'`: renderizar `BalanceteTreeTable` com os dados hierárquicos em vez do `ApuracaoDataTable` flat
- Quando `tipoApuracao === 'EFD'`: manter o comportamento atual (tabela flat com pivot)

### Detalhes técnicos

| Arquivo | Tipo | Alteração |
|---------|------|-----------|
| `types/pisCofins.ts` | Edição | Adicionar `ContaNode`, campo `contas?` em `PisCofsinPeriodo` |
| `lib/pisCofinsFilters.ts` | Edição | Adicionar `flattenContasToItens()` |
| `hooks/usePisCofinsCalculator.ts` | Edição | Adaptar para novo formato + expor árvore |
| `pis-cofins/BalanceteTreeTable.tsx` | **Novo** | Componente de tabela em árvore |
| `ApuracaoPisCofins.tsx` | Edição | Condicional Resumo EFD vs BALANCETE |

