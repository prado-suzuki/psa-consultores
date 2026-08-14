ALTER TABLE public.etapa_responsaveis DROP CONSTRAINT IF EXISTS etapa_responsaveis_papel_check;
ALTER TABLE public.etapa_responsaveis ADD CONSTRAINT etapa_responsaveis_papel_check
  CHECK (papel = ANY (ARRAY['executado'::text, 'aprovado'::text, 'executor'::text, 'aprovador'::text, 'revisor'::text]));