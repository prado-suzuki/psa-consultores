CREATE OR REPLACE FUNCTION public.cliente_visivel_para(_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.cliente_clusters cc
                 WHERE cc.cliente_id = _cliente_id
                   AND cc.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())));
$$;

CREATE OR REPLACE FUNCTION public.cliente_id_de_pessoa(_pessoa_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cliente_id FROM public.pessoa WHERE id = _pessoa_id;
$$;

CREATE OR REPLACE FUNCTION public.cliente_id_de_bem(_bem_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cliente_id FROM public.bem WHERE id = _bem_id;
$$;

CREATE OR REPLACE FUNCTION public.cliente_id_de_matricula(_matricula_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.cliente_id FROM public.matricula m JOIN public.bem b ON b.id = m.bem_id WHERE m.id = _matricula_id;
$$;

GRANT EXECUTE ON FUNCTION public.cliente_visivel_para(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_id_de_pessoa(uuid)    TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_id_de_bem(uuid)       TO authenticated;
GRANT EXECUTE ON FUNCTION public.cliente_id_de_matricula(uuid) TO authenticated;

DO $$
DECLARE t text; p record;
BEGIN
  FOREACH t IN ARRAY ARRAY['pessoa','bem','capital_integralizacao','matricula','parentesco','quadro_societario','titularidade']
  LOOP
    FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd='SELECT'
    LOOP EXECUTE format('DROP POLICY %I ON public.%I', p.policyname, t); END LOOP;
  END LOOP;
END $$;

CREATE POLICY osg_cluster_select_pessoa ON public.pessoa FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(cliente_id));
CREATE POLICY osg_cluster_select_bem ON public.bem FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(cliente_id));
CREATE POLICY osg_cluster_select_capital_integralizacao ON public.capital_integralizacao FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(cliente_id));
CREATE POLICY osg_cluster_select_matricula ON public.matricula FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(public.cliente_id_de_bem(bem_id)));
CREATE POLICY osg_cluster_select_parentesco ON public.parentesco FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(public.cliente_id_de_pessoa(pessoa_id)));
CREATE POLICY osg_cluster_select_quadro_societario ON public.quadro_societario FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(public.cliente_id_de_pessoa(empresa_pessoa_id)));
CREATE POLICY osg_cluster_select_titularidade ON public.titularidade FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(COALESCE(public.cliente_id_de_bem(bem_id), public.cliente_id_de_matricula(matricula_id))));