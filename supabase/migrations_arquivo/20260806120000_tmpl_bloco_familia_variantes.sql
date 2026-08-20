-- Família de variantes de um bloco: a mesma cláusula com N redações, escolhidas
-- pelo engine conforme o ITEM que está sendo descrito.
--
-- O PROBLEMA
-- A descrição de imóvel tem uma redação por caso (rural x urbano, propriedade
-- exclusiva x condomínio, propriedade x direitos de escritura não averbada), e o
-- caso varia de imóvel para imóvel DENTRO do mesmo documento. Quem monta o
-- modelo não pode escolher: ele menciona "imóveis" uma vez e o engine resolve.
--
-- POR QUE NÃO AS SOLUÇÕES MAIS ÓBVIAS
-- 1) Cada variante como um bloco irmão em tmpl_documento_bloco: o modelo passaria
--    a listar 8 parágrafos que na prática são um, e cada um seria um repetidor
--    sobre a MESMA coleção, o que o engine não suporta (dois repetidores sobre a
--    mesma coleção disputam o carimbo do {{ ref }}, ver src/lib/templates/repetidor.ts).
-- 2) Variante como linha de tmpl_bloco_versao: misturaria dois eixos ortogonais
--    (versão é história no tempo, variante é qual caso), e numero_versao/atual
--    passariam a valer por (bloco, variante). "v5 do bloco" deixaria de
--    significar coisa alguma, e snapshot_versoes_blocos viraria mapa de N ponteiros.
-- 3) Ramificação inline no conteúdo ({{#imovel.urbano}}…): funciona hoje sem
--    migration, mas o caso fica enterrado na prosa. Não é verificável por
--    máquina, e quem vai montar modelo é uma IA lendo o catálogo de blocos.
--
-- A FORMA ESCOLHIDA
-- Cada variante continua sendo um bloco de verdade (linha em tmpl_bloco, com
-- histórico próprio em tmpl_bloco_versao, override próprio e entrada própria no
-- snapshot: nada do que já funciona muda). O que muda é só o que o modelo
-- referencia: a CABEÇA da família. Ela carrega o repete_colecao e é quem entra em
-- tmpl_documento_bloco; os membros são conteúdo alternativo, resolvidos por item
-- na expansão dos repetidores.
--
-- O SELETOR É jsonb, E NÃO COLUNAS POR EIXO
-- Colunas fixas (tipo_imovel, titularidade, titulo) seriam mais fáceis de checar,
-- mas cravariam o domínio de imóvel no schema de template, que é agnóstico de
-- documento por projeto (ver src/lib/templates/types.ts). O seletor é um mapa
-- campo => valor esperado, avaliado contra os campos do item, no mesmo espírito
-- declarativo de tmpl_flag (entidade/campo/valor), com duas diferenças que são o
-- ponto todo: é avaliado por ITEM, não uma vez por documento, e aceita mais de
-- uma condição. Objeto vazio = variante padrão (atende qualquer caso).
--
-- O QUE ESTA MIGRATION NÃO GARANTE
-- Que tmpl_documento_bloco só aponte para cabeças, nunca para membros: exigiria
-- trigger entre tabelas. Fica com a aplicação (e a Biblioteca já sabe esconder
-- blocos que não devem aparecer soltos, como faz com os derivados de override).
-- Também não garante que TODA combinação de caso tenha uma variante: totalidade
-- é checagem de aplicação, junto do validador de modelo montado.
--
-- Reversão:
--   drop trigger if exists trg_tmpl_bloco_familia_um_nivel on public.tmpl_bloco;
--   drop function if exists public.tmpl_bloco_familia_um_nivel();
--   drop index if exists public.uq_tmpl_bloco_familia_seletor;
--   drop index if exists public.uq_tmpl_bloco_familia_ordem;
--   drop index if exists public.idx_tmpl_bloco_familia_id;
--   alter table public.tmpl_bloco
--     drop column variante_ordem, drop column variante_rotulo,
--     drop column variante_seletor, drop column familia_id;

BEGIN;

alter table public.tmpl_bloco
  add column familia_id uuid references public.tmpl_bloco(id) on delete cascade,
  add column variante_seletor jsonb,
  add column variante_rotulo text,
  add column variante_ordem integer;

-- Membro sem cabeça não tem sentido nenhum (viraria um bloco solto na Biblioteca
-- com uma redação parcial), então a cabeça leva os membros junto: cascade, e não
-- o set null que bloco_origem_id usa para derivação.
comment on column public.tmpl_bloco.familia_id is
  'Cabeça da família de variantes deste bloco. Nulo = bloco normal (comportamento de sempre). Preenchido = este bloco é UMA variante, e quem entra no modelo é a cabeça.';

comment on column public.tmpl_bloco.variante_seletor is
  'Condições que fazem esta variante ser a escolhida, como mapa campo => valor esperado, avaliado contra o item da coleção na expansão. Objeto vazio = variante padrão (atende qualquer caso).';

comment on column public.tmpl_bloco.variante_rotulo is
  'Rótulo curto do caso ("Rural, condomínio, propriedade"), para a Biblioteca e para quem monta o modelo.';

comment on column public.tmpl_bloco.variante_ordem is
  'Ordem de avaliação dentro da família (menor primeiro). A variante padrão fica por último, senão ela captura todos os casos.';

-- As quatro colunas andam juntas: ou o bloco é normal e nenhuma está preenchida,
-- ou é variante e tem seletor e ordem. O rótulo fica opcional.
alter table public.tmpl_bloco
  add constraint tmpl_bloco_variante_coerente check (
    (familia_id is null
      and variante_seletor is null
      and variante_rotulo is null
      and variante_ordem is null)
    or (familia_id is not null
      and variante_seletor is not null
      and variante_ordem is not null)
  ),
  add constraint tmpl_bloco_familia_nao_auto check (
    familia_id is null or familia_id <> id
  ),
  -- Quem repete é a cabeça: a variante é só o texto de uma instância. Duas
  -- expansões sobre a mesma coleção disputariam o {{ ref }}.
  add constraint tmpl_bloco_variante_nao_repete check (
    familia_id is null or repete_colecao is null
  ),
  add constraint tmpl_bloco_variante_seletor_objeto check (
    variante_seletor is null or jsonb_typeof(variante_seletor) = 'object'
  );

create index idx_tmpl_bloco_familia_id
  on public.tmpl_bloco (familia_id);

-- Duas variantes com o mesmo seletor na mesma família = escolha ambígua na
-- geração. Melhor barrar na escrita do que decidir por sorte no contrato.
create unique index uq_tmpl_bloco_familia_seletor
  on public.tmpl_bloco (familia_id, variante_seletor)
  where familia_id is not null;

create unique index uq_tmpl_bloco_familia_ordem
  on public.tmpl_bloco (familia_id, variante_ordem)
  where familia_id is not null;

-- Família é de um nível só: variante de variante quebraria a resolução (o
-- resolvedor procura membros da cabeça, não desce a árvore). Precisa de trigger
-- porque check não olha outra linha.
create or replace function public.tmpl_bloco_familia_um_nivel()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  cabeca_e_variante boolean;
  tem_variantes boolean;
begin
  if new.familia_id is null then
    return new;
  end if;

  select familia_id is not null
    into cabeca_e_variante
    from public.tmpl_bloco
   where id = new.familia_id;

  if coalesce(cabeca_e_variante, false) then
    raise exception 'Família de blocos é de um nível só: % já é variante de outra família', new.familia_id;
  end if;

  select exists (select 1 from public.tmpl_bloco where familia_id = new.id)
    into tem_variantes;

  if tem_variantes then
    raise exception 'Bloco % é cabeça de família e não pode virar variante de outro', new.id;
  end if;

  return new;
end;
$$;

create trigger trg_tmpl_bloco_familia_um_nivel
  before insert or update of familia_id on public.tmpl_bloco
  for each row execute function public.tmpl_bloco_familia_um_nivel();

COMMIT;
