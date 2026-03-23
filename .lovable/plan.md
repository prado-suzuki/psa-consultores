

## Plano: Aba "Balancete vs EFD Contribuições" (revisado)

### Arquitetura

```text
AuditoriaCruzada.tsx (página — filtros globais preservados)
  └─ BalanceteEfdTab.tsx (componente isolado)
       ├─ Filtros locais (busca debounced + dropdown bloco)
       ├─ Botão "+ Adicionar Registro" → Dialog vazio
       └─ Tabela com highlight de divergência

types/auditoriaCruzada.ts  (tipagem)
hooks/useBalanceteEfd.ts   (fetch controlado)
```

### Arquivos

**1. `src/types/auditoriaCruzada.ts`** (novo)
- Interface `BalanceteEfdItem` com todos os campos do JSON
- Interface `BalanceteEfdResponse` com `itens: BalanceteEfdItem[]`

**2. `src/hooks/useBalanceteEfd.ts`** (novo)
- `useQuery` com `enabled: false` — nunca dispara no mount
- Endpoint: `getApiUrl('/api/v1/pis_cofins/comparacoes/efdc_balancete')`
- Params: `id_contribuinte`, `dt_ini`, `dt_fim`
- Retorna `{ data, isLoading, error, refetch }`
- O fetch só ocorre via `refetch()` chamado pelo botão Consultar

**3. `src/components/equipe/dev/auditoria/BalanceteEfdTab.tsx`** (novo, ~150 linhas)
- **Props**: `itens`, `isLoading`, `hasQueried`
- **Filtros locais**:
  - Input Conta Contábil com **debounce de 300ms** (state `searchTerm` para o input, `debouncedSearch` para o filtro real via `useEffect` + `setTimeout`)
  - Select Bloco EFD (opções extraídas via `useMemo` dos dados)
- **Botão "+ Adicionar Registro"** → Dialog vazio
- **Tabela**: Data, Conta Contábil (`cod_cta - descricao_conta`), Bloco SPED, CST, Alíquota, Valor EFD, Débito, Crédito, Saldo Período — todos financeiros em BRL
- **Divergência**: lógica `isDivergent` mantida exatamente como aprovada (tolerância 10%, `Math.abs(saldo_periodo)` vs `vlr_efd`). Linha divergente recebe `bg-red-50 dark:bg-red-950/20` + ícone `AlertTriangle` na coluna Data, sem afetar legibilidade dos números

**4. `src/pages/equipe/dev/AuditoriaCruzada.tsx`** (edição)
- State `hasQueried`, importar hook `useBalanceteEfd`
- Botão Consultar: seta `hasQueried = true`, chama `refetch()`
- Limpar: reseta `hasQueried = false`
- TabsContent `balancete-efd`: renderiza `<BalanceteEfdTab>`

### Restrições confirmadas

1. **Hook desativado no mount** — `enabled: false`, fetch exclusivamente via `refetch()`
2. **Debounce 300ms** no filtro de Conta Contábil — sem re-render por keystroke
3. **isDivergent** com tolerância 10% e `Math.abs(saldo_periodo)` — lógica mantida sem alteração

4 arquivos (3 novos + 1 editado), ~220 linhas.

