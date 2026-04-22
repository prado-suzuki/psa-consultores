

## Plano: Correção das policies SELECT respeitando hierarquia

### Princípio
Toda policy SELECT nova deve usar `public.has_role_or_higher(auth.uid(), 'team_member'::app_role)` — esta função SQL **já implementa a hierarquia** (admin ⊇ lider ⊇ sublider ⊇ team_member). Não usar `has_role(..., 'admin') OR has_role(..., 'team_member')` (redundante e errado conceitualmente).

### Migration única — adicionar SELECT nas tabelas órfãs

Padrão base para tabelas internas:
```sql
USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
```

Padrão para tabelas com vínculo de cliente/atribuído:
```sql
USING (
  public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  OR <condição extra de vínculo>
)
```

### Policies a criar / substituir

**Chamados** (admin/lider/sublider/team_member veem tudo; cliente vê os seus; assignee vê o seu):
- `tickets` → SELECT: `has_role_or_higher('team_member')` OR `auth.uid() = user_id` OR `is_ticket_assigned_to(id, auth.uid())`
- `ticket_messages` → SELECT: `has_role_or_higher('team_member')` OR EXISTS(ticket pai com vínculo)
- `ticket_attachments` → SELECT: idem `ticket_messages`

**Projetos / tarefas** (todos os internos veem tudo):
- `org_projects` → SELECT: `has_role_or_higher('team_member')`
- `fiscal_tasks` → SELECT: `has_role_or_higher('team_member')`
- `projects` → DROP policies redundantes atuais; CREATE única SELECT: `has_role_or_higher('team_member')` OR cliente vinculado via `client_visible_projects`

**Auditoria e perfis** (resolve "Desconhecido"):
- `audit_logs` → DROP policy atual restrita a tax/osg; CREATE SELECT: `has_role_or_higher('team_member')` (todas as áreas)
- `profiles` → CREATE SELECT interna: `has_role_or_higher('team_member')` (mantém policy admin existente; clientes continuam usando `profiles_safe` / RPC `get_profiles_with_email`)

**Módulo Board / Desempenho** (internos):
- `analises_semestrais`, `atualizacoes_meta`, `ciclos_avaliacao`, `feedbacks`, `itens_acao_1a1`, `kpis_meta`, `metas`, `relatorios_gerados`, `reunioes_1a1`, `performance_preferencias` → SELECT: `has_role_or_higher('team_member')`

**Demais órfãs**:
- `contatos` → SELECT: `has_role_or_higher('sublider')` (gestão)
- `documents` → SELECT: `has_role_or_higher('team_member')`
- `efd_correcoes` → SELECT: `has_role_or_higher('team_member')`
- `gestao_area_password` → SELECT: `has_role(auth.uid(), 'admin')` (sensível, restrito)

### Garantia

Após esta migration, **admin, lider e sublider terão SELECT em tudo que team_member tem** automaticamente, via `has_role_or_higher`. Nenhuma policy futura deve usar o padrão `'admin' OR 'team_member'` — sempre `has_role_or_higher(..., 'team_member')`.

### Atualização do plano

Atualizar `.lovable/plan.md` (REORGANIZACAO_RLS) acrescentando regra explícita:
> **Toda policy SELECT/UPDATE/DELETE/INSERT deve usar `has_role_or_higher(_role)` em vez de combinar roles com OR. A função já garante a hierarquia admin → lider → sublider → team_member.**

### Arquivos

- 1 nova migration em `supabase/migrations/` (~22 policies SELECT, 2 substituições em `audit_logs` e `projects`).
- `.lovable/plan.md` atualizado com a regra de hierarquia.

Sem alterações no frontend.

