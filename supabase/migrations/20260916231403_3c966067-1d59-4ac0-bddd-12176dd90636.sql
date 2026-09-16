-- 20260915203748_gov03_limpeza_das_colunas_que_nao_variam.sql
-- GOV-03: saem cinco colunas que guardam numero que nao varia e o rotulo do ramo
-- que nenhum documento escreve; entra o regime de nomeacao dos arbitros.
-- (cabecalho completo no arquivo do repositorio)

ALTER TABLE public.acordo_quotistas
  DROP COLUMN IF EXISTS regra_combinacao,
  DROP COLUMN IF EXISTS prazo_balanco_dias,
  DROP COLUMN IF EXISTS horizonte_fluxo_anos,
  DROP COLUMN IF EXISTS taxa_minima_crescimento,
  DROP COLUMN IF EXISTS prazo_indicacao_arbitros_dias;

ALTER TABLE public.acordo_quotistas
  ADD COLUMN IF NOT EXISTS regime_nomeacao_arbitros text;

-- Fechado nos dois que os documentos escrevem. Nulo continua valendo: e o acordo
-- que nao tem clausula de arbitragem, ou que ainda nao foi respondido.
ALTER TABLE public.acordo_quotistas
  DROP CONSTRAINT IF EXISTS acordo_quotistas_regime_arbitros_ck;
ALTER TABLE public.acordo_quotistas
  ADD CONSTRAINT acordo_quotistas_regime_arbitros_ck
    CHECK (regime_nomeacao_arbitros IS NULL
           OR regime_nomeacao_arbitros IN ('partes', 'camara'));

ALTER TABLE public.acordo_ramo_familiar
  DROP CONSTRAINT IF EXISTS acordo_ramo_rotulo_ck,
  DROP COLUMN IF EXISTS rotulo;

-- GATE: prova que as cinco sumiram, que o regime nasceu aceitando so os dois
-- valores medidos, que o rotulo do ramo saiu e que o nome dele segue obrigatorio.
DO $$
DECLARE
  v_falhas  text[] := ARRAY[]::text[];
  v_cliente uuid;
  v_acordo  uuid;
  v_col     text;
BEGIN
  FOREACH v_col IN ARRAY ARRAY[
    'regra_combinacao', 'prazo_balanco_dias', 'horizonte_fluxo_anos',
    'taxa_minima_crescimento', 'prazo_indicacao_arbitros_dias'
  ] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = 'acordo_quotistas' AND column_name = v_col
    ) THEN
      v_falhas := v_falhas || format('a coluna %s continua na tabela', v_col);
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'acordo_quotistas'
       AND column_name = 'regime_nomeacao_arbitros'
  ) THEN
    v_falhas := v_falhas || 'regime_nomeacao_arbitros nao foi criada';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = 'acordo_ramo_familiar'
       AND column_name = 'rotulo'
  ) THEN
    v_falhas := v_falhas || 'a coluna rotulo continua em acordo_ramo_familiar';
  END IF;

  SELECT id INTO v_cliente FROM public.cliente WHERE excluido = false LIMIT 1;
  IF v_cliente IS NOT NULL THEN
    INSERT INTO public.acordo_quotistas (cliente_id, versao)
    VALUES (v_cliente, 999996) RETURNING id INTO v_acordo;

    -- Os dois regimes medidos entram; um terceiro qualquer nao.
    UPDATE public.acordo_quotistas
       SET regime_nomeacao_arbitros = 'partes' WHERE id = v_acordo;
    UPDATE public.acordo_quotistas
       SET regime_nomeacao_arbitros = 'camara' WHERE id = v_acordo;
    BEGIN
      UPDATE public.acordo_quotistas
         SET regime_nomeacao_arbitros = 'sorteio' WHERE id = v_acordo;
      v_falhas := v_falhas || 'o CHECK do regime aceitou um valor fora dos dois medidos';
    EXCEPTION WHEN check_violation THEN
      NULL;
    END;

    -- O ramo continua gravando so com o nome, e o nome segue obrigatorio.
    INSERT INTO public.acordo_ramo_familiar (acordo_id, nome)
    VALUES (v_acordo, 'GATE');

    BEGIN
      INSERT INTO public.acordo_ramo_familiar (acordo_id, nome)
      VALUES (v_acordo, '   ');
      v_falhas := v_falhas || 'o CHECK do nome deixou de recusar ramo sem nome';
    EXCEPTION WHEN check_violation THEN
      NULL;
    END;

    DELETE FROM public.acordo_ramo_familiar WHERE acordo_id = v_acordo;
    DELETE FROM public.acordo_quotistas WHERE id = v_acordo;
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE GOV-03 limpeza: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;