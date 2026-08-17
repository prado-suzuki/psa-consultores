
CREATE OR REPLACE FUNCTION public.mark_stuck_procedimentos(timeout_minutes integer DEFAULT 15)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.procedimentos
     SET status_geracao = 'erro',
         erro_mensagem  = COALESCE(erro_mensagem, 'Processamento expirado (timeout)')
   WHERE status_geracao = 'processando'
     AND created_at < now() - make_interval(mins => timeout_minutes);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_stuck_procedimentos(integer) TO authenticated;

-- Limpeza imediata dos zumbis atuais (>1 dia em processando)
UPDATE public.procedimentos
   SET status_geracao = 'erro',
       erro_mensagem  = COALESCE(erro_mensagem, 'Processamento interrompido (limpeza automática)')
 WHERE status_geracao = 'processando'
   AND created_at < now() - interval '1 day';
