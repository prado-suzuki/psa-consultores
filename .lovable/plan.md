

# Plano: Criar Tabelas contrato e servico

## Objetivo

Criar as tabelas `contrato` e `servico` com as FKs ajustadas para as tabelas existentes no banco e adicionar triggers para atualização automática do campo `updated_at`.

## Ajustes Necessários no SQL Original

| Item | Original | Ajustado |
|------|----------|----------|
| FK cliente | `cliente(id_cliente)` | `cliente(id)` |
| FK equipe | `equipe(id_equipe)` | `catalog_clients(id)` |
| Coluna equipe | `id_equipe` | `id_catalog_client` |
| Função trigger | Criar nova | Usar existente |

## Estrutura das Tabelas

### Tabela contrato

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| id_contrato | UUID | Sim (PK) | Identificador único |
| id_cliente | UUID | Sim (FK) | Referência para cliente(id) |
| numero_contrato | TEXT | Não | Número do contrato |
| valor_fixo | NUMERIC | Não | Valor fixo do contrato |
| aliquota_contrato | NUMERIC | Não | Alíquota do contrato |
| data_inicio | DATE | Não | Data de início |
| data_fim | DATE | Não | Data de término |
| tipo_contrato | TEXT | Não | Tipo do contrato |
| created_at | TIMESTAMPTZ | Não | Data de criação |
| updated_at | TIMESTAMPTZ | Não | Data de atualização |

### Tabela servico

| Coluna | Tipo | Obrigatório | Descrição |
|--------|------|-------------|-----------|
| id_servico | UUID | Sim (PK) | Identificador único |
| id_contrato | UUID | Sim (FK) | Referência para contrato |
| descricao | TEXT | Não | Descrição do serviço |
| valor | DOUBLE PRECISION | Não | Valor do serviço |
| id_catalog_client | UUID | Não (FK) | Referência para catalog_clients |
| created_at | TIMESTAMPTZ | Não | Data de criação |
| updated_at | TIMESTAMPTZ | Não | Data de atualização |

## Diagrama de Relacionamentos

```text
+----------------+       +----------------+       +-------------------+
|    cliente     |       |    contrato    |       |      servico      |
+----------------+       +----------------+       +-------------------+
| id (PK)        |<------| id_cliente(FK) |       | id_servico (PK)   |
| nome           |       | id_contrato(PK)|<------| id_contrato (FK)  |
| ...            |       | numero_contrato|       | descricao         |
+----------------+       | valor_fixo     |       | valor             |
                         | ...            |       | id_catalog_client |--+
                         +----------------+       +-------------------+  |
                                                                         |
+-------------------+                                                    |
| catalog_clients   |<---------------------------------------------------+
+-------------------+
| id (PK)           |
| name              |
| ...               |
+-------------------+
```

## Policies RLS

Seguindo o padrão do projeto, as tabelas terão RLS com acesso para team_member e admin:

| Operação | Permissão |
|----------|-----------|
| SELECT | team_member OU admin |
| INSERT | team_member OU admin |
| UPDATE | team_member OU admin |
| DELETE | admin apenas |

## SQL da Migração

```sql
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
```

## Ordem de Execução

1. Executar migração SQL com todas as tabelas, triggers, índices e policies
2. Verificar criação das tabelas
3. Testar inserção de dados de exemplo

