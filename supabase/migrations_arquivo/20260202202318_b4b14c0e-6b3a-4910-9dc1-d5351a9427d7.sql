-- Primeiro, deletar registros existentes na tabela per (se houver)
-- pois não podemos adicionar NOT NULL sem valor padrão
DELETE FROM public.per;

-- Adicionar coluna id_contribuinte como NOT NULL
ALTER TABLE public.per
ADD COLUMN id_contribuinte UUID NOT NULL REFERENCES public.contribuinte(id);

-- Criar índice para performance em consultas
CREATE INDEX idx_per_id_contribuinte ON public.per(id_contribuinte);