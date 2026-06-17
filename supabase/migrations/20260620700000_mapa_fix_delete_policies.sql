-- ============================================================================
-- Fix RLS — política de DELETE faltante nas tabelas do MAPA
-- ============================================================================
-- A migração 20260602194911 habilitou RLS e criou políticas de SELECT/INSERT/
-- UPDATE (USING true) para as tabelas do MAPA e deu GRANT ... DELETE ... — MAS
-- NÃO criou a política de DELETE. Com RLS ligado e sem política de DELETE, o
-- usuário `authenticated` não consegue apagar linha (RLS nega por padrão).
--
-- Sintoma: vincular gargalo/melhoria a processo dava
--   "duplicate key value violates unique constraint gargalo_processos_gargalo_id_processo_id_key"
-- porque o sync apagava-tudo-e-reinseria, mas o DELETE removia 0 linhas (RLS) e
-- o re-INSERT colidia. Também impedia DESvincular (remoção silenciosamente nula).
-- (O app foi corrigido p/ sync por DIFF — resolve o INSERT; esta migração resolve
--  o DELETE, necessário p/ remoção/desvínculo funcionar.)
--
-- Cria a política _auth_delete (USING true), em paridade com insert/update.
-- Permissivo igual às demais (modelo interno). NÃO altera escopo de cluster e
-- NÃO toca tabelas do Digital Rotina (daily_standups/sprint_deliverables não
-- estão na lista). Idempotente (checa pg_policies).
--
-- TOLERANTE A TABELA INEXISTENTE: usa to_regclass antes do CREATE POLICY. A lista
-- abaixo veio da 20260602194911, mas cascata_eventos/cascata_evento_etapas não
-- existem em public hoje — são puladas (e cobertas se um dia forem criadas).
-- ============================================================================
BEGIN;

DO $$
DECLARE
  t text;
  faltantes text[] := ARRAY[]::text[];
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
    IF to_regclass('public.'||t) IS NULL THEN
      faltantes := faltantes || t;          -- tabela não existe → pula
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
  IF array_length(faltantes,1) > 0 THEN
    RAISE NOTICE 'Tabelas inexistentes ignoradas (sem policy criada): %', array_to_string(faltantes, ', ');
  END IF;
END $$;

-- Verificação: toda tabela EXISTENTE da lista deve ter política de DELETE
DO $$ DECLARE v int; BEGIN
  SELECT count(*) INTO v
  FROM unnest(ARRAY[
    'projeto_justificativas','documentos_processo','sistemas_processo',
    'etapa_responsaveis','etapa_sistemas','etapa_documentos',
    'gargalos','gargalo_processos','gargalo_responsaveis',
    'documento_horas_historico','cascata_eventos','cascata_evento_etapas',
    'sistema_clusters','sistema_responsaveis','melhoria_processos',
    'melhoria_sistemas','melhoria_responsaveis','melhoria_acoes_td'
  ]) AS tt(t)
  WHERE to_regclass('public.'||tt.t) IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname='public' AND tablename=tt.t AND cmd='DELETE'
    );
  IF v > 0 THEN RAISE EXCEPTION 'Ainda faltam % tabela(s) EXISTENTE(s) sem policy de DELETE.', v; END IF;
  RAISE NOTICE 'OK — policy de DELETE garantida nas tabelas do MAPA existentes (gargalo_processos/melhoria_processos inclusas).';
END $$;

COMMIT;
