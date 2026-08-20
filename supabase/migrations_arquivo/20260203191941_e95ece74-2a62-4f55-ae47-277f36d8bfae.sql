-- 1. Criar a função
CREATE OR REPLACE FUNCTION public.update_atualizado_em_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Recriar o trigger com a função correta
CREATE OR REPLACE TRIGGER update_per_atualizado_em
BEFORE UPDATE ON public.per
FOR EACH ROW
EXECUTE FUNCTION public.update_atualizado_em_column();

-- 3. Fazer o mesmo para dcomp
CREATE OR REPLACE TRIGGER update_dcomp_atualizado_em
BEFORE UPDATE ON public.dcomp
FOR EACH ROW
EXECUTE FUNCTION public.update_atualizado_em_column();