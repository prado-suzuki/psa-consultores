-- Juridico sai do vinho (area-8) para a familia do marinho do Prado (area-6).
--
-- A migration `20260923210336_abre_areas_auditoria_e_juridico.sql` foi editada
-- para inserir o Juridico com color_index 6, mas o INSERT dela e guardado por
-- `where not exists`: nos bancos que ja rodaram a migration a linha continua
-- com 8, e este UPDATE e o que alinha o dado sem depender de recriar a linha.
--
-- Reversao: UPDATE public.estrutura_areas SET color_index = 8
--           WHERE name = 'Juridico' AND color_index = 6; (mesma guarda)

-- idempotencia-ok: UPDATE guardado por `is distinct from`; rodado duas vezes,
-- a segunda nao muda nada.

UPDATE public.estrutura_areas
SET color_index = 6
WHERE name = 'Juridico'
  AND cluster_id = '39e30aff-fc2a-405a-b9d6-305497477da6'::uuid
  AND color_index IS DISTINCT FROM 6;
