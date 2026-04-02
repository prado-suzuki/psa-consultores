
DO $$
DECLARE
  v_old_id uuid;
  v_new_id uuid;
BEGIN
  -- Check for old and new records
  SELECT id INTO v_old_id FROM public.page_permissions WHERE page_path = '/equipe/dev/auditoria-fiscal';
  SELECT id INTO v_new_id FROM public.page_permissions WHERE page_path = '/equipe/dev/processo-difal';

  IF v_old_id IS NOT NULL AND v_new_id IS NOT NULL AND v_old_id <> v_new_id THEN
    -- Both exist: migrate any access from new to old, then delete new
    UPDATE public.user_page_access
      SET page_permission_id = v_old_id
      WHERE page_permission_id = v_new_id
        AND NOT EXISTS (
          SELECT 1 FROM public.user_page_access ua2
          WHERE ua2.page_permission_id = v_old_id AND ua2.user_id = public.user_page_access.user_id
        );
    -- Remove remaining duplicates pointing to new
    DELETE FROM public.user_page_access WHERE page_permission_id = v_new_id;
    DELETE FROM public.page_permissions WHERE id = v_new_id;
  END IF;

  -- Now rename the old record (if it exists)
  IF v_old_id IS NOT NULL THEN
    UPDATE public.page_permissions
      SET page_path = '/equipe/dev/processo-difal',
          page_name = 'Processo DIFAL'
      WHERE id = v_old_id;
  END IF;
END $$;
