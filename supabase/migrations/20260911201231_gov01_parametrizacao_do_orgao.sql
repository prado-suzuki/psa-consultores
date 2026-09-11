-- 20260911201231_gov01_parametrizacao_do_orgao.sql
-- Os parametros do orgao que viram clausula no capitulo da Administracao.
--
-- POR QUE ELAS EXISTEM. A Matriz de Alcadas diz o que cada orgao DECIDE. Ela
-- nao diz o que cada orgao E. No contrato, antes da lista de competencias, vem
-- uma frase que descreve o orgao, e ela tem lacunas que mudam de cliente para
-- cliente:
--
--   "O Conselho de Administracao sera composto por no minimo 03 (tres) e no
--    maximo 06 (seis) membros, com mandato de 03 (tres) anos, sendo admitida a
--    reeleicao."  (Perci, clausula 5a)
--
-- Sem esses numeros a clausula nao pode ser escrita, e hoje o sistema nao guarda
-- nenhum deles: `orgao_governanca` tem nome, ordem, se entra no contrato e a
-- vigencia.
--
-- O CRITERIO FOI "SO VIRA COLUNA O QUE VARIA". Levantei dezesseis candidatos nos
-- sete contratos lidos (Perci, Mattei, Horita, Zamo, Agro Ferragens, Bela Vista
-- e o modelo da casa) e dez cairam, porque a redacao e sempre a mesma:
--
--   reeleicao admitida ......... 5 de 5, nenhum "vedada"
--   quem elege o orgao ......... "compete a Reuniao de Socios" em 4 de 4
--   quorum de instalacao ....... "tres quartos" em 4 de 4, e e o Codigo Civil
--   prazo de arquivamento da ata "vinte dias" em 5 de 5, e e a lei
--   prazo da procuracao ........ "no maximo de 01 (um) ano" em 3 de 3
--   periodicidade das reunioes . mensal em quase todos, 1 excecao em 5
--   combinacoes de assinatura .. as mesmas tres nos 2 contratos que as tem
--   meios de convocacao ........ so o Mattei acrescenta WhatsApp e e-mail
--   instalacao condicionada .... so o Conselho Fiscal do Agro Ferragens
--   capitulo da competencia .... os capitulos sao os mesmos nos contratos lidos
--
-- Campo que nao varia e texto fixo do modelo. Publicar como coluna convida a
-- montar formulario para pergunta que nao existe, e faz o consultor digitar
-- dezesseis vezes o que o gerador ja sabe.
--
-- POR QUE `cargos_do_orgao` E LISTA. Tres redacoes medidas: o Zamo diz "sendo um
-- deles obrigatoriamente o Diretor Executivo", o Agro Ferragens diz o mesmo com
-- Diretor Presidente, e o Bela Vista NOMEIA OS TRES ("Diretor de Mercado e
-- Financas, Diretor Operacoes e Diretor de Sistema de Irrigacao"). Um texto so
-- nao cabe o terceiro caso. Vazio, o Mattei mostra a saida: "com denominacao
-- atribuida no momento da composicao".
--
-- POR QUE NAO ENTRA `entra_no_contrato` NOVO NEM VIGENCIA AQUI. Ja existem. E a
-- vigencia segue sem virar clausula: nos sete contratos ela nunca descreve o
-- periodo em que o orgao existiu.
--
-- Fora de escopo: a tela, o hook e o `types.ts`.
--
-- Reversao: `ALTER TABLE public.orgao_governanca DROP COLUMN membros_minimo,
-- DROP COLUMN membros_maximo, DROP COLUMN mandato_anos, DROP COLUMN
-- cargos_do_orgao, DROP COLUMN genero, DROP COLUMN padrao_chave;`

-- ─────────────────────────────────────────────────────────────────────────────
-- Composicao
-- ─────────────────────────────────────────────────────────────────────────────

-- ─────────────────────────────────────────────────────────────────────────────
-- Identidade
-- ─────────────────────────────────────────────────────────────────────────────

/*
 * O GENERO DO ORGAO, porque a clausula concorda com ele.
 *
 * "O Conselho de Administracao sera compost O" e "A Diretoria sera compost A",
 * e a competencia e "Compete A O Conselho" contra "Compete A' Diretoria". O
 * motor ja sabe concordar (concordancia.ts), mas precisa saber o genero, e ele
 * NAO se deduz do nome com seguranca: "Conselho de Administracao" termina em
 * palavra feminina, e "Gestao" termina em "ao" como "orgao", que e masculino.
 *
 * `padrao_chave` resolve outro problema, apontado pelo usuario em 11/09: hoje o
 * sistema reconhece orgao padrao COMPARANDO O NOME (ehOrgaoPadrao). Renomear
 * "Conselho de Administracao" solta a trava de ordem e faz o botao de padroes
 * oferecer criar outro. Com a chave, o vinculo sobrevive ao rename.
 */
ALTER TABLE public.orgao_governanca
  ADD COLUMN IF NOT EXISTS genero       text,
  ADD COLUMN IF NOT EXISTS padrao_chave text;

ALTER TABLE public.orgao_governanca
  DROP CONSTRAINT IF EXISTS orgao_governanca_genero_ck;

ALTER TABLE public.orgao_governanca
  ADD CONSTRAINT orgao_governanca_genero_ck CHECK (genero IS NULL OR genero IN ('M', 'F'));

COMMENT ON COLUMN public.orgao_governanca.genero IS
  'Genero gramatical do nome do orgao, para a clausula concordar: M em "o '
  'Conselho sera composto", F em "a Diretoria sera composta". Nao se deduz do '
  'nome: "Conselho de Administracao" termina em palavra feminina.';

COMMENT ON COLUMN public.orgao_governanca.padrao_chave IS
  'Qual dos orgaos padrao este e (reuniao_socios, conselho_administracao, '
  'diretoria_executiva). Nulo em orgao criado pelo cliente. Existe para o '
  'vinculo com o padrao sobreviver a um rename, que hoje quebra porque o '
  'reconhecimento e por comparacao de nome.';

CREATE UNIQUE INDEX IF NOT EXISTS orgao_governanca_padrao_por_cliente_uk
  ON public.orgao_governanca (cliente_id, padrao_chave)
  WHERE padrao_chave IS NOT NULL AND excluido = false;

-- ─────────────────────────────────────────────────────────────────────────────
-- Composicao
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.orgao_governanca
  ADD COLUMN IF NOT EXISTS membros_minimo  integer,
  ADD COLUMN IF NOT EXISTS membros_maximo  integer,
  ADD COLUMN IF NOT EXISTS mandato_anos    integer,
  ADD COLUMN IF NOT EXISTS cargos_do_orgao text[];

COMMENT ON COLUMN public.orgao_governanca.membros_minimo IS
  'Minimo de membros do orgao. Com o maximo igual a ele, o gerador escreve a '
  'frase curta ("composto por 03 (tres) membros"), que e a redacao do Horita e '
  'do Bela Vista, em vez da faixa.';

COMMENT ON COLUMN public.orgao_governanca.membros_maximo IS
  'Maximo de membros do orgao.';

COMMENT ON COLUMN public.orgao_governanca.mandato_anos IS
  'Duracao do mandato de cada membro, em anos. Nao confundir com vigencia_inicio '
  'e vigencia_fim, que sao o periodo em que o ORGAO existiu: o mandato e das '
  'pessoas, e no mesmo cliente o Conselho e a Diretoria tem prazos diferentes.';

COMMENT ON COLUMN public.orgao_governanca.cargos_do_orgao IS
  'Cargos nomeados dentro do orgao, em ordem. Vazio significa "com denominacao '
  'atribuida no momento da composicao", que e a redacao do Mattei.';

-- ─────────────────────────────────────────────────────────────────────────────
-- Representacao da sociedade: FORA, por enquanto
-- ─────────────────────────────────────────────────────────────────────────────
--
-- A primeira versao desta migration criava `representa_sozinho_ate` e
-- `representa_assinantes_acima`. Medido nos sete contratos, o limite de valor
-- para representar a sociedade aparece em UM: o Perci, com "cujo valor nao
-- exceda R$ 2.000.000,00". Mattei, Bela Vista, Horita, Zamo, Agro Ferragens e o
-- modelo da casa nao tem nada disso, nem "exceda" nem "dois diretores em
-- conjunto".
--
-- Nas MATRIZES a historia e outra: tres das cinco tem a linha de Representacao
-- Legal com corte em valor (VF R$ 2mm, Produtecnica R$ 5mi, EDP sem valor mas
-- com dois diretores). Ou seja, a consultoria PROPOE a regra com frequencia e
-- ela chega ao contrato raramente.
--
-- Uma ocorrencia em sete nao paga duas colunas. Elas voltam quando a
-- consultoria disser que a regra e padrao, e ate la o caso do Perci se escreve
-- a mao no documento, que e o que se faz hoje.

-- Numeros de gente nao sao negativos, e faixa invertida e erro de digitacao que
-- so aparece no documento gerado, tarde demais.
ALTER TABLE public.orgao_governanca
  DROP CONSTRAINT IF EXISTS orgao_governanca_composicao_ck;

ALTER TABLE public.orgao_governanca
  ADD CONSTRAINT orgao_governanca_composicao_ck CHECK (
    (membros_minimo IS NULL OR membros_minimo > 0)
    AND (membros_maximo IS NULL OR membros_maximo > 0)
    AND (mandato_anos IS NULL OR mandato_anos > 0)
    AND (membros_minimo IS NULL OR membros_maximo IS NULL OR membros_maximo >= membros_minimo)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

DO $gate$
DECLARE
  v_cols integer;
  v_ck   integer;
  v_erro boolean;
BEGIN
  SELECT count(*) INTO v_cols
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'orgao_governanca'
    AND column_name IN ('membros_minimo', 'membros_maximo', 'mandato_anos',
                        'cargos_do_orgao', 'genero', 'padrao_chave');
  IF v_cols <> 6 THEN
    RAISE EXCEPTION 'GATE: esperava 6 colunas novas, achei %', v_cols;
  END IF;

  SELECT count(*) INTO v_ck
  FROM pg_constraint
  WHERE conrelid = 'public.orgao_governanca'::regclass
    AND conname IN ('orgao_governanca_composicao_ck', 'orgao_governanca_genero_ck');
  IF v_ck <> 2 THEN
    RAISE EXCEPTION 'GATE: esperava os 2 CHECK, achei %', v_ck;
  END IF;

  /*
   * Faixa invertida tem de ser recusada. A armadilha usa uma linha DESCARTAVEL
   * criada aqui e apagada em seguida, e nao uma linha real: em producao a
   * tabela esta vazia, e um UPDATE que nao pega linha nenhuma nao dispara
   * CHECK, o que faria o GATE acusar falso. Cliente inexistente nao serve
   * porque ha chave estrangeira, entao a linha nasce no primeiro cliente que
   * houver, e a migration pula a prova se nao houver nenhum.
   */
  IF EXISTS (SELECT 1 FROM public.cliente LIMIT 1) THEN
    v_erro := false;
    BEGIN
      INSERT INTO public.orgao_governanca (cliente_id, nome, membros_minimo, membros_maximo)
      VALUES ((SELECT id FROM public.cliente LIMIT 1), '__gate__', 6, 3);
      RAISE EXCEPTION 'GATE: faixa invertida passou';
    EXCEPTION WHEN check_violation THEN
      v_erro := true;
    END;
    IF NOT v_erro THEN
      RAISE EXCEPTION 'GATE: o CHECK de composicao nao barrou a faixa invertida';
    END IF;
    DELETE FROM public.orgao_governanca WHERE nome = '__gate__';
  ELSE
    RAISE NOTICE 'GATE: sem cliente na base, prova da faixa invertida pulada';
  END IF;

  RAISE NOTICE 'GATE ok: 6 colunas de parametrizacao, 2 CHECK, faixa invertida recusada';
END;
$gate$;
