-- 20260902210245_ges01a_redacao_dos_avisos_de_prazo.sql
-- GES-01A: a redacao dos avisos de prazo, fechada pela Patricia em 02/09/2026.
--
-- Texto e decisoes em docs/geral/avisos-prazo-tarefa.md. Tres mudancas:
--
-- 1. O MARCO E DECIDIDO ANTES DO CONTEXTO. Era o defeito principal: a escolha do
--    corpo olhava "aguardando cliente" e "revisor" primeiro e o marco por
--    ultimo, entao a tarefa que venceu ontem saia com titulo "Tarefa atrasada"
--    e corpo "Prazo em 05/09/2026", no futuro, na mesma linha do sino. Agora o
--    corpo e montado em duas partes independentes -- contexto mais prazo -- e o
--    prazo sempre concorda com o marco. Isso elimina a contradicao sem criar
--    mensagem nova: nao existe "Atrasada aguardando cliente" nem "Revisao
--    atrasada", que multiplicariam variacao sem necessidade.
--
--    Titulo  = marco + tarefa.
--    Corpo   = [de quem, so para o gestor] + [contexto] + [prazo].
--    Prazo a frente -> "Prazo em DD/MM/AAAA."
--    Prazo vencido  -> "O prazo era DD/MM/AAAA."
--
--    "Tarefa atrasada" descreve o estado do PRAZO, nao acusa o responsavel; quem
--    diz onde a tarefa esta e o contexto do corpo.
--
-- 2. O GESTOR PASSA A RECEBER SO O ATRASO. Recebia os tres marcos de todas as
--    tarefas da equipe, o que transforma o sino dele num painel operacional
--    paralelo e faz justamente o aviso de atraso perder forca no volume. Quem
--    executa precisa de antecipacao; quem gerencia precisa da excecao. Dono e
--    revisor seguem com os tres.
--
-- 3. OS ACENTOS VOLTAM AO CORPO. "Responsavel:" e "Aguardando sua revisao."
--    estavam sem acento, os titulos nao. Mesmo defeito que a migracao
--    20260827185245 corrigiu nos avisos de tarefa e documento.
--
-- Os titulos NAO mudam: sao curtos, escaneaveis, e foram aprovados como estao.
--
-- Nada de schema: duas funcoes reemitidas, mesma assinatura. O cron nao e
-- tocado. Sem comentario dentro dos corpos de proposito, porque o editor SQL do
-- Lovable corta statement em ";" e em "--" quando isto for para producao.
--
-- Reversao: reaplicar 20260901135620.

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
          (CASE WHEN c.marco = 'atrasada' THEN c.gestor_id END, 'gestor')
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
  'Regua de tres marcos por igualdade de data (D-3, D-0, D+1). Dono e revisor '
  'recebem os tres; o GESTOR so o atraso, decisao da Patricia em 02/09/2026 -- '
  'quem executa precisa de antecipacao, quem gerencia precisa da excecao. '
  'Recorta por ambiente com a MESMA regra do front (src/lib/ambienteScope.ts): '
  'os dois vinculos de cliente tem de bater, e quem nao tem cliente nunca e '
  'escondido. Dia em America/Cuiaba. Passe _hoje e _ambiente para simular.';

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
  v_contexto text;
  v_prazo    text;
  v_criados  integer := 0;
  v_negados  integer := 0;
BEGIN
  IF auth.uid() IS NOT NULL
     AND NOT public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) THEN
    RAISE EXCEPTION 'Apenas lider ou acima pode disparar a varredura de prazo'
      USING ERRCODE = '42501';
  END IF;

  FOR r IN SELECT * FROM public.tarefas_a_alertar(_hoje, _ambiente) LOOP
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

    v_prazo := CASE
      WHEN r.marco = 'atrasada'
        THEN 'O prazo era ' || to_char(r.due_date, 'DD/MM/YYYY') || '.'
      ELSE 'Prazo em ' || to_char(r.due_date, 'DD/MM/YYYY') || '.'
    END;

    v_contexto := CASE
      WHEN r.task_status = 'waiting_client'::public.fiscal_task_status
        THEN 'Aguardando o cliente. '
      WHEN r.papel = 'revisor'
        THEN 'Aguardando sua revisão. '
      ELSE ''
    END;

    v_de_quem := CASE
      WHEN r.papel = 'gestor' AND r.dono_nome IS NOT NULL
        THEN 'Responsável: ' || r.dono_nome || '. '
      ELSE ''
    END;

    v_corpo := v_de_quem || v_contexto || v_prazo;

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

COMMENT ON FUNCTION public.alertar_tarefas_por_prazo(date, text) IS
  'GES-01A: escreve os avisos de prazo do dia. Titulo e marco mais tarefa; corpo '
  'e contexto mais prazo, montados separados para que o prazo SEMPRE concorde '
  'com o marco -- vencido diz "O prazo era", a vencer diz "Prazo em". Redacao '
  'fechada pela Patricia em 02/09/2026, em docs/geral/avisos-prazo-tarefa.md.';

REVOKE ALL ON FUNCTION public.tarefas_a_alertar(date, text) FROM anon;
REVOKE ALL ON FUNCTION public.alertar_tarefas_por_prazo(date, text) FROM anon;
