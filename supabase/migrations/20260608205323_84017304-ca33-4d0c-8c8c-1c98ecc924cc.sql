ALTER TABLE public.titularidade
  ADD COLUMN integralizador boolean NOT NULL DEFAULT false;

CREATE UNIQUE INDEX idx_titularidade_integralizador_matricula
  ON public.titularidade (matricula_id)
  WHERE integralizador AND matricula_id IS NOT NULL;

CREATE UNIQUE INDEX idx_titularidade_integralizador_bem
  ON public.titularidade (bem_id)
  WHERE integralizador AND bem_id IS NOT NULL;

COMMENT ON COLUMN public.titularidade.integralizador IS
  'Titular que integraliza e lidera a descrição do imóvel; os demais titulares viram a área remanescente. Máx. um por âncora (índices únicos parciais).';