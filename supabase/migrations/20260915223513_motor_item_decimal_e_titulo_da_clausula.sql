-- 20260915223513_motor_item_decimal_e_titulo_da_clausula.sql
-- O motor documental aprende a numeracao do ACORDO DE QUOTISTAS, que e outra
-- da do contrato social. Duas coisas: um tipo de bloco novo e o titulo da
-- clausula.
--
--
-- POR QUE DOIS DOCUMENTOS NUMERAM DIFERENTE
--
-- Nao e gosto, e o que cada documento escreve. Medido no modelo da casa, com o
-- controle de alteracoes aceito:
--
--   contrato social   "CLAUSULA PRIMEIRA:"      e  "Paragrafo Segundo:"
--   acordo            "CLAUSULA PRIMEIRA – ..."  e  "2.1", "2.2"
--
-- Dos 243 paragrafos do Acordo, 92 sao itens decimais. E o proprio texto se
-- referencia por eles sete vezes ("observado o item 5.5"), mais tres vezes por
-- clausula ("nos termos da Clausula Vigesima Quarta").
--
--
-- POR QUE O NUMERO NAO PODE IR ESCRITO NO TEXTO DO BLOCO
--
-- Foi a primeira saida considerada, e ela quebra numa coisa que o proprio
-- cadastro faz: clausula condicional desligada RENUMERA as seguintes. Desmarcar
-- o lock-up faz a clausula dele nao existir, e a seguinte sobe.
--
-- Com o numero no texto, os itens continuariam "6.1" numa clausula que virou
-- quinta, e as sete referencias cruzadas passariam a apontar para outro lugar,
-- caladas. Numeracao calculada na composicao ja resolve isso para clausula e
-- paragrafo desde 03/06; o item entra na mesma passada.
--
--
-- 1. O TIPO `item`
--
-- O CHECK de `tmpl_bloco.tipo` vem do baseline e fecha em quatro valores. Sem
-- afrouxa-lo, o INSERT do primeiro bloco do Acordo falha.
--
-- Nada muda para quem ja existe: `clausula` e `paragrafo` mantem o
-- comportamento, e os 289 blocos gravados continuam nos tipos deles. O `item`
-- difere do `paragrafo` numa regra so, e de proposito: o paragrafo reseta
-- quando a sequencia consecutiva e interrompida, e o item conta pela CLAUSULA
-- corrente, porque "2.7" depende dela e nao de a sequencia ter sido inteira.
--
--
-- 2. A COLUNA `titulo_documento`
--
-- O titulo que vai DEPOIS do ordinal: "CLAUSULA PRIMEIRA – Definicoes das
-- expressoes utilizadas neste ACORDO."
--
-- NAO SERVE A COLUNA `nome`, e nem a `descricao`. `nome` e rotulo de BIBLIOTECA
-- ("Clausula — Composicao do Conselho"), feito para achar o bloco na estante, e
-- `descricao` e a anotacao de quem o mantem. Os dois sao texto interno; este e
-- texto que sai no Word. Reaproveitar qualquer um dos dois daria duplo sentido a
-- uma coluna, que e o tipo de economia que confunde tres meses depois.
--
-- Nula em todo bloco existente, e nulo significa o comportamento de sempre:
-- "CLAUSULA PRIMEIRA:", com dois-pontos e sem titulo.

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
