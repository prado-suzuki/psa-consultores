-- Adicionar coluna process_id na tabela project_documents para vincular documentos a processos
ALTER TABLE project_documents 
ADD COLUMN IF NOT EXISTS process_id UUID REFERENCES processes(id) ON DELETE SET NULL;

-- Criar índice para buscas por processo
CREATE INDEX IF NOT EXISTS idx_project_documents_process_id ON project_documents(process_id);

-- Adicionar colunas para detalhamento formatado nos processos
ALTER TABLE processes 
ADD COLUMN IF NOT EXISTS formatted_content TEXT,
ADD COLUMN IF NOT EXISTS document_path TEXT,
ADD COLUMN IF NOT EXISTS last_ai_sync TIMESTAMPTZ;