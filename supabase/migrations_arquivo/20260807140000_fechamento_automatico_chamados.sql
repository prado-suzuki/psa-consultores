-- ============================================================
-- Chamados — fechamento automático e fim do fechamento manual
-- ============================================================
-- Problema
--   O analista respondia e fechava o chamado em seguida — 50 dos 56 chamados
--   fechados pelo app foram encerrados em até 2 minutos da resposta (em dois
--   casos medidos, 6 e 17 segundos). Ou seja, "fechado" significava apenas
--   "o analista terminou de escrever", nunca "o cliente concordou". O cliente
--   ainda podia escrever, mas chamado fechado não aparece no sino nem no prazo,
--   então a mensagem ficava invisível: 3 perguntas de cliente sem tratativa,
--   uma delas por 85 dias.
--
-- Desenho
--   1. o analista marca `resolvido`; não fecha mais à mão (bloqueio na UI)
--   2. o sistema fecha após 3 dias corridos sem nenhuma mensagem nova
--   3. resposta do cliente na janela devolve o chamado para `em_andamento`,
--      trazendo-o de volta à fila, ao sino e ao badge de prazo
--   4. em `fechado` o cliente não escreve mais — abre chamado novo
--
--   Com isso `fechado` passa a ser o único estado terminal, e passa a
--   significar "ninguém contestou em 3 dias".
--
-- Idempotente: pode ser reaplicado.
-- ============================================================

-- ------------------------------------------------------------
-- 1. `closed_at` passa a marcar só o fechamento de verdade
--    Antes, entrar em `resolvido` já preenchia closed_at — o que agora seria
--    errado, porque `resolvido` é intermediário.
-- ------------------------------------------------------------
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
  'Mantém tickets.closed_at como consequência do status. Só `fechado` marca a '
  'data; `resolvido` é intermediário (janela de aceite de 3 dias). Sair de '
  '`fechado` limpa a data, o que preserva a reabertura pela equipe.';

-- ------------------------------------------------------------
-- 2. Resposta do cliente na janela reabre o chamado
--    É esta trigger que evita mexer nas 7 regras espalhadas que tratam status
--    terminal: o chamado sai de `resolvido` sozinho, então sino, prazo e
--    contadores voltam a funcionar sem alteração.
--    SECURITY DEFINER: é ação de sistema, não deve depender do RLS de quem
--    escreveu a mensagem.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 3. Cliente não escreve em chamado fechado
--    Defesa de banco do bloqueio da UI. Barra apenas quem é explicitamente
--    `client`: a equipe escreve em chamado fechado hoje (8 mensagens em 8
--    chamados) e isso continua valendo. Como a condição é a presença do papel
--    `client`, o cron e o service_role (auth.uid() nulo) também não são
--    afetados.
-- ------------------------------------------------------------
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

-- ------------------------------------------------------------
-- 4. Fechamento automático após 3 dias corridos sem mensagem nova
--    A referência é a última mensagem do chamado. Como resposta de cliente tira
--    o chamado de `resolvido` (item 2), a última mensagem de um chamado
--    `resolvido` é necessariamente da PSA — qualquer mensagem nova reinicia o
--    relógio naturalmente. Sem mensagem alguma, cai no updated_at.
--    O prazo espelha DIAS_ATE_FECHAMENTO_AUTOMATICO em src/lib/chamadosStatus.ts.
-- ------------------------------------------------------------
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
  'Fecha chamados em `resolvido` sem mensagem nova há 3 dias corridos. '
  'Agendada em cron.job como fechar-chamados-resolvidos-diario.';

REVOKE ALL ON FUNCTION public.fechar_chamados_resolvidos_sem_resposta() FROM public;

-- ------------------------------------------------------------
-- 5. Agendamento — mesmo padrão do job check-ticket-deadlines-daily
--    (11:15 UTC = 08:15 no horário de Brasília, 15 min depois dele)
-- ------------------------------------------------------------
DO $$
BEGIN
  PERFORM cron.unschedule('fechar-chamados-resolvidos-diario');
EXCEPTION
  WHEN OTHERS THEN NULL;  -- job ainda não existe
END $$;

SELECT cron.schedule(
  'fechar-chamados-resolvidos-diario',
  '15 11 * * *',
  $job$SELECT public.fechar_chamados_resolvidos_sem_resposta();$job$
);
