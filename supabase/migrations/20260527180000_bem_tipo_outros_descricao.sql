-- Migration 20260527180000: descrição livre para bens do tipo "Outros" (OU)
ALTER TABLE public.bem
  ADD COLUMN IF NOT EXISTS descricao_outros text;

COMMENT ON COLUMN public.bem.descricao_outros IS
  'Descrição livre do tipo de bem quando tipo_bem = OU (Outros). NULL para os demais tipos.';
