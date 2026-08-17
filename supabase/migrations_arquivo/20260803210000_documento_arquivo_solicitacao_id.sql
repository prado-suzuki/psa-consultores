-- EDU-23 · De qual pedido veio o arquivo.
--
-- documento_arquivo é a tabela dos arquivos recebidos: o binário fica no Google
-- Cloud Storage e aqui fica o metadado (nome, tamanho, mime, checksum e o
-- endereço gcs_uri). Ela já sabe de qual cliente é o arquivo, quem mandou, de
-- que categoria é, e opcionalmente a que pessoa, bem ou matrícula está ligado.
-- Falta saber a qual PEDIDO ele responde, que é o que o consultor usa para
-- separar "o que chegou neste pedido" do "que já estava lá".
--
-- Nulo = arquivo que não veio de nenhuma solicitação. É o caso dos 43 arquivos
-- que já existem (22 ativos, 17 sem vínculo nenhum) e de tudo que a própria PSA
-- sobe com fonte = 'psa'.
--
-- ON DELETE SET NULL, e não CASCADE: apagar o cabeçalho de um pedido NÃO pode
-- apagar arquivo do cliente. É o mesmo critério das FKs que já existem na
-- tabela: bem_id, matricula_id e pessoa_id são todas set null (conferido em
-- pg_constraint em 03/08/2026).
--
-- NÃO existe coluna solicitacao_item_id, e é de propósito: ficou decidido em
-- 31/07/2026 que o arquivo recebido não se liga ao item pedido. O cliente joga
-- na gaveta e o analista classifica depois, em trabalho fora desta sprint.
-- Também NÃO existe restrição de exclusividade: um pedido tem muitos arquivos,
-- e um mesmo documento pode chegar em várias partes.
--
-- RLS: nada a fazer. As policies de documento_arquivo decidem por cliente_id e
-- fonte, e passam a valer para a coluna nova automaticamente.
--
-- Conferido em 03/08/2026: a coluna não existe.
--
-- Reversão: alter table public.documento_arquivo drop column if exists solicitacao_id;

BEGIN;

alter table public.documento_arquivo
  add column if not exists solicitacao_id uuid
    references public.solicitacao(id) on delete set null;

comment on column public.documento_arquivo.solicitacao_id is
  'De qual solicitação veio o lote. Nulo = arquivo sem pedido associado. NÃO liga o arquivo ao item pedido: a classificação item x arquivo é trabalho posterior do analista.';

-- Índice parcial no padrão da própria tabela, que já indexa por excluido = false.
create index if not exists idx_doc_arq_solicitacao
  on public.documento_arquivo (solicitacao_id)
  where excluido = false;

COMMIT;
