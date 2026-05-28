DO $$
DECLARE
  v_old_id uuid;
  v_new_id uuid;
BEGIN
  SELECT id INTO v_old_id FROM public.page_permissions WHERE page_path = '/equipe/osg/work/quadro-societario';
  SELECT id INTO v_new_id FROM public.page_permissions WHERE page_path = '/equipe/osg/work/qualificacao-das-partes';

  IF v_old_id IS NOT NULL AND v_new_id IS NOT NULL AND v_old_id <> v_new_id THEN
    UPDATE public.user_page_access
      SET page_permission_id = v_old_id
      WHERE page_permission_id = v_new_id
        AND NOT EXISTS (
          SELECT 1 FROM public.user_page_access ua2
          WHERE ua2.page_permission_id = v_old_id AND ua2.user_id = public.user_page_access.user_id
        );
    DELETE FROM public.user_page_access WHERE page_permission_id = v_new_id;
    DELETE FROM public.page_permissions WHERE id = v_new_id;
  END IF;

  IF v_old_id IS NOT NULL THEN
    UPDATE public.page_permissions
      SET page_path = '/equipe/osg/work/qualificacao-das-partes',
          page_name = 'Qualificação das Partes',
          page_description = 'CRUD de pessoas (PF/PJ) e vínculos de parentesco por cliente'
      WHERE id = v_old_id;
  END IF;
END $$;