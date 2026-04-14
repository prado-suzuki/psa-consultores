

## Diagnóstico: Líder sem tag team_member não acessa nada

### Causa raiz

Dois arquivos usam apenas `isAdmin` e `isTeamMember` como portas de entrada, ignorando `isLider` e `isSublider`:

| Arquivo | Linha | Problema |
|---|---|---|
| `TeamRoute.tsx` | 19 | `!isTeamMember && !isAdmin` → líder é redirecionado para `/` |
| `usePageAccess.ts` | 42-46 | Checks de categoria `geral` e estrutura só entram se `isTeamMember` |

### Correção proposta

**1. `TeamRoute.tsx`** — incluir `isLider` e `isSublider` na verificação:

```tsx
const { user, isTeamMember, isAdmin, isLider, isSublider, mustChangePassword, loading } = useAuth();
// ...
if (!isTeamMember && !isAdmin && !isLider && !isSublider) {
  return <Navigate to="/" replace />;
}
```

**2. `usePageAccess.ts`** — criar helper `isInternalUser` e usá-lo nos checks:

```ts
const { user, isAdmin, isTeamMember, isLider, isSublider, loading: authLoading } = useAuth();
const isInternalUser = isTeamMember || isLider || isSublider;

// L21: admin check (sem mudança)
// L42: geral → isInternalUser em vez de isTeamMember
// L46: estrutura check → isInternalUser em vez de isTeamMember
```

### Impacto
- 2 arquivos editados
- Zero mudança de banco de dados
- Líderes e sublíderes passam a acessar normalmente sem precisar da tag `team_member`

