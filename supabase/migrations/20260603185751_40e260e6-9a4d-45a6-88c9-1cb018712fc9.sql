BEGIN;

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

NOTIFY pgrst, 'reload schema';

COMMIT;