-- 20260915135133_gov03_o_bloco_conferido.sql
-- GOV-03: o acordo passa a saber quais blocos alguem CONFERIU.
--
-- POR QUE UMA COLUNA SO RESOLVE TRES COISAS.
--
-- O sistema sabia se um campo TEM VALOR. Nao sabia se alguem OLHOU, e as duas
-- divergem exatamente onde mais importa: o acordo nasce semeado, com os sete
-- quoruns e as regras mais comuns ja respondidos, medidos no modelo do
-- escritorio. Dois dos sete blocos apareciam com selo de "pronto" antes de o
-- analista abrir qualquer coisa, e isso convida a pular justamente o que veio de
-- fora e mais precisa de conferencia.
--
-- Com a marca, tres coisas passam a existir:
--
--   1. o cartao volta a poder dizer "conferido" sem mentir;
--   2. "acordo terminado" ganha definicao, que e todos os blocos conferidos;
--   3. e o botao de NOVA VERSAO so aparece quando o acordo atual terminou, que
--      e a regra pedida em 15/09. Sem definicao de terminado, ele apareceria
--      sempre.
--
-- POR QUE `text[]` E NAO UMA TABELA. Sao no maximo sete chaves por acordo, todas
-- do mesmo conjunto fechado, e nada pende delas. Tabela filha traria RLS,
-- politica e join para guardar sete palavras.
--
-- POR QUE NAO TEM CHECK DO CONJUNTO. As chaves de grupo sao da TELA
-- (`src/lib/acordoGrupos.ts`), e a tela ainda esta sendo desenhada: o grupo de
-- usufruto saiu hoje, de oito para sete. Um CHECK aqui obrigaria migration a
-- cada mexida de agrupamento, e o dano de uma chave orfa e nulo, porque a tela
-- so olha as chaves que ela conhece.
--
-- Conferido NAO e o mesmo que preenchido: um bloco pode ser conferido e ficar
-- vazio de proposito, que e o caso de um cliente sem opcao de compra.
--
-- Reversao: `ALTER TABLE public.acordo_quotistas DROP COLUMN grupos_conferidos;`

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
