-- =============================================================================
-- Fixture da prova da GES-01B — o recorte de schema que as funcoes leem
-- =============================================================================
-- Nao e o banco de producao nem o sandbox: e o minimo de `public` que as funcoes
-- da migration 20260921110500_ges01b_escada_do_gestor_e_projeto.sql consultam.
--
-- O QUE ENTROU, e por que cada um:
--   cliente              o recorte por ambiente le `cliente.ambiente`
--   profiles             o nome do responsavel entra no corpo do aviso
--   estrutura_equipes    de onde sai o gestor, via org_projects.equipe_id
--   org_projects         a tarefa so e elegivel se pendurada num projeto
--   org_tasks            o alvo, com status, dono, revisor e created_at
--   audit_logs           a fonte da movimentacao relevante, com changed_fields
--   org_comments         comentario e interacao de revisao contam como movimento
--   org_task_comments    a outra tabela de comentario, que tambem conta
--
-- O QUE FICOU DE FORA, de proposito: `notificacao`, `notificacao_envio` e as RPC
-- de envio. Esta prova e da FRONTEIRA, ou seja de quem entra na fila e com que
-- data; quem escreve o aviso e a `alertar_*`, que a migration cria mas esta
-- prova nao chama. As funcoes plpgsql sao criadas sem validar o corpo, entao a
-- ausencia dessas tabelas nao impede a migration de rodar.
--
-- pg_cron tambem nao entra: o bloco de agendamento da migration checa
-- `pg_extension` e sai com NOTICE quando a extensao falta, que e o caminho que
-- este Postgres descartavel percorre.
-- =============================================================================

-- Papeis que o Supabase traz e que a migration referencia nos REVOKE.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;

-- auth.uid() do Supabase. Nulo aqui: a guarda de papel das `alertar_*` so morde
-- quando ha usuario logado, e esta prova nao chama as `alertar_*`.
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
-- Tipos
-- ----------------------------------------------------------------------------

-- Os sete valores, na ordem do enum de producao. A ordem importa para o
-- `NOT IN`: se alguem trocar um valor de nome, a prova quebra aqui e nao em
-- silencio na regra.
CREATE TYPE public.fiscal_task_status AS ENUM (
  'backlog', 'waiting_client', 'todo', 'in_progress', 'review', 'em_ajuste', 'done'
);

-- So os valores que esta frente usa; producao tem dezoito.
CREATE TYPE public.notificacao_tipo AS ENUM ('tarefa_inativa', 'projeto_inativo');

CREATE TYPE public.app_role AS ENUM ('membro', 'sublider', 'lider', 'admin');

-- ----------------------------------------------------------------------------
-- Tabelas
-- ----------------------------------------------------------------------------

CREATE TABLE public.cliente (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome     text NOT NULL,
  ambiente text
);

CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text,
  last_name  text,
  email      text
);

CREATE TABLE public.estrutura_equipes (
  id        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name      text NOT NULL,
  area_id   uuid,
  gestor_id uuid REFERENCES public.profiles(id)
);

CREATE TABLE public.org_projects (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                text NOT NULL,
  equipe_id           uuid REFERENCES public.estrutura_equipes(id),
  external_client_id  uuid REFERENCES public.cliente(id)
);

CREATE TABLE public.org_tasks (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title          text NOT NULL,
  project_id     uuid NOT NULL REFERENCES public.org_projects(id),
  status         public.fiscal_task_status NOT NULL DEFAULT 'todo',
  assigned_to    uuid REFERENCES public.profiles(id),
  reviewer_id    uuid REFERENCES public.profiles(id),
  client_id      uuid REFERENCES public.cliente(id),
  parent_task_id uuid REFERENCES public.org_tasks(id),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.audit_logs (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  area           text NOT NULL,
  entity_type    text NOT NULL,
  entity_id      uuid NOT NULL,
  entity_name    text,
  action         text NOT NULL,
  changed_fields jsonb,
  performed_by   uuid NOT NULL,
  performed_at   timestamptz NOT NULL DEFAULT now(),
  details        jsonb
);

CREATE TABLE public.org_comments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type text NOT NULL,
  entity_id   uuid NOT NULL,
  kind        text,
  body        text,
  author_id   uuid,
  excluido    boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.org_task_comments (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id    uuid NOT NULL REFERENCES public.org_tasks(id),
  comment    text,
  is_system  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Dado da prova
-- ----------------------------------------------------------------------------
-- As datas sao RELATIVAS a `now()`, e nao fixas: a prova mede fronteira em dias,
-- entao data fixa a estragaria no dia seguinte.
--
-- O gestor e o dono sao pessoas DIFERENTES de proposito. Com a mesma pessoa nos
-- dois papeis, o `DISTINCT ON (tarefa, destinatario)` da funcao guardaria uma
-- linha so e a prova da escada nao veria a linha do gestor.

INSERT INTO public.profiles (id, first_name, last_name, email) VALUES
  ('11111111-0000-4000-8000-000000000001', 'Dona',   'da Bola',  'dona@teste'),
  ('11111111-0000-4000-8000-000000000002', 'Gestor', 'da Equipe','gestor@teste');

INSERT INTO public.estrutura_equipes (id, name, gestor_id) VALUES
  ('22222222-0000-4000-8000-000000000001', 'Equipe da prova',
   '11111111-0000-4000-8000-000000000002');

INSERT INTO public.org_projects (id, name, equipe_id) VALUES
  ('33333333-0000-4000-8000-000000000001', 'Projeto das tarefas',
   '22222222-0000-4000-8000-000000000001'),
  ('33333333-0000-4000-8000-000000000002', 'Projeto de 29 dias',
   '22222222-0000-4000-8000-000000000001');

INSERT INTO public.org_tasks (id, title, project_id, status, assigned_to, created_at) VALUES
  ('44444444-0000-4000-8000-000000000015', '15 dias',  '33333333-0000-4000-8000-000000000001', 'todo',           '11111111-0000-4000-8000-000000000001', now() - interval '15 days'),
  ('44444444-0000-4000-8000-000000000014', '14 dias',  '33333333-0000-4000-8000-000000000001', 'todo',           '11111111-0000-4000-8000-000000000001', now() - interval '14 days'),
  ('44444444-0000-4000-8000-000000000021', '21 dias',  '33333333-0000-4000-8000-000000000001', 'todo',           '11111111-0000-4000-8000-000000000001', now() - interval '21 days'),
  ('44444444-0000-4000-8000-000000000022', '22 dias',  '33333333-0000-4000-8000-000000000001', 'todo',           '11111111-0000-4000-8000-000000000001', now() - interval '22 days'),
  ('44444444-0000-4000-8000-000000000031', 'esperando o cliente', '33333333-0000-4000-8000-000000000001', 'waiting_client', '11111111-0000-4000-8000-000000000001', now() - interval '40 days'),
  ('44444444-0000-4000-8000-000000000032', 'concluida','33333333-0000-4000-8000-000000000001', 'done',           '11111111-0000-4000-8000-000000000001', now() - interval '40 days'),
  ('44444444-0000-4000-8000-000000000033', 'backlog',  '33333333-0000-4000-8000-000000000001', 'backlog',        '11111111-0000-4000-8000-000000000001', now() - interval '40 days'),
  ('44444444-0000-4000-8000-000000000041', 'cadastral de ontem',  '33333333-0000-4000-8000-000000000001', 'todo', '11111111-0000-4000-8000-000000000001', now() - interval '90 days'),
  ('44444444-0000-4000-8000-000000000042', 'comentada ha 2 dias', '33333333-0000-4000-8000-000000000001', 'todo', '11111111-0000-4000-8000-000000000001', now() - interval '90 days'),
  ('44444444-0000-4000-8000-000000000043', 'comentario de sistema','33333333-0000-4000-8000-000000000001','todo', '11111111-0000-4000-8000-000000000001', now() - interval '90 days'),
  ('44444444-0000-4000-8000-000000000051', 'do projeto de 29 dias','33333333-0000-4000-8000-000000000002','todo', '11111111-0000-4000-8000-000000000001', now() - interval '29 days');

-- A tarefa 41 e o coracao da decisao de 21/09: o status mudou ha 30 dias, e o
-- TITULO mudou ontem. A alteracao cadastral nao pode reiniciar a contagem.
INSERT INTO public.audit_logs (area, entity_type, entity_id, action, changed_fields, performed_by, performed_at) VALUES
  ('tax', 'task', '44444444-0000-4000-8000-000000000041', 'updated',
   '{"status": {"old": "todo", "new": "in_progress"}}'::jsonb,
   '11111111-0000-4000-8000-000000000001', now() - interval '30 days'),
  ('tax', 'task', '44444444-0000-4000-8000-000000000041', 'updated',
   '{"title": {"old": "a", "new": "b"}}'::jsonb,
   '11111111-0000-4000-8000-000000000001', now() - interval '1 day');

-- Comentario de gente conta como movimentacao.
INSERT INTO public.org_comments (entity_type, entity_id, kind, body, created_at) VALUES
  ('org_task', '44444444-0000-4000-8000-000000000042', 'comment', 'andamento', now() - interval '2 days');

-- Comentario de SISTEMA nao conta: o filtro e `is_system = false`.
INSERT INTO public.org_task_comments (task_id, comment, is_system, created_at) VALUES
  ('44444444-0000-4000-8000-000000000043', 'status alterado automaticamente', true, now() - interval '2 days');
