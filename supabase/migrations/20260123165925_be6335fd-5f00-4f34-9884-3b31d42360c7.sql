-- 1. Criar tabela de clientes internos (áreas/setores)
CREATE TABLE public.catalog_clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  responsible TEXT,
  description TEXT,
  color TEXT DEFAULT '#3B82F6',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.catalog_clients ENABLE ROW LEVEL SECURITY;

-- 3. Políticas RLS
CREATE POLICY "Team members can view catalog_clients"
ON public.catalog_clients FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can create catalog_clients"
ON public.catalog_clients FOR INSERT
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update catalog_clients"
ON public.catalog_clients FOR UPDATE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete catalog_clients"
ON public.catalog_clients FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- 4. Adicionar FK client_id nas tabelas existentes
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.catalog_clients(id);
ALTER TABLE public.processes ADD COLUMN IF NOT EXISTS client_id UUID REFERENCES public.catalog_clients(id);

-- 5. Inserir clientes internos (áreas)
INSERT INTO public.catalog_clients (name, responsible, color) VALUES
  ('Fiscal', 'Ricardo', '#EF4444'),
  ('Consultoria', 'Felipe', '#3B82F6'),
  ('Fixos', 'Washington', '#F59E0B'),
  ('Transversal', NULL, '#8B5CF6');

-- 6. Inserir projetos
INSERT INTO public.projects (name, status, client_name, description, client_id)
SELECT 'Backlog - Templates Planej.', 'active', 'PSA CONSULTORES', 'Área: Consultoria', c.id FROM public.catalog_clients c WHERE c.name = 'Consultoria';

INSERT INTO public.projects (name, status, client_name, description, client_id)
SELECT 'P2 - Automação SPED', 'active', 'PSA CONSULTORES', 'Área: Fiscal', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.projects (name, status, client_name, description, client_id)
SELECT 'P3 - Automação Consultas', 'active', 'PSA CONSULTORES', 'Área: Fiscal', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.projects (name, status, client_name, description, client_id)
SELECT 'P4 - Automatização PIS e COFINS', 'active', 'PSA CONSULTORES', 'Área: Fiscal', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.projects (name, status, client_name, description, client_id)
SELECT 'P5 - Dashboard PERDCOMP', 'active', 'PSA CONSULTORES', 'Área: Fiscal', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.projects (name, status, client_name, description, client_id)
SELECT 'P6 - Dashboard Gestão', 'active', 'PSA CONSULTORES', 'Área: Transversal', c.id FROM public.catalog_clients c WHERE c.name = 'Transversal';

INSERT INTO public.projects (name, status, client_name, description, client_id)
SELECT 'P7 - DIFAL Inteligente', 'active', 'PSA CONSULTORES', 'Área: Fiscal', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.projects (name, status, client_name, description, client_id)
SELECT 'P8 - Templates Papéis Trabalho', 'active', 'PSA CONSULTORES', 'Área: Transversal', c.id FROM public.catalog_clients c WHERE c.name = 'Transversal';

-- 7. Inserir processos com client_id
INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-FISCAL-008', 'Planejamento Tributário', 'Consultoria', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Consultoria';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-FISCAL-005', 'Download do arquivo XML NF-e', 'Fiscal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-001', 'Quebra de Obrigações Acessórias (SPEDs)', 'Transversal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Transversal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-FISCAL-007', 'Consulta de CNPJ (CNAE e SN)', 'Fiscal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-FISCAL-001', 'Consultas de NCM', 'Fiscal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-FISCAL-003', 'Levantamento de Crédito PIS/COFINS', 'Fiscal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-FISCAL-002', 'Controle de Saldos PIS/COFINS/IPI', 'Fiscal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-BI-001', 'Controle de Contratos Fixos e Acompanhamento de Prazos', 'Transversal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Transversal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-TRA-001', 'Onboarding de Novos Clientes e Solicitação de Documentos', 'Transversal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Transversal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-002', 'Controle e Acompanhamento de Projetos Tributários', 'Transversal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Transversal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-BI-002', 'Distribuição de Carga de Trabalho e Performance da Equipe', 'Transversal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Transversal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-FISCAL-004', 'Apuração do DIFAL', 'Fiscal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Fiscal';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-FIXO-009', 'Revisão de Tributos (IRPF, PIS/COFINS, IRPJ/CSLL, LCDPR)', 'Fixos', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Fixos';

INSERT INTO public.processes (code, name, area, stage, client_id)
SELECT 'PROC-PAD-002', 'Elaboração de Papéis de Trabalho Contábeis e Fiscais', 'Transversal', 'discovery', c.id FROM public.catalog_clients c WHERE c.name = 'Transversal';

-- 8. Criar links project_processes
-- Backlog - Templates Planej. -> PROC-FISCAL-008
INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'Backlog - Templates Planej.' AND pr.code = 'PROC-FISCAL-008';

-- P2 - Automação SPED -> PROC-FISCAL-005, PROC-001
INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P2 - Automação SPED' AND pr.code = 'PROC-FISCAL-005';

INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P2 - Automação SPED' AND pr.code = 'PROC-001';

-- P3 - Automação Consultas -> PROC-FISCAL-007, PROC-FISCAL-001
INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P3 - Automação Consultas' AND pr.code = 'PROC-FISCAL-007';

INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P3 - Automação Consultas' AND pr.code = 'PROC-FISCAL-001';

-- P4 - Automatização PIS e COFINS -> PROC-FISCAL-003, PROC-FISCAL-002
INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P4 - Automatização PIS e COFINS' AND pr.code = 'PROC-FISCAL-003';

INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P4 - Automatização PIS e COFINS' AND pr.code = 'PROC-FISCAL-002';

-- P5 - Dashboard PERDCOMP -> PROC-BI-001
INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P5 - Dashboard PERDCOMP' AND pr.code = 'PROC-BI-001';

-- P6 - Dashboard Gestão -> PROC-TRA-001, PROC-002, PROC-BI-002
INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P6 - Dashboard Gestão' AND pr.code = 'PROC-TRA-001';

INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P6 - Dashboard Gestão' AND pr.code = 'PROC-002';

INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P6 - Dashboard Gestão' AND pr.code = 'PROC-BI-002';

-- P7 - DIFAL Inteligente -> PROC-FISCAL-004
INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P7 - DIFAL Inteligente' AND pr.code = 'PROC-FISCAL-004';

-- P8 - Templates Papéis Trabalho -> PROC-FIXO-009, PROC-PAD-002
INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P8 - Templates Papéis Trabalho' AND pr.code = 'PROC-FIXO-009';

INSERT INTO public.project_processes (project_id, process_id, impact_type)
SELECT p.id, pr.id, 'primario'
FROM public.projects p, public.processes pr
WHERE p.name = 'P8 - Templates Papéis Trabalho' AND pr.code = 'PROC-PAD-002';