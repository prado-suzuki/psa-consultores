CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION public.mapa_uuid(slug text) RETURNS uuid
LANGUAGE sql IMMUTABLE
SET search_path TO 'public'
AS $$ SELECT md5('mapa-osg:' || slug)::uuid $$;