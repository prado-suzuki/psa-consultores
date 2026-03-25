

## Fix: clientes soft-deleted aparecendo no TaskModal

### Causa raiz
A query de clientes (linha 132) filtra por `ativo = true` e `ambiente`, mas **não filtra `excluido = false`**. Existem 6 registros de "Grupo Bahia Potrich" com `excluido = true` no ambiente prod que continuam aparecendo.

### Arquivo: `src/components/equipe/fiscal/tasks/TaskModal.tsx`

**Linha 132 — adicionar filtro de excluído:**
```typescript
.eq('ativo', true)
.eq('excluido', false)   // ← adicionar
.eq('ambiente', currentAmbiente)
```

### Escopo
- Uma linha adicionada
- Apenas `TaskModal.tsx`
- Zero migração

