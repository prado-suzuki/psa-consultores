-- 20260918102900_govf_o_protocolo_nao_tem_texto_de_abertura.sql
-- GOV-F: tira a coluna `preambulo` do protocolo, por decisao da consultoria.
--
-- O CAMPO NASCEU DE UMA LEITURA ERRADA DO ACERVO, minha, em 17/09/2026. O
-- Potrich abre com um paragrafo ("Este Protocolo visa regrar os acordos e
-- combinados da familia ao atual momento do negocio 10/03/26...") e eu tratei
-- isso como estrutura do documento. Nao e: medidos os quatro arquivos celula a
-- celula, o MODELO DA CASA nao tem texto de abertura, e os dois Toquetos tambem
-- nao. So o Potrich traz, e escolha de um cliente nao e estrutura da casa.
--
-- O QUE SAIU JUNTO, no mesmo commit: o botao e o modal na tela, a mutation que
-- gravava, a linha que o gerador escrevia acima do cabecalho, e o campo
-- `protocoloTextoDeAbertura` do contexto do motor documental.
--
-- E SOBRE O EFEITO COLATERAL BOM: enquanto essa linha existia, ela entrava entre
-- a linha oculta de apoio e o cabecalho visivel da planilha, e quebrava a
-- mesclagem C2:E3 que e quem faz a palavra "Criterios" aparecer. Todo protocolo
-- com texto de abertura saia com a faixa do cabecalho vazia. Sem a linha, a
-- mesclagem do modelo volta a valer sempre.
--
-- HONESTIDADE SOBRE O QUE O DROP DESTROI. Medido no sandbox em 18/09/2026, antes
-- de escrever este arquivo: existem 2 protocolos, os dois com texto preenchido, e
-- os dois sao do cliente "[TESTE 1 - ENVIAR] Abacaxi Eletrico Mineracao e Bale
-- S.A.", versoes 1 e 2. Nenhum cliente real perde conteudo. Se este arquivo for
-- rodar num banco onde ja existam protocolos de cliente de verdade, MEDIR DE NOVO
-- antes: o texto nao tem para onde ir depois daqui.

ALTER TABLE public.protocolo_remuneracao
  DROP COLUMN IF EXISTS preambulo;

-- GATE
--
-- Afere a unica coisa que esta migration promete: a coluna deixou de existir.
-- Nao ha o que aferir sobre conteudo, porque o conteudo e justamente o que sai.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'protocolo_remuneracao'
      AND column_name = 'preambulo'
  ) THEN
    RAISE EXCEPTION
      'GATE GOV-F texto de abertura: a coluna `preambulo` continua em protocolo_remuneracao';
  END IF;
END
$$;
