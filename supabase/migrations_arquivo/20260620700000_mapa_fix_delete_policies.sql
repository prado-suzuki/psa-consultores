-- ============================================================================
-- Fix RLS — política de DELETE faltante nas tabelas do MAPA
-- ============================================================================
-- A migração 20260602194911 habilitou RLS e criou políticas de SELECT/INSERT/
-- UPDATE (USING true) para as tabelas do MAPA e deu GRANT ... DELETE ... — MAS
-- NÃO criou a política de DELETE. Com RLS ligado e sem política de DELETE, o
-- usuário `authenticated` não consegue apagar linha (RLS nega por padrão; o
-- GRANT sozinho não basta).
--
-- Sintoma: vincular gargalo/melhoria a processo dava
--   "duplicate key value violates unique constraint gargalo_processos_gargalo_id_processo_id_key"
-- (o sync apagava-tudo-e-reinseria; o DELETE removia 0 linhas e o re-INSERT
--  colidia). E desvincular falhava silenciosamente. O app já foi corrigido p/
-- sync por DIFF (resolve o INSERT); esta migração resolve o DELETE.
--
-- LISTA VERIFICADA NO BANCO (REST, 2026): das 18 tabelas da 20260602194911,
-- cascata_eventos e cascata_evento_etapas NÃO existem (404) → REMOVIDAS. Ficam
-- as 16 que existem e têm só select/insert/update. gargalo_etapas FORA: tem
-- policy própria FOR ALL (cobre DELETE). gargalo_melhorias não entra (o app não
-- apaga mais — vínculo aposentado).
--
-- Cria a policy _auth_delete (FOR DELETE USING true), em paridade com insert/
-- update. Permissivo igual às demais (modelo interno). NÃO altera escopo de
-- cluster e NÃO toca tabelas do Digital Rotina. Idempotente (checa pg_policies);
-- to_regclass mantém como salvaguarda caso alguma tabela suma no futuro.
-- ============================================================================
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

-- Verificação: toda tabela EXISTENTE da lista deve ter política de DELETE
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
