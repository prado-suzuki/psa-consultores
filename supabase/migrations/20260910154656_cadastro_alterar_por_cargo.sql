-- Alterar no cadastro de cliente passa a exigir só cargo, não cluster.
--
-- Decisão da Patricia em 02/09/2026: gravar (registrar, alterar e excluir) exige
-- apenas papel `sublider` ou acima; ler continua recortado pelo cluster do
-- cliente. O registrar saiu na sprint 12 (migração 20260902192547). Esta é a
-- parte do alterar. Tarefa: docs/sprints/sprint-13/TAREFA_alterar-por-cargo.md
--
-- O QUE SAI: `cliente_visivel_para(...)` das quatro policies de UPDATE que ainda
-- o pediam e, na ordem de serviço, também a cláusula do cluster da própria OS
-- (`cluster_id = ANY (resolve_user_cluster_ids(...))`).
--
-- O QUE FICA: o guarda `excluido = false` no USING. Ele impede reeditar linha já
-- excluída e não tem nada a ver com cluster.
--
-- POR QUE NÃO AFROUXA, em cliente, contribuinte e ordem_servico: um UPDATE tem
-- WHERE, logo precisa ler a linha antes de mudá-la, e a policy de SELECT dessas
-- três continua recortando por cluster. Medido em dev e registrado no corpo de
-- `soft_delete_distribuicao_receita`: um líder sem o cluster do cliente afeta
-- 0 linhas, sem erro.
--
-- ATENÇÃO, EXCEÇÃO — representante. Nessa tabela a policy de SELECT
-- (`team_select_representante`) NÃO recorta por cluster: é só
-- `excluido = false AND has_role_or_higher(uid, 'team_member')`. Tirar o cluster
-- daqui deixa a tabela sem nenhum filtro de cluster, e sublíder de qualquer
-- cluster passa a alterar representante de qualquer cliente. Pela tela é
-- inalcançável, porque a lista de clientes é recortada e o modal não abre para
-- cliente de outro cluster; pela API, não. A correção é recortar a LEITURA de
-- representante, alinhando-a com cliente e contribuinte — fora do escopo desta
-- tarefa, levantado para a próxima sprint.
--
-- ESTA MIGRAÇÃO NÃO CONSERTA O SOFT DELETE. Ela autoriza a exclusão lógica de
-- cliente e contribuinte, que é um UPDATE (`excluido = true`), e é por isso que
-- a tarefa 3 depende desta. Mas medido no sandbox em 10/09/2026, em transação
-- revertida (líder Ricardo Migueis): marcar `excluido = true` continua falhando
-- com 42501 para quem não é admin, porque o Postgres aplica a policy de SELECT
-- também à LINHA NOVA, e a linha nova deixa de ser visível. Quem resolve isso é
-- a função SECURITY DEFINER da tarefa 3.
--
-- NÃO SE MEXE nas outras quatro tabelas do módulo (`cliente_clusters`,
-- `inscricao_contribuinte`, `distribuicao_receita`, `os_produtos_contratados`):
-- elas já alteram só por cargo.
--
-- ESTADO CONFERIDO EM 10/09/2026 por SELECT em `pg_policies`, nos DOIS bancos
-- (produção via MCP do Lovable e sandbox), com texto idêntico: as quatro
-- policies ainda pedem cluster.
--
-- Idempotente pelo par `drop policy if exists` + `create policy`.

DROP POLICY IF EXISTS rls_cliente_update ON public.cliente;
CREATE POLICY rls_cliente_update ON public.cliente
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_contribuinte_update ON public.contribuinte;
CREATE POLICY rls_contribuinte_update ON public.contribuinte
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_representante_update ON public.representante;
CREATE POLICY rls_representante_update ON public.representante
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_ordem_servico_update ON public.ordem_servico;
CREATE POLICY rls_ordem_servico_update ON public.ordem_servico
  FOR UPDATE TO authenticated
  USING ((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))
  WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
