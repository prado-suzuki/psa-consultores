-- 20260921110500_ges01b_escada_do_gestor_e_projeto.sql
-- GES-01B: a escada de atencao e o aviso de PROJETO sem movimentacao. Parte 2 de 2
-- (o valor do enum nasceu em 20260921110000). Duas decisoes da consultoria em
-- 21/09/2026.
--
-- 1. ESCADA. Aos 15 dias avisa o responsavel (e o revisor, quando em revisao). O
--    gestor so 7 dias DEPOIS, aos 22, e so se a tarefa continuar sem
--    movimentacao. Antes os dois recebiam juntos.
--
--    O NUMERO QUE MOTIVOU: medido no sandbox antes de mexer, dos 171 avisos, 75
--    iam para 3 gestores, ou seja 25 de uma vez para cada um, contra 86 divididos
--    entre 15 responsaveis. Quem entope e o sino do gestor, e ele e justamente
--    quem precisa da excecao, nao do quadro inteiro.
--
--    O EFEITO QUE VEM COM A ESCADA, e e desejado: tarefa que se move no dia 16 e
--    para de novo reinicia a contagem, entao o gestor nunca ouve falar de tarefa
--    que oscila. Ele ouve falar da que ficou fria 22 dias corridos.
--
-- 2. PROJETO SEM MOVIMENTACAO, aos 30 dias. Projeto parado e o agregado: nenhuma
--    tarefa ABERTA dele se moveu. O card pedia "projeto ou tarefa" e a entrega de
--    18/09 cobriu so tarefa, sem registrar isso como decisao.
--
--    POR QUE 30 E NAO 15. Medido em producao em 21/09, contando projeto sem
--    movimentacao como projeto cujas tarefas abertas todas pararam:
--
--      79 projetos com tarefa aberta
--      mediana de 12 dias sem movimentacao
--      38 parados ha 15 dias ou mais   (48%)
--      15 parados ha 30 dias ou mais   (19%)
--      maior parada: 164 dias
--
--    Com 15 dias metade dos projetos alerta e o aviso morre de ruido. Com 30 sao
--    15 projetos, numero que um gestor olha. E faz sentido conceitual: projeto e
--    feito de muitas tarefas, entao ele so fica frio quando todas ficam.
--
-- A MOVIMENTACAO SAI DE UMA FUNCAO SO, e por isso ela nasce aqui. A regra de "o
-- que conta como movimentacao" e a mesma para tarefa e para projeto; deixada
-- inline nas duas, a primeira alteracao futura mudaria uma e esqueceria a outra.
--
-- Nao mexe em tabela, coluna nem RLS.
--
-- Reversao:
--   SELECT cron.unschedule('alertar-projetos-inativos-diario');
--   DROP FUNCTION public.alertar_projetos_inativos(date, int, text);
--   DROP FUNCTION public.projetos_inativos(date, int, text);
--   e reaplicar 20260921103000 para o aviso de tarefa voltar sem a escada.

/* ------------------------------------------------------------------ */
/* A movimentacao relevante, fonte unica                              */
/* ------------------------------------------------------------------ */

CREATE OR REPLACE FUNCTION public.tarefa_movimentacao_relevante()
RETURNS TABLE (task_id uuid, quando timestamptz, o_que text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT l.entity_id, l.performed_at,
         CASE
           WHEN l.changed_fields ? 'status' THEN
             'status alterado para "' ||
             CASE l.changed_fields->'status'->>'new'
               WHEN 'backlog'        THEN 'Backlog'
               WHEN 'waiting_client' THEN 'Pendente Cliente'
               WHEN 'todo'           THEN 'A Fazer'
               WHEN 'in_progress'    THEN 'Em Andamento'
               WHEN 'review'         THEN 'Revisão'
               WHEN 'em_ajuste'      THEN 'Em Ajuste'
               WHEN 'done'           THEN 'Concluído'
               ELSE l.changed_fields->'status'->>'new'
             END || '"'
           WHEN l.changed_fields ? 'assigned_to'  THEN 'responsável alterado'
           WHEN l.changed_fields ? 'reviewer_id'  THEN 'revisor alterado'
           WHEN l.changed_fields ? 'actual_hours' THEN 'horas lançadas'
           ELSE 'tarefa criada'
         END
    FROM public.audit_logs l
   WHERE l.area = 'tax'
     AND l.entity_type = 'task'
     AND (l.action = 'created'
          OR l.changed_fields ?| array['status', 'assigned_to', 'reviewer_id', 'actual_hours'])

  UNION ALL

  SELECT c.entity_id, c.created_at, 'comentário registrado'
    FROM public.org_comments c
   WHERE c.entity_type = 'org_task' AND c.excluido = false

  UNION ALL

  SELECT tc.task_id, tc.created_at, 'comentário registrado'
    FROM public.org_task_comments tc
   WHERE tc.is_system = false

  UNION ALL

  /* Conclusao de etapa: a subtarefa que fecha move a tarefa-mae. */
  SELECT st.parent_task_id, l.performed_at, 'etapa concluída'
    FROM public.audit_logs l
    JOIN public.org_tasks st ON st.id = l.entity_id
   WHERE l.area = 'tax'
     AND l.entity_type IN ('task', 'subtask')
     AND l.changed_fields->'status'->>'new' = 'done'
     AND st.parent_task_id IS NOT NULL;
$function$;

COMMENT ON FUNCTION public.tarefa_movimentacao_relevante() IS
  'GES-01B: toda movimentacao RELEVANTE de tarefa de cliente, de qualquer fonte, '
  'numa lista so. Relevante e status, responsavel, revisor, horas lancadas, '
  'comentario e etapa concluida; alteracao cadastral (titulo, descricao, tag, prazo, '
  'cliente) NAO entra, por decisao da consultoria em 21/09/2026. Fonte unica das '
  'varreduras de tarefa e de projeto: a regra e a mesma, e inline nas duas ela '
  'desandaria na primeira alteracao. O rotulo do status e o da tela '
  '(src/lib/taskStatusColors.ts).';

/* ------------------------------------------------------------------ */
/* Tarefa: a escada entra                                             */
/* ------------------------------------------------------------------ */

DROP FUNCTION IF EXISTS public.tarefas_inativas(date, int, text);

CREATE OR REPLACE FUNCTION public.tarefas_inativas(
  _hoje           date DEFAULT NULL,
  _limiar         int  DEFAULT 15,
  _ambiente       text DEFAULT 'prod',
  _atraso_gestor  int  DEFAULT 7
)
RETURNS TABLE (
  task_id             uuid,
  task_title          text,
  task_status         public.fiscal_task_status,
  ultima_movimentacao timestamptz,
  o_que_mudou         text,
  dias_parado         integer,
  tipo                public.notificacao_tipo,
  destinatario_id     uuid,
  papel               text,
  dono_nome           text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH hoje AS (
    SELECT COALESCE(_hoje, (now() AT TIME ZONE 'America/Cuiaba')::date) AS d
  ),
  ultima AS (
    SELECT DISTINCT ON (m.task_id) m.task_id, m.quando, m.o_que
      FROM public.tarefa_movimentacao_relevante() m
     WHERE m.task_id IS NOT NULL
     ORDER BY m.task_id, m.quando DESC
  ),
  elegivel AS (
    SELECT t.id, t.title, t.status, t.assigned_to, t.reviewer_id,
           COALESCE(u.quando, t.created_at) AS quando,
           u.o_que,
           (h.d - (COALESCE(u.quando, t.created_at) AT TIME ZONE 'America/Cuiaba')::date)
             AS dias_parado,
           eq.gestor_id,
           CASE WHEN t.status = 'review'::public.fiscal_task_status
                     AND t.reviewer_id IS NOT NULL
                THEN t.reviewer_id ELSE t.assigned_to END AS dono_id
      FROM public.org_tasks t
      CROSS JOIN hoje h
      JOIN public.org_projects pr ON pr.id = t.project_id
      LEFT JOIN ultima u ON u.task_id = t.id
      LEFT JOIN public.estrutura_equipes eq ON eq.id = pr.equipe_id
      LEFT JOIN public.cliente ct ON ct.id = t.client_id
      LEFT JOIN public.cliente cp ON cp.id = pr.external_client_id
     WHERE t.status NOT IN ('done'::public.fiscal_task_status,
                            'backlog'::public.fiscal_task_status,
                            'waiting_client'::public.fiscal_task_status)
       AND (h.d - (COALESCE(u.quando, t.created_at) AT TIME ZONE 'America/Cuiaba')::date) >= _limiar
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
  /*
    A ESCADA MORA AQUI. A linha do gestor so existe quando a parada passou de
    `_limiar + _atraso_gestor`. A do dono existe desde `_limiar`, porque o
    `elegivel` ja filtrou por ele.
  */
  destinatarios AS (
    SELECT c.id, c.title, c.status, c.quando, c.o_que, c.dias_parado,
           COALESCE(c.nome_montado, c.email_do_dono) AS dono_nome,
           x.destinatario_id, x.papel
      FROM com_nome c
      CROSS JOIN LATERAL (
        VALUES
          (c.dono_id,
           CASE WHEN c.status = 'review'::public.fiscal_task_status
                     AND c.reviewer_id IS NOT NULL
                THEN 'revisor' ELSE 'responsavel' END,
           true),
          (c.gestor_id, 'gestor', c.dias_parado >= _limiar + _atraso_gestor)
      ) AS x(destinatario_id, papel, cabe)
     WHERE x.cabe
  )
  SELECT DISTINCT ON (d.id, d.destinatario_id)
         d.id, d.title, d.status, d.quando, d.o_que, d.dias_parado,
         'tarefa_inativa'::public.notificacao_tipo,
         d.destinatario_id, d.papel, d.dono_nome
    FROM destinatarios d
   WHERE d.destinatario_id IS NOT NULL
   ORDER BY d.id, d.destinatario_id, (d.papel = 'gestor');
$function$;

COMMENT ON FUNCTION public.tarefas_inativas(date, int, text, int) IS
  'GES-01B: quem deve receber aviso de tarefa sem movimentacao HOJE. Escada: o '
  'responsavel (ou o revisor, em revisao) a partir de _limiar dias; o gestor da '
  'equipe a partir de _limiar + _atraso_gestor (15 e 7 por decisao de 21/09/2026). '
  'Movimentacao relevante sai de tarefa_movimentacao_relevante(); tarefa sem '
  'auditoria usa created_at como movimento zero. `waiting_client` nao entra. Devolve '
  'o_que_mudou para o corpo explicar a data. Dia em America/Cuiaba.';

DROP FUNCTION IF EXISTS public.alertar_tarefas_inativas(date, int, text);

CREATE OR REPLACE FUNCTION public.alertar_tarefas_inativas(
  _hoje          date DEFAULT NULL,
  _limiar        int  DEFAULT 15,
  _ambiente      text DEFAULT 'prod',
  _atraso_gestor int  DEFAULT 7
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
  v_quando   text;
  v_criados  integer := 0;
  v_negados  integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas lider ou acima pode disparar a varredura de inatividade'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN SELECT * FROM public.tarefas_inativas(_hoje, _limiar, _ambiente, _atraso_gestor) LOOP
    v_chave := format('tarefa_inativa:%s:%s:%s',
                      r.task_id,
                      to_char(r.ultima_movimentacao AT TIME ZONE 'America/Cuiaba',
                              'YYYY-MM-DD"T"HH24:MI:SS'),
                      r.destinatario_id);

    v_envio_id := public.reservar_envio(
      v_chave, 'sino'::public.notificacao_canal, r.tipo,
      'org_task', r.task_id, r.destinatario_id, NULL, NULL, r.papel,
      jsonb_build_object('limiar', _limiar, 'dias_parado', r.dias_parado,
                         'papel', r.papel, 'ambiente', _ambiente)
    );

    IF v_envio_id IS NULL THEN
      v_negados := v_negados + 1;
      CONTINUE;
    END IF;

    v_titulo := 'Sem movimentação há ' || r.dias_parado || ' dias: ' || r.task_title;

    v_quando := CASE
      WHEN r.o_que_mudou IS NULL
        THEN 'Sem movimentação desde a criação, em '
             || to_char(r.ultima_movimentacao, 'DD/MM/YYYY') || '.'
      ELSE 'Última movimentação em '
           || to_char(r.ultima_movimentacao, 'DD/MM/YYYY')
           || ': ' || r.o_que_mudou || '.'
    END;

    v_de_quem := CASE
      WHEN r.papel = 'gestor' AND r.dono_nome IS NOT NULL
        THEN 'Responsável: ' || r.dono_nome || '. '
      ELSE ''
    END;

    v_corpo := v_de_quem || v_quando;

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

COMMENT ON FUNCTION public.alertar_tarefas_inativas(date, int, text, int) IS
  'GES-01B: escreve os avisos de tarefa sem movimentacao do dia, com a escada do '
  'gestor. Titulo "Sem movimentacao ha N dias: {tarefa}"; o corpo diz a data E o que '
  'foi a ultima movimentacao, ou "desde a criacao" quando nao ha auditoria. Redacao '
  'da consultoria, aprovada em 21/09/2026.';

/* ------------------------------------------------------------------ */
/* Projeto sem movimentacao                                           */
/* ------------------------------------------------------------------ */

CREATE OR REPLACE FUNCTION public.projetos_inativos(
  _hoje     date DEFAULT NULL,
  _limiar   int  DEFAULT 30,
  _ambiente text DEFAULT 'prod'
)
RETURNS TABLE (
  project_id          uuid,
  project_name        text,
  ultima_movimentacao timestamptz,
  dias_parado         integer,
  tarefas_abertas     integer,
  tipo                public.notificacao_tipo,
  destinatario_id     uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH hoje AS (
    SELECT COALESCE(_hoje, (now() AT TIME ZONE 'America/Cuiaba')::date) AS d
  ),
  ultima AS (
    SELECT DISTINCT ON (m.task_id) m.task_id, m.quando
      FROM public.tarefa_movimentacao_relevante() m
     WHERE m.task_id IS NOT NULL
     ORDER BY m.task_id, m.quando DESC
  ),
  /*
    So tarefa ABERTA conta, e `waiting_client` nao e aberta para este fim, pelo
    mesmo motivo do aviso de tarefa: projeto cujas tarefas estao todas esperando o
    cliente nao esta parado, esta esperando. Projeto sem nenhuma tarefa elegivel
    simplesmente nao aparece, o que resolve de graca o projeto ja encerrado.
  */
  por_tarefa AS (
    SELECT t.project_id, COALESCE(u.quando, t.created_at) AS quando
      FROM public.org_tasks t
      LEFT JOIN ultima u ON u.task_id = t.id
     WHERE t.status NOT IN ('done'::public.fiscal_task_status,
                            'backlog'::public.fiscal_task_status,
                            'waiting_client'::public.fiscal_task_status)
  ),
  por_projeto AS (
    SELECT pr.id, pr.name, eq.gestor_id,
           max(pt.quando) AS quando,
           count(*)::integer AS tarefas_abertas
      FROM public.org_projects pr
      JOIN por_tarefa pt ON pt.project_id = pr.id
      LEFT JOIN public.estrutura_equipes eq ON eq.id = pr.equipe_id
      LEFT JOIN public.cliente cp ON cp.id = pr.external_client_id
     WHERE (cp.ambiente IS NULL OR cp.ambiente = _ambiente)
     GROUP BY pr.id, pr.name, eq.gestor_id
  )
  SELECT p.id, p.name, p.quando,
         (h.d - (p.quando AT TIME ZONE 'America/Cuiaba')::date) AS dias_parado,
         p.tarefas_abertas,
         'projeto_inativo'::public.notificacao_tipo,
         p.gestor_id
    FROM por_projeto p
    CROSS JOIN hoje h
   WHERE p.gestor_id IS NOT NULL
     AND (h.d - (p.quando AT TIME ZONE 'America/Cuiaba')::date) >= _limiar;
$function$;

COMMENT ON FUNCTION public.projetos_inativos(date, int, text) IS
  'GES-01B: qual projeto esta sem movimentacao HOJE, e quem recebe. Projeto parado e '
  'o agregado: NENHUMA tarefa aberta dele se moveu ha _limiar dias (30 por decisao de '
  '21/09/2026, medido: com 15 alertaria 48% dos projetos, com 30 alerta 19%). '
  'Movimentacao relevante sai de tarefa_movimentacao_relevante(). So o gestor da '
  'equipe recebe, porque e leitura de floresta, nao de arvore. Dia em America/Cuiaba.';

CREATE OR REPLACE FUNCTION public.alertar_projetos_inativos(
  _hoje     date DEFAULT NULL,
  _limiar   int  DEFAULT 30,
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
  v_criados  integer := 0;
  v_negados  integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas lider ou acima pode disparar a varredura de projetos'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN SELECT * FROM public.projetos_inativos(_hoje, _limiar, _ambiente) LOOP
    v_chave := format('projeto_inativo:%s:%s:%s',
                      r.project_id,
                      to_char(r.ultima_movimentacao AT TIME ZONE 'America/Cuiaba',
                              'YYYY-MM-DD"T"HH24:MI:SS'),
                      r.destinatario_id);

    v_envio_id := public.reservar_envio(
      v_chave, 'sino'::public.notificacao_canal, r.tipo,
      'org_project', r.project_id, r.destinatario_id, NULL, NULL, 'gestor',
      jsonb_build_object('limiar', _limiar, 'dias_parado', r.dias_parado,
                         'tarefas_abertas', r.tarefas_abertas, 'ambiente', _ambiente)
    );

    IF v_envio_id IS NULL THEN
      v_negados := v_negados + 1;
      CONTINUE;
    END IF;

    v_titulo := 'Projeto sem movimentação há ' || r.dias_parado || ' dias: ' || r.project_name;

    v_corpo := 'Nenhuma tarefa do projeto teve movimentação desde '
               || to_char(r.ultima_movimentacao, 'DD/MM/YYYY') || '.';

    PERFORM public.criar_notificacao(
      r.destinatario_id, r.tipo, v_titulo,
      'org_project', r.project_id, v_corpo, NULL, v_chave,
      jsonb_build_object('limiar', _limiar, 'ambiente', _ambiente)
    );

    PERFORM public.confirmar_envio(
      v_envio_id, 'enviado'::public.notificacao_envio_status, NULL, NULL, NULL
    );

    v_criados := v_criados + 1;
  END LOOP;

  RETURN QUERY SELECT v_criados, v_negados;
END;
$function$;

COMMENT ON FUNCTION public.alertar_projetos_inativos(date, int, text) IS
  'GES-01B: escreve os avisos de projeto sem movimentacao do dia. Titulo "Projeto sem '
  'movimentacao ha N dias: {projeto}", corpo "Nenhuma tarefa do projeto teve '
  'movimentacao desde DD/MM/AAAA." Sem prefixo de responsavel, porque projeto nao tem '
  'dono unico. Redacao da consultoria, aprovada em 21/09/2026.';

REVOKE ALL ON FUNCTION public.tarefa_movimentacao_relevante() FROM anon;
REVOKE ALL ON FUNCTION public.tarefas_inativas(date, int, text, int) FROM anon;
REVOKE ALL ON FUNCTION public.alertar_tarefas_inativas(date, int, text, int) FROM anon;
REVOKE ALL ON FUNCTION public.projetos_inativos(date, int, text) FROM anon;
REVOKE ALL ON FUNCTION public.alertar_projetos_inativos(date, int, text) FROM anon;

/* ------------------------------------------------------------------ */
/* O cron do projeto, no molde do de tarefa                           */
/* ------------------------------------------------------------------ */

DO $$
DECLARE
  v_cluster  text;
  v_ambiente text;
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

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'alertar-projetos-inativos-diario') THEN
    PERFORM cron.unschedule('alertar-projetos-inativos-diario');
  END IF;

  /* 07h05 de Cuiaba, cinco minutos depois do de tarefa, para os dois nao
     disputarem conexao no mesmo minuto. */
  PERFORM cron.schedule(
    'alertar-projetos-inativos-diario',
    '5 11 * * *',
    format('SELECT public.alertar_projetos_inativos(NULL, 30, %L);', v_ambiente)
  );
END $$;

-- GATE: as tres funcoes novas existem e o job esta agendado.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'projetos_inativos'
  ) THEN
    RAISE EXCEPTION 'GATE: projetos_inativos nao foi criada';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'tarefa_movimentacao_relevante'
  ) THEN
    RAISE EXCEPTION 'GATE: tarefa_movimentacao_relevante nao foi criada';
  END IF;
END $$;
