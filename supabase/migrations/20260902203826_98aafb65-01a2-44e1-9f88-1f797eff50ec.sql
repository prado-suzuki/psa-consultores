-- 20260901120951_ges01a_chave_por_destinatario.sql
-- GES-01A, correcao: a chave de idempotencia precisa incluir o destinatario.
--
-- DEFEITO, achado antes do primeiro disparo. A versao de
-- 20260831202316_ges01a_varredura_de_prazo_de_tarefa.sql montava a chave assim:
--
--   tarefa_prazo:<task_id>:<marco>:<due_date>
--
-- e `notificacao_envio.chave_idempotencia` tem indice UNICO GLOBAL
-- (`notificacao_envio_idem_uidx`), nao por pessoa. Como cada tarefa avisa DUAS
-- pessoas (o dono da bola e o gestor), as duas linhas geravam a MESMA chave: a
-- primeira reserva passava e a segunda era negada. Metade dos destinatarios
-- nunca receberia, e qual metade dependia da ordenacao do laco.
--
-- O QUE DISFARCAVA: a reserva negada e contada em `reservas_negadas`, o mesmo
-- contador da deduplicacao legitima. O primeiro disparo teria devolvido algo como
-- "31 criados, 28 negados" e passaria por funcionamento correto. So apareceu
-- porque a coordenacao pediu um terceiro destinatario e fui reler o laco.
--
-- SEM SUJEIRA PARA LIMPAR: a funcao de escrita nunca chegou a rodar, entao nao ha
-- reserva gravada com a chave errada. Se tivesse rodado, seria preciso apagar as
-- linhas de `notificacao_envio` com o padrao antigo antes de reaplicar, senao as
-- chaves velhas continuariam bloqueando o destinatario que faltou.
--
-- MIGRATION NOVA E NAO EDICAO DA ANTERIOR: a 20260831202316 ja esta registrada no
-- ledger do sandbox. Editar o arquivo faria repositorio e registro contarem
-- historias diferentes, que foi a divida que custou meia tarde em 17/08.
--
-- Muda UMA linha da funcao de escrita. A funcao de leitura
-- (`tarefas_a_alertar`), o cron e os tipos de aviso ficam como estao.
--
-- Reversao: reaplicar o corpo da 20260831202316.

CREATE OR REPLACE FUNCTION public.alertar_tarefas_por_prazo(_hoje date DEFAULT NULL)
RETURNS TABLE (avisos_criados integer, reservas_negadas integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  r          record;
  v_envio_id uuid;
  v_chave    text;
  v_titulo   text;
  v_corpo    text;
  v_criados  integer := 0;
  v_negados  integer := 0;
BEGIN
  -- Tranca: o cron roda sem JWT (auth.uid() nulo). Qualquer chamada COM usuario
  -- exige lider ou acima, para que um autenticado qualquer nao dispare uma
  -- enxurrada de avisos pela API.
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas lider ou acima pode disparar a varredura de prazo'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN SELECT * FROM public.tarefas_a_alertar(_hoje) LOOP
    -- A CHAVE TEM QUATRO PARTES, e cada uma esta aqui por um motivo:
    --   task_id         a tarefa
    --   marco           D-3, D-0 e D+1 sao ocorrencias distintas
    --   due_date        mudou o prazo, e outra ocorrencia, e o aviso antigo nao
    --                   vira alerta falso (criterio de aceite 3)
    --   destinatario_id o indice de idempotencia e GLOBAL, nao por pessoa: sem
    --                   esta parte, o segundo destinatario da mesma tarefa tem a
    --                   reserva negada e nunca recebe
    v_chave := format('tarefa_prazo:%s:%s:%s:%s',
                      r.task_id, r.marco, r.due_date, r.destinatario_id);

    -- Reserva primeiro. NULL = a chave ja existe, ou seja este marco ja foi
    -- avisado a ESTA pessoa. So depois da reserva e que o sino e tocado.
    v_envio_id := public.reservar_envio(
      v_chave, 'sino'::public.notificacao_canal, r.tipo,
      'org_task', r.task_id, r.destinatario_id, NULL, NULL, r.papel,
      jsonb_build_object('marco', r.marco, 'due_date', r.due_date, 'papel', r.papel)
    );

    IF v_envio_id IS NULL THEN
      v_negados := v_negados + 1;
      CONTINUE;
    END IF;

    v_titulo := CASE
      WHEN r.marco = 'prazo_3_dias' THEN 'Vence em 3 dias: ' || r.task_title
      WHEN r.marco = 'vence_hoje'   THEN 'Vence hoje: ' || r.task_title
      ELSE 'Tarefa atrasada: ' || r.task_title
    END;

    v_corpo := CASE
      WHEN r.task_status = 'waiting_client'::public.fiscal_task_status
        THEN 'Aguardando o cliente. Prazo em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.'
      WHEN r.papel = 'revisor'
        THEN 'Aguardando sua revisao. Prazo em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.'
      WHEN r.marco = 'atrasada'
        THEN 'O prazo era ' || to_char(r.due_date, 'DD/MM/YYYY') || '.'
      ELSE 'Prazo em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.'
    END;

    -- href nulo: o destino do clique e do front (destinoDoAviso), que resolve
    -- org_task para a area em que a pessoa esta.
    PERFORM public.criar_notificacao(
      r.destinatario_id, r.tipo, v_titulo,
      'org_task', r.task_id, v_corpo, NULL, v_chave,
      jsonb_build_object('marco', r.marco, 'papel', r.papel)
    );

    PERFORM public.confirmar_envio(
      v_envio_id, 'enviado'::public.notificacao_envio_status, NULL, NULL, NULL
    );

    v_criados := v_criados + 1;
  END LOOP;

  RETURN QUERY SELECT v_criados, v_negados;
END;
$function$;

COMMENT ON FUNCTION public.alertar_tarefas_por_prazo(date) IS
  'GES-01A: grava no sino os avisos de prazo de tarefa do dia. Idempotente por '
  'notificacao_envio.chave_idempotencia, no formato '
  'tarefa_prazo:<task_id>:<marco>:<due_date>:<destinatario_id>. O destinatario faz '
  'parte da chave porque o indice de idempotencia e global, nao por pessoa. NAO usa '
  'a chave de agrupamento do sino, que so deduplica enquanto o aviso esta nao lido. '
  'Devolve quantos avisos criou e quantas reservas ja existiam.';

REVOKE ALL ON FUNCTION public.alertar_tarefas_por_prazo(date) FROM anon;

-- GATE: a chave tem de citar o destinatario, e a escrita tem de continuar
-- passando pela reserva.
DO $$
DECLARE
  v_src text;
BEGIN
  SELECT p.prosrc INTO v_src FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'alertar_tarefas_por_prazo';

  IF v_src IS NULL THEN
    RAISE EXCEPTION 'GATE: alertar_tarefas_por_prazo nao existe';
  END IF;
  IF v_src NOT LIKE '%r.destinatario_id);%' THEN
    RAISE EXCEPTION 'GATE: a chave de idempotencia nao inclui o destinatario';
  END IF;
  IF v_src NOT LIKE '%reservar_envio%' THEN
    RAISE EXCEPTION 'GATE: a escrita nao passa por reservar_envio, dedup furada';
  END IF;
END $$;