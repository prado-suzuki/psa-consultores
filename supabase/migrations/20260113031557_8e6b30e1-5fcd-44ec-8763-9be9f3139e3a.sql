-- Criar tabela de contatos/leads
CREATE TABLE public.contatos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nome_completo TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  empresa TEXT,
  mensagem TEXT NOT NULL,
  servico_interesse TEXT,
  status TEXT DEFAULT 'novo' CHECK (status IN ('novo', 'em_andamento', 'convertido', 'arquivado')),
  notas_internas TEXT,
  atendido_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_contatos_updated_at
  BEFORE UPDATE ON public.contatos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies
ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

-- Qualquer pessoa pode inserir (formulário público)
CREATE POLICY "Qualquer pessoa pode enviar contato" ON public.contatos
  FOR INSERT TO anon, authenticated WITH CHECK (true);

-- Apenas equipe pode ver contatos
CREATE POLICY "Equipe pode ver contatos" ON public.contatos
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'team_member'))
  );

-- Apenas equipe pode atualizar contatos
CREATE POLICY "Equipe pode atualizar contatos" ON public.contatos
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('admin', 'team_member'))
  );

-- Apenas admin pode deletar contatos
CREATE POLICY "Admin pode deletar contatos" ON public.contatos
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin')
  );