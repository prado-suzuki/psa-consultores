-- 20260901135620_ges01a_varredura_respeita_ambiente.sql
-- GES-01A: a varredura de prazo passa a respeitar `ambiente`.
--
-- DEFEITO, achado na validacao de 01/09/2026. O Felipe recebeu 14 avisos e
-- NENHUM abria: clicava, o aviso sumia do sino e a tarefa nao aparecia. Nao era
-- RLS (com o JWT dele, os 14 sao visiveis) nem o escopo de cluster (o deep-link
-- ja o contorna).
--
-- A causa e que `useOrgTasks` filtra por ambiente DENTRO do hook:
--   allTasks = allTasks.filter(task => isTarefaDoAmbiente(task, ambientePorCliente));
-- e o deep-link do PainelTarefas nao contorna esse filtro, so o de tela e o de
-- cluster. A tarefa nunca chega ao array, `tasks.find` devolve undefined e o
-- modal nao abre. O aviso, porem, ja foi marcado como lido no caminho.
--
-- E as minhas duas funcoes sao SECURITY DEFINER varrendo `org_tasks` inteira,
-- sem olhar ambiente: avisavam sobre tarefa que o site em dev nunca mostraria.
-- Nao e caso raro. Dos 63 avisos do primeiro disparo, 43 eram de cliente `prod`
-- e 20 de `dev`; os 14 do Felipe eram 100% prod.
--
-- A REGRA E A MESMA DO FRONT, copiada de src/lib/ambienteScope.ts para nao
-- divergir:
--   - a tarefa precisa estar de acordo pelos DOIS vinculos que carregam cliente,
--     o proprio (`client_id`) e o do projeto onde mora (`external_client_id`);
--   - registro SEM cliente nao tem ambiente e nunca e escondido;
--   - cliente ausente ou sem ambiente tambem passa: sumir com trabalho real por
--     falta de dado e pior que mostrar demais. So sai quem tem cliente de OUTRO
--     ambiente.
--
-- O AMBIENTE E PARAMETRO, com default 'prod'. Sao dois eixos independentes: o
-- BANCO (sandbox ou producao) sai da URL do Supabase, e o AMBIENTE (dev ou prod)
-- e coluna de dado, decidida no front pelo hostname. O sandbox e copia completa
-- e tem clientes dos dois. Por isso o cron precisa dizer qual ambiente esta
-- varrendo, e nao adivinhar pelo banco em que roda.
--
-- Default 'prod' porque e o unico que faz sentido para o job de verdade. Em
-- teste, passe 'dev' explicitamente.
--
-- DROP e nao CREATE OR REPLACE na leitura: ela ganha parametro, o que muda a
-- assinatura.
--
-- Reversao: reaplicar 20260901133044, e reagendar o cron sem o argumento.

DROP FUNCTION IF EXISTS public.tarefas_a_alertar(date);

CREATE OR REPLACE FUNCTION public.tarefas_a_alertar(
  _hoje     date DEFAULT NULL,
  _ambiente text DEFAULT 'prod'
)
RETURNS TABLE (
  task_id          uuid,
  task_title       text,
  task_status      public.fiscal_task_status,
  due_date         date,
  marco            text,
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
    SELECT t.id, t.title, t.status, t.due_date, t.assigned_to, t.reviewer_id,
           eq.gestor_id,
           CASE WHEN t.status = 'review'::public.fiscal_task_status
                     AND t.reviewer_id IS NOT NULL
                THEN t.reviewer_id ELSE t.assigned_to END AS dono_id,
           CASE
             WHEN t.due_date = h.d + 3 THEN 'prazo_3_dias'
             WHEN t.due_date = h.d     THEN 'vence_hoje'
             WHEN t.due_date = h.d - 1 THEN 'atrasada'
           END AS marco
      FROM public.org_tasks t
      CROSS JOIN hoje h
      JOIN public.org_projects pr ON pr.id = t.project_id
      LEFT JOIN public.estrutura_equipes eq ON eq.id = pr.equipe_id
      -- Os dois vinculos de cliente, cada um opcional. Ausente = sem ambiente,
      -- e sem ambiente nao esconde.
      LEFT JOIN public.cliente ct ON ct.id = t.client_id
      LEFT JOIN public.cliente cp ON cp.id = pr.external_client_id
     WHERE t.status NOT IN ('done'::public.fiscal_task_status,
                            'backlog'::public.fiscal_task_status)
       AND t.due_date IS NOT NULL
       AND t.due_date IN (h.d + 3, h.d, h.d - 1)
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
    SELECT c.id, c.title, c.status, c.due_date, c.marco,
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
     WHERE c.marco IS NOT NULL
  )
  SELECT DISTINCT ON (d.id, d.destinatario_id)
         d.id, d.title, d.status, d.due_date, d.marco,
         CASE WHEN d.marco = 'atrasada'
              THEN 'tarefa_atrasada'::public.notificacao_tipo
              ELSE 'tarefa_prazo_proximo'::public.notificacao_tipo END,
         d.destinatario_id, d.papel, d.dono_nome
    FROM destinatarios d
   WHERE d.destinatario_id IS NOT NULL
   ORDER BY d.id, d.destinatario_id, (d.papel = 'gestor');
$function$;

COMMENT ON FUNCTION public.tarefas_a_alertar(date, text) IS
  'GES-01A: quem deve receber aviso de prazo de tarefa HOJE, sem escrever nada. '
  'Regua de tres marcos por igualdade de data (D-3, D-0, D+1). Recorta por '
  'ambiente com a MESMA regra do front (src/lib/ambienteScope.ts): os dois '
  'vinculos de cliente tem de bater, e quem nao tem cliente nunca e escondido. '
  'Dia em America/Cuiaba. Passe _hoje e _ambiente para simular.';

CREATE OR REPLACE FUNCTION public.alertar_tarefas_por_prazo(
  _hoje     date DEFAULT NULL,
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
  v_criados  integer := 0;
  v_negados  integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas lider ou acima pode disparar a varredura de prazo'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN SELECT * FROM public.tarefas_a_alertar(_hoje, _ambiente) LOOP
    -- O ambiente NAO entra na chave: a mesma tarefa nunca pertence aos dois, e
    -- incluir criaria duas ocorrencias caso o cliente mudasse de ambiente.
    v_chave := format('tarefa_prazo:%s:%s:%s:%s',
                      r.task_id, r.marco, r.due_date, r.destinatario_id);

    v_envio_id := public.reservar_envio(
      v_chave, 'sino'::public.notificacao_canal, r.tipo,
      'org_task', r.task_id, r.destinatario_id, NULL, NULL, r.papel,
      jsonb_build_object('marco', r.marco, 'due_date', r.due_date,
                         'papel', r.papel, 'ambiente', _ambiente)
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

    v_de_quem := CASE
      WHEN r.papel = 'gestor' AND r.dono_nome IS NOT NULL
        THEN 'Responsavel: ' || r.dono_nome || '. '
      ELSE ''
    END;

    v_corpo := v_de_quem || CASE
      WHEN r.task_status = 'waiting_client'::public.fiscal_task_status
        THEN 'Aguardando o cliente. Prazo em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.'
      WHEN r.papel = 'revisor'
        THEN 'Aguardando sua revisao. Prazo em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.'
      WHEN r.marco = 'atrasada'
        THEN 'O prazo era ' || to_char(r.due_date, 'DD/MM/YYYY') || '.'
      ELSE 'Prazo em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.'
    END;

    PERFORM public.criar_notificacao(
      r.destinatario_id, r.tipo, v_titulo,
      'org_task', r.task_id, v_corpo, NULL, v_chave,
      jsonb_build_object('marco', r.marco, 'papel', r.papel, 'ambiente', _ambiente)
    );

    PERFORM public.confirmar_envio(
      v_envio_id, 'enviado'::public.notificacao_envio_status, NULL, NULL, NULL
    );

    v_criados := v_criados + 1;
  END LOOP;

  RETURN QUERY SELECT v_criados, v_negados;
END;
$function$;

REVOKE ALL ON FUNCTION public.alertar_tarefas_por_prazo(date, text) FROM anon;

-- A assinatura antiga (so _hoje) sai: deixa-la viva permitiria chamar a varredura
-- sem ambiente e reintroduzir o defeito em silencio.
DROP FUNCTION IF EXISTS public.alertar_tarefas_por_prazo(date);

-- O cron passa a dizer o ambiente. Continua DESATIVADO.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alertar-tarefas-prazo-diario') THEN
    PERFORM cron.unschedule('alertar-tarefas-prazo-diario');
  END IF;

  PERFORM cron.schedule(
    'alertar-tarefas-prazo-diario',
    '0 11 * * *',
    $cron$SELECT public.alertar_tarefas_por_prazo(NULL, 'prod');$cron$
  );

  PERFORM cron.alter_job(
    (SELECT jobid FROM cron.job WHERE jobname = 'alertar-tarefas-prazo-diario'),
    active := false
  );
END $$;

-- GATE: a leitura recorta por ambiente, a assinatura sem ambiente sumiu, e o job
-- continua desligado.
DO $$
DECLARE
  v_src   text;
  v_ativo boolean;
BEGIN
  SELECT p.prosrc INTO v_src FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'tarefas_a_alertar';
  IF v_src IS NULL THEN
    RAISE EXCEPTION 'GATE: tarefas_a_alertar nao existe';
  END IF;
  IF v_src NOT LIKE '%ct.ambiente%' OR v_src NOT LIKE '%cp.ambiente%' THEN
    RAISE EXCEPTION 'GATE: a leitura nao recorta pelos dois vinculos de cliente';
  END IF;

  IF to_regprocedure('public.alertar_tarefas_por_prazo(date)') IS NOT NULL THEN
    RAISE EXCEPTION 'GATE: a assinatura sem ambiente continua viva';
  END IF;
  IF to_regprocedure('public.alertar_tarefas_por_prazo(date,text)') IS NULL THEN
    RAISE EXCEPTION 'GATE: a assinatura com ambiente nao existe';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    SELECT active INTO v_ativo FROM cron.job WHERE jobname = 'alertar-tarefas-prazo-diario';
    IF v_ativo IS NULL THEN
      RAISE EXCEPTION 'GATE: o job sumiu';
    END IF;
    IF v_ativo THEN
      RAISE EXCEPTION 'GATE: o job ficou ATIVO';
    END IF;
  END IF;
END $$;
