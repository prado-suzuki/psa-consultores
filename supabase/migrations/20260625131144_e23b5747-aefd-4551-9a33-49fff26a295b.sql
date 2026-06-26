BEGIN;

ALTER TABLE public.dashboards ADD COLUMN IF NOT EXISTS sop_url text;
COMMENT ON COLUMN public.dashboards.sop_url IS 'URL do manual/SOP do dashboard (botão "Manual" no consumidor).';

DROP FUNCTION IF EXISTS public.get_accessible_dashboards(text);
CREATE FUNCTION public.get_accessible_dashboards(_target_page text DEFAULT NULL)
RETURNS TABLE (id uuid, name text, filter_type text, target_page text, sop_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT d.id, d.name, d.filter_type, d.target_page, d.sop_url
  FROM public.dashboards d
  WHERE d.is_active = true
    AND (_target_page IS NULL OR d.target_page = _target_page)
    AND EXISTS (
      SELECT 1 FROM public.dashboard_access da
      WHERE da.dashboard_id = d.id AND da.user_id = auth.uid()
    )
  ORDER BY d.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_accessible_dashboards(text) TO authenticated;

DROP POLICY IF EXISTS "team_member+ can view dashboards" ON public.dashboards;
DROP POLICY IF EXISTS "lider+ can view dashboards"       ON public.dashboards;
CREATE POLICY "lider+ can view dashboards" ON public.dashboards
  FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'lider'::app_role));

UPDATE public.dashboards
SET sop_url = 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/dashboard-controle-de-uso-gestao/'
WHERE name = 'Controle de uso e envio de documentos' AND target_page = 'board_relatorios';

UPDATE public.dashboards
SET sop_url = 'https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/dashboard-controle-de-uso-interno/'
WHERE name = 'Controle de uso e envio de documentos' AND target_page = 'dev_gerenciar_dados';

COMMIT;