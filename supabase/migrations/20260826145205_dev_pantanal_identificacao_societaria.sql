-- 20260826145205_dev_pantanal_identificacao_societaria.sql
--
-- O cenário de ensaio promete demonstrar CNPJ, NIRE e data de constituição,
-- mas a empresa fictícia Pantanal foi semeada sem esses três dados. Preenchê-los
-- mantém o fixture coerente com os critérios que ele existe para exercitar.
--
-- Migration exclusiva do sandbox: altera somente dados fictícios do cliente
-- DEV identificado por ambiente e nome. Nada aqui aplica em produção.

UPDATE public.pessoa AS p
   SET cpf_cnpj = coalesce(p.cpf_cnpj, '12.345.678/0001-95'),
       nire = coalesce(p.nire, '51123456789'),
       data_constituicao = coalesce(p.data_constituicao, '2020-10-19'::date),
       updated_at = now()
  FROM public.cliente AS c
 WHERE c.id = p.cliente_id
   AND c.ambiente = 'dev'
   AND c.nome = '[TESTE] Banana Quântica Engenharia de Sonhos Ltda'
   AND p.denominacao = 'Pantanal Comércio S.A.'
   AND (
     p.cpf_cnpj IS NULL
     OR p.nire IS NULL
     OR p.data_constituicao IS NULL
   );
