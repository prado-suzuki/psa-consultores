ALTER TABLE public.administracao
  ADD COLUMN IF NOT EXISTS poderes jsonb;

COMMENT ON COLUMN public.administracao.poderes IS
  'Poderes do administrador: { forma: isolada|conjunta, excecoes: [{ atos, '
  'exigencia }], observacao }. `forma` é a regra geral (espelhada em '
  'pode_isoladamente), `excecoes` são os atos que fogem dela e `observacao` é '
  'texto livre. Nulo = cadastro anterior à coluna; nesse caso a forma vem de '
  'pode_isoladamente.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'administracao_poderes_objeto'
      AND conrelid = 'public.administracao'::regclass
  ) THEN
    ALTER TABLE public.administracao
      ADD CONSTRAINT administracao_poderes_objeto
      CHECK (poderes IS NULL OR jsonb_typeof(poderes) = 'object') NOT VALID;
  END IF;
END $$;