-- =============================================================================
-- Diagnóstico Patrimonial: desacopla a matrícula do bem
-- =============================================================================
-- A matrícula passa a ser entidade de primeira classe: pode existir sem bem
-- vinculado (estado "órfã"), suportando ingestão SIGEF / importações em lote e
-- cadastros avulsos para classificação posterior. O vínculo bem↔matrícula passa
-- a ser opcional (1 bem : N matrículas) e pode ser estabelecido/desfeito pelos
-- dois lados sem destruir a matrícula.
-- =============================================================================

-- bem_id opcional -------------------------------------------------------------
ALTER TABLE public.matricula ALTER COLUMN bem_id DROP NOT NULL;

-- FK passa a SET NULL: deletar o bem devolve as matrículas ao estado órfã.
-- A cascata (deletar matrículas junto com o bem) é controlada na aplicação.
ALTER TABLE public.matricula DROP CONSTRAINT IF EXISTS matricula_bem_id_fkey;
ALTER TABLE public.matricula
  ADD CONSTRAINT matricula_bem_id_fkey
  FOREIGN KEY (bem_id) REFERENCES public.bem(id) ON DELETE SET NULL;

-- Unicidade de negócio: nº da matrícula é único por cartório.
ALTER TABLE public.matricula
  ADD CONSTRAINT matricula_cartorio_numero_unique UNIQUE (cartorio_id, numero);

-- Índice na FK para consultar matrículas por bem.
CREATE INDEX IF NOT EXISTS idx_matricula_bem_id ON public.matricula(bem_id);

COMMENT ON COLUMN public.matricula.bem_id IS 'FK opcional para bem. NULL = matrícula órfã (não vinculada).';
