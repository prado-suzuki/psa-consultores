# Plano: Migração de `user_roles` para tabela de lookup + role única em `profiles`

## Objetivo

Transformar `user_roles` em tabela de **lookup** (apenas `id` + `role`, 6 linhas) e adicionar `profiles.user_role_id` (FK), garantindo **uma única role por usuário**, alinhando o schema à hierarquia já assumida por `has_role_or_higher`.

---

## Decisão prévia (confirmada)

Usuários com múltiplas roles hoje serão consolidados pegando a **role mais alta** na hierarquia:

```
admin > lider > sublider > team_member > timecliente > client
```

A consolidação será **logada em `access_change_log`** para rastreabilidade.

---

## 1. Banco de dados

### 1.1 Pré-migração — auditoria

- Confirmar `ON DELETE CASCADE` em `profiles.id → auth.users` (caso contrário, adicionar — senão deletar usuário deixa profile órfão após dropar `user_roles.user_id`).
- Snapshot defensivo: `CREATE TABLE user_roles_backup_pre_lookup AS SELECT * FROM public.user_roles;`
- `grep` exaustivo no projeto por: `user_roles`, `roles.includes`, `roles.map`, `roles.some`, `.role` para fechar a lista real de call-sites antes da migração.

### 1.2 Migração SQL (transação única)

Ordem rígida dentro da transação:

1. **Criar lookup** com as 6 roles distintas (gerar UUIDs determinísticos ou novos).
2. **Adicionar `profiles.user_role_id uuid` (nullable inicialmente)** + FK → `user_roles(id)` com `ON DELETE RESTRICT`.
3. **Popular** `profiles.user_role_id` via `UPDATE` com `CASE WHEN` explícito implementando a hierarquia (não confiar na ordem do enum).
4. **Logar consolidações** em `access_change_log` (action='roles_consolidated', old_value=array antigo, new_value=role escolhida) para todo usuário que tinha >1 role.
5. **Tornar `profiles.user_role_id` NOT NULL** (após popular).
6. **Dropar policies antigas de `user_roles`** que referenciam `user_id` (pré-requisito do `DROP COLUMN`).
7. **Dropar `UNIQUE(user_id, role)` e a coluna `user_id`** de `user_roles`.
8. **Adicionar `UNIQUE(role)`** em `user_roles`.
9. **Reescrever `has_role(_user_id, _role)`** preservando assinatura — JOIN `profiles → user_roles`.
10. **Reescrever `has_role_or_higher(_user_id, _minimum_role)`** preservando assinatura — `CASE` hierárquico via JOIN.
11. **Reescrever trigger `handle_new_user`** — `INSERT INTO profiles (..., user_role_id) VALUES (..., (SELECT id FROM user_roles WHERE role = 'client'))`. Remover o `INSERT INTO user_roles`.
12. **Recriar RLS de `user_roles`**: `SELECT` aberto a `authenticated` (tabela vira lookup público sem PII); `INSERT/UPDATE/DELETE` apenas para `admin`.

### 1.3 Pós-migração

- Rodar `supabase--linter` e corrigir avisos.
- Regenerar `src/integrations/supabase/types.ts` (automático).
- Manter `user_roles_backup_pre_lookup` por pelo menos um ciclo de release antes de dropar.

---

## 2. Frontend — núcleo (destrava o resto)

### 2.1 `src/contexts/AuthContext.tsx`

- `checkRoles` passa a buscar **profile com join em `user_roles`** (single row, não array).
- Derivar booleans a partir de **role única**, mantendo a hierarquia idêntica à do banco:
  - `isAdmin = role === 'admin'`
  - `isLider = role === 'lider' || role === 'admin'` (se a semântica atual exigir transitividade — confirmar).
  - `isSublider = ['sublider','lider','admin'].includes(role)`
  - `isTeamMember = ['team_member','sublider','lider','admin'].includes(role)`
- Lógica deve ser **bit-for-bit equivalente** a `has_role_or_higher` para evitar discrepância client/server.

### 2.2 Hooks de roles e permissões (lista completa)

Todos passam de array → role única + JOIN em profiles:

- `src/hooks/useUsersWithRoles.ts` — `roles: AppRole[]` → `role: AppRole`. Trocar `Promise.all` por uma única query com select aninhado.
- `src/hooks/useUserRoles.ts`
- `src/hooks/useTeamMemberMutations.ts` — `roles: string[]` → `role: AppRole` (input + lógica de diff substituída por `UPDATE profiles SET user_role_id`).
- `src/hooks/usePagePermissions.ts`
- `src/hooks/useUserPageAccess.ts`
- `src/hooks/usePageAccess.ts`
- `src/hooks/useUserAccessibleCategories.ts`
- `src/hooks/useCanAssignTickets.ts`
- `src/hooks/useSyncProtectedPages.ts`

### 2.3 Componentes de guarda de rota

Reescrever para consumir `role` única do `AuthContext` (não buscar de novo):

- `src/components/auth/AdminRoute.tsx`
- `src/components/auth/ProtectedRoute.tsx`
- `src/components/auth/PageAccessGate.tsx`
- `src/components/desempenho/DesempenhoAccessGate.tsx`
- `src/components/gestao/GestaoAccessGate.tsx`

---

## 3. Frontend — UI de gestão de acessos (3 páginas, não 1)

Toda a UI hoje opera com **multi-select de roles** + **badges múltiplos**. Vira **select único**.

### 3.1 Páginas

- `src/pages/equipe/EquipeControleAcessos.tsx`
- `src/pages/administracao/AdminAcessos.tsx`
- `src/pages/administracao/AdminUsuarios.tsx`
- `src/pages/gestao/GestaoAcessos.tsx`

### 3.2 Componentes compartilhados

- `src/components/acessos/UsersTab.tsx` — coluna "Roles" vira "Role" (badge único).
- `src/components/acessos/UsersRolesView.tsx`
- `src/components/acessos/EditUserDialog.tsx` — `Checkbox[]` → `RadioGroup` ou `Select`.
- `src/components/acessos/CreateUserDialog.tsx` — idem.
- `src/components/acessos/DeleteUserDialog.tsx` — apenas ajuste de tipos.
- `src/components/acessos/roleOptions.ts` — preservar lista, mas semântica passa a ser exclusiva.
- `src/components/acessos/AccessStatsCards.tsx` — agregações por role passam a ser `COUNT` simples.
- `src/components/acessos/ManageAccessLink.tsx`

---

## 4. Frontend — call-sites residuais

Substituir leituras diretas em `user_roles` por leitura via `profiles` (JOIN ou prop do contexto):

- `src/pages/admin/AdminClientes.tsx`
- `src/pages/equipe/EquipeAuth.tsx`
- `src/pages/equipe/EquipeDaily.tsx`
- `src/hooks/useTickets.ts`
- `src/hooks/useTaxReferenceData.ts`
- `src/hooks/useCreateTicket.ts`
- `src/components/equipe/estrutura/EstruturaManager.tsx`

---

## 5. Edge functions

### 5.1 `supabase/functions/create-team-member/index.ts`

- Check de admin: `.some(r => r.role === 'admin')` → consulta única `profiles → user_roles`.
- Aceitar `role: string` (singular) no payload.
- Loop `for (role of rolesToAssign)` → `UPDATE profiles SET user_role_id = (SELECT id FROM user_roles WHERE role = $1)`.
- Backward-compat: se cliente antigo enviar `roles: string[]`, pegar a mais alta da hierarquia (mesmo `CASE` da migração).

### 5.2 `supabase/functions/delete-team-member/index.ts`

- Remover `DELETE FROM user_roles WHERE user_id = ...` — não existe mais essa coluna.
- O `ON DELETE CASCADE` em `profiles.id → auth.users` já cuida da limpeza ao deletar o usuário no `auth.admin.deleteUser`.

### 5.3 Outras edge functions a auditar (grep `user_roles`)

- `supabase/functions/get-user-last-access/index.ts`
- `supabase/functions/notify-ticket/index.ts`
- `supabase/functions/check-ticket-deadlines/index.ts`
- Qualquer outra que consulte roles para validar permissão.

---

## 6. Tipagem (`AppRole`)

- O tipo `AppRole` em `src/hooks/useUsersWithRoles.ts` permanece igual.
- Atualizar a interface exportada `UserWithRoles` → `UserWithRole` (`roles: AppRole[]` → `role: AppRole`).
- Buscar usos de `UserWithRoles` no projeto e ajustar.

---

## 7. Ordem de execução recomendada

1. **Confirmar `ON DELETE CASCADE`** em `profiles.id → auth.users`.
2. **Snapshot** `user_roles_backup_pre_lookup`.
3. **`grep` final** de call-sites (garante que nada foi perdido).
4. **Migração SQL** em transação única (§1.2).
5. **Regenerar types** do Supabase.
6. **Refatorar AuthContext** + hooks centrais (§2).
7. **Refatorar componentes de guarda** (§2.3).
8. **Refatorar UI de gestão de acessos** (§3) — multi → single select.
9. **Refatorar call-sites residuais** (§4).
10. **Refatorar edge functions** (§5).
11. **QA manual**: login com cada uma das 6 roles, verificar guards, gestão de acessos (criar/editar/deletar), criação de chamados, atribuição de tickets.

---

## 8. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Policies de `user_roles` referenciam `user_id` e bloqueiam `DROP COLUMN` | Dropar/recriar policies dentro da mesma transação, antes do `ALTER TABLE` |
| Trigger `handle_new_user` falha se lookup não existir | Criar lookup como **passo 1** da transação |
| Discrepância client/server na derivação de booleans hierárquicos | `AuthContext` usa exatamente a mesma matriz `CASE` de `has_role_or_higher` |
| Usuários perdem acesso silenciosamente | Log obrigatório em `access_change_log` para toda consolidação |
| Edge function antiga ainda envia `roles: string[]` | Backward-compat no `create-team-member` (pegar a mais alta) por 1 release |
| Rollback complicado se falhar em produção | `user_roles_backup_pre_lookup` mantido por ≥1 ciclo de release |
| RLS de tabelas que JOIN em `user_roles` por `user_id` quebra | Funções `has_role`/`has_role_or_higher` preservam assinatura — RLS continua funcionando sem mudança |

---

## 9. Fora de escopo (explícito)

- Renomear `user_roles` para `roles_lookup` — manter o nome para reduzir blast radius em RLS e código.
- Mudar a hierarquia de roles ou adicionar novas roles.
- Refatorar lógica de `page_access` ou `protected_pages` (são tabelas separadas).
- Tocar em qualquer fluxo fora do escopo de autenticação/autorização.
