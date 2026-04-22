-- 1) Revoga acessos indevidos: apenas admins podem ver /equipe/acessos
DELETE FROM public.user_page_access upa
USING public.page_permissions pp
WHERE upa.page_permission_id = pp.id
  AND pp.page_path = '/equipe/acessos'
  AND NOT public.has_role(upa.user_id, 'admin'::app_role);

-- 2) Recategoriza a página como 'admin' para isolá-la dos backfills por categoria
UPDATE public.page_permissions
SET category = 'admin'
WHERE page_path = '/equipe/acessos';