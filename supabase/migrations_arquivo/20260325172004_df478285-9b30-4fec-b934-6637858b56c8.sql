CREATE TABLE performance_preferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid UNIQUE,
  periodo_padrao text CHECK (periodo_padrao IN ('7d','30d','90d','ciclo')) DEFAULT '30d',
  area_padrao text DEFAULT 'todas',
  widgets_ocultos text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE performance_preferencias ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuario acessa proprias prefs"
  ON performance_preferencias FOR ALL
  USING (auth.uid() = usuario_id);

CREATE TRIGGER update_performance_preferencias_updated_at
  BEFORE UPDATE ON performance_preferencias
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();