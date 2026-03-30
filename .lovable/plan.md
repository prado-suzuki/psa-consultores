

## Plano: Filtrar apenas contas com registro no EFD na apuração "Cliente"

### Contexto

A API retorna todos os itens (EFD + Balancete). No modo "Cliente" (EFD), itens sem registro no EFD aparecem nas tabelas — são itens com `vlr_efd === 0` e `bloco_efd === null` (vindos apenas do balancete). Esses itens devem ser excluídos quando o tipo de apuração é "Cliente" (EFD).

### Abordagem

Pré-filtrar os `itens_credito` de cada período **no `usePisCofinsCalculator`**, antes de passá-los para os cálculos e pivots. Criar um `useMemo` que produz uma versão filtrada de `data` quando `tipoApuracao === 'EFD'`.

### Alteração (arquivo único: `usePisCofinsCalculator.ts`)

**1. Novo predicado inline** (L48-49, após a assinatura da função):

```ts
const hasEfdRecord = (i: ItemCredito): boolean => i.vlr_efd !== 0;
```

Um item "tem registro no EFD" quando `vlr_efd !== 0`. Itens com `vlr_efd === 0` e `bloco_efd === null` são registros exclusivamente do balancete.

**2. Novo `useMemo` para dados filtrados** (antes do cálculo de `resultados`, ~L51):

```ts
const filteredData: ApuracaoInput | null = useMemo(() => {
  if (!data) return null;
  if (tipoApuracao !== 'EFD') return data;
  return {
    ...data,
    periodos: data.periodos.map((p) => ({
      ...p,
      itens_credito: p.itens_credito.filter(hasEfdRecord),
    })),
  };
}, [data, tipoApuracao]);
```

**3. Substituir `data` por `filteredData`** em todos os consumidores:

| Uso atual | Substituir por |
|-----------|---------------|
| `resultados` → `calcTodosPeriodos(data)` | `calcTodosPeriodos(filteredData)` |
| `resultados` → `calcTodosPeriodosBalancete(data, ...)` | `calcTodosPeriodosBalancete(filteredData, ...)` |
| `columnsData` → `data.periodos` | `filteredData?.periodos` |
| `periodos = data?.periodos` (L87) | `filteredData?.periodos` |

Quando `tipoApuracao === 'BALANCETE'` (Prado), `filteredData === data` — sem filtro, todos os itens aparecem.

### Arquivos modificados

| Arquivo | Alteração |
|---------|-----------|
| `usePisCofinsCalculator.ts` | +predicado `hasEfdRecord`; +`useMemo` `filteredData`; substituir referências de `data` por `filteredData` nos cálculos e pivots |

