

## Plano: Extrair queries inline e corrigir filtro de ambiente

### Diagnóstico

| Arquivo | Problema |
|---|---|
| `TaskModal.tsx` L125-138 | Query inline de clientes (já tem `ambiente`, mas viola padrão de hooks) |
| `TaskModal.tsx` L160-173 | Query inline de contribuintes (já tem `ambiente`, viola padrão) |
| `TaskFilters.tsx` L56-68 | Query inline de clientes (tem `ambiente`, viola padrão) |
| `TaskFilters.tsx` L70-82 | Query inline de contribuintes — **BUG: falta `.eq('ambiente', currentAmbiente)`** |

### Solução

Hooks `useExternalClients` e `useContribuintes` **já existem** em `useTaxReferenceData.ts` com os filtros corretos. Basta reutilizá-los.

### Alterações

**1. `src/components/equipe/fiscal/tasks/TaskModal.tsx`**
- Remover queries inline de clientes (L125-138) e contribuintes (L160-173)
- Remover imports de `useQuery` e `supabase`
- Importar `useExternalClients`, `useContribuintes` de `useTaxReferenceData`
- Usar: `const { data: clients = [] } = useExternalClients()` (prop `enabled` via wrapper ou condicional no componente)
- Usar: `const { data: contribuintesTask = [] } = useContribuintes(watchedClientId)`

**2. `src/components/equipe/fiscal/tasks/TaskFilters.tsx`**
- Remover queries inline de clientes (L56-68) e contribuintes (L70-82)
- Remover imports de `useQuery`, `supabase`, `currentAmbiente`
- Importar `useExternalClients`, `useContribuintes` de `useTaxReferenceData`
- Usar os mesmos hooks — corrige automaticamente o bug do `ambiente` faltante nos contribuintes

**Nenhum hook novo necessário** — os existentes já cobrem o caso.

### Resultado
- 4 queries inline eliminadas
- Bug de contribuintes sem filtro de ambiente corrigido
- Zero imports de `supabase` nesses dois componentes

