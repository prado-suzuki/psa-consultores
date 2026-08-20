CREATE UNIQUE INDEX IF NOT EXISTS user_page_access_user_page_uniq
  ON public.user_page_access (user_id, page_permission_id);

CREATE OR REPLACE FUNCTION public.auto_grant_new_page_to_area_users()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_page_access (user_id, page_permission_id, granted_by)
  SELECT DISTINCT upa.user_id, NEW.id, NULL::uuid
  FROM public.user_page_access upa
  JOIN public.page_permissions pp ON pp.id = upa.page_permission_id
  WHERE pp.category = NEW.category
    AND pp.id <> NEW.id
  ON CONFLICT (user_id, page_permission_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_grant_new_page ON public.page_permissions;
CREATE TRIGGER trg_auto_grant_new_page
AFTER INSERT ON public.page_permissions
FOR EACH ROW
EXECUTE FUNCTION public.auto_grant_new_page_to_area_users();

INSERT INTO public.user_page_access (user_id, page_permission_id, granted_by)
SELECT DISTINCT upa.user_id,
       (SELECT id FROM public.page_permissions WHERE page_path = '/equipe/tax/dashboard'),
       NULL::uuid
FROM public.user_page_access upa
JOIN public.page_permissions pp ON pp.id = upa.page_permission_id
WHERE pp.category = 'tax'
  AND upa.user_id NOT IN (
    SELECT user_id FROM public.user_page_access
    WHERE page_permission_id = (SELECT id FROM public.page_permissions WHERE page_path = '/equipe/tax/dashboard')
  )
ON CONFLICT (user_id, page_permission_id) DO NOTHING;