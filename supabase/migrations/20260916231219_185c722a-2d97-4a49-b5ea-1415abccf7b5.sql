-- 20260915135133_gov03_o_bloco_conferido.sql
-- GOV-03: o acordo passa a saber quais blocos alguem CONFERIU.
-- (cabecalho completo no arquivo do repositorio)

ALTER TABLE public.acordo_quotistas
  ADD COLUMN IF NOT EXISTS grupos_conferidos text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.acordo_quotistas.grupos_conferidos IS
  'GOV-03: as chaves dos blocos que alguem abriu e salvou. NAO e "preenchido": o '
  'acordo nasce semeado, e ter valor nao quer dizer que alguem olhou. E daqui que '
  'sai o selo de conferido no cartao e a liberacao do botao de nova versao.';

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_falhas  text[] := '{}';
  v_cliente uuid;
  v_acordo  uuid;
  v_lista   text[];
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'acordo_quotistas'
      AND column_name = 'grupos_conferidos'
  ) THEN
    v_falhas := v_falhas || 'a coluna nao foi criada';
  END IF;

  -- Acordo que ja existia nao pode nascer "conferido" por engano: o default e
  -- lista vazia, e nenhum bloco deles foi olhado por ninguem.
  IF EXISTS (
    SELECT 1 FROM public.acordo_quotistas
    WHERE grupos_conferidos IS NULL OR cardinality(grupos_conferidos) > 0
  ) THEN
    v_falhas := v_falhas || 'algum acordo existente nasceu com bloco conferido';
  END IF;

  -- Prova viva: grava, le de volta e apaga.
  SELECT id INTO v_cliente FROM public.cliente LIMIT 1;
  IF v_cliente IS NOT NULL THEN
    INSERT INTO public.acordo_quotistas (cliente_id, versao)
    VALUES (v_cliente, 999997) RETURNING id INTO v_acordo;

    IF (SELECT cardinality(grupos_conferidos) FROM public.acordo_quotistas WHERE id = v_acordo) <> 0 THEN
      v_falhas := v_falhas || 'acordo novo nao nasceu com a lista vazia';
    END IF;

    UPDATE public.acordo_quotistas
       SET grupos_conferidos = ARRAY['quorum', 'saida']
     WHERE id = v_acordo;

    SELECT grupos_conferidos INTO v_lista
      FROM public.acordo_quotistas WHERE id = v_acordo;
    IF v_lista <> ARRAY['quorum', 'saida'] THEN
      v_falhas := v_falhas || 'a lista nao voltou como foi gravada';
    END IF;

    DELETE FROM public.acordo_quotistas WHERE id = v_acordo;
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE GOV-03 bloco conferido: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;