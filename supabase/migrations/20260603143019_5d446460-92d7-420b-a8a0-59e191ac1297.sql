-- Adiciona tipo estrutural ao bloco. A numeração (CAPÍTULO I, CLÁUSULA PRIMEIRA,
-- Parágrafo Único/Primeiro...) deixa de viver no conteúdo e passa a ser resolvida
-- pelo engine na composição, a partir do tipo + ordem dos blocos no documento:
--   capitulo  -> conteúdo é só o título; engine prefixa "CAPÍTULO {romano}"
--   clausula  -> conteúdo é só o caput; engine prefixa "CLÁUSULA {ordinal}:" (contínuo, não reseta por capítulo)
--   paragrafo -> conteúdo é só o texto; engine agrupa sob a cláusula anterior e
--                rotula "Parágrafo Único:" (se for o único) ou "Parágrafo {ordinal}:" (reseta por cláusula)
--   livre     -> renderizado como está (preâmbulo, fecho, anexos etc.)

alter table public.tmpl_bloco
  add column tipo text not null default 'livre'
  constraint tmpl_bloco_tipo_check check (tipo in ('capitulo', 'clausula', 'paragrafo', 'livre'));

comment on column public.tmpl_bloco.tipo is
  'Tipo estrutural: capitulo, clausula, paragrafo ou livre. Governa a numeração automática na composição.';

create index idx_tmpl_bloco_tipo on public.tmpl_bloco(tipo);