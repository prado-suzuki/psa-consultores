BEGIN;

DO $$
DECLARE
  t text;
  ausentes text[] := ARRAY[]::text[];
  tabelas text[] := ARRAY[
    'projeto_justificativas','documentos_processo','sistemas_processo',
    'etapa_responsaveis','etapa_sistemas','etapa_documentos',
    'gargalos','gargalo_processos','gargalo_responsaveis',
    'documento_horas_historico','sistema_clusters','sistema_responsaveis',
    'melhoria_processos','melhoria_sistemas','melhoria_responsaveis','melhoria_acoes_td'
  ];
BEGIN
  FOREACH t IN ARRAY tabelas LOOP
    IF to_regclass('public.'||t) IS NULL THEN
      ausentes := ausentes || t;
      CONTINUE;
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=t AND policyname=t||'_auth_delete'
    ) THEN
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true);',
        t||'_auth_delete', t
      );
    END IF;
  END LOOP;
  IF array_length(ausentes,1) > 0 THEN
    RAISE NOTICE 'Tabelas inesperadamente ausentes (puladas): %', array_to_string(ausentes, ', ');
  END IF;
END $$;

DO $$ DECLARE v int; BEGIN
  SELECT count(*) INTO v
  FROM unnest(ARRAY[
    'projeto_justificativas','documentos_processo','sistemas_processo',
    'etapa_responsaveis','etapa_sistemas','etapa_documentos',
    'gargalos','gargalo_processos','gargalo_responsaveis',
    'documento_horas_historico','sistema_clusters','sistema_responsaveis',
    'melhoria_processos','melhoria_sistemas','melhoria_responsaveis','melhoria_acoes_td'
  ]) AS tt(t)
  WHERE to_regclass('public.'||tt.t) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=tt.t AND cmd='DELETE'
    );
  IF v > 0 THEN RAISE EXCEPTION 'Ainda faltam % tabela(s) existente(s) sem policy de DELETE.', v; END IF;
  RAISE NOTICE 'OK — policy de DELETE garantida (gargalo_processos/melhoria_processos inclusas).';
END $$;

COMMIT;