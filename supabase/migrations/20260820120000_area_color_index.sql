-- A cor da area passa a ser DERIVADA, e a coluna escolhida vira override.
--
-- POR QUE, com o numero que decidiu
--   `estrutura_areas.color` era preenchida por um seletor com oito amostras.
--   Medido em 19/08/2026, nas 10 areas cadastradas:
--
--     #10b981   7 areas   Area Digital, Area Fiscal, Area Fixos, Area Pontuais,
--                         OSG, PSA Consultores, Trabalhos compartilhados OSG
--     #3b82f6   1 area    Tax
--     #ef4444   1 area    PRADO ADV CIVIL
--     #f59e0b   1 area    TAX LEGAL
--
--   Sete das dez no mesmo verde, que era o TERCEIRO preset do seletor. Isso nao
--   e gosto: e o comportamento de quem clica no que esta na frente para fechar o
--   formulario. A escolha manual nao diferenciava as areas — so dava trabalho e
--   produzia repeticao. Os quatro hex acima ficam registrados aqui porque a
--   migracao os apaga, e dado apagado sem rastro e dado que ninguem consegue
--   auditar depois.
--
-- O DESENHO: duas colunas, nao uma
--   `color_index int`  o slot da paleta (1..8), atribuido no primeiro livre
--                      quando a area nasce. E ele que a tela le.
--   `color text`       override manual, agora NULO em todas as linhas. Nao ha
--                      tela para ele: quem precisar de cor especifica pede um
--                      update. De proposito — o escape serve o caso raro e nao
--                      convida ao caso comum, que foi o que produziu as sete
--                      areas verdes.
--
--   Duas colunas e nao um campo polivalente porque indice e hex sao tipos
--   diferentes com significados diferentes; guardar os dois num `text` obrigaria
--   toda leitura a adivinhar qual dos dois esta ali.
--
-- A PALETA vive no CSS (`--area-1..8` em src/index.css), nao aqui. O banco
-- guarda o SLOT, nao a cor: assim trocar um tom e editar uma linha de CSS, e nao
-- migrar dado. E a paleta e adequada porque o nome da area esta sempre ao lado
-- do ponto — a premissa esta escrita no bloco do CSS, com a lista dos seis
-- lugares onde foi verificada.
--
-- IDEMPOTENTE: `if not exists` na coluna, e o backfill so toca linha com indice
-- nulo.

alter table public.estrutura_areas
  add column if not exists color_index integer;

-- Backfill por ordem de criacao: espalha os oito tons sem colisao ate a oitava
-- area. `created_at` e NOT NULL e tem 10 valores distintos (conferido), entao a
-- ordem e estavel — nao ha empate para desempatar. O `id` no criterio e cinto de
-- seguranca, nao necessidade.
with ordenadas as (
  select id,
         ((row_number() over (order by created_at, id) - 1) % 8) + 1 as slot
    from public.estrutura_areas
   where color_index is null
)
update public.estrutura_areas a
   set color_index = o.slot
  from ordenadas o
 where a.id = o.id;

-- A escolha antiga sai. Fica nula para que `color ?? derivado` caia sempre no
-- derivado, e para que a coluna deixe de afirmar uma cor que a tela ignora.
update public.estrutura_areas set color = null where color is not null;

alter table public.estrutura_areas
  alter column color_index set not null;

comment on column public.estrutura_areas.color_index is
  'Slot da paleta de area (1..8), atribuido no primeiro livre quando a area nasce. A cor em si mora no CSS (--area-1..8 em src/index.css): o banco guarda o slot para que trocar um tom seja editar CSS, nao migrar dado. Passando de 8 areas os tons recomecam pelo menos usado — aceitavel porque o nome da area vem sempre ao lado do ponto.';

comment on column public.estrutura_areas.color is
  'OVERRIDE manual da cor da area, em hex. Nulo em todas as linhas desde 20/08/2026, quando a cor passou a ser derivada de color_index. NAO existe tela para este campo, e isso e decisao: o seletor que existia produziu 7 das 10 areas no mesmo verde. Quem precisar de cor especifica pede um update. A leitura e `color ?? derivado de color_index`.';

comment on table public.estrutura_areas is
  'Areas da estrutura organizacional (cluster -> area -> equipe). A cor de exibicao e derivada de color_index, nao escolhida; ver o comentario das duas colunas e o bloco --area-* em src/index.css.';
