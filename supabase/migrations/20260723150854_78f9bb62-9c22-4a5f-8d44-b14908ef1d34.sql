
-- EDU-02: RPC segura para resolver nome de uploader
CREATE OR REPLACE FUNCTION public.get_uploader_names(_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT
    p.id,
    NULLIF(BTRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '')
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND EXISTS (
      SELECT 1
      FROM public.documento_arquivo d
      WHERE d.created_by = p.id
        AND d.excluido = false
        AND (
          public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
          OR d.cliente_id = public.resolve_user_cliente_id(auth.uid())
        )
    );
$$;

REVOKE ALL ON FUNCTION public.get_uploader_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_uploader_names(uuid[]) TO authenticated;

-- EDU-02: RPC de soft-delete restrita ao dono cliente
CREATE OR REPLACE FUNCTION public.soft_delete_documento_cliente(_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente uuid;
BEGIN
  v_cliente := public.resolve_user_cliente_id(auth.uid());
  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'documento não encontrado ou sem permissão'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.documento_arquivo
     SET excluido = true,
         updated_at = now()
   WHERE id = _id
     AND fonte = 'cliente'
     AND excluido = false
     AND cliente_id = v_cliente;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento não encontrado ou sem permissão'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.soft_delete_documento_cliente(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soft_delete_documento_cliente(uuid) TO authenticated;
