

# Correção: F5 redireciona para "/" mesmo estando logado

## Diagnóstico

O problema está nas route guards (`ProtectedRoute`, `AdminRoute`, `TeamRoute`). Todas usam esta lógica:

```typescript
if (loading && !user) return null;  // só espera se loading E sem user
if (!user) return <Navigate to="/auth" />;  // redireciona se sem user
```

O problema: existe uma janela onde `loading` se torna `false` antes de `user` ser populado (race condition entre `onAuthStateChange` e `initializeAuth`). Nesse momento, a guarda vê `loading=false` + `user=null` e redireciona imediatamente para `/auth` ou `/`.

## Solução

Alterar as três route guards para esperar **enquanto loading estiver true**, independente do estado de `user`:

### Arquivo: `src/components/auth/ProtectedRoute.tsx`
```typescript
// DE:
if (loading && !user) return null;

// PARA:
if (loading) return null;
```

### Arquivo: `src/components/auth/AdminRoute.tsx`
```typescript
// DE:
if (loading && !user) return null;

// PARA:
if (loading) return null;
```

### Arquivo: `src/components/auth/TeamRoute.tsx`
```typescript
// DE:
if (loading && !user) return null;

// PARA:
if (loading) return null;
```

Três edições simples, uma linha cada. O `loading` só se torna `false` após `initializeAuth` completar (que já popula `user` e roles), eliminando a race condition.

