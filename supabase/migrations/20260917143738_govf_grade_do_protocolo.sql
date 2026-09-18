-- 20260917143738_govf_grade_do_protocolo.sql
-- GOV-F, parte 2 de 2: o protocolo de um cliente, suas colunas e suas celulas.
--
-- A parte 1 criou os catalogos das linhas (tema e item). Aqui vem o resto da
-- grade, na mesma forma da GOV-02: cabecalho, linha, celula.
--
--     protocolo_remuneracao   o protocolo de um cliente, versionado
--     protocolo_beneficiario  a COLUNA: quem tem direito
--     protocolo_linha         a LINHA: um item do catalogo dentro deste protocolo
--     protocolo_regra         a CELULA: o texto da regra
--
-- A COLUNA E O QUE VARIA DE VERDADE, E POR ISSO ELA E POR PROTOCOLO E NAO POR
-- CLIENTE. Medido nos arquivos reais:
--
--     modelo da casa   Acionistas | Conselheiros de Administracao | Diretores
--     Potrich          Socios Fundadores | Sucessores na Gestao
--     Toqueto V1       Socios Fundadores | Familiares Gestores
--     Toqueto VF       Gestores | Fundadores | Socios/Filhos 1a geracao
--
-- O Toqueto e o mesmo cliente em duas versoes, e as colunas mudaram nas duas. Se
-- o beneficiario fosse do cliente, a V1 e a VF disputariam a mesma lista. Ele e
-- do protocolo.
--
-- ELE NAO E ORGAO DE GOVERNANCA, e esta e a diferenca que impede reusar as
-- tabelas da GOV-02 em vez de criar estas. "Socios Fundadores", "Familiares
-- Gestores" e "Socios/Filhos 1a geracao" nao sao orgaos; enfia-los em
-- `orgao_governanca` sujaria o cadastro da GOV-01, que a Matriz de Alcadas e o
-- motor documental consomem. A GOV-01 ainda tem `entra_no_contrato`, que separa
-- orgao que vira clausula de orgao que so existe na Matriz: um "Socios
-- Fundadores" ali apareceria como candidato na tela Gerar do contrato social.
-- Tambem nao sao papeis: `papel_governanca` guarda verbo ("Aprova", "Decide",
-- "Executa"), outra coisa.
--
-- A CELULA E TEXTO LIVRE, e esta e a segunda diferenca. Na Matriz de Alcadas a
-- celula e estruturada (`nao_participa`, `sobe_para_orgao_id`, `alcada_valor`).
-- Aqui a celula ja e a frase que vai para o documento, escrita pela consultoria:
-- "R$ 45.000,00 por Fundador" (Potrich, Remuneracao pelo trabalho); "Ha cada 02
-- (dois) anos ou 150 mil km, o que ocorrer primeiro" (Potrich, Regras de
-- substituicao). Nao ha campo que vira frase: ha texto que muda de lugar.
--
-- UM CAMPO DERRUBADO, `data_referencia`, E O MOTIVO E MEDIDO. A `matriz_alcadas`
-- tem esse campo e ele se justifica la: a matriz do Mattei traz "Elaborada em 07
-- de julho de 2025" em linha propria. No protocolo NAO existe essa linha. Varri
-- os quatro arquivos celula a celula procurando qualquer data: o modelo da casa
-- nao tem nenhuma, o Toqueto V1 e o VF nao tem nenhuma, e o Potrich tem uma so,
-- "10/03/26", DENTRO do texto do preambulo ("ao atual momento do negocio
-- 10/03/26"), nao em campo separado. Guardar a data em coluna propria criaria
-- campo que o documento nunca escreve, e depois viraria migration de limpeza.
-- Quem precisar da data escreve no `preambulo`, que e onde ela esta na vida real.
--
-- O PADRAO DA CASA MORA NA PROPRIA TABELA, com `protocolo_id` nulo, mesmo truque
-- que `cliente_id` nulo nos catalogos. Sao as tres colunas do modelo. A tela
-- copia essas tres para um protocolo novo, igual ao botao "Adicionar padroes" da
-- tela de Orgaos.
--
-- FORMATO DE SAIDA: PLANILHA, identica a estrutura de hoje, por decisao de
-- 17/09/2026. Existem clientes com o protocolo em texto corrido (Jacobowski,
-- Massi, Santa Rita), e medindo os incisos i a xxi deles a matriz e a MESMA, so
-- que em prosa. Fica de fora porque a casa nao tem modelo em texto: em
-- `Modelos/AA-Modelos Antigos/Governanca` ha um unico modelo de protocolo, e e a
-- planilha. Derivar a prosa de documento de cliente seria inventar padrao.
--
-- FORA DE ESCOPO, medido e registrado para nao voltar como duvida:
--   - Mizote: a aba e "Plano de Carreira e Remuneracao", coluna e PESSOA (Erick,
--     Seiji) por Passo 01/02/03 e linha e atributo (Prazo, Cargo,
--     Responsabilidades). Outro instrumento.
--   - Toqueto VF, Planilha2: memoria de calculo (pessoa x salario, soja, milho,
--     total). Anexo, nao grade.
--   - "Regime de casamento e/ou uniao estavel", que aparece no Jacobowski e nao
--     existe no modelo da casa. Encosta na GOV-03.
--
-- A auditoria campo a campo e do front, via `useAuditLog`, como na GOV-02.
--
-- Reversao: `DROP TABLE public.protocolo_regra, public.protocolo_linha,
-- public.protocolo_beneficiario, public.protocolo_remuneracao;` e
-- `DROP FUNCTION public.protocolo_visivel_para(uuid),
-- public.protocolo_linha_visivel_para(uuid),
-- public.protocolo_regra_beneficiario_do_protocolo(),
-- public.protocolo_linha_item_do_cliente();`.

-- ─────────────────────────────────────────────────────────────────────────────
-- O protocolo de um cliente
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.protocolo_remuneracao (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id      uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,

  -- SEM `data_referencia`, ao contrario da `matriz_alcadas`. Ver o cabecalho.

  -- O texto de abertura, quando existe. O Potrich tem um e o modelo nao: "Este
  -- Protocolo visa regrar os acordos e combinados da familia ao atual momento do
  -- negocio, cujo teor sera revisto apos...". E uma linha da planilha, acima da
  -- grade, entao mora no cabecalho e nao numa celula.
  preambulo       text,

  -- Cresce a cada novo protocolo do mesmo cliente. A anterior nao some: o
  -- Toqueto tem V1 e VF e as duas circularam.
  versao          integer NOT NULL DEFAULT 1,

  excluido        boolean NOT NULL DEFAULT false,

  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid,

  CONSTRAINT protocolo_remuneracao_versao_ck CHECK (versao >= 1)
);

COMMENT ON TABLE public.protocolo_remuneracao IS
  'GOV-F: o Protocolo de Remuneracao de um cliente. As linhas dele sao os itens '
  'do catalogo da parte 1; as colunas, os beneficiarios. Versionado porque o '
  'protocolo e revisto e a versao anterior continua valendo ate a troca: o '
  'Toqueto tem V1 e VF com colunas diferentes.';

CREATE INDEX IF NOT EXISTS protocolo_remuneracao_cliente_idx
  ON public.protocolo_remuneracao (cliente_id, versao DESC)
  WHERE excluido = false;

CREATE UNIQUE INDEX IF NOT EXISTS protocolo_remuneracao_versao_uq
  ON public.protocolo_remuneracao (cliente_id, versao)
  WHERE excluido = false;

DROP TRIGGER IF EXISTS update_protocolo_remuneracao_updated_at ON public.protocolo_remuneracao;
CREATE TRIGGER update_protocolo_remuneracao_updated_at
  BEFORE UPDATE ON public.protocolo_remuneracao
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- A coluna: quem tem direito
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.protocolo_beneficiario (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- NULO e padrao da casa, as tres colunas do modelo. Preenchido e coluna deste
  -- protocolo. Ver o cabecalho para o porque de ser do protocolo e nao do
  -- cliente.
  protocolo_id uuid REFERENCES public.protocolo_remuneracao(id) ON DELETE CASCADE,

  nome         text NOT NULL,

  ordem        integer NOT NULL DEFAULT 0,

  excluido     boolean NOT NULL DEFAULT false,

  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid,

  CONSTRAINT protocolo_beneficiario_nome_ck CHECK (btrim(nome) <> '')
);

COMMENT ON TABLE public.protocolo_beneficiario IS
  'GOV-F: as colunas do protocolo, o grupo que tem direito ao que esta na celula. '
  'NAO e orgao de governanca nem papel: nos arquivos reais aparecem "Socios '
  'Fundadores", "Familiares Gestores", "Socios/Filhos 1a geracao". '
  '`protocolo_id` nulo e o padrao da casa (as tres colunas do modelo), que a tela '
  'copia para um protocolo novo.';

CREATE INDEX IF NOT EXISTS protocolo_beneficiario_ordem_idx
  ON public.protocolo_beneficiario (protocolo_id, ordem, nome)
  WHERE excluido = false;

-- Mesmo motivo do `coalesce` nos catalogos: NULL nao colide consigo mesmo.
CREATE UNIQUE INDEX IF NOT EXISTS protocolo_beneficiario_nome_uq
  ON public.protocolo_beneficiario (
    coalesce(protocolo_id, '00000000-0000-0000-0000-000000000000'::uuid),
    lower(btrim(nome))
  )
  WHERE excluido = false;

DROP TRIGGER IF EXISTS update_protocolo_beneficiario_updated_at ON public.protocolo_beneficiario;
CREATE TRIGGER update_protocolo_beneficiario_updated_at
  BEFORE UPDATE ON public.protocolo_beneficiario
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- A linha: um item do catalogo dentro deste protocolo
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.protocolo_linha (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  protocolo_id uuid NOT NULL REFERENCES public.protocolo_remuneracao(id) ON DELETE CASCADE,

  -- `RESTRICT` de proposito, igual a GOV-02: item em uso nao se apaga.
  item_id      uuid NOT NULL REFERENCES public.protocolo_item_governanca(id) ON DELETE RESTRICT,

  -- A ordem dentro DESTE protocolo. Nasce da ordem do catalogo e pode ser mexida.
  ordem        integer NOT NULL DEFAULT 0,

  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid,
  updated_at   timestamptz NOT NULL DEFAULT now(),
  updated_by   uuid
);

COMMENT ON TABLE public.protocolo_linha IS
  'GOV-F: uma linha do protocolo. Diz que o item entra neste protocolo e em que '
  'ordem. Cliente que nao tem aviao simplesmente nao traz as linhas do tema '
  'Aeronave, foi o que o Toqueto VF fez.';

-- O mesmo item nao entra duas vezes no mesmo protocolo.
CREATE UNIQUE INDEX IF NOT EXISTS protocolo_linha_uq
  ON public.protocolo_linha (protocolo_id, item_id);

CREATE INDEX IF NOT EXISTS protocolo_linha_ordem_idx
  ON public.protocolo_linha (protocolo_id, ordem);

DROP TRIGGER IF EXISTS update_protocolo_linha_updated_at ON public.protocolo_linha;
CREATE TRIGGER update_protocolo_linha_updated_at
  BEFORE UPDATE ON public.protocolo_linha
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- A celula: a regra escrita
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.protocolo_regra (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linha_id        uuid NOT NULL REFERENCES public.protocolo_linha(id) ON DELETE CASCADE,
  beneficiario_id uuid NOT NULL REFERENCES public.protocolo_beneficiario(id) ON DELETE CASCADE,

  -- O texto que vai para o documento, como a consultoria escreveu. Nao ha
  -- estrutura aqui de proposito: ver o cabecalho.
  texto           text NOT NULL,

  created_at      timestamptz NOT NULL DEFAULT now(),
  created_by      uuid,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid,

  -- Celula em branco e a ausencia da linha, nao uma linha com texto vazio. Sem
  -- isto, "Nao se aplica" e "" ficariam indistinguiveis no documento gerado, e
  -- "Nao se aplica" e uma resposta que a consultoria escreve de proposito: ela
  -- aparece 2 vezes so nas primeiras linhas do Potrich.
  CONSTRAINT protocolo_regra_texto_ck CHECK (btrim(texto) <> '')
);

COMMENT ON TABLE public.protocolo_regra IS
  'GOV-F: a celula do protocolo, o cruzamento de uma linha com um beneficiario. '
  'Guarda o texto da regra como a consultoria escreveu, porque no protocolo a '
  'celula JA E a frase do documento. Celula sem linha aqui e celula em branco.';

CREATE UNIQUE INDEX IF NOT EXISTS protocolo_regra_uq
  ON public.protocolo_regra (linha_id, beneficiario_id);

CREATE INDEX IF NOT EXISTS protocolo_regra_beneficiario_idx
  ON public.protocolo_regra (beneficiario_id);

DROP TRIGGER IF EXISTS update_protocolo_regra_updated_at ON public.protocolo_regra;
CREATE TRIGGER update_protocolo_regra_updated_at
  BEFORE UPDATE ON public.protocolo_regra
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ─────────────────────────────────────────────────────────────────────────────
-- Coerencia: a celula so cruza coisas do mesmo protocolo
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Mesma ideia do `trg_matriz_competencia_orgao_do_cliente` da GOV-02: a chave
-- estrangeira garante que o beneficiario existe, este gatilho garante que e o
-- certo, e CHECK nao serve porque nao enxerga outra tabela.

CREATE OR REPLACE FUNCTION public.protocolo_regra_beneficiario_do_protocolo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_protocolo_da_linha uuid;
  v_protocolo_do_benef uuid;
BEGIN
  SELECT l.protocolo_id INTO v_protocolo_da_linha
  FROM public.protocolo_linha l
  WHERE l.id = NEW.linha_id;

  SELECT b.protocolo_id INTO v_protocolo_do_benef
  FROM public.protocolo_beneficiario b
  WHERE b.id = NEW.beneficiario_id;

  -- O padrao da casa (`protocolo_id` nulo) e so molde: ele e copiado para o
  -- protocolo, nao usado direto numa celula. Sem esta guarda, dois protocolos
  -- gravariam celula no mesmo beneficiario padrao e um leria a regra do outro.
  IF v_protocolo_do_benef IS NULL THEN
    RAISE EXCEPTION
      'Beneficiario padrao da casa nao pode receber regra: copie-o para o protocolo antes'
      USING ERRCODE = '23514';
  END IF;

  IF v_protocolo_do_benef IS DISTINCT FROM v_protocolo_da_linha THEN
    RAISE EXCEPTION
      'Beneficiario de outro protocolo na celula'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.protocolo_regra_beneficiario_do_protocolo() IS
  'GOV-F: recusa celula que cruza linha de um protocolo com coluna de outro, e '
  'recusa celula presa ao beneficiario padrao da casa.';

DROP TRIGGER IF EXISTS trg_protocolo_regra_beneficiario_do_protocolo ON public.protocolo_regra;
CREATE TRIGGER trg_protocolo_regra_beneficiario_do_protocolo
  BEFORE INSERT OR UPDATE OF linha_id, beneficiario_id ON public.protocolo_regra
  FOR EACH ROW EXECUTE FUNCTION public.protocolo_regra_beneficiario_do_protocolo();

-- A linha so aceita item padrao da casa ou item do proprio cliente.

CREATE OR REPLACE FUNCTION public.protocolo_linha_item_do_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cliente_do_protocolo uuid;
  v_cliente_do_item      uuid;
BEGIN
  SELECT p.cliente_id INTO v_cliente_do_protocolo
  FROM public.protocolo_remuneracao p
  WHERE p.id = NEW.protocolo_id;

  SELECT i.cliente_id INTO v_cliente_do_item
  FROM public.protocolo_item_governanca i
  WHERE i.id = NEW.item_id;

  IF v_cliente_do_item IS NOT NULL
     AND v_cliente_do_item IS DISTINCT FROM v_cliente_do_protocolo THEN
    RAISE EXCEPTION
      'Item de outro cliente no protocolo'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.protocolo_linha_item_do_cliente() IS
  'GOV-F: item com `cliente_id` nulo e padrao da casa e serve a todos; item de '
  'cliente so entra no protocolo daquele cliente.';

DROP TRIGGER IF EXISTS trg_protocolo_linha_item_do_cliente ON public.protocolo_linha;
CREATE TRIGGER trg_protocolo_linha_item_do_cliente
  BEFORE INSERT OR UPDATE OF protocolo_id, item_id ON public.protocolo_linha
  FOR EACH ROW EXECUTE FUNCTION public.protocolo_linha_item_do_cliente();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.protocolo_remuneracao  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolo_beneficiario ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolo_linha        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.protocolo_regra        ENABLE ROW LEVEL SECURITY;

-- Responde "este protocolo e de um cliente que eu enxergo?". Sobe a corrente ate
-- o cliente em vez de repetir `cliente_id` em cada tabela, igual a GOV-02.
CREATE OR REPLACE FUNCTION public.protocolo_visivel_para(_protocolo_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.protocolo_remuneracao p
    WHERE p.id = _protocolo_id AND public.cliente_visivel_para(p.cliente_id)
  );
$$;

COMMENT ON FUNCTION public.protocolo_visivel_para(uuid) IS
  'GOV-F: o recorte das filhas do protocolo.';

CREATE OR REPLACE FUNCTION public.protocolo_linha_visivel_para(_linha_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.protocolo_linha l
    WHERE l.id = _linha_id AND public.protocolo_visivel_para(l.protocolo_id)
  );
$$;

COMMENT ON FUNCTION public.protocolo_linha_visivel_para(uuid) IS
  'GOV-F: mesma pergunta, partindo de uma linha do protocolo.';

-- O protocolo

DROP POLICY IF EXISTS rls_protocolo_remuneracao_select ON public.protocolo_remuneracao;
CREATE POLICY rls_protocolo_remuneracao_select ON public.protocolo_remuneracao
  FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS rls_protocolo_remuneracao_insert ON public.protocolo_remuneracao;
CREATE POLICY rls_protocolo_remuneracao_insert ON public.protocolo_remuneracao
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS rls_protocolo_remuneracao_update ON public.protocolo_remuneracao;
CREATE POLICY rls_protocolo_remuneracao_update ON public.protocolo_remuneracao
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS rls_protocolo_remuneracao_delete ON public.protocolo_remuneracao;
CREATE POLICY rls_protocolo_remuneracao_delete ON public.protocolo_remuneracao
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

-- As colunas. O padrao da casa (`protocolo_id` nulo) e visivel a quem e do time,
-- e so `sublider` mexe nele: mudar o padrao muda o ponto de partida de todo
-- protocolo novo.

DROP POLICY IF EXISTS rls_protocolo_beneficiario_select ON public.protocolo_beneficiario;
CREATE POLICY rls_protocolo_beneficiario_select ON public.protocolo_beneficiario
  FOR SELECT TO authenticated
  USING (protocolo_id IS NULL OR public.protocolo_visivel_para(protocolo_id));

DROP POLICY IF EXISTS rls_protocolo_beneficiario_insert ON public.protocolo_beneficiario;
CREATE POLICY rls_protocolo_beneficiario_insert ON public.protocolo_beneficiario
  FOR INSERT TO authenticated
  WITH CHECK (
    CASE WHEN protocolo_id IS NULL
      THEN public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
      ELSE public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
           AND public.protocolo_visivel_para(protocolo_id)
    END
  );

DROP POLICY IF EXISTS rls_protocolo_beneficiario_update ON public.protocolo_beneficiario;
CREATE POLICY rls_protocolo_beneficiario_update ON public.protocolo_beneficiario
  FOR UPDATE TO authenticated
  USING (
    CASE WHEN protocolo_id IS NULL
      THEN public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
      ELSE public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
           AND public.protocolo_visivel_para(protocolo_id)
    END
  )
  WITH CHECK (
    CASE WHEN protocolo_id IS NULL
      THEN public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
      ELSE public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
           AND public.protocolo_visivel_para(protocolo_id)
    END
  );

DROP POLICY IF EXISTS rls_protocolo_beneficiario_delete ON public.protocolo_beneficiario;
CREATE POLICY rls_protocolo_beneficiario_delete ON public.protocolo_beneficiario
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    AND (protocolo_id IS NULL OR public.protocolo_visivel_para(protocolo_id))
  );

-- As linhas

DROP POLICY IF EXISTS rls_protocolo_linha_select ON public.protocolo_linha;
CREATE POLICY rls_protocolo_linha_select ON public.protocolo_linha
  FOR SELECT TO authenticated
  USING (public.protocolo_visivel_para(protocolo_id));

DROP POLICY IF EXISTS rls_protocolo_linha_insert ON public.protocolo_linha;
CREATE POLICY rls_protocolo_linha_insert ON public.protocolo_linha
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.protocolo_visivel_para(protocolo_id)
  );

DROP POLICY IF EXISTS rls_protocolo_linha_update ON public.protocolo_linha;
CREATE POLICY rls_protocolo_linha_update ON public.protocolo_linha
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.protocolo_visivel_para(protocolo_id)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.protocolo_visivel_para(protocolo_id)
  );

DROP POLICY IF EXISTS rls_protocolo_linha_delete ON public.protocolo_linha;
CREATE POLICY rls_protocolo_linha_delete ON public.protocolo_linha
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.protocolo_visivel_para(protocolo_id)
  );

-- As celulas

DROP POLICY IF EXISTS rls_protocolo_regra_select ON public.protocolo_regra;
CREATE POLICY rls_protocolo_regra_select ON public.protocolo_regra
  FOR SELECT TO authenticated
  USING (public.protocolo_linha_visivel_para(linha_id));

DROP POLICY IF EXISTS rls_protocolo_regra_insert ON public.protocolo_regra;
CREATE POLICY rls_protocolo_regra_insert ON public.protocolo_regra
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.protocolo_linha_visivel_para(linha_id)
  );

DROP POLICY IF EXISTS rls_protocolo_regra_update ON public.protocolo_regra;
CREATE POLICY rls_protocolo_regra_update ON public.protocolo_regra
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.protocolo_linha_visivel_para(linha_id)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.protocolo_linha_visivel_para(linha_id)
  );

DROP POLICY IF EXISTS rls_protocolo_regra_delete ON public.protocolo_regra;
CREATE POLICY rls_protocolo_regra_delete ON public.protocolo_regra
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.protocolo_linha_visivel_para(linha_id)
  );

-- ─────────────────────────────────────────────────────────────────────────────
-- Seed: as tres colunas do modelo da casa
-- ─────────────────────────────────────────────────────────────────────────────
--
-- Sao o ponto de partida, nao a lista fechada: nenhum dos clientes medidos usa as
-- tres. A tela copia daqui para o protocolo novo e o consultor renomeia.
--
-- CORRIGIDO EM 18/09/2026. O conjunto anterior (Acionistas, Conselheiros de
-- Administracao, Diretores) nunca esteve em banco: os DOIS ja tem o padrao da
-- casa semeado como Fundadores, Socios e Socios Gestores (sandbox em 17/09,
-- medido por SELECT), e a tela de copiar usa exatamente esses nomes. O seed
-- velho, que nao casa por nome, inseria tres padroes a mais, e o GATE abaixo,
-- que exige tres, contava seis e abortava a migracao NELA MESMA. Decisao do
-- usuario: o padrao da casa e o que esta nos bancos, os nomes de hoje. Medido
-- no sandbox por SELECT; producao se confirma no momento da aplicacao, e o
-- GATE deste arquivo e quem barrar divergencia la.

INSERT INTO public.protocolo_beneficiario (protocolo_id, nome, ordem)
SELECT NULL, v.nome, v.ordem
FROM (VALUES
  ('Fundadores',       10),
  ('Sócios',           20),
  ('Sócios Gestores',  30)
) AS v(nome, ordem)
WHERE NOT EXISTS (
  SELECT 1 FROM public.protocolo_beneficiario b
  WHERE b.protocolo_id IS NULL
    AND b.excluido = false
    AND lower(btrim(b.nome)) = lower(btrim(v.nome))
);

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
DECLARE
  v_falhas  text[] := '{}';
  v_padroes int;
  v_tabelas text[] := ARRAY[
    'protocolo_remuneracao', 'protocolo_beneficiario',
    'protocolo_linha', 'protocolo_regra'
  ];
BEGIN
  SELECT count(*) INTO v_padroes
  FROM public.protocolo_beneficiario WHERE protocolo_id IS NULL AND excluido = false;

  IF v_padroes <> 3 THEN
    v_falhas := v_falhas || format('esperava 3 beneficiarios padrao e ha %s', v_padroes);
  END IF;

  -- A parte 1 tem de ter rodado antes: sem o catalogo, `protocolo_linha` aponta
  -- para tabela que nao existe e a grade nasce sem linha nenhuma.
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public' AND tablename = 'protocolo_item_governanca'
  ) THEN
    v_falhas := v_falhas || 'a parte 1 (catalogo) nao rodou';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = ANY (v_tabelas)
      AND rowsecurity = false
  ) THEN
    v_falhas := v_falhas || 'RLS nao ficou habilitada em alguma tabela da grade';
  END IF;

  -- Sem os dois gatilhos a grade aceita cruzamento de protocolos diferentes, e o
  -- documento sairia com a regra de outro cliente. Foi exatamente o defeito que
  -- apareceu no Acordo em 16/09.
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_protocolo_regra_beneficiario_do_protocolo' AND NOT tgisinternal
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_protocolo_linha_item_do_cliente' AND NOT tgisinternal
  ) THEN
    v_falhas := v_falhas || 'faltou algum gatilho de coerencia da grade';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'protocolo_regra_uq')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'protocolo_linha_uq')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'protocolo_beneficiario_nome_uq')
     OR NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'protocolo_remuneracao_versao_uq') THEN
    v_falhas := v_falhas || 'faltou algum indice unico da grade';
  END IF;

  IF array_length(v_falhas, 1) > 0 THEN
    RAISE EXCEPTION 'GATE GOV-F parte 2: %', array_to_string(v_falhas, '; ');
  END IF;
END
$$;
