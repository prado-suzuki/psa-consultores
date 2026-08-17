-- =============================================================================
-- Diagnóstico Patrimonial: titularidade pode ancorar em bem (sem matrícula)
-- =============================================================================
-- Bens não-imóveis (Participação Societária, Arrendamento/Parceria, Outros) não
-- têm matrícula de cartório, mas ainda precisam registrar titularidade. A
-- titularidade passa a ancorar em UM de dois lados, nunca nos dois:
--   - matricula_id : titularidade do imóvel (a fonte legal é o registro)
--   - bem_id       : titularidade do bem sem matrícula
-- Isso espelha a matrícula órfã (titular sem bem) já existente: a titularidade
-- nunca exige um bem, só exige exatamente uma âncora.
--
-- As policies de titularidade são baseadas em papel (team_member+) e não
-- referenciam matricula_id, portanto cobrem o caso ancorado em bem sem alteração.
-- =============================================================================

-- matricula_id deixa de ser obrigatório (passa a ser uma das duas âncoras) ------
ALTER TABLE public.titularidade ALTER COLUMN matricula_id DROP NOT NULL;

-- nova âncora direta no bem ----------------------------------------------------
-- ON DELETE CASCADE: ao excluir o bem, suas titularidades diretas vão junto.
-- (Matrículas do bem viram órfãs via SET NULL e preservam suas titularidades.)
ALTER TABLE public.titularidade
  ADD COLUMN bem_id uuid REFERENCES public.bem(id) ON DELETE CASCADE;

-- arco exclusivo: exatamente uma âncora preenchida -----------------------------
-- As linhas existentes (matricula_id NOT NULL, bem_id NULL recém-criado) já
-- satisfazem a constraint.
ALTER TABLE public.titularidade
  ADD CONSTRAINT titularidade_ancora_xor CHECK (
    (matricula_id IS NOT NULL AND bem_id IS NULL)
    OR (matricula_id IS NULL AND bem_id IS NOT NULL)
  );

CREATE INDEX IF NOT EXISTS idx_titularidade_bem_id ON public.titularidade(bem_id);

COMMENT ON COLUMN public.titularidade.matricula_id IS 'Âncora em matrícula (imóvel). Exclusivo com bem_id.';
COMMENT ON COLUMN public.titularidade.bem_id IS 'Âncora direta no bem (sem matrícula). Exclusivo com matricula_id.';