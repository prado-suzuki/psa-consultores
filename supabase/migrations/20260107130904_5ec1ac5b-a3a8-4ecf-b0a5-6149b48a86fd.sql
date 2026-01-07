-- Tabela CLIENTE (agrupador lógico - pasta raiz)
CREATE TABLE public.cliente (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    fixo TEXT,
    telefone TEXT,
    setor_cliente TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Tabela CONTRIBUINTE (PF ou PJ - entidade fiscal)
CREATE TABLE public.contribuinte (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
    tipo_pessoa TEXT NOT NULL CHECK (tipo_pessoa IN ('PF', 'PJ')),
    cpf_cnpj TEXT,
    nome_razao_social TEXT NOT NULL,
    inscricao_estadual TEXT,
    cod_cnae TEXT,
    setor TEXT,
    simples_nacional BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_contribuinte_cliente_id ON public.contribuinte(cliente_id);
CREATE INDEX idx_contribuinte_cpf_cnpj ON public.contribuinte(cpf_cnpj);
CREATE INDEX idx_contribuinte_tipo_pessoa ON public.contribuinte(tipo_pessoa);

-- Habilitar RLS
ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribuinte ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para CLIENTE
CREATE POLICY "Team members can view clientes"
ON public.cliente FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create clientes"
ON public.cliente FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update clientes"
ON public.cliente FOR UPDATE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete clientes"
ON public.cliente FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Políticas RLS para CONTRIBUINTE
CREATE POLICY "Team members can view contribuintes"
ON public.contribuinte FOR SELECT
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can create contribuintes"
ON public.contribuinte FOR INSERT
WITH CHECK (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Team members can update contribuintes"
ON public.contribuinte FOR UPDATE
USING (has_role(auth.uid(), 'team_member'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete contribuintes"
ON public.contribuinte FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers para updated_at
CREATE TRIGGER update_cliente_updated_at
BEFORE UPDATE ON public.cliente
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contribuinte_updated_at
BEFORE UPDATE ON public.contribuinte
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();