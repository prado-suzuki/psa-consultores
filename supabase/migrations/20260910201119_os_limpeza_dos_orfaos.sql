-- Limpeza dos órfãos deixados pela exclusão lógica da ordem de serviço.
--
-- Tarefa 5 de 5 da regra de 02/09/2026, subtarefa T3.
-- docs/sprints/sprint-13/TAREFA_os-hard-delete.md
--
-- ############################################################################
-- ESTA MIGRAÇÃO APAGA DADO E NÃO TEM VOLTA. É A ÚNICA DO LOTE ASSIM.
-- Aplique deliberadamente, não junto com as outras sem pensar. Se a Patricia
-- quiser guardar as OS antes, exporte por SELECT primeiro.
-- ############################################################################
--
-- POR QUE PRECISA ACONTECER: enquanto a exclusão foi lógica, a cascata das
-- chaves estrangeiras nunca disparava, e o remendo do front só valia quando a
-- exclusão passava por aquela tela. Sobrou lixo apontando para OS invisível, e
-- ele entra em qualquer relatório que some rateio sem cruzar com
-- `ordem_servico`.
--
-- MEDIDO EM PRODUÇÃO EM 10/09/2026 (números conferidos hoje, não os da tarefa):
--   33  OS marcadas como excluídas
--   26  linhas de rateio ATIVAS apontando para OS excluída
--  1800% de percentual de rateio fantasma somado por elas
--   40  produtos contratados presos em OS excluída
--    0  das 33 tem projeto vinculado
--    0  das 33 tem solicitação de documentos
-- Os dois zeros são o que garante que este DELETE não vai esbarrar nas travas
-- criadas pelas migrações 20260910160500 e 20260910161000.
--
-- No SANDBOX os números são outros (29 OS excluídas) e nenhuma delas tem
-- `wp_estudo`, que é a quinta chave estrangeira que só existe lá.
--
-- REFAZER AS CONTAGENS ANTES DE APLICAR. Elas andam: entre a redação da tarefa
-- e hoje, as marcações de representante foram de 9 para 10 e as de rateio de
-- 189 para 191. Se os números vierem muito diferentes dos de cima, pare e
-- entenda por quê antes de rodar.
--
-- Os dois primeiros DELETE são redundantes com a cascata (as duas chaves são
-- ON DELETE CASCADE) e ficam de propósito: deixam a intenção explícita e
-- limitam o estrago se a cascata mudar. Rodar duas vezes apaga zero linhas na
-- segunda, então é idempotente por natureza do predicado.

DELETE FROM public.os_produtos_contratados p
 WHERE EXISTS (SELECT 1 FROM public.ordem_servico os
                WHERE os.id = p.ordem_servico_id AND os.excluido = true);

DELETE FROM public.distribuicao_receita dr
 WHERE EXISTS (SELECT 1 FROM public.ordem_servico os
                WHERE os.id = dr.id_ordem_servico AND os.excluido = true);

DELETE FROM public.ordem_servico WHERE excluido = true;
