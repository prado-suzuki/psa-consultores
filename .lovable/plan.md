

## Adaptar D100 ao novo modelo de resposta da API

### Contexto
O endpoint `/api/v1/pis_cofins/revisao/transp` mudou de um array flat de `D100Item` para um array de objetos aninhados com `D100`, `D101` (PIS), `D105` (COFINS), `0150` (participante), e campos raiz (`ID_CONTRIBUINTE`, `CNPJ_EFD`, `SIMPLES`).

### Arquivos alterados: 3

---

### 1. Atualizar tipos — `src/types/correcoesSped.ts`

- Criar interfaces `RegD101` e `RegD105` para os novos sub-registros de PIS e COFINS.
- Criar interface `D100ResponseEntry` representando cada item do array da API (com `ID_CONTRIBUINTE`, `CNPJ_EFD`, `SIMPLES`, `D100`, `D101`, `D105`, `0150`).
- Manter `D100Item` como tipo "flat" para uso na UI, mas atualizá-lo para incluir campos vindos do D101/D105 (VL_ITEM, CST_PIS, VL_BC_PIS, ALIQ_PIS, VL_PIS, NAT_BC_CRED do D101; CST_COFINS, VL_BC_COFINS, ALIQ_COFINS, VL_COFINS do D105) e COD_CTA (priorizar D101.COD_CTA ou D105.COD_CTA).

### 2. Atualizar hook — `src/hooks/useCorrecoesSped.ts`

- Alterar `useCorrecoesD100` de `useCorrecoesQuery` genérico para um `useQuery` customizado (como C170/A170).
- Na `queryFn`, receber `D100ResponseEntry[]` da API e achatar (flatten) para `D100Item[]`:
  ```
  entry => ({
    ...entry.D100,
    ID_CONTRIBUINTE: entry.ID_CONTRIBUINTE,
    CNPJ_EFD: entry.CNPJ_EFD,
    SIMPLES: entry.SIMPLES,
    CST_PIS: entry.D101?.CST_PIS ?? 0,
    ALIQ_PIS: entry.D101?.ALIQ_PIS ?? 0,
    VL_PIS: entry.D101?.VL_PIS ?? 0,
    CST_COFINS: entry.D105?.CST_COFINS ?? 0,
    ALIQ_COFINS: entry.D105?.ALIQ_COFINS ?? 0,
    VL_COFINS: entry.D105?.VL_COFINS ?? 0,
  })
  ```

### 3. Componente — `src/components/equipe/dev/correcoes-sped/TabD100.tsx`

- Sem alterações necessárias — o componente já consome `D100Item[]` flat. O achatamento no hook mantém a mesma interface.

---

### Resumo

| Arquivo | Alteração |
|---------|-----------|
| `types/correcoesSped.ts` | +`RegD101`, +`RegD105`, +`D100ResponseEntry`; atualizar `D100Item` |
| `hooks/useCorrecoesSped.ts` | Substituir `useCorrecoesQuery` por `useQuery` com flatten |
| `TabD100.tsx` | Nenhuma — consome `D100Item[]` inalterado |

**Total: 2 arquivos editados, ~40 linhas.**

