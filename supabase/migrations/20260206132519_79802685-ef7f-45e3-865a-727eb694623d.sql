-- Add nr_dcomp_ret column for DCOMP rectification tracking
ALTER TABLE public.dcomp 
ADD COLUMN nr_dcomp_ret character varying REFERENCES public.dcomp(nr_documento);

-- Add index for better performance on rectification lookups
CREATE INDEX idx_dcomp_nr_dcomp_ret ON public.dcomp(nr_dcomp_ret) WHERE nr_dcomp_ret IS NOT NULL;