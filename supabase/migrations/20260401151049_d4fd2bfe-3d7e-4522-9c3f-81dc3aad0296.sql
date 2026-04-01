
-- Bloco 1: Renomear coluna na tabela per
ALTER TABLE public.per RENAME COLUMN numero_processo_per TO nr_per;

-- Bloco 2: Adicionar colunas soft-delete na tabela per
ALTER TABLE public.per ADD COLUMN excluido CHAR(1);
ALTER TABLE public.per ADD COLUMN nr_cancelamento TEXT;

-- Bloco 3: Adicionar colunas soft-delete na tabela dcomp
ALTER TABLE public.dcomp ADD COLUMN excluido CHAR(1);
ALTER TABLE public.dcomp ADD COLUMN nr_cancelamento TEXT;

-- Bloco 4: Recriar view per_with_contribuinte
DROP VIEW IF EXISTS public.per_with_contribuinte;

CREATE VIEW public.per_with_contribuinte
WITH (security_invoker = on) AS
SELECT
  p.nr_per,
  p.exercicio,
  p.tri_exercicio,
  p.dt_solicitada,
  p.tp_credito,
  p.vlr_credito,
  p.nr_proc_ret,
  p.criado_em,
  p.criado_por,
  p.id_contribuinte,
  p.atualizado_em,
  p.atualizado_por,
  p.vlr_ressarcido,
  p.porcentagem_psa,
  c.nome_razao_social AS contribuinte_nome,
  c.ambiente AS contribuinte_ambiente,
  p.excluido,
  p.nr_cancelamento
FROM public.per p
LEFT JOIN public.contribuinte c ON c.id = p.id_contribuinte;
