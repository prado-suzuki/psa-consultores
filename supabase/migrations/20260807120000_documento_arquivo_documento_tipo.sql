-- Classificação no momento do vínculo: que documento é este arquivo.
--
-- Decisão de 07/08/2026, derivada de docs/planos/cadastro-vinculo-documentos.md.
-- Até aqui o modo Classificar respondia só "de quem é o arquivo" (pessoa_id,
-- bem_id, matricula_id ou a marca triado_em). "Que documento ele é" não tinha
-- onde ser gravado: o seletor de tipo do DocUploadDialog é hardcoded no front
-- (src/components/equipe/osg/documentos/docTipos.ts) e o valor escolhido é
-- descartado, como o próprio comentário de lá admite.
--
-- POR QUE FK PARA documento_tipo E NÃO UM TEXTO LIVRE
--    O catálogo já existe e é real: 67 linhas com codigo, documento,
--    granularidade, grupo e categoria, hoje usado do lado do PEDIDO (checklist e
--    solicitação). Gravar texto livre criaria um segundo vocabulário para a
--    mesma coisa, que é exatamente o problema que a EDU-19/EDU-20 resolveu ao
--    renomear checklist_item_padrao para documento_tipo.
--    Com a FK, o par (documento_tipo_id, pessoa_id) do arquivo casa com o par
--    (item_padrao_id, pessoa_id) do checklist_cliente_item: "pedi o CPF do João"
--    passa a poder ser dado como recebido sem ninguém amarrar item a arquivo à
--    mão numa tela separada. Isso não é feito nesta migration, mas é o que ela
--    destrava.
--
-- POR QUE NULÁVEL
--    Classificar é OPCIONAL e não trava o vínculo (decisão de 07/08/2026).
--    Varrer o balde ligando oito arquivos a uma pessoa continua sendo uma ação
--    só; quem quiser deixa o tipo em branco e volta depois. Nulo significa
--    "ninguém classificou ainda", e as 43 linhas existentes ficam assim.
--
-- ON DELETE SET NULL, no mesmo padrão de checklist_item_id e solicitacao_id
--    desta tabela: aposentar um tipo do catálogo não pode derrubar o arquivo.
--    (documento_tipo tem `ativo` justamente para aposentar sem apagar, então o
--    caso é raro; o comportamento fica definido de qualquer forma.)
--
-- NÃO REUSAR checklist_item_id PARA ISTO
--    Ele aponta para checklist_cliente_item, que é a INSTÂNCIA por cliente e
--    está marcada para reescrita no plano. Tipo do arquivo é o catálogo, não a
--    instância.
--
-- A CONSTRAINT documento_arquivo_um_dono_apenas NÃO É AFETADA: tipo e dono são
-- eixos ortogonais. Um CPF classificado e ainda sem dono é um estado válido.
--
-- RLS: nada a fazer. As policies de documento_arquivo decidem por cliente_id e
-- fonte, e passam a valer para a coluna nova automaticamente. documento_tipo é
-- catálogo interno legível por team_member, que é quem opera esta tela.
--
-- Reversão:
--   drop index if exists public.idx_documento_arquivo_tipo;
--   alter table public.documento_arquivo drop column documento_tipo_id;

BEGIN;

alter table public.documento_arquivo
  add column if not exists documento_tipo_id uuid
    references public.documento_tipo(id) on delete set null;

comment on column public.documento_arquivo.documento_tipo_id is
  'Que documento este arquivo é (CPF, RG/CNH, comprovante de endereço...), referenciando o catálogo documento_tipo. Nulo = ainda não classificado; classificar é opcional e não bloqueia o vínculo. Ortogonal ao dono: responde "o que é", não "de quem é".';

-- Parcial em excluido = false, no mesmo padrão dos quatro índices que a tabela
-- já tem: arquivo excluído nunca entra em consulta de leitura.
create index if not exists idx_documento_arquivo_tipo
  on public.documento_arquivo (documento_tipo_id)
  where excluido = false;

COMMIT;
