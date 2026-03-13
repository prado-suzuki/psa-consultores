-- Fase 1: Bridge area_servicos → estrutura_areas

-- 1.1 Adicionar coluna
ALTER TABLE area_servicos ADD COLUMN estrutura_area_id uuid;

-- 1.2 Popular via JOIN com tax_areas
UPDATE area_servicos ars
SET estrutura_area_id = ta.estrutura_area_id
FROM tax_areas ta
WHERE ta.id = ars.area_id;

-- 1.3 Adicionar FK
ALTER TABLE area_servicos
ADD CONSTRAINT area_servicos_estrutura_area_id_fkey
FOREIGN KEY (estrutura_area_id) REFERENCES estrutura_areas(id) ON DELETE CASCADE;