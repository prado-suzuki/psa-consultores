
WITH rep_unique AS (
  SELECT r.user_id, (array_agg(DISTINCT r.id_cliente))[1] AS id_cliente
  FROM public.representante r
  WHERE r.excluido = false AND r.id_cliente IS NOT NULL
  GROUP BY r.user_id
  HAVING COUNT(DISTINCT r.id_cliente) = 1
)
UPDATE public.tickets t
SET cliente_id = ru.id_cliente
FROM rep_unique ru
WHERE t.cliente_id IS NULL
  AND t.user_id = ru.user_id
  AND EXISTS (SELECT 1 FROM public.cliente c WHERE c.id = ru.id_cliente AND c.excluido = false);

WITH cc_unique AS (
  SELECT cliente_id, (array_agg(cluster_id))[1] AS cluster_id
  FROM public.cliente_clusters
  GROUP BY cliente_id
  HAVING COUNT(*) = 1
)
UPDATE public.tickets t
SET cluster_id = cu.cluster_id
FROM cc_unique cu
WHERE t.cluster_id IS NULL
  AND t.cliente_id = cu.cliente_id;

WITH area_unique AS (
  SELECT cluster_id, (array_agg(id))[1] AS area_id
  FROM public.estrutura_areas
  WHERE is_active = true AND cluster_id IS NOT NULL
  GROUP BY cluster_id
  HAVING COUNT(*) = 1
)
UPDATE public.tickets t
SET estrutura_area_id = au.area_id
FROM area_unique au
WHERE t.estrutura_area_id IS NULL
  AND t.cluster_id = au.cluster_id;
