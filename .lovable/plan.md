

# Eliminar Flash Branco: Correcao Arquitetural dos Gates

## Diagnostico Refinado

A hierarquia de componentes nas rotas e:

```text
TeamRoute -> PageAccessGate -> DevDashboard -> DevLayout (sidebar + header + children)
```

O Layout (sidebar, header) esta DENTRO da pagina, nao fora do Gate. Quando `PageAccessGate` retorna um spinner (ou `null`) durante `isLoading`, a pagina inteira -- incluindo o Layout -- e desmontada. Isso causa o flash.

## Estrategia Correta

A solucao e simples: durante `isLoading`, o `PageAccessGate` deve **renderizar os children normalmente** em vez de bloquear. Isso e seguro porque:

1. Os dados reais da pagina tambem dependem de React Query -- eles nao aparecem instantaneamente
2. O `usePageAccess` tem `staleTime: 5min`, entao apos a primeira checagem, as navegacoes subsequentes sao instantaneas (cache hit)
3. Nenhum dado sensivel e exposto durante os ~100ms de checagem, porque as queries de dados da pagina tambem estao carregando em paralelo

Quando a checagem termina e `hasAccess === false`, ai sim o Gate exibe a tela de "Acesso Negado" (isso e um estado terminal, nao um flash).

## Mudancas por Arquivo

### 1. `src/components/auth/PageAccessGate.tsx`

Remover o bloco `if (isLoading) { return spinner }`. Durante o loading, renderizar `children` diretamente para que o Layout monte imediatamente.

```tsx
// ANTES:
if (isLoading) {
  return (<div className="min-h-screen ..."><spinner /></div>);
}

// DEPOIS:
if (isLoading) {
  return <>{children}</>; // Layout monta, dados carregam em paralelo
}
```

A tela de "Acesso Negado" continua sendo exibida normalmente quando `!hasAccess` apos o loading completar.

### 2. `src/components/gestao/GestaoAccessGate.tsx`

Mesma logica, mas so para o caso em que o usuario JA esta autenticado e estamos apenas verificando permissoes. Os dois casos de `!user` (login form e loading inicial) permanecem como estao.

Mudar a condicao da linha 71: quando `user` existe mas `accessLoading` e true, renderizar `children` ao inves do spinner.

```tsx
// ANTES (linha 71):
if ((authLoading || accessLoading) && !user) { return spinner; }
// + mais abaixo, se accessLoading e user existe, cai no !hasAccess (que e undefined/false)

// DEPOIS:
if (authLoading && !user) { return spinner; } // Apenas no carregamento inicial do auth
if (!user) { return login form; }
if (accessLoading) { return <>{children}</>; } // Ja autenticado, aguardando check
if (!hasAccess) { return access denied; }
return <>{children}</>;
```

### 3. `src/components/auth/TeamRoute.tsx`

Substituir o spinner fullscreen por `null` quando `loading && !user`. Isso so ocorre no hard refresh (primeira visita), dura ~200ms e e imperceptivel.

### 4. `src/components/auth/AdminRoute.tsx`

Mesma mudanca: retornar `null` em vez do spinner fullscreen.

### 5. `src/components/auth/ProtectedRoute.tsx`

Mesma mudanca: retornar `null` em vez do spinner fullscreen.

### 6. Novo: `src/components/ui/content-skeleton.tsx`

Componente reutilizavel que paginas podem usar internamente (dentro do seu Layout) para exibir skeletons suaves enquanto seus proprios dados carregam. Usa o componente Skeleton existente do projeto.

Renderiza blocos animados que imitam: uma barra de filtros, 3 cards de metricas e uma tabela com linhas. Fundo transparente para herdar o tema do layout pai.

## Resumo

| # | Arquivo | Acao |
|---|---|---|
| 1 | `src/components/auth/PageAccessGate.tsx` | Renderizar children durante isLoading |
| 2 | `src/components/gestao/GestaoAccessGate.tsx` | Renderizar children quando user existe e accessLoading |
| 3 | `src/components/auth/TeamRoute.tsx` | Retornar `null` no loading inicial |
| 4 | `src/components/auth/AdminRoute.tsx` | Retornar `null` no loading inicial |
| 5 | `src/components/auth/ProtectedRoute.tsx` | Retornar `null` no loading inicial |
| 6 | `src/components/ui/content-skeleton.tsx` | Novo componente de skeleton reutilizavel |

**Total: 5 arquivos modificados, 1 arquivo novo.**

## Por que e seguro renderizar children durante isLoading

- Nenhum dado sensivel e exposto: os dados da pagina vem de queries proprias que tambem estao em loading
- O Layout (sidebar, header) e puramente visual -- nao contem dados protegidos
- O `staleTime: 5min` garante que a maioria das navegacoes internas sera instantanea (cache hit, sem loading)
- Se o acesso for negado, a tela de bloqueio aparece normalmente apos ~100ms, sem solavanco

