-- Remover trigger antigo que usa updated_at
DROP TRIGGER IF EXISTS set_per_updated_at ON public.per;
DROP TRIGGER IF EXISTS set_dcomp_updated_at ON public.dcomp;