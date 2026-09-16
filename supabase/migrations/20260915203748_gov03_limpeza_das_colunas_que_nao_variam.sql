-- 20260915203748_gov03_limpeza_das_colunas_que_nao_variam.sql
-- GOV-03: saem cinco colunas que guardam numero que nao varia e o rotulo do ramo
-- que nenhum documento escreve; entra o regime de nomeacao dos arbitros, que
-- varia de verdade.
--
-- ESCRITA EM 15/09/2026. NAO APLICAR SEM O OK.
--
--
-- 1. AS QUATRO COLUNAS, E POR QUE ELAS MORRERAM
--
-- Elas nao morreram por serem inuteis: a informacao ESTA no documento, escrita
-- em cada acordo. Morreram porque NAO VARIA. Numero que e o mesmo em todo
-- contrato do acervo e texto fixo do modelo, nao pergunta ao consultor, e
-- publicar o campo convida alguem a responder diferente e produzir um documento
-- fora do padrao da casa.
--
--   prazo_balanco_dias        60 dias em 7 de 7 contratos que tem a clausula
--   horizonte_fluxo_anos      05 anos em 3 de 3
--   taxa_minima_crescimento   IPCA nos 2 que citam indice
--   regra_combinacao          "maior valor" em todos que combinam metodos
--
-- O que VARIA, e por isso continua sendo campo, e QUAIS metodos entram na
-- apuracao: Bela Vista, Horita e Agro Ferragens usam patrimonio liquido e fluxo
-- de caixa descontado; Perci, Mattei e Zamo usam so o patrimonio liquido. Uma
-- condicao acende o bloco inteiro do fluxo, com os quatro numeros fixos dentro
-- dele. Ver `metodosAvaliacao` e `usaFluxoDeCaixa` em `templates/vocabulario`.
--
-- Conferido no sandbox em 15/09, antes de escrever: 3 linhas em
-- `acordo_quotistas`, ZERO preenchidas em cada uma das quatro. Nenhuma tela le
-- ou grava qualquer uma delas.
--
--
-- 2. O PRAZO DOS ARBITROS SAI, E NO LUGAR ENTRA O REGIME DE NOMEACAO
--
-- Esta secao ja teve tres redacoes, e vale registrar as tres porque o erro do
-- meio custou dois dias.
--
-- Primeiro eu escrevi que o prazo "nao existe em documento nenhum" e o derrubei
-- da tela. Refeita a contagem, e falso: o AgroAlianca, clausula 26.3, escreve
-- "Cada parte devera nomear seu arbitro no prazo de 15 (quinze) dias contados do
-- recebimento da notificacao de instauracao da arbitragem". Devolvi o campo.
--
-- Agora ele sai de novo, por um motivo diferente e melhor: temos UMA unica
-- observacao do valor, esses 15 dias, e nenhuma evidencia de que o numero mude.
-- Pela mesma regra que tirou os 60 dias do balanco, e linha fixa dentro da
-- clausula, e nao pergunta ao consultor. Perguntar convida a inventar variacao
-- que nunca existiu.
--
-- O QUE VARIA DE VERDADE, e a mesma releitura mostrou, e COMO os arbitros sao
-- escolhidos. Sao dois regimes, e o prazo so faz sentido dentro do primeiro:
--
--   partes   5 de 7 (modelo, AgroAlianca, Utida, Perci, Luizao): "sendo um
--            nomeado pelo reclamante, o outro pela parte reclamada e o terceiro
--            eleito por aqueles dois outros arbitros"
--   camara   2 de 7 (Horita, Via Fertil): "os quais serao nomeados conforme o
--            regulamento da CAM-CCBCC"
--
-- O modelo da casa usa `partes`, entao e esse o padrao.
--
-- A RESSALVA, e ela esta registrada: os dois documentos que fogem usam a MESMA
-- frase, palavra por palavra, o que pode ser um copiado do outro em vez de duas
-- decisoes de cliente. Perguntado a Anne junto das outras duas duvidas. Se a
-- resposta for que nao se escolhe, a coluna sai e o texto volta a ser fixo.
--
-- O QUANTOS sao nao varia: "03 (tres)" em 6 de 6 que dizem, entao esse nao vira
-- coluna, pela mesma regra das quatro da apuracao.
--
--
-- 3. A COLUNA `rotulo` DO RAMO SAI INTEIRA
--
-- Ela existia para escolher entre "RAMO [nome]" e "DESCENDENTES DE [nome]", e a
-- escolha veio do levantamento de 11/09 (`docs/osg/campos-governanca.md`): "os
-- rotulos aceitos sao 'RAMO [nome]' ou 'DESCENDENTES DE [nome]', e a escolha e
-- por acordo".
--
-- Contado nos 14 documentos do acervo, sete acordos e sete contratos sociais:
--
--   "RAMO [nome]" como grupo da familia       0 de 14
--   "DESCENDENTES DE [nome]"                  1 de 14 (AgroAlianca)
--   "ramo" querendo dizer ramo de ATIVIDADE   3 acordos
--
-- Nenhum documento escreve "RAMO [nome]", e "ramo" ja significa outra coisa
-- dentro do mesmo texto: "oportunidades de negocios relacionados aos ramos de
-- atividade". Imprimir "RAMO BOCOLLI" num documento que usa a palavra para
-- linha de negocio e colisao de vocabulario.
--
-- O MOCKUP DA GOVERNANCA JA TINHA DERRUBADO ISSO, com a mesma medicao, e esta
-- escrito la: "as duas opcoes de cima estao escritas em documento; 'ramo
-- familiar' nao estava em nenhum, e foi retirada"
-- (`src/previews/cadastroGovernancaDados.ts`, branch mockup/cadastro-governanca).
-- A opcao voltou por eu ter seguido o levantamento em vez do documento.
--
-- Com um rotulo so, a coluna nao guarda decisao nenhuma: o rotulo passa a ser
-- derivado do nome, em `rotuloDoRamo`. Conferido no sandbox antes de escrever:
-- `acordo_ramo_familiar` esta VAZIA, zero linhas, entao nao ha dado a migrar.

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
