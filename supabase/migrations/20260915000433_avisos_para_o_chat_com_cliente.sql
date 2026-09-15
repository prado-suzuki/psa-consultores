-- 20260915000433_avisos_para_o_chat_com_cliente.sql
-- Avisos no Google Chat: a leitura passa a devolver o CLIENTE.
--
-- PEDIDO DA PATRICIA em 14/09/2026, olhando as mensagens que chegaram ao espaco:
-- cada linha deve dizer responsavel, projeto, cliente e prazo. Os tres primeiros
-- ja saiam; o cliente nao existia na funcao.
--
-- DE ONDE SAI O CLIENTE, e por que sao dois vinculos e nao um: a tarefa tem
-- `client_id` e o projeto onde ela mora tem `external_client_id`. Os dois ja eram
-- lidos aqui -- e o recorte de `ambiente` sempre dependeu dos dois --, entao o
-- nome sai de um `coalesce` deles, com o da tarefa na frente por ser o mais
-- especifico. Medido em producao em 14/09: das 446 tarefas abertas, as 446 tem
-- cliente pelos DOIS caminhos, e nenhuma linha ficaria sem nome.
--
-- DROP E NAO CREATE OR REPLACE: a funcao ganha coluna no `RETURNS TABLE`, e
-- Postgres recusa `CREATE OR REPLACE` que muda o tipo de retorno
-- ("cannot change return type of existing function"). Mesma pedra da
-- 20260901135620, que precisou de DROP para acrescentar parametro.
--
-- Fora o cliente, o corpo e o mesmo da 20260914212046: a deduplicacao por tarefa,
-- a area que decide o espaco, a chave sem destinatario e o recorte de ambiente
-- continuam palavra por palavra. O cabecalho daquele arquivo explica cada um.
--
-- Reversao: reaplicar a 20260914212046 (o DROP aqui torna a volta limpa).

DROP FUNCTION IF EXISTS public.avisos_para_o_chat(interval, text);

CREATE OR REPLACE FUNCTION public.avisos_para_o_chat(
  _janela   interval DEFAULT interval '90 minutes',
  _ambiente text     DEFAULT 'prod'
)
RETURNS TABLE (
  area_nome     text,
  tipo          public.notificacao_tipo,
  entidade_id   uuid,
  task_title    text,
  task_status   public.fiscal_task_status,
  due_date      date,
  project_id    uuid,
  project_name  text,
  cliente_nome  text,
  dono_nome     text,
  chave         text
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
    -- Uma linha por (tipo, tarefa), nao por destinatario.
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
           -- O da tarefa na frente do e do projeto: e o mais especifico.
           COALESCE(ct.nome, cp.nome) AS cliente_nome,
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
      -- e sem ambiente nao esconde.
      LEFT JOIN public.cliente ct ON ct.id = t.client_id
      LEFT JOIN public.cliente cp ON cp.id = pr.external_client_id
     WHERE (ct.ambiente IS NULL OR ct.ambiente = _ambiente)
       AND (cp.ambiente IS NULL OR cp.ambiente = _ambiente)
  )
  SELECT r.area_nome, r.tipo, r.entidade_id, r.title, r.status, r.due_date,
         r.project_id, r.project_name, r.cliente_nome, r.dono_nome, r.chave
    FROM resolvido r
   WHERE NOT EXISTS (
           SELECT 1
             FROM public.notificacao_envio e
            WHERE e.canal = 'google_chat'::public.notificacao_canal
              AND e.chave_idempotencia = r.chave
         )
   ORDER BY r.area_nome, r.dono_nome NULLS LAST, r.due_date NULLS LAST, r.title
$function$;

COMMENT ON FUNCTION public.avisos_para_o_chat IS
  'O que sairia no Google Chat agora, uma linha por TAREFA (nao por destinatario, '
  'ao contrario de notificacao) e ja com area, projeto, cliente e responsavel. '
  'So le: select * from avisos_para_o_chat(interval ''30 days'') e a passada seca. '
  'A chave devolvida e a de idempotencia do canal, sem destinatario, porque a '
  'mensagem e do espaco. Respeita ambiente com a mesma regra do front. A ordem ja '
  'sai por area, responsavel e prazo, que e como a mensagem agrupa.';
