
CREATE TABLE public.efd_correcoes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  contribuinte_id TEXT NOT NULL,
  arquivo_id UUID,
  empresa_cnpj TEXT,
  periodo TEXT,
  arquivo_tipo TEXT NOT NULL,
  registro_tipo TEXT NOT NULL,
  registro_original_id TEXT,
  tipo_operacao TEXT NOT NULL CHECK (tipo_operacao IN ('I', 'U', 'D')),
  snapshot JSONB NOT NULL,
  campos_alterados JSONB,
  batch_id UUID,
  motivo TEXT,
  usuario_id UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  ativo BOOLEAN DEFAULT true
);

CREATE UNIQUE INDEX idx_correcoes_unica_ativa
  ON public.efd_correcoes (registro_tipo, registro_original_id)
  WHERE ativo = true;

CREATE INDEX idx_correcoes_registro_ativo
  ON public.efd_correcoes (registro_tipo, registro_original_id)
  WHERE ativo = true;

CREATE INDEX idx_correcoes_empresa_periodo
  ON public.efd_correcoes (empresa_cnpj, periodo);

CREATE INDEX idx_correcoes_batch
  ON public.efd_correcoes (batch_id)
  WHERE batch_id IS NOT NULL;

ALTER TABLE public.efd_correcoes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Team members can manage efd_correcoes"
  ON public.efd_correcoes
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_member'))
  WITH CHECK (public.has_role(auth.uid(), 'team_member'));
