

## Fix: clientes duplicados no TaskModal (falta filtro de ambiente)

### Causa raiz
A query de clientes na linha 128-132 do `TaskModal.tsx` não aplica `.eq('ambiente', currentAmbiente)`, trazendo registros de **prod** e **dev** simultaneamente — gerando nomes duplicados.

A query de contribuintes (linha 162-167) tem o mesmo problema.

### Arquivo: `src/components/equipe/fiscal/tasks/TaskModal.tsx`

**Correção 1 — Query de clientes (linha 131):** adicionar filtro de ambiente
```typescript
.eq('ativo', true)
.eq('ambiente', currentAmbiente)  // ← adicionar
.order('nome');
```

**Correção 2 — Query de contribuintes (linha 166):** adicionar filtro de ambiente
```typescript
.eq('cliente_id', watchedClientId)
.eq('excluido', false)
.eq('ambiente', currentAmbiente)  // ← adicionar
.order('nome_razao_social');
```

**Correção 3 — Import:** adicionar `currentAmbiente` aos imports de `@/config/api` (se ainda não importado)
```typescript
import { currentAmbiente } from '@/config/api';
```

### Escopo
- Apenas `TaskModal.tsx`
- Zero migração
- Duas linhas adicionadas + 1 import

