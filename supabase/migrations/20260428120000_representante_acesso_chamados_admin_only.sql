-- Bloqueia desabilitação de `representante.acesso_chamados` (true -> false)
-- por usuários que não sejam `admin`. Habilitar (false -> true) continua
-- permitido para qualquer perfil que já tem permissão de UPDATE pela RLS.
-- Service role (auth.uid() IS NULL) não é afetado para não bloquear jobs internos.

CREATE OR REPLACE FUNCTION public.tg_representante_block_disable_acesso_chamados()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.acesso_chamados IS TRUE
     AND (NEW.acesso_chamados IS DISTINCT FROM TRUE)
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
  THEN
    RAISE EXCEPTION
      'Você não tem permissão para desabilitar acesso ao chamados, fale com a equipe Digital para realizar essa operação'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_representante_block_disable_acesso_chamados ON public.representante;

CREATE TRIGGER trg_representante_block_disable_acesso_chamados
BEFORE UPDATE ON public.representante
FOR EACH ROW
WHEN (OLD.acesso_chamados IS DISTINCT FROM NEW.acesso_chamados)
EXECUTE FUNCTION public.tg_representante_block_disable_acesso_chamados();
