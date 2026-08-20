ALTER TABLE tax_categorias
  ADD COLUMN estrutura_area_id uuid REFERENCES estrutura_areas(id) ON DELETE SET NULL;