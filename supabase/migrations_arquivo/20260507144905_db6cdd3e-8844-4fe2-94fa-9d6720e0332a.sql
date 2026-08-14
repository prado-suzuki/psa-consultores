
-- 1. Backup tables (snapshot original area links)
CREATE TABLE public._bkp_psa_unify_20260507_org_projects AS
  SELECT id, estrutura_area_id, equipe_id, name, now() AS snapshot_at
  FROM public.org_projects
  WHERE estrutura_area_id IN (
    '201bb999-85c8-437b-bd44-201720833cda',
    'fd2eab19-e37e-4ddb-9570-5e839d3bfe5e',
    '5c71affa-59d5-4dfe-bb78-50764a27f1f1',
    '947fc502-91cd-4fc2-8d88-76cd9d829754',
    'a76d5f03-de4b-499d-9fb2-d9764b26422a'
  );

CREATE TABLE public._bkp_psa_unify_20260507_tickets AS
  SELECT id, estrutura_area_id, now() AS snapshot_at
  FROM public.tickets
  WHERE estrutura_area_id IN (
    '201bb999-85c8-437b-bd44-201720833cda',
    'fd2eab19-e37e-4ddb-9570-5e839d3bfe5e',
    '5c71affa-59d5-4dfe-bb78-50764a27f1f1',
    '947fc502-91cd-4fc2-8d88-76cd9d829754',
    'a76d5f03-de4b-499d-9fb2-d9764b26422a'
  );

CREATE TABLE public._bkp_psa_unify_20260507_area_servicos AS
  SELECT estrutura_area_id, servico_id, now() AS snapshot_at
  FROM public.area_servicos
  WHERE estrutura_area_id IN (
    '201bb999-85c8-437b-bd44-201720833cda',
    'fd2eab19-e37e-4ddb-9570-5e839d3bfe5e',
    '5c71affa-59d5-4dfe-bb78-50764a27f1f1',
    '947fc502-91cd-4fc2-8d88-76cd9d829754',
    'a76d5f03-de4b-499d-9fb2-d9764b26422a'
  );

CREATE TABLE public._bkp_psa_unify_20260507_catalog_clients AS
  SELECT id, estrutura_area_id, now() AS snapshot_at
  FROM public.catalog_clients
  WHERE estrutura_area_id IN (
    '201bb999-85c8-437b-bd44-201720833cda',
    'fd2eab19-e37e-4ddb-9570-5e839d3bfe5e',
    '5c71affa-59d5-4dfe-bb78-50764a27f1f1',
    '947fc502-91cd-4fc2-8d88-76cd9d829754',
    'a76d5f03-de4b-499d-9fb2-d9764b26422a'
  );

-- Lock backup tables (only superuser/admin can read)
ALTER TABLE public._bkp_psa_unify_20260507_org_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._bkp_psa_unify_20260507_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._bkp_psa_unify_20260507_area_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public._bkp_psa_unify_20260507_catalog_clients ENABLE ROW LEVEL SECURITY;

-- 2-6: unification within a single transaction via DO block
DO $$
DECLARE
  v_new_area uuid;
  v_old_areas uuid[] := ARRAY[
    '201bb999-85c8-437b-bd44-201720833cda',
    'fd2eab19-e37e-4ddb-9570-5e839d3bfe5e',
    '5c71affa-59d5-4dfe-bb78-50764a27f1f1',
    '947fc502-91cd-4fc2-8d88-76cd9d829754',
    'a76d5f03-de4b-499d-9fb2-d9764b26422a'
  ]::uuid[];
  v_keep_equipes uuid[] := ARRAY[
    'c75c8c72-4bf0-4259-9e7d-be86599f7762',  -- Equipe Fiscal
    '42ba0b06-859c-4397-b58c-d2e324f18f86',  -- Equipe Fixos
    '4995f1d5-bdaa-4854-b88c-cf0f42380d13'   -- Equipe Pontuais
  ]::uuid[];
  v_drop_equipes uuid[] := ARRAY[
    '32bc9000-f524-43f0-9aa9-44d2381c17d7',  -- Área para Estudos e Pesquisas
    '108fbff5-f334-4ba9-b2e2-715536afefab',  -- Equipe Fiscal e OSG
    '9d5e35e9-816a-482d-9ebc-78a52e2b8273'   -- Equipe Tax + Advogados
  ]::uuid[];
BEGIN
  -- 2. Nova área Tax
  INSERT INTO public.estrutura_areas
    (cluster_id, name, color, page_categories, cost_center_id, gestor_chamados_id, is_active)
  VALUES
    ('b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3',
     'Tax',
     '#10b981',
     ARRAY['tax']::text[],
     '5570cc11-5427-431c-8e7b-0aa09f7b8207',
     'ec8c2f0e-6999-4387-8417-c617a728b428',
     true)
  RETURNING id INTO v_new_area;

  -- 3. Reapontar equipes que migram
  UPDATE public.estrutura_equipes
     SET area_id = v_new_area
   WHERE id = ANY(v_keep_equipes);

  -- 4. Reapontar dependentes
  UPDATE public.org_projects
     SET estrutura_area_id = v_new_area
   WHERE estrutura_area_id = ANY(v_old_areas);

  UPDATE public.tickets
     SET estrutura_area_id = v_new_area
   WHERE estrutura_area_id = ANY(v_old_areas);

  INSERT INTO public.area_servicos (estrutura_area_id, servico_id)
  SELECT DISTINCT v_new_area, servico_id
    FROM public.area_servicos
   WHERE estrutura_area_id = ANY(v_old_areas)
  ON CONFLICT DO NOTHING;

  DELETE FROM public.area_servicos
   WHERE estrutura_area_id = ANY(v_old_areas);

  UPDATE public.catalog_clients
     SET estrutura_area_id = v_new_area
   WHERE estrutura_area_id = ANY(v_old_areas);

  -- 5. Soft-delete equipes que não migram
  UPDATE public.estrutura_equipes
     SET is_active = false
   WHERE id = ANY(v_drop_equipes);

  -- 6. Soft-delete áreas antigas
  UPDATE public.estrutura_areas
     SET is_active = false
   WHERE id = ANY(v_old_areas);
END $$;
