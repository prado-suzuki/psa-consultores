
CREATE TABLE public.distribuicao_dcomp (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nr_documento varchar NOT NULL REFERENCES public.dcomp(nr_documento) ON DELETE CASCADE,
  tributo varchar NOT NULL,
  valor_tributo numeric(18,2) NOT NULL DEFAULT 0,
  criado_em timestamptz NOT NULL DEFAULT now(),
  criado_por uuid,
  atualizado_em timestamptz NOT NULL DEFAULT now(),
  atualizado_por uuid
);

CREATE INDEX idx_distribuicao_dcomp_nr_documento ON public.distribuicao_dcomp(nr_documento);

CREATE TRIGGER trg_distribuicao_dcomp_atualizado_em
BEFORE UPDATE ON public.distribuicao_dcomp
FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em_column();

ALTER TABLE public.distribuicao_dcomp ENABLE ROW LEVEL SECURITY;

CREATE POLICY team_select_distribuicao_dcomp ON public.distribuicao_dcomp
  FOR SELECT USING (has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp
  FOR INSERT WITH CHECK (has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY rls_distribuicao_dcomp_update ON public.distribuicao_dcomp
  FOR UPDATE USING (has_role_or_higher(auth.uid(), 'team_member'::app_role))
  WITH CHECK (has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp
  FOR DELETE USING (has_role_or_higher(auth.uid(), 'lider'::app_role));
