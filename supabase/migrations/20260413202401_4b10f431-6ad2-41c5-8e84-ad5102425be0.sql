-- Drop FKs temporarily
ALTER TABLE inscricao_contribuinte DROP CONSTRAINT IF EXISTS inscricao_contribuinte_contribuinte_id_fkey;
ALTER TABLE contribuinte_bal_config DROP CONSTRAINT IF EXISTS contribuinte_bal_config_id_contribuinte_fkey;
ALTER TABLE fiscal_tasks DROP CONSTRAINT IF EXISTS fiscal_tasks_contribuinte_id_fkey;

DO $$
DECLARE
  old_id uuid := 'b0d3712c-42ad-4519-a3be-88b6463cd733';
  new_id uuid := 'e3291d4f-c014-4f89-829e-c7bddfbcd5ba';
  temp_id uuid := gen_random_uuid();
BEGIN
  -- 1. Antigo → temp
  UPDATE contribuinte SET id = temp_id WHERE id = old_id;
  -- 2. Ativo → old (DW)
  UPDATE contribuinte SET id = old_id WHERE id = new_id;
  -- 3. Temp → new
  UPDATE contribuinte SET id = new_id WHERE id = temp_id;
END $$;

-- Recriar FKs
ALTER TABLE inscricao_contribuinte ADD CONSTRAINT inscricao_contribuinte_contribuinte_id_fkey
  FOREIGN KEY (contribuinte_id) REFERENCES contribuinte(id) NOT VALID;
ALTER TABLE contribuinte_bal_config ADD CONSTRAINT contribuinte_bal_config_id_contribuinte_fkey
  FOREIGN KEY (id_contribuinte) REFERENCES contribuinte(id) NOT VALID;
ALTER TABLE fiscal_tasks ADD CONSTRAINT fiscal_tasks_contribuinte_id_fkey
  FOREIGN KEY (contribuinte_id) REFERENCES contribuinte(id) NOT VALID;