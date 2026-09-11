-- Representante e rateio passam a apagar de vez — FASE 1 (reversível).
--
-- Tarefa 4 de 5 da regra de 02/09/2026, subtarefa T1.
-- docs/sprints/sprint-13/TAREFA_representante-e-rateio-hard-delete.md
--
-- Decisão da Patricia em 02/09: só `cliente` e `contribuinte` guardam linha
-- excluída. Estas duas são as fáceis — nenhuma chave estrangeira aponta para
-- elas, então apagar não derruba nada e não é barrado por nada.
--
-- ESTA FASE NÃO APAGA NADA. Muda o comportamento daqui para a frente: sai o
-- guarda `excluido = false` do USING, que hoje impede apagar linha que já esteja
-- marcada. A coluna continua existindo e as linhas já marcadas continuam onde
-- estão, invisíveis como sempre foram. Totalmente reversível. A fase 2 (que
-- apaga as linhas e derruba a coluna) está FORA DESTA SPRINT por recomendação
-- da própria tarefa, e o SQL dela está no relatório de gaps.
--
-- ============================================================================
-- ATENÇÃO — AQUI TAMBÉM SAI O FILTRO DE CLUSTER, E A TAREFA NÃO DIZ ISSO
-- ============================================================================
-- O texto da tarefa afirma: "As permissões de DELETE das duas já existem e já
-- são só por cargo. O que falta é tirar o guarda `excluido = false`."
--
-- Isso é verdade para `distribuicao_receita`. NÃO é para `representante`:
-- conferido em 10/09/2026 nos dois bancos, `rls_representante_delete` é
--   excluido = false AND cargo >= sublider AND cliente_visivel_para(id_cliente)
-- O SQL da tarefa, transcrito abaixo sem alteração, remove os dois.
--
-- Em `distribuicao_receita` isso não afrouxa: a policy de SELECT dela recorta
-- por cluster através da OS, e um DELETE tem WHERE, logo não alcança linha que
-- a leitura esconde.
--
-- Em `representante` afrouxa, porque a policy de SELECT dessa tabela
-- (`team_select_representante`) é só `excluido = false AND cargo >=
-- team_member`, sem cluster. Somando esta migração à tarefa 1, a tabela fica
-- sem nenhum filtro de cluster: sublíder de qualquer cluster passa a alterar e
-- apagar representante de qualquer cliente. Pela tela é inalcançável (a lista
-- de clientes é recortada e o modal não abre para cliente de fora); pela API,
-- não. A correção proposta — recortar a LEITURA de representante, alinhando-a
-- com cliente e contribuinte — está no relatório de gaps, para decisão.
-- ============================================================================
--
-- CONFERIDO EM 10/09/2026:
--   - Nenhuma FK aponta para `representante` nem para `distribuicao_receita`.
--   - Os triggers de `representante` são os dois BEFORE UPDATE
--     (`trg_representante_block_disable_acesso_chamados` e
--     `update_representante_updated_at`); nenhum dispara em DELETE.
--     `distribuicao_receita` não tem trigger.
--   - Linhas já marcadas em produção: 10 em `representante` e 191 em
--     `distribuicao_receita`, 201 no total. A tarefa registrava 9 e 189 (198):
--     os números andaram, como ela mesma avisava. Medir de novo antes da fase 2,
--     que é a que apaga.
--
-- FALTA O FRONT para a conversão valer na tela (subtarefa T2 da tarefa, em
-- `src/hooks/useSaveClientTransaction.ts`): trocar `softDeleteVerificado` e
-- `softDeleteViaRpc` por `.delete()` nos três pontos e remover os 3 filtros
-- `.eq('excluido', false)` dessas duas tabelas. Sem isso a tela continua
-- marcando em vez de apagar, e esta migração é inócua — não quebra nada.
--
-- Idempotente pelo par `drop policy if exists` + `create policy`.

DROP POLICY IF EXISTS rls_representante_delete ON public.representante;
CREATE POLICY rls_representante_delete ON public.representante
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));

DROP POLICY IF EXISTS rls_distribuicao_receita_delete ON public.distribuicao_receita;
CREATE POLICY rls_distribuicao_receita_delete ON public.distribuicao_receita
  FOR DELETE TO authenticated
  USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));
