CREATE OR REPLACE VIEW public.per_with_contribuinte
WITH (security_invoker = on) AS
SELECT
  p.*,
  c.nome_razao_social AS contribuinte_nome,
  c.ambiente AS contribuinte_ambiente
FROM public.per p
LEFT JOIN public.contribuinte c ON c.id = p.id_contribuinte;