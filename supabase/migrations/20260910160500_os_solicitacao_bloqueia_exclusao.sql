-- Solicitação de documentos passa a bloquear a exclusão da OS.
--
-- Tarefa 5 de 5 da regra de 02/09/2026, subtarefa T1b.
-- docs/sprints/sprint-13/TAREFA_os-hard-delete.md
--
-- Segunda trava decidida em 02/09: "se tiver solicitação de documentos, não
-- deixar apagar a OS". Vale para QUALQUER solicitação, aberta ou encerrada — e
-- é isso que a torna simples, porque cabe na própria chave estrangeira, sem
-- gatilho e sem função.
--
-- Hoje a chave está como SET NULL: a solicitação sobrevivia e ficava órfã do
-- vínculo. Passa a RESTRICT.
--
-- POR QUE NÃO VIROU GATILHO: a primeira versão da regra valia só para
-- solicitação em aberto, e situação é coisa que chave estrangeira não lê. Isso
-- exigiria um gatilho SECURITY DEFINER, porque `solicitacao` tem RLS e uma
-- contagem feita sem isso devolveria zero para quem não enxerga a linha,
-- deixando a trava passar batido. A decisão de bloquear sempre eliminou o
-- gatilho, a função e esse risco.
--
-- MEDIDO EM PRODUÇÃO EM 10/09/2026:
--   - 8 solicitações têm `ordem_servico_id` preenchido, concentradas em
--     5 ordens de serviço distintas. São essas 5 que passam a ser
--     inexcluíveis. A tarefa registrava 4 — o número subiu.
--   - NENHUMA das 33 OS marcadas como excluídas tem solicitação, então a
--     limpeza dos órfãos (migração 20260910201119) não trava por causa disto.
--   - Nome da constraint conferido nos dois bancos:
--     `solicitacao_ordem_servico_id_fkey`.
--
-- A FRASE PARA O USUÁRIO é código, não migração: entra em
-- `src/lib/rlsMessages.ts`, na lista REGRAS_DE_NEGOCIO, casando pelo nome da
-- constraint, e `23503` precisa entrar em CODIGOS_DE_REGRA (que hoje cobre só
-- 23514, 23505 e P0001). Sem isso o bloqueio estoura erro cru na tela. Está no
-- relatório de gaps como pendência de front desta tarefa.
--
-- Idempotente pelo par `drop constraint if exists` + `add constraint`.

ALTER TABLE public.solicitacao
  DROP CONSTRAINT IF EXISTS solicitacao_ordem_servico_id_fkey;

ALTER TABLE public.solicitacao
  ADD CONSTRAINT solicitacao_ordem_servico_id_fkey
  FOREIGN KEY (ordem_servico_id) REFERENCES public.ordem_servico(id)
  ON DELETE RESTRICT;
