INSERT INTO empresas_faturamento (nome)
SELECT nome FROM (VALUES
  ('PRADO ADVOGADOS'), ('PSA CONSULTORES'), ('PRADO SUZUKI'),
  ('PROFITTO'), ('PROTENUN'), ('PSA ADM JUDICIAL'),
  ('PSA AUDITORES'), ('PSA NORTE')
) AS v(nome)
WHERE NOT EXISTS (
  SELECT 1 FROM empresas_faturamento ef WHERE ef.nome = v.nome
);