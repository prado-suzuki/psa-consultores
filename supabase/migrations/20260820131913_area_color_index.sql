-- 20260820131913_area_color_index.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Mesmo NOME, timestamp diferente, já existia no repositório em:
--   supabase/migrations/20260820120000_area_color_index.sql
-- O arquivo antigo fica como histórico; o que vale para o ledger é este.
--
-- Não editar para corrigir nada: correção vem em migration nova.

alter table public.estrutura_areas
  add column if not exists color_index integer;

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

update public.estrutura_areas set color = null where color is not null;

alter table public.estrutura_areas
  alter column color_index set not null;

comment on column public.estrutura_areas.color_index is
  'Slot da paleta de area (1..8), atribuido no primeiro livre quando a area nasce. A cor em si mora no CSS (--area-1..8 em src/index.css): o banco guarda o slot para que trocar um tom seja editar CSS, nao migrar dado. Passando de 8 areas os tons recomecam pelo menos usado — aceitavel porque o nome da area vem sempre ao lado do ponto.';

comment on column public.estrutura_areas.color is
  'OVERRIDE manual da cor da area, em hex. Nulo em todas as linhas desde 20/08/2026, quando a cor passou a ser derivada de color_index. NAO existe tela para este campo, e isso e decisao: o seletor que existia produziu 7 das 10 areas no mesmo verde. Quem precisar de cor especifica pede um update. A leitura e `color ?? derivado de color_index`.';

comment on table public.estrutura_areas is
  'Areas da estrutura organizacional (cluster -> area -> equipe). A cor de exibicao e derivada de color_index, nao escolhida; ver o comentario das duas colunas e o bloco --area-* em src/index.css.';
