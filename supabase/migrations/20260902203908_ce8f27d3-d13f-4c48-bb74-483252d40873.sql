-- 20260901133044_ges01a_gestor_ve_de_quem_e_a_tarefa.sql
DROP FUNCTION IF EXISTS public.tarefas_a_alertar(date);

CREATE OR REPLACE FUNCTION public.tarefas_a_alertar(_hoje date DEFAULT NULL)
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
           -- Quem esta com a bola: em revisao e o revisor, senao o responsavel.
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
     WHERE t.status NOT IN ('done'::public.fiscal_task_status,
                            'backlog'::public.fiscal_task_status)
       AND t.due_date IS NOT NULL
       AND t.due_date IN (h.d + 3, h.d, h.d - 1)
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
         d.id,
         d.title,
         d.status,
         d.due_date,
         d.marco,
         CASE WHEN d.marco = 'atrasada'
              THEN 'tarefa_atrasada'::public.notificacao_tipo
              ELSE 'tarefa_prazo_proximo'::public.notificacao_tipo END,
         d.destinatario_id,
         d.papel,
         d.dono_nome
    FROM destinatarios d
   WHERE d.destinatario_id IS NOT NULL
   ORDER BY d.id, d.destinatario_id, (d.papel = 'gestor');
$function$;

COMMENT ON FUNCTION public.tarefas_a_alertar(date) IS
  'GES-01A: quem deve receber aviso de prazo de tarefa HOJE, sem escrever nada. '
  'Regua de tres marcos por igualdade de data (D-3, D-0, D+1), o que mantem o '
  'passivo antigo em silencio. Devolve tambem `dono_nome`, usado no texto do aviso '
  'que vai ao gestor para ele saber de quem e a tarefa. Dia calculado em '
  'America/Cuiaba. Passe _hoje para simular outra data em teste.';

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
  v_de_quem  text;
  v_criados  integer := 0;
  v_negados  integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas lider ou acima pode disparar a varredura de prazo'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN SELECT * FROM public.tarefas_a_alertar(_hoje) LOOP
    v_chave := format('tarefa_prazo:%s:%s:%s:%s',
                      r.task_id, r.marco, r.due_date, r.destinatario_id);

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

REVOKE ALL ON FUNCTION public.alertar_tarefas_por_prazo(date) FROM anon;

-- GATE: a leitura devolve o nome do dono, e a escrita so o usa para o gestor.
DO $$
DECLARE
  v_src text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.parameters
     WHERE specific_schema = 'public'
       AND parameter_name = 'dono_nome'
       AND specific_name LIKE 'tarefas_a_alertar%'
  ) THEN
    RAISE EXCEPTION 'GATE: tarefas_a_alertar nao devolve dono_nome';
  END IF;

  SELECT p.prosrc INTO v_src FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'alertar_tarefas_por_prazo';

  IF v_src NOT LIKE '%Responsavel: %' THEN
    RAISE EXCEPTION 'GATE: o texto do gestor nao nomeia o responsavel';
  END IF;
  IF v_src NOT LIKE '%r.papel = ''gestor''%' THEN
    RAISE EXCEPTION 'GATE: o nome do responsavel nao esta restrito ao gestor';
  END IF;
  IF v_src NOT LIKE '%r.destinatario_id);%' THEN
    RAISE EXCEPTION 'GATE: a chave de idempotencia perdeu o destinatario';
  END IF;
END $$;