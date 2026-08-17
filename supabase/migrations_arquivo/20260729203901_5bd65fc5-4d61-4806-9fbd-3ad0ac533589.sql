
-- Limpeza de policies de investigação em ordem_servico
DROP POLICY IF EXISTS debug_admin_uncond ON public.ordem_servico;
DROP POLICY IF EXISTS rls_ordem_servico_update_admin ON public.ordem_servico;

-- Macro: para cada tabela, 4 policies PERMISSIVE admin-only
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'cliente','cliente_clusters','ordem_servico','distribuicao_receita',
    'os_produtos_contratados','contribuinte','inscricao_contribuinte','representante'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS admin_full_%1$s_select ON public.%1$I', t);
    EXECUTE format($f$CREATE POLICY admin_full_%1$s_select ON public.%1$I AS PERMISSIVE FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))$f$, t);

    EXECUTE format('DROP POLICY IF EXISTS admin_full_%1$s_insert ON public.%1$I', t);
    EXECUTE format($f$CREATE POLICY admin_full_%1$s_insert ON public.%1$I AS PERMISSIVE FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'::app_role))$f$, t);

    EXECUTE format('DROP POLICY IF EXISTS admin_full_%1$s_update ON public.%1$I', t);
    EXECUTE format($f$CREATE POLICY admin_full_%1$s_update ON public.%1$I AS PERMISSIVE FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'admin'::app_role))$f$, t);

    EXECUTE format('DROP POLICY IF EXISTS admin_full_%1$s_delete ON public.%1$I', t);
    EXECUTE format($f$CREATE POLICY admin_full_%1$s_delete ON public.%1$I AS PERMISSIVE FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'::app_role))$f$, t);
  END LOOP;
END $$;
