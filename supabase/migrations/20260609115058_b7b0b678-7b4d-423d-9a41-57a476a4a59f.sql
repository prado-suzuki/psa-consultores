-- Remove auto-FK que dependia da PK antiga
ALTER TABLE public.process_stages DROP CONSTRAINT IF EXISTS process_stages_stage_as_is_fk;
-- Substitui PK por (id, scenario)
ALTER TABLE public.process_stages DROP CONSTRAINT process_stages_pkey;
ALTER TABLE public.process_stages ADD CONSTRAINT process_stages_pkey PRIMARY KEY (id, scenario);
-- A unique (id, scenario) anterior vira redundante (PK já cobre), mas é mantida para preservar FKs nomeados das tabelas etapa_*/gargalo_etapas que dependem dela.