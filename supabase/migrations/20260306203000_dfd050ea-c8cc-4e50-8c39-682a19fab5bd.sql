-- Step 1: Drop old FK
ALTER TABLE tax_projects DROP CONSTRAINT tax_projects_area_id_fkey;

-- Step 2: Remap area_id values
UPDATE tax_projects SET area_id = '7089d134-5874-4061-a860-05376aa8e02a'
WHERE area_id = 'fd2eab19-e37e-4ddb-9570-5e839d3bfe5e';

UPDATE tax_projects SET area_id = '55448e04-d9ea-4fd7-bde8-7396fdb01376'
WHERE area_id = '201bb999-85c8-437b-bd44-201720833cda';

-- Step 3: Create correct FK
ALTER TABLE tax_projects ADD CONSTRAINT tax_projects_area_id_fkey
  FOREIGN KEY (area_id) REFERENCES tax_areas(id) ON DELETE SET NULL;