-- =====================================================================
-- 20260603150000_add_missing_cluster_fks.sql
-- Adiciona FK `cluster_id → estrutura_clusters(id)` em tabelas MAPA-nativas
-- que foram criadas sem a constraint na migration de integração.
--
-- Sem essas FKs, o PostgREST não consegue resolver embeds tipo
-- `select=*,estrutura_clusters(name)` — a query retorna erro silencioso
-- e a página fica vazia. Tabelas `projects`, `processes`,
-- `process_improvements` e `job_roles` já têm. Faltavam:
--   - gargalos
--   - documentos_processo
--   - sistemas_processo (não — já tem via cluster_id_fk lá em baixo)
--   - cascata_eventos
--
-- Idempotente: NOT EXISTS guard antes de cada ADD CONSTRAINT.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- gargalos.cluster_id → estrutura_clusters(id)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='estrutura_clusters')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='gargalos_cluster_id_fk') THEN
    ALTER TABLE public.gargalos
      ADD CONSTRAINT gargalos_cluster_id_fk
      FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- documentos_processo.cluster_id → estrutura_clusters(id)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='estrutura_clusters')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='documentos_processo_cluster_id_fk') THEN
    ALTER TABLE public.documentos_processo
      ADD CONSTRAINT documentos_processo_cluster_id_fk
      FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;
  END IF;
END $$;

-- ---------------------------------------------------------------------
-- cascata_eventos.cluster_id → estrutura_clusters(id)
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
              WHERE table_schema='public' AND table_name='estrutura_clusters')
     AND NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='cascata_eventos_cluster_id_fk') THEN
    ALTER TABLE public.cascata_eventos
      ADD CONSTRAINT cascata_eventos_cluster_id_fk
      FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Força o PostgREST a recarregar o schema cache (necessário pra embeds).
NOTIFY pgrst, 'reload schema';

COMMIT;

-- FIM
