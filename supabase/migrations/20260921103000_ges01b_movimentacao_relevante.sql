-- 20260921103000_ges01b_movimentacao_relevante.sql
-- GES-01B: a inatividade passa a contar MOVIMENTACAO RELEVANTE, e nao qualquer
-- alteracao. Duas decisoes da consultoria em 21/09/2026, sobre a entrega de 18/09.
--
-- 1. `waiting_client` NAO ALERTA. O criterio de aceite diz que concluidos,
--    cancelados e pausados nao alertam. O enum `fiscal_task_status` nao tem
--    "cancelado" nem "pausado"; quem faz esse papel e `waiting_client`, a tarefa
--    legitimamente esperando o cliente. Medido antes de mexer: das 115 tarefas que
--    alertariam no sandbox, 17 estavam nesse status, com 34 avisos.
--
-- 2. A FONTE DEIXA DE SER `org_tasks.updated_at`. A entrega de 18/09 contava "15
--    dias desde a ultima alteracao, seja qual for", o que e o mesmo que o
--    `updated_at`, e e exatamente o que o ATENCAO do card proibia: edicao
--    irrelevante mascara inatividade. A consultoria pediu movimentacao relevante,
--    com alteracao meramente cadastral NAO tirando a tarefa de inativa.
--
-- E TEM UM GANHO QUE SO ESSA TROCA DA. O `updated_at` e um horario so: diz QUANDO a
-- linha mudou e nunca O QUE mudou. Por isso o corpo antigo parava em "Ultima
-- alteracao em 31/08, ha 18 dias." O criterio de aceite pede que a data seja
-- EXPLICAVEL, e a redacao aprovada pede "status alterado para ...". Isso so existe
-- lendo `audit_logs.changed_fields`, que guarda o campo e o valor novo.
--
-- O QUE CONTA COMO MOVIMENTACAO, e de onde cada uma sai:
--
--   status alterado        audit_logs, changed_fields ? 'status'
--   responsavel alterado   audit_logs, changed_fields ? 'assigned_to'
--   revisor alterado       audit_logs, changed_fields ? 'reviewer_id'
--   horas lancadas         audit_logs, changed_fields ? 'actual_hours'
--   comentario registrado  org_comments (entity_type='org_task', nao excluido)
--                          e org_task_comments (is_system = false)
--   etapa concluida        subtarefa cujo status foi para 'done'
--   tarefa criada          audit_logs, action='created'
--
-- O QUE NAO CONTA: titulo, descricao, tag, prioridade, prazo, projeto e os campos
-- de cadastro (cliente, contribuinte, categoria, servico). Sao os que a consultoria
-- chamou de "meramente cadastrais".
--
-- A REGRA DE LARGADA, que a troca de fonte obriga. Metade das tarefas abertas nao
-- tem NENHUMA linha de auditoria: nascem por um caminho que nao passa pela tela e
-- nao carimba `created_by`. Medido em producao em 21/09: 238 de 502. Para essas o
-- movimento zero e `org_tasks.created_at`, e o corpo diz "Sem movimentacao desde a
-- criacao", sem inventar um motivo que nao existe.
--
-- A CHAVE DE DEDUPLICACAO passa a usar a data da ultima MOVIMENTACAO, no lugar do
-- updated_at. O efeito e o desejado: correcao cadastral nao muda a chave, entao nao
-- renasce aviso; movimentacao de verdade muda a chave, e a reabertura acontece.
--
-- Nao mexe em tabela, coluna, RLS nem no cron, que continuam os de 18/09.
--
-- Reversao: reaplicar 20260918213116_ges01b_alerta_inatividade.sql.

-- O DROP e obrigatorio, e nao descuido: as colunas de retorno mudaram (entrou
-- `o_que_mudou`, e `ultima_alteracao` virou `ultima_movimentacao`), e o Postgres
-- recusa CREATE OR REPLACE quando o tipo de retorno muda. O `alertar_tarefas_inativas`
-- chama esta funcao por nome, resolvido em tempo de execucao, entao nao ha dependencia
-- forte a quebrar: as duas sao recriadas no mesmo ato.
DROP FUNCTION IF EXISTS public.tarefas_inativas(date, int, text);

CREATE OR REPLACE FUNCTION public.tarefas_inativas(
  _hoje     date DEFAULT NULL,
  _limiar   int  DEFAULT 15,
  _ambiente text DEFAULT 'prod'
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
  /*
    Toda movimentacao relevante, de qualquer fonte, numa lista so. O rotulo do
    status e o mesmo que a tela mostra (`src/lib/taskStatusColors.ts`): escrever
    "review" no sino seria devolver o enum para quem le.
  */
  movimentacao AS (
    SELECT l.entity_id AS task_id, l.performed_at AS quando,
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
           END AS o_que
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
       AND st.parent_task_id IS NOT NULL
  ),
  ultima AS (
    SELECT DISTINCT ON (m.task_id) m.task_id, m.quando, m.o_que
      FROM movimentacao m
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
                THEN 'revisor' ELSE 'responsavel' END),
          (c.gestor_id, 'gestor')
      ) AS x(destinatario_id, papel)
  )
  SELECT DISTINCT ON (d.id, d.destinatario_id)
         d.id, d.title, d.status, d.quando, d.o_que, d.dias_parado,
         'tarefa_inativa'::public.notificacao_tipo,
         d.destinatario_id, d.papel, d.dono_nome
    FROM destinatarios d
   WHERE d.destinatario_id IS NOT NULL
   ORDER BY d.id, d.destinatario_id, (d.papel = 'gestor');
$function$;

COMMENT ON FUNCTION public.tarefas_inativas(date, int, text) IS
  'GES-01B: quem deve receber aviso de tarefa sem movimentacao HOJE, sem escrever '
  'nada. Sem movimentacao e tarefa de cliente aberta cuja ultima MOVIMENTACAO '
  'RELEVANTE tem _limiar dias ou mais (15 por decisao de 18/09/2026). Relevante e '
  'status, responsavel, revisor, horas lancadas, comentario e etapa concluida, lido '
  'de audit_logs, org_comments e org_task_comments; alteracao cadastral (titulo, '
  'descricao, tag, prazo, cliente) NAO conta, por decisao de 21/09/2026. Tarefa sem '
  'nenhuma linha de auditoria usa created_at como movimento zero. `waiting_client` '
  'nao entra: e a tarefa legitimamente esperando o cliente. Devolve o_que_mudou para '
  'o corpo poder explicar a data. Dia em America/Cuiaba.';

-- A REDACAO E A DA CONSULTORIA, aprovada em 21/09/2026, e troca "parada" por "sem
-- movimentacao" em todo lugar. O argumento dela: "parada" e interpretativo, porque a
-- tarefa pode estar legitimamente aguardando cliente, prazo ou dependencia externa.
--
--   Titulo   Sem movimentacao ha 18 dias: Apuracao ICMS - Frigobom
--   Dono     Ultima movimentacao em 31/08/2026: status alterado para "Revisao".
--   Gestor   Responsavel: Layara Souza. Ultima movimentacao em ...
--   Sem historico   Sem movimentacao desde a criacao, em 31/08/2026.
--
-- DUAS DIFERENCAS DA REDACAO DELA, e as duas de proposito:
--
--   O ANO ENTRA NA DATA. O exemplo dela escreve "em 31/08"; aqui sai "31/08/2026".
--   As paradas medidas vao a 206 dias, entao a data cruza o ano, e o aviso de prazo
--   da GES-01A ja escreve o ano ("O prazo era 05/09/2026"). Duas datas irmas no
--   mesmo sino tem de se ler igual.
--
--   O ROTULO DO STATUS E O DA TELA. Ela escreveu "Em revisao"; o rotulo que a tela
--   mostra e "Revisao" (`src/lib/taskStatusColors.ts`). Vale o da tela, senao o
--   sino chama de um jeito o que o quadro chama de outro.

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
  v_quando   text;
  v_criados  integer := 0;
  v_negados  integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas lider ou acima pode disparar a varredura de inatividade'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN SELECT * FROM public.tarefas_inativas(_hoje, _limiar, _ambiente) LOOP
    /*
      A chave usa a ultima MOVIMENTACAO, nao mais o updated_at. E o que faz correcao
      cadastral nao renascer aviso: ela nao muda a chave.
    */
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

COMMENT ON FUNCTION public.alertar_tarefas_inativas(date, int, text) IS
  'GES-01B: escreve os avisos de tarefa sem movimentacao do dia. Titulo e "Sem '
  'movimentacao ha N dias: {tarefa}"; o corpo diz a data E o que foi a ultima '
  'movimentacao ("status alterado para ..."), ou "desde a criacao" quando a tarefa '
  'nao tem auditoria. O aviso do gestor abre com "Responsavel:". A deduplicacao mora '
  'em notificacao_envio, na chave que inclui a ultima movimentacao: nao se repete '
  'enquanto nada relevante muda, e renasce quando muda. Redacao da consultoria, '
  'aprovada em 21/09/2026.';

REVOKE ALL ON FUNCTION public.tarefas_inativas(date, int, text) FROM anon;
REVOKE ALL ON FUNCTION public.alertar_tarefas_inativas(date, int, text) FROM anon;
