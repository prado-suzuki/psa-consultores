

# Correção: Login + seleção de área redireciona para tela inicial

## Diagnóstico

O `handleSubmit` em `EquipeAuth` chama `navigateToArea` imediatamente após `signIn`. Porém, o `onAuthStateChange('SIGNED_IN')` no AuthContext pode disparar **assincronamente**, causando:

1. `signIn` retorna sem erro → `handleSubmit` navega para `/equipe/tax/dashboard`
2. `TeamRoute` avalia: `loading=false` (ainda do init), `user=null` (não atualizado pelo SIGNED_IN ainda)
3. `TeamRoute` redireciona para `/equipe` (tela inicial)
4. Só depois `SIGNED_IN` atualiza o user/roles — mas já é tarde

## Solução

Substituir a navegação direta por uma navegação reativa via `useEffect`. Em vez de chamar `navigateToArea` dentro do `handleSubmit`, armazenar a área pendente e navegar somente quando o AuthContext confirmar que `loading=false`, `user` existe e roles estão carregadas.

### Alterações em `src/pages/equipe/EquipeAuth.tsx`

**1. Adicionar estado `pendingArea`:**
```typescript
const [pendingArea, setPendingArea] = useState<string | null>(null);
```

**2. Adicionar `useEffect` para navegação reativa:**
```typescript
useEffect(() => {
  if (pendingArea && !loading && user && (isTeamMember || isAdmin)) {
    navigateToArea(navigate, pendingArea);
    setPendingArea(null);
  }
}, [pendingArea, loading, user, isTeamMember, isAdmin, navigate]);
```

**3. No `handleSubmit` (linha 180), trocar:**
```typescript
// DE:
navigateToArea(navigate, selectedArea);

// PARA:
setPendingArea(selectedArea);
```

**4. No `handleSubmit`, também trocar a navegação de `/primeiro-acesso` para usar replace e manter consistência.**

Essa abordagem elimina a race condition porque a navegação só ocorre quando o AuthContext confirma o estado completo do usuário.

