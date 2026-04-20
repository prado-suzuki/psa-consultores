

## Plano: Auto-consulta ao trocar de aba

### Problema
Hoje o `handleConsultar` (linha 133) só dispara `refetch` da `activeQuery` correspondente à aba atual. Ao trocar de aba, a nova query fica vazia e o usuário precisa clicar "Consultar" de novo — passa a impressão de bug.

### Solução
Adicionar um `useEffect` em `src/pages/equipe/dev/CorrecoesSped.tsx` que dispara `activeQuery.refetch()` automaticamente quando:
1. O usuário já fez ao menos uma consulta inicial (`hasQueried === true`) — assim não dispara antes de o usuário preencher os filtros pela primeira vez.
2. Os filtros obrigatórios estão válidos (`canConsult === true`).
3. A `activeQuery` ainda **não tem dados em cache** (`activeQuery.data === undefined`) — evita refetch desnecessário se o usuário voltar para uma aba já carregada.
4. Não há fetch em andamento (`!activeQuery.isFetching`).

```tsx
useEffect(() => {
  if (!hasQueried || !canConsult) return;
  if (activeQuery.data !== undefined || activeQuery.isFetching) return;
  activeQuery.refetch();
}, [activeTab, hasQueried, canConsult, activeQuery]);
```

### Comportamento resultante
- 1ª vez: usuário preenche filtros + clica "Consultar" na aba C170 → carrega C170.
- Troca para A170 (sem dados em cache) → consulta dispara automaticamente.
- Volta para C170 → usa cache, não refaz consulta.
- Troca de cliente/data e limpa estado → `hasQueried` permanece, mas como `canConsult` revalida e o cache do React Query é por `queryKey` (que inclui contribuinte/datas), novos params = novo fetch automático ao trocar de aba.
- F100 com filtros próprios (nat_bc_creds/cod_cta): respeitado pelo `canConsult` que já exige `f100FiltersValid`.

### Escopo
- 1 arquivo: `src/pages/equipe/dev/CorrecoesSped.tsx`
- 1 `useEffect` adicionado próximo a `handleConsultar`
- Sem mudanças em hooks, schema ou componentes filhos

