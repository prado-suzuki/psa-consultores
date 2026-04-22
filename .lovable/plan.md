

## Plano: Frente 2 — Migração dos Guards Frontend para Controle por Rota

Execução do documento `MIGRACAO_GUARDS_FRONTEND_2.md` (passos 1-5; passo 6 é faxina manual posterior). Separa **Visibilidade** (`user_page_access` + `usePageAccess`) de **Operação** (RLS + papel).

---

### Passo 1 — Migration SQL: policies de leitura

Nova migration cria policies SELECT abertas em `page_permissions` (qualquer autenticado lê — apenas metadados de rota) e em `user_page_access` (usuário lê o próprio; admin lê todos via `has_role_or_higher`). Drop de policies antigas que exigem `team_member`.

### Passo 2 — Cobertura de `page_permissions`

- Adicionar entradas faltantes em `src/config/protectedPages.ts` se houver. As três rotas críticas citadas (`/equipe/board/desempenho`, `/gestao/*`, `/equipe/acessos`) **já existem** em `PROTECTED_PAGES` — confirmo nada a acrescentar agora.
- Migration adicional faz `INSERT … ON CONFLICT DO NOTHING` espelhando todas as `PROTECTED_PAGES` em `page_permissions` (idempotente — equivalente a rodar `useSyncProtectedPages` automaticamente no deploy).

### Passo 3 — `AuthContext.isTeamMember` transitivo + Edge Functions

**`src/contexts/AuthContext.tsx`** — `checkRoles()` passa a derivar `isTeamMember` da hierarquia:
```ts
setIsTeamMember(roles.includes('team_member') || roles.includes('sublider') || roles.includes('lider') || roles.includes('admin'));
```
`isLider`/`isSublider` permanecem com checagem exata.

**5 Edge Functions** (`calculate-process-roi`, `restructure-process`, `restructure-novidade`, `sync-cadastros`, `sync-perdcomp`): substituir o array `['admin', 'team_member']` por `['admin', 'lider', 'sublider', 'team_member']` no bloco de autorização.

### Passo 4 — Migration de backfill + migração dos guards + remoção do bypass `geral`

**Migration backfill** (executa ANTES das mudanças de código):
```sql
INSERT INTO public.user_page_access (user_id, page_permission_id)
SELECT DISTINCT ur.user_id, pp.id
FROM public.user_roles ur CROSS JOIN public.page_permissions pp
WHERE ur.role IN ('team_member','lider','sublider')
  AND pp.category = 'geral'
  AND NOT EXISTS (SELECT 1 FROM public.user_page_access upa WHERE upa.user_id = ur.user_id AND upa.page_permission_id = pp.id);
```

**Mudanças de código:**

1. **`src/hooks/usePageAccess.ts`** — remover linhas 43-44 (bypass `category === 'geral'`) e o cálculo de `isInternalUser`. Hook passa a reconhecer só: `isAdmin` → libera; página não cadastrada → libera; registro explícito em `user_page_access` → libera; senão nega.

2. **Deletar `src/components/auth/TeamRoute.tsx`**. Em `src/App.tsx`:
   - Remover import de `TeamRoute`.
   - Para todas as rotas que usam `<TeamRoute><PageAccessGate pagePath="…">…</PageAccessGate></TeamRoute>` → manter apenas `<PageAccessGate pagePath="…">…</PageAccessGate>`.
   - `/equipe/digital` (linha 166) e `/equipe/board/desempenho/minha-evolucao` (linha 223) hoje usam só `TeamRoute`. Substituir por `<ProtectedRoute>` (apenas autenticação — `digital` é o seletor de áreas, `minha-evolucao` é portal individual aberto a todo membro).

3. **`src/components/gestao/GestaoAccessGate.tsx`** — remover a query manual a `page_permissions`/`user_page_access`. Resolver acesso via `usePageAccess(location.pathname)` (a entrada `/gestao` representa a categoria toda; a verificação granular por sub-rota acontece naturalmente quando o usuário navega). Login form e tela de "Acesso Negado" preservados.

4. **`src/components/desempenho/DesempenhoAccessGate.tsx`** — substituir `isAdmin || isLider` por `usePageAccess('/equipe/board/desempenho')`. Loading e redirects preservados.

5. **`src/pages/equipe/EquipeAuth.tsx`** (linhas 109-123) — manter o `signIn` mas remover a checagem por papéis (admin/team_member/lider/sublider). A barreira passa a ser `checkAreaAccess` (já chamado logo abaixo, linha 126).

6. **`src/components/equipe/board/BoardLayout.tsx`** (linhas 55-63) — substituir `(isAdmin || isLider)` por chamadas a `usePageAccess` para cada rota de menu (`/equipe/board/performance` e `/equipe/board/desempenho`). Filtra dinâmico: só mostra item se `hasAccess === true`.

7. **`src/pages/equipe/DigitalAreaSelector.tsx`** (linha 51-52) — trocar `adminOnly: true` no card "Acessos" por uma resolução com `usePageAccess('/equipe/acessos')`. Filtragem em `areas` (linha 56-61) passa a respeitar esse hook em vez de `isAdmin` puro.

8. **`src/components/acessos/ManageAccessLink.tsx`** — substituir `if (!isAdmin) return null` por `const { hasAccess } = usePageAccess('/equipe/acessos'); if (!hasAccess) return null;`.

### Passo 5 — Frente 1 (RLS)

Documento separado (`REORGANIZACAO_RLS.md`) — fora do escopo desta entrega. Mencionado no plano apenas para contextualizar a ordem.

### Passo 6 (não executado agora)

Limpeza manual de duplicação `team_member` é faxina opcional caso-a-caso no SQL Editor. **Fica fora desta execução.**

---

### O que NÃO muda

- `AdminRoute` (continua checando `isAdmin` — única exceção arquitetural).
- `ProtectedRoute` (só autenticação).
- `PageAccessGate` (já consome `usePageAccess`).
- Componentes de **operação** que checam papel para mostrar botões (`GestaoClientes`, `DetalheFerramenta`, `ProcedimentosDev`, `DesempenhoMetas`, `useTicketMutations`) — controle de UI de operação, não de visibilidade.
- Lógica de queries/mutações fiscais, layouts e estilos.
- `src/integrations/supabase/{client,types}.ts` (auto-gerados).

### Migrations criadas (3 arquivos novos)

1. Drop+create policies SELECT em `page_permissions` e `user_page_access` (Passo 1).
2. Sync idempotente de `PROTECTED_PAGES` → `page_permissions` (Passo 2).
3. Backfill de `user_page_access` para rotas categoria `geral` (Passo 4, antes do code).

### Arquivos de código alterados (8 arquivos)

- `src/contexts/AuthContext.tsx`
- `src/hooks/usePageAccess.ts`
- `src/App.tsx`
- `src/components/gestao/GestaoAccessGate.tsx`
- `src/components/desempenho/DesempenhoAccessGate.tsx`
- `src/pages/equipe/EquipeAuth.tsx`
- `src/components/equipe/board/BoardLayout.tsx`
- `src/pages/equipe/DigitalAreaSelector.tsx`
- `src/components/acessos/ManageAccessLink.tsx`

### Arquivos de código deletados (1)

- `src/components/auth/TeamRoute.tsx`

### 5 Edge Functions ajustadas

- `calculate-process-roi`, `restructure-process`, `restructure-novidade`, `sync-cadastros`, `sync-perdcomp` — autorização aceita `lider`/`sublider`.

### Documentação

Atualizar `docs/AI_CONTEXT.md` seção 4 ("Roteamento e Controle de Acesso") + nova seção 4.3 ("visibilidade vs operação"), conforme texto na seção 9 do documento original.

### Riscos & validação

- **Fail-open**: mitigado pelo Passo 2 (todas as rotas em `protectedPages.ts` espelhadas no banco).
- **Perda de acesso ao remover bypass `geral`**: mitigado pelo backfill (Passo 4) que roda ANTES da remoção das linhas 43-44.
- **Provisionamento de novos internos**: a partir desta migração, criar `team_member`/`lider`/`sublider` exige conceder explicitamente as 13 rotas `geral` em `user_page_access`. Validar se o fluxo `create-team-member` (ou onboarding manual) já contempla isso — se não, ajuste pode ser necessário em iteração separada.
- **Validação manual**: testar com 4 usuários (admin, lider, sublider, team_member) os cenários da matriz da seção 7 do documento.

