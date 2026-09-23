-- =============================================================================
-- Prova da fronteira da GES-01B
-- =============================================================================
-- O card pedia "testes de fronteira" no "Como". Fronteira aqui e tres coisas
-- diferentes, e cada uma tem uma afirmacao propria abaixo:
--
--   1. a borda do LIMIAR: entra no dia exato, nao no anterior;
--   2. a borda da ESCADA: o gestor entra 7 dias depois do dono, nao junto;
--   3. a borda do que CONTA COMO MOVIMENTACAO: alteracao cadastral nao reinicia
--      a contagem, e comentario de gente reinicia (o de sistema nao).
--
-- Roda contra as funcoes que a migration real criou, no Postgres descartavel do
-- `run.sh`. Nenhuma afirmacao depende de dado de producao nem do sandbox.
-- =============================================================================

-- ----------------------------------------------------------------------------
-- 1. A borda do limiar
-- ----------------------------------------------------------------------------

SELECT public.afirma(
  (SELECT count(*) FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000015' AND papel = 'responsavel') = 1,
  'com 15 dias de parada e limiar 15, o responsavel entra (borda inclusiva)'
);

SELECT public.afirma(
  (SELECT count(*) FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000014') = 0,
  'com 14 dias de parada e limiar 15, ninguem entra'
);

-- ----------------------------------------------------------------------------
-- 2. A borda da escada
-- ----------------------------------------------------------------------------

SELECT public.afirma(
  (SELECT count(*) FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000021' AND papel = 'responsavel') = 1
  AND
  (SELECT count(*) FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000021' AND papel = 'gestor') = 0,
  'com 21 dias, o responsavel ja recebeu e o gestor ainda NAO (15 + 7 = 22)'
);

SELECT public.afirma(
  (SELECT count(*) FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000022' AND papel = 'gestor') = 1,
  'com 22 dias, o gestor entra (borda da escada, inclusiva)'
);

-- O atraso do gestor e parametro, e nao numero cravado na regra: com atraso 0 os
-- dois entram juntos, que era o comportamento antes da decisao de 21/09.
SELECT public.afirma(
  (SELECT count(*) FROM public.tarefas_inativas(NULL, 15, 'prod', 0)
    WHERE task_id = '44444444-0000-4000-8000-000000000015' AND papel = 'gestor') = 1,
  'com atraso 0, o gestor volta a receber junto com o dono'
);

-- ----------------------------------------------------------------------------
-- 3. A borda do que conta como movimentacao
-- ----------------------------------------------------------------------------

-- A afirmacao mais importante do arquivo. A tarefa nasceu ha 90 dias, teve
-- STATUS alterado ha 30 e TITULO alterado ha 1. Se o cadastral contasse, ela
-- sairia da fila; contando so o relevante, ela esta parada ha 30 dias.
SELECT public.afirma(
  (SELECT dias_parado FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000041' AND papel = 'responsavel') = 30,
  'alteracao cadastral de ontem NAO reinicia a contagem: a parada continua em 30 dias'
);

SELECT public.afirma(
  (SELECT o_que_mudou FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000041' AND papel = 'responsavel')
  = 'status alterado para "Em Andamento"',
  'o motivo vem do campo que mudou, com o rotulo da tela e nao o valor do enum'
);

SELECT public.afirma(
  (SELECT count(*) FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000042') = 0,
  'comentario de gente ha 2 dias tira a tarefa da fila'
);

SELECT public.afirma(
  (SELECT dias_parado FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000043' AND papel = 'responsavel') = 90,
  'comentario de SISTEMA nao conta: a tarefa segue parada ha 90 dias'
);

SELECT public.afirma(
  (SELECT o_que_mudou FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000015' AND papel = 'responsavel') IS NULL,
  'tarefa sem auditoria nenhuma devolve motivo vazio, e o corpo dira "desde a criacao"'
);

-- ----------------------------------------------------------------------------
-- 4. Status que nao alertam
-- ----------------------------------------------------------------------------

SELECT public.afirma(
  (SELECT count(*) FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id IN ('44444444-0000-4000-8000-000000000031',
                      '44444444-0000-4000-8000-000000000032',
                      '44444444-0000-4000-8000-000000000033')) = 0,
  'waiting_client, done e backlog nao alertam, mesmo paradas ha 40 dias'
);

-- ----------------------------------------------------------------------------
-- 5. A borda do projeto
-- ----------------------------------------------------------------------------

SELECT public.afirma(
  (SELECT count(*) FROM public.projetos_inativos(NULL, 30, 'prod')
    WHERE project_id = '33333333-0000-4000-8000-000000000002') = 0,
  'projeto parado ha 29 dias nao alerta com limiar 30'
);

SELECT public.afirma(
  (SELECT count(*) FROM public.projetos_inativos(NULL, 29, 'prod')
    WHERE project_id = '33333333-0000-4000-8000-000000000002') = 1,
  'o mesmo projeto alerta com limiar 29 (borda inclusiva)'
);

-- O projeto e o AGREGADO: ele so para quando a ultima tarefa aberta para. O
-- projeto das tarefas tem uma comentada ha 2 dias, entao ele nao esta parado.
SELECT public.afirma(
  (SELECT count(*) FROM public.projetos_inativos(NULL, 30, 'prod')
    WHERE project_id = '33333333-0000-4000-8000-000000000001') = 0,
  'projeto com uma tarefa movimentada ha 2 dias nao esta parado, por mais frias que estejam as outras'
);

-- ----------------------------------------------------------------------------
-- 6. O recorte de ambiente
-- ----------------------------------------------------------------------------
-- Tarefa e projeto sem cliente passam em qualquer ambiente (o filtro e
-- `IS NULL OR = _ambiente`). Com cliente de outro ambiente, saem da fila.
--
-- A tarefa nasce JA com o cliente, em vez de receber um `UPDATE` depois. O
-- motivo e de fidelidade: em producao existe o gatilho
-- `org_tasks_team_member_status_only` (RLS-06), que recusa alterar `client_id`
-- e derrubou esta prova quando ela foi verificada contra o banco real. Inserir
-- com o cliente prova a mesma coisa e nao depende de o gatilho estar ausente
-- neste schema minimo.

INSERT INTO public.cliente (id, nome, ambiente)
  VALUES ('55555555-0000-4000-8000-000000000001', 'Cliente de producao', 'prod');

INSERT INTO public.org_tasks (id, title, project_id, status, assigned_to, client_id, created_at)
  VALUES ('44444444-0000-4000-8000-000000000060', 'de cliente prod',
          '33333333-0000-4000-8000-000000000001', 'todo',
          '11111111-0000-4000-8000-000000000001',
          '55555555-0000-4000-8000-000000000001', now() - interval '20 days');

SELECT public.afirma(
  (SELECT count(*) FROM public.tarefas_inativas(NULL, 15, 'prod', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000060') > 0
  AND
  (SELECT count(*) FROM public.tarefas_inativas(NULL, 15, 'dev', 7)
    WHERE task_id = '44444444-0000-4000-8000-000000000060') = 0,
  'tarefa de cliente prod aparece na varredura prod e desaparece na dev'
);

DO $$ BEGIN RAISE NOTICE 'prova da fronteira da GES-01B: todas as afirmacoes passaram'; END $$;
