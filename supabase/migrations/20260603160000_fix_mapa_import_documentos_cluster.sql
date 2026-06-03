-- =====================================================================
-- 20260603160000_fix_mapa_import_documentos_cluster.sql
-- Correção do bug do import MAPA: as 120 rows inseridas em
-- public.documentos_processo pela migration 20260603120000 não tiveram
-- `cluster_id` setado (a coluna foi esquecida na lista de INSERT). Como
-- essas 120 rows são 100% MAPA OSG (criadas pela própria migration de
-- import, sem outra fonte na tabela), o backfill é determinístico.
--
-- Não toca em mais nada. Idempotente. Reversível.
-- =====================================================================

BEGIN;

-- Backfill: docs MAPA importados com cluster_id NULL → PSA OSG.
-- WHERE cluster_id IS NULL garante que NÃO sobrescreve nada que algum dia
-- tenha sido setado manualmente pra outro cluster.
UPDATE public.documentos_processo
SET cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80'  -- PSA OSG
WHERE cluster_id IS NULL;

-- (Não precisa NOTIFY pgrst porque não criamos constraint nova — só dados.)

COMMIT;

-- FIM
--
-- Pra reverter:
--   UPDATE public.documentos_processo
--   SET cluster_id = NULL
--   WHERE cluster_id = '0523512c-f980-4236-8a7c-53e06c9c7a80';
