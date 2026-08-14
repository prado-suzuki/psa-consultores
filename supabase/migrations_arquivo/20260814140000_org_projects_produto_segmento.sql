-- O projeto passa a guardar QUAL produto ele é.
--
-- O PROBLEMA
--    `org_projects` nunca teve coluna de produto. O modal de projeto exige
--    "Produto Contratado" (validateProjectForm em src/lib/projetosCadastro.ts),
--    mas a escolha morria em estado de React: o insert grava só
--    `ordem_servico_id` e `servico_id`. Na criação em lote é ainda mais
--    explícito — `buildLoteFormData` monta uma linha por produto e manda
--    `servico_id: ''`, então a identidade do produto some no caminho.
--
--    Consequências que apareciam na tela:
--      · o modal reabria com "Produto: Não informado", porque o produto só era
--        recuperado por dedução (`servico_id` → `produto_servico`), e projeto de
--        lote não tem `servico_id`;
--      · a coluna Produto da lista mostrava TODOS os produtos da OS
--        concatenados, não o do projeto (useOrgProjects montava o rótulo a
--        partir de `os_produtos_contratados` da OS inteira);
--      · `findProdutosJaCriados` precisava adivinhar por comparação de NOME de
--        projeto, em três formatos, e o próprio comentário lá registra o limite:
--        renomear o projeto escapava da detecção e o produto voltava a parecer
--        disponível no lote.
--
-- POR QUE UMA COLUNA, E NÃO UMA TABELA DE LIGAÇÃO
--    A relação é 1 produto por projeto — é essa a regra do lote ("um projeto por
--    produto contratado") e é o que o modal pede (Select simples, não múltiplo).
--    Tabela de ligação abriria a porta para N produtos por projeto sem que
--    nenhuma tela saiba lidar com isso.
--
-- POR QUE FK PARA produto_segmento, E NÃO PARA os_produtos_contratados
--    Apontar para a linha da OS amarraria o projeto ao contrato: trocar a OS do
--    projeto, ou remover/recontratar o produto na OS, invalidaria o vínculo.
--    O produto é catálogo (`produto_segmento`, arquétipo catalogo, sem
--    `ambiente`), e é o catálogo que o projeto identifica. A coerência
--    "o produto está contratado nesta OS" continua sendo checada na tela, que só
--    oferece os produtos da OS selecionada.
--
-- ON DELETE RESTRICT (padrão): produto de catálogo não é apagado com projeto
-- vivo em cima. Coluna NULLABLE de propósito — os projetos antigos que o
-- backfill abaixo não conseguir identificar ficam nulos e continuam caindo no
-- comportamento anterior (rótulo derivado da OS), em vez de receberem um produto
-- chutado.
--
-- RLS: nada a fazer. As policies de `org_projects` (arquétipo projeto) são por
-- linha, não por coluna; a coluna nova entra nelas automaticamente.
--
-- Reversão:
--   drop index if exists public.idx_org_projects_produto_segmento;
--   alter table public.org_projects drop column produto_segmento_id;

BEGIN;

alter table public.org_projects
  add column if not exists produto_segmento_id uuid
    references public.produto_segmento(id);

comment on column public.org_projects.produto_segmento_id is
  'Produto contratado que este projeto atende (1 por projeto). Preenchido pelo modal de projeto e pela criação em lote a partir da OS. Nulo em projeto antigo que o backfill de 20260814140000 não conseguiu identificar sem chute: nesse caso a UI ainda deriva o rótulo dos produtos da OS.';

-- Sustenta o "quais produtos desta OS já viraram projeto" do lote e o filtro por
-- produto da lista de projetos.
create index if not exists idx_org_projects_produto_segmento
  on public.org_projects (produto_segmento_id)
  where produto_segmento_id is not null;

-- ─────────────────────────────── backfill ───────────────────────────────
-- Três passadas, da mais segura para a menos. Cada uma só toca linha ainda nula,
-- e nenhuma preenche quando o resultado é ambíguo — ficar nulo é melhor que
-- gravar o produto errado, porque nulo mantém o comportamento antigo e errado
-- vira dado sujo em relatório.

-- 1) OS de produto único: não há o que ambiguar.
update public.org_projects p
   set produto_segmento_id = opc.produto_segmento_id
  from public.os_produtos_contratados opc
 where p.produto_segmento_id is null
   and p.ordem_servico_id is not null
   and opc.ordem_servico_id = p.ordem_servico_id
   and (
     select count(*) from public.os_produtos_contratados x
      where x.ordem_servico_id = p.ordem_servico_id
   ) = 1;

-- 2) Pela dedução que a tela já fazia em memória: `servico_id` →
--    `produto_servico`, restrito aos produtos DAQUELA OS. Só grava quando o
--    serviço aponta para um único produto contratado na OS — que é exatamente a
--    condição em que `resolveProdutoIdByServico` acertava.
update public.org_projects p
   set produto_segmento_id = deduzido.produto_segmento_id
  from (
    select
      alvo.id as project_id,
      min(ps.produto_segmento_id::text)::uuid as produto_segmento_id
      from public.org_projects alvo
      join public.os_produtos_contratados opc
        on opc.ordem_servico_id = alvo.ordem_servico_id
      join public.produto_servico ps
        on ps.produto_segmento_id = opc.produto_segmento_id
       and ps.servico_prestado_id = alvo.servico_id
     where alvo.produto_segmento_id is null
       and alvo.servico_id is not null
     group by alvo.id
    having count(distinct ps.produto_segmento_id) = 1
  ) deduzido
 where p.id = deduzido.project_id;

-- 3) Pelo nome do projeto, com a mesma heurística de `findProdutosJaCriados`
--    (src/lib/projetosLote.ts): o nome padrão atual é o nome do produto, e o
--    formato antigo "Cliente — OS nº — CÓDIGO — Nome" contém o rótulo
--    "CÓDIGO — Nome". Comparação sempre dentro dos produtos da própria OS, com
--    espaços colapsados e caixa ignorada. Nome que casa com dois produtos da
--    mesma OS não é preenchido.
update public.org_projects p
   set produto_segmento_id = por_nome.produto_segmento_id
  from (
    select
      alvo.id as project_id,
      min(pg.id::text)::uuid as produto_segmento_id
      from public.org_projects alvo
      join public.os_produtos_contratados opc
        on opc.ordem_servico_id = alvo.ordem_servico_id
      join public.produto_segmento pg
        on pg.id = opc.produto_segmento_id
     where alvo.produto_segmento_id is null
       and alvo.name is not null
       and (
         lower(btrim(regexp_replace(alvo.name, '\s+', ' ', 'g')))
           = lower(btrim(regexp_replace(pg.nome, '\s+', ' ', 'g')))
         or lower(btrim(regexp_replace(alvo.name, '\s+', ' ', 'g')))
              like '%' || lower(btrim(regexp_replace(pg.codigo || ' — ' || pg.nome, '\s+', ' ', 'g'))) || '%'
       )
     group by alvo.id
    having count(distinct pg.id) = 1
  ) por_nome
 where p.id = por_nome.project_id;

COMMIT;
