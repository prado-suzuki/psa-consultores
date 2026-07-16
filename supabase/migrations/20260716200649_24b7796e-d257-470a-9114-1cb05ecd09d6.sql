CREATE SCHEMA IF NOT EXISTS archive;
ALTER TABLE public._bkp_psa_unify_20260507_area_servicos   SET SCHEMA archive;
ALTER TABLE public._bkp_psa_unify_20260507_catalog_clients SET SCHEMA archive;
ALTER TABLE public._bkp_psa_unify_20260507_org_projects    SET SCHEMA archive;
ALTER TABLE public._bkp_psa_unify_20260507_tickets         SET SCHEMA archive;