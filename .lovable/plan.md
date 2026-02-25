

## Correcao Global: Perda de Estado ao Retornar ao Navegador

### Diagnostico

A causa raiz esta em dois pontos:

1. **AuthContext (linha 56)**: O `onAuthStateChange` dispara `setLoading(true)` em TODOS os eventos de auth, incluindo `TOKEN_REFRESHED` que ocorre automaticamente ao voltar para a aba. Isso faz `loading = true`, que causa a desmontagem completa da arvore de componentes em todos os route guards.

2. **QueryClient sem configuracao**: O `new QueryClient()` na linha 75 do App.tsx usa os defaults do React Query (`staleTime: 0`, `refetchOnWindowFocus: true`), causando refetches desnecessarios que combinados com spinners locais amplificam o problema.

### Alteracoes

#### 1. `src/App.tsx` - Configurar QueryClient com defaults seguros

Substituir `const queryClient = new QueryClient()` por uma configuracao com:
- `staleTime: 1 * 60 * 1000` (1 minuto) -- evita refetches imediatos
- `refetchOnWindowFocus: false` -- desativa o refetch automatico ao voltar para a aba (os dados serao atualizados por invalidacao explicita ou ao navegar)

```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
});
```

#### 2. `src/contexts/AuthContext.tsx` - Nao mostrar loading em refresh de token

Alterar o `onAuthStateChange` para distinguir entre eventos que realmente precisam de loading (SIGNED_IN, SIGNED_OUT) e eventos silenciosos (TOKEN_REFRESHED, INITIAL_SESSION). A mudanca principal:

```typescript
supabase.auth.onAuthStateChange((event, session) => {
  setSession(session);
  setUser(session?.user ?? null);

  if (session?.user) {
    // Apenas SIGNED_IN precisa mostrar loading (troca de usuario)
    if (event === 'SIGNED_IN') {
      setLoading(true);
      void checkRoles(session.user.id).finally(() => setLoading(false));
    } else {
      // TOKEN_REFRESHED, INITIAL_SESSION: atualiza roles silenciosamente
      void checkRoles(session.user.id);
    }
  } else {
    setIsAdmin(false);
    setIsTeamMember(false);
    if (event === 'SIGNED_OUT') {
      setLoading(false);
    }
  }
});
```

#### 3. Route Guards - Substituir spinner escuro por renderizacao transparente

Alterar os 4 componentes de guarda para que, quando `loading` for true mas ja houver um `user` em memoria, renderizem `children` normalmente em vez de desmontar tudo:

**`src/components/auth/TeamRoute.tsx`**:
```typescript
export const TeamRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, isTeamMember, isAdmin, loading } = useAuth();

  // Carregamento inicial (nenhum usuario em memoria ainda)
  if (loading && !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return <Navigate to="/equipe" replace />;
  if (!isTeamMember && !isAdmin) return <Navigate to="/" replace />;

  return <>{children}</>;
};
```

Mesma logica para **`ProtectedRoute.tsx`** e **`AdminRoute.tsx`**: so mostrar spinner se `loading && !user`.

**`src/components/auth/PageAccessGate.tsx`**: Nenhuma mudanca necessaria -- ja usa React Query com `staleTime: 5min` e so depende de `authLoading`, que agora nao sera mais settado true em token refresh.

#### 4. `src/components/gestao/GestaoAccessGate.tsx` - Mesma correcao

Verificar e aplicar a mesma logica: so mostrar spinner se `loading && !user`.

### Resultado

- Voltar para a aba do navegador nao causa mais nenhum flash/piscar
- Modais, abas selecionadas, formularios preenchidos -- tudo preservado
- Dados continuam sendo atualizados via invalidacao explicita nas mutations
- O spinner escuro so aparece no carregamento inicial real (primeira visita, sem usuario em cache)

### Arquivos modificados

| Arquivo | Mudanca |
|---|---|
| `src/App.tsx` | QueryClient com staleTime e refetchOnWindowFocus: false |
| `src/contexts/AuthContext.tsx` | onAuthStateChange nao seta loading em TOKEN_REFRESHED |
| `src/components/auth/TeamRoute.tsx` | Spinner so se loading && !user |
| `src/components/auth/ProtectedRoute.tsx` | Spinner so se loading && !user |
| `src/components/auth/AdminRoute.tsx` | Spinner so se loading && !user |
| `src/components/gestao/GestaoAccessGate.tsx` | Mesma correcao do spinner |

