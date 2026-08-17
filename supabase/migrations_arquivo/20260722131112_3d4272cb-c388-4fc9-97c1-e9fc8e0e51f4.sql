
-- 1) documento_arquivo: add cliente cluster visibility scoping
DROP POLICY IF EXISTS "team_member+ can view documento_arquivo" ON public.documento_arquivo;
DROP POLICY IF EXISTS "team_member+ can update documento_arquivo" ON public.documento_arquivo;
DROP POLICY IF EXISTS "team_member+ can insert documento_arquivo" ON public.documento_arquivo;
DROP POLICY IF EXISTS "admin can delete documento_arquivo" ON public.documento_arquivo;

CREATE POLICY "team_member+ can view documento_arquivo"
  ON public.documento_arquivo FOR SELECT TO authenticated
  USING (
    excluido = false
    AND has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

CREATE POLICY "team_member+ can insert documento_arquivo"
  ON public.documento_arquivo FOR INSERT TO authenticated
  WITH CHECK (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

CREATE POLICY "team_member+ can update documento_arquivo"
  ON public.documento_arquivo FOR UPDATE TO authenticated
  USING (
    excluido = false
    AND has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  )
  WITH CHECK (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

CREATE POLICY "admin can delete documento_arquivo"
  ON public.documento_arquivo FOR DELETE TO authenticated
  USING (excluido = false AND has_role(auth.uid(), 'admin'::app_role));

-- 2) kpis_meta: restrict writes to admin or the parent meta responsavel
DROP POLICY IF EXISTS "lider_manage_kpis_meta" ON public.kpis_meta;

CREATE POLICY "manage_kpis_meta_scoped"
  ON public.kpis_meta FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.metas m
      WHERE m.id = kpis_meta.meta_id
        AND (m.responsavel_id = auth.uid() OR m.created_by = auth.uid())
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.metas m
      WHERE m.id = kpis_meta.meta_id
        AND (m.responsavel_id = auth.uid() OR m.created_by = auth.uid())
    )
  );

-- 3) storage.objects: explicit policies for osg-templates and osg-apresentacoes buckets
DROP POLICY IF EXISTS "osg_templates_select_internal" ON storage.objects;
DROP POLICY IF EXISTS "osg_templates_write_admin" ON storage.objects;
DROP POLICY IF EXISTS "osg_apresentacoes_select_internal" ON storage.objects;
DROP POLICY IF EXISTS "osg_apresentacoes_write_internal" ON storage.objects;

CREATE POLICY "osg_templates_select_internal"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'osg-templates'
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
  );

CREATE POLICY "osg_templates_write_admin"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'osg-templates'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'osg-templates'
    AND public.has_role(auth.uid(), 'admin'::public.app_role)
  );

CREATE POLICY "osg_apresentacoes_select_internal"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'osg-apresentacoes'
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
  );

CREATE POLICY "osg_apresentacoes_write_internal"
  ON storage.objects FOR ALL TO authenticated
  USING (
    bucket_id = 'osg-apresentacoes'
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
  )
  WITH CHECK (
    bucket_id = 'osg-apresentacoes'
    AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
  );
