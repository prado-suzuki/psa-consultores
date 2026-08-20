-- Admins podem adicionar roles
CREATE POLICY "Admins can insert roles"
ON public.user_roles FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Admins podem atualizar roles  
CREATE POLICY "Admins can update roles"
ON public.user_roles FOR UPDATE
USING (has_role(auth.uid(), 'admin'));

-- Admins podem remover roles
CREATE POLICY "Admins can delete roles"
ON public.user_roles FOR DELETE
USING (has_role(auth.uid(), 'admin'));

-- Team members podem ver profiles de outros membros
CREATE POLICY "Team members can view all profiles"
ON public.profiles FOR SELECT
USING (has_role(auth.uid(), 'team_member'));