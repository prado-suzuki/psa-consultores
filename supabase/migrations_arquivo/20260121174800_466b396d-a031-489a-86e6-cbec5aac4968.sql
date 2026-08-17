-- Create difal_sessao table
CREATE TABLE public.difal_sessao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id TEXT NOT NULL,
  cliente_id TEXT NOT NULL,
  cliente_nome TEXT,
  periodo TEXT NOT NULL,
  uf TEXT NOT NULL,
  request_original JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'EM_ANDAMENTO',
  criado_em TIMESTAMPTZ DEFAULT NOW(),
  sincronizado_em TIMESTAMPTZ
);

-- Create difal_decisao table
CREATE TABLE public.difal_decisao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sessao_id UUID NOT NULL REFERENCES difal_sessao(id) ON DELETE CASCADE,
  cod_ncm TEXT NOT NULL,
  decisao TEXT NOT NULL,
  id_icms_st_bq TEXT,
  decidido_em TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sessao_id, cod_ncm)
);

-- Enable RLS on both tables
ALTER TABLE public.difal_sessao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.difal_decisao ENABLE ROW LEVEL SECURITY;

-- RLS policies for difal_sessao
CREATE POLICY "Team members can view difal_sessao"
ON public.difal_sessao
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create difal_sessao"
ON public.difal_sessao
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update difal_sessao"
ON public.difal_sessao
FOR UPDATE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete difal_sessao"
ON public.difal_sessao
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for difal_decisao
CREATE POLICY "Team members can view difal_decisao"
ON public.difal_decisao
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create difal_decisao"
ON public.difal_decisao
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update difal_decisao"
ON public.difal_decisao
FOR UPDATE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete difal_decisao"
ON public.difal_decisao
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Create indexes for better performance
CREATE INDEX idx_difal_sessao_usuario ON public.difal_sessao(usuario_id);
CREATE INDEX idx_difal_sessao_cliente ON public.difal_sessao(cliente_id);
CREATE INDEX idx_difal_sessao_status ON public.difal_sessao(status);
CREATE INDEX idx_difal_decisao_sessao ON public.difal_decisao(sessao_id);
CREATE INDEX idx_difal_decisao_ncm ON public.difal_decisao(cod_ncm);