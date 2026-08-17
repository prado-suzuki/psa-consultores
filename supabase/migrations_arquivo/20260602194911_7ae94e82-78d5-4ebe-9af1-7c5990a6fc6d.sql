-- =====================================================================
-- MAPA Integration Hardening
-- R1 [HOMOLOGADO ENG]: process_stages.cenario NOT NULL DEFAULT 'AS-IS'.
--   Backfill semântico aceito; novo frontend MAPA enviará 'cenario'
--   explicitamente em todo INSERT.
-- R2: RLS + GRANT + policies para as 18 tabelas novas
-- R3: Reusar update_updated_at_column() e dropar set_updated_at();
--     Hardening de process_stages_cascade_as_is_delete (search_path)
-- =====================================================================

BEGIN;

-- R2. ENABLE RLS + GRANT + POLICIES
DO $$
DECLARE
  t text;
  tabelas text[] := ARRAY[
    'projeto_justificativas','documentos_processo','sistemas_processo',
    'etapa_responsaveis','etapa_sistemas','etapa_documentos',
    'gargalos','gargalo_processos','gargalo_responsaveis',
    'documento_horas_historico','cascata_eventos','cascata_evento_etapas',
    'sistema_clusters','sistema_responsaveis','melhoria_processos',
    'melhoria_sistemas','melhoria_responsaveis','melhoria_acoes_td'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON public.%I TO authenticated;', t);
    EXECUTE format('GRANT ALL ON public.%I TO service_role;', t);

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND policyname=t||'_auth_select'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true);',
        t||'_auth_select', t
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND policyname=t||'_auth_insert'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true);',
        t||'_auth_insert', t
      );
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND policyname=t||'_auth_update'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true);',
        t||'_auth_update', t
      );
    END IF;
  END LOOP;
END $$;

-- R3.1. Reapontar triggers de updated_at para a função nativa
DO $$
DECLARE
  t text;
  tabelas_updated_at text[] := ARRAY[
    'documentos_processo','sistemas_processo','gargalos','cascata_eventos'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas_updated_at LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;', t);
    EXECUTE format(
      'CREATE TRIGGER trg_%1$s_updated_at
         BEFORE UPDATE ON public.%1$s
         FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();',
      t
    );
  END LOOP;
END $$;

DROP FUNCTION IF EXISTS public.set_updated_at();

-- R3.2. Hardening da função de cascade AS-IS → TO-BE (search_path fixo)
CREATE OR REPLACE FUNCTION public.process_stages_cascade_as_is_delete()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.cenario = 'AS-IS' THEN
    DELETE FROM public.process_stages
     WHERE cenario = 'TO-BE'
       AND etapa_as_is_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;

COMMIT;