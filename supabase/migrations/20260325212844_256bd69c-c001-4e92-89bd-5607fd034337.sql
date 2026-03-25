
-- Desabilitar apenas triggers de usuario na tabela per
ALTER TABLE public.per DISABLE TRIGGER trg_validate_per_contribuinte;
ALTER TABLE public.per DISABLE TRIGGER update_per_atualizado_em;

-- DK Transportes: dependentes primeiro, depois o registro principal
UPDATE public.per SET id_contribuinte = '1dc16e34-89b2-426c-93ec-347de2c2b112' WHERE id_contribuinte = 'e4e3ccc9-a5e3-4ae3-a404-fed784c9d07b';
UPDATE public.contribuinte_bal_config SET id_contribuinte = '1dc16e34-89b2-426c-93ec-347de2c2b112' WHERE id_contribuinte = 'e4e3ccc9-a5e3-4ae3-a404-fed784c9d07b';
UPDATE public.contribuinte SET id = '1dc16e34-89b2-426c-93ec-347de2c2b112' WHERE id = 'e4e3ccc9-a5e3-4ae3-a404-fed784c9d07b';

-- Rene Jungeuira Barbour
UPDATE public.contribuinte SET id = '0b81b35b-447a-4359-8a8b-8e28cce3cc0f' WHERE id = 'a20fdaf0-b0e2-43d7-991c-7d3ef0de0ec6';

-- Reabilitar triggers
ALTER TABLE public.per ENABLE TRIGGER trg_validate_per_contribuinte;
ALTER TABLE public.per ENABLE TRIGGER update_per_atualizado_em;
