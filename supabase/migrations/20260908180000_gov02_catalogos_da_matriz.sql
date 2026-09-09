-- 20260908180000_gov02_catalogos_da_matriz.sql
-- GOV-02, parte 1 de 2: os dois catalogos da Matriz de Alcadas.
--
-- A Matriz e uma grade: ATIVIDADES em linha, ORGAOS em coluna, e na celula o
-- PAPEL que aquele orgao tem naquela atividade. Os orgaos ja existem, sao a
-- GOV-01. Esta migration cria os outros dois catalogos; a grade em si vem na
-- parte 2.
--
-- POR QUE "ATIVIDADE" E NAO "ASSUNTO". O card diz "catalogo de assuntos", mas o
-- cabecalho da planilha diz "Atividades", tanto no modelo `VF_Matriz de
-- Alcadas.xlsx` quanto na matriz mais recente, a do Grupo Mattei. A tela e para
-- quem preenche a planilha, entao vale a palavra dela. Mesma decisao que trocou
-- "estudo" por "planejamento" na PT-04, em 08/09/2026.
--
-- O CATALOGO NAO E FECHADO, e isso foi medido. Comparei as atividades do modelo
-- VF (24) com as do Grupo Mattei (23): coincidem em 14 e divergem em 17. As que
-- so o Mattei tem sao operacionais e rurais (planejamento agropecuario,
-- atividades operacionais, movimentacao de insumos, acessos digitais); as que so
-- o VF tem sao financeiras e societarias (garantias e aval, PPR, tesouraria,
-- procuracao, cessao de ativos nao circulantes). Um catalogo fechado faria o
-- consultor abrir a ferramenta num cliente rural e nao achar o que usa.
--
-- Por isso os dois catalogos seguem a MESMA FORMA DA GOV-01: `cliente_id` nulo e
-- padrao da OSG, preenchido e do cliente. O botao "Adicionar padroes" da tela de
-- Orgaos se repete aqui.
--
-- O SEED E O MODELO VF, POR DECISAO DE 08/09/2026. O card manda semear com "os
-- cerca de 20 assuntos do modelo VF" e e o que esta aqui: as 24 atividades da
-- coluna "Atividades" do `VF_Matriz de Alcadas.xlsx`, na ordem da planilha.
-- **Consequencia para o "pronto quando"**: o criterio do card e a grade
-- reproduzir o modelo VF, e com este seed ela reproduz.
--
-- SEM COLUNA `politica`. A matriz do Mattei tem uma coluna "Politicas" antes de
-- Atividades, dizendo qual politica rege cada uma. Ela esta OCULTA no arquivo
-- (`hidden="1"` na coluna B) e nao existe no modelo VF, que e a referencia
-- escolhida. Fica de fora ate a consultoria dizer se e nota de trabalho interna
-- ou sobra de versao antiga.
--
-- PAPEL E VERBO MAIS ETAPA, e nao verbo solto. Nas matrizes reais o mesmo orgao
-- faz coisas diferentes em momentos diferentes da mesma atividade: no Mattei, a
-- Diretoria "define a estrategia geral de compras, participa das negociacoes e
-- delibera o fechamento da compra", e essa forma de tres partes se repete
-- identica em tres linhas. Com verbo solto a frase gerada viraria "define,
-- participa e delibera a aquisicao de insumos", que nao diz nada.
--
-- O SEED DE PAPEIS FOI DERIVADO DAS 110 CELULAS DO VF, nao inventado, e **ainda
-- precisa do aval da consultoria**: a analista aprovou as atividades, nao o
-- vocabulario de papel. Por isso a tabela nasce aberta.
--
-- Fora de escopo: a grade, o hook, a tela e o `types.ts`.
--
-- Reversao: `DROP TABLE public.papel_governanca, public.atividade_governanca;`.

-- ─────────────────────────────────────────────────────────────────────────────
-- O catalogo de atividades
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.atividade_governanca (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULO e padrao da OSG, vale para todo cliente. Preenchido e so daquele
  -- cliente. Mesma forma dos orgaos da GOV-01, e pelo mesmo motivo.
  cliente_id   uuid REFERENCES public.cliente(id) ON DELETE CASCADE,

  nome         text NOT NULL,

  -- A ordem da planilha. O consultor le a matriz de cima para baixo na ordem em
  -- que os assuntos aparecem no contrato, e ela nao e alfabetica.
  ordem        integer NOT NULL DEFAULT 0,

  excluido     boolean NOT NULL DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid,

  CONSTRAINT atividade_governanca_nome_ck CHECK (btrim(nome) <> '')
);

COMMENT ON TABLE public.atividade_governanca IS
  'GOV-02: as linhas da Matriz de Alcadas. `cliente_id` nulo e padrao da OSG, '
  'semeado com as 24 atividades do modelo VF; preenchido e atividade que aquele '
  'cliente acrescentou. A lista NAO e fechada: VF e Grupo Mattei coincidem em 14 '
  'atividades e divergem em 17.';

-- A leitura da tela e "o padrao mais o que este cliente acrescentou".
CREATE INDEX IF NOT EXISTS atividade_governanca_catalogo_idx
  ON public.atividade_governanca (cliente_id, ordem, nome)
  WHERE excluido = false;

-- `cliente_id` nulo nao colide consigo mesmo num indice unico comum, porque o
-- Postgres trata NULL como sempre distinto: dois padroes com o mesmo nome
-- passariam. O `coalesce` para um UUID zerado resolve.
CREATE UNIQUE INDEX IF NOT EXISTS atividade_governanca_nome_uq
  ON public.atividade_governanca (
    coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(nome))
  )
  WHERE excluido = false;

DROP TRIGGER IF EXISTS update_atividade_governanca_updated_at ON public.atividade_governanca;
CREATE TRIGGER update_atividade_governanca_updated_at
  BEFORE UPDATE ON public.atividade_governanca
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- O catalogo de papeis
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.papel_governanca (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  cliente_id uuid REFERENCES public.cliente(id) ON DELETE CASCADE,

  -- O verbo JUNTO da etapa: "Define a estrategia", "Delibera o fechamento". Ver
  -- o cabecalho do arquivo.
  nome       text NOT NULL,

  -- So para agrupar na hora de escolher. Vinte e poucas opcoes soltas numa lista
  -- e pior do que quatro grupos de cinco.
  grupo      text,

  ordem      integer NOT NULL DEFAULT 0,

  excluido   boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,

  CONSTRAINT papel_governanca_nome_ck CHECK (btrim(nome) <> '')
);

COMMENT ON TABLE public.papel_governanca IS
  'GOV-02: o que um orgao faz numa atividade. Tabela e nao enum porque a lista '
  'NAO e fechada: o proprio card avisa, e os clientes reais usam verbos fora dela '
  '("contrata" seis vezes na Produtecnica, "monitora" na EDP). O nome traz verbo '
  'e etapa juntos, porque o mesmo orgao age em momentos diferentes da atividade.';

CREATE INDEX IF NOT EXISTS papel_governanca_catalogo_idx
  ON public.papel_governanca (cliente_id, ordem, nome)
  WHERE excluido = false;

CREATE UNIQUE INDEX IF NOT EXISTS papel_governanca_nome_uq
  ON public.papel_governanca (
    coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(nome))
  )
  WHERE excluido = false;

DROP TRIGGER IF EXISTS update_papel_governanca_updated_at ON public.papel_governanca;
CREATE TRIGGER update_papel_governanca_updated_at
  BEFORE UPDATE ON public.papel_governanca
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
--
-- O padrao (cliente_id nulo) e da casa: quem e do time ve. O do cliente segue o
-- mesmo recorte do resto do portal, `cliente_visivel_para`, como a GOV-01.
--
-- Desvio consciente do card, o mesmo da GOV-01: ele pede `is_project_member`, e
-- aqui nao ha projeto. O recorte e por cliente.

ALTER TABLE public.atividade_governanca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.papel_governanca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_atividade_governanca_select ON public.atividade_governanca;
CREATE POLICY rls_atividade_governanca_select ON public.atividade_governanca
  FOR SELECT TO authenticated
  USING (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS rls_atividade_governanca_insert ON public.atividade_governanca;
CREATE POLICY rls_atividade_governanca_insert ON public.atividade_governanca
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS rls_atividade_governanca_update ON public.atividade_governanca;
CREATE POLICY rls_atividade_governanca_update ON public.atividade_governanca
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS rls_atividade_governanca_delete ON public.atividade_governanca;
CREATE POLICY rls_atividade_governanca_delete ON public.atividade_governanca
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS rls_papel_governanca_select ON public.papel_governanca;
CREATE POLICY rls_papel_governanca_select ON public.papel_governanca
  FOR SELECT TO authenticated
  USING (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS rls_papel_governanca_insert ON public.papel_governanca;
CREATE POLICY rls_papel_governanca_insert ON public.papel_governanca
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS rls_papel_governanca_update ON public.papel_governanca;
CREATE POLICY rls_papel_governanca_update ON public.papel_governanca
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS rls_papel_governanca_delete ON public.papel_governanca;
CREATE POLICY rls_papel_governanca_delete ON public.papel_governanca
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed do catalogo padrao: as 24 atividades do modelo VF
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Idempotente por nome, entre os ativos. Rodar de novo nao duplica e nao
-- ressuscita o que alguem excluiu de proposito.
--
-- Os nomes sao os da coluna "Atividades" do modelo, na ordem das linhas. Uma
-- unica correcao: o modelo escreve "inlcuindo" na quarta; aqui vai "incluindo",
-- porque isto vira rotulo de tela.

INSERT INTO public.atividade_governanca (cliente_id, nome, ordem)
SELECT NULL, v.nome, v.ordem
FROM (VALUES
  ('Distribuição de Lucros', 10),
  ('Alienação de participações societárias da própria sociedade e de sociedades ligadas', 20),
  ('Limites para realização de atos jurídicos estranhos às atividades da sociedade', 30),
  ('Expansão e/ou constituição de novos negócios relacionados à aquisição e/ou locação de imóveis rurais (incluindo arrendamento e/ou parceria rural)', 40),
  ('Cessão de imóveis próprios para terceiros e/ou acionistas (comodato, arrendamento, parceria rural etc.)', 50),
  ('Alienação e oneração (Hipoteca) de Bens Imóveis', 60),
  ('Emissão de garantias, incluindo aval e fiança, garantias sobre frutos da produção (penhores, CPR, cessão de contratos etc.)', 70),
  ('Salário de Admissão e Promoções', 80),
  ('Contratação e Desligamento', 90),
  ('Remuneração Variável (Bônus/PPR)', 100),
  ('Contratação de prestadores de serviços', 110),
  ('Contratação de Operações de Crédito junto à instituições financeiras', 120),
  ('Aquisição de insumos', 130),
  ('Limites para aprovação de investimento fixo (equipamentos, máquinas, veículos, obras e benfeitorias, abertura de áreas)', 140),
  ('Orçamento de Custos e Investimentos', 150),
  ('Eleger Administradores e Representantes em Empresas Controladas e/ou Associações', 160),
  ('Planejamento Estratégico', 170),
  ('Políticas e normas', 180),
  ('Processos, procedimentos e controles', 190),
  ('Representação Legal', 200),
  ('Procuração', 210),
  ('Alçadas de pagamento da tesouraria', 220),
  ('Comercialização de commodities', 230),
  ('Cessão onerosa de ativos não circulantes, exceto bens imóveis e quotas de sociedades, e doações de qualquer natureza', 240)
) AS v(nome, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.atividade_governanca a
  WHERE a.cliente_id IS NULL
    AND a.excluido = false
    AND lower(btrim(a.nome)) = lower(btrim(v.nome))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed do catalogo de papeis, derivado das 110 celulas do modelo VF
-- ─────────────────────────────────────────────────────────────────────────────
--
-- **Precisa do aval da consultoria.** A analista aprovou as atividades; o
-- vocabulario de papel ainda nao passou por ela. Este seed existe para a tela
-- nascer usavel, e a tabela e aberta justamente para ele mudar.
--
-- Os grupos sao os momentos em que um orgao age numa atividade, lidos do proprio
-- modelo: quem decide, quem analisa e leva adiante, quem prepara, quem toca a
-- compra, e quem executa e acompanha.

INSERT INTO public.papel_governanca (cliente_id, nome, grupo, ordem)
SELECT NULL, v.nome, v.grupo, v.ordem
FROM (VALUES
  ('Não participa',                        'Ausência',            10),

  ('Delibera',                             'Decisão',             20),
  ('Aprova',                               'Decisão',             30),
  ('Autoriza',                             'Decisão',             40),
  ('Decide',                               'Decisão',             50),
  ('Elege e destitui',                     'Decisão',             60),

  ('Analisa e encaminha',                  'Análise',             70),
  ('Submete à aprovação',                  'Análise',             80),
  ('Propõe',                               'Análise',             90),
  ('Sugere',                               'Análise',            100),
  ('Indica',                               'Análise',            110),
  ('Manifesta-se',                         'Análise',            120),

  ('Elabora a proposta',                   'Preparação',         130),
  ('Consolida as informações',             'Preparação',         140),
  ('Fornece informações',                  'Preparação',         150),
  ('Apura os resultados',                  'Preparação',         160),
  ('Valida',                               'Preparação',         170),
  ('Apresenta sua expectativa',            'Preparação',         180),

  ('Define a estratégia',                  'Negociação',         190),
  ('Participa da definição da estratégia', 'Negociação',         200),
  ('Participa da negociação',              'Negociação',         210),
  ('Delibera o fechamento',                'Negociação',         220),
  ('Formaliza',                            'Negociação',         230),

  ('Executa',                              'Execução',           240),
  ('Implementa',                           'Execução',           250),
  ('Monitora',                             'Execução',           260),
  ('Acompanha a execução',                 'Execução',           270),
  ('Presta contas',                        'Execução',           280),
  ('Revisa',                               'Execução',           290),
  ('Outorga poderes',                      'Execução',           300)
) AS v(nome, grupo, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.papel_governanca p
  WHERE p.cliente_id IS NULL
    AND p.excluido = false
    AND lower(btrim(p.nome)) = lower(btrim(v.nome))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_falhas     text[] := '{}';
  v_atividades int;
  v_papeis     int;
BEGIN
  SELECT count(*) INTO v_atividades
  FROM public.atividade_governanca WHERE cliente_id IS NULL AND excluido = false;

  SELECT count(*) INTO v_papeis
  FROM public.papel_governanca WHERE cliente_id IS NULL AND excluido = false;

  IF v_atividades <> 24 THEN
    v_falhas := v_falhas || format('esperava 24 atividades padrao e ha %s', v_atividades);
  END IF;

  IF v_papeis < 30 THEN
    v_falhas := v_falhas || format('esperava ao menos 30 papeis padrao e ha %s', v_papeis);
  END IF;

  -- Sem RLS, o catalogo de um cliente vazaria para outro.
  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('atividade_governanca', 'papel_governanca')
      AND rowsecurity = false
  ) THEN
    v_falhas := v_falhas || 'RLS nao ficou habilitada nos dois catalogos';
  END IF;

  -- O indice unico com coalesce e o que impede padrao duplicado.
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'atividade_governanca_nome_uq')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'papel_governanca_nome_uq') THEN
    v_falhas := v_falhas || 'faltou indice unico de nome em algum catalogo';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE GOV-02 parte 1: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;
