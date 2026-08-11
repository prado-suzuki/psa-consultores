-- =============================================================================
-- Fixture das provas do B10/B11 — recorte do schema que as migrations tocam
-- =============================================================================
-- Não é o banco de produção: é só o pedaço de `public` que
--   20260813120000_pessoa_conjuge_reciproco.sql       e
--   20260813120200_filiacao_derivada_do_parentesco.sql
-- leem ou escrevem — cliente, pessoa, parentesco, o índice `idx_pessoa_conjuge_id`
-- que já existe desde 20260525152456 e o gatilho de `updated_at`. Colunas que não
-- participam de nenhuma propriedade provada aqui ficaram de fora de propósito.
--
-- Os dados entram ANTES das migrations, com os quatro estados que existem hoje em
-- produção: vínculo pela metade, vínculo ambíguo (duas origens para o mesmo
-- parceiro vazio), vínculo contraditório (A→B, B→C) e vínculo já simétrico. Mais
-- o cruzamento entre clientes, que é o que a barreira de tenancy tem que barrar.
-- =============================================================================

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
  id   uuid PRIMARY KEY,
  nome text NOT NULL
);

CREATE TABLE public.pessoa (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id             uuid NOT NULL REFERENCES public.cliente(id),
  tipo_pessoa            text NOT NULL DEFAULT 'PF',
  denominacao            text NOT NULL,
  genero                 text,
  conjuge_id             uuid REFERENCES public.pessoa(id),
  filiacao_pai           text,
  filiacao_pai_pessoa_id uuid REFERENCES public.pessoa(id),
  filiacao_mae           text,
  filiacao_mae_pessoa_id uuid REFERENCES public.pessoa(id),
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

-- O índice que a migration do B10 NÃO cria, porque já existe desde 20260525152456.
CREATE INDEX idx_pessoa_conjuge_id ON public.pessoa (conjuge_id);

CREATE TABLE public.parentesco (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id         uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  parente_pessoa_id uuid NOT NULL REFERENCES public.pessoa(id) ON DELETE CASCADE,
  tipo              text,
  natureza          text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_pessoa_updated_at
  BEFORE UPDATE ON public.pessoa
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ----------------------------------------------------------------------------
-- Dados: dois clientes
-- ----------------------------------------------------------------------------
INSERT INTO public.cliente (id, nome) VALUES
  ('c1000000-0000-4000-8000-000000000001', 'Cliente Um'),
  ('c2000000-0000-4000-8000-000000000002', 'Cliente Dois');

INSERT INTO public.pessoa (id, cliente_id, denominacao, genero, updated_at) VALUES
  ('a0000000-0000-4000-8000-000000000001', 'c1000000-0000-4000-8000-000000000001', 'Meia Ana',      'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000002', 'c1000000-0000-4000-8000-000000000001', 'Meia Bruno',    'M', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000003', 'c1000000-0000-4000-8000-000000000001', 'Ambigua Alice', 'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000004', 'c1000000-0000-4000-8000-000000000001', 'Ambiguo Beto',  'M', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000005', 'c1000000-0000-4000-8000-000000000001', 'Ambigua Clara', 'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000006', 'c1000000-0000-4000-8000-000000000001', 'Triangulo A',   'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000007', 'c1000000-0000-4000-8000-000000000001', 'Triangulo B',   'M', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000008', 'c1000000-0000-4000-8000-000000000001', 'Triangulo C',   'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000009', 'c1000000-0000-4000-8000-000000000001', 'Casada Olivia', 'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-00000000000a', 'c1000000-0000-4000-8000-000000000001', 'Casado Otavio', 'M', '2020-01-01'),
  ('a0000000-0000-4000-8000-00000000000b', 'c1000000-0000-4000-8000-000000000001', 'Livre Um',      'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-00000000000c', 'c1000000-0000-4000-8000-000000000001', 'Livre Dois',    'M', '2020-01-01'),
  ('a0000000-0000-4000-8000-00000000000d', 'c1000000-0000-4000-8000-000000000001', 'Livre Tres',    'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-00000000000e', 'c1000000-0000-4000-8000-000000000001', 'Cruzada Cida',  'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-00000000000f', 'c1000000-0000-4000-8000-000000000001', 'Helena Filha',  'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000010', 'c1000000-0000-4000-8000-000000000001', 'Joaquim Pai',   'M', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000011', 'c1000000-0000-4000-8000-000000000001', 'Marta Mae',     'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000012', 'c1000000-0000-4000-8000-000000000001', 'Tobias Tio',    'M', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000013', 'c1000000-0000-4000-8000-000000000001', 'Legado Lurdes', 'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000014', 'c1000000-0000-4000-8000-000000000001', 'Filha Sem Cad', 'F', '2020-01-01'),
  ('a0000000-0000-4000-8000-000000000015', 'c1000000-0000-4000-8000-000000000001', 'Filha Legada',  'F', '2020-01-01'),
  ('b0000000-0000-4000-8000-000000000001', 'c2000000-0000-4000-8000-000000000002', 'Outra Olga',    'F', '2020-01-01'),
  ('b0000000-0000-4000-8000-000000000002', 'c2000000-0000-4000-8000-000000000002', 'Outro Osmar',   'M', '2020-01-01'),
  ('b0000000-0000-4000-8000-000000000003', 'c2000000-0000-4000-8000-000000000002', 'Outra Odete',   'F', '2020-01-01');

-- ----------------------------------------------------------------------------
-- Estados de cônjuge que existem hoje (escritos depois, por causa da FK cíclica)
-- ----------------------------------------------------------------------------
-- 1. pela metade: Ana aponta Bruno, Bruno não aponta ninguém
UPDATE public.pessoa SET conjuge_id = 'a0000000-0000-4000-8000-000000000002'
 WHERE id = 'a0000000-0000-4000-8000-000000000001';

-- 2. ambíguo: Alice e Clara apontam o mesmo Beto, que está vazio
UPDATE public.pessoa SET conjuge_id = 'a0000000-0000-4000-8000-000000000004'
 WHERE id IN ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000005');

-- 3. contraditório: A→B, B→C
UPDATE public.pessoa SET conjuge_id = 'a0000000-0000-4000-8000-000000000007'
 WHERE id = 'a0000000-0000-4000-8000-000000000006';
UPDATE public.pessoa SET conjuge_id = 'a0000000-0000-4000-8000-000000000008'
 WHERE id = 'a0000000-0000-4000-8000-000000000007';

-- 4. já simétrico
UPDATE public.pessoa SET conjuge_id = 'a0000000-0000-4000-8000-00000000000a'
 WHERE id = 'a0000000-0000-4000-8000-000000000009';
UPDATE public.pessoa SET conjuge_id = 'a0000000-0000-4000-8000-000000000009'
 WHERE id = 'a0000000-0000-4000-8000-00000000000a';

-- 5. cruzamento entre clientes já gravado (legado)
UPDATE public.pessoa SET conjuge_id = 'b0000000-0000-4000-8000-000000000001'
 WHERE id = 'a0000000-0000-4000-8000-00000000000e';

-- 6. casal do outro cliente, que nenhuma escrita do cliente 1 pode encostar
UPDATE public.pessoa SET conjuge_id = 'b0000000-0000-4000-8000-000000000003'
 WHERE id = 'b0000000-0000-4000-8000-000000000002';
UPDATE public.pessoa SET conjuge_id = 'b0000000-0000-4000-8000-000000000002'
 WHERE id = 'b0000000-0000-4000-8000-000000000003';

-- ----------------------------------------------------------------------------
-- Filiação: os vínculos existem, as colunas de `pessoa` ainda não
-- ----------------------------------------------------------------------------
INSERT INTO public.parentesco (pessoa_id, parente_pessoa_id, tipo, natureza, created_at) VALUES
  ('a0000000-0000-4000-8000-00000000000f', 'a0000000-0000-4000-8000-000000000010', 'Pai',     'Consanguíneo', '2020-01-01'),
  ('a0000000-0000-4000-8000-00000000000f', 'a0000000-0000-4000-8000-000000000011', 'Mãe',     'Consanguíneo', '2020-01-02'),
  ('a0000000-0000-4000-8000-00000000000f', 'a0000000-0000-4000-8000-000000000012', 'Tio(a)',  'Consanguíneo', '2020-01-03'),
  -- vínculo legado, do tempo em que "Pai/Mãe" era um tipo só: resolve por gênero
  ('a0000000-0000-4000-8000-000000000015', 'a0000000-0000-4000-8000-000000000013', 'Pai/Mãe', 'Consanguíneo', '2020-01-04');

-- Filiação digitada à mão, para um pai que não tem cadastro de pessoa.
UPDATE public.pessoa SET filiacao_pai = 'Pai Sem Cadastro'
 WHERE id = 'a0000000-0000-4000-8000-000000000014';
