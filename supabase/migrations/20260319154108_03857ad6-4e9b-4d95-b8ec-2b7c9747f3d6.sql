
-- Update existing data values
UPDATE public.cliente SET ambiente = 'prod' WHERE ambiente = 'producao';
UPDATE public.cliente SET ambiente = 'dev' WHERE ambiente = 'desenvolvimento';
UPDATE public.contribuinte SET ambiente = 'prod' WHERE ambiente = 'producao';
UPDATE public.contribuinte SET ambiente = 'dev' WHERE ambiente = 'desenvolvimento';

-- Update default values
ALTER TABLE public.cliente ALTER COLUMN ambiente SET DEFAULT 'prod';
ALTER TABLE public.contribuinte ALTER COLUMN ambiente SET DEFAULT 'prod';
