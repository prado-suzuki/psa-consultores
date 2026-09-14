-- 20260914131228_gov02_o_papel_ganha_infinitivo.sql
-- O papel da Matriz passa a guardar tambem o verbo no infinitivo.
--
-- POR QUE, E POR QUE EU ESTAVA ERRADO ANTES. Em 10/09 o usuario perguntou se o
-- catalogo precisava de uma coluna de infinitivo e eu respondi que nao,
-- argumentando que a conversao sairia do molde de frase da GOV-C. O primeiro
-- documento gerado de verdade, em 14/09, desmentiu: a alinea saiu
--
--   "a) Delibera Distribuicao de Lucros;"
--
-- e a clausula real do Mattei escreve
--
--   "Deliberar sobre a distribuicao de lucros...;"
--
-- Toda alinea de competencia dos sete contratos lidos esta no infinitivo. Sem o
-- campo, TODA alinea nasce errada, por melhor que seja o molde de frase.
--
-- POR QUE NAO SE DERIVA. Dos 32 papeis, 24 terminam em "a" e converteriam
-- sozinhos (Delibera -> Deliberar). Os outros 7 terminam em "e" e sao ambiguos:
--
--   Decide -> Decidir          Submete a aprovacao -> Submeter a aprovacao
--   Elege  -> Eleger           Propoe              -> Propor
--   Sugere -> Sugerir          Fornece             -> Fornecer
--   Define -> Definir
--
-- Mesma terminacao, conjugacoes diferentes. Uma regra automatica erraria em 7 de
-- 32 e ninguem veria, porque sairia uma palavra plausivel dentro de um contrato
-- registrado na Junta. Dado que nao se deduz com seguranca se guarda.
--
-- O `nome` continua sendo o que a tela da Matriz mostra ("Delibera"), porque a
-- celula da planilha fala na terceira pessoa. Sao duas leituras do mesmo papel.
--
-- Papel criado por cliente nasce com `infinitivo` nulo, e a tela pergunta na
-- hora de criar. Nulo nao quebra o gerador: a alinea sai com o `nome`, como sai
-- hoje.
--
-- Fora de escopo: a tela de criar papel e o molde de frase da alinea (GOV-C).
--
-- Reversao: `ALTER TABLE public.papel_governanca DROP COLUMN infinitivo;`

ALTER TABLE public.papel_governanca
  ADD COLUMN IF NOT EXISTS infinitivo text;

COMMENT ON COLUMN public.papel_governanca.infinitivo IS
  'O mesmo papel no infinitivo, que e como a alinea do contrato escreve: nome '
  '"Delibera" para a celula da Matriz, infinitivo "Deliberar" para "Deliberar '
  'sobre a distribuicao de lucros". Nao se deriva do nome: 7 dos 32 papeis '
  'terminam em "e" e sao ambiguos entre -er e -ir (Decide/Decidir contra '
  'Submete/Submeter).';

-- Os 32 do catalogo da OSG, um por um. Cliente nao e tocado.
UPDATE public.papel_governanca p
   SET infinitivo = v.infinitivo
  FROM (VALUES
    ('Delibera', 'Deliberar'),
    ('Aprova', 'Aprovar'),
    ('Autoriza', 'Autorizar'),
    ('Decide', 'Decidir'),
    ('Elege e destitui', 'Eleger e destituir'),
    ('Analisa e encaminha', 'Analisar e encaminhar'),
    ('Submete à aprovação', 'Submeter à aprovação'),
    ('Propõe', 'Propor'),
    ('Sugere', 'Sugerir'),
    ('Indica', 'Indicar'),
    ('Solicita', 'Solicitar'),
    ('Manifesta-se', 'Manifestar-se'),
    ('Elabora a proposta', 'Elaborar a proposta'),
    ('Consolida as informações', 'Consolidar as informações'),
    ('Fornece informações', 'Fornecer informações'),
    ('Apura os resultados', 'Apurar os resultados'),
    ('Valida', 'Validar'),
    ('Apresenta sua expectativa', 'Apresentar sua expectativa'),
    ('Define a estratégia', 'Definir a estratégia'),
    ('Participa da definição da estratégia', 'Participar da definição da estratégia'),
    ('Participa da negociação', 'Participar da negociação'),
    ('Delibera o fechamento', 'Deliberar o fechamento'),
    ('Formaliza', 'Formalizar'),
    ('Executa', 'Executar'),
    ('Realiza', 'Realizar'),
    ('Implementa', 'Implementar'),
    ('Implanta', 'Implantar'),
    ('Monitora', 'Monitorar'),
    ('Acompanha a execução', 'Acompanhar a execução'),
    ('Presta contas', 'Prestar contas'),
    ('Revisa', 'Revisar'),
    ('Outorga poderes', 'Outorgar poderes')
  ) AS v(nome, infinitivo)
 WHERE p.cliente_id IS NULL
   AND p.nome = v.nome;

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

DO $gate$
DECLARE
  v_sem   integer;
  v_igual integer;
  v_um    text;
BEGIN
  SELECT count(*) INTO v_sem
  FROM public.papel_governanca
  WHERE cliente_id IS NULL AND excluido = false AND infinitivo IS NULL;
  IF v_sem > 0 THEN
    RAISE EXCEPTION 'GATE: % papel(eis) do catalogo sem infinitivo', v_sem;
  END IF;

  -- Infinitivo igual ao nome quer dizer que alguem copiou sem converter.
  SELECT count(*) INTO v_igual
  FROM public.papel_governanca
  WHERE cliente_id IS NULL AND excluido = false AND infinitivo = nome;
  IF v_igual > 0 THEN
    RAISE EXCEPTION 'GATE: % papel(eis) com infinitivo igual ao nome', v_igual;
  END IF;

  -- Os sete ambiguos, conferidos um a um: sao eles que a derivacao erraria.
  SELECT string_agg(nome || ' -> ' || infinitivo, ', ' ORDER BY ordem) INTO v_um
  FROM public.papel_governanca
  WHERE cliente_id IS NULL AND excluido = false
    AND nome IN ('Decide', 'Elege e destitui', 'Submete à aprovação', 'Propõe',
                 'Sugere', 'Fornece informações', 'Define a estratégia');
  IF v_um IS DISTINCT FROM
     'Decide -> Decidir, Elege e destitui -> Eleger e destituir, '
     || 'Submete à aprovação -> Submeter à aprovação, Propõe -> Propor, '
     || 'Sugere -> Sugerir, Fornece informações -> Fornecer informações, '
     || 'Define a estratégia -> Definir a estratégia' THEN
    RAISE EXCEPTION 'GATE: os ambiguos sairam errados: %', v_um;
  END IF;

  RAISE NOTICE 'GATE ok: 32 papeis com infinitivo, nenhum copiado, os 7 ambiguos certos';
END;
$gate$;
