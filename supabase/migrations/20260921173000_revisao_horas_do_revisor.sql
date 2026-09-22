-- 20260921173000_revisao_horas_do_revisor.sql
-- Tarefa [1] da sprint 14: a hora de quem REVISA passa a ser registrada, separada
-- da hora de quem executou.
--
-- O QUE FALTAVA. O revisor despacha a revisao pelo modal da tarefa, aprovando ou
-- devolvendo para ajustes, e o tempo que ele gastou revisando nao e gravado em
-- lugar nenhum: desaparece do esforco da tarefa. O ponto de atencao do card e
-- explicito, e e o que decide o desenho: essa hora NAO pode cair no mesmo campo
-- de `actual_hours`, senao o esforco da tarefa passa a somar coisas diferentes.
--
-- MEDIR ANTES, em 21/09/2026, em producao:
--
--   1.113 tarefas em org_tasks
--      64 com revisor designado
--      27 em 'review' ou 'em_ajuste' agora
--     459 com hora de execucao lancada (41%)
--      46 despachos de revisao, em 28 tarefas
--       0 colunas de hora de revisao (nao existe onde guardar)
--
-- POR QUE COLUNA, E NAO O `metadata` DO COMENTARIO DE DESPACHO. A alternativa
-- considerada foi pendurar a hora no `org_comments.metadata` do evento
-- 'review_adjustments'/'review_approved', que ja e escrito no momento exato do
-- despacho e cujo jsonb esta vazio nos 113 eventos existentes. Ela evitaria esta
-- migration inteira. Foi descartada por quatro motivos:
--
--   * hora e conceito de COLUNA em todo o sistema (`estimated_hours` e
--     `actual_hours` nas duas tabelas de tarefa). Guardar uma hora em coluna e
--     outra dentro de um documento faz a mesma grandeza morar em dois formatos;
--   * ler em lista fica caro: o quadro mostra hora por linha, direto do registro
--     da tarefa, e somar jsonb de comentarios por linha e outra consulta;
--   * o `types.ts` conhece coluna e nao conhece chave inventada em jsonb, ou seja
--     o compilador para de ajudar;
--   * a unica vantagem real do metadata era guardar a hora POR RODADA, e ela nao
--     se perde: o `audit_logs` grava a mudanca campo a campo, com valor antigo e
--     novo, e o comentario de despacho grava quem e quando.
--
-- A COLUNA ACUMULA, e o numero manda: sao 46 despachos em 28 tarefas, ou seja
-- 1,64 revisoes por tarefa. A tarefa volta para revisao mais de uma vez, e o que
-- interessa na tarefa e o esforco TOTAL de revisao, exatamente como `actual_hours`
-- acumula o de execucao. Quem soma e o front, que ja tem a tarefa em mao: o
-- revisor informa quanto gastou NESTA revisao e o valor entra no total.

alter table public.org_tasks
  add column if not exists review_hours numeric;

-- CHECK que o irmao nao tem, de proposito. `actual_hours` nasceu sem restricao
-- alguma e nao vou mexer nele aqui, mas a coluna nova nasce com a trava: o valor
-- vem de um campo de dialogo, e hora de revisao negativa nao e dado, e defeito.
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.org_tasks'::regclass
       and conname = 'org_tasks_review_hours_nao_negativa'
  ) then
    alter table public.org_tasks
      add constraint org_tasks_review_hours_nao_negativa
      check (review_hours is null or review_hours >= 0);
  end if;
end $$;

comment on column public.org_tasks.review_hours is
  'Horas gastas REVISANDO a tarefa, acumuladas a cada despacho do revisor. '
  'Separada de actual_hours, que e a hora de quem executou: somar as duas no '
  'mesmo campo faria o esforco da tarefa misturar dois trabalhos diferentes. '
  'Quem escreve e o revisor, ao aprovar ou devolver para ajustes.';

-- ---------------------------------------------------------------------------
-- O gatilho da RLS-06 precisa deixar a coluna passar.
-- ---------------------------------------------------------------------------
--
-- Hoje o ramo do revisor e o mais fechado do gatilho: com a tarefa em 'review',
-- ele compara NEW e OLD inteiros menos 'status' e 'updated_at', e recusa qualquer
-- outra diferenca. Ou seja, o revisor so pode mexer no status. Sem a linha abaixo,
-- gravar a hora dele seria recusado com 42501 e a mensagem "O revisor so pode
-- devolver a tarefa para ajustes".
--
-- A FROUXIDAO E DE UMA COLUNA SO, e o escopo casa exatamente: os botoes do revisor
-- so aparecem com `task.status === 'review'` (ver `currentUserIsReviewer` no
-- `TaskModal.tsx`), que e a mesma condicao deste ramo.
--
-- O OUTRO RAMO NAO GANHA A COLUNA, de proposito. O ramo do team_member em tarefa
-- delegada ja libera `estimated_hours`, `actual_hours`, `reviewer_id` e
-- `contribuinte_id`; `review_hours` fica fora porque o numero e do revisor, e quem
-- cai naquele ramo e justamente quem nao e ele.

create or replace function public.org_tasks_team_member_status_only()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF OLD.reviewer_id = v_user_id
     AND OLD.assigned_to IS DISTINCT FROM v_user_id
     AND OLD.status IS DISTINCT FROM 'done'::public.fiscal_task_status
     AND NEW.status = 'done'::public.fiscal_task_status THEN
    RAISE EXCEPTION 'O revisor nao pode concluir a tarefa; devolva para ajustes'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.reviewer_id = v_user_id
     AND OLD.assigned_to IS DISTINCT FROM v_user_id
     AND OLD.status = 'review'::public.fiscal_task_status THEN
    /* 'review_hours' entrou aqui em 21/09/2026: e a hora do proprio revisor,
       informada no despacho. Fora dela, o ramo segue recusando tudo. */
    IF (to_jsonb(NEW) - 'status' - 'updated_at' - 'review_hours')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'status' - 'updated_at' - 'review_hours') THEN
      RAISE EXCEPTION 'O revisor so pode devolver a tarefa para ajustes'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status NOT IN (
      'review'::public.fiscal_task_status,
      'em_ajuste'::public.fiscal_task_status
    ) THEN
      RAISE EXCEPTION 'O revisor so pode devolver a tarefa para ajustes'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF public.has_role_or_higher(v_user_id, 'sublider'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF OLD.created_by = v_user_id THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Nao e permitido alterar o criador da tarefa (created_by)'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  IF (to_jsonb(NEW) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id' - 'contribuinte_id')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id' - 'contribuinte_id') THEN
    RAISE EXCEPTION 'Tarefa delegada: team_member so pode alterar status, horas, revisor e contribuinte (RLS-06)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$function$;

-- GATE: a coluna nasceu com a trava, e o gatilho de fato deixa ela passar.
do $$
declare
  v_fonte text;
begin
  if not exists (
    select 1 from information_schema.columns
     where table_schema = 'public' and table_name = 'org_tasks'
       and column_name = 'review_hours'
  ) then
    raise exception 'GATE: a coluna review_hours nao foi criada';
  end if;

  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.org_tasks'::regclass
       and conname = 'org_tasks_review_hours_nao_negativa'
  ) then
    raise exception 'GATE: o CHECK de review_hours nao negativa nao existe';
  end if;

  select pg_get_functiondef(p.oid) into v_fonte
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'org_tasks_team_member_status_only';

  if v_fonte is null or position('review_hours' in v_fonte) = 0 then
    raise exception 'GATE: o gatilho da RLS-06 nao liberou review_hours para o revisor';
  end if;
end $$;
