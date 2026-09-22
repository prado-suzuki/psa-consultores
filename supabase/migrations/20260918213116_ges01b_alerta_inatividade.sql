-- 20260918213116_ges01b_alerta_inatividade.sql
-- GES-01B, parte 2 de 2: quem alertar (leitura), gravar o aviso (escrita) e o
-- cron. Molde completo da GES-01A (20260831202316, redacao 20260902210245).
--
-- O QUE E. A tarefa de cliente (org_tasks) aberta que nao recebe NENHUMA
-- alteracao ha 15 dias entra em inativa, e dono e gestor da equipe recebem
-- aviso no sino. Mesmas funcoes de infra (reservar_envio, criar_notificacao,
-- confirmar_envio), mesmo filtro de ambiente, mesmo fuso America/Cuiaba, mesma
-- elegibilidade de status do aviso de prazo. O valor 'tarefa_inativa' do enum
-- nasceu na parte 1, que commita antes deste arquivo.
--
-- A REGRA, decidida com o usuario em 18/09/2026:
--   Limiar    -> 15 dias desde a ULTIMA ALTERACAO, seja qual for.
--   Recebem   -> dono (o revisor, enquanto a tarefa esta em revisao) e o
--                gestor da equipe, como no atraso.
--   Nao entra -> tarefa concluida, tarefa em backlog.
--
-- POR QUE updated_at E A FONTE, e nao um historico proprio. A regra do usuario
-- e "qualquer alteracao tira da inativa", e o trigger
-- update_org_tasks_updated_at (BEFORE UPDATE, o mesmo trigger que as demais
-- rotinas de tarefa leem) carimba TODA edicao, de quem for. Fonte selecionada
-- a mao (comentario, mudanca de status, edicao de prazo) seria mais estreita
-- do que a regra decidida. O preco, assumido: alteracao cosmetica ou de
-- sistema tambem reseta. E o que "seja qual for" pede.
--
-- A CHAVE DE DEDUPLICACAO inclui o updated_at cravado no horario de Cuiaba:
--   tarefa_inativa:<task_id>:<ultima_alteracao>:<destinatario_id>
-- Enquanto a tarefa nao muda, a chave e a mesma e `reservar_envio` recusa
-- (criterio 3 da GES-01B: a ocorrencia nao se repete). A tarefa mexeu, muda a
-- chave; se voltar a parar por 15 dias, nasce ocorrencia nova (criterio 4: a
-- reabertura). O historico antigo fica de pe.
--
-- UM MARCO SO. O prazo tem tres porque a data final e o proprio calendario.
-- Inatividade nao tem marcos naturais: a tarefa parou ha 15 dias e esta parada
-- a 40. Um aviso na ultrapassagem do limiar, e calado enquanto nada muda, e a
-- leitura gerencial; repetir semanalmente seria o aviso diario disfarcado, que
-- o criterio de aceite da GES-01B proibe.
--
-- CORPO. Dono: "Ultima alteracao em DD/MM/AAAA, ha N dias." Gestor abre com
-- "Responsavel: {nome}. ", o mesmo prefixo do atraso, para o sino dele
-- escanear igual. Acentos no corpo, como a redacao de 02/09 fixou.
--
-- CUIDADO DE LARGADA. updated_at de tarefa antiga e a criacao. Toda tarefa
-- aberta de cliente que ninguem tocou nos ultimos 15 dias dispara NO PRIMEIRO
-- dia no ar, de uma vez. E o passivo da inatividade, analogo ao de atraso da
-- GES-01A, mas aqui SEM marco que o dispense: a regra decidida conta desde a
-- ultima alteracao, sem data de largada. Rodar `tarefas_inativas(NULL, 15,
-- 'prod')` a mao ANTES de ligar o aviso em producao mostra o tamanho da fila;
-- se ela desagradar, a decisao e do dono do produto, e e de texto nesta
-- migration, nao de regra nova.
--
-- CRON. `alertar-tarefas-inativas-diario`, 0 11 * * * (07h de Cuiaba, junto do
-- de prazo), ativo no mesmo ato da aplicacao, com o ambiente carimbado por
-- cluster via pg_control_system(), igual a 20260901144842. Falha fica em
-- cron.job_run_details e ninguem e avisado: limite conhecido, herdado.
--
-- NADA DE TABELA. Sem coluna, sem FK, sem RLS. O controle de repeticao mora em
-- notificacao_envio, que ja existe.
--
-- Reversao:
--   SELECT cron.unschedule('alertar-tarefas-inativas-diario');
--   DROP FUNCTION public.alertar_tarefas_inativas(date, int, text);
--   DROP FUNCTION public.tarefas_inativas(date, int, text);

CREATE OR REPLACE FUNCTION public.tarefas_inativas(
  _hoje     date DEFAULT NULL,
  _limiar   int  DEFAULT 15,
  _ambiente text DEFAULT 'prod'
)
RETURNS TABLE (
  task_id          uuid,
  task_title       text,
  task_status      public.fiscal_task_status,
  ultima_alteracao timestamptz,
  dias_parada      integer,
  tipo             public.notificacao_tipo,
  destinatario_id  uuid,
  papel            text,
  dono_nome        text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH hoje AS (
    SELECT COALESCE(_hoje, (now() AT TIME ZONE 'America/Cuiaba')::date) AS d
  ),
  elegivel AS (
    SELECT t.id, t.title, t.status, t.assigned_to, t.reviewer_id,
           t.updated_at,
           (h.d - (t.updated_at AT TIME ZONE 'America/Cuiaba')::date) AS dias_parada,
           eq.gestor_id,
           CASE WHEN t.status = 'review'::public.fiscal_task_status
                     AND t.reviewer_id IS NOT NULL
                THEN t.reviewer_id ELSE t.assigned_to END AS dono_id
      FROM public.org_tasks t
      CROSS JOIN hoje h
      JOIN public.org_projects pr ON pr.id = t.project_id
      LEFT JOIN public.estrutura_equipes eq ON eq.id = pr.equipe_id
      LEFT JOIN public.cliente ct ON ct.id = t.client_id
      LEFT JOIN public.cliente cp ON cp.id = pr.external_client_id
     WHERE t.status NOT IN ('done'::public.fiscal_task_status,
                            'backlog'::public.fiscal_task_status)
       AND (h.d - (t.updated_at AT TIME ZONE 'America/Cuiaba')::date) >= _limiar
       AND (ct.ambiente IS NULL OR ct.ambiente = _ambiente)
       AND (cp.ambiente IS NULL OR cp.ambiente = _ambiente)
  ),
  com_nome AS (
    SELECT e.*,
           NULLIF(btrim(COALESCE(dp.first_name, '') || ' ' || COALESCE(dp.last_name, '')), '')
             AS nome_montado,
           dp.email AS email_do_dono
      FROM elegivel e
      LEFT JOIN public.profiles dp ON dp.id = e.dono_id
  ),
  destinatarios AS (
    SELECT c.id, c.title, c.status, c.updated_at, c.dias_parada,
           COALESCE(c.nome_montado, c.email_do_dono) AS dono_nome,
           x.destinatario_id, x.papel
      FROM com_nome c
      CROSS JOIN LATERAL (
        VALUES
          (c.dono_id,
           CASE WHEN c.status = 'review'::public.fiscal_task_status
                     AND c.reviewer_id IS NOT NULL
                THEN 'revisor' ELSE 'responsavel' END),
          (c.gestor_id, 'gestor')
      ) AS x(destinatario_id, papel)
  )
  SELECT DISTINCT ON (d.id, d.destinatario_id)
         d.id, d.title, d.status, d.updated_at, d.dias_parada,
         'tarefa_inativa'::public.notificacao_tipo,
         d.destinatario_id, d.papel, d.dono_nome
    FROM destinatarios d
   WHERE d.destinatario_id IS NOT NULL
   ORDER BY d.id, d.destinatario_id, (d.papel = 'gestor');
$function$;

COMMENT ON FUNCTION public.tarefas_inativas(date, int, text) IS
  'GES-01B: quem deve receber aviso de tarefa inativa HOJE, sem escrever nada. '
  'Inativa e tarefa de cliente aberta sem NENHUMA alteracao a _limiar dias '
  '(15 por decisao de 18/09/2026); a fonte e org_tasks.updated_at, carimbado '
  'pelo trigger em toda edicao. Dono e revisor, enquanto em revisao, recebem '
  'junto com o gestor da equipe. Recorta por ambiente com a MESMA regra do '
  'front (src/lib/ambienteScope.ts). Dia em America/Cuiaba. Passe _hoje e '
  '_ambiente para simular, e _limiar para comparar regras.';

CREATE OR REPLACE FUNCTION public.alertar_tarefas_inativas(
  _hoje     date DEFAULT NULL,
  _limiar   int  DEFAULT 15,
  _ambiente text DEFAULT 'prod'
)
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
  v_de_quem  text;
  v_dias     text;
  v_criados  integer := 0;
  v_negados  integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas lider ou acima pode disparar a varredura de inatividade'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN SELECT * FROM public.tarefas_inativas(_hoje, _limiar, _ambiente) LOOP
    v_chave := format('tarefa_inativa:%s:%s:%s',
                      r.task_id,
                      to_char(r.ultima_alteracao AT TIME ZONE 'America/Cuiaba',
                              'YYYY-MM-DD"T"HH24:MI:SS'),
                      r.destinatario_id);

    v_envio_id := public.reservar_envio(
      v_chave, 'sino'::public.notificacao_canal, r.tipo,
      'org_task', r.task_id, r.destinatario_id, NULL, NULL, r.papel,
      jsonb_build_object('limiar', _limiar, 'dias_parada', r.dias_parada,
                         'papel', r.papel, 'ambiente', _ambiente)
    );

    IF v_envio_id IS NULL THEN
      v_negados := v_negados + 1;
      CONTINUE;
    END IF;

    v_titulo := 'Tarefa inativa: ' || r.task_title;

    v_dias := 'Última alteração em '
              || to_char(r.ultima_alteracao, 'DD/MM/YYYY')
              || ', há ' || r.dias_parada || ' dias.';

    v_de_quem := CASE
      WHEN r.papel = 'gestor' AND r.dono_nome IS NOT NULL
        THEN 'Responsável: ' || r.dono_nome || '. '
      ELSE ''
    END;

    v_corpo := v_de_quem || v_dias;

    PERFORM public.criar_notificacao(
      r.destinatario_id, r.tipo, v_titulo,
      'org_task', r.task_id, v_corpo, NULL, v_chave,
      jsonb_build_object('limiar', _limiar, 'papel', r.papel, 'ambiente', _ambiente)
    );

    PERFORM public.confirmar_envio(
      v_envio_id, 'enviado'::public.notificacao_envio_status, NULL, NULL, NULL
    );

    v_criados := v_criados + 1;
  END LOOP;

  RETURN QUERY SELECT v_criados, v_negados;
END;
$function$;

COMMENT ON FUNCTION public.alertar_tarefas_inativas(date, int, text) IS
  'GES-01B: escreve os avisos de tarefa inativa do dia. Corpo e "Ultima '
  'alteracao em DD/MM/AAAA, ha N dias", com o prefixo "Responsavel:" no aviso '
  'do gestor. A deduplicacao mora em notificacao_envio, na chave que inclui a '
  'ultima alteracao: a ocorrencia nao se repete enquanto nada muda, e muda, '
  'pode nascer de novo. Regra fechada em 18/09/2026.';

REVOKE ALL ON FUNCTION public.tarefas_inativas(date, int, text) FROM anon;
REVOKE ALL ON FUNCTION public.alertar_tarefas_inativas(date, int, text) FROM anon;

DO $$
DECLARE
  v_cluster text;
  v_ambiente text;
  v_jobid bigint;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RAISE NOTICE 'pg_cron ausente: nada a ativar.';
    RETURN;
  END IF;

  SELECT system_identifier::text INTO v_cluster FROM pg_control_system();

  v_ambiente := CASE v_cluster
    WHEN '7575202818581710058' THEN 'prod'
    WHEN '7666007964130682852' THEN 'dev'
    ELSE NULL
  END;

  IF v_ambiente IS NULL THEN
    RAISE NOTICE 'Cluster % nao reconhecido: job NAO ativado, de proposito.', v_cluster;
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alertar-tarefas-inativas-diario') THEN
    PERFORM cron.unschedule('alertar-tarefas-inativas-diario');
  END IF;

  PERFORM cron.schedule(
    'alertar-tarefas-inativas-diario',
    '0 11 * * *',
    format('SELECT public.alertar_tarefas_inativas(NULL, 15, %L);', v_ambiente)
  );

  SELECT jobid INTO v_jobid FROM cron.job WHERE jobname = 'alertar-tarefas-inativas-diario';

  PERFORM cron.alter_job(v_jobid, active := true);

  RAISE NOTICE 'Job ativado no cluster % varrendo ambiente %, limiar 15 dias.', v_cluster, v_ambiente;
END $$;

DO $$
DECLARE
  v_cluster  text;
  v_esperado text;
  v_ativo    boolean;
  v_comando  text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  SELECT system_identifier::text INTO v_cluster FROM pg_control_system();
  v_esperado := CASE v_cluster
    WHEN '7575202818581710058' THEN 'prod'
    WHEN '7666007964130682852' THEN 'dev'
    ELSE NULL
  END;

  SELECT active, command INTO v_ativo, v_comando
    FROM cron.job WHERE jobname = 'alertar-tarefas-inativas-diario';

  IF v_esperado IS NULL THEN
    IF COALESCE(v_ativo, false) THEN
      RAISE EXCEPTION 'GATE: cluster desconhecido % e o job ficou ATIVO', v_cluster;
    END IF;
    RETURN;
  END IF;

  IF v_ativo IS NULL THEN
    RAISE EXCEPTION 'GATE: o job alertar-tarefas-inativas-diario nao existe';
  END IF;
  IF NOT v_ativo THEN
    RAISE EXCEPTION 'GATE: o job continua desativado no cluster %', v_cluster;
  END IF;
  IF v_comando NOT LIKE '%' || v_esperado || '%' THEN
    RAISE EXCEPTION 'GATE: o comando nao varre o ambiente % deste banco: %',
      v_esperado, v_comando;
  END IF;
END $$;
