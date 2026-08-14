-- Parágrafos 100% estruturais: duas colunas novas em tmpl_bloco.
--
-- repete_colecao — bloco PARÁGRAFO REPETIDOR: na composição, o bloco expande em
--   uma instância por item da coleção do contexto (ex.: 'integralizacoes' gera um
--   parágrafo por sócio que integraliza), ANTES da numeração — "Parágrafo
--   Segundo/Terceiro…" sai da numeração estrutural de sempre, nunca de cálculo
--   no mapeador de dados. O conteúdo é escrito como o texto de UM item
--   ({{ socio.nome }}…), e {{ ref }} é o número do próprio parágrafo.
--
-- ancora — referências de numeração entre blocos: outro bloco escreve
--   {{ refs.<ancora> }} e recebe a numeração REAL deste bloco na composição
--   ("Cláusula Quinta", "parágrafo segundo") — atualiza sozinha se a ordem mudar.
--   Precisa caber num caminho de placeholder: só letras/dígitos/underscore.

alter table public.tmpl_bloco
  add column repete_colecao text,
  add column ancora text
    constraint tmpl_bloco_ancora_formato check (ancora ~ '^[A-Za-z_][A-Za-z0-9_]*$');

comment on column public.tmpl_bloco.repete_colecao is
  'Coleção do contexto sobre a qual o bloco repete na composição (uma instância por item; parágrafo repetidor). Nulo = bloco normal.';

comment on column public.tmpl_bloco.ancora is
  'Âncora estável p/ referências de numeração: outros blocos citam {{ refs.<ancora> }}. Só letras/dígitos/underscore.';
