-- Apagar ordem de serviço passa a exigir só cargo, e alcança linha já marcada.
--
-- Tarefa 5 de 5 da regra de 02/09/2026, subtarefa T2.
-- docs/sprints/sprint-13/TAREFA_os-hard-delete.md
--
-- Sai o guarda `excluido = false` do USING, que impede apagar linha que já
-- esteja marcada — e é justamente essa a limpeza que a tarefa quer permitir.
--
-- ESTA MIGRAÇÃO TAMBÉM REMOVE O FILTRO DE CLUSTER, e aqui isso é inofensivo:
-- a policy de SELECT de `ordem_servico` continua recortando por cluster
-- (`cliente_visivel_para(id_cliente) OR cluster_id = ANY(...)`), e um DELETE tem
-- WHERE, logo não alcança linha que a leitura esconde. Diferente de
-- `representante`, cuja leitura não recorta — ver
-- 20260910160000_representante_e_rateio_hard_delete.sql.
--
-- O QUE JÁ ESTÁ CERTO NO BANCO e não precisa de migração, conferido em produção
-- em 10/09/2026 — tudo que aponta para `ordem_servico`:
--   distribuicao_receita      -> CASCADE    (vai junto)
--   os_produtos_contratados   -> CASCADE    (vai junto)
--   org_projects              -> NO ACTION  (bloqueia; é a trava do projeto)
--   solicitacao               -> RESTRICT   (pela migração 20260910160500)
--
-- ATENÇÃO, UMA QUINTA CHAVE QUE A TAREFA NÃO LISTA: no SANDBOX existe
-- `wp_estudo_ordem_servico_id_fkey`, com NO ACTION, criada pela migração
-- 20260903212734_pt02_estudo_exige_ordem_servico.sql — um dia DEPOIS de a
-- tarefa ser escrita. Ela ainda NÃO existe em produção. Quando a funcionalidade
-- do WP subir, `wp_estudo` vira uma terceira trava para apagar OS, e vai
-- precisar da frase dela no catálogo de mensagens como as outras duas. Hoje, no
-- sandbox, nenhuma das OS marcadas como excluídas tem `wp_estudo`, então a
-- limpeza não trava por causa disso. Registrado no relatório de gaps.
--
-- A TRAVA DO PROJETO NÃO PRECISA DE MIGRAÇÃO: NO ACTION e RESTRICT bloqueiam
-- igual, porque a constraint não é adiável. O que falta é a FRASE, que é código
-- (`src/lib/rlsMessages.ts`), não schema.
--
-- Idempotente pelo par `drop policy if exists` + `create policy`.

DROP POLICY IF EXISTS rls_ordem_servico_delete ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_delete ON public.ordem_servico
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
