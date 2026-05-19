ALTER TABLE public.ordem_servico
  ADD COLUMN IF NOT EXISTS regiao           text,
  ADD COLUMN IF NOT EXISTS setor_cliente    text,
  ADD COLUMN IF NOT EXISTS setor_cliente_id uuid REFERENCES public.setor_cliente(id);

CREATE INDEX IF NOT EXISTS idx_ordem_servico_regiao           ON public.ordem_servico(regiao);
CREATE INDEX IF NOT EXISTS idx_ordem_servico_setor_cliente_id ON public.ordem_servico(setor_cliente_id);

UPDATE public.ordem_servico os
SET regiao           = COALESCE(os.regiao,           c.regiao),
    setor_cliente    = COALESCE(os.setor_cliente,    c.setor_cliente),
    setor_cliente_id = COALESCE(os.setor_cliente_id, c.setor_cliente_id)
FROM public.cliente c
WHERE os.id_cliente = c.id
  AND os.excluido = false
  AND (c.regiao IS NOT NULL OR c.setor_cliente IS NOT NULL OR c.setor_cliente_id IS NOT NULL);

CREATE OR REPLACE VIEW public.cliente_setor_regiao_atual AS
SELECT DISTINCT ON (os.id_cliente)
  os.id_cliente,
  os.setor_cliente,
  os.setor_cliente_id,
  os.regiao
FROM public.ordem_servico os
WHERE os.excluido = false
ORDER BY os.id_cliente, os.data_emissao DESC NULLS LAST, os.created_at DESC;