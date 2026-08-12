-- =============================================================================
-- B1 · A identidade da matrícula passa a ser POR CLIENTE
-- =============================================================================
-- DECISÃO DE ESCOPO (Bernardo, sprint 11, bloco B1 de
-- docs/sprints/sprint-11/TAREFA_correcoes-e2e-geracao-contrato.md):
--
--   A matrícula é única POR CLIENTE — UNIQUE (cliente_id, cartorio_id, numero).
--
-- A alternativa (matrícula como entidade compartilhada entre clientes, com
-- vínculo N:N para bem e fluxo de "vincular matrícula existente" na tela) foi
-- AVALIADA E DESCARTADA: ela é uma mudança de produto, não de banco.
--
-- Hoje a unicidade é global — UNIQUE (cartorio_id, numero) — e por isso
-- cadastrar a matrícula 9.617 do 1º Ofício de Lucas do Rio Verde para um novo
-- cliente devolve 23505 e trava o cadastro, porque o par já existe para OUTRO
-- cliente.
--
-- POR QUE ISSO TAMBÉM RESOLVE O ESCOPO DE AMBIENTE, SEM COLUNA `ambiente`:
-- `cliente` já tem `ambiente`. Um cliente de teste em `dev` e um cliente real
-- de produção são linhas diferentes de `cliente`, logo têm `cliente_id`
-- diferente e nunca disputam a mesma chave. Colocar `ambiente` em `matricula`
-- seria uma segunda fonte de verdade para o mesmo fato (e uma que pode
-- divergir do cliente dono). Por isso a coluna nova é `cliente_id`, e só ela.
--
-- MATRÍCULA SEM CLIENTE (`cliente_id IS NULL`):
-- `matricula.bem_id` é anulável (migration 20260526150000), então existe
-- matrícula órfã — e uma órfã sem nenhuma titularidade não tem cliente por
-- cadeia nenhuma. Um índice único que inclua `cliente_id` NULO não impediria
-- duplicata (NULL nunca é igual a NULL). Decisão: essas matrículas formam um
-- pote "não atribuído" e continuam com unicidade GLOBAL entre si, via índice
-- parcial `WHERE cliente_id IS NULL`. Assim nada perde proteção, e o pote
-- nunca bloqueia uma matrícula atribuída (índices parciais disjuntos).
--
-- DERIVA ENTRE REPOSITÓRIO E PRODUÇÃO:
-- o banco respondeu com o nome `matricula_numero_cartorio_unq`, que não existe
-- em migration nenhuma deste repo (aqui o nome é
-- `matricula_cartorio_numero_unique`). Um `DROP CONSTRAINT <nome>` pode não
-- achar o objeto real e deixar a unicidade global de pé. Por isso a derrubada
-- é POR COLUNA, não por nome: o bloco PL/pgSQL varre `pg_constraint` e
-- `pg_index` procurando qualquer constraint única ou índice único cujo
-- conjunto de colunas seja EXATAMENTE (cartorio_id, numero), qualquer que seja
-- o nome. Os dois nomes conhecidos, e qualquer terceiro, ficam cobertos.
--
-- Esta migration não foi aplicada por quem a escreveu (existe um único banco
-- Supabase, e ele é produção). Ela é idempotente, roda dentro de uma transação
-- explícita e falha alto, e não em silêncio, se encontrar dado que não caiba no
-- desenho novo: abortar deixa o banco exatamente como estava.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Coluna `cliente_id` (derivada, anulável)
-- -----------------------------------------------------------------------------
-- Anulável de propósito: matrícula órfã sem titular não tem cliente. FK com
-- ON DELETE SET NULL espelha o que `bem_id` já faz nesta tabela — apagar o dono
-- devolve a matrícula ao pote "não atribuído" em vez de destruí-la.
ALTER TABLE public.matricula ADD COLUMN IF NOT EXISTS cliente_id uuid;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.matricula'::regclass
       AND conname  = 'matricula_cliente_id_fkey'
  ) THEN
    ALTER TABLE public.matricula
      ADD CONSTRAINT matricula_cliente_id_fkey
      FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE SET NULL;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 2. Retro-preenchimento das matrículas já gravadas
-- -----------------------------------------------------------------------------
-- Regra de derivação, na ordem: (a) o cliente do bem, quando há bem vinculado;
-- (b) o cliente do titular mais antigo, para as órfãs. É a mesma ordem que a
-- aplicação já usa para exibir o dono da matrícula (`enrichMatricula` em
-- src/hooks/useDiagnosticoPatrimonial.ts lê `bem.cliente` e cai para
-- `titularidade -> pessoa.cliente`).
--
-- O trigger `trg_set_updated_by` é desligado durante o backfill: ele sobrescreve
-- `updated_by := auth.uid()` (NULL numa migration) e `updated_at := now()` em
-- toda linha tocada, o que apagaria a trilha de quem editou a matrícula por
-- último. Preencher uma coluna derivada não é "alguém editou".
DO $$
DECLARE
  v_tem_trigger boolean;
  v_linhas      bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger
     WHERE tgrelid = 'public.matricula'::regclass
       AND tgname  = 'trg_set_updated_by'
       AND NOT tgisinternal
  ) INTO v_tem_trigger;

  IF v_tem_trigger THEN
    ALTER TABLE public.matricula DISABLE TRIGGER trg_set_updated_by;
  END IF;

  UPDATE public.matricula m
     SET cliente_id = d.cliente_id
    FROM (
      SELECT m2.id,
             COALESCE(
               b.cliente_id,
               (SELECT p.cliente_id
                  FROM public.titularidade t
                  JOIN public.pessoa p ON p.id = t.titular_pessoa_id
                 WHERE t.matricula_id = m2.id
                 ORDER BY t.created_at NULLS LAST, t.id
                 LIMIT 1)
             ) AS cliente_id
        FROM public.matricula m2
        LEFT JOIN public.bem b ON b.id = m2.bem_id
    ) d
   WHERE d.id = m.id
     AND d.cliente_id IS NOT NULL
     AND m.cliente_id IS DISTINCT FROM d.cliente_id;

  GET DIAGNOSTICS v_linhas = ROW_COUNT;
  RAISE NOTICE 'B1: cliente_id preenchido em % matrícula(s).', v_linhas;

  IF v_tem_trigger THEN
    ALTER TABLE public.matricula ENABLE TRIGGER trg_set_updated_by;
  END IF;
END $$;

-- Aviso (não bloqueia): matrícula órfã com titulares de mais de um cliente.
-- Ficou com o cliente do titular mais antigo; se o negócio disser outra coisa,
-- é ajuste manual de dado, não de schema.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT m.id, m.numero, count(DISTINCT p.cliente_id) AS clientes
      FROM public.matricula m
      JOIN public.titularidade t ON t.matricula_id = m.id
      JOIN public.pessoa p       ON p.id = t.titular_pessoa_id
     WHERE m.bem_id IS NULL
     GROUP BY m.id, m.numero
    HAVING count(DISTINCT p.cliente_id) > 1
  LOOP
    RAISE NOTICE 'B1: matrícula % (id %) tem titulares de % clientes; atribuída ao cliente do titular mais antigo.',
      r.numero, r.id, r.clientes;
  END LOOP;
END $$;

-- Matrículas que sobraram sem cliente: sem bem e sem titular. Continuam no pote
-- "não atribuído", com unicidade global entre si.
DO $$
DECLARE v_orfas bigint;
BEGIN
  SELECT count(*) INTO v_orfas FROM public.matricula WHERE cliente_id IS NULL;
  IF v_orfas > 0 THEN
    RAISE NOTICE 'B1: % matrícula(s) sem cliente (sem bem e sem titular) seguem com unicidade global entre si.', v_orfas;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 3. Checagem de duplicatas ANTES de criar o índice
-- -----------------------------------------------------------------------------
-- Em tese não pode haver duplicata: a chave nova (cliente_id, cartorio_id,
-- numero) é estritamente mais fraca que a global (cartorio_id, numero) que
-- vigora hoje — se o par já era único no banco inteiro, a tripla é única por
-- construção. Mas justamente por causa da deriva de nome não dá para afirmar,
-- sem olhar o banco, que a constraint global está mesmo lá e sempre esteve
-- (a migration 20260602190000 copiou matrículas com o MESMO `numero` e o MESMO
-- `cartorio_id` para um cliente de dev, o que só passa se em algum momento a
-- unicidade global não estava valendo).
--
-- Então a checagem é explícita e vem ANTES de qualquer destruição: se houver
-- duplicata, a migration aborta com a lista das linhas ofensoras e NADA é
-- alterado (DDL do Postgres é transacional). O Lovable vê a lista na saída,
-- em vez de um "could not create unique index" seco. `GROUP BY` trata NULL
-- como igual, então esta única checagem cobre os dois índices — o dos
-- atribuídos e o do pote sem cliente.
DO $$
DECLARE v_dups text;
BEGIN
  SELECT string_agg(
           format('cliente=%s cartorio=%s numero=%L (%s linhas)',
                  COALESCE(d.cliente_id::text, 'SEM CLIENTE'), d.cartorio_id, d.numero, d.n),
           E'\n' ORDER BY d.n DESC)
    INTO v_dups
    FROM (
      SELECT cliente_id, cartorio_id, numero, count(*) AS n
        FROM public.matricula
       GROUP BY cliente_id, cartorio_id, numero
      HAVING count(*) > 1
    ) d;

  IF v_dups IS NOT NULL THEN
    RAISE EXCEPTION E'B1: não dá para criar a unicidade por cliente — já existem matrículas duplicadas dentro do mesmo cliente. Resolva os casos abaixo (mesclar ou excluir) e rode a migration de novo:\n%', v_dups;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. Os índices novos (criados ANTES de derrubar o antigo)
-- -----------------------------------------------------------------------------
-- Nesta ordem a tabela nunca fica um instante sem proteção contra duplicata.
CREATE UNIQUE INDEX IF NOT EXISTS matricula_cliente_cartorio_numero_uk
  ON public.matricula (cliente_id, cartorio_id, numero)
  WHERE cliente_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS matricula_sem_cliente_cartorio_numero_uk
  ON public.matricula (cartorio_id, numero)
  WHERE cliente_id IS NULL;

-- -----------------------------------------------------------------------------
-- 5. Derrubar a unicidade global — por COLUNA, não por nome
-- -----------------------------------------------------------------------------
-- Varre pg_constraint e pg_index atrás de qualquer objeto único cujo conjunto
-- de colunas seja exatamente {cartorio_id, numero}, sem predicado e sem
-- expressão. Cobre `matricula_cartorio_numero_unique` (nome do repo),
-- `matricula_numero_cartorio_unq` (nome que produção devolveu no erro) e
-- qualquer outro que exista. Os dois índices do passo 4 estão fora do alvo:
-- um tem três colunas, o outro tem predicado — e ainda assim são excluídos
-- pelo nome, por segurança.
DO $$
DECLARE
  v_alvo smallint[];
  r      record;
BEGIN
  SELECT array(SELECT a.attnum::smallint
                 FROM pg_attribute a
                WHERE a.attrelid = 'public.matricula'::regclass
                  AND a.attname IN ('cartorio_id', 'numero')
                  AND NOT a.attisdropped
                ORDER BY a.attnum)
    INTO v_alvo;

  IF array_length(v_alvo, 1) <> 2 THEN
    RAISE EXCEPTION 'B1: não achei as colunas cartorio_id/numero em public.matricula.';
  END IF;

  -- 5a. constraints únicas
  FOR r IN
    SELECT c.conname
      FROM pg_constraint c
     WHERE c.conrelid = 'public.matricula'::regclass
       AND c.contype  = 'u'
       AND (SELECT array(SELECT unnest(c.conkey) ORDER BY 1)) = v_alvo
  LOOP
    RAISE NOTICE 'B1: derrubando constraint única global %.', r.conname;
    EXECUTE format('ALTER TABLE public.matricula DROP CONSTRAINT %I', r.conname);
  END LOOP;

  -- 5b. índices únicos soltos (sem constraint por trás)
  FOR r IN
    SELECT ci.relname
      FROM pg_index i
      JOIN pg_class ci ON ci.oid = i.indexrelid
     WHERE i.indrelid    = 'public.matricula'::regclass
       AND i.indisunique
       AND i.indnatts    = 2
       AND i.indnkeyatts = 2
       AND i.indpred   IS NULL
       AND i.indexprs  IS NULL
       AND ci.relname NOT IN ('matricula_cliente_cartorio_numero_uk',
                              'matricula_sem_cliente_cartorio_numero_uk')
       AND (SELECT array(SELECT unnest(string_to_array(i.indkey::text, ' ')::smallint[]) ORDER BY 1)) = v_alvo
  LOOP
    RAISE NOTICE 'B1: derrubando índice único global %.', r.relname;
    EXECUTE format('DROP INDEX public.%I', r.relname);
  END LOOP;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Quem preenche `cliente_id` daqui para a frente
-- -----------------------------------------------------------------------------
-- Regra: o bem manda. Havendo bem vinculado, o cliente da matrícula é o do bem
-- (mover a matrícula de bem move o dono junto). Sem bem, vale o cliente já
-- gravado — que a RPC/o trigger de titularidade colocou lá — e ele sobrevive à
-- desvinculação do bem (`bem_id := NULL`), que é o caso de "devolver a matrícula
-- ao estado órfã" sem perder a quem ela pertence.
--
-- SECURITY DEFINER porque o trigger precisa enxergar `bem`/`pessoa` mesmo
-- quando a RLS do usuário chamador não alcança a linha; ele só lê `cliente_id`.
CREATE OR REPLACE FUNCTION public.matricula_definir_cliente()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_cliente uuid;
BEGIN
  IF NEW.bem_id IS NOT NULL THEN
    SELECT b.cliente_id INTO v_cliente FROM public.bem b WHERE b.id = NEW.bem_id;
    NEW.cliente_id := v_cliente;
    RETURN NEW;
  END IF;

  IF NEW.cliente_id IS NULL THEN
    SELECT p.cliente_id INTO v_cliente
      FROM public.titularidade t
      JOIN public.pessoa p ON p.id = t.titular_pessoa_id
     WHERE t.matricula_id = NEW.id
     ORDER BY t.created_at NULLS LAST, t.id
     LIMIT 1;
    NEW.cliente_id := v_cliente;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matricula_definir_cliente ON public.matricula;
CREATE TRIGGER trg_matricula_definir_cliente
  BEFORE INSERT OR UPDATE ON public.matricula
  FOR EACH ROW EXECUTE FUNCTION public.matricula_definir_cliente();

-- A matrícula órfã ganha dono quando ganha o primeiro titular. Só preenche
-- quando está sem cliente: adicionar um segundo titular (de outro cliente, num
-- condomínio) não muda o dono já definido.
CREATE OR REPLACE FUNCTION public.titularidade_definir_cliente_da_matricula()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.matricula_id IS NOT NULL THEN
    UPDATE public.matricula m
       SET cliente_id = (SELECT p.cliente_id FROM public.pessoa p WHERE p.id = NEW.titular_pessoa_id)
     WHERE m.id = NEW.matricula_id
       AND m.cliente_id IS NULL;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_titularidade_definir_cliente_da_matricula ON public.titularidade;
CREATE TRIGGER trg_titularidade_definir_cliente_da_matricula
  AFTER INSERT ON public.titularidade
  FOR EACH ROW EXECUTE FUNCTION public.titularidade_definir_cliente_da_matricula();

-- -----------------------------------------------------------------------------
-- 7. A RPC de criação resolve o cliente ANTES de inserir
-- -----------------------------------------------------------------------------
-- `criar_matricula_com_titular` insere a matrícula e só depois a titularidade.
-- Se o cliente só chegasse pelo trigger de titularidade, a matrícula existiria
-- por um instante com `cliente_id NULL` — ou seja, dentro do pote de unicidade
-- GLOBAL, que é exatamente o bug B1 voltando pela porta dos fundos. Então a RPC
-- resolve o cliente na entrada (do bem, se houver; senão do titular) e insere
-- já atribuída. A checagem de duplicidade passa a valer no INSERT, com o escopo
-- certo, e a violação continua chegando ao cliente como 23505 — a mensagem
-- amigável da UI não muda.
--
-- Assinatura, retorno e permissões idênticos aos da versão anterior
-- (20260526160000): nenhum arquivo TypeScript precisa mudar.
CREATE OR REPLACE FUNCTION public.criar_matricula_com_titular(
  matricula_data jsonb,
  titular_data jsonb
)
RETURNS public.matricula
LANGUAGE plpgsql
-- SECURITY INVOKER (padrão): as RLS de matricula/titularidade são aplicadas
-- ao usuário chamador (team_member+).
AS $$
DECLARE
  v_matricula      public.matricula;
  v_titular_pessoa uuid;
  v_bem_id         uuid;
  v_cliente_id     uuid;
BEGIN
  IF titular_data IS NULL OR (titular_data->>'titular_pessoa_id') IS NULL THEN
    RAISE EXCEPTION 'Titular é obrigatório para cadastrar uma matrícula';
  END IF;

  v_titular_pessoa := (titular_data->>'titular_pessoa_id')::uuid;
  v_bem_id         := NULLIF(matricula_data->>'bem_id', '')::uuid;

  -- Helpers SECURITY DEFINER (20260706200143): leem o dono sem depender da RLS
  -- do chamador enxergar a linha.
  v_cliente_id := COALESCE(
    public.cliente_id_de_bem(v_bem_id),
    public.cliente_id_de_pessoa(v_titular_pessoa)
  );

  IF v_cliente_id IS NULL THEN
    RAISE EXCEPTION 'Não foi possível determinar o cliente da matrícula a partir do titular informado';
  END IF;

  INSERT INTO public.matricula
  SELECT (jsonb_populate_record(
    NULL::public.matricula,
    matricula_data || jsonb_build_object(
      'id', gen_random_uuid(),
      'cliente_id', v_cliente_id,
      'created_at', now(),
      'updated_at', now(),
      'created_by', auth.uid(),
      'updated_by', NULL
    )
  )).*
  RETURNING * INTO v_matricula;

  INSERT INTO public.titularidade (matricula_id, titular_pessoa_id, tipo, fracao, created_by)
  VALUES (
    v_matricula.id,
    v_titular_pessoa,
    COALESCE(titular_data->>'tipo', 'DIREITO'),
    NULLIF(titular_data->>'fracao', '')::numeric,
    auth.uid()
  );

  RETURN v_matricula;
END;
$$;

GRANT EXECUTE ON FUNCTION public.criar_matricula_com_titular(jsonb, jsonb) TO authenticated;

-- -----------------------------------------------------------------------------
-- 8. RLS: a policy de leitura passa a enxergar o dono pela coluna nova
-- -----------------------------------------------------------------------------
-- A policy de SELECT (20260706200143) derivava o dono só pelo bem
-- (`cliente_visivel_para(cliente_id_de_bem(bem_id))`), o que deixa toda
-- matrícula órfã invisível para quem não é admin — inclusive a que o próprio
-- usuário acabou de criar, o que quebra o `RETURNING *` da RPC. Com o dono
-- agora gravado na linha, a policy passa a usá-lo, caindo para o bem quando a
-- coluna ainda estiver vazia. Continua sendo visibilidade por cluster do
-- cliente: não amplia para fora do dono, só deixa de perder o dono no caminho.
CREATE OR REPLACE FUNCTION public.cliente_id_de_matricula(_matricula_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(m.cliente_id, b.cliente_id)
    FROM public.matricula m
    LEFT JOIN public.bem b ON b.id = m.bem_id
   WHERE m.id = _matricula_id;
$$;

DROP POLICY IF EXISTS osg_cluster_select_matricula ON public.matricula;
CREATE POLICY osg_cluster_select_matricula ON public.matricula FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(COALESCE(cliente_id, public.cliente_id_de_bem(bem_id))));

ALTER TABLE public.matricula ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- 9. Documentação no próprio schema
-- -----------------------------------------------------------------------------
COMMENT ON COLUMN public.matricula.cliente_id IS
  'Cliente dono da matrícula. Derivado por trigger: bem.cliente_id quando há bem vinculado; senão o cliente do primeiro titular. NULL = matrícula não atribuída (sem bem e sem titular). Entra na chave de unicidade (cliente_id, cartorio_id, numero).';

COMMENT ON INDEX public.matricula_cliente_cartorio_numero_uk IS
  'B1: o número da matrícula é único por cliente + cartório. Dois clientes podem ter a mesma matrícula (condomínio, espólio, permuta, desmembramento) e ambientes dev/prod nunca disputam chave, porque são clientes diferentes.';

COMMENT ON INDEX public.matricula_sem_cliente_cartorio_numero_uk IS
  'B1: matrículas ainda não atribuídas a um cliente seguem com unicidade global entre si.';

COMMIT;
