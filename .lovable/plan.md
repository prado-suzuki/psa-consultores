## RLS-03 — Isolamento por cluster no SELECT de Chamados

Escopo estrito: SELECT de `tickets`, `ticket_messages`, `ticket_attachments`. INSERT/UPDATE/DELETE não são tocados.

### PASSO 1 — Baseline (capturado ✅)

**Contagens:** `tickets`=323, `ticket_messages`=94, `ticket_attachments`=73.
**Cluster fill:** 320/323 tickets têm `cluster_id`; **3 tickets sem cluster_id** ficarão invisíveis para internos não-admin/não-autor/não-atribuídos após a mudança.

**Policies SELECT atuais (serão substituídas):**
- `tickets`: `has_role_or_higher('team_member') OR user_id=auth.uid() OR is_ticket_assigned_to(id,auth.uid())` — hoje qualquer interno vê todos.
- `ticket_messages`: `has_role_or_higher('team_member') OR EXISTS(ticket com user_id=uid OR assigned)`.
- `ticket_attachments`: idem messages.

**Policies INSERT/UPDATE/DELETE (não serão tocadas):**
- tickets: insert, update, delete (`admin` p/ delete) — mantidas.
- ticket_messages: insert, update (autor), delete (`admin`) — mantidas.
- ticket_attachments: insert, delete (`admin`) — mantidas.

### PASSO 2 — Migration (transação única via `supabase--migration`)

```sql
DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['tickets','ticket_messages','ticket_attachments']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies
             WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t); END LOOP;
  END LOOP;
END $$;

CREATE POLICY rls_tickets_select ON public.tickets
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR (public.has_role_or_higher(auth.uid(),'team_member'::app_role)
        AND cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
    OR auth.uid() = user_id
    OR public.is_ticket_assigned_to(id, auth.uid())
  );

CREATE POLICY rls_ticket_messages_select ON public.ticket_messages
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_messages.ticket_id));

CREATE POLICY rls_ticket_attachments_select ON public.ticket_attachments
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.tickets t WHERE t.id = ticket_attachments.ticket_id));
```

### PASSO 3 — GATES
- 3a: `pg_policies` cmd=SELECT nas 3 → 1 policy por tabela, `tickets` com os 4 ramos (admin / cluster / user_id / assigned), messages/attachments com EXISTS no pai, nenhuma com `team_member` solto sem cluster.
- 3b: INSERT/UPDATE/DELETE das 3 idênticas ao baseline acima.

### PASSO 4 — Relatório
Contagens (1a) + policies antigas (1b) + esperado vs obtido (3a/3b).

### Rollback (se GATE falhar)
Dropar os 3 `rls_*_select` novos e recriar exatamente as 3 SELECT do baseline (definições preservadas acima).

### ⚠️ Impacto em produção
- Vale em prod. Internos deixam de ver chamados de outros clusters — comportamento desejado.
- 3 tickets sem `cluster_id` ficarão invisíveis a internos exceto admin/autor/atribuído. Se quiser, posso listar os 3 IDs antes de aplicar para você decidir se atribui cluster primeiro.

Confirmar para eu aplicar?
