-- 20260910155024_gov02_ressalva_vira_marcacao.sql
-- GOV-02: a ressalva "fora da politica" deixa de pedir um orgao e vira marcacao.
--
-- POR QUE MUDAR. A celula guardava a excecao como motivo mais destino
-- (`excecao_motivo` + `excecao_orgao_id`), ou seja, um SEGUNDO endereco ao lado
-- do `sobe_para_orgao_id`. Fui medir se esse segundo endereco existe de verdade:
--
--   matriz                   celulas com texto   com ressalva
--   VF (modelo)                     90                5
--   Produtecnica                   104                5
--   V1 (a mais recente)            103                5
--   EDP Participacoes              105               12
--   Mattei (PDF)                     -               21
--
-- Em NENHUMA delas o destino da ressalva e diferente do destino que a celula ja
-- tem. EDP P45: "aprovam o pedido de compra ate R$ XXX mil, bem como submete a
-- deliberacao DO DIRETOR as necessidades de compras emergenciais nao previstas
-- no orcamento" - sobe por valor para o Diretor e sobe por excecao para o
-- Diretor. V1 linha 29: a ressalva desce quatro orgaos seguidos e cada um manda
-- para o mesmo orgao que ja aprova as suas contratacoes.
--
-- Entao o par de colunas pedia uma informacao que nao varia. Era o mesmo defeito
-- do `acima_da_alcada`, que ja saiu daqui pelo mesmo motivo: campo que duplica
-- outro campo, com a diferenca de que a pessoa que preenche nao consegue
-- responder (o usuario perguntou o que era este campo tres vezes).
--
-- O QUE A MARCACAO SIGNIFICA, e por que ela nao depende do `sobe_para`. A
-- bandeira diz "esta celula tambem trata do que foge da politica ou do
-- orcamento", e serve aos DOIS lados da escada, que e como o contrato escreve:
--
--   quem manda   celula tem `sobe_para`  ->  "...e submete ao Conselho o que
--                estiver fora da politica"
--   quem recebe  celula sem `sobe_para`  ->  "...e autorizar os atos nao
--                previstos nestas politicas"
--
-- A segunda frase e literal do contrato do Mattei, onde aparece duas vezes nas
-- alineas do Conselho. Amarrar a marcacao ao `sobe_para` deixaria o lado de quem
-- recebe sem como se declarar.
--
-- MAIS DE UM ORGAO NA MESMA LINHA continua funcionando, porque a marcacao mora
-- na CELULA e nao na linha: na V1 a linha "Admissoes, demissoes e promocoes" tem
-- a ressalva em quatro orgaos ao mesmo tempo, cada um com o seu destino.
--
-- Fora de escopo: a tela, o hook e o `types.ts`.
--
-- Reversao: recriar `excecao_motivo` e `excecao_orgao_id` e o CHECK
-- `matriz_competencia_excecao_ck`, e derrubar `fora_da_politica`.

-- ─────────────────────────────────────────────────────────────────────────────
-- A coluna nova, e o que ja estava gravado
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.matriz_competencia
  ADD COLUMN IF NOT EXISTS fora_da_politica boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.matriz_competencia.fora_da_politica IS
  'Esta celula tambem trata do que foge da politica ou do orcamento. Com '
  'sobe_para_orgao_id preenchido o gerador escreve "e submete a <orgao> o que '
  'estiver fora da politica"; sem ele, escreve "e autorizar os atos nao '
  'previstos nestas politicas", que e a redacao do lado de quem recebe.';

-- Quem tinha excecao passa a ter a marcacao.
UPDATE public.matriz_competencia
   SET fora_da_politica = true
 WHERE excecao_motivo IS NOT NULL
    OR excecao_orgao_id IS NOT NULL;

-- E o destino nao pode sumir. Nas 48 celulas dos documentos reais ele e sempre
-- igual ao `sobe_para_orgao_id`, mas no primeiro preenchimento de verdade
-- apareceu uma celula com excecao e SEM escalonamento normal: o Conselho, em
-- "Eleger Administradores", subia a Reuniao de Socios so no caso de excecao.
-- A forma cabe no modelo novo (destino no `sobe_para` mais a bandeira, que le
-- "e submete a X o que estiver fora da politica"), entao aqui eu promovo o
-- destino da excecao a escalonamento em vez de descarta-lo.
UPDATE public.matriz_competencia
   SET sobe_para_orgao_id = excecao_orgao_id
 WHERE sobe_para_orgao_id IS NULL
   AND excecao_orgao_id IS NOT NULL
   AND excecao_orgao_id IS DISTINCT FROM orgao_id;

-- ─────────────────────────────────────────────────────────────────────────────
-- Sai o par de colunas
-- ─────────────────────────────────────────────────────────────────────────────

-- O gatilho escuta `excecao_orgao_id` no `UPDATE OF`, e isso e dependencia real:
-- sem derrubar o gatilho primeiro, o DROP COLUMN falha com 2BP01. Ele volta
-- logo abaixo, ja sem a coluna.
DROP TRIGGER IF EXISTS trg_matriz_competencia_orgao_do_cliente ON public.matriz_competencia;

-- `matriz_competencia_ausencia_ck` cita `excecao_motivo`, entao cairia junto com
-- a coluna. Derrubo na mao para recriar logo abaixo e nao depender do cascata.
ALTER TABLE public.matriz_competencia
  DROP CONSTRAINT IF EXISTS matriz_competencia_excecao_ck,
  DROP CONSTRAINT IF EXISTS matriz_competencia_ausencia_ck,
  DROP COLUMN IF EXISTS excecao_motivo,
  DROP COLUMN IF EXISTS excecao_orgao_id;

-- Quem nao participa nao escala, nao tem limite e nao tem ressalva.
ALTER TABLE public.matriz_competencia
  ADD CONSTRAINT matriz_competencia_ausencia_ck CHECK (
    nao_participa = false
    OR (sobe_para_orgao_id IS NULL
        AND alcada_valor IS NULL
        AND fora_da_politica = false)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- O gatilho perde o terceiro campo de orgao
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.matriz_competencia_orgao_do_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cliente_da_matriz uuid;
  v_errado            text;
BEGIN
  SELECT m.cliente_id INTO v_cliente_da_matriz
  FROM public.matriz_atividade ma
  JOIN public.matriz_alcadas m ON m.id = ma.matriz_id
  WHERE ma.id = NEW.matriz_atividade_id;

  SELECT string_agg(o.nome, ', ') INTO v_errado
  FROM public.orgao_governanca o
  WHERE o.id IN (NEW.orgao_id, NEW.sobe_para_orgao_id)
    AND o.cliente_id IS DISTINCT FROM v_cliente_da_matriz;

  IF v_errado IS NOT NULL THEN
    RAISE EXCEPTION
      'Orgao de outro cliente na matriz: %', v_errado
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.matriz_competencia_orgao_do_cliente() IS
  'Recusa orgao de outro cliente na celula e no escalonamento. A chave '
  'estrangeira garante que o orgao existe; este gatilho garante que e o certo, '
  'e CHECK nao serve porque nao enxerga outra tabela.';

DROP TRIGGER IF EXISTS trg_matriz_competencia_orgao_do_cliente ON public.matriz_competencia;
CREATE TRIGGER trg_matriz_competencia_orgao_do_cliente
  BEFORE INSERT OR UPDATE OF orgao_id, sobe_para_orgao_id, matriz_atividade_id
  ON public.matriz_competencia
  FOR EACH ROW EXECUTE FUNCTION public.matriz_competencia_orgao_do_cliente();

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

DO $gate$
DECLARE
  v_nova    integer;
  v_velhas  integer;
  v_ck      integer;
  v_cols    text;
BEGIN
  SELECT count(*) INTO v_nova
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'matriz_competencia'
    AND column_name = 'fora_da_politica' AND data_type = 'boolean'
    AND is_nullable = 'NO';
  IF v_nova <> 1 THEN
    RAISE EXCEPTION 'GATE: fora_da_politica nao ficou boolean NOT NULL (achei %)', v_nova;
  END IF;

  SELECT count(*) INTO v_velhas
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'matriz_competencia'
    AND column_name IN ('excecao_motivo', 'excecao_orgao_id');
  IF v_velhas <> 0 THEN
    RAISE EXCEPTION 'GATE: sobrou coluna de excecao (achei %)', v_velhas;
  END IF;

  SELECT count(*) INTO v_ck
  FROM pg_constraint
  WHERE conrelid = 'public.matriz_competencia'::regclass
    AND conname = 'matriz_competencia_ausencia_ck';
  IF v_ck <> 1 THEN
    RAISE EXCEPTION 'GATE: matriz_competencia_ausencia_ck nao voltou';
  END IF;

  -- O gatilho nao pode continuar escutando uma coluna que nao existe mais.
  SELECT string_agg(a.attname, ',' ORDER BY a.attname) INTO v_cols
  FROM pg_trigger t
  JOIN LATERAL unnest(t.tgattr) AS col(num) ON true
  JOIN pg_attribute a ON a.attrelid = t.tgrelid AND a.attnum = col.num
  WHERE t.tgname = 'trg_matriz_competencia_orgao_do_cliente';
  IF v_cols IS DISTINCT FROM 'matriz_atividade_id,orgao_id,sobe_para_orgao_id' THEN
    RAISE EXCEPTION 'GATE: o gatilho escuta as colunas erradas (%)', v_cols;
  END IF;

  RAISE NOTICE 'GATE ok: ressalva virou marcacao, colunas de excecao fora, gatilho em 3 colunas';
END;
$gate$;
