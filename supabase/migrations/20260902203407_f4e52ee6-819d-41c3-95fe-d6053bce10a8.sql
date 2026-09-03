-- 20260831202316_ges01a_varredura_de_prazo_de_tarefa.sql
-- GES-01A, parte 2 de 3: quem alertar (leitura) e gravar o aviso (escrita).
--
-- DUAS FUNCOES SEPARADAS DE PROPOSITO. `tarefas_a_alertar` so le, e pode ser
-- rodada a vontade para ver exatamente quem receberia aviso hoje, antes de
-- qualquer aviso existir. `alertar_tarefas_por_prazo` e a unica que escreve.
-- Molde da GES-04 (20260825140358): a funcao diz QUEM, e quem envia e outra
-- coisa. Aqui, porem, o canal e SO O SINO, tudo dentro do banco: nao ha edge
-- function, nao ha HTTP, nao ha segredo no Vault.
--
-- A REGUA, decidida com o usuario em 31/08/2026:
--   D-3  faltam 3 dias      -> tarefa_prazo_proximo
--   D-0  vence hoje         -> tarefa_prazo_proximo
--   D+1  passou do prazo    -> tarefa_atrasada
-- Um aviso por marco e NADA depois do D+1. Repetir semanalmente seria o aviso
-- diario disfarcado, que o criterio de aceite 1 proibe.
--
-- POR QUE IGUALDADE DE DATA E NAO INTERVALO, e como isso resolve o passivo:
-- o marco casa com `due_date = hoje + 3`, `= hoje` e `= hoje - 1`, exatos. Com
-- isso as 44 tarefas atrasadas ha mais de uma semana (14 delas ha mais de 90
-- dias, medido em producao em 31/08) NUNCA disparam: o D+1 delas ficou no
-- passado. Sem isso, o primeiro dia no ar despejaria 54 avisos de atraso de uma
-- vez, quase todos de tarefa morta, e a feature nasceria desmoralizada.
-- O preco, assumido: se o cron falhar num dia, os marcos daquele dia se perdem.
-- Para uma tarefa que vence, ainda restam os marcos seguintes. A alternativa
-- (intervalo de recuperacao mais data de largada) foi descartada por trazer de
-- volta o problema do passivo em troca de um caso raro.
--
-- FUSO. `due_date` e `date`. "Hoje" sai de `America/Cuiaba`, nunca de `now()`
-- cru: um job a meia-noite UTC roda as 20h do dia anterior aqui e deslocaria a
-- regua inteira em um dia.
--
-- STATUS. Entram todos menos `done` e `backlog`. Backlog e o que ainda nao foi
-- assumido: prazo vencido ali e residuo de planejamento, nao trabalho atrasado.
--
-- DESTINATARIOS. Responsavel mais o gestor da equipe, com DISTINCT, e uma troca
-- conforme o status:
--   `review`         -> vai para o REVISOR e nao para o responsavel. A bola esta
--                       com quem revisa; cobrar quem ja entregou e injusto e nao
--                       destrava nada. Sem revisor, volta ao responsavel.
--   `waiting_client` -> a bola esta com o cliente. O responsavel nao pode
--                       resolver, entao o TEXTO diz "aguardando cliente" em vez
--                       de acusar atraso. O destinatario nao muda: o gestor
--                       precisa ver, e o responsavel e quem cobra o cliente.
-- O DISTINCT nao e decorativo: em 14 tarefas abertas o responsavel E o proprio
-- gestor da equipe, e sem ele essa pessoa receberia o mesmo aviso duas vezes.
--
-- DE ONDE SAI O GESTOR: `org_projects.equipe_id` -> `estrutura_equipes.gestor_id`.
-- Escolhido em vez de `org_projects.leader_id` porque representa chefia de
-- EQUIPE, enquanto o outro e do projeto e pode andar sozinho. Hoje os dois
-- coincidem em 150 das 151 tarefas abertas; uma diverge, e e por causa dela que
-- a fonte precisa ser uma so, declarada. Nao se usa "sublider" aqui: nenhum dos
-- 5 subliders e gestor de equipe, e buscar sublider entre os membros do projeto
-- alcancaria so 71 das 151 tarefas.
--
-- A DEDUPLICACAO NAO PODE MORAR NO SINO. `notificacao_agrupamento_uq` e
-- UNIQUE (destinatario_id, agrupamento_chave) WHERE lido_em IS NULL: ele so
-- segura enquanto a pessoa NAO leu. Ela le hoje, o job roda amanha com a mesma
-- chave e nasce um aviso novo. Quanto mais atenta a pessoa, mais ela seria
-- avisada. Por isso a trava real e `notificacao_envio.chave_idempotencia`, que e
-- unico sem condicao: reserva primeiro, e so chama `criar_notificacao` se a
-- reserva foi concedida. `reservar_envio` faz ON CONFLICT DO NOTHING RETURNING,
-- entao devolve NULL quando a chave ja existe.
--
-- A CHAVE inclui o `due_date`:
--   tarefa_prazo:<task_id>:<marco>:<due_date>
-- e com isso o criterio de aceite 3 sai de graca: mudou o prazo, muda a chave, o
-- historico antigo fica de pe e nao sobra alerta falso.
--
-- HREF FICA NULO, como em todo aviso de tarefa desde a EDU-2. O destino do
-- clique e do front: `destinoDoAviso` em src/lib/notificacoesInternas.ts resolve
-- `org_task` para `${tarefasBase}?taskId=<id>`, com a base da area em que a
-- pessoa esta. E o que atende o criterio 4 sem gravar rota no banco.
--
-- Fora de escopo, de proposito: projeto parado (e a GES-01B), e-mail semanal (e
-- a GES-02), chamados, preferencia individual, e tarefa sem prazo (23) ou sem
-- responsavel (15), que seguem sem gerar aviso.
--
-- Reversao: DROP FUNCTION nas duas. Nada aqui altera tabela, coluna, RLS ou dado.

CREATE OR REPLACE FUNCTION public.tarefas_a_alertar(_hoje date DEFAULT NULL)
RETURNS TABLE (
  task_id          uuid,
  task_title       text,
  task_status      public.fiscal_task_status,
  due_date         date,
  marco            text,
  tipo             public.notificacao_tipo,
  destinatario_id  uuid,
  papel            text
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
  -- Um destinatario por linha: o dono da bola, mais o gestor da equipe.
  destinatarios AS (
    SELECT e.id, e.title, e.status, e.due_date, e.marco,
           x.destinatario_id, x.papel
      FROM elegivel e
      CROSS JOIN LATERAL (
        VALUES
          (CASE WHEN e.status = 'review'::public.fiscal_task_status
                     AND e.reviewer_id IS NOT NULL
                THEN e.reviewer_id ELSE e.assigned_to END,
           CASE WHEN e.status = 'review'::public.fiscal_task_status
                     AND e.reviewer_id IS NOT NULL
                THEN 'revisor' ELSE 'responsavel' END),
          (e.gestor_id, 'gestor')
      ) AS x(destinatario_id, papel)
     WHERE e.marco IS NOT NULL
  )
  -- DISTINCT ON porque em 14 tarefas o responsavel e o proprio gestor: sem isto
  -- a mesma pessoa receberia o aviso duas vezes. O ORDER BY poe 'gestor' por
  -- ultimo, entao sobra o papel mais especifico.
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
         d.papel
    FROM destinatarios d
   WHERE d.destinatario_id IS NOT NULL
   ORDER BY d.id, d.destinatario_id, (d.papel = 'gestor');
$function$;

COMMENT ON FUNCTION public.tarefas_a_alertar(date) IS
  'GES-01A: quem deve receber aviso de prazo de tarefa HOJE, sem escrever nada. '
  'Regua de tres marcos por igualdade de data (D-3, D-0, D+1), o que mantem o '
  'passivo antigo em silencio. Dia calculado em America/Cuiaba. Passe _hoje para '
  'simular outra data em teste.';

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
    -- O due_date entra na chave: mudou o prazo, e outra ocorrencia, e o aviso
    -- antigo nao vira alerta falso.
    v_chave := format('tarefa_prazo:%s:%s:%s', r.task_id, r.marco, r.due_date);

    -- Reserva primeiro. NULL = a chave ja existe, ou seja este marco ja foi
    -- avisado a esta pessoa. So depois da reserva e que o sino e tocado.
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

    -- Em waiting_client a bola esta com o cliente: o texto nomeia isso em vez de
    -- acusar de atraso quem nao pode resolver sozinho.
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
  'notificacao_envio.chave_idempotencia (tarefa_prazo:<id>:<marco>:<due_date>), e '
  'NAO pela chave de agrupamento do sino, que so deduplica enquanto o aviso esta '
  'nao lido. Devolve quantos avisos criou e quantas reservas ja existiam.';

REVOKE ALL ON FUNCTION public.alertar_tarefas_por_prazo(date) FROM anon;

-- GATE: as duas funcoes existem, a de leitura nao escreve, a regua e o fuso
-- ficaram no lugar e a escrita passa pela reserva. Falha a migration se nao.
DO $$
DECLARE
  v_src text;
BEGIN
  IF to_regprocedure('public.tarefas_a_alertar(date)') IS NULL THEN
    RAISE EXCEPTION 'GATE: tarefas_a_alertar nao existe';
  END IF;
  IF to_regprocedure('public.alertar_tarefas_por_prazo(date)') IS NULL THEN
    RAISE EXCEPTION 'GATE: alertar_tarefas_por_prazo nao existe';
  END IF;

  SELECT p.prosrc INTO v_src FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'tarefas_a_alertar';
  IF v_src ~* '(insert|update|delete)[[:space:]]' THEN
    RAISE EXCEPTION 'GATE: tarefas_a_alertar deveria ser somente leitura';
  END IF;
  IF v_src NOT LIKE '%prazo_3_dias%' OR v_src NOT LIKE '%vence_hoje%'
     OR v_src NOT LIKE '%America/Cuiaba%' THEN
    RAISE EXCEPTION 'GATE: a regua ou o fuso nao ficaram na funcao de leitura';
  END IF;

  SELECT p.prosrc INTO v_src FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
   WHERE n.nspname = 'public' AND p.proname = 'alertar_tarefas_por_prazo';
  IF v_src NOT LIKE '%reservar_envio%' THEN
    RAISE EXCEPTION 'GATE: a escrita nao passa por reservar_envio, dedup furada';
  END IF;
END $$;