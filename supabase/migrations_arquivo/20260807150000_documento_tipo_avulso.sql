-- Documento pedido à mão também ganha tipo: o catálogo passa a aceitar linhas
-- avulsas, de um cliente só.
--
-- Decisão de 07/08/2026, continuação de 20260807120000 (documento_tipo_id no
-- arquivo). Ver docs/planos/cadastro-vinculo-documentos.md §11 e §12.
--
-- O PROBLEMA
--    `documento_arquivo.documento_tipo_id` é FK para `documento_tipo`. Item de
--    catálogo tem linha lá; item pedido à mão NÃO tem (decisão 6 de
--    docs/planos/fluxo-solicitacao-documentos.md: item manual entra com o texto
--    na própria linha e `item_padrao_id` nulo). Resultado: um arquivo que
--    responde a um pedido manual não tem como ser classificado, e o item fica
--    pendente para sempre mesmo com o arquivo vinculado. Como pedido manual é
--    justamente o caso fora do padrão, é onde a cobrança mais importa.
--
-- POR QUE O VÍNCULO VEM DESTE LADO, E NÃO POR solicitacao_item.item_padrao_id
--    Seria natural apontar o item manual para a linha nova de catálogo. Mas
--    `item_padrao_id` É a definição de "veio do catálogo" no código
--    (src/lib/solicitacao.ts:195 `doCatalogo`, :384 a herança da edição, :476 e
--    :488 o filtro por produto). Preenchê-lo faria o item manual passar a ser
--    tratado como item de catálogo em todos esses lugares: a edição do nome
--    entraria no caminho de herança, e o texto que hoje é dele viraria
--    sobrescrita. A sprint de solicitação acabou de assentar esse
--    comportamento, e o pedido foi explícito: o comportamento atual não muda.
--    Então `solicitacao_item` fica INTOCADO e a referência mora na linha nova.
--
-- AS DUAS COLUNAS
--    cliente_id          nulo = catálogo padrão (os 67 de sempre); preenchido =
--                        avulso daquele cliente. É este campo que todo leitor de
--                        LISTA passa a filtrar por `is null`, e é o que preserva
--                        o comportamento atual em todas as telas.
--    solicitacao_item_id de qual pedido manual a linha nasceu. É o escopo fino
--                        pedido ("os manuais só visíveis para aquela
--                        solicitação"): a linha avulsa não é alcançável por
--                        busca no catálogo, só por este vínculo.
--
--    A check constraint amarra as duas: ou a linha é padrão (as duas nulas), ou
--    é avulsa (as duas preenchidas). Não existe meio-termo válido.
--
-- SOBRE `codigo`, QUE É ÚNICO GLOBAL
--    O seed do catálogo depende de `ON CONFLICT (codigo)`, então o índice único
--    não pode virar parcial sem quebrar a reexecução. As linhas avulsas usam
--    'avulso-<solicitacao_item_id>', único por construção. Nada a mudar no
--    índice.
--
-- ON DELETE CASCADE nos dois lados: a linha avulsa não tem vida própria. Apagou
-- o cliente ou o item pedido, ela não significa mais nada. (Diferente de
-- documento_arquivo.documento_tipo_id, que é SET NULL: lá o arquivo sobrevive.)
--
-- O QUE ISTO HABILITA DEPOIS, e é motivo declarado do pedido: com todos os
-- avulsos numa tabela só, dá para perguntar quais nomes se repetem entre
-- clientes e promover ao catálogo padrão o que virou praxe:
--    select documento, count(distinct cliente_id)
--      from public.documento_tipo where cliente_id is not null
--     group by 1 order by 2 desc;
--
-- RLS: nada a fazer. "team_member+ can write documento_tipo" já é `for all`, e
-- as colunas novas entram nela automaticamente. A linha avulsa é catálogo
-- interno, como as outras; quem não pode ver o catálogo continua não podendo.
--
-- Reversão:
--   delete from public.documento_tipo where cliente_id is not null;
--   alter table public.documento_tipo drop constraint documento_tipo_avulso_completo;
--   drop index if exists public.uq_documento_tipo_solicitacao_item;
--   drop index if exists public.idx_documento_tipo_cliente;
--   alter table public.documento_tipo drop column cliente_id, drop column solicitacao_item_id;

BEGIN;

alter table public.documento_tipo
  add column if not exists cliente_id uuid
    references public.cliente(id) on delete cascade,
  add column if not exists solicitacao_item_id uuid
    references public.solicitacao_item(id) on delete cascade;

comment on column public.documento_tipo.cliente_id is
  'Nulo = item do catálogo padrão, visível a todos. Preenchido = documento avulso, pedido à mão para este cliente. Todo leitor de LISTA do catálogo filtra `cliente_id is null`; a linha avulsa só é alcançada pelo vínculo com o item pedido.';

comment on column public.documento_tipo.solicitacao_item_id is
  'De qual item manual da solicitação esta linha avulsa nasceu. Nulo no catálogo padrão. É o escopo: a linha avulsa pertence àquela solicitação e não vaza para a montagem de outras.';

alter table public.documento_tipo
  add constraint documento_tipo_avulso_completo
  check ((cliente_id is null) = (solicitacao_item_id is null));

comment on constraint documento_tipo_avulso_completo on public.documento_tipo is
  'Ou a linha é do catálogo padrão (as duas colunas nulas), ou é avulsa de um pedido manual (as duas preenchidas). Meio-termo seria uma linha avulsa sem escopo, invisível para quem a criou.';

-- Um pedido manual gera no máximo um tipo. Sem isto, uma reexecução do backfill
-- ou um clique duplo em "adicionar" duplicaria o tipo e o arquivo poderia
-- apontar para a cópia errada.
create unique index if not exists uq_documento_tipo_solicitacao_item
  on public.documento_tipo (solicitacao_item_id)
  where solicitacao_item_id is not null;

-- Sustenta o `cliente_id is null` dos leitores de lista e o agrupamento da
-- análise de recorrência.
create index if not exists idx_documento_tipo_cliente
  on public.documento_tipo (cliente_id)
  where cliente_id is not null;

-- ─────────────────────────── backfill dos manuais já pedidos ───────────────────────────
-- Sem isto o recurso só valeria para pedido manual criado de hoje em diante, e
-- as solicitações em andamento ficariam com o buraco que a migration existe
-- para fechar. Idempotente pelo índice único acima.
insert into public.documento_tipo (
  codigo, cliente_id, solicitacao_item_id, modulo, entidade, documento, nota,
  granularidade, grupo, ordem, obrigatorio_default, confidencial, ativo
)
select
  'avulso-' || si.id,
  s.cliente_id,
  si.id,
  'Avulso da solicitação',
  coalesce(si.entidade, ''),
  si.documento,
  si.nota,
  si.granularidade,
  si.grupo,
  si.ordem,
  false,
  false,
  true
from public.solicitacao_item si
join public.solicitacao s on s.id = si.solicitacao_id
where si.item_padrao_id is null
  -- `documento` é NOT NULL só no item manual; a guarda evita quebrar caso exista
  -- linha antiga sem texto.
  and si.documento is not null
  and not exists (
    select 1 from public.documento_tipo t where t.solicitacao_item_id = si.id
  );

COMMIT;
