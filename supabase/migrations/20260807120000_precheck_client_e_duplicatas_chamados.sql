-- ============================================================
-- Chamados — corrige precheck para role `client`, limpa duplicatas
-- e reacerta o activity_status
-- ============================================================
-- Contexto
--   A migração 20260708135606 restringiu o SELECT de
--   `rls_precheck_allowed_tables` a team_member+. Como `can_perform` é
--   SECURITY INVOKER, a role `client` passou a receber exceção ao consultar a
--   whitelist ("Table tickets is not allowed for precheck"). Em
--   useSendTicketMessage o precheck roda DEPOIS do insert da mensagem, então:
--   a mensagem gravava, o fluxo abortava, activity_status e e-mail não rodavam,
--   o cliente via erro e reenviava — duplicando a mensagem.
--
-- Medido em 06/08/2026: 5 grupos duplicados / 6 linhas excedentes / 5 chamados,
-- 100% de clientes. Antes de 08/07 havia 25 respostas de cliente e 0 duplicatas.
--
-- O que este arquivo faz
--   1. Whitelist do precheck passa a ser lida por função SECURITY DEFINER
--      (a tabela continua trancada — nada de exposição nova).
--   2. `can_perform` recriada com o corpo IDÊNTICO ao de produção
--      (validado via pg_get_functiondef em 07/08/2026), trocando apenas a
--      leitura da whitelist pela chamada da nova função.
--   3. Trigger que barra reenvio idêntico em janela curta — defesa de banco
--      para o caso de qualquer frontend futuro repetir o erro.
--   4. Backfill do activity_status dos chamados ABERTOS cuja última mensagem é
--      do cliente, preservando o updated_at real (para não maquiar o prazo).
--   5. Backup das duplicatas em tabela dedicada e DELETE mantendo a 1ª cópia.
--
-- Idempotente: pode ser reaplicado sem efeito colateral.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Leitura da whitelist imune a RLS
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.precheck_allowed_ops(p_table text)
RETURNS text[]
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT allowed_ops
    FROM public.rls_precheck_allowed_tables
   WHERE table_name = p_table;
$$;

COMMENT ON FUNCTION public.precheck_allowed_ops(text) IS
  'Lê a whitelist do precheck sem depender do papel do chamador. A tabela '
  'rls_precheck_allowed_tables segue restrita a team_member+ para leitura '
  'direta; só esta função a atravessa, e devolve apenas nome de tabela/ops. '
  'Existe porque can_perform é SECURITY INVOKER e a role client precisa '
  'conseguir prechecar as próprias linhas.';

GRANT EXECUTE ON FUNCTION public.precheck_allowed_ops(text) TO authenticated;

-- ------------------------------------------------------------
-- 2. can_perform — corpo de produção, só a leitura da whitelist muda
--    (segue SECURITY INVOKER: o precheck precisa rodar com o privilégio
--     de quem chama, senão não verifica nada)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_perform(p_table text, p_op text, p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  v_allowed_ops    text[];
  v_rows           int;
  v_exists         boolean;
  v_policy_text    text;
  v_required_role  text;
  v_role           text;
  v_roles          text[];
  v_rank           int;
  v_best_rank      int := 999;
BEGIN
  -- ÚNICA alteração em relação ao corpo anterior:
  -- antes lia direto de public.rls_precheck_allowed_tables (bloqueado p/ client)
  v_allowed_ops := public.precheck_allowed_ops(p_table);

  IF v_allowed_ops IS NULL THEN
    RAISE EXCEPTION 'Table % is not allowed for precheck', p_table
      USING ERRCODE = '22023';
  END IF;

  IF NOT (p_op = ANY(v_allowed_ops)) THEN
    RAISE EXCEPTION 'Op % not allowed for table %', p_op, p_table
      USING ERRCODE = '22023';
  END IF;

  IF p_op NOT IN ('update','delete') THEN
    RAISE EXCEPTION 'Only update/delete are supported (got %)', p_op
      USING ERRCODE = '22023';
  END IF;

  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id = $1)', p_table)
    INTO v_exists USING p_id;

  BEGIN
    IF p_op = 'delete' THEN
      EXECUTE format('DELETE FROM public.%I WHERE id = $1', p_table) USING p_id;
    ELSE
      EXECUTE format('UPDATE public.%I SET id = id WHERE id = $1', p_table) USING p_id;
    END IF;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RAISE EXCEPTION 'PRECHECK_OK' USING DETAIL = v_rows::text;
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM = 'PRECHECK_OK' THEN
        DECLARE
          v_detail text;
        BEGIN
          GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
          v_rows := COALESCE(v_detail::int, 0);
        END;

        IF v_rows > 0 THEN
          RETURN jsonb_build_object(
            'allowed', true,
            'reason', null,
            'required_role', null,
            'message', null
          );
        END IF;

        IF NOT v_exists THEN
          RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'row_not_found',
            'required_role', null,
            'message', null
          );
        END IF;

        SELECT string_agg(coalesce(qual,'') || ' ' || coalesce(with_check,''), ' ')
          INTO v_policy_text
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = p_table
           AND cmd IN (UPPER(p_op), 'ALL');

        v_roles := ARRAY[]::text[];
        IF v_policy_text IS NOT NULL THEN
          FOR v_role IN
            SELECT (regexp_matches(v_policy_text,
              'has_role_or_higher\s*\(\s*auth\.uid\(\)\s*,\s*''([a-z_]+)''', 'g'))[1]
          LOOP
            v_roles := array_append(v_roles, v_role);
          END LOOP;
          FOR v_role IN
            SELECT (regexp_matches(v_policy_text,
              'has_role\s*\(\s*auth\.uid\(\)\s*,\s*''([a-z_]+)''', 'g'))[1]
          LOOP
            v_roles := array_append(v_roles, v_role);
          END LOOP;
        END IF;

        v_required_role := null;
        IF v_roles IS NOT NULL AND array_length(v_roles, 1) > 0 THEN
          FOREACH v_role IN ARRAY v_roles LOOP
            v_rank := CASE v_role
              WHEN 'team_member' THEN 1
              WHEN 'sublider'    THEN 2
              WHEN 'lider'       THEN 3
              WHEN 'admin'       THEN 4
              ELSE 999
            END;
            IF v_rank < v_best_rank THEN
              v_best_rank := v_rank;
              v_required_role := v_role;
            END IF;
          END LOOP;
        END IF;

        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'rls_blocked',
          'required_role', v_required_role,
          'message', null
        );
      ELSE
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'trigger_blocked',
          'required_role', null,
          'message', SQLERRM
        );
      END IF;
    WHEN insufficient_privilege THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'grant_missing',
        'required_role', null,
        'message', null
      );
  END;
END;
$function$;

-- ------------------------------------------------------------
-- 3. Defesa de banco contra reenvio idêntico
--    Janela de 5 min — as duplicatas observadas ficaram entre 3s e 44s.
--    ERRCODE 23505 (unique_violation) para o frontend distinguir
--    "já enviada" de "falhou ao enviar".
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.tg_ticket_messages_bloqueia_reenvio()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.ticket_messages m
     WHERE m.ticket_id = NEW.ticket_id
       AND m.user_id   = NEW.user_id
       AND m.is_admin  IS NOT DISTINCT FROM NEW.is_admin
       AND m.message   = NEW.message
       AND m.created_at > now() - interval '5 minutes'
  ) THEN
    RAISE EXCEPTION
      'Mensagem idêntica já registrada neste chamado nos últimos 5 minutos'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ticket_messages_bloqueia_reenvio ON public.ticket_messages;
CREATE TRIGGER trg_ticket_messages_bloqueia_reenvio
  BEFORE INSERT ON public.ticket_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_ticket_messages_bloqueia_reenvio();

-- ------------------------------------------------------------
-- 4. Backfill do activity_status
--    Só chamados NÃO concluídos: em resolvido/fechado o campo não alimenta
--    nada (useTicketNotifications filtra status, calcularPrazoResposta devolve
--    'concluido'), e mexer em histórico distorceria dashboard.
--    O updated_at é preservado no instante real da mensagem do cliente —
--    senão o prazo reiniciaria hoje e esconderia o atraso.
-- ------------------------------------------------------------
DO $$
DECLARE
  v_backfill int := 0;
  v_fechados int := 0;
  v_lista    text;
BEGIN
  ALTER TABLE public.tickets DISABLE TRIGGER update_tickets_updated_at;

  WITH ultima AS (
    SELECT DISTINCT ON (ticket_id) ticket_id, is_admin, created_at, id
      FROM public.ticket_messages
     ORDER BY ticket_id, created_at DESC, is_admin, id
  )
  UPDATE public.tickets t
     SET activity_status = 'aguardando_resposta',
         updated_at      = u.created_at
    FROM ultima u
   WHERE u.ticket_id = t.id
     AND NOT u.is_admin
     AND COALESCE(t.status, 'aberto') NOT IN ('resolvido', 'fechado')
     AND COALESCE(t.activity_status, '') <> 'aguardando_resposta';

  GET DIAGNOSTICS v_backfill = ROW_COUNT;

  ALTER TABLE public.tickets ENABLE TRIGGER update_tickets_updated_at;

  -- Concluídos com resposta de cliente sem tratativa: decisão de negócio
  -- (reabrir e responder), não de dado. Só reporta.
  WITH ultima AS (
    SELECT DISTINCT ON (ticket_id) ticket_id, is_admin, created_at, id
      FROM public.ticket_messages
     ORDER BY ticket_id, created_at DESC, is_admin, id
  )
  SELECT COUNT(*), string_agg(t.id::text || ' — ' || left(t.title, 60), E'\n       ')
    INTO v_fechados, v_lista
    FROM ultima u
    JOIN public.tickets t ON t.id = u.ticket_id
   WHERE NOT u.is_admin
     AND COALESCE(t.status, 'aberto') IN ('resolvido', 'fechado');

  RAISE NOTICE 'Backfill activity_status: % chamado(s) aberto(s) marcados como aguardando_resposta', v_backfill;
  IF COALESCE(v_fechados, 0) > 0 THEN
    RAISE NOTICE 'ATENCAO - % chamado(s) ja concluido(s) tem resposta de cliente sem tratativa. Nao foram alterados; avaliar reabertura: %',
      v_fechados, v_lista;
  END IF;
END $$;

-- ------------------------------------------------------------
-- 5. Backup e remoção das duplicatas
--    Critério: mesmo chamado, mesmo autor, mesmo is_admin, mensagem idêntica,
--    dentro de 5 min da primeira cópia. Mantém sempre a mais antiga.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bkp_20260807_ticket_messages_dup (
  id             uuid PRIMARY KEY,
  ticket_id      uuid        NOT NULL,
  user_id        uuid        NOT NULL,
  is_admin       boolean,
  message        text        NOT NULL,
  created_at     timestamptz,
  copia_numero   int         NOT NULL,
  segundos_apos  int         NOT NULL,
  backup_em      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.bkp_20260807_ticket_messages_dup IS
  'Backup das mensagens duplicadas removidas pela migração 20260807120000. '
  'Restauração: INSERT INTO ticket_messages (id, ticket_id, user_id, is_admin, '
  'message, created_at) SELECT id, ticket_id, user_id, is_admin, message, '
  'created_at FROM bkp_20260807_ticket_messages_dup (desligar o trigger '
  'trg_ticket_messages_bloqueia_reenvio antes). Pode ser descartada após '
  'validação em produção.';

ALTER TABLE public.bkp_20260807_ticket_messages_dup ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bkp_20260807_dup_select_admin
  ON public.bkp_20260807_ticket_messages_dup;
CREATE POLICY bkp_20260807_dup_select_admin
  ON public.bkp_20260807_ticket_messages_dup
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DO $$
DECLARE
  v_total    int := 0;
  v_removido int := 0;
BEGIN
  DROP TABLE IF EXISTS tmp_dup_remover;
  CREATE TEMP TABLE tmp_dup_remover AS
  WITH ranked AS (
    SELECT m.id, m.ticket_id, m.user_id, m.is_admin, m.message, m.created_at,
           row_number() OVER (PARTITION BY m.ticket_id, m.user_id, m.is_admin, md5(m.message)
                                  ORDER BY m.created_at, m.id) AS copia_numero,
           MIN(m.created_at) OVER (PARTITION BY m.ticket_id, m.user_id, m.is_admin, md5(m.message))
             AS primeira_copia
      FROM public.ticket_messages m
  )
  SELECT id, ticket_id, user_id, is_admin, message, created_at, copia_numero,
         EXTRACT(EPOCH FROM created_at - primeira_copia)::int AS segundos_apos
    FROM ranked
   WHERE copia_numero > 1
     AND created_at <= primeira_copia + interval '5 minutes';

  SELECT COUNT(*) INTO v_total FROM tmp_dup_remover;

  INSERT INTO public.bkp_20260807_ticket_messages_dup
    (id, ticket_id, user_id, is_admin, message, created_at, copia_numero, segundos_apos)
  SELECT id, ticket_id, user_id, is_admin, message, created_at, copia_numero, segundos_apos
    FROM tmp_dup_remover
  ON CONFLICT (id) DO NOTHING;

  -- Invariante: nada é removido sem estar no backup.
  IF EXISTS (
    SELECT 1 FROM tmp_dup_remover t
     WHERE NOT EXISTS (SELECT 1
                         FROM public.bkp_20260807_ticket_messages_dup b
                        WHERE b.id = t.id)
  ) THEN
    RAISE EXCEPTION 'Abortado: backup incompleto, nenhuma linha foi removida';
  END IF;

  DELETE FROM public.ticket_messages m
   WHERE m.id IN (SELECT id FROM tmp_dup_remover);

  GET DIAGNOSTICS v_removido = ROW_COUNT;

  DROP TABLE tmp_dup_remover;

  IF v_removido <> v_total THEN
    RAISE EXCEPTION 'Abortado: previstas % remocoes, efetivadas %', v_total, v_removido;
  END IF;

  RAISE NOTICE 'Duplicatas: % linha(s) em backup e removidas de ticket_messages', v_removido;
END $$;
