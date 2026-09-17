-- 20260917143458_govf_catalogo_do_protocolo.sql
-- GOV-F, parte 1 de 2: os dois catalogos do Protocolo de Remuneracao.
--
-- O protocolo e uma grade, igual a Matriz de Alcadas: ITENS em linha,
-- BENEFICIARIOS em coluna, e na celula a REGRA escrita. Esta migration cria os
-- catalogos das linhas; a grade em si vem na parte 2.
--
-- A LINHA TEM DOIS NIVEIS, e e por isso que sao dois catalogos e nao um. No
-- modelo da casa (`VF_Protocolo Remuneracao.xlsx`, o mesmo arquivo salvo como
-- `00_MODELO_da_casa.xlsx`) a coluna C traz o TEMA ("Veiculos") e a coluna E traz
-- o ITEM ("Modelo do Veiculo", "Abastecimento"). Sao 13 temas e 52 itens. A
-- Matriz de Alcadas tem um nivel so (`atividade_governanca.nome`), por isso o
-- catalogo dela nao serve aqui.
--
-- O CARD DIZ "LINHAS E COLUNAS VARIAVEIS". A LINHA NAO E, E ISSO FOI MEDIDO.
-- Comparei item a item contra o modelo, normalizando acento e caixa:
--
--     Toqueto V1   51 itens, 50 identicos ao modelo,  1 proprio
--     Toqueto VF   46 itens, 40 identicos,            6 proprios
--     Potrich      48 itens, 38 identicos,           10 proprios
--
-- E quase todo "proprio" e o item do modelo reescrito: "Remuneracao pelo
-- trabalho (Pro-labore)" e "Remuneracao pelo trabalho"; "Grandes beneficios
-- concedidos para o cargo" e "Beneficios concedidos para o cargo"; "Combustivel"
-- e "Abastecimento". Nos temas: 13 no modelo, 13 no Potrich, 13 no Toqueto V1, 12
-- no Toqueto VF, que derrubou "Aeronave" porque o cliente nao tem aviao.
--
-- A variacao de dimensao que a varredura tinha medido (106x12, 154x11, 105x10)
-- era linha e coluna em branco de formatacao, nao estrutura.
--
-- **Consequencia**: o catalogo nasce semeado com o modelo inteiro, e a
-- consultoria edita a partir dele em vez de digitar 52 linhas por cliente. O que
-- varia de verdade e a COLUNA, e ela e tratada na parte 2.
--
-- O CATALOGO NAO E FECHADO. Mesma forma da GOV-01 e da GOV-02: `cliente_id` nulo
-- e padrao da OSG, preenchido e daquele cliente. Vale para tema e para item, por
-- decisao de 17/09/2026: o cliente pode acrescentar os dois.
--
-- UMA CORRECAO NO SEED, mesmo criterio da GOV-02 (que corrigiu "inlcuindo"): o
-- modelo escreve "Recursos materias da empresa para fins pessoais". Aqui vai
-- "materiais", porque isto vira rotulo de tela e texto de documento entregue ao
-- cliente. Fora isso o seed e literal, inclusive "1/3 Ferias" e "13o salario".
--
-- Fora de escopo: a grade, o hook, a tela e o `types.ts`. A auditoria campo a
-- campo e do front, via `useAuditLog`, como na GOV-02.
--
-- Reversao:
-- `DROP TABLE public.protocolo_item_governanca, public.protocolo_tema_governanca;`.

-- ─────────────────────────────────────────────────────────────────────────────
-- O catalogo de temas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.protocolo_tema_governanca (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULO e padrao da OSG, vale para todo cliente. Preenchido e so daquele
  -- cliente. Mesma forma da GOV-01 e da GOV-02.
  cliente_id uuid REFERENCES public.cliente(id) ON DELETE CASCADE,

  nome       text NOT NULL,

  -- A ordem da planilha. O protocolo e lido de cima para baixo na ordem em que
  -- os assuntos aparecem, e ela nao e alfabetica.
  ordem      integer NOT NULL DEFAULT 0,

  excluido   boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,

  CONSTRAINT protocolo_tema_governanca_nome_ck CHECK (btrim(nome) <> '')
);

COMMENT ON TABLE public.protocolo_tema_governanca IS
  'GOV-F: o agrupador das linhas do Protocolo de Remuneracao, a coluna C do '
  'modelo da casa ("Veiculos", "Auxilio Educacao"). Tabela propria e nao texto '
  'solto no item porque o tema e linha visivel no documento gerado, tem ordem '
  'propria, e texto repetido geraria tema duplicado por typo. `cliente_id` nulo e '
  'padrao da OSG, semeado com os 13 temas do modelo.';

CREATE INDEX IF NOT EXISTS protocolo_tema_governanca_catalogo_idx
  ON public.protocolo_tema_governanca (cliente_id, ordem, nome)
  WHERE excluido = false;

-- `cliente_id` nulo nao colide consigo mesmo num indice unico comum, porque o
-- Postgres trata NULL como sempre distinto: dois padroes com o mesmo nome
-- passariam. O `coalesce` para um UUID zerado resolve. Mesmo truque da GOV-02.
CREATE UNIQUE INDEX IF NOT EXISTS protocolo_tema_governanca_nome_uq
  ON public.protocolo_tema_governanca (
    coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(nome))
  )
  WHERE excluido = false;

DROP TRIGGER IF EXISTS update_protocolo_tema_governanca_updated_at ON public.protocolo_tema_governanca;
CREATE TRIGGER update_protocolo_tema_governanca_updated_at
  BEFORE UPDATE ON public.protocolo_tema_governanca
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- O catalogo de itens
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.protocolo_item_governanca (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  cliente_id uuid REFERENCES public.cliente(id) ON DELETE CASCADE,

  -- `RESTRICT` de proposito, igual ao catalogo da GOV-02: tema em uso nao se
  -- apaga, se marca como excluido.
  tema_id    uuid NOT NULL REFERENCES public.protocolo_tema_governanca(id) ON DELETE RESTRICT,

  nome       text NOT NULL,

  -- A ordem dentro do tema.
  ordem      integer NOT NULL DEFAULT 0,

  excluido   boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid,

  CONSTRAINT protocolo_item_governanca_nome_ck CHECK (btrim(nome) <> '')
);

COMMENT ON TABLE public.protocolo_item_governanca IS
  'GOV-F: as linhas do Protocolo de Remuneracao, a coluna E do modelo da casa. '
  '`cliente_id` nulo e padrao da OSG, semeado com os 52 itens do modelo; '
  'preenchido e item que aquele cliente acrescentou. A lista NAO e fechada, mas '
  'na pratica varia pouco: medindo contra o modelo, o Toqueto V1 repete 50 de 51 '
  'itens e o Potrich 38 de 48, e os que divergem sao o mesmo item reescrito.';

CREATE INDEX IF NOT EXISTS protocolo_item_governanca_catalogo_idx
  ON public.protocolo_item_governanca (cliente_id, tema_id, ordem, nome)
  WHERE excluido = false;

-- O mesmo nome pode existir em temas diferentes ("Seguro de vida" esta em Saude
-- no modelo, e um cliente pode querer em Beneficios), por isso o tema entra na
-- chave.
CREATE UNIQUE INDEX IF NOT EXISTS protocolo_item_governanca_nome_uq
  ON public.protocolo_item_governanca (
    coalesce(cliente_id, '00000000-0000-0000-0000-000000000000'::uuid),
    tema_id,
    lower(btrim(nome))
  )
  WHERE excluido = false;

DROP TRIGGER IF EXISTS update_protocolo_item_governanca_updated_at ON public.protocolo_item_governanca;
CREATE TRIGGER update_protocolo_item_governanca_updated_at
  BEFORE UPDATE ON public.protocolo_item_governanca
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Copia literal do recorte da GOV-02: o padrao (cliente_id nulo) e da casa e quem
-- e do time ve; o do cliente segue `cliente_visivel_para`. O card pede
-- `is_project_member` e aqui nao ha projeto, mesmo desvio consciente da GOV-01.

ALTER TABLE public.protocolo_tema_governanca ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolo_item_governanca ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rls_protocolo_tema_select ON public.protocolo_tema_governanca;
CREATE POLICY rls_protocolo_tema_select ON public.protocolo_tema_governanca
  FOR SELECT TO authenticated
  USING (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS rls_protocolo_tema_insert ON public.protocolo_tema_governanca;
CREATE POLICY rls_protocolo_tema_insert ON public.protocolo_tema_governanca
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS rls_protocolo_tema_update ON public.protocolo_tema_governanca;
CREATE POLICY rls_protocolo_tema_update ON public.protocolo_tema_governanca
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS rls_protocolo_tema_delete ON public.protocolo_tema_governanca;
CREATE POLICY rls_protocolo_tema_delete ON public.protocolo_tema_governanca
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS rls_protocolo_item_select ON public.protocolo_item_governanca;
CREATE POLICY rls_protocolo_item_select ON public.protocolo_item_governanca
  FOR SELECT TO authenticated
  USING (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS rls_protocolo_item_insert ON public.protocolo_item_governanca;
CREATE POLICY rls_protocolo_item_insert ON public.protocolo_item_governanca
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS rls_protocolo_item_update ON public.protocolo_item_governanca;
CREATE POLICY rls_protocolo_item_update ON public.protocolo_item_governanca
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

DROP POLICY IF EXISTS rls_protocolo_item_delete ON public.protocolo_item_governanca;
CREATE POLICY rls_protocolo_item_delete ON public.protocolo_item_governanca
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    AND (cliente_id IS NULL OR public.cliente_visivel_para(cliente_id))
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: os 13 temas do modelo da casa, na ordem da planilha
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Idempotente por nome, entre os ativos. Rodar de novo nao duplica e nao
-- ressuscita o que alguem excluiu de proposito.

INSERT INTO public.protocolo_tema_governanca (cliente_id, nome, ordem)
SELECT NULL, v.nome, v.ordem
FROM (VALUES
  ('Remuneração pelo trabalho, acionistas e figuras cativas',  10),
  ('Jornada de trabalho e férias',                             20),
  ('Veículos',                                                 30),
  ('Benefícios de fornecedores e parceiros',                   40),
  ('Despesas corporativas',                                    50),
  ('Aeronave',                                                 60),
  ('Telefone, computadores e eletrônicos',                     70),
  ('Seguro ou Plano de Saúde',                                 80),
  ('Auxílio Educação',                                         90),
  ('Moradia',                                                 100),
  ('Recursos humanos ou materiais',                           110),
  ('Adiantamentos ou empréstimos a regrar',                   120),
  ('Outros benefícios ou regras',                             130)
) AS v(nome, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.protocolo_tema_governanca t
  WHERE t.cliente_id IS NULL
    AND t.excluido = false
    AND lower(btrim(t.nome)) = lower(btrim(v.nome))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: os 52 itens do modelo da casa, cada um no seu tema
-- ─────────────────────────────────────────────────────────────────────────────
--
-- O JOIN resolve o tema pelo nome, entre os padroes ativos. Se um tema nao casar,
-- os itens dele somem em silencio, e e exatamente isso que o GATE mede no fim.

INSERT INTO public.protocolo_item_governanca (cliente_id, tema_id, nome, ordem)
SELECT NULL, t.id, v.nome, v.ordem
FROM (VALUES
  ('Remuneração pelo trabalho, acionistas e figuras cativas', 'Remuneração pelo trabalho', 10),
  ('Remuneração pelo trabalho, acionistas e figuras cativas', 'Remuneração a fundadores ou figuras cativas da empresa (Ex.: Fundadores)', 20),
  ('Remuneração pelo trabalho, acionistas e figuras cativas', 'Comissão, Bônus ou Remuneração Variável', 30),
  ('Remuneração pelo trabalho, acionistas e figuras cativas', '13º salário', 40),
  ('Remuneração pelo trabalho, acionistas e figuras cativas', '1/3 Férias', 50),
  ('Remuneração pelo trabalho, acionistas e figuras cativas', 'Distribuição de Lucros e Pagamento de Dividendos', 60),

  ('Jornada de trabalho e férias', 'Controle de jornada', 10),
  ('Jornada de trabalho e férias', 'Férias - limite de dias, comunicação prévia, venda de dias não usufruídos, acúmulo e períodos', 20),
  ('Jornada de trabalho e férias', 'Folga - principais regras', 30),
  ('Jornada de trabalho e férias', 'Férias da Família ou encontros da Família', 40),

  ('Veículos', 'Modelo do Veículo', 10),
  ('Veículos', 'Regras de substituição e atualização do modelo', 20),
  ('Veículos', 'Abastecimento', 30),
  ('Veículos', 'Custos de manutenção', 40),
  ('Veículos', 'Multas e Acidentes', 50),
  ('Veículos', 'Seguros e impostos', 60),
  ('Veículos', 'Uso para fins pessoais ou de familiares', 70),

  ('Benefícios de fornecedores e parceiros', 'Pequenos Brindes', 10),
  ('Benefícios de fornecedores e parceiros', 'Benefícios concedidos para o cargo', 20),
  ('Benefícios de fornecedores e parceiros', 'Benefícios concedidos para a pessoa', 30),
  ('Benefícios de fornecedores e parceiros', 'Benefícios concedidos para a empresa', 40),
  ('Benefícios de fornecedores e parceiros', 'Programa de pontos de fornecedores e/ou cartões corporativos', 50),

  ('Despesas corporativas', 'Cartão corporativo', 10),
  ('Despesas corporativas', 'Viagem - Limites com Hotel e Alimentação', 20),
  ('Despesas corporativas', 'Representação Comercial ou Institucional', 30),
  ('Despesas corporativas', 'Despesas pessoais e com familiares', 40),

  ('Aeronave', 'Utilização para fins pessoais', 10),
  ('Aeronave', 'Critérios de uso', 20),
  ('Aeronave', 'Critérios de reembolso', 30),
  ('Aeronave', 'Gestão do uso', 40),

  ('Telefone, computadores e eletrônicos', 'Linha telefônica corporativa', 10),
  ('Telefone, computadores e eletrônicos', 'Aparelho Telefônico', 20),
  ('Telefone, computadores e eletrônicos', 'Outros aparelhos eletrônicos', 30),

  ('Seguro ou Plano de Saúde', 'Seguro ou Plano de Saúde', 10),
  ('Seguro ou Plano de Saúde', 'Tratamento de Saúde não coberto pelo Plano ou Seguro', 20),
  ('Seguro ou Plano de Saúde', 'Tratamento estético', 30),
  ('Seguro ou Plano de Saúde', 'Tratamento odontológico', 40),
  ('Seguro ou Plano de Saúde', 'Outros tratamentos', 50),
  ('Seguro ou Plano de Saúde', 'Seguro de vida', 60),

  ('Auxílio Educação', 'Formação relacionada as atividades e negócios', 10),
  ('Auxílio Educação', 'Formação relacionada à governança', 20),
  ('Auxílio Educação', 'Formação relacionada a outros assuntos (inglês, liderança etc.)', 30),
  ('Auxílio Educação', 'Fundo ou repasse de valores para formação profissional ou pessoal não relacionada ao negócio', 40),

  ('Moradia', 'Aquisição, financiamento ou aluguel de moradia', 10),
  ('Moradia', 'Despesas com imóveis particulares', 20),
  ('Moradia', 'Investimentos em unidades do grupo', 30),
  ('Moradia', 'Fundo específico para aquisição destes bens', 40),

  -- O modelo escreve "materias" no segundo. Corrigido, ver o cabecalho.
  ('Recursos humanos ou materiais', 'Recursos humanos da empresa para fins pessoais', 10),
  ('Recursos humanos ou materiais', 'Recursos materiais da empresa para fins pessoais', 20),

  ('Adiantamentos ou empréstimos a regrar', 'Fichas e/ou empréstimos anteriores', 10),
  ('Adiantamentos ou empréstimos a regrar', 'Empréstimos futuros', 20),

  ('Outros benefícios ou regras', 'Outros assuntos', 10)
) AS v(tema, nome, ordem)
JOIN public.protocolo_tema_governanca t
  ON t.cliente_id IS NULL
 AND t.excluido = false
 AND lower(btrim(t.nome)) = lower(btrim(v.tema))
WHERE NOT EXISTS (
  SELECT 1 FROM public.protocolo_item_governanca i
  WHERE i.cliente_id IS NULL
    AND i.excluido = false
    AND i.tema_id = t.id
    AND lower(btrim(i.nome)) = lower(btrim(v.nome))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_falhas text[] := '{}';
  v_temas  int;
  v_itens  int;
  v_orfaos int;
BEGIN
  SELECT count(*) INTO v_temas
  FROM public.protocolo_tema_governanca WHERE cliente_id IS NULL AND excluido = false;

  SELECT count(*) INTO v_itens
  FROM public.protocolo_item_governanca WHERE cliente_id IS NULL AND excluido = false;

  IF v_temas <> 13 THEN
    v_falhas := v_falhas || format('esperava 13 temas padrao e ha %s', v_temas);
  END IF;

  IF v_itens <> 52 THEN
    v_falhas := v_falhas || format('esperava 52 itens padrao e ha %s', v_itens);
  END IF;

  -- Se o JOIN do seed nao casar um tema, os itens dele somem em silencio. A
  -- contagem acima pegaria o total errado, mas nao diria QUAL tema ficou vazio.
  SELECT count(*) INTO v_orfaos
  FROM public.protocolo_tema_governanca t
  WHERE t.cliente_id IS NULL
    AND t.excluido = false
    AND NOT EXISTS (
      SELECT 1 FROM public.protocolo_item_governanca i
      WHERE i.tema_id = t.id AND i.cliente_id IS NULL AND i.excluido = false
    );

  IF v_orfaos > 0 THEN
    v_falhas := v_falhas || format('%s tema(s) padrao ficaram sem nenhum item', v_orfaos);
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename IN ('protocolo_tema_governanca', 'protocolo_item_governanca')
      AND rowsecurity = false
  ) THEN
    v_falhas := v_falhas || 'RLS nao ficou habilitada nos dois catalogos';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'protocolo_tema_governanca_nome_uq')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'protocolo_item_governanca_nome_uq') THEN
    v_falhas := v_falhas || 'faltou indice unico de nome em algum catalogo';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE GOV-F parte 1: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;
