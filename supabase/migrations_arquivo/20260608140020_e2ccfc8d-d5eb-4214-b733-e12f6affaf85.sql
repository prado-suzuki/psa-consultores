BEGIN;

DELETE FROM public.distribuicao_dcomp
 WHERE nr_documento IN (
   SELECT nr_documento FROM public.dcomp WHERE nr_per_orig = '111111111111111111111111'
 );
DELETE FROM public.dcomp WHERE nr_per_orig = '111111111111111111111111';
DELETE FROM public.per_situacao WHERE nr_proc_per = '111111111111111111111111';
DELETE FROM public.per WHERE nr_per = '111111111111111111111111';

DELETE FROM public.distribuicao_dcomp WHERE nr_documento = '565432531312312312321312';
DELETE FROM public.dcomp WHERE nr_documento = '565432531312312312321312';

DROP VIEW IF EXISTS public.per_with_contribuinte;

ALTER TABLE public.per   DROP COLUMN IF EXISTS excluido,
                          DROP COLUMN IF EXISTS nr_cancelamento;
ALTER TABLE public.dcomp DROP COLUMN IF EXISTS excluido,
                          DROP COLUMN IF EXISTS nr_cancelamento;

CREATE VIEW public.per_with_contribuinte AS
SELECT p.nr_per,
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
       c.ambiente          AS contribuinte_ambiente
  FROM public.per p
  LEFT JOIN public.contribuinte c ON c.id = p.id_contribuinte;

GRANT SELECT ON public.per_with_contribuinte TO authenticated;
GRANT ALL    ON public.per_with_contribuinte TO service_role;

COMMIT;