
BEGIN;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'osg_tipo_exploracao') THEN
    CREATE TYPE public.osg_tipo_exploracao AS ENUM
      ('arrendamento','parceria','composse','comodato','condominio','propria');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.exploracao_rural (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
  referencia text,
  tipo_exploracao public.osg_tipo_exploracao NOT NULL,
  bem_id uuid REFERENCES public.bem(id) ON DELETE SET NULL,
  imovel_descricao text,
  matricula_texto text,
  municipio text,
  uf text,
  area_total numeric,
  area_explorada numeric,
  area_unidade text NOT NULL DEFAULT 'ha',
  explorador_pessoa_id uuid REFERENCES public.pessoa(id) ON DELETE SET NULL,
  explorador_nome text,
  outorgante_pessoa_id uuid REFERENCES public.pessoa(id) ON DELETE SET NULL,
  outorgante_nome text,
  declarado_irpf boolean NOT NULL DEFAULT false,
  data_assinatura date,
  data_encerramento date,
  vigencia text,
  sacas_por_hectare numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid DEFAULT auth.uid(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid DEFAULT auth.uid(),
  CONSTRAINT chk_expr_imovel     CHECK (bem_id IS NOT NULL OR imovel_descricao IS NOT NULL),
  CONSTRAINT chk_expr_explorador CHECK (explorador_pessoa_id IS NULL OR explorador_nome IS NULL),
  CONSTRAINT chk_expr_outorgante CHECK (outorgante_pessoa_id IS NULL OR outorgante_nome IS NULL)
);

CREATE INDEX IF NOT EXISTS idx_expr_cliente ON public.exploracao_rural(cliente_id);
CREATE INDEX IF NOT EXISTS idx_expr_bem     ON public.exploracao_rural(bem_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.exploracao_rural TO authenticated;
GRANT ALL ON public.exploracao_rural TO service_role;

DROP TRIGGER IF EXISTS trg_expr_updated_at ON public.exploracao_rural;
CREATE TRIGGER trg_expr_updated_at BEFORE UPDATE ON public.exploracao_rural
  FOR EACH ROW EXECUTE FUNCTION public.checklist_touch_updated_at();

ALTER TABLE public.exploracao_rural ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cluster can view exploracao_rural" ON public.exploracao_rural;
CREATE POLICY "cluster can view exploracao_rural" ON public.exploracao_rural
  FOR SELECT TO authenticated USING (public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS "cluster team_member insert exploracao_rural" ON public.exploracao_rural;
CREATE POLICY "cluster team_member insert exploracao_rural" ON public.exploracao_rural
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS "cluster team_member update exploracao_rural" ON public.exploracao_rural;
CREATE POLICY "cluster team_member update exploracao_rural" ON public.exploracao_rural
  FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.cliente_visivel_para(cliente_id))
  WITH CHECK (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS "cluster team_member delete exploracao_rural" ON public.exploracao_rural;
CREATE POLICY "cluster team_member delete exploracao_rural" ON public.exploracao_rural
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(),'team_member'::app_role) AND public.cliente_visivel_para(cliente_id));

COMMIT;
