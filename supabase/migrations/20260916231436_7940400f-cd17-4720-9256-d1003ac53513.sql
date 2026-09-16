-- 20260915223513_motor_item_decimal_e_titulo_da_clausula.sql
-- O motor documental aprende a numeracao do ACORDO DE QUOTISTAS.
-- (cabecalho completo no arquivo do repositorio)

ALTER TABLE public.tmpl_bloco
  DROP CONSTRAINT IF EXISTS tmpl_bloco_tipo_check;
ALTER TABLE public.tmpl_bloco
  ADD CONSTRAINT tmpl_bloco_tipo_check
    CHECK (tipo = ANY (ARRAY['capitulo'::text, 'clausula'::text, 'paragrafo'::text,
                             'item'::text, 'livre'::text]));

ALTER TABLE public.tmpl_bloco
  ADD COLUMN IF NOT EXISTS titulo_documento text;

COMMENT ON COLUMN public.tmpl_bloco.titulo_documento IS
  'Titulo que sai DEPOIS do ordinal no documento ("CLAUSULA PRIMEIRA – Definicoes..."). '
  'So a clausula usa; nulo mantem a forma do contrato social, "CLAUSULA PRIMEIRA:". '
  'Nao confundir com `nome`, que e rotulo de biblioteca.';

-- GATE: prova que o tipo novo entra, que os quatro antigos continuam entrando,
-- que um quinto valor qualquer e recusado, e que o titulo grava e volta.
DO $$
DECLARE
  v_falhas text[] := ARRAY[]::text[];
  v_bloco  uuid;
  v_titulo text;
  v_tipo   text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'tmpl_bloco'
       AND column_name = 'titulo_documento'
  ) THEN
    v_falhas := v_falhas || 'titulo_documento nao foi criada';
  END IF;

  FOREACH v_tipo IN ARRAY ARRAY['capitulo', 'clausula', 'paragrafo', 'item', 'livre'] LOOP
    BEGIN
      INSERT INTO public.tmpl_bloco (nome, tipo, categoria)
      VALUES (format('GATE %s', v_tipo), v_tipo, 'gate-temporario')
      RETURNING id INTO v_bloco;
      DELETE FROM public.tmpl_bloco WHERE id = v_bloco;
    EXCEPTION WHEN check_violation THEN
      v_falhas := v_falhas || format('o CHECK recusou o tipo %s', v_tipo);
    END;
  END LOOP;

  -- Um valor fora da lista continua barrado.
  BEGIN
    INSERT INTO public.tmpl_bloco (nome, tipo, categoria)
    VALUES ('GATE invalido', 'subitem', 'gate-temporario') RETURNING id INTO v_bloco;
    DELETE FROM public.tmpl_bloco WHERE id = v_bloco;
    v_falhas := v_falhas || 'o CHECK aceitou um tipo fora da lista';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  -- O titulo grava e volta inteiro, com acento.
  INSERT INTO public.tmpl_bloco (nome, tipo, categoria, titulo_documento)
  VALUES ('GATE titulo', 'clausula', 'gate-temporario',
          'Definições das expressões utilizadas neste ACORDO.')
  RETURNING id INTO v_bloco;
  SELECT titulo_documento INTO v_titulo FROM public.tmpl_bloco WHERE id = v_bloco;
  IF v_titulo <> 'Definições das expressões utilizadas neste ACORDO.' THEN
    v_falhas := v_falhas || format('o titulo voltou diferente: "%s"', v_titulo);
  END IF;
  DELETE FROM public.tmpl_bloco WHERE id = v_bloco;

  -- Nenhum bloco existente ficou com titulo por acidente.
  IF EXISTS (SELECT 1 FROM public.tmpl_bloco WHERE titulo_documento IS NOT NULL) THEN
    v_falhas := v_falhas || 'algum bloco existente nasceu com titulo_documento';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE motor item decimal: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;