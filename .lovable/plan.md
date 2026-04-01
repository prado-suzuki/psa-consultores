

## Diagnóstico: Tela branca na Apuração PIS/COFINS

### Causa raiz

Quando a API retorna períodos onde `itens_credito` é `undefined` ou `null` (por exemplo, períodos que só possuem `contas` mas onde `needsFlatten` é `false`), o código falha em dois pontos:

1. **`usePisCofinsCalculator.ts` linha 59**: Se `needsFlatten` é `false` e não há `extraContas`, o hook retorna `data` direto (sem normalizar), deixando `itens_credito` como `undefined`.
2. **Linha 113**: `p.itens_credito.filter(hasEfdRecord)` — crash se `itens_credito` é `undefined`.
3. **`pisCofinsFilters.ts` linha 158**: `for (const item of periodo.itens_credito)` — também crash se `undefined`.

O cenário: contribuinte tem EFD Contribuições **e** balancete. A API retorna períodos com `contas` preenchido mas `itens_credito` ausente. Se todos os períodos têm `contas` e nenhum tem `itens_credito`, `needsFlatten` = `true` e funciona. Mas se algum período tem `itens_credito` vazio (array `[]`), `needsFlatten` avalia como `false` e o `data` é retornado cru.

### Correção

Adicionar null-safety em 3 pontos:

**1. `src/hooks/usePisCofinsCalculator.ts`**

- Linha 58: Ajustar condição do `needsFlatten` para ser mais defensiva
- Linha 59: Remover o early-return que pula a normalização — **sempre** normalizar para garantir `itens_credito` como array
- Linha 113: `(p.itens_credito ?? []).filter(...)` como segurança extra

**2. `src/lib/pisCofinsFilters.ts`**

- Linha 158: `for (const item of (periodo.itens_credito ?? []))` no `buildPivotGeneric`
- Linha 62: `for (const item of (periodo.itens_credito ?? []))` no `buildPivot`

**3. `src/lib/apuracaoPisCofins.ts`**

- Todas as funções que fazem `periodo.itens_credito.filter(...)` ou `.reduce(...)` — adicionar `?? []` defensivo nos pontos de entrada (`calcTodosPeriodos` e `calcTodosPeriodosBalancete`).

### Resultado

A normalização sempre garante que `itens_credito` é um array válido, eliminando o crash em produção.

