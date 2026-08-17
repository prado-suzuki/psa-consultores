CREATE OR REPLACE VIEW public.per_with_contribuinte AS
SELECT
  p.*,
  COALESCE(c.nome_razao_social, cd.nome_razao_social) AS contribuinte_nome
FROM public.per p
LEFT JOIN public.contribuinte c ON c.id = p.id_contribuinte
LEFT JOIN public.contribuinte_dev cd ON cd.id = p.id_contribuinte;