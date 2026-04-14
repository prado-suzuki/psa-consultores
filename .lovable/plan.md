

# Correção de filtros de ambiente nos hooks de chamados

## Resultado da verificação

| Hook / Query | Tem coluna `ambiente`? | Filtro necessário | Status atual |
|---|---|---|---|
| `useTickets.ts` → query `cliente` | ✅ Sim (`cliente.ambiente`) | `.eq('ambiente', currentAmbiente)` | ❌ Falta — **CORRIGIR** |
| `useClienteClusters.ts` → query `representante` | ❌ Não tem `ambiente` | Apenas `.eq('excluido', false)` | ❌ Falta `excluido` — **CORRIGIR** |
| `useCreateTicket.ts` → `useTicketEmpresas` | ✅ Já filtra | Nenhum | ✅ OK |

## Alterações

### 1. `src/hooks/useTickets.ts`
- Na query de enriquecimento `cliente.nome` (~L157), adicionar `.eq('ambiente', currentAmbiente)`
- Importar `currentAmbiente` de `@/config/api` (se não importado)

### 2. `src/hooks/useClienteClusters.ts`
- Na query ao `representante` (~L18-22), adicionar `.eq('excluido', false)`
- **Não** adicionar filtro de `ambiente` (coluna não existe nessa tabela)

**0 migrations, 2 arquivos editados.**

