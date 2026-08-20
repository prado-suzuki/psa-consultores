-- Adicionar colunas de auditoria na tabela per
ALTER TABLE public.per
ADD COLUMN atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN atualizado_por UUID;

-- Adicionar colunas de auditoria na tabela dcomp
ALTER TABLE public.dcomp
ADD COLUMN atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT now(),
ADD COLUMN atualizado_por UUID;

-- Criar trigger para atualizar automaticamente o atualizado_em na tabela per
CREATE TRIGGER update_per_atualizado_em
BEFORE UPDATE ON public.per
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Criar trigger para atualizar automaticamente o atualizado_em na tabela dcomp
CREATE TRIGGER update_dcomp_atualizado_em
BEFORE UPDATE ON public.dcomp
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();