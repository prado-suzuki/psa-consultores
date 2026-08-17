CREATE OR REPLACE FUNCTION public.tg_tickets_set_closed_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.status = 'fechado' AND COALESCE(OLD.status, '') <> 'fechado' THEN
    NEW.closed_at := now();
  ELSIF NEW.status <> 'fechado' AND COALESCE(OLD.status, '') = 'fechado' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tg_tickets_set_closed_at() IS
  'Mantém tickets.closed_at como consequência do status. Só `fechado` marca a data; `resolvido` é intermediário (janela de aceite de 3 dias). Sair de `fechado` limpa a data, o que preserva a reabertura pela equipe.';

CREATE OR REPLACE FUNCTION public.tg_ticket_messages_reabre_resolvido()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT COALESCE(NEW.is_admin, false) THEN
    UPDATE public.tickets
       SET status = 'em_andamento'
     WHERE id = NEW.ticket_id
       AND status = 'resolvido';
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_messages_reabre_resolvido ON public.ticket_messages;
CREATE TRIGGER trg_ticket_messages_reabre_resolvido
  AFTER INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_ticket_messages_reabre_resolvido();

CREATE OR REPLACE FUNCTION public.tg_ticket_messages_bloqueia_fechado()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'client'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status FROM public.tickets WHERE id = NEW.ticket_id;

  IF v_status = 'fechado' THEN
    RAISE EXCEPTION
      'Chamado encerrado: nao aceita novas mensagens. Abra um novo chamado.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_messages_bloqueia_fechado ON public.ticket_messages;
CREATE TRIGGER trg_ticket_messages_bloqueia_fechado
  BEFORE INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_ticket_messages_bloqueia_fechado();

CREATE OR REPLACE FUNCTION public.fechar_chamados_resolvidos_sem_resposta()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dias     constant integer := 3;
  v_fechados integer := 0;
BEGIN
  WITH candidatos AS (
    SELECT t.id
      FROM public.tickets t
     WHERE t.status = 'resolvido'
       AND COALESCE(
             (SELECT MAX(m.created_at)
                FROM public.ticket_messages m
               WHERE m.ticket_id = t.id),
             t.updated_at
           ) <= now() - make_interval(days => v_dias)
  )
  UPDATE public.tickets t
     SET status = 'fechado'
    FROM candidatos c
   WHERE c.id = t.id;

  GET DIAGNOSTICS v_fechados = ROW_COUNT;

  IF v_fechados > 0 THEN
    RAISE NOTICE 'Fechamento automatico: % chamado(s) fechados apos % dias sem resposta',
      v_fechados, v_dias;
  END IF;

  RETURN v_fechados;
END;
$$;

COMMENT ON FUNCTION public.fechar_chamados_resolvidos_sem_resposta() IS
  'Fecha chamados em `resolvido` sem mensagem nova há 3 dias corridos. Agendada em cron.job como fechar-chamados-resolvidos-diario.';

REVOKE ALL ON FUNCTION public.fechar_chamados_resolvidos_sem_resposta() FROM public;

DO $$
BEGIN
  PERFORM cron.unschedule('fechar-chamados-resolvidos-diario');
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'fechar-chamados-resolvidos-diario',
  '15 11 * * *',
  $job$SELECT public.fechar_chamados_resolvidos_sem_resposta();$job$
);