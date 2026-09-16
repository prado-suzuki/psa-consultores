-- 20260916122149_motor_subitem_alinea_inciso.sql
-- Os tres niveis que faltavam para o Acordo de Quotistas caber no motor.
--
-- A migration de ontem (20260915223513) abriu o `item`, a numeracao decimal de
-- primeiro nivel ("2.1"). Ao classificar os 288 paragrafos do modelo pelo XML,
-- apareceram mais tres, e os tres com contagem medida:
--
--   subitem   50 paragrafos   "1.1.1"   as definicoes da Clausula Primeira e os
--                                       detalhes da preferencia
--   inciso    19 paragrafos   "(I)"     as hipoteses de aumento de capital
--   alinea     9 paragrafos   "a)"      os Consideran... e as faixas de divida
--
-- ALINEA E INCISO SAO DOIS TIPOS, E NAO UM. O modelo usa os dois com sentidos
-- diferentes na mesma cláusula: as hipoteses de aumento saem em romano, "(I) Se
-- aprovado em REUNIAO DE SOCIOS", e as faixas de divida em letra. Unificar faria
-- o romano virar letra, que e mudar o documento.
--
-- NENHUM DOS TRES MUDA O CONTRATO SOCIAL: os 289 blocos gravados continuam em
-- `clausula`, `paragrafo`, `capitulo` e `livre`, e os 20 testes de numeracao
-- passam iguais.

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
