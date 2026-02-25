

# Fase 1 + 2: Estabilizar AuthContext, TaskModal e Blindar Dialog

## Causa Raiz Identificada

O `onFocusOutside` ja esta no `dialog.tsx` (linha 38), mas os modais continuam fechando. O problema real tem duas origens:

### 1. AuthContext causa remount completo ao trocar de aba

Quando o usuario troca de aba e volta, o cliente de autenticacao dispara o evento `TOKEN_REFRESHED`. O handler `onAuthStateChange` (linhas 51-68 do AuthContext) faz:

```
setSession(session);    // novo objeto = re-render global
setUser(session?.user); // novo objeto = re-render global
```

Isso cria **novas referencias de objeto** a cada token refresh, provocando re-render em cascata em todos os componentes que usam `useAuth()`. Se combinado com o `checkRoles()` que temporariamente pode resetar `isAdmin`/`isTeamMember` para `false`, as rotas protegidas (`ProtectedRoute`, `AdminRoute`, `TeamRoute`) podem desmontar toda a arvore de componentes -- fechando qualquer modal aberto.

### 2. TaskModal com loop de render instavel

Na linha 139 do TaskModal: `const watchedValues = form.watch()` retorna um **novo objeto a cada render**. Esse objeto alimenta o `useDraftPersistence`, cujo `useEffect` depende de `values` (linha 57 do hook). Como a referencia muda a cada render, o efeito dispara continuamente, criando o erro `Maximum update depth exceeded`.

---

## Correcoes Planejadas

### Arquivo 1: `src/contexts/AuthContext.tsx`

**Objetivo**: Impedir que token refresh cause remount da arvore de componentes.

Mudancas:
- Guardar `sessionRef` e `userRef` (useRef) para comparar IDs antes de atualizar estado
- No handler `onAuthStateChange`: so chamar `setSession`/`setUser` se o ID do usuario realmente mudou
- Para eventos `TOKEN_REFRESHED` e `INITIAL_SESSION`: atualizar session silenciosamente sem tocar em `loading`
- Nunca resetar `isAdmin`/`isTeamMember` para `false` durante refresh de token (so no SIGNED_OUT)

Logica simplificada:
```
onAuthStateChange((event, newSession) => {
  // Se o usuario nao mudou, so atualizar a referencia da session
  // sem causar re-render desnecessario nos consumidores
  if (event === 'TOKEN_REFRESHED') {
    sessionRef.current = newSession;
    setSession(newSession); // precisa atualizar token, mas user nao muda
    return; // NAO re-checar roles, NAO mexer em loading
  }
  // ... resto da logica para SIGNED_IN, SIGNED_OUT etc
})
```

### Arquivo 2: `src/components/equipe/fiscal/tasks/TaskModal.tsx`

**Objetivo**: Eliminar o loop infinito de renders e estabilizar a persistencia de rascunho.

Mudancas:
- Substituir `form.watch()` (linha 139) por `useWatch({ control: form.control })` que retorna referencia estavel
- Memoizar os valores com `useMemo` + `JSON.stringify` para evitar re-disparo do efeito de persistencia
- Proteger os `useEffect` de `setValue` (linhas 166-168 e 191-202) com guards de igualdade: so chamar `setValue` se o valor atual for diferente do novo
- Corrigir a dependencia do efeito de restauracao (linhas 204-248) para nao re-disparar desnecessariamente

Exemplo da correcao do setValue:
```
useEffect(() => {
  const current = form.getValues('contribuinte_id');
  if (current !== undefined) {
    form.setValue('contribuinte_id', undefined);
  }
}, [watchedClientId]);
```

### Arquivo 3: `src/components/ui/dialog.tsx`

**Objetivo**: Blindagem adicional contra fechamento por interacao externa.

O `onFocusOutside` ja esta aplicado. Adicionar tambem `onInteractOutside` para capturar outros eventos de dismissal do Radix que podem ser disparados por mudanca de foco do sistema operacional:

```tsx
<DialogPrimitive.Content
  ref={ref}
  onFocusOutside={(e) => e.preventDefault()}
  onInteractOutside={(e) => {
    // Permite fechar clicando no overlay (pointerdown)
    // mas bloqueia dismiss por eventos de foco/blur do OS
    const event = e.detail?.originalEvent;
    if (event && !(event instanceof PointerEvent)) {
      e.preventDefault();
    }
  }}
  {...props}
>
```

Isso garante que: clique no overlay fecha (PointerEvent); troca de aba/janela nao fecha (FocusEvent).

---

## Resumo de Arquivos

| Arquivo | Alteracao |
|---|---|
| `src/contexts/AuthContext.tsx` | Estabilizar estado durante TOKEN_REFRESHED; nao causar re-render desnecessario |
| `src/components/equipe/fiscal/tasks/TaskModal.tsx` | Eliminar loop de render; estabilizar watch e setValue |
| `src/components/ui/dialog.tsx` | Adicionar `onInteractOutside` com filtro por tipo de evento |

Total: **3 arquivos** modificados.

