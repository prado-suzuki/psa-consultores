-- =============================================================================
-- Fixture da prova do B1 — schema mínimo e fiel ao que a migration toca
-- =============================================================================
-- Não é o banco de produção: é o recorte de `public` que a migration
-- 20260813010000_matricula_identidade_por_cliente.sql lê ou escreve — cliente,
-- cartorio, pessoa, bem, matricula, titularidade, os helpers SECURITY DEFINER,
-- o trigger `trg_set_updated_by` e a policy de SELECT da matrícula. As colunas
-- que não participam da identidade da matrícula ficaram de fora de propósito:
-- nenhuma propriedade provada aqui depende delas.
--
-- A unicidade global entra DE PROPÓSITO com os DOIS nomes vistos no mundo real:
--   * `matricula_numero_cartorio_unq`      — nome que o banco de produção
--                                            devolveu no erro 23505 do e2e;
--   * `matricula_cartorio_numero_unique`   — nome que existe nas migrations do
--                                            repo (aqui como índice solto).
-- É assim que a prova cobre a deriva: se a migration derrubasse por nome, um
-- dos dois sobreviveria e o teste de aceite falharia.
-- =============================================================================

-- Papéis que o Supabase já traz e que a migration referencia (GRANT/POLICY).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

-- auth.uid() do Supabase, aqui alimentado por uma variável de sessão.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT NULLIF(current_setting('app.uid', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION public.afirma(condicao boolean, descricao text)
RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF condicao IS NOT TRUE THEN
    RAISE EXCEPTION 'FALHOU: %', descricao;
  END IF;
  RAISE NOTICE 'ok · %', descricao;
END;
$$;

-- ----------------------------------------------------------------------------
-- Tabelas
-- ----------------------------------------------------------------------------
CREATE TABLE public.cliente (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome      text NOT NULL,
  ambiente  text NOT NULL DEFAULT 'prod',
  excluido  boolean NOT NULL DEFAULT false
);

CREATE TABLE public.cartorio (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_completo text NOT NULL,
  comarca       text,
  uf            text,
  updated_at    timestamptz NOT NULL DEFAULT now(),
  updated_by    uuid
);

CREATE TABLE public.pessoa (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id  uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
  denominacao text NOT NULL,
  tipo_pessoa text NOT NULL DEFAULT 'PF'
);

CREATE TABLE public.bem (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id    uuid NOT NULL REFERENCES public.cliente(id) ON DELETE CASCADE,
  denominacao   text NOT NULL,
  referencia_dp text NOT NULL,
  tipo_bem      text NOT NULL DEFAULT 'IMOVEL_RURAL'
);

CREATE TABLE public.matricula (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bem_id                uuid REFERENCES public.bem(id) ON DELETE SET NULL,
  cartorio_id           uuid NOT NULL REFERENCES public.cartorio(id),
  matricula_anterior_id uuid REFERENCES public.matricula(id),
  numero                text NOT NULL,
  municipio_imovel      text NOT NULL DEFAULT 'Lucas do Rio Verde',
  uf_imovel             text NOT NULL DEFAULT 'MT',
  area_documento        numeric NOT NULL DEFAULT 0,
  area_unidade          text NOT NULL DEFAULT 'ha',
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now(),
  created_by            uuid,
  updated_by            uuid
);

CREATE TABLE public.titularidade (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  matricula_id      uuid REFERENCES public.matricula(id) ON DELETE CASCADE,
  bem_id            uuid REFERENCES public.bem(id) ON DELETE CASCADE,
  titular_pessoa_id uuid NOT NULL REFERENCES public.pessoa(id),
  tipo              text NOT NULL DEFAULT 'DIREITO',
  fracao            numeric,
  integralizador    boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid,
  updated_by        uuid
);

-- ----------------------------------------------------------------------------
-- A unicidade global de hoje, com os dois nomes da deriva
-- ----------------------------------------------------------------------------
ALTER TABLE public.matricula
  ADD CONSTRAINT matricula_numero_cartorio_unq UNIQUE (cartorio_id, numero);

CREATE UNIQUE INDEX matricula_cartorio_numero_unique
  ON public.matricula (cartorio_id, numero);

-- ----------------------------------------------------------------------------
-- Trigger de auditoria de coluna (20260526135628) — é ele que a migration
-- precisa desligar durante o backfill para não apagar `updated_by`.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.matricula
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();
CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.titularidade
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();

-- ----------------------------------------------------------------------------
-- Helpers e RLS (20260706200143), no estado anterior à migration
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cliente_visivel_para(_cliente_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _cliente_id IS NOT NULL;  -- stub: cluster não é o objeto desta prova
$$;

CREATE OR REPLACE FUNCTION public.cliente_id_de_pessoa(_pessoa_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cliente_id FROM public.pessoa WHERE id = _pessoa_id;
$$;

CREATE OR REPLACE FUNCTION public.cliente_id_de_bem(_bem_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cliente_id FROM public.bem WHERE id = _bem_id;
$$;

CREATE OR REPLACE FUNCTION public.cliente_id_de_matricula(_matricula_id uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.cliente_id FROM public.matricula m JOIN public.bem b ON b.id = m.bem_id WHERE m.id = _matricula_id;
$$;

ALTER TABLE public.matricula ENABLE ROW LEVEL SECURITY;
CREATE POLICY osg_cluster_select_matricula ON public.matricula FOR SELECT TO authenticated
  USING (public.cliente_visivel_para(public.cliente_id_de_bem(bem_id)));

-- ----------------------------------------------------------------------------
-- A RPC de criação, na versão anterior à migration (20260526160000)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.criar_matricula_com_titular(
  matricula_data jsonb,
  titular_data jsonb
)
RETURNS public.matricula
LANGUAGE plpgsql
AS $$
DECLARE
  v_matricula public.matricula;
BEGIN
  IF titular_data IS NULL OR (titular_data->>'titular_pessoa_id') IS NULL THEN
    RAISE EXCEPTION 'Titular é obrigatório para cadastrar uma matrícula';
  END IF;

  INSERT INTO public.matricula
  SELECT (jsonb_populate_record(
    NULL::public.matricula,
    matricula_data || jsonb_build_object(
      'id', gen_random_uuid(),
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
    (titular_data->>'titular_pessoa_id')::uuid,
    COALESCE(titular_data->>'tipo', 'DIREITO'),
    NULLIF(titular_data->>'fracao', '')::numeric,
    auth.uid()
  );

  RETURN v_matricula;
END;
$$;

-- ----------------------------------------------------------------------------
-- Dados: o caso do e2e. Cliente A já tem a 9.617 no 1º Ofício de Lucas do Rio
-- Verde; o cliente B (outro cliente real) e o cliente C (cliente de teste em
-- `dev`) são os que hoje esbarram na unicidade global.
-- ----------------------------------------------------------------------------
INSERT INTO public.cliente (id, nome, ambiente) VALUES
  ('aaaaaaaa-0000-4000-8000-000000000001', 'Cliente A (prod)', 'prod'),
  ('bbbbbbbb-0000-4000-8000-000000000002', 'Cliente B (prod)', 'prod'),
  ('cccccccc-0000-4000-8000-000000000003', 'Cliente C (dev)',  'dev');

INSERT INTO public.cartorio (id, nome_completo, comarca, uf) VALUES
  ('11111111-0000-4000-8000-000000000001', '1º Ofício de Lucas do Rio Verde', 'Lucas do Rio Verde', 'MT');

INSERT INTO public.pessoa (id, cliente_id, denominacao) VALUES
  ('a0000000-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-000000000001', 'Titular do A'),
  ('b0000000-0000-4000-8000-00000000000b', 'bbbbbbbb-0000-4000-8000-000000000002', 'Titular do B'),
  ('c0000000-0000-4000-8000-00000000000c', 'cccccccc-0000-4000-8000-000000000003', 'Titular do C');

INSERT INTO public.bem (id, cliente_id, denominacao, referencia_dp) VALUES
  ('a1111111-0000-4000-8000-00000000000a', 'aaaaaaaa-0000-4000-8000-000000000001', 'Fazenda do A', 'DP-01'),
  ('b1111111-0000-4000-8000-00000000000b', 'bbbbbbbb-0000-4000-8000-000000000002', 'Fazenda do B', 'DP-02');

-- m1: com bem — o cliente vem pelo bem. `updated_by`/`updated_at` marcados para
-- provar que o backfill não pisa na trilha de auditoria.
INSERT INTO public.matricula (id, bem_id, cartorio_id, numero, updated_at, updated_by) VALUES
  ('e0000000-0000-4000-8000-000000000001',
   'a1111111-0000-4000-8000-00000000000a',
   '11111111-0000-4000-8000-000000000001',
   '9.617',
   '2020-01-01 00:00:00+00',
   'dddddddd-0000-4000-8000-00000000000d');

-- m2: órfã com titular — o cliente só existe por titularidade -> pessoa.
INSERT INTO public.matricula (id, bem_id, cartorio_id, numero) VALUES
  ('e0000000-0000-4000-8000-000000000002', NULL, '11111111-0000-4000-8000-000000000001', '1.234');
INSERT INTO public.titularidade (matricula_id, titular_pessoa_id) VALUES
  ('e0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-00000000000b');

-- m3: órfã sem titular nenhum — fica no pote "não atribuído".
INSERT INTO public.matricula (id, bem_id, cartorio_id, numero) VALUES
  ('e0000000-0000-4000-8000-000000000003', NULL, '11111111-0000-4000-8000-000000000001', '5.555');
