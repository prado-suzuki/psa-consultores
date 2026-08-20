DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname='osg_doc_area') THEN
    CREATE TYPE public.osg_doc_area AS ENUM ('osg','fiscal');
  END IF;
END $$;

ALTER TABLE public.bem               ADD COLUMN IF NOT EXISTS vlr_itr_iptu numeric;
ALTER TABLE public.documento_arquivo ADD COLUMN IF NOT EXISTS area public.osg_doc_area;