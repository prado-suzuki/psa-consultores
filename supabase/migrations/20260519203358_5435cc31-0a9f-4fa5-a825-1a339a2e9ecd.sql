DO $$
DECLARE
  r RECORD;
  total int := 0;
BEGIN
  FOR r IN
    SELECT c.id, c.nome, c.regiao, c.setor_cliente, c.setor_cliente_id
    FROM public.cliente c
    WHERE (c.regiao IS NOT NULL OR c.setor_cliente IS NOT NULL OR c.setor_cliente_id IS NOT NULL)
      AND NOT EXISTS (
        SELECT 1 FROM public.ordem_servico os
        WHERE os.id_cliente = c.id AND os.excluido = false
      )
  LOOP
    total := total + 1;
    RAISE NOTICE 'Cliente sem OS - perda no DROP: id=% nome=% regiao=% setor=% setor_id=%',
      r.id, r.nome, r.regiao, r.setor_cliente, r.setor_cliente_id;
  END LOOP;
  RAISE NOTICE 'Total de clientes com perda de dado: %', total;
END $$;

ALTER TABLE public.cliente
  DROP COLUMN IF EXISTS regiao,
  DROP COLUMN IF EXISTS setor_cliente,
  DROP COLUMN IF EXISTS setor_cliente_id;