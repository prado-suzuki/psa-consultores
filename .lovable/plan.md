

## Plano: 3 itens finais da Frente 2

### 1. `BoardLayout.tsx` — filtragem de menu por `usePageAccess`

Em `src/components/equipe/board/BoardLayout.tsx` (linhas 55-63), substituir o cálculo `(isAdmin || isLider)` por chamadas a `usePageAccess` para cada rota do menu:

```tsx
const { hasAccess: canPerformance } = usePageAccess('/equipe/board/performance');
const { hasAccess: canDesempenho } = usePageAccess('/equipe/board/desempenho');
```

O array `menuItems` filtra dinamicamente cada item conforme `hasAccess === true`. Remove dependência de `isAdmin`/`isLider` para visibilidade — passa a respeitar `user_page_access`. Card "Minha Evolução" continua visível a todos (rota não restrita).

### 2. Edge Functions — autorização aceita `lider` e `sublider`

Atualizar 5 funções, substituindo `['admin', 'team_member']` por `['admin', 'lider', 'sublider', 'team_member']` no bloco de autorização (após `supabaseUser.auth.getUser()`):

- `supabase/functions/calculate-process-roi/index.ts`
- `supabase/functions/restructure-process/index.ts`
- `supabase/functions/restructure-novidade/index.ts`
- `supabase/functions/sync-cadastros/index.ts`
- `supabase/functions/sync-perdcomp/index.ts`

Padrão aplicado:
```ts
const isAuthorized = roles?.some(r =>
  ['admin', 'lider', 'sublider', 'team_member'].includes(r.role)
);
```

Deploy automático após edição.

### 3. `docs/AI_CONTEXT.md` — atualização da seção 4

- Reescrever **seção 4 (Roteamento e Controle de Acesso)** explicando os 3 guards remanescentes: `ProtectedRoute` (autenticação), `AdminRoute` (apenas `isAdmin`) e `PageAccessGate` (consome `usePageAccess`). Remover qualquer menção a `TeamRoute`.
- Adicionar **nova subseção 4.3 — Visibilidade vs Operação**:
  - **Visibilidade** (rota): `user_page_access` + `usePageAccess`. Único bypass = `isAdmin` ou rota não cadastrada em `page_permissions`. Não há mais bypass por categoria `geral`.
  - **Operação** (ação): RLS no banco + checagens de papel em componentes/hooks específicos para condicionar botões e mutações.
  - Provisionamento: novos `team_member`/`lider`/`sublider` precisam de entradas explícitas em `user_page_access` (backfill já cobriu os existentes).

### O que NÃO muda

- Hierarquia de papéis (`admin > lider > sublider > team_member > client > usuario_externo`).
- Componentes de operação que já usam `isAdmin`/`isLider`/`isSublider` para esconder botões.
- `AdminRoute`, `ProtectedRoute`, `PageAccessGate`.
- `src/integrations/supabase/{client,types}.ts` (auto-gerados).

### Arquivos alterados (7)

- `src/components/equipe/board/BoardLayout.tsx`
- `supabase/functions/calculate-process-roi/index.ts`
- `supabase/functions/restructure-process/index.ts`
- `supabase/functions/restructure-novidade/index.ts`
- `supabase/functions/sync-cadastros/index.ts`
- `supabase/functions/sync-perdcomp/index.ts`
- `docs/AI_CONTEXT.md`

