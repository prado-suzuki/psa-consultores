BEGIN;

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

DO $$
DECLARE v_orfas bigint;
BEGIN
  SELECT count(*) INTO v_orfas FROM public.matricula WHERE cliente_id IS NULL;
  IF v_orfas > 0 THEN
    RAISE NOTICE 'B1: % matrícula(s) sem cliente (sem bem e sem titular) seguem com unicidade global entre si.', v_orfas;
  END IF;
END $$;

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

CREATE UNIQUE INDEX IF NOT EXISTS matricula_cliente_cartorio_numero_uk
  ON public.matricula (cliente_id, cartorio_id, numero)
  WHERE cliente_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS matricula_sem_cliente_cartorio_numero_uk
  ON public.matricula (cartorio_id, numero)
  WHERE cliente_id IS NULL;

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

CREATE OR REPLACE FUNCTION public.criar_matricula_com_titular(
  matricula_data jsonb,
  titular_data jsonb
)
RETURNS public.matricula
LANGUAGE plpgsql
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

COMMENT ON COLUMN public.matricula.cliente_id IS
  'Cliente dono da matrícula. Derivado por trigger: bem.cliente_id quando há bem vinculado; senão o cliente do primeiro titular. NULL = matrícula não atribuída (sem bem e sem titular). Entra na chave de unicidade (cliente_id, cartorio_id, numero).';

COMMENT ON INDEX public.matricula_cliente_cartorio_numero_uk IS
  'B1: o número da matrícula é único por cliente + cartório. Dois clientes podem ter a mesma matrícula (condomínio, espólio, permuta, desmembramento) e ambientes dev/prod nunca disputam chave, porque são clientes diferentes.';

COMMENT ON INDEX public.matricula_sem_cliente_cartorio_numero_uk IS
  'B1: matrículas ainda não atribuídas a um cliente seguem com unicidade global entre si.';

COMMIT;