ALTER TABLE public.bem ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matricula ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.titularidade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impedimento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cartorio ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "team_member+ can view bem" ON public.bem;
DROP POLICY IF EXISTS "team_member+ can insert bem" ON public.bem;
DROP POLICY IF EXISTS "team_member+ can update bem" ON public.bem;
DROP POLICY IF EXISTS "admin can delete bem" ON public.bem;
CREATE POLICY "team_member+ can view bem" ON public.bem FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert bem" ON public.bem FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update bem" ON public.bem FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete bem" ON public.bem FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "team_member+ can view matricula" ON public.matricula;
DROP POLICY IF EXISTS "team_member+ can insert matricula" ON public.matricula;
DROP POLICY IF EXISTS "team_member+ can update matricula" ON public.matricula;
DROP POLICY IF EXISTS "admin can delete matricula" ON public.matricula;
CREATE POLICY "team_member+ can view matricula" ON public.matricula FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert matricula" ON public.matricula FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update matricula" ON public.matricula FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete matricula" ON public.matricula FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "team_member+ can view titularidade" ON public.titularidade;
DROP POLICY IF EXISTS "team_member+ can insert titularidade" ON public.titularidade;
DROP POLICY IF EXISTS "team_member+ can update titularidade" ON public.titularidade;
DROP POLICY IF EXISTS "admin can delete titularidade" ON public.titularidade;
CREATE POLICY "team_member+ can view titularidade" ON public.titularidade FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert titularidade" ON public.titularidade FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update titularidade" ON public.titularidade FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete titularidade" ON public.titularidade FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "team_member+ can view impedimento" ON public.impedimento;
DROP POLICY IF EXISTS "team_member+ can insert impedimento" ON public.impedimento;
DROP POLICY IF EXISTS "team_member+ can update impedimento" ON public.impedimento;
DROP POLICY IF EXISTS "admin can delete impedimento" ON public.impedimento;
CREATE POLICY "team_member+ can view impedimento" ON public.impedimento FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert impedimento" ON public.impedimento FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update impedimento" ON public.impedimento FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete impedimento" ON public.impedimento FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "team_member+ can view cartorio" ON public.cartorio;
DROP POLICY IF EXISTS "team_member+ can insert cartorio" ON public.cartorio;
DROP POLICY IF EXISTS "team_member+ can update cartorio" ON public.cartorio;
DROP POLICY IF EXISTS "admin can delete cartorio" ON public.cartorio;
CREATE POLICY "team_member+ can view cartorio" ON public.cartorio FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can insert cartorio" ON public.cartorio FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "team_member+ can update cartorio" ON public.cartorio FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::app_role));
CREATE POLICY "admin can delete cartorio" ON public.cartorio FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.titularidade ALTER COLUMN fracao DROP NOT NULL;