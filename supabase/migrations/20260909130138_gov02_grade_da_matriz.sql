-- 20260909130138_gov02_grade_da_matriz.sql
-- GOV-02, parte 2 de 2: a Matriz de Alcadas de cada cliente.
--
-- Tres tabelas e um elo, e cada uma existe por um motivo medido:
--
--   matriz_alcadas            a matriz de um cliente, com data de referencia e versao
--     matriz_atividade        uma linha: a atividade dentro daquela matriz
--       matriz_competencia    uma celula: o que UM orgao faz naquela atividade
--         ..._papel           os papeis daquela celula, porque pode ter mais de um
--
-- POR QUE `matriz_atividade` EXISTE, e nao se liga a celula direto no catalogo.
-- Duas coisas moram na linha e nao na celula: quais atividades entram naquela
-- matriz, e o detalhamento do que a atividade abrange NAQUELE cliente. Hoje esse
-- detalhamento e digitado dentro de uma celula: no Mattei, a celula do Conselho
-- em "Contratacao de prestadores de alta complexidade" lista o que conta como
-- alta complexidade, e aquilo descreve a atividade, nao o que o Conselho faz.
--
-- POR QUE O ELO DE PAPEIS. **25 das 85 celulas do modelo tem mais de um verbo**,
-- e o proprio card avisa disso nos pontos de atencao. Um `papel_id` na celula
-- perderia dois tercos do que a celula diz.
--
-- POR QUE `sobe_para_orgao_id`, que o card nao pede. **62% das celulas nomeiam
-- outro orgao dentro do texto** ("encaminha ao Conselho", "submete a Diretoria").
-- E o escalonamento, e e o que faz a clausula do contrato existir: no contrato do
-- Mattei, seis das 20 alineas do Conselho comecam com "Encaminhar a Reuniao de
-- Socios". Sem este campo, essa parte da frase voltaria a ser texto.
--
-- POR QUE A EXCECAO. Das 37 celulas do Mattei que nao cabiam em verbo mais
-- atividade mais destino, **21 eram a mesma regra**: dentro da politica o orgao
-- resolve, fora dela sobe para alguem. "As movimentacoes de pessoal que estao
-- fora da politica" aparece quatro vezes seguidas numa linha so.
--
-- A ALCADA TEM UNIDADE, e nao e sempre dinheiro. No modelo de contrato com
-- conselho, dois dos cinco limites sao percentuais: 10% do orcamento aprovado e
-- 5% do faturamento do ano anterior. Tipar como moeda quebraria dois casos em
-- cinco. E o modelo VF tem limite em reais dentro da celula, "ate o valor de
-- R$ 2mm" e "acima de R$400 mil", entao os dois tipos aparecem de verdade.
--
-- A BASE DE CALCULO E LISTA FECHADA, e nao texto. O card cobra a matriz "sem
-- nenhum campo sobrando em texto livre", e as bases medidas sao duas. Uma
-- terceira exige uma linha de migration, o que e barato e falha alto, em vez de
-- virar campo livre que ninguem consegue ler depois.
--
-- O QUE A CHAVE ESTRANGEIRA NAO GARANTE. Ela garante que o orgao existe, nao que
-- ele e do mesmo cliente da matriz. Um orgao de outro cliente numa celula geraria
-- clausula para quem nao tem nada com aquilo. CHECK nao enxerga outra tabela,
-- entao o gatilho no fim do arquivo cuida disso, nos tres campos de orgao.
--
-- Fora de escopo: o hook, a tela e o `types.ts`.
--
-- Reversao: `DROP TABLE public.matriz_competencia_papel, public.matriz_competencia,
-- public.matriz_atividade, public.matriz_alcadas;`.

-- ─────────────────────────────────────────────────────────────────────────────
-- A matriz de um cliente
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.matriz_alcadas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,

  -- A data que a propria matriz carrega no topo. No Mattei: "Elaborada em 07 de
  -- julho de 2025".
  data_referencia date,

  -- Cresce a cada nova matriz do mesmo cliente. A anterior nao some: a matriz
  -- vira clausula de contrato, e saber qual versao virou qual contrato importa.
  versao          integer NOT NULL DEFAULT 1,

  excluido        boolean NOT NULL DEFAULT false,

  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid,

  CONSTRAINT matriz_alcadas_versao_ck CHECK (versao >= 1)
);

COMMENT ON TABLE public.matriz_alcadas IS
  'GOV-02: a Matriz de Alcadas de um cliente. As colunas dela sao os orgaos da '
  'GOV-01; as linhas, as atividades. Versionada porque vira clausula de contrato.';

CREATE INDEX IF NOT EXISTS matriz_alcadas_cliente_idx
  ON public.matriz_alcadas (cliente_id, versao DESC)
  WHERE excluido = false;

CREATE UNIQUE INDEX IF NOT EXISTS matriz_alcadas_versao_uq
  ON public.matriz_alcadas (cliente_id, versao)
  WHERE excluido = false;

DROP TRIGGER IF EXISTS update_matriz_alcadas_updated_at ON public.matriz_alcadas;
CREATE TRIGGER update_matriz_alcadas_updated_at
  BEFORE UPDATE ON public.matriz_alcadas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- A linha: uma atividade dentro de uma matriz
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.matriz_atividade (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matriz_id    uuid NOT NULL REFERENCES public.matriz_alcadas(id) ON DELETE CASCADE,
  atividade_id uuid NOT NULL REFERENCES public.atividade_governanca(id) ON DELETE RESTRICT,

  -- A ordem dentro DESTA matriz. Nasce da ordem do catalogo e pode ser mexida,
  -- porque o cliente que acrescenta uma atividade decide onde ela entra.
  ordem        integer NOT NULL DEFAULT 0,

  -- O que a atividade abrange neste cliente. Vale para a linha inteira e evita
  -- que a mesma explicacao seja repetida na celula de cada orgao.
  detalhamento text,

  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid
);

COMMENT ON TABLE public.matriz_atividade IS
  'GOV-02: uma linha da matriz. Diz que a atividade entra nesta matriz, em que '
  'ordem, e o que ela abrange neste cliente. `ON DELETE RESTRICT` no catalogo de '
  'proposito: atividade em uso nao se apaga, se marca como excluida.';

-- A mesma atividade nao entra duas vezes na mesma matriz.
CREATE UNIQUE INDEX IF NOT EXISTS matriz_atividade_uq
  ON public.matriz_atividade (matriz_id, atividade_id);

CREATE INDEX IF NOT EXISTS matriz_atividade_ordem_idx
  ON public.matriz_atividade (matriz_id, ordem);

DROP TRIGGER IF EXISTS update_matriz_atividade_updated_at ON public.matriz_atividade;
CREATE TRIGGER update_matriz_atividade_updated_at
  BEFORE UPDATE ON public.matriz_atividade
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- A celula: o que um orgao faz naquela atividade
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.matriz_competencia (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matriz_atividade_id uuid NOT NULL
                        REFERENCES public.matriz_atividade(id) ON DELETE CASCADE,
  orgao_id            uuid NOT NULL
                        REFERENCES public.orgao_governanca(id) ON DELETE CASCADE,

  -- Um quarto das celulas e so isto. Guardar como marca, e nao como um papel
  -- chamado "Nao participa", deixa a pergunta "este orgao participa?" ser
  -- respondida sem abrir a lista de papeis.
  nao_participa       boolean NOT NULL DEFAULT false,

  -- Para onde a decisao sobe depois deste orgao. Vira o "Encaminhar a Reuniao de
  -- Socios" da alinea do contrato.
  sobe_para_orgao_id  uuid REFERENCES public.orgao_governanca(id) ON DELETE SET NULL,

  -- O limite ate onde este orgao decide sozinho.
  -- Em moeda, o valor em reais. Em percentual, o numero como se escreve: 10 para
  -- 10%, e nao 0,10. Guardar 0,10 faria "10%" e "R$ 0,10" parecerem o mesmo dado
  -- para quem olha a coluna sem olhar a unidade.
  alcada_valor        numeric(18,2),
  alcada_unidade      text,
  alcada_base         text,

  -- A regra de excecao: dentro da regra o orgao resolve, fora dela sobe.
  excecao_motivo      text,
  excecao_orgao_id    uuid REFERENCES public.orgao_governanca(id) ON DELETE SET NULL,

  created_at          timestamptz NOT NULL DEFAULT now(),
  created_by          uuid,
  updated_at          timestamptz NOT NULL DEFAULT now(),
  updated_by          uuid,

  -- Valor e unidade andam juntos: numero sem unidade nao se sabe ler.
  CONSTRAINT matriz_competencia_alcada_ck CHECK (
    (alcada_valor IS NULL AND alcada_unidade IS NULL)
    OR (alcada_valor IS NOT NULL AND alcada_unidade IN ('moeda', 'percentual'))
  ),

  -- Base de calculo so faz sentido em percentual, e a lista e fechada. As duas
  -- vieram do modelo de contrato com conselho: 10% do orcamento aprovado e 5% do
  -- faturamento do ano anterior.
  CONSTRAINT matriz_competencia_base_ck CHECK (
    alcada_base IS NULL
    OR (alcada_unidade = 'percentual'
        AND alcada_base IN ('orcamento_aprovado', 'faturamento_ano_anterior'))
  ),

  -- Excecao tem motivo e destino, ou nao tem nenhum dos dois.
  CONSTRAINT matriz_competencia_excecao_ck CHECK (
    (excecao_motivo IS NULL AND excecao_orgao_id IS NULL)
    OR (excecao_motivo IN ('fora_da_politica', 'acima_da_alcada')
        AND excecao_orgao_id IS NOT NULL)
  ),

  -- Quem nao participa nao escala, nao tem limite e nao tem excecao. Sem isto, a
  -- tela poderia gravar "nao participa" e "sobe para o Conselho" na mesma celula,
  -- e o gerador nao saberia qual das duas obedecer.
  CONSTRAINT matriz_competencia_ausencia_ck CHECK (
    nao_participa = false
    OR (sobe_para_orgao_id IS NULL AND alcada_valor IS NULL AND excecao_motivo IS NULL)
  ),

  -- Um orgao nao escala para ele mesmo.
  CONSTRAINT matriz_competencia_sobe_ck CHECK (sobe_para_orgao_id IS DISTINCT FROM orgao_id)
);

COMMENT ON TABLE public.matriz_competencia IS
  'GOV-02: uma celula da matriz, o que um orgao faz numa atividade. O nome e '
  '"competencia" e nao "celula" porque e a palavra do proprio contrato social, '
  'que diz "Compete ao Conselho de Administracao".';

COMMENT ON COLUMN public.matriz_competencia.sobe_para_orgao_id IS
  'Para onde a decisao segue depois deste orgao. E daqui que sai o "Encaminhar a '
  'Reuniao de Socios" das alineas do contrato.';

COMMENT ON COLUMN public.matriz_competencia.alcada_base IS
  'Base do percentual. Lista fechada de proposito: o criterio da tarefa e a matriz '
  'nao sobrar campo em texto livre. Uma base nova custa uma linha de migration.';

CREATE UNIQUE INDEX IF NOT EXISTS matriz_competencia_uq
  ON public.matriz_competencia (matriz_atividade_id, orgao_id);

CREATE INDEX IF NOT EXISTS matriz_competencia_orgao_idx
  ON public.matriz_competencia (orgao_id);

DROP TRIGGER IF EXISTS update_matriz_competencia_updated_at ON public.matriz_competencia;
CREATE TRIGGER update_matriz_competencia_updated_at
  BEFORE UPDATE ON public.matriz_competencia
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Os papeis daquela celula
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.matriz_competencia_papel (
  competencia_id uuid NOT NULL
                   REFERENCES public.matriz_competencia(id) ON DELETE CASCADE,
  papel_id       uuid NOT NULL
                   REFERENCES public.papel_governanca(id) ON DELETE RESTRICT,

  -- A ordem em que os papeis aparecem na frase: "define a estrategia, participa
  -- das negociacoes E delibera o fechamento" nao e a mesma coisa em outra ordem.
  ordem          integer NOT NULL DEFAULT 0,

  created_at     timestamptz NOT NULL DEFAULT now(),
  created_by     uuid,

  PRIMARY KEY (competencia_id, papel_id)
);

COMMENT ON TABLE public.matriz_competencia_papel IS
  'GOV-02: os papeis de uma celula. Existe porque 25 das 85 celulas do modelo tem '
  'mais de um verbo, e a ordem deles e a ordem da frase.';

CREATE INDEX IF NOT EXISTS matriz_competencia_papel_ordem_idx
  ON public.matriz_competencia_papel (competencia_id, ordem);

-- ─────────────────────────────────────────────────────────────────────────────
-- O orgao tem de ser do mesmo cliente da matriz
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
  WHERE o.id IN (NEW.orgao_id, NEW.sobe_para_orgao_id, NEW.excecao_orgao_id)
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
  'Recusa orgao de outro cliente na celula, no escalonamento ou na excecao. A '
  'chave estrangeira garante que o orgao existe; este gatilho garante que e o '
  'certo, e CHECK nao serve porque nao enxerga outra tabela.';

DROP TRIGGER IF EXISTS trg_matriz_competencia_orgao_do_cliente ON public.matriz_competencia;
CREATE TRIGGER trg_matriz_competencia_orgao_do_cliente
  -- Sem `excecao_orgao_id` na lista: a migration 20260910155024 remove essa
  -- coluna, e CREATE TRIGGER valida os nomes do `UPDATE OF` na hora. Com ela
  -- aqui, reaplicar este arquivo depois daquela quebra com 42703, e o
  -- `db:sync` reaplica tudo que nao esta no ledger dele.
  BEFORE INSERT OR UPDATE OF orgao_id, sobe_para_orgao_id, matriz_atividade_id
  ON public.matriz_competencia
  FOR EACH ROW EXECUTE FUNCTION public.matriz_competencia_orgao_do_cliente();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Tudo pende da matriz, e a matriz pende do cliente. As filhas resolvem o cliente
-- subindo a corrente, para nao repetir `cliente_id` em quatro lugares e criar a
-- chance de divergir.
--
-- Mesmo desvio consciente da GOV-01: o card pede `is_project_member`, e aqui nao
-- ha projeto, o recorte e por cliente.

ALTER TABLE public.matriz_alcadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriz_atividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriz_competencia ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matriz_competencia_papel ENABLE ROW LEVEL SECURITY;

-- Responde "esta matriz e de um cliente que eu enxergo?".
CREATE OR REPLACE FUNCTION public.matriz_visivel_para(_matriz_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matriz_alcadas m
    WHERE m.id = _matriz_id AND public.cliente_visivel_para(m.cliente_id)
  );
$$;

COMMENT ON FUNCTION public.matriz_visivel_para(uuid) IS
  'GOV-02: o recorte das filhas da matriz. Sobe a corrente ate o cliente em vez de '
  'repetir cliente_id em cada tabela.';

-- Mesma pergunta, partindo de uma linha da matriz.
CREATE OR REPLACE FUNCTION public.matriz_atividade_visivel_para(_matriz_atividade_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.matriz_atividade ma
    WHERE ma.id = _matriz_atividade_id AND public.matriz_visivel_para(ma.matriz_id)
  );
$$;

DROP POLICY IF EXISTS rls_matriz_alcadas_select ON public.matriz_alcadas;
CREATE POLICY rls_matriz_alcadas_select ON public.matriz_alcadas
  FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS rls_matriz_alcadas_insert ON public.matriz_alcadas;
CREATE POLICY rls_matriz_alcadas_insert ON public.matriz_alcadas
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS rls_matriz_alcadas_update ON public.matriz_alcadas;
CREATE POLICY rls_matriz_alcadas_update ON public.matriz_alcadas
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS rls_matriz_alcadas_delete ON public.matriz_alcadas;
CREATE POLICY rls_matriz_alcadas_delete ON public.matriz_alcadas
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

-- Ler e enxergar o cliente andam juntos; escrever e apagar pedem piso de papel.
--
-- NAO DA PARA USAR `FOR ALL` AQUI. Nele o `USING` vale tambem para o DELETE, e o
-- piso de papel so entraria pelo `WITH CHECK`, que o DELETE nao usa. Ficaria
-- qualquer autenticado que enxerga o cliente apagando linha da matriz.

DROP POLICY IF EXISTS rls_matriz_atividade_select ON public.matriz_atividade;
CREATE POLICY rls_matriz_atividade_select ON public.matriz_atividade
  FOR SELECT TO authenticated
  USING (public.matriz_visivel_para(matriz_id));

DROP POLICY IF EXISTS rls_matriz_atividade_insert ON public.matriz_atividade;
CREATE POLICY rls_matriz_atividade_insert ON public.matriz_atividade
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.matriz_visivel_para(matriz_id)
  );

DROP POLICY IF EXISTS rls_matriz_atividade_update ON public.matriz_atividade;
CREATE POLICY rls_matriz_atividade_update ON public.matriz_atividade
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.matriz_visivel_para(matriz_id)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.matriz_visivel_para(matriz_id)
  );

-- Tirar uma atividade da matriz e edicao normal, nao excecao: piso de
-- team_member, e nao de sublider como no DELETE da propria matriz.
DROP POLICY IF EXISTS rls_matriz_atividade_delete ON public.matriz_atividade;
CREATE POLICY rls_matriz_atividade_delete ON public.matriz_atividade
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.matriz_visivel_para(matriz_id)
  );

DROP POLICY IF EXISTS rls_matriz_competencia_select ON public.matriz_competencia;
CREATE POLICY rls_matriz_competencia_select ON public.matriz_competencia
  FOR SELECT TO authenticated
  USING (public.matriz_atividade_visivel_para(matriz_atividade_id));

DROP POLICY IF EXISTS rls_matriz_competencia_insert ON public.matriz_competencia;
CREATE POLICY rls_matriz_competencia_insert ON public.matriz_competencia
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.matriz_atividade_visivel_para(matriz_atividade_id)
  );

DROP POLICY IF EXISTS rls_matriz_competencia_update ON public.matriz_competencia;
CREATE POLICY rls_matriz_competencia_update ON public.matriz_competencia
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.matriz_atividade_visivel_para(matriz_atividade_id)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.matriz_atividade_visivel_para(matriz_atividade_id)
  );

DROP POLICY IF EXISTS rls_matriz_competencia_delete ON public.matriz_competencia;
CREATE POLICY rls_matriz_competencia_delete ON public.matriz_competencia
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.matriz_atividade_visivel_para(matriz_atividade_id)
  );

DROP POLICY IF EXISTS rls_matriz_competencia_papel_select ON public.matriz_competencia_papel;
CREATE POLICY rls_matriz_competencia_papel_select ON public.matriz_competencia_papel
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.matriz_competencia c
      WHERE c.id = competencia_id
        AND public.matriz_atividade_visivel_para(c.matriz_atividade_id)
    )
  );

DROP POLICY IF EXISTS rls_matriz_competencia_papel_insert ON public.matriz_competencia_papel;
CREATE POLICY rls_matriz_competencia_papel_insert ON public.matriz_competencia_papel
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.matriz_competencia c
      WHERE c.id = competencia_id
        AND public.matriz_atividade_visivel_para(c.matriz_atividade_id)
    )
  );

DROP POLICY IF EXISTS rls_matriz_competencia_papel_update ON public.matriz_competencia_papel;
CREATE POLICY rls_matriz_competencia_papel_update ON public.matriz_competencia_papel
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.matriz_competencia c
      WHERE c.id = competencia_id
        AND public.matriz_atividade_visivel_para(c.matriz_atividade_id)
    )
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.matriz_competencia c
      WHERE c.id = competencia_id
        AND public.matriz_atividade_visivel_para(c.matriz_atividade_id)
    )
  );

DROP POLICY IF EXISTS rls_matriz_competencia_papel_delete ON public.matriz_competencia_papel;
CREATE POLICY rls_matriz_competencia_papel_delete ON public.matriz_competencia_papel
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND EXISTS (
      SELECT 1 FROM public.matriz_competencia c
      WHERE c.id = competencia_id
        AND public.matriz_atividade_visivel_para(c.matriz_atividade_id)
    )
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_falhas text[] := '{}';
  t        text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'matriz_alcadas', 'matriz_atividade', 'matriz_competencia', 'matriz_competencia_papel'
  ] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = t
    ) THEN
      v_falhas := v_falhas || format('a tabela %s nao foi criada', t);
    ELSIF NOT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE schemaname = 'public' AND tablename = t AND rowsecurity = true
    ) THEN
      v_falhas := v_falhas || format('RLS nao ficou habilitada em %s', t);
    END IF;
  END LOOP;

  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_matriz_competencia_orgao_do_cliente' AND NOT tgisinternal
  ) THEN
    v_falhas := v_falhas || 'o gatilho do orgao do cliente nao foi criado';
  END IF;

  -- Sem coluna `ambiente` em nenhuma delas: herdam do cliente, como a GOV-01.
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('matriz_alcadas', 'matriz_atividade', 'matriz_competencia')
      AND column_name = 'ambiente'
  ) THEN
    v_falhas := v_falhas || 'alguma tabela ganhou coluna ambiente, e o ambiente vem do cliente';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE GOV-02 parte 2: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;
