-- 20260831202229_ges01a_tipos_de_aviso_de_prazo.sql
-- GES-01A, parte 1 de 3: os dois valores novos de `notificacao_tipo`.
--
-- ARQUIVO SOZINHO DE PROPOSITO. `ALTER TYPE ... ADD VALUE` nao divide transacao
-- com o USO do valor: se a funcao que grava o aviso viesse no mesmo arquivo, o
-- Postgres recusaria com "unsafe use of new value". Mesma pedra da GES-03
-- (20260826151559_org_comment_kind_osg_avisos.sql).
--
-- SEM VOLTA. Postgres nao tem DROP VALUE em enum. Se um destes nomes estiver
-- errado, o custo e uma migracao nova mais um valor morto para sempre. Por isso
-- os nomes descrevem o MARCO e nao o texto da tela: o texto muda com a revisao
-- da Patricia, o marco nao.
--
-- Nao existe hoje nenhum tipo de aviso sobre prazo de TAREFA. Conferido em
-- producao em 31/08/2026: os 13 valores do enum cobrem chamado, solicitacao e
-- documento, e `chamado_vencido` e o unico de prazo, mas de chamado. Este e o
-- "aviso 9" da Sprint 11, que a analise da Sprint 12 mandou conferir antes de
-- implementar: ele nao foi entregue, nao ha cron sobre `org_tasks` nem funcao
-- varrendo `due_date` para avisar. Logo nao ha risco de dois jobs para o mesmo
-- aviso (criterio de aceite 5).

ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'tarefa_prazo_proximo';
ALTER TYPE public.notificacao_tipo ADD VALUE IF NOT EXISTS 'tarefa_atrasada';