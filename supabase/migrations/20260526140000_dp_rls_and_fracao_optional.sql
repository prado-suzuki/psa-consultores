-- =============================================================================
-- Diagnóstico Patrimonial: garante RLS team_member+ e torna fração opcional
-- =============================================================================
-- As tabelas bem, matricula, titularidade, impedimento e cartorio foram criadas
-- via Lovable Cloud com RLS habilitado mas sem policies acessíveis ao
-- team_member, fazendo INSERTs aparentarem sucesso (via RETURNING) e desaparecerem
-- nos SELECTs subsequentes. Esta migration normaliza as policies seguindo o
-- padrão já usado em pessoa/parentesco.
-- =============================================================================

ALTER TABLE public.bem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titularidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impedimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartorio ENABLE ROW LEVEL SECURITY;

-- bem -------------------------------------------------------------------------
DROP POLICY IF EXISTS "team_member+ can view bem" ON public.bem;
DROP POLICY IF EXISTS "team_member+ can insert bem" ON public.bem;
DROP POLICY IF EXISTS "team_member+ can update bem" ON public.bem;
DROP POLICY IF EXISTS "admin can delete bem" ON public.bem;

CREATE POLICY "team_member+ can view bem"
  ON public.bem FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert bem"
  ON public.bem FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update bem"
  ON public.bem FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete bem"
  ON public.bem FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- matricula -------------------------------------------------------------------
DROP POLICY IF EXISTS "team_member+ can view matricula" ON public.matricula;
DROP POLICY IF EXISTS "team_member+ can insert matricula" ON public.matricula;
DROP POLICY IF EXISTS "team_member+ can update matricula" ON public.matricula;
DROP POLICY IF EXISTS "admin can delete matricula" ON public.matricula;

CREATE POLICY "team_member+ can view matricula"
  ON public.matricula FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert matricula"
  ON public.matricula FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update matricula"
  ON public.matricula FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete matricula"
  ON public.matricula FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- titularidade ----------------------------------------------------------------
DROP POLICY IF EXISTS "team_member+ can view titularidade" ON public.titularidade;
DROP POLICY IF EXISTS "team_member+ can insert titularidade" ON public.titularidade;
DROP POLICY IF EXISTS "team_member+ can update titularidade" ON public.titularidade;
DROP POLICY IF EXISTS "admin can delete titularidade" ON public.titularidade;

CREATE POLICY "team_member+ can view titularidade"
  ON public.titularidade FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert titularidade"
  ON public.titularidade FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update titularidade"
  ON public.titularidade FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete titularidade"
  ON public.titularidade FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- impedimento -----------------------------------------------------------------
DROP POLICY IF EXISTS "team_member+ can view impedimento" ON public.impedimento;
DROP POLICY IF EXISTS "team_member+ can insert impedimento" ON public.impedimento;
DROP POLICY IF EXISTS "team_member+ can update impedimento" ON public.impedimento;
DROP POLICY IF EXISTS "admin can delete impedimento" ON public.impedimento;

CREATE POLICY "team_member+ can view impedimento"
  ON public.impedimento FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert impedimento"
  ON public.impedimento FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update impedimento"
  ON public.impedimento FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete impedimento"
  ON public.impedimento FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- cartorio --------------------------------------------------------------------
DROP POLICY IF EXISTS "team_member+ can view cartorio" ON public.cartorio;
DROP POLICY IF EXISTS "team_member+ can insert cartorio" ON public.cartorio;
DROP POLICY IF EXISTS "team_member+ can update cartorio" ON public.cartorio;
DROP POLICY IF EXISTS "admin can delete cartorio" ON public.cartorio;

CREATE POLICY "team_member+ can view cartorio"
  ON public.cartorio FOR SELECT TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can insert cartorio"
  ON public.cartorio FOR INSERT TO authenticated
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "team_member+ can update cartorio"
  ON public.cartorio FOR UPDATE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));

CREATE POLICY "admin can delete cartorio"
  ON public.cartorio FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- =============================================================================
-- titularidade.fracao: tornar opcional (composse sem percentual definido)
-- =============================================================================
ALTER TABLE public.titularidade ALTER COLUMN fracao DROP NOT NULL;
