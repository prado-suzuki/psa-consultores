-- 20260818103000_org_tasks_insert_criador_subtarefa.sql
-- Subtarefa: team_member nao conseguia criar nem dentro de tarefa criada por ele.
--
-- Relato de 18/08/2026 (Maria Lizot, papel team_member): abre a tarefa que ela
-- mesma criou, usa a criacao rapida da secao "Subtarefas" e recebe apenas
-- "Erro ao criar subtarefa", sem motivo na tela.
--
-- Causa raiz, confirmada em producao e reproduzida no sandbox com o JWT dela:
--   1. A criacao rapida (TaskSubtasksSection -> buildSubtaskInput, em
--      src/lib/orgSubtasks.ts) monta o payload com title, status, priority,
--      parent_task_id, project_id e client_id. NAO manda assigned_to, de
--      proposito: a linha aberta pede so o nome e o responsavel e escolhido
--      depois, na propria lista.
--   2. rls_org_tasks_insert exige admin, sublider ou acima, ou
--      assigned_to = auth.uid(). Nao tem ramo de created_by, ao contrario de
--      rls_org_tasks_select e rls_org_tasks_update, que ganharam esse ramo na
--      RLS-06 (20260715120000 / 20260715144422).
--   3. Logo, com assigned_to nulo e papel abaixo de sublider, o INSERT estoura
--      42501 "new row violates row-level security policy for table org_tasks".
--      Ser a criadora da tarefa-mae nao entra na conta.
-- Teste no sandbox (mesma policy, cluster 7666007964130682852), em transacao
-- desfeita: subtarefa sem assigned_to = 42501; a mesma subtarefa com
-- assigned_to = ela = passou.
--
-- Escopo verificado antes de escrever esta migration:
--   - Atinge os 14 usuarios com papel team_member. Desde 30/07/2026, quando a
--     secao de subtarefas entrou (commit f5bc99d1), as 11 subtarefas criadas no
--     sistema sao todas de lider ou sublider: nenhuma de team_member.
--   - Existe uma unica porta de INSERT em org_tasks no front (useCreateOrgTask,
--     src/hooks/useOrgTasks.ts). As duas funcoes que tambem inserem,
--     gerar_tarefas_projeto e delegar_chamado_gera_tarefa, sao SECURITY DEFINER
--     e nao passam por policy: seguem iguais.
--   - As quatro policies de org_tasks sao PERMISSIVE, nao existe RESTRICTIVE
--     capaz de anular este WITH CHECK.
--   - O trigger da RLS-06 (trg_org_tasks_team_member_status_only) e BEFORE
--     UPDATE apenas, e nao participa deste caso.
--   - O log de auditoria nao e um segundo bloqueio: useAuditLog.logAction
--     engole a falha em try/catch.
--
-- Decisao: acrescentar UM ramo ao WITH CHECK, o do criador, restrito a
-- subtarefa de tarefa que ele ja pode ver (org_task_visivel). O guardrail
-- existe para nao transformar a policy em "qualquer autenticado insere o que
-- quiser", ja que created_by vem do front. Com ele, o ramo novo e mais estreito
-- que o assigned_to = auth.uid() que ja vigora: nao abre criacao de tarefa de
-- topo, so de filha de tarefa visivel.
--
-- Por que org_task_visivel e nao "mae criada por mim": quem recebe a tarefa
-- delegada (assigned_to = ele) JA pode criar subtarefa hoje, desde que atribua
-- a si mesmo, porque cai no ramo assigned_to = auth.uid(). Manter o ramo novo
-- na visibilidade nao concede poder novo a esse caso, apenas destrava o mesmo
-- ato pela criacao rapida. Se a coordenacao preferir o corte mais fechado,
-- trocar a linha do org_task_visivel por:
--   AND EXISTS (SELECT 1 FROM public.org_tasks m
--                WHERE m.id = parent_task_id AND m.created_by = auth.uid())
--
-- Fora de escopo, de proposito: nao mexe em SELECT, UPDATE nem DELETE, nao cria
-- coluna, tabela, funcao ou trigger, nao altera dado nenhum e nao toca em
-- rls_audit_logs_insert. Sem mudanca de schema, nao precisa regerar types.ts.
--
-- Reversao: reaplicar o WITH CHECK anterior, que esta em
-- 00000000000000_baseline.sql (CREATE POLICY rls_org_tasks_insert), ou seja os
-- tres ramos admin / sublider+ / assigned_to = auth.uid().

DROP POLICY IF EXISTS rls_org_tasks_insert ON public.org_tasks;

CREATE POLICY rls_org_tasks_insert ON public.org_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    OR public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    OR assigned_to = auth.uid()
    OR (
      created_by = auth.uid()
      AND parent_task_id IS NOT NULL
      AND public.org_task_visivel(parent_task_id)
    )
  );

COMMENT ON POLICY rls_org_tasks_insert ON public.org_tasks IS
  'Cria tarefa: admin, sublider ou acima, ou quem sera o responsavel. O criador tambem cria, mas so subtarefa de tarefa que ele ja ve (destrava a criacao rapida da secao Subtarefas para team_member).';

-- GATE: falha a migration se a policy nao ficou com os quatro ramos.
DO $$
DECLARE
  v_check text;
BEGIN
  SELECT pg_get_expr(polwithcheck, polrelid)
    INTO v_check
    FROM pg_policy
   WHERE polrelid = 'public.org_tasks'::regclass
     AND polname = 'rls_org_tasks_insert';

  IF v_check IS NULL THEN
    RAISE EXCEPTION 'GATE: rls_org_tasks_insert nao existe apos a migration';
  END IF;

  IF v_check NOT LIKE '%created_by = auth.uid()%'
     OR v_check NOT LIKE '%org_task_visivel%'
     OR v_check NOT LIKE '%assigned_to = auth.uid()%'
     OR v_check NOT LIKE '%sublider%' THEN
    RAISE EXCEPTION 'GATE: WITH CHECK inesperado em rls_org_tasks_insert: %', v_check;
  END IF;
END $$;
