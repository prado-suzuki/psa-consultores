-- =============================================================================
-- Diagnóstico Patrimonial: titular "integralizador" (líder da descrição)
-- =============================================================================
-- Em descrições de imóvel com mais de um titular (composse / condomínio), um
-- dos titulares é o que INTEGRALIZA: ele lidera a redação ("[fração]% de um
-- imóvel rural... de propriedade de [integralizador]") e os demais titulares
-- passam a ser referenciados como a "área remanescente". Esta flag marca esse
-- titular; sem ela (titular único, ou imóvel não fracionado) a descrição usa a
-- forma inteira ("de propriedade de A, B e C").
--
-- "Um por imóvel": no máximo UMA titularidade marcada por âncora. Como a
-- titularidade ancora em matricula_id XOR bem_id (ver 20260528120000), são dois
-- índices únicos parciais — um por tipo de âncora.
--
-- Observação (FATO/DIREITO): um mesmo titular pode ter duas linhas na mesma
-- âncora (posse de fato + posse de direito). Com o índice único, a flag fica em
-- UMA delas — por convenção, a linha de DIREITO (o título legal comanda a
-- prosa). O mapeador da geração deduplica os titulares por pessoa.
-- =============================================================================

ALTER TABLE public.titularidade
  ADD COLUMN integralizador boolean NOT NULL DEFAULT false;

-- No máximo um titular integralizador por imóvel (âncora). Dois índices parciais
-- porque a âncora é matricula_id XOR bem_id.
CREATE UNIQUE INDEX idx_titularidade_integralizador_matricula
  ON public.titularidade (matricula_id)
  WHERE integralizador AND matricula_id IS NOT NULL;

CREATE UNIQUE INDEX idx_titularidade_integralizador_bem
  ON public.titularidade (bem_id)
  WHERE integralizador AND bem_id IS NOT NULL;

COMMENT ON COLUMN public.titularidade.integralizador IS
  'Titular que integraliza e lidera a descrição do imóvel; os demais titulares viram a área remanescente. Máx. um por âncora (índices únicos parciais).';
