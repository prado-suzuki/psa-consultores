

## Plano: Fase 2 — Integrar UI com camada de dados refatorada

### Arquivos a criar/alterar

| Arquivo | Acao |
|---|---|
| `src/hooks/useTableHeaders.ts` | Criar — hook do arquivo enviado (expandedYear, headerRow1, headerRow2, headerBottom) |
| `src/components/equipe/dev/pis-cofins/DynamicTableHeader.tsx` | Criar — componente de header com botoes +/- para expandir/colapsar anos |
| `src/components/equipe/dev/pis-cofins/ApuracaoDataTable.tsx` | Criar — tabela generica que consome useTableHeaders + DynamicTableHeader |
| `src/pages/equipe/dev/ApuracaoPisCofins.tsx` | Reescrever — substituir PivotTable inline por usePisCofinsCalculator + ApuracaoDataTable + abas |

### Detalhes

**1. `useTableHeaders.ts`** — Copiar fielmente o arquivo enviado pelo usuario.

**2. `DynamicTableHeader.tsx`** — Copiar do anexo `DynamicTableHeader-2.tsx`. Tipar `headerRow1`/`headerRow2` com interfaces proprias em vez de `any[]`.

**3. `ApuracaoDataTable.tsx`** — Copiar do anexo `ApuracaoDataTable-2.tsx`. Tipar `data` como `PivotRowGeneric[]` em vez de `any[]`.

**4. `ApuracaoPisCofins.tsx`** — Reescrever completo:
- **Manter intacto**: filtros (Cliente, Contribuinte, Data Inicio, Data Fim), queries de clientes/contribuintes, handleSearch, handleClear, loading/error states
- **Remover**: componente PivotTable inline (linhas 28-242), imports de buildPivot/isDebito/isExclusao/isCredito, useMemo dos pivots (linhas 301-305)
- **Adicionar estado**: `activeTab` ('apuracao' | 'dados'), `expandedYear` (string | null), `tipoApuracao` ('EFD' | 'BALANCETE'), `periodoFechado` (boolean)
- **Adicionar hooks**: `usePisCofinsCalculator({ data: apiData, tipoApuracao, periodoFechado })` → resultados, totais, columnsData, tables; `useTableHeaders({ columnsData, expandedYear })` → headerRow1, headerRow2, headerBottom, etc.
- **Helpers**: `getResultadoColValue(resultados, dataKeys, accessor)` — soma valores de resultados cujo `dt_ini.substring(0,7)` esta em dataKeys; `getRateioReceitasColValue` — idem para rateio_receitas
- **Aba "Apuracao"**: Tabela "Saldo a Pagar Consolidado" com DynamicTableHeader (3 linhas: PIS Due, COFINS Due, Total a Recolher) + secao Rateio (percentuais por tipo de receita, apenas quando tipoApuracao === 'EFD')
- **Aba "Dados"**: 6 tabelas via ApuracaoDataTable (Resumo com showCst+showBloco, Debitos com showTotal, Isencoes, Outras Saidas, Creditos, Isencoes Credito)
- **Filtros extras**: Toggle EFD/Balancete + checkbox "Periodo Fechado" (visivel apenas quando BALANCETE)

### Eliminacoes

- Componente `PivotTable` inline — substituido por `ApuracaoDataTable`
- Imports de `buildPivot`, `isDebito`, `isExclusao`, `isCredito` — substituidos por `usePisCofinsCalculator.tables`
- `useMemo` de pivots individuais — agora dentro do calculator hook
- Import de `PivotRow` type — substituido por `PivotRowGeneric`

