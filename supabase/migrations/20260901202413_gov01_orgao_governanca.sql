-- 20260901202413_gov01_orgao_governanca.sql
-- GOV-01: a tabela de orgaos de governanca por cliente.
--
-- E o cadastro das instancias de decisao de cada cliente. Ele define as COLUNAS
-- da Matriz de Alcadas e o destinatario de cada competencia no contrato social.
-- Nada de governanca existia no banco: `orgao_governanca`, `conselho`, `mandato`,
-- `alcada`, `matriz_alcada` e mais cinco responderam 404 na verificacao de
-- 13/08/2026, e reconferi em 01/09. Esta e a primeira.
--
-- O NOME e o mesmo que o levantamento
-- (`docs/osg/campos-governanca.md`) usou ao procurar se a tabela existia. Manter
-- evita que documento e banco falem linguas diferentes.
--
-- COMO A LISTA SE COMPORTA, confirmado pela analista de governanca em 01/09/2026:
--   - Tres sao padrao interno: Reuniao de Socios, Conselho de Administracao e
--     Diretor Executivo.
--   - O cliente ACRESCENTA os dele, com nome proprio. O caso real citado sao os
--     gerentes, que um cliente gosta de por nas alcadas.
--   - Nem todo cliente tem os tres: alguns nao tem Conselho, so Diretoria.
-- Por isso `nome` e TEXTO LIVRE e nao enum. Enum fecharia a porta errada, como o
-- briefing da tarefa ja alertava.
--
-- POR QUE `entra_no_contrato` EXISTE. Os gerentes aparecem na Matriz e NAO no
-- contrato social. Medido de forma independente no modelo
-- `VF_Contrato Social - Governanca com conselho.docx`: existe "Compete a Reuniao
-- de Socios", "Compete ao Conselho de Administracao" e "Compete a Diretoria", e
-- os gerentes so aparecem como OBJETO ("aprovar a contratacao dos gerentes"),
-- nunca como orgao com competencia. Duas fontes independentes, a medicao e a
-- analista, deram os mesmos tres.
--
-- Hoje o mockup resolve isso com uma lista fixa a parte (`ORGAOS_COM_CLAUSULA`).
-- Lista fixa quebra assim que o cliente inventa um orgao: o gerador nao saberia
-- se escreve clausula para ele. Virando coluna, cada orgao carrega a propria
-- resposta, e o "pronto quando" da tarefa (a Matriz monta as colunas sem lista
-- fixa em codigo) passa a ser alcancavel.
--
-- SEM COLUNA `ambiente`, DE PROPOSITO. A regra da casa esta em
-- `src/lib/ambienteScope.ts`: `cliente` e `contribuinte` carregam a coluna;
-- `org_projects`, `org_tasks` e `ordem_servico` NAO, porque o ambiente delas e o
-- do cliente a que estao ligadas. `orgao_governanca` e do mesmo tipo: pende de
-- `cliente_id`, entao herda. Duplicar a coluna criaria a chance de divergir do
-- cliente e esconder o registro errado.
--
-- OS TRES PADRAO NAO MORAM AQUI. Ficam numa constante do front, e o botao de
-- semear chama o mesmo caminho de criacao de qualquer orgao. Para tres nomes que
-- saem dos modelos de contrato e nao mudam, tabela de referencia seria peso sem
-- retorno: traria migration, RLS e tela para manter. Se um dia a lista virar
-- coisa viva, promove.
--
-- DELETE E SUBLIDER OU ACIMA, e nao "quem criou". Espelha
-- `rls_org_tasks_delete` e evita de proposito a assimetria de
-- `rls_org_projects_delete`, cujo ramo do criador nao tem piso de papel e deixa
-- um team_member apagar o projeto que criou. A exclusao normal e por `excluido`,
-- e o DELETE fisico e excecao.
--
-- Fora de escopo desta migration: o hook de dominio, a tela, o botao de semear e
-- o `types.ts`. Vem em seguida, separados, para validar por partes.
--
-- Reversao: `DROP TABLE public.orgao_governanca;`. A tabela nasce vazia e nao ha
-- dado a preservar.

CREATE TABLE IF NOT EXISTS public.orgao_governanca (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,

  -- Texto livre: o cliente inventa orgao, e os cargos de diretoria variam por
  -- cliente ("Diretor de Sistema de Irrigacao" e um caso real do levantamento).
  nome              text NOT NULL,

  -- Se o orgao recebe clausula de competencia no contrato social. Os tres padrao
  -- nascem true; o que o cliente acrescenta nasce false.
  entra_no_contrato boolean NOT NULL DEFAULT false,

  -- Ordem das colunas na Matriz de Alcadas.
  ordem             integer NOT NULL DEFAULT 0,

  -- Quem encabeca o orgao. Texto livre pelo mesmo motivo de `nome`, e coerente
  -- com `administracao.cargo`, que ja e texto livre hoje.
  cargo_topo        text,

  vigencia_inicio   date,
  vigencia_fim      date,

  excluido          boolean NOT NULL DEFAULT false,

  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  updated_by        uuid,

  -- Vigencia coerente: fim depois do inicio, ou um dos dois ausente.
  CONSTRAINT orgao_governanca_vigencia_ck
    CHECK (vigencia_inicio IS NULL OR vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio),
  -- Nome vazio nao e orgao.
  CONSTRAINT orgao_governanca_nome_ck CHECK (btrim(nome) <> '')
);

COMMENT ON TABLE public.orgao_governanca IS
  'GOV-01: instancias de decisao de cada cliente. Definem as colunas da Matriz de '
  'Alcadas e quem recebe competencia no contrato social. Lista NAO e fixa: tres sao '
  'padrao (Reuniao de Socios, Conselho de Administracao, Diretor Executivo) e o '
  'cliente acrescenta os dele. Ambiente herdado do cliente, como org_tasks.';

COMMENT ON COLUMN public.orgao_governanca.entra_no_contrato IS
  'Se o orgao recebe clausula "Compete a..." no contrato social. Falso no caso real '
  'dos gerentes, que entram na Matriz e ficam fora do contrato.';

-- A leitura normal e "os orgaos ativos de um cliente".
CREATE INDEX IF NOT EXISTS orgao_governanca_cliente_idx
  ON public.orgao_governanca (cliente_id, ordem, nome)
  WHERE excluido = false;

-- O mesmo orgao nao se repete no cliente enquanto estiver ativo. Parcial para nao
-- travar recadastro depois de um soft-delete.
CREATE UNIQUE INDEX IF NOT EXISTS orgao_governanca_nome_uq
  ON public.orgao_governanca (cliente_id, lower(btrim(nome)))
  WHERE excluido = false;

DROP TRIGGER IF EXISTS update_orgao_governanca_updated_at ON public.orgao_governanca;
CREATE TRIGGER update_orgao_governanca_updated_at
  BEFORE UPDATE ON public.orgao_governanca
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.orgao_governanca ENABLE ROW LEVEL SECURITY;

-- Ve quem ve o cliente. `cliente_visivel_para` e a mesma funcao que o resto do
-- portal usa para recorte por cliente e cluster.
DROP POLICY IF EXISTS rls_orgao_governanca_select ON public.orgao_governanca;
CREATE POLICY rls_orgao_governanca_select ON public.orgao_governanca
  FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(cliente_id));

DROP POLICY IF EXISTS rls_orgao_governanca_insert ON public.orgao_governanca;
CREATE POLICY rls_orgao_governanca_insert ON public.orgao_governanca
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS rls_orgao_governanca_update ON public.orgao_governanca;
CREATE POLICY rls_orgao_governanca_update ON public.orgao_governanca
  FOR UPDATE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  )
  WITH CHECK (
    public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

DROP POLICY IF EXISTS rls_orgao_governanca_delete ON public.orgao_governanca;
CREATE POLICY rls_orgao_governanca_delete ON public.orgao_governanca
  FOR DELETE TO authenticated
  USING (
    public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)
    AND public.cliente_visivel_para(cliente_id)
  );

-- GATE: a tabela existe com as colunas combinadas, a RLS esta ligada com as
-- quatro policies, e NAO ha coluna `ambiente` (o ambiente vem do cliente).
DO $$
DECLARE
  v_faltando text;
  v_policies integer;
BEGIN
  IF to_regclass('public.orgao_governanca') IS NULL THEN
    RAISE EXCEPTION 'GATE: orgao_governanca nao foi criada';
  END IF;

  SELECT string_agg(c.nome, ', ') INTO v_faltando
    FROM (VALUES ('cliente_id'),('nome'),('entra_no_contrato'),('ordem'),
                 ('cargo_topo'),('vigencia_inicio'),('vigencia_fim'),('excluido')) AS c(nome)
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='orgao_governanca' AND column_name=c.nome);
  IF v_faltando IS NOT NULL THEN
    RAISE EXCEPTION 'GATE: faltam colunas em orgao_governanca: %', v_faltando;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns
              WHERE table_schema='public' AND table_name='orgao_governanca'
                AND column_name='ambiente') THEN
    RAISE EXCEPTION 'GATE: orgao_governanca nao deve ter coluna ambiente, ela herda do cliente';
  END IF;

  IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.orgao_governanca'::regclass) THEN
    RAISE EXCEPTION 'GATE: RLS nao esta habilitada em orgao_governanca';
  END IF;

  SELECT count(*) INTO v_policies FROM pg_policy
   WHERE polrelid='public.orgao_governanca'::regclass;
  IF v_policies <> 4 THEN
    RAISE EXCEPTION 'GATE: esperava 4 policies em orgao_governanca, achei %', v_policies;
  END IF;
END $$;
