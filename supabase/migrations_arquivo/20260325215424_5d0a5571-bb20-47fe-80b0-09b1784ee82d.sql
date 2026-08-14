
-- Swap IDs: DK Transportes ↔ Rene Barbour (fix previous incorrect swap)
-- Must update contribuinte BEFORE per (trigger validates contribuinte exists)

DO $$
DECLARE
  dk_current   UUID := '1dc16e34-89b2-426c-93ec-347de2c2b112';
  rene_current UUID := '0b81b35b-447a-4359-8a8b-8e28cce3cc0f';
  tmp_id       UUID := 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
BEGIN
  -- Step 1: Move DK contribuinte to temp ID, then update dependents
  UPDATE contribuinte SET id = tmp_id WHERE id = dk_current;
  UPDATE contribuinte_bal_config SET id_contribuinte = tmp_id WHERE id_contribuinte = dk_current;
  UPDATE per SET id_contribuinte = tmp_id WHERE id_contribuinte = dk_current;

  -- Step 2: Move Rene to DK's old slot, then update dependents
  UPDATE contribuinte SET id = dk_current WHERE id = rene_current;
  UPDATE per SET id_contribuinte = dk_current WHERE id_contribuinte = rene_current;

  -- Step 3: Move DK (temp) to Rene's old slot, then update dependents
  UPDATE contribuinte SET id = rene_current WHERE id = tmp_id;
  UPDATE contribuinte_bal_config SET id_contribuinte = rene_current WHERE id_contribuinte = tmp_id;
  UPDATE per SET id_contribuinte = rene_current WHERE id_contribuinte = tmp_id;
END $$;
