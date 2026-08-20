DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['codigo_receita','grupo_tributo','produto_segmento',
                           'produto_servico','setor_cliente','page_permissions',
                           'rls_precheck_allowed_tables']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies
             WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t); END LOOP;
  END LOOP;
END $$;

CREATE POLICY rls_codigo_receita_select              ON public.codigo_receita
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_grupo_tributo_select               ON public.grupo_tributo
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_produto_segmento_select            ON public.produto_segmento
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_produto_servico_select             ON public.produto_servico
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_setor_cliente_select               ON public.setor_cliente
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_page_permissions_select            ON public.page_permissions
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));
CREATE POLICY rls_precheck_allowed_tables_select     ON public.rls_precheck_allowed_tables
  FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role));