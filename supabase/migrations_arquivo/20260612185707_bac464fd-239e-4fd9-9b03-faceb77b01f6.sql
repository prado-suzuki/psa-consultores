alter table public.tmpl_bloco
  add column repete_colecao text,
  add column ancora text
    constraint tmpl_bloco_ancora_formato check (ancora ~ '^[A-Za-z_][A-Za-z0-9_]*$');

comment on column public.tmpl_bloco.repete_colecao is
  'Coleção do contexto sobre a qual o bloco repete na composição (uma instância por item; parágrafo repetidor). Nulo = bloco normal.';

comment on column public.tmpl_bloco.ancora is
  'Âncora estável p/ referências de numeração: outros blocos citam {{ refs.<ancora> }}. Só letras/dígitos/underscore.';