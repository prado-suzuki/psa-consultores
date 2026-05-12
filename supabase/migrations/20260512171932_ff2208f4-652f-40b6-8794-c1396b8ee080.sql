DO $$ BEGIN
  CREATE TYPE public.scenario_kind AS ENUM ('scale', 'efficiency', 'investment');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.scenario_type AS ENUM ('baseline', 'variant', 'target');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.scenario_unit_basis AS ENUM ('per_unit', 'per_month', 'per_year');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.scenario_status AS ENUM ('draft', 'analyzing', 'approved', 'promoted', 'archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.process_scenarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  process_id uuid NOT NULL REFERENCES public.processes(id) ON DELETE CASCADE,
  parent_scenario_id uuid REFERENCES public.process_scenarios(id) ON DELETE SET NULL,
  improvement_id uuid REFERENCES public.process_improvements(id) ON DELETE SET NULL,
  project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  scenario_kind public.scenario_kind NOT NULL,
  scenario_type public.scenario_type NOT NULL DEFAULT 'variant',
  unit_basis public.scenario_unit_basis NOT NULL DEFAULT 'per_month',
  status public.scenario_status NOT NULL DEFAULT 'draft',
  varied_field text NOT NULL,
  locked_fields text[] NOT NULL DEFAULT ARRAY[]::text[],
  parameters jsonb NOT NULL,
  computed_metrics jsonb,
  is_locked boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_process_scenarios_process ON public.process_scenarios(process_id);
CREATE INDEX IF NOT EXISTS idx_process_scenarios_parent ON public.process_scenarios(parent_scenario_id);
CREATE INDEX IF NOT EXISTS idx_process_scenarios_status ON public.process_scenarios(status);
CREATE INDEX IF NOT EXISTS idx_process_scenarios_project ON public.process_scenarios(project_id);

ALTER TABLE public.process_scenarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Team members can view scenarios" ON public.process_scenarios;
CREATE POLICY "Team members can view scenarios"
ON public.process_scenarios FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','team_member','lider','sublider')));

DROP POLICY IF EXISTS "Team members can insert scenarios" ON public.process_scenarios;
CREATE POLICY "Team members can insert scenarios"
ON public.process_scenarios FOR INSERT
WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','team_member','lider','sublider')));

DROP POLICY IF EXISTS "Team members can update unlocked scenarios" ON public.process_scenarios;
CREATE POLICY "Team members can update unlocked scenarios"
ON public.process_scenarios FOR UPDATE
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','team_member','lider','sublider')));

DROP POLICY IF EXISTS "Team members can delete scenarios" ON public.process_scenarios;
CREATE POLICY "Team members can delete scenarios"
ON public.process_scenarios FOR DELETE
USING (EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin','team_member','lider','sublider')));

CREATE OR REPLACE FUNCTION public.set_scenario_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = 'public' AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_scenario_updated_at ON public.process_scenarios;
CREATE TRIGGER trg_scenario_updated_at
  BEFORE UPDATE ON public.process_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.set_scenario_updated_at();

CREATE OR REPLACE FUNCTION public.freeze_scenario_parameters()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  IF NEW.status = 'promoted' AND OLD.status <> 'promoted' THEN
    NEW.is_locked := true;
  END IF;

  IF OLD.is_locked = true AND NEW.parameters IS DISTINCT FROM OLD.parameters THEN
    RAISE EXCEPTION 'Cenario travado: parameters nao podem ser alterados apos is_locked=true ou status=promoted';
  END IF;

  IF OLD.is_locked = false AND NEW.is_locked = true AND NEW.parameters IS DISTINCT FROM OLD.parameters THEN
    RAISE EXCEPTION 'Nao e possivel travar e alterar parameters no mesmo update';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_freeze_scenario_parameters ON public.process_scenarios;
CREATE TRIGGER trg_freeze_scenario_parameters
  BEFORE UPDATE ON public.process_scenarios
  FOR EACH ROW EXECUTE FUNCTION public.freeze_scenario_parameters();

COMMENT ON TABLE public.process_scenarios IS 'Cenarios what-if de processos. Parameters jsonb e o snapshot imutavel das variaveis congeladas; varied_field e locked_fields documentam o contrato cientifico da simulacao.';
COMMENT ON COLUMN public.process_scenarios.scenario_kind IS 'scale=varia volume; efficiency=varia tempo; investment=varia custos de sistema/build vs buy';
COMMENT ON COLUMN public.process_scenarios.unit_basis IS 'Base de calculo: per_unit, per_month ou per_year';
COMMENT ON COLUMN public.process_scenarios.parameters IS 'Snapshot imutavel apos is_locked=true. Estrutura tipica: {time_hours, volume, people, cost_monthly, team_members[], savings[]}';