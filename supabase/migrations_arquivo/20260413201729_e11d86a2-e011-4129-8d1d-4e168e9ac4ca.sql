ALTER TABLE inscricao_contribuinte ADD CONSTRAINT inscricao_contribuinte_contribuinte_id_fkey
  FOREIGN KEY (contribuinte_id) REFERENCES contribuinte(id) NOT VALID;

ALTER TABLE contribuinte_bal_config ADD CONSTRAINT contribuinte_bal_config_id_contribuinte_fkey
  FOREIGN KEY (id_contribuinte) REFERENCES contribuinte(id) NOT VALID;