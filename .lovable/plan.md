
# RLS-03 — Blindagem das policies de `public.tickets`

Sem backfill de dados. Apenas ajusta 2 policies (SELECT e UPDATE) para que o problema de chamados criados sem `cluster_id` (efeito colateral dos clientes agora terem 2 clusters) não deixe chamados invisíveis para líderes, e para restringir escrita de `team_member`.

## Pré-voo (já executado)

Policies atuais em `public.tickets` (nenhuma cmd=ALL — seguro prosseguir):

- `rls_tickets_select` (SELECT): `admin OR (team_member+ AND cluster_id = ANY(resolve_user_cluster_ids)) OR user_id=auth.uid() OR is_ticket_assigned_to(id,auth.uid())`
- `rls_tickets_update` (UPDATE): `(user_id=auth.uid() AND client) OR team_member+` — **problema: qualquer team_member edita/atribui qualquer chamado do sistema**
- `rls_tickets_insert`: mantida
- `rls_tickets_delete`: `admin+` — mantida

Helpers confirmados: `cliente_visivel_para(uuid)`, `resolve_user_cluster_ids(uuid)`, `is_ticket_assigned_to(uuid,uuid)`, `has_role(uuid,app_role)`, `has_role_or_higher(uuid,app_role)`.

## Mudanças (1 migration)

### 1. Recriar `rls_tickets_select` — aditivo, adiciona ramo "herda do cliente"

```sql
DROP POLICY IF EXISTS rls_tickets_select ON public.tickets;
CREATE POLICY rls_tickets_select ON public.tickets FOR SELECT TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
      AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
  OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)   -- NOVO
      AND cliente_id IS NOT NULL
      AND public.cliente_visivel_para(cliente_id))
  OR auth.uid() = user_id
  OR public.is_ticket_assigned_to(id, auth.uid())
);
```

Efeito: admin, líder, sublíder e team_member visualizam chamados do seu cluster **ou** cujo cliente enxergam, além dos próprios e atribuídos. Cobre chamados com `cluster_id` NULL cujo cliente é visível.

### 2. Recriar `rls_tickets_update` — apertar escrita

```sql
DROP POLICY IF EXISTS rls_tickets_update ON public.tickets;
CREATE POLICY rls_tickets_update ON public.tickets FOR UPDATE TO authenticated
USING (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role_or_higher(auth.uid(),'sublider'::app_role)
  OR assigned_to = auth.uid()
  OR (auth.uid() = user_id AND public.has_role(auth.uid(),'client'::app_role))
)
WITH CHECK (
  public.has_role(auth.uid(),'admin'::app_role)
  OR public.has_role_or_higher(auth.uid(),'sublider'::app_role)
  OR assigned_to = auth.uid()
  OR (auth.uid() = user_id AND public.has_role(auth.uid(),'client'::app_role))
);
```

Efeito: `team_member` deixa de poder atribuir/editar livremente — só admin, sublíder+, o próprio atribuído, e o cliente autor (mantido para o portal do cliente). INSERT e DELETE não são alterados.

## GATE de verificação (via `SET LOCAL request.jwt.claims`)

1. **Visualização positiva** — team_member e líder de Consultores enxergam `9ebc473a-5957-4594-9ac8-6cbbc2a9b41f` (Tecnomyl); simular também um ticket com `cluster_id=NULL` cujo cliente é visível → aparece.
2. **Isolamento** — usuário de outro cluster (sem Consultores/OSG) → não vê chamados da Tecnomyl.
3. **Escrita** — team_member não-atribuído → UPDATE bloqueado; sublíder → OK; atribuído → OK; admin → OK.

Se qualquer item falhar → rollback (segunda migration que recria as policies originais do dump acima).

## Fora de escopo

- Backfill dos ~3 chamados sem `cluster_id` (não fazer nesta leva).
- Correção do `useCreateTicketCliente` para multi-cluster (fica como follow-up separado — a blindagem RLS aqui é a rede de segurança).
