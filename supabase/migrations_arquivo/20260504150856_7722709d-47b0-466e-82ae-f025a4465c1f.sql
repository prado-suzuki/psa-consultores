
-- 1) profiles: allow self-select
CREATE POLICY "rls_profiles_select_self"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

-- 2) reunioes_1a1: restrict SELECT to participants + lider/admin
DROP POLICY IF EXISTS "rls_reunioes_1a1_select" ON public.reunioes_1a1;
CREATE POLICY "rls_reunioes_1a1_select"
  ON public.reunioes_1a1 FOR SELECT
  TO authenticated
  USING (
    auth.uid() = lider_id
    OR auth.uid() = membro_id
    OR public.has_role_or_higher(auth.uid(), 'lider'::app_role)
  );

-- 3) feedbacks: restrict SELECT to sender/recipient + lider/admin
DROP POLICY IF EXISTS "rls_feedbacks_select" ON public.feedbacks;
CREATE POLICY "rls_feedbacks_select"
  ON public.feedbacks FOR SELECT
  TO authenticated
  USING (
    auth.uid() = de_usuario_id
    OR (auth.uid() = para_usuario_id AND visivel_para_avaliado = true)
    OR public.has_role_or_higher(auth.uid(), 'lider'::app_role)
  );

-- 4) analises_semestrais: restrict SELECT to responsavel + lider/admin
DROP POLICY IF EXISTS "rls_analises_semestrais_select" ON public.analises_semestrais;
CREATE POLICY "rls_analises_semestrais_select"
  ON public.analises_semestrais FOR SELECT
  TO authenticated
  USING (
    auth.uid() = responsavel_id
    OR public.has_role_or_higher(auth.uid(), 'lider'::app_role)
  );

-- 5) ppr_regras_ciclo: replace auth.role() with role-based access
DROP POLICY IF EXISTS "Admin e lider gerenciam regras PPR" ON public.ppr_regras_ciclo;
DROP POLICY IF EXISTS "Autenticados visualizam regras PPR" ON public.ppr_regras_ciclo;

CREATE POLICY "rls_ppr_regras_ciclo_select"
  ON public.ppr_regras_ciclo FOR SELECT
  TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "rls_ppr_regras_ciclo_modify"
  ON public.ppr_regras_ciclo FOR ALL
  TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

-- 6) novidades: allow authenticated users (team and clients) to read active items
CREATE POLICY "rls_novidades_select_active"
  ON public.novidades FOR SELECT
  TO authenticated
  USING (ativo = true);

-- 7) storage.objects: tighten ticket-attachments SELECT and add DELETE
DROP POLICY IF EXISTS "Users can view their ticket attachments" ON storage.objects;

CREATE POLICY "Ticket attachments select scoped"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND (
      public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.tickets t
        WHERE t.id::text = (storage.foldername(name))[1]
          AND (t.user_id = auth.uid() OR public.is_ticket_assigned_to(t.id, auth.uid()))
      )
    )
  );

CREATE POLICY "Ticket attachments delete by team"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'ticket-attachments'
    AND public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
  );
