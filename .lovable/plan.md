

## Adicionar abas F120 e F130 à ferramenta Correções SPED

### Arquivos alterados/criados: 4

---

### 1. Tipos — `src/types/correcoesSped.ts`

Adicionar ao final do arquivo:

- **`F120Reg`**: campos do registro F120 (uuid, ID_ARQUIVO, NUM_LINHA, REG, NAT_BC_CRED, IDENT_BEM_IMOB, IND_ORIG_CRED, IND_UTIL_BEM_IMOB, VL_OPER_DEP, PARC_OPER_NAO_BC_CRED, CST_PIS, VL_BC_PIS, ALIQ_PIS, VL_PIS, CST_COFINS, VL_BC_COFINS, ALIQ_COFINS, VL_COFINS, COD_CTA, COD_CCUS, ID_PAI)
- **`F120Item`**: wrapper com ID_CONTRIBUINTE, NOME_RAZAO_SOCIAL, DT_INI, DT_FIN, DESC_IDENT_BEM_IMOB, DESC_IND_UTIL_BEM_IMOB, F120: F120Reg
- **`F130Reg`**: mesmos campos de impostos + MES_OPER_AQUIS, VL_OPER_AQUIS, PARC_OPER_NAO_BC_CRED, VL_BC_CRED, IND_NR_PARC (sem VL_OPER_DEP)
- **`F130Item`**: wrapper idêntico ao F120Item mas com F130: F130Reg

---

### 2. Hooks — `src/hooks/useCorrecoesSped.ts`

Adicionar dois hooks usando `useCorrecoesQuery` (mesmo padrão do `useCorrecoesF100`):

- **`useCorrecoesF120`**: queryKey `correcoes-f120`, endpoint `/api/v1/pis_cofins/revisao/ativo_imob_bens`
- **`useCorrecoesF130`**: queryKey `correcoes-f130`, endpoint `/api/v1/pis_cofins/revisao/ativo_imob_credito`

Atualizar import dos tipos para incluir `F120Item` e `F130Item`.

---

### 3. Componentes — criar 2 arquivos

**`src/components/equipe/dev/correcoes-sped/TabF120.tsx`** (baseado em TabF100):
- Props: `data: F120Item[]`, `isLoading`, `error`, `hasQueried`, `searchText`
- Busca filtra por `DESC_IDENT_BEM_IMOB` e `DESC_IND_UTIL_BEM_IMOB`
- Super cabeçalhos: "Dados do Bem" (4 cols) + "Impostos" (6 cols)
- Colunas: Bem Imobilizado (desc), Utilização (desc), Nat. Crédito, Depreciação (VL_OPER_DEP), CST PIS, % PIS, VL PIS, CST COF, % COF, VL COF
- Paginação via `TablePagination`

**`src/components/equipe/dev/correcoes-sped/TabF130.tsx`** (baseado em TabF120):
- Mesma estrutura, mas colunas do bem substituem Depreciação por "Mês Aquisição" (MES_OPER_AQUIS) e "Valor Aquisição" (VL_OPER_AQUIS) — super cabeçalho "Dados do Bem" com 5 cols

---

### 4. Integração — `src/pages/equipe/dev/CorrecoesSped.tsx`

- Importar `TabF120`, `TabF130`, `useCorrecoesF120`, `useCorrecoesF130`
- Instanciar os hooks com `queryParams`
- Incluir no `anyFetching` e no `handleConsultar` (refetch)
- Alterar `TabsList` de `grid-cols-4` para `grid-cols-6`
- Adicionar `TabsTrigger` para "F120 (Deprec.)" e "F130 (Aquis.)"
- Adicionar `TabsContent` renderizando os novos componentes

---

### Resumo

| Arquivo | Ação |
|---------|------|
| `src/types/correcoesSped.ts` | +4 interfaces |
| `src/hooks/useCorrecoesSped.ts` | +2 hooks, ~10 linhas |
| `src/components/equipe/dev/correcoes-sped/TabF120.tsx` | Criar (~120 linhas) |
| `src/components/equipe/dev/correcoes-sped/TabF130.tsx` | Criar (~130 linhas) |
| `src/pages/equipe/dev/CorrecoesSped.tsx` | Integrar abas + hooks |

**Total: 5 arquivos, ~280 linhas adicionadas.**

