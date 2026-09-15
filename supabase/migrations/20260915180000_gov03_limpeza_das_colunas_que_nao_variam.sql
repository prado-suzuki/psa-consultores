-- 20260915180000_gov03_limpeza_das_colunas_que_nao_variam.sql
-- GOV-03: saem quatro colunas que guardam numero que nao varia, e o rotulo do
-- ramo passa a nascer no unico formato que os documentos usam.
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
-- 2. `prazo_indicacao_arbitros_dias` NAO ENTRA, E EU ESTAVA ERRADO SOBRE ELA
--
-- Eu registrei em 15/09 que esse prazo "nao existe em documento nenhum", e a
-- coluna entraria nesta limpeza junto das outras quatro. Refiz a contagem nos
-- sete acordos e a afirmacao e falsa: o AgroAlianca, clausula 26.3, escreve
-- "Cada parte devera nomear seu arbitro no prazo de 15 (quinze) dias contados do
-- recebimento da notificacao de instauracao da arbitragem; findo o prazo sem
-- nomeacao, o arbitro sera designado nos termos [do regulamento]".
--
-- E 1 de 7, contra 0 de 7 que eu tinha afirmado, entao a coluna fica ate a
-- decisao ser tomada com o numero certo na mao. Derrubar coluna com base numa
-- medicao que ja se provou errada e como nao medir.
--
-- A medicao tambem mostrou uma variacao MAIOR, que nenhuma coluna guarda hoje:
-- como os arbitros sao nomeados. Sao dois regimes, e nao um.
--
--   as partes nomeiam    4 de 7 (AgroAlianca, Utida, modelo, Perci): "um nomeado
--                        pelo reclamante, o outro pela parte reclamada e o
--                        terceiro eleito por aqueles dois"
--   pelo regulamento     2 de 7 (Horita, Via Fertil): "os quais serao nomeados
--                        conforme o regulamento da CAM-CCBCC"
--
-- O QUANTOS sao nao varia: "03 (tres)" em 6 de 6 que dizem, entao esse segue
-- fora, pela mesma regra das quatro acima. Se um campo novo nascer aqui, e o
-- REGIME, nao o prazo.
--
--
-- 3. O ROTULO DO RAMO PASSA A NASCER 'descendentes'
--
-- O padrao era 'ramo', e ele veio do levantamento de 11/09
-- (`docs/osg/campos-governanca.md`), que diz "os rotulos aceitos sao 'RAMO
-- [nome]' ou 'DESCENDENTES DE [nome]', e a escolha e por acordo".
--
-- Contado nos 14 documentos do acervo, sete acordos e sete contratos sociais:
--
--   "RAMO [nome]" como grupo da familia       0 de 14
--   "DESCENDENTES DE [nome]"                  1 de 14 (AgroAlianca)
--   "ramo" querendo dizer ramo de ATIVIDADE   3 acordos
--
-- Ou seja, o unico rotulo que algum documento usa e DESCENDENTES DE, e "ramo"
-- ja significa outra coisa dentro do mesmo texto: "oportunidades de negocios
-- relacionados aos ramos de atividade". Imprimir "RAMO BOCOLLI" num documento
-- que usa a palavra para linha de negocio e colisao de vocabulario.
--
-- O CHECK CONTINUA ACEITANDO OS DOIS. O levantamento afirma que a casa usa os
-- dois, e sete acordos sao amostra, nao o universo; estreitar o CHECK e
-- irreversivel sem outra migration. Muda so de onde se parte.

ALTER TABLE public.acordo_quotistas
  DROP COLUMN IF EXISTS regra_combinacao,
  DROP COLUMN IF EXISTS prazo_balanco_dias,
  DROP COLUMN IF EXISTS horizonte_fluxo_anos,
  DROP COLUMN IF EXISTS taxa_minima_crescimento;

ALTER TABLE public.acordo_ramo_familiar
  ALTER COLUMN rotulo SET DEFAULT 'descendentes';

-- GATE: prova que as quatro sumiram, que a quinta ficou, e que um ramo gravado
-- sem rotulo nasce no formato dos documentos.
DO $$
DECLARE
  v_falhas  text[] := ARRAY[]::text[];
  v_cliente uuid;
  v_acordo  uuid;
  v_rotulo  text;
  v_col     text;
BEGIN
  FOREACH v_col IN ARRAY ARRAY[
    'regra_combinacao', 'prazo_balanco_dias', 'horizonte_fluxo_anos', 'taxa_minima_crescimento'
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
       AND column_name = 'prazo_indicacao_arbitros_dias'
  ) THEN
    v_falhas := v_falhas || 'prazo_indicacao_arbitros_dias sumiu, e esta migration nao a derruba';
  END IF;

  SELECT id INTO v_cliente FROM public.cliente WHERE excluido = false LIMIT 1;
  IF v_cliente IS NOT NULL THEN
    INSERT INTO public.acordo_quotistas (cliente_id, versao)
    VALUES (v_cliente, 999996) RETURNING id INTO v_acordo;

    INSERT INTO public.acordo_ramo_familiar (acordo_id, nome)
    VALUES (v_acordo, 'GATE');

    SELECT rotulo INTO v_rotulo
      FROM public.acordo_ramo_familiar WHERE acordo_id = v_acordo;
    IF v_rotulo <> 'descendentes' THEN
      v_falhas := v_falhas || format('o ramo nasceu com rotulo "%s", esperado "descendentes"', v_rotulo);
    END IF;

    -- E 'ramo' continua aceito: o CHECK nao foi estreitado.
    BEGIN
      UPDATE public.acordo_ramo_familiar SET rotulo = 'ramo' WHERE acordo_id = v_acordo;
    EXCEPTION WHEN check_violation THEN
      v_falhas := v_falhas || 'o CHECK deixou de aceitar "ramo", e esta migration nao o estreita';
    END;

    DELETE FROM public.acordo_ramo_familiar WHERE acordo_id = v_acordo;
    DELETE FROM public.acordo_quotistas WHERE id = v_acordo;
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE GOV-03 limpeza: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;
