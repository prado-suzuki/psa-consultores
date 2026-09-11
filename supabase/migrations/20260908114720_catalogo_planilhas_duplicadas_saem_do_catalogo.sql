-- 20260908114720_catalogo_planilhas_duplicadas_saem_do_catalogo.sql
-- Sprint 13 / card 4: duas linhas do catálogo pedem a MESMA planilha que outras duas,
-- e por isso saem do catálogo.
--
-- O catálogo tem hoje quatro documentos que dependem de planilha em branco da PSA — as
-- notas de três deles dizem "conforme modelo fornecido pela PSA" com essas palavras:
--
--   b5df44cf  Relação de áreas exploradas por imóvel            (fica)
--   3917ed83  Planilha de resultado projetado (PF e PJ)         (fica — é a DRE Projetada)
--   33a6b21a  Planilha dos bens imóveis do grupo                (SAI, duplicada)
--   6d725fa7  Planilha de Diagnóstico Tributário (receitas/desp) (SAI, duplicada)
--
-- A equipe fechou em 08/09/2026 que no fim são só dois modelos, o de áreas exploradas e
-- o da DRE Projetada; os outros dois pedem a mesma planilha com outro nome. Sem esta
-- desativação, o card 4 produziria o defeito que ele existe para acabar: a lista do
-- cliente com quatro linhas de planilha, duas com botão de baixar e duas sem, e o cliente
-- mandando a mesma planilha duas vezes.
--
-- POR QUE `ativo = false` E NÃO `delete`: as duas linhas são referenciadas por
-- `solicitacao_item.item_padrao_id` nas solicitações já montadas (9 itens cada, incluindo
-- Família Krampe e Família Lunardi). Apagar levaria o histórico e o texto herdado dos
-- pedidos antigos. `ativo = false` tira da lista de "incluir do catálogo"
-- (`useOsgChecklist.ts:57-61`, que filtra `cliente_id is null and ativo`) e não mexe em
-- item já montado — o que é de propósito: item já pedido sai da solicitação por
-- "dispensar" na tela do analista, um por um, com motivo e trilha de auditoria
-- (`useDomainSolicitacao.ts` → `dispensarItem`), não por SQL.
--
-- O checklist derivado do consultor NÃO se altera: o esperado dele vem de
-- `solicitacao.itens` (`useChecklistDerivado.ts:50-51`), não do catálogo.
--
-- Idempotente: o `where ativo` faz a segunda execução ser no-op.

update public.documento_tipo
   set ativo      = false,
       updated_at = now()
 where id in ('33a6b21a-7471-4052-85ab-5727975fad6f',   -- Planilha dos bens imóveis do grupo
              '6d725fa7-6825-47b8-ab32-344d0a1f28d5')   -- Planilha de Diagnóstico Tributário
   and cliente_id is null
   and ativo;
