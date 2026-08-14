-- Criar tabela cliente_dev com a mesma estrutura de cliente
CREATE TABLE public.cliente_dev (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  ativo boolean DEFAULT true,
  nome text NOT NULL,
  fixo text,
  telefone text,
  setor_cliente text,
  municipio text,
  uf text
);

-- Enable RLS
ALTER TABLE public.cliente_dev ENABLE ROW LEVEL SECURITY;

-- Mesmas políticas RLS da tabela cliente
CREATE POLICY "Admins can delete clientes_dev"
ON public.cliente_dev
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create clientes_dev"
ON public.cliente_dev
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update clientes_dev"
ON public.cliente_dev
FOR UPDATE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can view clientes_dev"
ON public.cliente_dev
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Criar tabela contribuinte_dev com a mesma estrutura de contribuinte
CREATE TABLE public.contribuinte_dev (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL,
  simples_nacional boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  tipo_pessoa text NOT NULL,
  cpf_cnpj text,
  nome_razao_social text NOT NULL,
  inscricao_estadual text,
  cod_cnae text,
  setor text,
  -- FK para cliente_dev
  CONSTRAINT fk_cliente_dev FOREIGN KEY (cliente_id) REFERENCES public.cliente_dev(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.contribuinte_dev ENABLE ROW LEVEL SECURITY;

-- Mesmas políticas RLS da tabela contribuinte
CREATE POLICY "Admins can delete contribuintes_dev"
ON public.contribuinte_dev
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create contribuintes_dev"
ON public.contribuinte_dev
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update contribuintes_dev"
ON public.contribuinte_dev
FOR UPDATE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can view contribuintes_dev"
ON public.contribuinte_dev
FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));