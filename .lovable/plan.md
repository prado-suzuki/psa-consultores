

## Correção: Filtro de ambiente na lista de empresas

### Arquivo: `src/components/gestao/CreateTicketDialog.tsx`

**Problema**: A query em `fetchEmpresas` (linha 109-114) já filtra `ativo=true` e `excluido=false`, mas **não filtra por `ambiente`**, causando duplicatas (registros de prod e dev aparecem juntos).

**Alterações**:

1. **Adicionar import** de `currentAmbiente` de `@/config/api` (linha 4)
2. **Adicionar filtro** `.eq('ambiente', currentAmbiente)` na query de `fetchEmpresas` (linha 113)
3. **Adicionar comentário TODO** acima da função `fetchEmpresas`:
   ```
   // TODO: Quando representante.user_id estiver preenchido, filtrar empresas pelo vínculo representante → cliente
   ```

Nenhuma outra alteração.

