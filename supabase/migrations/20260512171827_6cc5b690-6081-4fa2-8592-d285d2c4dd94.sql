CREATE OR REPLACE FUNCTION public.generate_process_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_sigla   text;
  v_next    int;
  v_attempt int := 0;
  v_code    text;
BEGIN
  IF NEW.code IS NOT NULL AND length(trim(NEW.code)) > 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.client_id IS NOT NULL THEN
    SELECT upper(left(regexp_replace(coalesce(name, ''), '[^a-zA-Z]', '', 'g'), 6))
      INTO v_sigla
      FROM public.catalog_clients
     WHERE id = NEW.client_id;
  END IF;

  IF v_sigla IS NULL OR length(v_sigla) = 0 THEN
    v_sigla := 'GERAL';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;

    SELECT coalesce(max(
             nullif(regexp_replace(code, '^PROC-' || v_sigla || '-', ''), '')::int
           ), 0) + 1
      INTO v_next
      FROM public.processes
     WHERE code LIKE 'PROC-' || v_sigla || '-%';

    v_code := 'PROC-' || v_sigla || '-' || lpad(v_next::text, 3, '0');

    IF NOT EXISTS (SELECT 1 FROM public.processes WHERE code = v_code) THEN
      NEW.code := v_code;
      RETURN NEW;
    END IF;

    IF v_attempt >= 5 THEN
      RAISE EXCEPTION 'Falha ao gerar codigo unico para processo apos 5 tentativas (sigla=%, proximo=%)', v_sigla, v_next;
    END IF;
  END LOOP;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_process_code ON public.processes;
CREATE TRIGGER trg_generate_process_code
  BEFORE INSERT ON public.processes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_process_code();

CREATE UNIQUE INDEX IF NOT EXISTS uq_processes_code_not_null
  ON public.processes (code)
  WHERE code IS NOT NULL;