-- 20260914212046_avisos_para_o_chat.sql
-- Avisos no Google Chat, parte 2: quem seria avisado. SO LE.
--
-- Molde da GES-01A (20260831202316): a funcao diz O QUE sairia, e quem envia e
-- outra coisa. Pode ser rodada a vontade, antes de existir borda, segredo ou
-- espaco: `select * from avisos_para_o_chat(interval '30 days')` e a passada
-- seca. Nao escreve nada.
--
-- O QUE ELA RESOLVE, e que a borda nao teria como resolver sozinha:
--
-- 1. A DEDUPLICACAO POR TAREFA. `notificacao` tem uma linha POR DESTINATARIO, e
--    o cron de prazo avisa duas pessoas (o dono da bola e o gestor). Medido em
--    producao em 14/09/2026: 250 linhas de sino para 150 tarefas distintas em 30
--    dias. Repassar linha a linha publicaria a mesma tarefa duas vezes no mesmo
--    espaco. O `DISTINCT` aqui e o que faz a mensagem ser do ESPACO e nao da
--    pessoa.
--
-- 2. A AREA, que decide o espaco: org_tasks -> org_projects -> estrutura_areas.
--    Medido no mesmo dia: das 150, nenhuma cai em '(sem area)' -- so Tax e OSG
--    tem projeto. O rotulo existe assim mesmo, porque area nula e possivel no
--    schema (`estrutura_area_id` e nullable) e area sem segredo simplesmente nao
--    envia, o que e como as cinco areas ativas sem projeto ficam de fora sem
--    precisar de codigo.
--
-- 3. A CHAVE DE IDEMPOTENCIA DESTE CANAL, que NAO e a dos outros. A chave dos
--    demais inclui o destinatario -- correcao da
--    20260901120951_ges01a_chave_por_destinatario.sql, feita porque
--    `notificacao_envio.chave_idempotencia` tem indice UNICO GLOBAL e, sem o
--    destinatario, a segunda pessoa da mesma tarefa nunca receberia. Aqui e o
--    oposto: nao ha destinatario, ha espaco, e a chave e
--    `chat:<area>:<tipo>:<tarefa>:<dia>`. `notificacao_envio.destinatario_id`
--    fica NULO nas linhas deste canal, e e assim que se le que a mensagem foi
--    para um espaco.
--
-- 4. O RECORTE DE `ambiente`, com a MESMA regra do front (src/lib/ambienteScope.ts)
--    e da varredura de prazo (20260901135620): os dois vinculos de cliente, o da
--    tarefa e o do projeto, e registro sem cliente nunca e escondido. Sem isso, o
--    espaco de verdade receberia aviso de cadastro de teste.
--
-- A JANELA E CURTA DE PROPOSITO (90 minutos). A trava contra repetir e a chave,
-- nao a janela; a janela existe para que um despachante que ficou dias parado nao
-- desovar o acumulado no espaco quando voltar. Para inspecionar, passe uma janela
-- grande a mao -- e leitura, nao envia nada.
--
-- OS QUATRO TIPOS sao os que hoje nascem sobre `org_task`. Conferido em producao
-- em 14/09: `notificacao` so tem esses quatro com entidade_tipo = 'org_task'.
-- Projeto (`org_project`) ainda nao tem aviso proprio e entra depois, com gatilho
-- novo -- ver docs/planos/avisos-de-tarefa-no-google-chat.md, fase 5.
--
-- Reversao: DROP FUNCTION IF EXISTS public.avisos_para_o_chat(interval, text).

CREATE OR REPLACE FUNCTION public.avisos_para_o_chat(
  _janela   interval DEFAULT interval '90 minutes',
  _ambiente text     DEFAULT 'prod'
)
RETURNS TABLE (
  area_nome    text,
  tipo         public.notificacao_tipo,
  entidade_id  uuid,
  task_title   text,
  task_status  public.fiscal_task_status,
  due_date     date,
  project_id   uuid,
  project_name text,
  dono_nome    text,
  chave        text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH dia AS (
    SELECT to_char((now() AT TIME ZONE 'America/Cuiaba')::date, 'YYYY-MM-DD') AS d
  ),
  aviso AS (
    -- Uma linha por (tipo, tarefa), nao por destinatario. Ver nota 1 no cabecalho.
    SELECT DISTINCT n.tipo, n.entidade_id
      FROM public.notificacao n
     WHERE n.entidade_tipo = 'org_task'
       AND n.created_at > now() - _janela
       AND n.tipo IN ('tarefa_prazo_proximo'::public.notificacao_tipo,
                      'tarefa_atrasada'::public.notificacao_tipo,
                      'tarefa_atribuida'::public.notificacao_tipo,
                      'tarefa_em_revisao'::public.notificacao_tipo)
  ),
  resolvido AS (
    SELECT COALESCE(a.name, '(sem area)') AS area_nome,
           v.tipo,
           v.entidade_id,
           t.title,
           t.status,
           t.due_date,
           pr.id   AS project_id,
           pr.name AS project_name,
           NULLIF(btrim(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '')
             AS dono_nome,
           'chat:' || COALESCE(a.name, 'sem-area') || ':' || v.tipo::text
                   || ':' || v.entidade_id::text || ':' || d.d AS chave
      FROM aviso v
      CROSS JOIN dia d
      JOIN public.org_tasks    t  ON t.id = v.entidade_id
      JOIN public.org_projects pr ON pr.id = t.project_id
      LEFT JOIN public.estrutura_areas a ON a.id = pr.estrutura_area_id
      LEFT JOIN public.profiles p        ON p.id = t.assigned_to
      -- Os dois vinculos de cliente, cada um opcional. Ausente = sem ambiente,
      -- e sem ambiente nao esconde. Ver nota 4 no cabecalho.
      LEFT JOIN public.cliente ct ON ct.id = t.client_id
      LEFT JOIN public.cliente cp ON cp.id = pr.external_client_id
     WHERE (ct.ambiente IS NULL OR ct.ambiente = _ambiente)
       AND (cp.ambiente IS NULL OR cp.ambiente = _ambiente)
  )
  SELECT r.area_nome, r.tipo, r.entidade_id, r.title, r.status, r.due_date,
         r.project_id, r.project_name, r.dono_nome, r.chave
    FROM resolvido r
   WHERE NOT EXISTS (
           SELECT 1
             FROM public.notificacao_envio e
            WHERE e.canal = 'google_chat'::public.notificacao_canal
              AND e.chave_idempotencia = r.chave
         )
   ORDER BY r.area_nome, r.tipo, r.due_date NULLS LAST, r.title
$function$;

COMMENT ON FUNCTION public.avisos_para_o_chat IS
  'O que sairia no Google Chat agora, uma linha por TAREFA (nao por destinatario, '
  'ao contrario de notificacao) e ja com a area que decide o espaco. So le: '
  'select * from avisos_para_o_chat(interval ''30 days'') e a passada seca. '
  'A chave devolvida e a de idempotencia do canal, sem destinatario, porque a '
  'mensagem e do espaco. Respeita ambiente com a mesma regra do front.';