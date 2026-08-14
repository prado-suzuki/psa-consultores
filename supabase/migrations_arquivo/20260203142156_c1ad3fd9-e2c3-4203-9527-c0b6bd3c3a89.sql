-- Tabela contrato
CREATE TABLE contrato (
  id_contrato UUID DEFAULT gen_random_uuid() NOT NULL,
  id_cliente UUID NOT NULL,
  numero_contrato TEXT,
  valor_fixo NUMERIC,
  aliquota_contrato NUMERIC,
  data_inicio DATE,
  data_fim DATE,
  tipo_contrato TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id_contrato),
  CONSTRAINT fk_contrato_cliente FOREIGN KEY (id_cliente) 
    REFERENCES cliente(id) ON DELETE CASCADE
);

-- Tabela servico
CREATE TABLE servico (
  id_servico UUID DEFAULT gen_random_uuid() NOT NULL,
  id_contrato UUID NOT NULL,
  descricao TEXT,
  valor DOUBLE PRECISION,
  id_catalog_client UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (id_servico),
  CONSTRAINT fk_servico_contrato FOREIGN KEY (id_contrato) 
    REFERENCES contrato(id_contrato) ON DELETE CASCADE,
  CONSTRAINT fk_servico_catalog_client FOREIGN KEY (id_catalog_client) 
    REFERENCES catalog_clients(id) ON DELETE SET NULL
);

-- Triggers (usando função existente)
CREATE TRIGGER update_contrato_updated_at
  BEFORE UPDATE ON contrato
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_servico_updated_at
  BEFORE UPDATE ON servico
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX idx_contrato_id_cliente ON contrato(id_cliente);
CREATE INDEX idx_servico_id_contrato ON servico(id_contrato);
CREATE INDEX idx_servico_id_catalog_client ON servico(id_catalog_client);

-- Habilitar RLS
ALTER TABLE contrato ENABLE ROW LEVEL SECURITY;
ALTER TABLE servico ENABLE ROW LEVEL SECURITY;

-- Policies para contrato
CREATE POLICY "Team members can view contratos" ON contrato
  FOR SELECT USING (
    has_role(auth.uid(), 'team_member'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Team members can create contratos" ON contrato
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'team_member'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Team members can update contratos" ON contrato
  FOR UPDATE USING (
    has_role(auth.uid(), 'team_member'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete contratos" ON contrato
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role)
  );

-- Policies para servico
CREATE POLICY "Team members can view servicos" ON servico
  FOR SELECT USING (
    has_role(auth.uid(), 'team_member'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Team members can create servicos" ON servico
  FOR INSERT WITH CHECK (
    has_role(auth.uid(), 'team_member'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Team members can update servicos" ON servico
  FOR UPDATE USING (
    has_role(auth.uid(), 'team_member'::app_role) OR 
    has_role(auth.uid(), 'admin'::app_role)
  );

CREATE POLICY "Admins can delete servicos" ON servico
  FOR DELETE USING (
    has_role(auth.uid(), 'admin'::app_role)
  );