
-- 1. profiles_safe view: switch to security invoker so it respects the caller's RLS
ALTER VIEW public.profiles_safe SET (security_invoker = true);

-- 2. Helper: can current user view a given ticket (mirrors tickets SELECT policy)
CREATE OR REPLACE FUNCTION public.can_view_ticket(_ticket_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = _ticket_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
            AND t.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
        OR (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
            AND t.cliente_id IS NOT NULL
            AND public.cliente_visivel_para(t.cliente_id))
        OR auth.uid() = t.user_id
        OR public.is_ticket_assigned_to(t.id, auth.uid())
      )
  );
$$;

-- 3. ticket_attachments SELECT: restrict to users who can view the ticket
DROP POLICY IF EXISTS rls_ticket_attachments_select ON public.ticket_attachments;
CREATE POLICY rls_ticket_attachments_select
  ON public.ticket_attachments
  FOR SELECT
  TO authenticated
  USING (public.can_view_ticket(ticket_id));

-- 4. ticket_messages SELECT: restrict to users who can view the ticket
DROP POLICY IF EXISTS rls_ticket_messages_select ON public.ticket_messages;
CREATE POLICY rls_ticket_messages_select
  ON public.ticket_messages
  FOR SELECT
  TO authenticated
  USING (public.can_view_ticket(ticket_id));

-- 5. atualizacoes_meta SELECT: require team_member+ AND meta exists
DROP POLICY IF EXISTS rls_atualizacoes_meta_select ON public.atualizacoes_meta;
CREATE POLICY rls_atualizacoes_meta_select
  ON public.atualizacoes_meta
  FOR SELECT
  TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND EXISTS (SELECT 1 FROM public.metas m WHERE m.id = atualizacoes_meta.meta_id)
  );

-- 6. estrutura_* tables: SELECT restricted to team_member+
DROP POLICY IF EXISTS "Authenticated users can read areas" ON public.estrutura_areas;
CREATE POLICY "Team members can read areas"
  ON public.estrutura_areas FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Authenticated users can read clusters" ON public.estrutura_clusters;
CREATE POLICY "Team members can read clusters"
  ON public.estrutura_clusters FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Authenticated users can read equipes" ON public.estrutura_equipes;
CREATE POLICY "Team members can read equipes"
  ON public.estrutura_equipes FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

DROP POLICY IF EXISTS "Authenticated users can read equipe membros" ON public.estrutura_equipe_membros;
CREATE POLICY "Team members can read equipe membros"
  ON public.estrutura_equipe_membros FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- 7. Etapa/processo/sistema/melhoria/gargalo/justificativas tables:
-- replace USING(true) / WITH CHECK(true) policies with team_member+ gate.
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'etapa_sistemas','etapa_responsaveis','etapa_documentos',
    'sistemas_processo','documentos_processo',
    'sistema_clusters','sistema_responsaveis',
    'melhoria_sistemas','melhoria_responsaveis','melhoria_processos','melhoria_acoes_td',
    'gargalos','gargalo_processos','gargalo_responsaveis',
    'projeto_justificativas'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    FOR pol IN
      SELECT policyname, cmd
      FROM pg_policies
      WHERE schemaname='public' AND tablename=t
        AND (qual = 'true' OR with_check = 'true')
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    EXECUTE format($f$
      CREATE POLICY "team_member_select_%1$s" ON public.%1$I
        FOR SELECT TO authenticated
        USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
      CREATE POLICY "team_member_insert_%1$s" ON public.%1$I
        FOR INSERT TO authenticated
        WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
      CREATE POLICY "team_member_update_%1$s" ON public.%1$I
        FOR UPDATE TO authenticated
        USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role))
        WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
      CREATE POLICY "team_member_delete_%1$s" ON public.%1$I
        FOR DELETE TO authenticated
        USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
    $f$, t);
  END LOOP;
END $$;
