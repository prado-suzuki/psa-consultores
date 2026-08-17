-- ============================================================================
-- roi_snapshots — histórico de mensurações de ROI, SEPARADO do what-if.
--
-- Contexto: hoje os snapshots viviam na tabela `process_scenarios` (criada para
-- cenários what-if), com NOT NULLs de cenário que travavam o INSERT do app.
-- Esta tabela é limpa e dedicada. `process_scenarios` permanece intacta para o
-- what-if.
--
-- Modelo (ver docs/planos/2026-06-25-roi-doctor-projeto-e-botao-salvar.md):
--   * snapshot é POR PROCESSO (process_id).
--   * `checkpoint_id` agrupa as linhas de um mesmo "Salvar":
--       - escopo 'process' (página do processo)  → 1 linha.
--       - escopo 'project'  (modal do projeto)   → N linhas (1 por processo),
--         todas com o MESMO checkpoint_id + snapshot_at → 1 ponto do histórico
--         consolidado do projeto (soma das linhas).
--   * scope_id = id da entidade do escopo (process_id ou project_id). Sem FK
--     porque aponta para tabelas diferentes conforme scope_kind.
-- ============================================================================
BEGIN;

CREATE TABLE IF NOT EXISTS public.roi_snapshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Agrupador do "Salvar" (1 linha no escopo process; N no escopo project).
  checkpoint_id uuid NOT NULL,
  scope_kind    text NOT NULL CHECK (scope_kind IN ('process', 'project')),
  scope_id      uuid,                       -- process_id ou project_id (sem FK: alvo varia)
  process_id    uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  label         text,
  snapshot_at   timestamptz NOT NULL DEFAULT now(),  -- única fonte de ordenação

  -- KPIs congelados no instante do save (já calculados ao vivo pelo app).
  annual_cost     numeric,
  annual_hours    numeric,
  annual_savings  numeric,
  roi_percent     numeric,
  payback_months  numeric,
  hours_freed     numeric,
  investment      numeric,

  created_by    uuid DEFAULT auth.uid() REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_roi_snapshots_process    ON public.roi_snapshots (process_id, snapshot_at DESC);
CREATE INDEX IF NOT EXISTS idx_roi_snapshots_checkpoint ON public.roi_snapshots (checkpoint_id);
CREATE INDEX IF NOT EXISTS idx_roi_snapshots_scope      ON public.roi_snapshots (scope_kind, scope_id, snapshot_at DESC);

-- ============================================================
-- RLS — mesmo padrão de process_scenarios (team members)
-- ============================================================
ALTER TABLE public.roi_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view roi_snapshots" ON public.roi_snapshots;
CREATE POLICY "Team members can view roi_snapshots"
ON public.roi_snapshots
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'team_member', 'lider', 'sublider')
  )
);

DROP POLICY IF EXISTS "Team members can insert roi_snapshots" ON public.roi_snapshots;
CREATE POLICY "Team members can insert roi_snapshots"
ON public.roi_snapshots
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'team_member', 'lider', 'sublider')
  )
);

-- DELETE permitido (remover mensuração equivocada). Sem UPDATE: snapshot é
-- append-only/imutável (corrige-se salvando uma nova mensuração).
DROP POLICY IF EXISTS "Team members can delete roi_snapshots" ON public.roi_snapshots;
CREATE POLICY "Team members can delete roi_snapshots"
ON public.roi_snapshots
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin', 'team_member', 'lider', 'sublider')
  )
);

COMMENT ON TABLE public.roi_snapshots IS 'Histórico de mensurações de ROI por processo. checkpoint_id agrupa o save (1 linha = escopo process; N = escopo project). Append-only.';

COMMIT;
