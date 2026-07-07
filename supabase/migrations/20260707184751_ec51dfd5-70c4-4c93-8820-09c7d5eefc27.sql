BEGIN;

DO $$ DECLARE t text; p record; BEGIN
  FOREACH t IN ARRAY ARRAY['metas','kpis_meta','atualizacoes_meta','itens_acao_1a1','ppr_regras_ciclo','ciclos_avaliacao']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies
             WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t); END LOOP;
  END LOOP;
END $$;

CREATE POLICY rls_metas_select ON public.metas
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(),'admin'::app_role)
    OR responsavel_id = auth.uid()
    OR public.has_role_or_higher(auth.uid(),'lider'::app_role)
  );

CREATE POLICY rls_kpis_meta_select ON public.kpis_meta
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.metas m WHERE m.id = kpis_meta.meta_id));

CREATE POLICY rls_atualizacoes_meta_select ON public.atualizacoes_meta
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.metas m WHERE m.id = atualizacoes_meta.meta_id));

CREATE POLICY rls_itens_acao_1a1_select ON public.itens_acao_1a1
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.reunioes_1a1 r
    WHERE r.id = itens_acao_1a1.reuniao_id
      AND (r.lider_id = auth.uid()
           OR r.membro_id = auth.uid()
           OR public.has_role_or_higher(auth.uid(),'lider'::app_role))
  ));

CREATE POLICY rls_ppr_regras_ciclo_select ON public.ppr_regras_ciclo
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(),'lider'::app_role));

CREATE POLICY rls_ciclos_avaliacao_select ON public.ciclos_avaliacao
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(),'lider'::app_role));

COMMIT;