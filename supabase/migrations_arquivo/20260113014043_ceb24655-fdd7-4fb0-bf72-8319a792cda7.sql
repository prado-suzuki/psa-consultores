-- Criar tabela para gerenciar novidades
CREATE TABLE public.novidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria TEXT NOT NULL CHECK (categoria IN ('empresa', 'tributario', 'servicos', 'cases')),
  titulo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  data_publicacao TIMESTAMP WITH TIME ZONE DEFAULT now(),
  itens TEXT[] DEFAULT '{}',
  imagem_url TEXT,
  botao_texto TEXT,
  botao_url TEXT,
  ativo BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.novidades ENABLE ROW LEVEL SECURITY;

-- Politica: Qualquer pessoa pode ler novidades ativas (pagina publica)
CREATE POLICY "Novidades ativas sao publicas" ON public.novidades
  FOR SELECT USING (ativo = true);

-- Politica: Admins podem ver todas as novidades
CREATE POLICY "Admins podem ver todas novidades" ON public.novidades
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Politica: Admins podem criar novidades
CREATE POLICY "Admins podem criar novidades" ON public.novidades
  FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Politica: Admins podem atualizar novidades
CREATE POLICY "Admins podem atualizar novidades" ON public.novidades
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Politica: Admins podem deletar novidades
CREATE POLICY "Admins podem deletar novidades" ON public.novidades
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_novidades_updated_at
  BEFORE UPDATE ON public.novidades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();