
-- Create procedimentos table
CREATE TABLE public.procedimentos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_url text,
  source_type text NOT NULL CHECK (source_type IN ('link', 'pdf', 'docx')),
  arquivo_path text,
  processos_associados text[] DEFAULT '{}',
  ai_titulo text,
  ai_resumo text,
  ai_etapas jsonb DEFAULT '[]',
  ai_complexidade text CHECK (ai_complexidade IN ('simples', 'intermediario', 'avancado')),
  ai_tags text[] DEFAULT '{}',
  status_geracao text DEFAULT 'processando' CHECK (status_geracao IN ('processando', 'gerado', 'erro')),
  status_publicacao text DEFAULT 'ativo' CHECK (status_publicacao IN ('ativo', 'em_revisao', 'arquivado')),
  erro_mensagem text,
  confirmado_por uuid,
  confirmado_em timestamptz,
  created_by uuid DEFAULT auth.uid(),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;

-- SELECT: team members see only published+confirmed; admins/liders see all
CREATE POLICY "select_procedimentos_member"
  ON public.procedimentos FOR SELECT
  USING (
    (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lider') OR has_role(auth.uid(), 'sublider'))
    OR
    (
      (has_role(auth.uid(), 'team_member'))
      AND status_publicacao = 'ativo'
      AND status_geracao = 'gerado'
      AND confirmado_por IS NOT NULL
    )
  );

-- INSERT: admin and lider only
CREATE POLICY "insert_procedimentos"
  ON public.procedimentos FOR INSERT
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lider')
  );

-- UPDATE: admin and lider only
CREATE POLICY "update_procedimentos"
  ON public.procedimentos FOR UPDATE
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lider')
  );

-- DELETE: admin and lider only
CREATE POLICY "delete_procedimentos"
  ON public.procedimentos FOR DELETE
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'lider')
  );

-- Trigger for updated_at
CREATE TRIGGER update_procedimentos_updated_at
  BEFORE UPDATE ON public.procedimentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
