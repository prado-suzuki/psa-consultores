

## Diagnóstico: Clientes duplicados

### Causa raiz

A tabela `cliente` tem uma coluna `ambiente` (`'dev'` | `'prod'`) que separa dados de desenvolvimento e produção. Cada cliente existe em ambos os ambientes (48 prod + 45 dev).

**O problema são 2 falhas de filtro:**

1. **`GestaoClientes.tsx`** — a query principal (`clientes-filtrados`) e a query de dropdown (`clientes-lista`) **não filtram por `ambiente`**, então mostram os registros `dev` + `prod` juntos, duplicando tudo.

2. **`NewClientModal.tsx`** — o `clientPayload` no insert **não inclui `ambiente`**, então novos clientes podem ser criados sem esse campo (ou com NULL), causando inconsistência.

A página `FiscalClients.tsx` (via `useFiscalClients.ts`) funciona corretamente porque **já filtra** `.eq('ambiente', currentAmbiente)`.

### Plano de correção

| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/fiscal/GestaoClientes.tsx` | Adicionar `.eq('ambiente', currentAmbiente)` nas 3 queries: `clientes-lista` (linha 52), `contribuintes-por-cliente` (linha 67), e `clientes-filtrados` (linha 121). Importar `currentAmbiente` de `@/config/api`. |
| `src/components/equipe/fiscal/NewClientModal.tsx` | Adicionar `ambiente: currentAmbiente` ao `clientPayload` (linha ~1356). Importar `currentAmbiente` de `@/config/api`. |

### Resultado esperado
- Lista de clientes mostra apenas registros do ambiente correto (sem duplicatas)
- Novos clientes são criados com o `ambiente` correto
- Zero alteração de lógica de negócio ou visual

