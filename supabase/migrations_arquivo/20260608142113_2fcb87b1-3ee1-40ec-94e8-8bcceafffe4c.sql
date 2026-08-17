BEGIN;

DROP TABLE IF EXISTS public.cascata_evento_etapas CASCADE;
DROP TABLE IF EXISTS public.cascata_eventos       CASCADE;

CREATE TABLE IF NOT EXISTS public.gargalo_etapas (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gargalo_id  uuid NOT NULL REFERENCES public.gargalos(id) ON DELETE CASCADE,
  etapa_id    uuid NOT NULL,
  scenario    text NOT NULL DEFAULT 'AS-IS' CHECK (scenario IN ('AS-IS','TO-BE')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT gargalo_etapas_uniq UNIQUE (gargalo_id, etapa_id, scenario),
  CONSTRAINT gargalo_etapas_etapa_fk
    FOREIGN KEY (etapa_id, scenario)
    REFERENCES public.process_stages(id, scenario) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_gargalo_etapas_gargalo_id ON public.gargalo_etapas (gargalo_id);
CREATE INDEX IF NOT EXISTS idx_gargalo_etapas_etapa_id   ON public.gargalo_etapas (etapa_id, scenario);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.gargalo_etapas TO authenticated;
GRANT ALL ON public.gargalo_etapas TO service_role;

ALTER TABLE public.gargalo_etapas ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'gargalo_etapas'
      AND policyname = 'Team members can read gargalo_etapas'
  ) THEN
    CREATE POLICY "Team members can read gargalo_etapas"
      ON public.gargalo_etapas
      FOR SELECT
      USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'gargalo_etapas'
      AND policyname = 'Team members can write gargalo_etapas'
  ) THEN
    CREATE POLICY "Team members can write gargalo_etapas"
      ON public.gargalo_etapas
      FOR ALL
      USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'))
      WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;

COMMIT;