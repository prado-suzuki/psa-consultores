-- 20260916122149_motor_subitem_alinea_inciso.sql
-- Os tres niveis que faltavam para o Acordo de Quotistas caber no motor.
-- (cabecalho completo no arquivo do repositorio)

ALTER TABLE public.tmpl_bloco
  DROP CONSTRAINT IF EXISTS tmpl_bloco_tipo_check;
ALTER TABLE public.tmpl_bloco
  ADD CONSTRAINT tmpl_bloco_tipo_check
    CHECK (tipo = ANY (ARRAY['capitulo'::text, 'clausula'::text, 'paragrafo'::text,
                             'item'::text, 'subitem'::text, 'alinea'::text,
                             'inciso'::text, 'livre'::text]));

-- GATE: os oito entram, um nono e recusado.
DO $$
DECLARE
  v_falhas text[] := ARRAY[]::text[];
  v_bloco  uuid;
  v_tipo   text;
BEGIN
  FOREACH v_tipo IN ARRAY ARRAY['capitulo', 'clausula', 'paragrafo', 'item',
                                'subitem', 'alinea', 'inciso', 'livre'] LOOP
    BEGIN
      INSERT INTO public.tmpl_bloco (nome, tipo, categoria)
      VALUES (format('GATE %s', v_tipo), v_tipo, 'gate-temporario')
      RETURNING id INTO v_bloco;
      DELETE FROM public.tmpl_bloco WHERE id = v_bloco;
    EXCEPTION WHEN check_violation THEN
      v_falhas := v_falhas || format('o CHECK recusou o tipo %s', v_tipo);
    END;
  END LOOP;

  BEGIN
    INSERT INTO public.tmpl_bloco (nome, tipo, categoria)
    VALUES ('GATE invalido', 'subsubitem', 'gate-temporario') RETURNING id INTO v_bloco;
    DELETE FROM public.tmpl_bloco WHERE id = v_bloco;
    v_falhas := v_falhas || 'o CHECK aceitou um tipo fora da lista';
  EXCEPTION WHEN check_violation THEN
    NULL;
  END;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE motor tres niveis: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;