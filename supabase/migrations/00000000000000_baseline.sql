-- Baseline do schema public.
--
-- Origem: export oficial do Lovable Cloud de 14/08/2026 (pg_dump custom, PGDMP 1.16),
-- extraído com: pg_restore --schema-only --schema=public --no-owner
--
-- Substitui as 553 migrations anteriores, que não reconstruíam o banco: 246 delas
-- falhavam num Postgres limpo, e tabelas centrais em produção (representante,
-- org_projects, cliente_clusters, bem, matricula, titularidade) não eram criadas
-- por nenhuma delas. O histórico antigo está preservado em supabase/migrations_arquivo/.
--
-- Verificado contra produção por impressão digital md5 em 11 dimensões
-- (tabelas, colunas, constraints, índices, funções, policies, triggers, enums,
-- views, RLS e grants). Todas idênticas.
--
-- Removidos do dump, por serem artefato da plataforma e não schema da aplicação:
--   - meta-comandos \restrict / \unrestrict do psql 18
--   - GRANTs aos roles sandbox_exec e sandbox_exec_zwoainzzqhudmmknuycq (internos do Lovable)
--   - ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin (só o próprio role pode alterar)

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

--
-- PostgreSQL database dump
--


-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: app_role; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.app_role AS ENUM (
    'admin',
    'client',
    'team_member',
    'lider',
    'sublider',
    'timecliente',
    'marketing'
);


--
-- Name: fiscal_recurrence_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fiscal_recurrence_type AS ENUM (
    'daily',
    'weekly',
    'monthly',
    'yearly'
);


--
-- Name: fiscal_task_category; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fiscal_task_category AS ENUM (
    'task',
    'fixed_event'
);


--
-- Name: fiscal_task_department; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fiscal_task_department AS ENUM (
    'commercial',
    'financial',
    'administrative',
    'operations'
);


--
-- Name: fiscal_task_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fiscal_task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: fiscal_task_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.fiscal_task_status AS ENUM (
    'backlog',
    'waiting_client',
    'todo',
    'in_progress',
    'review',
    'em_ajuste',
    'done'
);


--
-- Name: notificacao_canal; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notificacao_canal AS ENUM (
    'sino',
    'email',
    'whatsapp'
);


--
-- Name: notificacao_tipo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.notificacao_tipo AS ENUM (
    'tarefa_atribuida',
    'tarefa_em_revisao',
    'documento_recebido',
    'solicitacao_enviada',
    'documento_aprovado',
    'documento_recusado',
    'cobranca_pendencia',
    'chamado_criado',
    'chamado_atribuido',
    'chamado_respondido',
    'chamado_vencido',
    'chamado_resolvido'
);


--
-- Name: org_comment_entity; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.org_comment_entity AS ENUM (
    'org_task',
    'org_project'
);


--
-- Name: org_comment_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.org_comment_kind AS ENUM (
    'comment',
    'assignment_changed',
    'review_submitted',
    'review_approved',
    'review_adjustments',
    'status_changed',
    'documentos_solicitados'
);


--
-- Name: osg_checklist_origem; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_checklist_origem AS ENUM (
    'padrao',
    'manual'
);


--
-- Name: osg_checklist_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_checklist_status AS ENUM (
    'pendente',
    'solicitado',
    'recebido',
    'dispensado',
    'nao_aplicavel',
    'nao_solicitado'
);


--
-- Name: osg_doc_area; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_doc_area AS ENUM (
    'osg',
    'fiscal'
);


--
-- Name: osg_doc_categoria; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_doc_categoria AS ENUM (
    'bens_direitos',
    'cadastros_fiscais',
    'declaracao_ir',
    'agrarios',
    'pessoais',
    'societarios',
    'sucessorios',
    'outros',
    'georreferenciamento'
);


--
-- Name: osg_doc_fonte; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_doc_fonte AS ENUM (
    'cliente',
    'psa',
    'arquivar'
);


--
-- Name: osg_doc_grupo; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_doc_grupo AS ENUM (
    'pf',
    'pj',
    'bens_imoveis',
    'outros'
);


--
-- Name: osg_doc_revisao; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_doc_revisao AS ENUM (
    'pendente',
    'aprovado',
    'recusado'
);


--
-- Name: osg_doc_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_doc_status AS ENUM (
    'pendente',
    'ativo'
);


--
-- Name: osg_solicitacao_item_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_solicitacao_item_status AS ENUM (
    'ativo',
    'dispensado'
);


--
-- Name: osg_solicitacao_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_solicitacao_status AS ENUM (
    'rascunho',
    'enviada',
    'em_checklist',
    'encerrada'
);


--
-- Name: osg_tipo_exploracao; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.osg_tipo_exploracao AS ENUM (
    'arrendamento',
    'parceria',
    'composse',
    'comodato',
    'condominio',
    'propria'
);


--
-- Name: scenario_kind; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.scenario_kind AS ENUM (
    'scale',
    'efficiency',
    'investment'
);


--
-- Name: scenario_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.scenario_status AS ENUM (
    'draft',
    'analyzing',
    'approved',
    'promoted',
    'archived'
);


--
-- Name: scenario_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.scenario_type AS ENUM (
    'baseline',
    'variant',
    'target'
);


--
-- Name: scenario_unit_basis; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.scenario_unit_basis AS ENUM (
    'per_unit',
    'per_month',
    'per_year'
);


--
-- Name: task_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.task_priority AS ENUM (
    'low',
    'medium',
    'high',
    'urgent'
);


--
-- Name: work_cluster; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_cluster AS ENUM (
    'database',
    'frontend',
    'management'
);


--
-- Name: work_package_activity_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_package_activity_type AS ENUM (
    'status_change',
    'assignment',
    'comment',
    'file_upload',
    'relation_change',
    'field_update',
    'created'
);


--
-- Name: work_package_area; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_package_area AS ENUM (
    'fiscal',
    'osg',
    'fixos',
    'pontuais'
);


--
-- Name: work_package_priority; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_package_priority AS ENUM (
    'alta',
    'normal',
    'baixa'
);


--
-- Name: work_package_relation_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_package_relation_type AS ENUM (
    'filho',
    'relacionado',
    'anterior',
    'sucessor',
    'pai',
    'duplicado'
);


--
-- Name: work_package_stage; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_package_stage AS ENUM (
    'solicitacao_documentos',
    'analise_documentacao',
    'elaboracao_wp',
    'elaboracao_relatorios',
    'entrega_cliente',
    'conclusao'
);


--
-- Name: work_package_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_package_status AS ENUM (
    'novo',
    'pendente_agendamento',
    'agendado',
    'em_progresso',
    'em_revisao',
    'concluido',
    'rejeitado'
);


--
-- Name: work_package_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.work_package_type AS ENUM (
    'fase',
    'tarefa',
    'epico'
);


--
-- Name: anexar_documento_pendencia(uuid, text, uuid, text, text, text, bigint, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.anexar_documento_pendencia(_solicitacao_item_id uuid, _alvo_kind text, _alvo_id uuid, _categoria text, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cliente uuid;
  v_item public.solicitacao_item%ROWTYPE;
  v_status public.osg_solicitacao_status;
  v_solicitacao uuid;
  v_tipo uuid;
  v_categoria public.osg_doc_categoria;
  v_kind_esperado text;
  v_doc_id uuid;
BEGIN
  v_cliente := public.resolve_user_cliente_id(auth.uid());
  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'sem cliente vinculado' USING ERRCODE = '42501';
  END IF;

  SELECT i.* INTO v_item
    FROM public.solicitacao_item i
    JOIN public.solicitacao s ON s.id = i.solicitacao_id
   WHERE i.id = _solicitacao_item_id
     AND s.cliente_id = v_cliente;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento pedido nao encontrado ou sem permissao' USING ERRCODE = '42501';
  END IF;

  SELECT s.status, s.id INTO v_status, v_solicitacao
    FROM public.solicitacao s WHERE s.id = v_item.solicitacao_id;
  IF v_status <> 'em_checklist'::public.osg_solicitacao_status THEN
    RAISE EXCEPTION 'esta solicitacao nao esta na fase de checklist' USING ERRCODE = '42501';
  END IF;

  IF v_item.status <> 'ativo'::public.osg_solicitacao_item_status THEN
    RAISE EXCEPTION 'documento dispensado deste pedido' USING ERRCODE = '42501';
  END IF;

  v_kind_esperado := CASE v_item.granularidade
    WHEN 'pessoa_pf' THEN 'pessoa'
    WHEN 'pessoa_pj' THEN 'pessoa'
    WHEN 'matricula_rural' THEN 'matricula'
    WHEN 'matricula_urbana' THEN 'matricula'
    WHEN 'bem' THEN 'bem'
    ELSE 'cliente'
  END;
  IF _alvo_kind IS DISTINCT FROM v_kind_esperado THEN
    RAISE EXCEPTION 'entidade incompativel com o documento pedido' USING ERRCODE = '42501';
  END IF;
  IF v_kind_esperado = 'cliente' AND _alvo_id IS NOT NULL THEN
    RAISE EXCEPTION 'este documento e do cliente, nao de uma entidade' USING ERRCODE = '42501';
  END IF;
  IF v_kind_esperado <> 'cliente' AND _alvo_id IS NULL THEN
    RAISE EXCEPTION 'informe a entidade do documento' USING ERRCODE = '42501';
  END IF;

  IF _alvo_kind = 'pessoa' AND NOT EXISTS (
       SELECT 1 FROM public.pessoa p WHERE p.id = _alvo_id AND p.cliente_id = v_cliente) THEN
    RAISE EXCEPTION 'pessoa nao pertence a este cliente' USING ERRCODE = '42501';
  END IF;
  IF _alvo_kind = 'bem' AND NOT EXISTS (
       SELECT 1 FROM public.bem b WHERE b.id = _alvo_id AND b.cliente_id = v_cliente) THEN
    RAISE EXCEPTION 'bem nao pertence a este cliente' USING ERRCODE = '42501';
  END IF;
  IF _alvo_kind = 'matricula' AND NOT EXISTS (
       SELECT 1
         FROM public.matricula m
         LEFT JOIN public.bem bm ON bm.id = m.bem_id
        WHERE m.id = _alvo_id
          AND (bm.cliente_id = v_cliente
            OR EXISTS (SELECT 1 FROM public.titularidade t
                         JOIN public.pessoa tp ON tp.id = t.titular_pessoa_id
                        WHERE t.matricula_id = m.id AND tp.cliente_id = v_cliente))) THEN
    RAISE EXCEPTION 'imovel nao pertence a este cliente' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
       SELECT 1 FROM public.solicitacao_item_nao_aplicavel na
        WHERE na.solicitacao_item_id = _solicitacao_item_id
          AND ((_alvo_kind = 'pessoa' AND na.pessoa_id = _alvo_id)
            OR (_alvo_kind = 'bem' AND na.bem_id = _alvo_id)
            OR (_alvo_kind = 'matricula' AND na.matricula_id = _alvo_id))) THEN
    RAISE EXCEPTION 'este documento foi marcado como nao aplicavel a esta entidade'
      USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(v_item.item_padrao_id,
                  (SELECT dt.id FROM public.documento_tipo dt
                    WHERE dt.solicitacao_item_id = v_item.id AND dt.ativo LIMIT 1))
    INTO v_tipo;
  IF v_tipo IS NULL THEN
    RAISE EXCEPTION 'documento pedido sem tipo cadastrado; fale com a PSA' USING ERRCODE = '42501';
  END IF;

  v_categoria := COALESCE(NULLIF(_categoria, '')::public.osg_doc_categoria,
                          'outros'::public.osg_doc_categoria);
  IF v_categoria = 'georreferenciamento'::public.osg_doc_categoria THEN
    RAISE EXCEPTION 'documentos de georreferenciamento nao sao enviados por aqui'
      USING ERRCODE = '42501';
  END IF;

  IF position('/' || v_cliente::text || '/' IN _gcs_uri) = 0 THEN
    RAISE EXCEPTION 'arquivo nao pertence ao cliente' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.documento_arquivo (
    cliente_id, fonte, categoria, documento_tipo_id, solicitacao_id,
    pessoa_id, bem_id, matricula_id,
    nome_original, gcs_uri, checksum, mime, tamanho, status, ambiente, created_by
  ) VALUES (
    v_cliente,
    'cliente'::public.osg_doc_fonte,
    v_categoria,
    v_tipo,
    v_solicitacao,
    CASE WHEN _alvo_kind = 'pessoa' THEN _alvo_id END,
    CASE WHEN _alvo_kind = 'bem' THEN _alvo_id END,
    CASE WHEN _alvo_kind = 'matricula' THEN _alvo_id END,
    _nome_original, _gcs_uri, _checksum, _mime, _tamanho,
    'ativo'::public.osg_doc_status, _ambiente, auth.uid()
  ) RETURNING id INTO v_doc_id;

  RETURN v_doc_id;
END;
$$;


--
-- Name: FUNCTION anexar_documento_pendencia(_solicitacao_item_id uuid, _alvo_kind text, _alvo_id uuid, _categoria text, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.anexar_documento_pendencia(_solicitacao_item_id uuid, _alvo_kind text, _alvo_id uuid, _categoria text, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) IS 'Anexo do cliente na fase de checklist: grava documento_arquivo já classificado (documento_tipo_id derivado do item pedido, nunca recebido do cliente) e vinculado à entidade. Recusa item de outro cliente, solicitação fora de em_checklist, item dispensado, grão incompatível com o alvo, alvo de outro cliente, par marcado como não aplicável, item sem tipo, gcs_uri fora da pasta do cliente e categoria georreferenciamento. Substitui anexar_documento_solicitado, que validava contra checklist_cliente_item.';


--
-- Name: anexar_documento_solicitado(uuid, text, text, bigint, text, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.anexar_documento_solicitado(_item_id uuid, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cliente uuid;
  v_item public.checklist_cliente_item%ROWTYPE;
  v_doc_id uuid;
BEGIN
  v_cliente := public.resolve_user_cliente_id(auth.uid());
  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'sem cliente vinculado' USING ERRCODE = '42501';
  END IF;

  SELECT * INTO v_item FROM public.checklist_cliente_item WHERE id = _item_id;
  IF NOT FOUND OR v_item.cliente_id <> v_cliente THEN
    RAISE EXCEPTION 'item de checklist nao encontrado ou sem permissao' USING ERRCODE = '42501';
  END IF;

  IF v_item.status IN ('dispensado'::public.osg_checklist_status, 'nao_aplicavel'::public.osg_checklist_status) THEN
    RAISE EXCEPTION 'item indisponivel para envio' USING ERRCODE = '42501';
  END IF;

  IF COALESCE(v_item.categoria::text, '') = 'georreferenciamento' THEN
    RAISE EXCEPTION 'documentos de georreferenciamento nao sao enviados por aqui' USING ERRCODE = '42501';
  END IF;

  -- Defesa: chave do GCS deve conter /<cliente_id>/
  IF position('/' || v_cliente::text || '/' IN _gcs_uri) = 0 THEN
    RAISE EXCEPTION 'arquivo nao pertence ao cliente' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.documento_arquivo (
    cliente_id, fonte, categoria, pessoa_id, bem_id, matricula_id, checklist_item_id,
    nome_original, gcs_uri, checksum, mime, tamanho, status, ambiente, created_by
  ) VALUES (
    v_cliente,
    'cliente'::public.osg_doc_fonte,
    COALESCE(v_item.categoria, 'outros'::public.osg_doc_categoria),
    v_item.pessoa_id, v_item.bem_id, v_item.matricula_id, v_item.id,
    _nome_original, _gcs_uri, _checksum, _mime, _tamanho,
    'ativo'::public.osg_doc_status, _ambiente, auth.uid()
  ) RETURNING id INTO v_doc_id;

  RETURN v_doc_id;
END;
$$;


--
-- Name: auto_grant_new_page_to_area_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.auto_grant_new_page_to_area_users() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.user_page_access (user_id, page_permission_id, granted_by)
  SELECT DISTINCT upa.user_id, NEW.id, NULL::uuid
  FROM public.user_page_access upa
  JOIN public.page_permissions pp ON pp.id = upa.page_permission_id
  WHERE pp.category = NEW.category
    AND pp.id <> NEW.id
  ON CONFLICT (user_id, page_permission_id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: can_perform(text, text, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_perform(p_table text, p_op text, p_id uuid) RETURNS jsonb
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_allowed_ops    text[];
  v_rows           int;
  v_exists         boolean;
  v_policy_text    text;
  v_required_role  text;
  v_role           text;
  v_roles          text[];
  v_rank           int;
  v_best_rank      int := 999;
BEGIN
  v_allowed_ops := public.precheck_allowed_ops(p_table);

  IF v_allowed_ops IS NULL THEN
    RAISE EXCEPTION 'Table % is not allowed for precheck', p_table
      USING ERRCODE = '22023';
  END IF;

  IF NOT (p_op = ANY(v_allowed_ops)) THEN
    RAISE EXCEPTION 'Op % not allowed for table %', p_op, p_table
      USING ERRCODE = '22023';
  END IF;

  IF p_op NOT IN ('update','delete') THEN
    RAISE EXCEPTION 'Only update/delete are supported (got %)', p_op
      USING ERRCODE = '22023';
  END IF;

  EXECUTE format('SELECT EXISTS(SELECT 1 FROM public.%I WHERE id = $1)', p_table)
    INTO v_exists USING p_id;

  BEGIN
    IF p_op = 'delete' THEN
      EXECUTE format('DELETE FROM public.%I WHERE id = $1', p_table) USING p_id;
    ELSE
      EXECUTE format('UPDATE public.%I SET id = id WHERE id = $1', p_table) USING p_id;
    END IF;

    GET DIAGNOSTICS v_rows = ROW_COUNT;
    RAISE EXCEPTION 'PRECHECK_OK' USING DETAIL = v_rows::text;
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM = 'PRECHECK_OK' THEN
        DECLARE
          v_detail text;
        BEGIN
          GET STACKED DIAGNOSTICS v_detail = PG_EXCEPTION_DETAIL;
          v_rows := COALESCE(v_detail::int, 0);
        END;

        IF v_rows > 0 THEN
          RETURN jsonb_build_object(
            'allowed', true,
            'reason', null,
            'required_role', null,
            'message', null
          );
        END IF;

        IF NOT v_exists THEN
          RETURN jsonb_build_object(
            'allowed', false,
            'reason', 'row_not_found',
            'required_role', null,
            'message', null
          );
        END IF;

        SELECT string_agg(coalesce(qual,'') || ' ' || coalesce(with_check,''), ' ')
          INTO v_policy_text
          FROM pg_policies
         WHERE schemaname = 'public'
           AND tablename = p_table
           AND cmd IN (UPPER(p_op), 'ALL');

        v_roles := ARRAY[]::text[];
        IF v_policy_text IS NOT NULL THEN
          FOR v_role IN
            SELECT (regexp_matches(v_policy_text,
              'has_role_or_higher\s*\(\s*auth\.uid\(\)\s*,\s*''([a-z_]+)''', 'g'))[1]
          LOOP
            v_roles := array_append(v_roles, v_role);
          END LOOP;
          FOR v_role IN
            SELECT (regexp_matches(v_policy_text,
              'has_role\s*\(\s*auth\.uid\(\)\s*,\s*''([a-z_]+)''', 'g'))[1]
          LOOP
            v_roles := array_append(v_roles, v_role);
          END LOOP;
        END IF;

        v_required_role := null;
        IF v_roles IS NOT NULL AND array_length(v_roles, 1) > 0 THEN
          FOREACH v_role IN ARRAY v_roles LOOP
            v_rank := CASE v_role
              WHEN 'team_member' THEN 1
              WHEN 'sublider'    THEN 2
              WHEN 'lider'       THEN 3
              WHEN 'admin'       THEN 4
              ELSE 999
            END;
            IF v_rank < v_best_rank THEN
              v_best_rank := v_rank;
              v_required_role := v_role;
            END IF;
          END LOOP;
        END IF;

        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'rls_blocked',
          'required_role', v_required_role,
          'message', null
        );
      ELSE
        RETURN jsonb_build_object(
          'allowed', false,
          'reason', 'trigger_blocked',
          'required_role', null,
          'message', SQLERRM
        );
      END IF;
    WHEN insufficient_privilege THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'reason', 'grant_missing',
        'required_role', null,
        'message', null
      );
  END;
END;
$_$;


--
-- Name: can_view_contribuinte(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_contribuinte(_uid uuid, _contribuinte_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(_uid, 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.contribuinte c
        WHERE c.id = _contribuinte_id
          AND public.cliente_visivel_para(c.cliente_id)
      );
$$;


--
-- Name: can_view_org_project(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_org_project(_user_id uuid, _project_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    -- Admin vê tudo
    public.has_role(_user_id, 'admin'::app_role)
    -- Membro direto do projeto
    OR public.is_project_member(_user_id, _project_id)
    -- Fallback: responsável, líder ou criador
    OR EXISTS (
      SELECT 1 FROM public.org_projects p
      WHERE p.id = _project_id
        AND (p.responsible_id = _user_id OR p.leader_id = _user_id OR p.created_by = _user_id)
    )
    -- Líder: algum membro do projeto pertence a uma das áreas do líder
    OR (
      public.has_role(_user_id, 'lider'::app_role)
      AND EXISTS (
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
        JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
        WHERE opm.project_id = _project_id
          AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_user_id))
        UNION ALL
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
        WHERE opm.project_id = _project_id
          AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_user_id))
      )
    )
    -- Sublíder: algum membro do projeto pertence a uma das equipes do sublíder
    OR (
      public.has_role(_user_id, 'sublider'::app_role)
      AND EXISTS (
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
        WHERE opm.project_id = _project_id
          AND em.equipe_id IN (SELECT public.user_estrutura_equipe_ids(_user_id))
        UNION ALL
        SELECT 1
        FROM public.org_project_members opm
        JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
        WHERE opm.project_id = _project_id
          AND eq.id IN (SELECT public.user_estrutura_equipe_ids(_user_id))
      )
    );
$$;


--
-- Name: can_view_ticket(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.can_view_ticket(_ticket_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tickets t
    WHERE t.id = _ticket_id
      AND (
        public.has_role(auth.uid(), 'admin'::app_role)
        OR (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
            AND t.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))
        OR (public.has_role_or_higher(auth.uid(), 'team_member'::app_role)
            AND t.cliente_id IS NOT NULL
            AND public.cliente_visivel_para(t.cliente_id))
        OR auth.uid() = t.user_id
        OR public.is_ticket_assigned_to(t.id, auth.uid())
      )
  );
$$;


--
-- Name: capture_ticket_assignment(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.capture_ticket_assignment() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF NEW.assigned_to IS NOT NULL
     AND (OLD.assigned_to IS NULL OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to)
     AND NEW.assigned_at IS NULL THEN
    NEW.assigned_at := NOW();
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: checklist_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.checklist_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: cliente_id_de_bem(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cliente_id_de_bem(_bem_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT cliente_id FROM public.bem WHERE id = _bem_id;
$$;


--
-- Name: cliente_id_de_matricula(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cliente_id_de_matricula(_matricula_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(m.cliente_id, b.cliente_id)
    FROM public.matricula m
    LEFT JOIN public.bem b ON b.id = m.bem_id
   WHERE m.id = _matricula_id;
$$;


--
-- Name: cliente_id_de_pessoa(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cliente_id_de_pessoa(_pessoa_id uuid) RETURNS uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT cliente_id FROM public.pessoa WHERE id = _pessoa_id;
$$;


--
-- Name: cliente_visivel_para(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cliente_visivel_para(_cliente_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (SELECT 1 FROM public.cliente_clusters cc
                 WHERE cc.cliente_id = _cliente_id
                   AND cc.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())));
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: bem; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bem (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    referencia_dp text NOT NULL,
    tipo_bem text NOT NULL,
    denominacao text NOT NULL,
    vlr_contabil numeric(18,2),
    vlr_contabil_ajustado numeric(18,2),
    vlr_benfeitorias numeric(18,2),
    vlr_mercado numeric(18,2),
    vlr_imposto_anual numeric(18,2),
    imposto_anual_exercicio integer,
    ccir_codigo text,
    inscricao_municipal text,
    status_integralizacao text,
    empresa_destino_pessoa_id uuid,
    participa_estruturacao boolean DEFAULT true NOT NULL,
    motivo_nao_integralizacao text,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    descricao_outros text,
    vlr_itr_iptu numeric,
    endereco_logradouro text,
    endereco_numero text,
    endereco_complemento text,
    endereco_bairro text,
    endereco_cep text,
    area_construida_m2 numeric,
    CONSTRAINT bem_ccir_chk CHECK (((ccir_codigo IS NULL) OR (tipo_bem = 'IR'::text))),
    CONSTRAINT bem_exercicio_chk CHECK (((imposto_anual_exercicio IS NULL) OR ((imposto_anual_exercicio >= 1900) AND (imposto_anual_exercicio <= 2100)))),
    CONSTRAINT bem_iptu_chk CHECK (((inscricao_municipal IS NULL) OR (tipo_bem = 'IB'::text))),
    CONSTRAINT bem_tipo_chk CHECK ((tipo_bem = ANY (ARRAY['IR'::text, 'IB'::text, 'AP'::text, 'PS'::text, 'OU'::text])))
);


--
-- Name: COLUMN bem.descricao_outros; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bem.descricao_outros IS 'Descrição livre do tipo de bem quando tipo_bem = OU (Outros). NULL para os demais tipos.';


--
-- Name: COLUMN bem.endereco_logradouro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bem.endereco_logradouro IS 'Logradouro do imóvel urbano (rua, avenida, rodovia). Município e UF vivem em matricula.municipio_imovel/uf_imovel.';


--
-- Name: COLUMN bem.endereco_numero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bem.endereco_numero IS 'Número do imóvel urbano. Texto porque aceita "s/n" e sufixos ("119-A").';


--
-- Name: COLUMN bem.endereco_complemento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bem.endereco_complemento IS 'Complemento do imóvel urbano (apartamento, bloco, sala, conjunto), citado no modelo de descrição urbana.';


--
-- Name: COLUMN bem.endereco_bairro; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bem.endereco_bairro IS 'Bairro do imóvel urbano.';


--
-- Name: COLUMN bem.endereco_cep; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bem.endereco_cep IS 'CEP do imóvel urbano, exigido pelo modelo de descrição urbana.';


--
-- Name: COLUMN bem.area_construida_m2; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.bem.area_construida_m2 IS 'Área construída em m². O modelo urbano só a menciona quando é menor que a área total (matricula.area_documento). Unidade fixa no nome: área construída não vem em hectare.';


--
-- Name: criar_bem_com_titular(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.criar_bem_com_titular(bem_data jsonb, titular_data jsonb) RETURNS public.bem
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_bem public.bem;
BEGIN
  IF titular_data IS NULL OR (titular_data->>'titular_pessoa_id') IS NULL THEN
    RAISE EXCEPTION 'Titular é obrigatório para cadastrar este bem';
  END IF;

  INSERT INTO public.bem
  SELECT (jsonb_populate_record(
    NULL::public.bem,
    bem_data || jsonb_build_object(
      'id', gen_random_uuid(),
      'created_at', now(),
      'updated_at', now(),
      'created_by', auth.uid(),
      'updated_by', NULL
    )
  )).*
  RETURNING * INTO v_bem;

  INSERT INTO public.titularidade (bem_id, titular_pessoa_id, tipo, fracao, created_by)
  VALUES (
    v_bem.id,
    (titular_data->>'titular_pessoa_id')::uuid,
    COALESCE(titular_data->>'tipo', 'DIREITO'),
    NULLIF(titular_data->>'fracao', '')::numeric,
    auth.uid()
  );

  RETURN v_bem;
END;
$$;


--
-- Name: criar_cliente_com_clusters(jsonb, uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.criar_cliente_com_clusters(p_cliente jsonb, p_cluster_ids uuid[]) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_row public.cliente%ROWTYPE;
  v_cid uuid;
BEGIN
  IF NOT public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissão para cadastrar cliente' USING ERRCODE = '42501';
  END IF;

  IF p_cluster_ids IS NULL OR array_length(p_cluster_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'Selecione ao menos 1 cluster' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.cliente (
    nome, categoria, ativo, fixo, telefone, municipio, uf, observacoes, ambiente
  ) VALUES (
    btrim(p_cliente->>'nome'),
    NULLIF(p_cliente->>'categoria',''),
    COALESCE((p_cliente->>'ativo')::boolean, true),
    NULLIF(p_cliente->>'fixo',''),
    NULLIF(p_cliente->>'telefone',''),
    NULLIF(p_cliente->>'municipio',''),
    NULLIF(p_cliente->>'uf',''),
    NULLIF(p_cliente->>'observacoes',''),
    COALESCE(NULLIF(p_cliente->>'ambiente',''), 'prod')
  )
  RETURNING * INTO v_row;

  FOREACH v_cid IN ARRAY p_cluster_ids LOOP
    INSERT INTO public.cliente_clusters (cliente_id, cluster_id)
    VALUES (v_row.id, v_cid);
  END LOOP;

  RETURN to_jsonb(v_row);
END;
$$;


--
-- Name: matricula; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.matricula (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bem_id uuid,
    numero text NOT NULL,
    matricula_anterior_id uuid,
    matricula_anterior_texto text,
    livro text,
    folha text,
    data_matricula date,
    cartorio_id uuid NOT NULL,
    municipio_imovel text NOT NULL,
    uf_imovel character(2) NOT NULL,
    area_documento numeric(18,4) NOT NULL,
    area_real numeric(18,4),
    area_explorada numeric(18,4),
    area_unidade text NOT NULL,
    georreferenciado text,
    georref_prejudica_transferencia boolean,
    tipo_exploracao_posse text,
    descricao_psa_completa text,
    confrontacoes_texto text,
    origem_descricao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    tipo_bem text,
    vlr_contabil numeric,
    vlr_contabil_ajustado numeric,
    vlr_benfeitorias numeric,
    vlr_mercado numeric,
    vlr_imposto_anual numeric,
    imposto_anual_exercicio integer,
    cliente_id uuid,
    CONSTRAINT matricula_area_unidade_chk CHECK ((area_unidade = ANY (ARRAY['ha'::text, 'm2'::text, 'ha_m2'::text]))),
    CONSTRAINT matricula_tipo_bem_check CHECK ((tipo_bem = ANY (ARRAY['IR'::text, 'IB'::text])))
);


--
-- Name: COLUMN matricula.bem_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matricula.bem_id IS 'FK opcional para bem. NULL = matrícula órfã (não vinculada).';


--
-- Name: COLUMN matricula.tipo_bem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matricula.tipo_bem IS 'Tipo do imóvel da matrícula: IR (Rural) ou IB (Urbano). Para IR/IB os valores vivem aqui (não no bem).';


--
-- Name: COLUMN matricula.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.matricula.cliente_id IS 'Cliente dono da matrícula. Derivado por trigger: bem.cliente_id quando há bem vinculado; senão o cliente do primeiro titular. NULL = matrícula não atribuída (sem bem e sem titular). Entra na chave de unicidade (cliente_id, cartorio_id, numero).';


--
-- Name: criar_matricula_com_titular(jsonb, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.criar_matricula_com_titular(matricula_data jsonb, titular_data jsonb) RETURNS public.matricula
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


--
-- Name: criar_notificacao(uuid, public.notificacao_tipo, text, text, uuid, text, text, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.criar_notificacao(_destinatario_id uuid, _tipo public.notificacao_tipo, _titulo text, _entidade_tipo text, _entidade_id uuid, _corpo text DEFAULT NULL::text, _href text DEFAULT NULL::text, _agrupamento text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_chave text := coalesce(_agrupamento, _tipo::text || ':' || _entidade_id::text);
  v_id    uuid;
begin
  if _destinatario_id is null then
    return null;
  end if;

  insert into public.notificacao (destinatario_id, tipo, titulo, corpo,
                                  entidade_tipo, entidade_id, href,
                                  agrupamento_chave, metadata)
  values (_destinatario_id, _tipo, _titulo, _corpo,
          _entidade_tipo, _entidade_id, _href, v_chave, coalesce(_metadata, '{}'::jsonb))
  on conflict (destinatario_id, agrupamento_chave) where lido_em is null
  do update set quantidade = notificacao.quantidade + 1,
                titulo     = excluded.titulo,
                corpo      = excluded.corpo,
                href       = excluded.href,
                metadata   = excluded.metadata
  returning id into v_id;

  return v_id;
end $$;


--
-- Name: FUNCTION criar_notificacao(_destinatario_id uuid, _tipo public.notificacao_tipo, _titulo text, _entidade_tipo text, _entidade_id uuid, _corpo text, _href text, _agrupamento text, _metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.criar_notificacao(_destinatario_id uuid, _tipo public.notificacao_tipo, _titulo text, _entidade_tipo text, _entidade_id uuid, _corpo text, _href text, _agrupamento text, _metadata jsonb) IS 'Unica porta de escrita em notificacao. Devolve SEMPRE o id da linha, criada ou agrupada, e null apenas quando _destinatario_id e null. Agrupa por (destinatario_id, agrupamento_chave) entre as NAO LIDAS.';


--
-- Name: criar_org_comment(uuid, public.org_comment_entity, uuid, uuid, text, uuid[], jsonb, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.criar_org_comment(_id uuid, _entity_type public.org_comment_entity, _entity_id uuid, _parent_id uuid, _body text, _mentions uuid[], _attachments jsonb, _respondido_id uuid DEFAULT NULL::uuid) RETURNS uuid
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid              uuid := auth.uid();
  v_id               uuid := COALESCE(_id, gen_random_uuid());
  v_author_name      text;
  v_mention          uuid;
  v_att              jsonb;
  v_respondido       uuid;
  v_respondido_autor uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Autenticação obrigatória' USING ERRCODE = '42501';
  END IF;

  SELECT NULLIF(BTRIM(COALESCE(pr.first_name, '') || ' ' || COALESCE(pr.last_name, '')), '')
    INTO v_author_name
    FROM public.profiles pr
   WHERE pr.id = v_uid;

  INSERT INTO public.org_comments (
    id, entity_type, entity_id, parent_id, kind, body, author_id, author_name
  ) VALUES (
    v_id,
    _entity_type,
    _entity_id,
    _parent_id,
    'comment'::public.org_comment_kind,
    _body,
    v_uid,
    v_author_name
  );

  IF _mentions IS NOT NULL THEN
    FOREACH v_mention IN ARRAY _mentions LOOP
      IF v_mention IS NOT NULL THEN
        INSERT INTO public.org_comment_mentions (comment_id, mentioned_user_id, motivo)
        VALUES (v_id, v_mention, 'mencao')
        ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
      END IF;
    END LOOP;
  END IF;

  IF _parent_id IS NOT NULL THEN
    v_respondido := COALESCE(_respondido_id, _parent_id);

    SELECT c.author_id
      INTO v_respondido_autor
      FROM public.org_comments c
     WHERE c.id = v_respondido
       AND (c.id = _parent_id OR c.parent_id = _parent_id);

    IF v_respondido_autor IS NOT NULL AND v_respondido_autor <> v_uid THEN
      INSERT INTO public.org_comment_mentions (comment_id, mentioned_user_id, motivo)
      VALUES (v_id, v_respondido_autor, 'resposta')
      ON CONFLICT (comment_id, mentioned_user_id) DO NOTHING;
    END IF;
  END IF;

  IF _attachments IS NOT NULL AND jsonb_typeof(_attachments) = 'array' THEN
    FOR v_att IN SELECT * FROM jsonb_array_elements(_attachments) LOOP
      INSERT INTO public.org_comment_attachments (
        comment_id, file_path, file_name, file_size, file_type,
        width, height, uploaded_by
      ) VALUES (
        v_id,
        v_att->>'file_path',
        v_att->>'file_name',
        NULLIF(v_att->>'file_size', '')::int,
        v_att->>'file_type',
        NULLIF(v_att->>'width', '')::int,
        NULLIF(v_att->>'height', '')::int,
        v_uid
      );
    END LOOP;
  END IF;

  RETURN v_id;
END;
$$;


--
-- Name: FUNCTION criar_org_comment(_id uuid, _entity_type public.org_comment_entity, _entity_id uuid, _parent_id uuid, _body text, _mentions uuid[], _attachments jsonb, _respondido_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.criar_org_comment(_id uuid, _entity_type public.org_comment_entity, _entity_id uuid, _parent_id uuid, _body text, _mentions uuid[], _attachments jsonb, _respondido_id uuid) IS 'Cria comentário, menções, notificação de resposta e anexos numa transação só. SECURITY INVOKER — a RLS de cada tabela continua valendo. `_respondido_id` é o comentário respondido (a raiz ou uma resposta dela); nulo cai no autor de `_parent_id`.';


--
-- Name: dashboard_project_ids_for_cluster(uuid, boolean); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.dashboard_project_ids_for_cluster(_cluster_id uuid, _include_orphans boolean DEFAULT false) RETURNS SETOF uuid
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT p.id FROM public.org_projects p
  WHERE _cluster_id = ANY(public.org_project_cluster_ids(p.id))
     OR (_include_orphans AND public.org_project_cluster_ids(p.id) = '{}');
$$;


--
-- Name: destinatarios_cliente(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.destinatarios_cliente(_cliente_id uuid) RETURNS TABLE(user_id uuid, nome text, email text, telefone text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select distinct r.user_id, r.nome, r.email, r.telefone
    from public.representante r
    join public.cliente c on c.id = r.id_cliente and c.excluido = false
   where r.id_cliente = _cliente_id
     and r.excluido = false
     and r.user_id is not null;
$$;


--
-- Name: FUNCTION destinatarios_cliente(_cliente_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.destinatarios_cliente(_cliente_id uuid) IS 'De um cliente para os usuarios que o representam. Inverso de resolve_user_cliente_id().';


--
-- Name: documento_arquivo_touch_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.documento_arquivo_touch_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then
    new.updated_by = coalesce(auth.uid(), old.updated_by);
  end if;
  return new;
end;
$$;


--
-- Name: enforce_cliente_cluster_last(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_cliente_cluster_last() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.cliente c
    WHERE c.id = OLD.cliente_id AND c.excluido = false
  ) AND NOT EXISTS (
    SELECT 1 FROM public.cliente_clusters cc
    WHERE cc.cliente_id = OLD.cliente_id AND cc.cluster_id <> OLD.cluster_id
  ) THEN
    RAISE EXCEPTION 'Não é possível remover o último cluster do cliente %. Vincule outro cluster antes.', OLD.cliente_id
      USING ERRCODE = '23514';
  END IF;
  RETURN OLD;
END;
$$;


--
-- Name: enforce_cliente_tem_cluster(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.enforce_cliente_tem_cluster() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.excluido = false
     AND NOT EXISTS (SELECT 1 FROM public.cliente_clusters cc WHERE cc.cliente_id = NEW.id) THEN
    RAISE EXCEPTION 'Cliente % (%) precisa estar vinculado a pelo menos 1 cluster (cliente_clusters).', NEW.nome, NEW.id
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: fechar_chamados_resolvidos_sem_resposta(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.fechar_chamados_resolvidos_sem_resposta() RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_dias     constant integer := 3;
  v_fechados integer := 0;
BEGIN
  WITH candidatos AS (
    SELECT t.id
      FROM public.tickets t
     WHERE t.status = 'resolvido'
       AND COALESCE(
             (SELECT MAX(m.created_at)
                FROM public.ticket_messages m
               WHERE m.ticket_id = t.id),
             t.updated_at
           ) <= now() - make_interval(days => v_dias)
  )
  UPDATE public.tickets t
     SET status = 'fechado'
    FROM candidatos c
   WHERE c.id = t.id;

  GET DIAGNOSTICS v_fechados = ROW_COUNT;

  IF v_fechados > 0 THEN
    RAISE NOTICE 'Fechamento automatico: % chamado(s) fechados apos % dias sem resposta',
      v_fechados, v_dias;
  END IF;

  RETURN v_fechados;
END;
$$;


--
-- Name: FUNCTION fechar_chamados_resolvidos_sem_resposta(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.fechar_chamados_resolvidos_sem_resposta() IS 'Fecha chamados em `resolvido` sem mensagem nova há 3 dias corridos. Agendada em cron.job como fechar-chamados-resolvidos-diario.';


--
-- Name: ordem_servico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ordem_servico (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid NOT NULL,
    numero_os text,
    data_emissao date,
    data_inicio date,
    data_fim date,
    valor_projeto numeric DEFAULT 0,
    valor_reembolso_km numeric DEFAULT 0,
    valor_reembolso_refeicao numeric DEFAULT 0,
    situacao text DEFAULT 'em_andamento'::text,
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    id_servico uuid,
    id_produto_segmento uuid,
    excluido boolean DEFAULT false NOT NULL,
    cluster_id uuid,
    regiao text,
    setor_cliente text,
    setor_cliente_id uuid,
    numero_parcelas integer DEFAULT 1,
    valor_entrada numeric DEFAULT 0,
    CONSTRAINT ordem_servico_numero_parcelas_faixa CHECK (((numero_parcelas IS NULL) OR ((numero_parcelas >= 1) AND (numero_parcelas <= 360))))
);


--
-- Name: COLUMN ordem_servico.valor_projeto; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ordem_servico.valor_projeto IS 'Total do contrato — nunca o valor de uma parcela. A ambiguidade anterior deixou OS com valor de parcela gravado aqui (Agro Amazônia 035/2026, Paiol 018/2026); a correção é manual, pela planilha consolidada. Para o valor mensal, ver numero_parcelas e valor_entrada.';


--
-- Name: COLUMN ordem_servico.numero_parcelas; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ordem_servico.numero_parcelas IS 'Parcelas do contrato inteiro, não do exercício: 24 parcelas que atravessam dois anos são UMA OS com 24. Nulo = não informado, estado das OS anteriores a esta coluna; 1 = pagamento único. Periodicidade é sempre mensal (não há campo de periodicidade). O valor da parcela NÃO é coluna: é (valor_projeto - valor_entrada) / numero_parcelas, derivado na tela em src/lib/osParcelamento.ts.';


--
-- Name: COLUMN ordem_servico.valor_entrada; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.ordem_servico.valor_entrada IS 'Entrada paga fora do parcelamento, digitada a partir do contrato. Não vem da planilha do financeiro, que lista só o que falta faturar — entrada já paga não aparece lá. 0 quando não houver.';


--
-- Name: org_comment_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_comment_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    file_path text NOT NULL,
    file_name text NOT NULL,
    file_size integer NOT NULL,
    file_type text,
    width integer,
    height integer,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: org_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    entity_type public.org_comment_entity NOT NULL,
    entity_id uuid NOT NULL,
    project_id uuid NOT NULL,
    parent_id uuid,
    kind public.org_comment_kind DEFAULT 'comment'::public.org_comment_kind NOT NULL,
    body text NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    author_id uuid,
    author_name text,
    editado_em timestamp with time zone,
    excluido boolean DEFAULT false NOT NULL,
    excluido_em timestamp with time zone,
    excluido_por uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: org_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text,
    external_client_id uuid,
    responsible_id uuid,
    leader_id uuid,
    objective text,
    start_date date,
    end_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    contribuinte_id uuid,
    estrutura_area_id uuid,
    ordem_servico_id uuid,
    servico_id uuid,
    equipe_id uuid,
    is_multidisciplinar boolean DEFAULT false NOT NULL,
    produto_segmento_id uuid
);


--
-- Name: COLUMN org_projects.produto_segmento_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.org_projects.produto_segmento_id IS 'Produto contratado que este projeto atende (1 por projeto). Preenchido pelo modal de projeto e pela criação em lote a partir da OS. Nulo em projeto antigo que o backfill de 20260814140000 não conseguiu identificar sem chute: nesse caso a UI ainda deriva o rótulo dos produtos da OS.';


--
-- Name: org_tasks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    status public.fiscal_task_status DEFAULT 'todo'::public.fiscal_task_status NOT NULL,
    priority public.fiscal_task_priority DEFAULT 'medium'::public.fiscal_task_priority NOT NULL,
    assigned_to uuid,
    assigned_to_name text,
    created_by uuid,
    due_date date,
    due_time time without time zone,
    is_recurring boolean DEFAULT false,
    recurrence_type public.fiscal_recurrence_type,
    category public.fiscal_task_category DEFAULT 'task'::public.fiscal_task_category NOT NULL,
    tags text[] DEFAULT '{}'::text[],
    department public.fiscal_task_department,
    parent_task_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_id uuid NOT NULL,
    client_id uuid,
    servico_id uuid,
    start_date date,
    contribuinte_id uuid,
    estimated_hours numeric,
    actual_hours numeric,
    reviewer_id uuid,
    CONSTRAINT fiscal_tasks_no_self_parent CHECK (((parent_task_id IS NULL) OR (parent_task_id <> id)))
);


--
-- Name: COLUMN org_tasks.reviewer_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.org_tasks.reviewer_id IS 'Lider/sublider designado como revisor quando a tarefa entra em review. Nao altera assigned_to.';


--
-- Name: org_comments_feed; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.org_comments_feed WITH (security_invoker='on') AS
 SELECT c.id,
    c.entity_type,
    c.entity_id,
    c.project_id,
    c.parent_id,
    c.kind,
    c.body,
    c.metadata,
    c.author_id,
    c.author_name,
    c.editado_em,
    c.created_at,
    c.updated_at,
    COALESCE(t.title, p.name) AS entity_title,
    p.name AS project_name,
    ( SELECT (count(*))::integer AS count
           FROM public.org_comments r
          WHERE ((r.parent_id = c.id) AND (r.excluido = false))) AS reply_count,
    ( SELECT (count(*))::integer AS count
           FROM public.org_comment_attachments a
          WHERE (a.comment_id = c.id)) AS attachment_count,
    c.excluido,
    COALESCE(p.external_client_id, os.id_cliente) AS client_id
   FROM (((public.org_comments c
     LEFT JOIN public.org_projects p ON ((p.id = c.project_id)))
     LEFT JOIN public.ordem_servico os ON (((os.id = p.ordem_servico_id) AND (os.excluido = false))))
     LEFT JOIN public.org_tasks t ON (((t.id = c.entity_id) AND (c.entity_type = 'org_task'::public.org_comment_entity))));


--
-- Name: VIEW org_comments_feed; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.org_comments_feed IS 'Comentários com o título da entidade e o nome do projeto resolvidos (o entity_id não é FK, então o PostgREST não faz embed). NÃO filtra excluido — o consumidor filtra, conforme a convenção de soft delete do AGENTS.md.';


--
-- Name: feed_org_comments(timestamp with time zone, uuid, integer, uuid[], uuid[], uuid[], boolean, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.feed_org_comments(_cursor_created_at timestamp with time zone DEFAULT NULL::timestamp with time zone, _cursor_id uuid DEFAULT NULL::uuid, _limit integer DEFAULT 20, _client_ids uuid[] DEFAULT NULL::uuid[], _project_ids uuid[] DEFAULT NULL::uuid[], _author_ids uuid[] DEFAULT NULL::uuid[], _only_mentions boolean DEFAULT false, _since timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS SETOF public.org_comments_feed
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT f.*
    FROM public.org_comments_feed f
   WHERE f.kind = 'comment'
     AND f.excluido = false
     AND (f.created_at, f.id) < (
           COALESCE(_cursor_created_at, 'infinity'::timestamptz),
           COALESCE(_cursor_id, 'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)
         )
     AND (_client_ids  IS NULL OR f.client_id  = ANY (_client_ids))
     AND (_project_ids IS NULL OR f.project_id = ANY (_project_ids))
     AND (_author_ids  IS NULL OR f.author_id  = ANY (_author_ids))
     AND (_since IS NULL OR f.created_at >= _since)
     AND (
           COALESCE(_only_mentions, false) = false
           OR f.id IN (
                SELECT m.comment_id
                  FROM public.org_comment_mentions m
                 WHERE m.mentioned_user_id = (SELECT auth.uid())
                   AND m.motivo = 'mencao'
              )
         )
   ORDER BY f.created_at DESC, f.id DESC
   LIMIT LEAST(GREATEST(COALESCE(_limit, 20), 1), 50);
$$;


--
-- Name: FUNCTION feed_org_comments(_cursor_created_at timestamp with time zone, _cursor_id uuid, _limit integer, _client_ids uuid[], _project_ids uuid[], _author_ids uuid[], _only_mentions boolean, _since timestamp with time zone); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.feed_org_comments(_cursor_created_at timestamp with time zone, _cursor_id uuid, _limit integer, _client_ids uuid[], _project_ids uuid[], _author_ids uuid[], _only_mentions boolean, _since timestamp with time zone) IS 'Uma página do feed de conversas, em ordem cronológica decrescente. Paginação por cursor em (created_at, id) — nunca OFFSET. Filtros opcionais e cumulativos: cliente, projeto, autor, menções a mim (só motivo = mencao, não a notificação de resposta) e piso de período; parâmetro nulo = sem filtro, array vazio = nenhum resultado. A relevância vem da RLS de org_comments (função SECURITY INVOKER lendo view security_invoker).';


--
-- Name: freeze_scenario_parameters(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.freeze_scenario_parameters() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'promoted' AND OLD.status <> 'promoted' THEN
    NEW.is_locked := true;
  END IF;

  IF OLD.is_locked = true AND NEW.parameters IS DISTINCT FROM OLD.parameters THEN
    RAISE EXCEPTION 'Cenario travado: parameters nao podem ser alterados apos is_locked=true ou status=promoted';
  END IF;

  IF OLD.is_locked = false AND NEW.is_locked = true AND NEW.parameters IS DISTINCT FROM OLD.parameters THEN
    RAISE EXCEPTION 'Nao e possivel travar e alterar parameters no mesmo update';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: gargalo_cluster_visivel(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gargalo_cluster_visivel(_gargalo_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.gargalos g
        WHERE g.id = _gargalo_id
          AND g.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
      );
$$;


--
-- Name: generate_process_code(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_process_code() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_sigla   text;
  v_next    int;
  v_attempt int := 0;
  v_code    text;
BEGIN
  IF NEW.code IS NOT NULL AND length(trim(NEW.code)) > 0 THEN
    RETURN NEW;
  END IF;

  IF NEW.client_id IS NOT NULL THEN
    SELECT upper(left(regexp_replace(coalesce(name, ''), '[^a-zA-Z]', '', 'g'), 6))
      INTO v_sigla
      FROM public.catalog_clients
     WHERE id = NEW.client_id;
  END IF;

  IF v_sigla IS NULL OR length(v_sigla) = 0 THEN
    v_sigla := 'GERAL';
  END IF;

  LOOP
    v_attempt := v_attempt + 1;

    SELECT coalesce(max(
             nullif(regexp_replace(code, '^PROC-' || v_sigla || '-', ''), '')::int
           ), 0) + 1
      INTO v_next
      FROM public.processes
     WHERE code LIKE 'PROC-' || v_sigla || '-%';

    v_code := 'PROC-' || v_sigla || '-' || lpad(v_next::text, 3, '0');

    IF NOT EXISTS (SELECT 1 FROM public.processes WHERE code = v_code) THEN
      NEW.code := v_code;
      RETURN NEW;
    END IF;

    IF v_attempt >= 5 THEN
      RAISE EXCEPTION 'Falha ao gerar codigo unico para processo apos 5 tentativas (sigla=%, proximo=%)', v_sigla, v_next;
    END IF;
  END LOOP;
END;
$$;


--
-- Name: gerar_solicitacao_os(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.gerar_solicitacao_os(_cliente_id uuid, _ordem_servico_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_solicitacao uuid;
  v_criados     integer;
BEGIN
  IF NOT public.cliente_visivel_para(_cliente_id) THEN
    RAISE EXCEPTION 'cliente fora do seu escopo' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.ordem_servico os
    WHERE os.id = _ordem_servico_id
      AND os.id_cliente = _cliente_id
      AND os.excluido = false
  ) THEN
    RAISE EXCEPTION 'ordem de servico nao encontrada para este cliente' USING ERRCODE = '42501';
  END IF;

  -- Acha o cabeçalho ativo ou cria um rascunho. Quem garante que não vão
  -- existir dois é o índice único parcial uq_solicitacao_ativa_por_cliente
  -- (EDU-21), não este IF: duas chamadas simultâneas passariam pelas duas
  -- verificações.
  SELECT s.id INTO v_solicitacao
  FROM public.solicitacao s
  WHERE s.cliente_id = _cliente_id
    AND s.status <> 'encerrada'::public.osg_solicitacao_status
  LIMIT 1;

  IF v_solicitacao IS NULL THEN
    INSERT INTO public.solicitacao (cliente_id, ordem_servico_id, status)
    VALUES (_cliente_id, _ordem_servico_id, 'rascunho'::public.osg_solicitacao_status)
    RETURNING id INTO v_solicitacao;
  END IF;

  WITH itens AS (
    SELECT pdt.item_padrao_id
    FROM public.os_produtos_contratados opc
    JOIN public.produto_documento_tipo pdt
      ON pdt.produto_segmento_id = opc.produto_segmento_id
    WHERE opc.ordem_servico_id = _ordem_servico_id
    GROUP BY pdt.item_padrao_id
  ),
  novos AS (
    INSERT INTO public.solicitacao_item (
      solicitacao_id, item_padrao_id, granularidade, grupo, ordem, status
    )
    SELECT v_solicitacao, i.item_padrao_id, t.granularidade, t.grupo, t.ordem,
           'ativo'::public.osg_solicitacao_item_status
    FROM itens i
    JOIN public.documento_tipo t ON t.id = i.item_padrao_id AND t.ativo
    WHERE NOT EXISTS (
      SELECT 1 FROM public.solicitacao_item si
      WHERE si.solicitacao_id = v_solicitacao
        AND si.item_padrao_id = i.item_padrao_id
    )
    RETURNING 1
  )
  SELECT count(*) INTO v_criados FROM novos;

  RETURN v_criados;
END;
$$;


--
-- Name: FUNCTION gerar_solicitacao_os(_cliente_id uuid, _ordem_servico_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.gerar_solicitacao_os(_cliente_id uuid, _ordem_servico_id uuid) IS 'Monta a lista de documentos de uma OS na solicitação ativa do cliente, criando o cabeçalho em rascunho se ainda não houver. Uma linha por documento do produto, sem multiplicar por entidade e sem copiar texto do catálogo (documento, entidade e nota ficam nulos e a leitura herda). Idempotente: só insere o que falta, nunca atualiza nem apaga, então item manual e item dispensado sobrevivem a uma segunda execução. Não altera status nem enviada_em.';


--
-- Name: get_accessible_dashboards(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_accessible_dashboards(_target_page text DEFAULT NULL::text) RETURNS TABLE(id uuid, name text, filter_type text, target_page text, sop_url text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT d.id, d.name, d.filter_type, d.target_page, d.sop_url
  FROM public.dashboards d
  WHERE d.is_active = true
    AND (_target_page IS NULL OR d.target_page = _target_page)
    AND CASE
      WHEN d.filter_type = 'cliente' THEN
        EXISTS (
          SELECT 1 FROM public.dashboard_cliente_access dca
          WHERE dca.dashboard_id = d.id
            AND dca.cliente_id = public.resolve_user_cliente_id(auth.uid())
        )
      ELSE
        public.has_role_or_higher(auth.uid(), COALESCE(d.min_role, 'team_member'::app_role))
        AND (
          public.has_role(auth.uid(), 'admin'::app_role)
          OR d.all_clusters
          OR EXISTS (
            SELECT 1 FROM public.dashboard_cluster_access dca
            WHERE dca.dashboard_id = d.id
              AND dca.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
          )
        )
    END
  ORDER BY d.name;
$$;


--
-- Name: get_checklist_solicitado_cliente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_checklist_solicitado_cliente() RETURNS TABLE(item_id uuid, documento text, entidade text, categoria text, categoria_docbox text, nota text, confidencial boolean, rotulo_instancia text, recebido boolean, arquivo_nome text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    i.id,
    i.documento,
    i.entidade,
    i.categoria::text,
    i.categoria_docbox,
    i.nota,
    i.confidencial,
    COALESCE(
      p.denominacao,
      b.denominacao,
      CASE WHEN m.id IS NOT NULL
           THEN 'Matrícula ' || m.numero || ' (' || m.municipio_imovel || '/' || m.uf_imovel || ')'
      END
    ) AS rotulo_instancia,
    (
      i.status = 'recebido'::public.osg_checklist_status
      OR EXISTS (
        SELECT 1 FROM public.documento_arquivo d
        WHERE d.checklist_item_id = i.id
          AND d.excluido = false
          AND d.status = 'ativo'::public.osg_doc_status
      )
    ) AS recebido,
    (SELECT d.nome_original FROM public.documento_arquivo d
      WHERE d.checklist_item_id = i.id
        AND d.excluido = false
        AND d.status = 'ativo'::public.osg_doc_status
        AND d.fonte = 'cliente'::public.osg_doc_fonte
      ORDER BY d.created_at DESC
      LIMIT 1) AS arquivo_nome
  FROM public.checklist_cliente_item i
  LEFT JOIN public.pessoa    p ON p.id = i.pessoa_id
  LEFT JOIN public.bem       b ON b.id = i.bem_id
  LEFT JOIN public.matricula m ON m.id = i.matricula_id
  WHERE i.cliente_id = public.resolve_user_cliente_id(auth.uid())
    AND i.status NOT IN ('dispensado'::public.osg_checklist_status, 'nao_aplicavel'::public.osg_checklist_status)
  ORDER BY i.entidade, i.documento;
$$;


--
-- Name: get_cluster_members(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_cluster_members(_cluster_id uuid) RETURNS TABLE(id uuid, first_name text, last_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT DISTINCT p.id, p.first_name, p.last_name
  FROM public.profiles p
  WHERE public.has_role_or_higher(p.id, 'team_member'::app_role)
    AND _cluster_id IS NOT NULL
    AND (
      -- membros das equipes do cluster
      EXISTS (
        SELECT 1
        FROM public.estrutura_equipe_membros m
        JOIN public.estrutura_equipes e ON e.id = m.equipe_id
        JOIN public.estrutura_areas    a ON a.id = e.area_id
        WHERE m.user_id = p.id
          AND a.cluster_id = _cluster_id
      )
      -- gestores das equipes do cluster
      OR EXISTS (
        SELECT 1
        FROM public.estrutura_equipes e
        JOIN public.estrutura_areas   a ON a.id = e.area_id
        WHERE e.gestor_id = p.id
          AND a.cluster_id = _cluster_id
      )
      -- gestor de chamados da área
      OR EXISTS (
        SELECT 1
        FROM public.estrutura_areas a
        WHERE a.gestor_chamados_id = p.id
          AND a.cluster_id = _cluster_id
      )
    )
  ORDER BY p.first_name, p.last_name;
$$;


--
-- Name: get_clusters_do_cliente_atual(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_clusters_do_cliente_atual() RETURNS TABLE(cliente_id uuid, cluster_id uuid, cluster_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT c.id AS cliente_id,
         ec.id AS cluster_id,
         ec.name AS cluster_name
  FROM public.representante r
  JOIN public.cliente c
    ON c.id = r.id_cliente
   AND c.excluido = false
  JOIN public.cliente_clusters cc
    ON cc.cliente_id = c.id
  JOIN public.estrutura_clusters ec
    ON ec.id = cc.cluster_id
   AND ec.is_active = true
  WHERE auth.uid() IS NOT NULL
    AND r.user_id = auth.uid()
    AND r.excluido = false
  ORDER BY ec.id;
$$;


--
-- Name: get_dashboard_embed_url(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_dashboard_embed_url(_dashboard_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  d           public.dashboards%ROWTYPE;
  v_uid       uuid := auth.uid();
  v_is_admin  boolean;
  v_clusters  uuid[];
  v_scope     uuid[];
  v_cliente   uuid;
  v_value     text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'unauthenticated');
  END IF;

  SELECT * INTO d FROM public.dashboards WHERE id = _dashboard_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  v_is_admin := public.has_role(v_uid, 'admin'::app_role);

  IF d.filter_type = 'cliente' THEN
    v_cliente := public.resolve_user_cliente_id(v_uid);
    IF v_cliente IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.dashboard_cliente_access dca
      WHERE dca.dashboard_id = d.id AND dca.cliente_id = v_cliente
    ) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_access');
    END IF;
    v_value := v_cliente::text;

  ELSE
    IF NOT public.has_role_or_higher(v_uid, COALESCE(d.min_role, 'team_member'::app_role)) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_access');
    END IF;
    v_clusters := public.resolve_user_cluster_ids(v_uid);

    IF NOT (
      v_is_admin
      OR d.all_clusters
      OR EXISTS (
        SELECT 1 FROM public.dashboard_cluster_access dca
        WHERE dca.dashboard_id = d.id AND dca.cluster_id = ANY (v_clusters)
      )
    ) THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_access');
    END IF;

    IF d.filter_type = 'nenhum' THEN
      RETURN jsonb_build_object('ok', true, 'reason', 'ok',
        'embed_url', d.embed_url, 'param_names', to_jsonb(d.param_names), 'value', NULL);
    END IF;

    IF d.all_clusters THEN
      SELECT array_agg(ec.id) INTO v_scope
      FROM public.estrutura_clusters ec WHERE ec.is_active = true;
    ELSE
      SELECT array_agg(dca.cluster_id) INTO v_scope
      FROM public.dashboard_cluster_access dca
      JOIN public.estrutura_clusters ec ON ec.id = dca.cluster_id AND ec.is_active = true
      WHERE dca.dashboard_id = d.id;
    END IF;

    IF v_is_admin THEN
      SELECT array_to_string(array_agg(DISTINCT x ORDER BY x), ',')
      INTO v_value FROM unnest(v_scope) AS x;
    ELSE
      SELECT array_to_string(array_agg(DISTINCT x ORDER BY x), ',')
      INTO v_value FROM unnest(v_clusters) AS x WHERE x = ANY (v_scope);
    END IF;

    IF v_value IS NULL OR v_value = '' THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_filter_value');
    END IF;
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'ok',
    'embed_url', d.embed_url, 'param_names', to_jsonb(d.param_names), 'value', v_value);
END;
$$;


--
-- Name: FUNCTION get_dashboard_embed_url(_dashboard_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_dashboard_embed_url(_dashboard_id uuid) IS 'Resolve o valor do filtro (cluster/cliente) server-side p/ o usuário logado. Fail-closed.';


--
-- Name: get_internal_users(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_internal_users() RETURNS TABLE(id uuid, first_name text, last_name text)
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF auth.uid() IS NULL
     OR NOT public.has_role_or_higher(auth.uid(), 'team_member'::app_role) THEN
    RETURN;
  END IF;
  RETURN QUERY
    SELECT p.id, p.first_name, p.last_name
    FROM public.profiles p
    WHERE public.has_role_or_higher(p.id, 'team_member'::app_role)
    ORDER BY p.first_name, p.last_name;
END
$$;


--
-- Name: get_ordens_by_client_name(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ordens_by_client_name(p_client_id uuid) RETURNS SETOF public.ordem_servico
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select os.*
    from ordem_servico os
   where os.id_cliente in (
           select c2.id
             from cliente c2
            where public.nome_cliente_normalizado(c2.nome)
                = public.nome_cliente_normalizado(
                    (select nome from cliente where id = p_client_id limit 1))
              and c2.ambiente = (select ambiente from cliente where id = p_client_id)
              and c2.excluido = false)
     and os.excluido = false
   order by os.created_at desc;
$$;


--
-- Name: FUNCTION get_ordens_by_client_name(p_client_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_ordens_by_client_name(p_client_id uuid) IS 'OS de todos os cadastros de cliente com o mesmo nome normalizado, restrito ao MESMO ambiente do cliente informado. O casamento por nome atende grupo economico com cadastros homonimos; o recorte de ambiente impede que a tela de projeto ofereca OS de dev para cliente de prod e vice-versa.';


--
-- Name: get_pendencias_documentos_cliente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_pendencias_documentos_cliente() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH cli AS (
    SELECT public.resolve_user_cliente_id(auth.uid()) AS id
  ),
  sol AS (
    SELECT s.id, s.status, s.enviada_em, s.encerrada_em
      FROM public.solicitacao s
      CROSS JOIN cli
     WHERE s.cliente_id = cli.id
       AND s.status IN ('em_checklist'::public.osg_solicitacao_status,
                        'encerrada'::public.osg_solicitacao_status)
     ORDER BY (s.status = 'em_checklist'::public.osg_solicitacao_status) DESC,
              COALESCE(s.encerrada_em, s.enviada_em, s.created_at) DESC
     LIMIT 1
  ),
  inst AS (
    SELECT 'pessoa'::text AS kind,
           p.id,
           p.denominacao AS nome,
           NULL::text AS detalhe,
           CASE WHEN p.tipo_pessoa = 'PJ' THEN 'pessoa_pj' ELSE 'pessoa_pf' END AS grao
      FROM public.pessoa p
      CROSS JOIN cli
     WHERE p.cliente_id = cli.id
    UNION ALL
    SELECT 'bem',
           b.id,
           NULLIF(CONCAT_WS(' · ', NULLIF(b.referencia_dp, ''), NULLIF(b.denominacao, '')), ''),
           NULL,
           'bem'
      FROM public.bem b
      CROSS JOIN cli
     WHERE b.cliente_id = cli.id
    UNION ALL
    SELECT 'matricula',
           m.id,
           COALESCE(NULLIF(bm.denominacao, ''), NULLIF(bm.referencia_dp, ''), 'Matrícula ' || m.numero),
           CASE WHEN COALESCE(NULLIF(bm.denominacao, ''), NULLIF(bm.referencia_dp, '')) IS NOT NULL
                THEN 'Matrícula ' || m.numero END,
           CASE WHEN m.tipo_bem = 'IR' THEN 'matricula_rural' ELSE 'matricula_urbana' END
      FROM public.matricula m
      LEFT JOIN public.bem bm ON bm.id = m.bem_id
      CROSS JOIN cli
     WHERE bm.cliente_id = cli.id
        OR EXISTS (SELECT 1
                     FROM public.titularidade t
                     JOIN public.pessoa tp ON tp.id = t.titular_pessoa_id
                    WHERE t.matricula_id = m.id
                      AND tp.cliente_id = cli.id)
    UNION ALL
    SELECT 'cliente', NULL::uuid, 'Documentos gerais', NULL, 'cliente' FROM cli
  ),
  itens AS (
    SELECT i.id,
           COALESCE(i.item_padrao_id, av.id) AS documento_tipo_id,
           i.grupo,
           COALESCE(i.documento, t.documento) AS documento,
           COALESCE(i.nota, t.nota) AS nota,
           i.granularidade,
           i.ordem
      FROM public.solicitacao_item i
      JOIN sol ON sol.id = i.solicitacao_id
      LEFT JOIN public.documento_tipo t ON t.id = i.item_padrao_id
      LEFT JOIN public.documento_tipo av ON av.solicitacao_item_id = i.id AND av.ativo
     WHERE i.status = 'ativo'::public.osg_solicitacao_item_status
  ),
  arq AS (
    SELECT da.id,
           da.nome_original,
           da.created_at,
           da.fonte,
           da.revisao,
           da.revisao_motivo,
           da.documento_tipo_id,
           CASE WHEN da.pessoa_id IS NOT NULL THEN 'pessoa'
                WHEN da.bem_id IS NOT NULL THEN 'bem'
                WHEN da.matricula_id IS NOT NULL THEN 'matricula'
                ELSE 'cliente' END AS kind,
           COALESCE(da.pessoa_id, da.bem_id, da.matricula_id) AS alvo_id
      FROM public.documento_arquivo da
      CROSS JOIN cli
     WHERE da.cliente_id = cli.id
       AND da.excluido = false
       AND da.status = 'ativo'::public.osg_doc_status
       AND da.documento_tipo_id IS NOT NULL
  ),
  linhas AS (
    SELECT it.id AS solicitacao_item_id,
           it.documento_tipo_id,
           it.grupo,
           it.documento,
           it.nota,
           it.granularidade,
           it.ordem,
           inst.kind,
           inst.id AS alvo_id,
           inst.nome,
           inst.detalhe,
           a.arquivos_cliente,
           a.tem_arquivo,
           a.tem_interno
      FROM itens it
      JOIN inst ON inst.grao = it.granularidade
      LEFT JOIN LATERAL (
        SELECT COALESCE(
                 JSONB_AGG(JSONB_BUILD_OBJECT('id',      x.id,
                                              'nome',    x.nome_original,
                                              'revisao', x.revisao,
                                              'motivo',  x.revisao_motivo)
                           ORDER BY x.created_at)
                 FILTER (WHERE x.fonte = 'cliente'::public.osg_doc_fonte),
                 '[]'::jsonb) AS arquivos_cliente,
               COUNT(*) FILTER (
                 WHERE x.revisao <> 'recusado'::public.osg_doc_revisao) > 0 AS tem_arquivo,
               COALESCE(BOOL_OR(x.fonte <> 'cliente'::public.osg_doc_fonte
                                AND x.revisao <> 'recusado'::public.osg_doc_revisao), false) AS tem_interno
          FROM arq x
         WHERE x.documento_tipo_id = it.documento_tipo_id
           AND x.kind = inst.kind
           AND x.alvo_id IS NOT DISTINCT FROM inst.id
      ) a ON true
     WHERE NOT EXISTS (
             SELECT 1
               FROM public.solicitacao_item_nao_aplicavel na
              WHERE na.solicitacao_item_id = it.id
                AND ((inst.kind = 'pessoa' AND na.pessoa_id = inst.id)
                  OR (inst.kind = 'bem' AND na.bem_id = inst.id)
                  OR (inst.kind = 'matricula' AND na.matricula_id = inst.id)))
  )
  SELECT JSONB_BUILD_OBJECT(
    'solicitacao',
      (SELECT JSONB_BUILD_OBJECT(
                'id',           sol.id,
                'status',       sol.status,
                'enviada_em',   sol.enviada_em,
                'encerrada_em', sol.encerrada_em)
         FROM sol),
    'pendencias',
      COALESCE(
        (SELECT JSONB_AGG(
                  JSONB_BUILD_OBJECT(
                    'solicitacao_item_id', l.solicitacao_item_id,
                    'documento_tipo_id',   l.documento_tipo_id,
                    'grupo',               l.grupo,
                    'documento',           l.documento,
                    'nota',                l.nota,
                    'granularidade',       l.granularidade,
                    'alvo', JSONB_BUILD_OBJECT(
                              'kind',    l.kind,
                              'id',      l.alvo_id,
                              'nome',    l.nome,
                              'detalhe', l.detalhe),
                    'recebido',          COALESCE(l.tem_arquivo, false),
                    'recebido_interno',  COALESCE(l.tem_interno, false),
                    'arquivos',          COALESCE(l.arquivos_cliente, '[]'::jsonb))
                  ORDER BY l.grupo, l.ordem, l.documento, l.nome)
           FROM linhas l),
        '[]'::jsonb)
  );
$$;


--
-- Name: FUNCTION get_pendencias_documentos_cliente(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_pendencias_documentos_cliente() IS 'Fase de checklist do portal do cliente: uma linha por documento pedido × entidade do cadastro, com documento_tipo_id e alvo (para o upload nascer classificado), o que já chegou e a nota do pedido. Multiplica dentro da função porque o portal não lê pessoa/bem/matricula: só o nome da entidade sai daqui. Item dispensado e instância marcada como não aplicável não viram linha. Arquivo subido pela PSA conta como recebido (sinalizado em recebido_interno) mas não é exposto na lista de arquivos. Sem solicitação em em_checklist nem encerrada, devolve solicitacao nula e pendencias vazio. A solicitação INICIAL continua sendo lida por get_solicitacao_ativa_cliente, que esta função não substitui.';


--
-- Name: get_profiles_with_email(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profiles_with_email() RETURNS TABLE(id uuid, first_name text, last_name text, email text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p.id, p.first_name, p.last_name, p.email
  FROM public.profiles p
  WHERE has_role(auth.uid(), 'admin'::app_role)
     OR has_role(auth.uid(), 'team_member'::app_role)
     OR has_role(auth.uid(), 'lider'::app_role)
     OR has_role(auth.uid(), 'sublider'::app_role);
$$;


--
-- Name: get_profiles_with_min_role(public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_profiles_with_min_role(_minimum_role public.app_role) RETURNS TABLE(id uuid, first_name text, last_name text, email text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p.id, p.first_name, p.last_name, p.email
  FROM public.profiles p
  WHERE public.has_role_or_higher(p.id, _minimum_role)
$$;


--
-- Name: get_solicitacao_ativa_cliente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_solicitacao_ativa_cliente() RETURNS jsonb
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  WITH s AS (
    SELECT sol.id, sol.status, sol.enviada_em, sol.encerrada_em
    FROM public.solicitacao sol
    WHERE sol.cliente_id = public.resolve_user_cliente_id(auth.uid())
    ORDER BY sol.encerrada_em DESC NULLS FIRST, sol.created_at DESC
    LIMIT 1
  )
  SELECT jsonb_build_object(
    'solicitacao',
      (SELECT jsonb_build_object(
                'id',           s.id,
                'status',       s.status,
                'enviada_em',   s.enviada_em,
                'encerrada_em', s.encerrada_em
              )
         FROM s),
    'itens',
      COALESCE(
        (SELECT jsonb_agg(
                  jsonb_build_object(
                    'id',        i.id,
                    'grupo',     i.grupo,
                    'documento', COALESCE(i.documento, t.documento),
                    'nota',      COALESCE(i.nota,      t.nota),
                    'entidade',  COALESCE(i.entidade,  t.entidade),
                    'ordem',     i.ordem
                  )
                  ORDER BY i.grupo, i.ordem, COALESCE(i.documento, t.documento)
                )
           FROM public.solicitacao_item i
           JOIN s ON s.id = i.solicitacao_id
           LEFT JOIN public.documento_tipo t ON t.id = i.item_padrao_id
          WHERE i.status = 'ativo'::public.osg_solicitacao_item_status
            AND s.status <> 'rascunho'::public.osg_solicitacao_status),
        '[]'::jsonb)
  );
$$;


--
-- Name: FUNCTION get_solicitacao_ativa_cliente(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.get_solicitacao_ativa_cliente() IS 'Entrega ao portal do cliente a solicitação dele em QUALQUER status, para a tela poder decidir se libera o envio, e os itens ativos apenas quando o status já saiu de rascunho. Escolhe a não encerrada, ou a última encerrada. Sem solicitação, devolve solicitacao nula e itens vazio (nunca null puro, para o front tratar um formato só). documento, entidade e nota herdam de documento_tipo quando nulos na linha.';


--
-- Name: get_ticket_atendentes(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ticket_atendentes(_ticket_ids uuid[]) RETURNS TABLE(ticket_id uuid, first_name text, last_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT t.id, p.first_name, p.last_name
  FROM public.tickets t
  JOIN public.profiles p ON p.id = t.assigned_to
  WHERE auth.uid() IS NOT NULL
    AND _ticket_ids IS NOT NULL
    AND t.id = ANY(_ticket_ids)
    AND public.can_view_ticket(t.id);
$$;


--
-- Name: get_uploader_names(uuid[]); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_uploader_names(_ids uuid[]) RETURNS TABLE(user_id uuid, display_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT DISTINCT
    p.id,
    NULLIF(BTRIM(COALESCE(p.first_name, '') || ' ' || COALESCE(p.last_name, '')), '')
  FROM public.profiles p
  WHERE p.id = ANY(_ids)
    AND EXISTS (
      SELECT 1
      FROM public.documento_arquivo d
      WHERE d.created_by = p.id
        AND d.excluido = false
        AND (
          public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
          OR d.cliente_id = public.resolve_user_cliente_id(auth.uid())
        )
    );
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
    NULLIF(NEW.raw_user_meta_data->>'last_name', ''),
    NEW.email
  );

  IF COALESCE((NEW.raw_user_meta_data->>'skip_default_role')::boolean, false) IS NOT TRUE THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'client');
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: has_role(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role(_user_id uuid, _role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;


--
-- Name: has_role_or_higher(uuid, public.app_role); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.has_role_or_higher(_user_id uuid, _minimum_role public.app_role) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id
    AND CASE _minimum_role
      WHEN 'team_member' THEN role IN ('team_member','sublider','lider','admin')
      WHEN 'sublider'    THEN role IN ('sublider','lider','admin')
      WHEN 'lider'       THEN role IN ('lider','admin')
      WHEN 'admin'       THEN role = 'admin'
      ELSE false
    END
  )
$$;


--
-- Name: is_area_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_area_member(_user_id uuid, _estrutura_area_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM estrutura_equipe_membros em
    JOIN estrutura_equipes eq ON eq.id = em.equipe_id
    WHERE em.user_id = _user_id AND eq.area_id = _estrutura_area_id
    UNION ALL
    SELECT 1 FROM estrutura_equipes eq
    WHERE eq.gestor_id = _user_id AND eq.area_id = _estrutura_area_id
  );
$$;


--
-- Name: is_membro_digital(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_membro_digital(p_uid uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM estrutura_equipe_membros m
    JOIN estrutura_equipes e ON e.id = m.equipe_id
    WHERE m.user_id = p_uid
      AND e.area_id = '52f0596b-2904-4f76-a22d-2bad80350458'
  );
$$;


--
-- Name: is_project_member(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_project_member(_user_id uuid, _project_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_project_members
    WHERE user_id = _user_id
      AND project_id = _project_id
  )
$$;


--
-- Name: is_ticket_assigned_to(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_ticket_assigned_to(p_ticket_id uuid, p_user_id uuid) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM tickets
    WHERE id = p_ticket_id AND assigned_to = p_user_id
  );
$$;


--
-- Name: is_valid_org_task_reviewer(uuid, uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.is_valid_org_task_reviewer(_reviewer_id uuid, _project_id uuid, _assigned_to uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT _reviewer_id IS NOT NULL
     AND _project_id IS NOT NULL
     AND _reviewer_id IS DISTINCT FROM _assigned_to
     AND public.has_role_or_higher(_reviewer_id, 'sublider'::public.app_role)
     AND public.org_project_cluster_ids(_project_id)
         && public.resolve_user_cluster_ids(_reviewer_id);
$$;


--
-- Name: FUNCTION is_valid_org_task_reviewer(_reviewer_id uuid, _project_id uuid, _assigned_to uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.is_valid_org_task_reviewer(_reviewer_id uuid, _project_id uuid, _assigned_to uuid) IS 'Valida papel sublider+ e vinculo entre o revisor e pelo menos um cluster do projeto.';


--
-- Name: list_profiles_safe(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.list_profiles_safe() RETURNS TABLE(id uuid, first_name text, last_name text)
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT p.id, p.first_name, p.last_name
  FROM public.profiles p
  WHERE public.has_role_or_higher(auth.uid(), 'team_member'::app_role);
$$;


--
-- Name: mapa_uuid(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mapa_uuid(slug text) RETURNS uuid
    LANGUAGE sql IMMUTABLE
    AS $$ SELECT md5('mapa-osg:' || slug)::uuid $$;


--
-- Name: mark_stuck_procedimentos(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.mark_stuck_procedimentos(timeout_minutes integer DEFAULT 15) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.procedimentos
     SET status_geracao = 'erro',
         erro_mensagem  = COALESCE(erro_mensagem, 'Processamento expirado (timeout)')
   WHERE status_geracao = 'processando'
     AND created_at < now() - make_interval(mins => timeout_minutes);

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;


--
-- Name: matricula_definir_cliente(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.matricula_definir_cliente() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: melhoria_cluster_visivel(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.melhoria_cluster_visivel(_melhoria_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.process_improvements pi
        WHERE pi.id = _melhoria_id
          AND pi.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
      );
$$;


--
-- Name: nome_cliente_normalizado(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.nome_cliente_normalizado(p_nome text) RETURNS text
    LANGUAGE sql IMMUTABLE PARALLEL SAFE
    SET search_path TO 'public'
    AS $$
  SELECT lower(btrim(regexp_replace(coalesce(p_nome, ''), '\s+', ' ', 'g')));
$$;


--
-- Name: FUNCTION nome_cliente_normalizado(p_nome text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.nome_cliente_normalizado(p_nome text) IS 'Forma canônica de um nome de cliente para comparação (minúsculas, espaço aparado e colapsado). Gêmea de chaveDeNomeCliente em src/lib/nomeProprio.ts: mudou uma, muda a outra.';


--
-- Name: notificar_documento_recebido(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notificar_documento_recebido() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare
  v_nome   text;
  v_dono   uuid;
  v_gestor uuid;
  v_chave  text;
begin
  begin
    v_chave := 'documento_recebido:' || NEW.cliente_id::text || ':' ||
               to_char(now(), 'YYYY-MM-DD');

    select c.nome into v_nome from public.cliente c where c.id = NEW.cliente_id;

    -- `solicitacao` nao tem coluna ambiente, entao nao ha ambiente a cruzar aqui.
    select s.created_by into v_dono
      from public.solicitacao s
     where s.cliente_id = NEW.cliente_id
       and s.status <> 'encerrada'::public.osg_solicitacao_status
     order by s.created_at desc
     limit 1;

    if v_dono is not null then
      perform public.criar_notificacao(
        v_dono, 'documento_recebido',
        'Documento recebido de ' || coalesce(v_nome, 'cliente'),
        'cliente', NEW.cliente_id,
        null,     -- corpo
        null,     -- href: sem tela de destino por cliente, ver cabecalho
        v_chave,
        -- ambiente NAO filtra o disparo, mas entra nos metadados para o item do
        -- sino nao misturar dev e prod.
        jsonb_build_object('ambiente', NEW.ambiente));
    else
      -- Sem solicitacao ativa, o aviso vai para os gestores de chamados. Se nao
      -- houver nenhum, o laco nao itera e o trigger sai em silencio.
      for v_gestor in
        select distinct a.gestor_chamados_id
          from public.estrutura_areas a
         where a.is_active and a.gestor_chamados_id is not null
      loop
        perform public.criar_notificacao(
          v_gestor, 'documento_recebido',
          'Documento recebido de ' || coalesce(v_nome, 'cliente'),
          'cliente', NEW.cliente_id,
          null, null, v_chave,
          jsonb_build_object('ambiente', NEW.ambiente));
      end loop;
    end if;
  exception when others then
    raise warning 'notificar_documento_recebido: %', sqlerrm;
  end;
  return NEW;
end $$;


--
-- Name: FUNCTION notificar_documento_recebido(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.notificar_documento_recebido() IS 'Avisa a PSA que o cliente anexou arquivo. Agrupa por cliente e por dia. Corpo protegido por bloco de excecao porque o insert vem do navegador do cliente e uma falha derrubaria o upload.';


--
-- Name: notificar_tarefa_atribuida(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notificar_tarefa_atribuida() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
begin
  -- Falha do aviso nunca derruba a escrita principal (molde 20260731120000).
  begin
    perform public.criar_notificacao(
      NEW.assigned_to, 'tarefa_atribuida',
      'Voce e o responsavel: ' || NEW.title,
      'org_task', NEW.id,
      null,  -- corpo
      null,  -- href: derivado no front, ver decisoes no cabecalho
      'tarefa_atribuida:' || NEW.id::text);
  exception when others then
    raise warning 'notificar_tarefa_atribuida: %', sqlerrm;
  end;
  return NEW;
end $$;


--
-- Name: FUNCTION notificar_tarefa_atribuida(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.notificar_tarefa_atribuida() IS 'Avisa o novo responsavel da tarefa. Agrupa por tarefa: reatribuir tres vezes nao gera tres avisos.';


--
-- Name: notificar_tarefa_em_revisao(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.notificar_tarefa_em_revisao() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
declare v_lider uuid;
begin
  begin
    select p.leader_id into v_lider
      from public.org_projects p where p.id = NEW.project_id;

    -- Projeto sem lider sai em silencio, sem excecao. Nao e caso hipotetico:
    -- medidos 3 projetos com tarefa e sem lider, somando 11 tarefas.
    if v_lider is null then return NEW; end if;

    -- Lider que TAMBEM e o revisor recebe UM aviso so, e e o derivado de
    -- "tarefa para voce revisar". Sem esta guarda seriam 16 tarefas com linha
    -- duplicada para a mesma pessoa.
    if NEW.reviewer_id is not null and NEW.reviewer_id = v_lider then
      return NEW;
    end if;

    perform public.criar_notificacao(
      v_lider, 'tarefa_em_revisao',
      'Tarefa em revisao: ' || NEW.title,
      'org_task', NEW.id,
      null,  -- corpo
      null,  -- href: derivado no front, ver decisoes no cabecalho
      'tarefa_em_revisao:' || NEW.id::text);
  exception when others then
    raise warning 'notificar_tarefa_em_revisao: %', sqlerrm;
  end;
  return NEW;
end $$;


--
-- Name: FUNCTION notificar_tarefa_em_revisao(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.notificar_tarefa_em_revisao() IS 'Avisa o lider do projeto que a tarefa entrou em revisao. Sai em silencio se o projeto nao tem lider ou se o lider e o proprio revisor.';


--
-- Name: org_comment_mentions_guard_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_comment_mentions_guard_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.comment_id IS DISTINCT FROM OLD.comment_id
     OR NEW.mentioned_user_id IS DISTINCT FROM OLD.mentioned_user_id
     OR NEW.motivo IS DISTINCT FROM OLD.motivo
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Menção: apenas lido_em pode ser alterado' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: org_comments_guard_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_comments_guard_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF NEW.id          IS DISTINCT FROM OLD.id
  OR NEW.entity_type IS DISTINCT FROM OLD.entity_type
  OR NEW.entity_id   IS DISTINCT FROM OLD.entity_id
  OR NEW.project_id  IS DISTINCT FROM OLD.project_id
  OR NEW.kind        IS DISTINCT FROM OLD.kind
  OR NEW.author_id   IS DISTINCT FROM OLD.author_id
  OR NEW.created_at  IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Colunas imutáveis do comentário não podem ser alteradas'
      USING ERRCODE = '42501';
  END IF;

  IF v_uid IS NOT NULL AND v_uid = OLD.author_id THEN
    IF NEW.body IS DISTINCT FROM OLD.body THEN
      NEW.editado_em := now();
    END IF;
    IF OLD.excluido = false AND NEW.excluido = true THEN
      NEW.excluido_em  := now();
      NEW.excluido_por := v_uid;
    END IF;
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF OLD.excluido = false AND NEW.excluido = true THEN
    IF NEW.parent_id   IS DISTINCT FROM OLD.parent_id
    OR NEW.body        IS DISTINCT FROM OLD.body
    OR NEW.metadata    IS DISTINCT FROM OLD.metadata
    OR NEW.author_name IS DISTINCT FROM OLD.author_name
    OR NEW.editado_em  IS DISTINCT FROM OLD.editado_em THEN
      RAISE EXCEPTION 'Não autor só pode marcar o comentário como excluído'
        USING ERRCODE = '42501';
    END IF;
    NEW.excluido_em  := now();
    NEW.excluido_por := v_uid;
    NEW.updated_at   := now();
    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'Somente o autor pode editar este comentário'
    USING ERRCODE = '42501';
END;
$$;


--
-- Name: org_comments_resolve_scope(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_comments_resolve_scope() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_project_id uuid;
BEGIN
  IF NEW.entity_type = 'org_project'::public.org_comment_entity THEN
    IF NOT EXISTS (SELECT 1 FROM public.org_projects WHERE id = NEW.entity_id) THEN
      RAISE EXCEPTION 'Projeto % nao encontrado', NEW.entity_id USING ERRCODE = '23503';
    END IF;
    NEW.project_id := NEW.entity_id;
  ELSIF NEW.entity_type = 'org_task'::public.org_comment_entity THEN
    SELECT t.project_id INTO v_project_id FROM public.org_tasks t WHERE t.id = NEW.entity_id;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Tarefa % nao encontrada', NEW.entity_id USING ERRCODE = '23503';
    END IF;
    IF v_project_id IS NULL THEN
      RAISE EXCEPTION 'Tarefa % nao possui projeto vinculado', NEW.entity_id USING ERRCODE = '23502';
    END IF;
    NEW.project_id := v_project_id;
  ELSE
    RAISE EXCEPTION 'entity_type invalido: %', NEW.entity_type USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: org_comments_validate_parent(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_comments_validate_parent() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_parent public.org_comments%ROWTYPE;
BEGIN
  IF NEW.parent_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_parent FROM public.org_comments WHERE id = NEW.parent_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Comentario pai % nao encontrado', NEW.parent_id USING ERRCODE = '23503';
  END IF;

  IF v_parent.parent_id IS NOT NULL THEN
    RAISE EXCEPTION 'Nao e permitido responder uma resposta (thread de um nivel so)' USING ERRCODE = '23514';
  END IF;

  IF v_parent.entity_type IS DISTINCT FROM NEW.entity_type
     OR v_parent.entity_id IS DISTINCT FROM NEW.entity_id THEN
    RAISE EXCEPTION 'Resposta deve estar no mesmo escopo do comentario pai' USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: org_project_cluster_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_project_cluster_ids(_project_id uuid) RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(array_agg(DISTINCT cid), '{}')
  FROM (
    SELECT a.cluster_id AS cid
    FROM public.org_projects p
    JOIN public.estrutura_areas a ON a.id = p.estrutura_area_id
    WHERE p.id = _project_id AND a.cluster_id IS NOT NULL
    UNION
    SELECT unnest(public.resolve_user_cluster_ids(opm.user_id)) AS cid
    FROM public.org_project_members opm
    WHERE opm.project_id = _project_id
  ) s
  WHERE cid IS NOT NULL;
$$;


--
-- Name: org_task_visivel(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_task_visivel(p_task_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.org_tasks t
    WHERE t.id = p_task_id
      AND (
        public.has_role(auth.uid(), 'admin'::public.app_role)
        OR (
          t.project_id IS NOT NULL
          AND (
            public.has_role(auth.uid(), 'lider'::public.app_role)
            OR public.has_role(auth.uid(), 'sublider'::public.app_role)
          )
          AND public.can_view_org_project(auth.uid(), t.project_id)
        )
        OR t.assigned_to = auth.uid()
        OR t.created_by = auth.uid()
        OR (
          t.reviewer_id = auth.uid()
          AND t.status = 'review'::public.fiscal_task_status
        )
      )
  );
$$;


--
-- Name: org_tasks_cascade_delete_comments(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_tasks_cascade_delete_comments() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.org_comments
   WHERE entity_type = 'org_task'::public.org_comment_entity
     AND entity_id = OLD.id;
  RETURN OLD;
END;
$$;


--
-- Name: org_tasks_team_member_status_only(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_tasks_team_member_status_only() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_user_id uuid := auth.uid();
BEGIN
  IF OLD.reviewer_id = v_user_id
     AND OLD.assigned_to IS DISTINCT FROM v_user_id
     AND OLD.status IS DISTINCT FROM 'done'::public.fiscal_task_status
     AND NEW.status = 'done'::public.fiscal_task_status THEN
    RAISE EXCEPTION 'O revisor nao pode concluir a tarefa; devolva para ajustes'
      USING ERRCODE = '42501';
  END IF;

  IF OLD.reviewer_id = v_user_id
     AND OLD.assigned_to IS DISTINCT FROM v_user_id
     AND OLD.status = 'review'::public.fiscal_task_status THEN
    IF (to_jsonb(NEW) - 'status' - 'updated_at')
       IS DISTINCT FROM
       (to_jsonb(OLD) - 'status' - 'updated_at') THEN
      RAISE EXCEPTION 'O revisor so pode devolver a tarefa para ajustes'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.status NOT IN (
      'review'::public.fiscal_task_status,
      'em_ajuste'::public.fiscal_task_status
    ) THEN
      RAISE EXCEPTION 'O revisor so pode devolver a tarefa para ajustes'
        USING ERRCODE = '42501';
    END IF;

    RETURN NEW;
  END IF;

  IF public.has_role_or_higher(v_user_id, 'sublider'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- team_member CRIADOR pode editar por inteiro a propria tarefa.
  -- Guardrail: created_by imutavel.
  IF OLD.created_by = v_user_id THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      RAISE EXCEPTION 'Nao e permitido alterar o criador da tarefa (created_by)'
        USING ERRCODE = '42501';
    END IF;
    RETURN NEW;
  END IF;

  -- team_member nao-criador (tarefa delegada): so status, horas e revisor.
  IF (to_jsonb(NEW) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id')
     IS DISTINCT FROM
     (to_jsonb(OLD) - 'status' - 'updated_at' - 'estimated_hours' - 'actual_hours' - 'reviewer_id') THEN
    RAISE EXCEPTION 'Tarefa delegada: team_member so pode alterar status, horas e revisor (RLS-06)'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: own_org_task_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.own_org_task_ids(_uid uuid) RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(array_agg(DISTINCT t.id), '{}')::uuid[]
  FROM public.org_tasks t
  WHERE t.assigned_to = _uid
     OR t.created_by = _uid
     OR (t.reviewer_id = _uid AND t.status = 'review'::public.fiscal_task_status);
$$;


--
-- Name: pode_gerenciar_novidades(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.pode_gerenciar_novidades(_user_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role_or_higher(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'marketing'::public.app_role)
$$;


--
-- Name: FUNCTION pode_gerenciar_novidades(_user_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.pode_gerenciar_novidades(_user_id uuid) IS 'Quem cria, edita, apaga e enxerga novidades inativas: admin ou marketing.';


--
-- Name: precheck_allowed_ops(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.precheck_allowed_ops(p_table text) RETURNS text[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT allowed_ops
    FROM public.rls_precheck_allowed_tables
   WHERE table_name = p_table;
$$;


--
-- Name: FUNCTION precheck_allowed_ops(p_table text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.precheck_allowed_ops(p_table text) IS 'Lê a whitelist do precheck sem depender do papel do chamador. A tabela rls_precheck_allowed_tables segue restrita a team_member+ para leitura direta; só esta função a atravessa, e devolve apenas nome de tabela/ops. Existe porque can_perform é SECURITY INVOKER e a role client precisa conseguir prechecar as próprias linhas.';


--
-- Name: preview_dashboard_embed_url(uuid, text, uuid[], uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.preview_dashboard_embed_url(_dashboard_id uuid, _mode text, _cluster_ids uuid[] DEFAULT '{}'::uuid[], _user_id uuid DEFAULT NULL::uuid, _cliente_id uuid DEFAULT NULL::uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  d           public.dashboards%ROWTYPE;
  cluster_ids uuid[];
  cliente_id  uuid;
  v_value     text;
BEGIN
  IF NOT public.has_role_or_higher(auth.uid(), 'lider'::app_role) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'forbidden');
  END IF;

  SELECT * INTO d FROM public.dashboards WHERE id = _dashboard_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_found');
  END IF;

  IF d.filter_type = 'nenhum' THEN
    RETURN jsonb_build_object('ok', true, 'reason', 'ok',
      'embed_url', d.embed_url, 'param_names', to_jsonb(d.param_names), 'value', NULL);

  ELSIF d.filter_type = 'cluster' THEN
    IF _mode = 'user' THEN
      IF _user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_target'); END IF;
      cluster_ids := public.resolve_user_cluster_ids(_user_id);
    ELSIF _mode = 'cluster' THEN
      cluster_ids := _cluster_ids;
    ELSE
      RETURN jsonb_build_object('ok', false, 'reason', 'mode_mismatch');
    END IF;
    IF cluster_ids IS NULL OR array_length(cluster_ids, 1) IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_filter_value');
    END IF;
    SELECT array_to_string(array_agg(DISTINCT x ORDER BY x), ',') INTO v_value
    FROM unnest(cluster_ids) AS x;

  ELSIF d.filter_type = 'cliente' THEN
    IF _mode = 'user' THEN
      IF _user_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_target'); END IF;
      cliente_id := public.resolve_user_cliente_id(_user_id);
    ELSIF _mode = 'cliente' THEN
      cliente_id := _cliente_id;
    ELSE
      RETURN jsonb_build_object('ok', false, 'reason', 'mode_mismatch');
    END IF;
    IF cliente_id IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'no_filter_value');
    END IF;
    v_value := cliente_id::text;

  ELSE
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_filter_type');
  END IF;

  RETURN jsonb_build_object('ok', true, 'reason', 'ok',
    'embed_url', d.embed_url, 'param_names', to_jsonb(d.param_names), 'value', v_value);
END;
$$;


--
-- Name: FUNCTION preview_dashboard_embed_url(_dashboard_id uuid, _mode text, _cluster_ids uuid[], _user_id uuid, _cliente_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.preview_dashboard_embed_url(_dashboard_id uuid, _mode text, _cluster_ids uuid[], _user_id uuid, _cliente_id uuid) IS 'Preview admin (lider+): resolve o filtro do dashboard para um alvo (usuário/cluster/cliente). Fail-closed.';


--
-- Name: process_stage_cluster_visivel(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_stage_cluster_visivel(_etapa_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(auth.uid(), 'admin'::app_role)
      OR EXISTS (
        SELECT 1 FROM public.process_stages ps
        JOIN public.processes p ON p.id = ps.process_id
        WHERE ps.id = _etapa_id
          AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
      );
$$;


--
-- Name: process_stages_cascade_as_is_delete(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.process_stages_cascade_as_is_delete() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.scenario = 'AS-IS' THEN
    DELETE FROM public.process_stages
     WHERE scenario = 'TO-BE'
       AND stage_as_is_id = OLD.id;
  END IF;
  RETURN OLD;
END;
$$;


--
-- Name: psa_mapa_uuid(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.psa_mapa_uuid(slug text) RETURNS uuid
    LANGUAGE sql IMMUTABLE
    AS $$
  SELECT md5('mapa-psa-inplace:' || slug)::uuid
$$;


--
-- Name: registrar_envio(public.notificacao_canal, public.notificacao_tipo, text, uuid, uuid, uuid, text, text, text, text, boolean, text, jsonb); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.registrar_envio(_canal public.notificacao_canal, _tipo public.notificacao_tipo, _entidade_tipo text, _entidade_id uuid, _notificacao_id uuid DEFAULT NULL::uuid, _destinatario_id uuid DEFAULT NULL::uuid, _email text DEFAULT NULL::text, _telefone text DEFAULT NULL::text, _papel text DEFAULT NULL::text, _agrupamento text DEFAULT NULL::text, _sucesso boolean DEFAULT true, _erro text DEFAULT NULL::text, _metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid
    LANGUAGE sql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  insert into public.notificacao_envio (
    notificacao_id, canal, tipo, entidade_tipo, entidade_id, agrupamento_chave,
    destinatario_id, destinatario_email, destinatario_telefone,
    destinatario_papel, sucesso, erro, metadata)
  values (_notificacao_id, _canal, _tipo, _entidade_tipo, _entidade_id, _agrupamento,
          _destinatario_id, _email, _telefone, _papel, _sucesso, _erro,
          coalesce(_metadata, '{}'::jsonb))
  returning id;
$$;


--
-- Name: FUNCTION registrar_envio(_canal public.notificacao_canal, _tipo public.notificacao_tipo, _entidade_tipo text, _entidade_id uuid, _notificacao_id uuid, _destinatario_id uuid, _email text, _telefone text, _papel text, _agrupamento text, _sucesso boolean, _erro text, _metadata jsonb); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.registrar_envio(_canal public.notificacao_canal, _tipo public.notificacao_tipo, _entidade_tipo text, _entidade_id uuid, _notificacao_id uuid, _destinatario_id uuid, _email text, _telefone text, _papel text, _agrupamento text, _sucesso boolean, _erro text, _metadata jsonb) IS 'Grava uma linha por destinatario e canal. Chamada pela borda (ALE-1); falha dela nunca pode derrubar o envio que ja aconteceu.';


--
-- Name: resolve_user_cliente_id(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_user_cliente_id(_uid uuid) RETURNS uuid
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  ids uuid[];
BEGIN
  SELECT array_agg(DISTINCT c.id)
  INTO ids
  FROM public.representante r
  JOIN public.cliente c ON c.id = r.id_cliente AND c.excluido = false
  WHERE r.user_id = _uid AND r.excluido = false;

  IF ids IS NULL OR array_length(ids, 1) IS NULL THEN
    RETURN NULL;
  END IF;
  IF array_length(ids, 1) > 1 THEN
    RAISE EXCEPTION
      'resolve_user_cliente_id: usuario % vinculado a % id_cliente distintos (dado duplicado)',
      _uid, array_length(ids, 1);
  END IF;
  RETURN ids[1];
END;
$$;


--
-- Name: FUNCTION resolve_user_cliente_id(_uid uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.resolve_user_cliente_id(_uid uuid) IS 'id_cliente do usuário via representante→cliente. Fail-loud se >1 distinto.';


--
-- Name: resolve_user_cluster_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.resolve_user_cluster_ids(_uid uuid) RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(array_agg(c.id ORDER BY c.id), '{}')
  FROM (
    SELECT DISTINCT c.id
    FROM public.estrutura_clusters c
    WHERE c.is_active = true
      AND c.id IN (
        SELECT a.cluster_id
        FROM public.estrutura_equipe_membros m
        JOIN public.estrutura_equipes e ON e.id = m.equipe_id
        JOIN public.estrutura_areas    a ON a.id = e.area_id
        WHERE m.user_id = _uid
        UNION
        SELECT a.cluster_id
        FROM public.estrutura_equipes e
        JOIN public.estrutura_areas   a ON a.id = e.area_id
        WHERE e.gestor_id = _uid
        UNION
        SELECT a.cluster_id
        FROM public.estrutura_areas a
        WHERE a.gestor_chamados_id = _uid
      )
  ) c;
$$;


--
-- Name: FUNCTION resolve_user_cluster_ids(_uid uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.resolve_user_cluster_ids(_uid uuid) IS 'Clusters ativos do usuário pela união dos 3 caminhos (membro ∪ gestor equipe ∪ gestor área).';


--
-- Name: revisar_documento_pendencia(uuid, text, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.revisar_documento_pendencia(_documento_id uuid, _veredito text, _motivo text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_revisao public.osg_doc_revisao;
BEGIN
  IF NOT public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) THEN
    RAISE EXCEPTION 'sem permissao para revisar documento' USING ERRCODE = '42501';
  END IF;

  IF _veredito NOT IN ('pendente', 'aprovado', 'recusado') THEN
    RAISE EXCEPTION 'veredito invalido' USING ERRCODE = '22023';
  END IF;
  v_revisao := _veredito::public.osg_doc_revisao;

  UPDATE public.documento_arquivo
     SET revisao = v_revisao,
         revisao_em = CASE WHEN v_revisao = 'pendente' THEN NULL ELSE now() END,
         revisao_por = CASE WHEN v_revisao = 'pendente' THEN NULL ELSE auth.uid() END,
         revisao_motivo = CASE WHEN v_revisao = 'recusado' THEN NULLIF(BTRIM(COALESCE(_motivo, '')), '') END,
         updated_at = now()
   WHERE id = _documento_id
     AND excluido = false
     AND fonte = 'cliente'::public.osg_doc_fonte;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento nao encontrado, excluido ou nao veio do cliente'
      USING ERRCODE = '42501';
  END IF;
END;
$$;


--
-- Name: FUNCTION revisar_documento_pendencia(_documento_id uuid, _veredito text, _motivo text); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.revisar_documento_pendencia(_documento_id uuid, _veredito text, _motivo text) IS 'Veredito do consultor (team_member+) sobre arquivo enviado pelo cliente: aprovado, recusado (com motivo) ou pendente para desfazer. Recusado sai da conta de recebido em get_pendencias_documentos_cliente e reabre o envio da pendência; aprovado trava a remoção pelo cliente em soft_delete_documento_cliente. Recusa arquivo de fonte psa: só o que veio do cliente é revisável.';


--
-- Name: set_scenario_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_scenario_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: set_updated_by(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_by() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_by := auth.uid();
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;


--
-- Name: sistema_cluster_visivel(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sistema_cluster_visivel(_sistema_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(auth.uid(),'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.sistemas_processo sp
               WHERE sp.id = _sistema_id AND sp.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())))
    OR EXISTS (SELECT 1 FROM public.sistema_clusters sc
               WHERE sc.sistema_id = _sistema_id AND sc.cluster_id = ANY(public.resolve_user_cluster_ids(auth.uid())));
$$;


--
-- Name: soft_delete_documento_cliente(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.soft_delete_documento_cliente(_id uuid) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_cliente uuid;
BEGIN
  v_cliente := public.resolve_user_cliente_id(auth.uid());
  IF v_cliente IS NULL THEN
    RAISE EXCEPTION 'documento não encontrado ou sem permissão'
      USING ERRCODE = '42501';
  END IF;

  IF EXISTS (SELECT 1
               FROM public.documento_arquivo d
              WHERE d.id = _id
                AND d.cliente_id = v_cliente
                AND d.excluido = false
                AND d.revisao = 'aprovado'::public.osg_doc_revisao) THEN
    RAISE EXCEPTION 'este documento já foi aprovado pela PSA e não pode mais ser removido'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.documento_arquivo
     SET excluido = true,
         updated_at = now()
   WHERE id = _id
     AND fonte = 'cliente'
     AND excluido = false
     AND cliente_id = v_cliente;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'documento não encontrado ou sem permissão'
      USING ERRCODE = '42501';
  END IF;
END;
$$;


--
-- Name: FUNCTION soft_delete_documento_cliente(_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.soft_delete_documento_cliente(_id uuid) IS 'Remoção (soft) de arquivo do próprio cliente. Recusa arquivo aprovado pelo consultor (revisao = aprovado), arquivo de outro cliente e arquivo de fonte psa.';


--
-- Name: sprint_visivel(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sprint_visivel(p_sprint_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT
    public.has_role(auth.uid(),'admin'::app_role)
    OR public.is_membro_digital(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.sprints s
      JOIN public.projects p ON p.id = s.project_id
      WHERE s.id = p_sprint_id
        AND s.project_id IS NOT NULL
        AND p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))
    );
$$;


--
-- Name: sublider_na_os(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sublider_na_os(_ordem_servico_id uuid) RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  select _ordem_servico_id is not null
     and public.has_role_or_higher(auth.uid(), 'sublider'::app_role)
     and exists (
       select 1
         from public.org_project_members m
         join public.org_projects p on p.id = m.project_id
        where p.ordem_servico_id = _ordem_servico_id
          and m.user_id = auth.uid()
     );
$$;


--
-- Name: FUNCTION sublider_na_os(_ordem_servico_id uuid); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.sublider_na_os(_ordem_servico_id uuid) IS 'Sublider ou acima que e membro de ALGUM projeto daquela ordem de servico. Porta de escrita de solicitacao e solicitacao_item. OS nula devolve false, porque sem OS nao existe projeto do qual ser membro.';


--
-- Name: sync_profile_access_state(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_profile_access_state() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_old_mcp BOOLEAN := COALESCE((OLD.raw_user_meta_data->>'must_change_password')::boolean, FALSE);
  v_new_mcp BOOLEAN := COALESCE((NEW.raw_user_meta_data->>'must_change_password')::boolean, FALSE);
BEGIN
  -- Primeiro acesso concluído: must_change_password TRUE -> FALSE/ausente
  IF v_old_mcp = TRUE AND v_new_mcp = FALSE THEN
    UPDATE public.profiles
       SET first_access_done = TRUE,
           first_access_at   = COALESCE(first_access_at, NOW())
     WHERE id = NEW.id;
  END IF;

  -- Espelhar último login
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    UPDATE public.profiles
       SET last_sign_in_at = NEW.last_sign_in_at
     WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: sync_project_area_from_equipe(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.sync_project_area_from_equipe() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_area_name text;
BEGIN
  IF NEW.equipe_id IS NOT NULL THEN
    SELECT a.name INTO v_area_name
    FROM public.estrutura_equipes eq
    JOIN public.estrutura_areas a ON a.id = eq.area_id
    WHERE eq.id = NEW.equipe_id;
    IF v_area_name IS NOT NULL THEN
      NEW.area := v_area_name;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: tg_pessoa_conjuge_reciproco(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_pessoa_conjuge_reciproco() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_conjuge_do_novo uuid;
  v_cliente_do_novo uuid;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NULL;
  END IF;

  IF NEW.conjuge_id IS NULL AND (TG_OP = 'INSERT' OR OLD.conjuge_id IS NULL) THEN
    RETURN NULL;
  END IF;

  IF NEW.conjuge_id IS NOT NULL THEN
    SELECT cliente_id INTO v_cliente_do_novo
      FROM public.pessoa
     WHERE id = NEW.conjuge_id;

    IF v_cliente_do_novo IS DISTINCT FROM NEW.cliente_id THEN
      IF TG_OP = 'INSERT'
         OR NEW.conjuge_id IS DISTINCT FROM OLD.conjuge_id
         OR NEW.cliente_id IS DISTINCT FROM OLD.cliente_id THEN
        RAISE EXCEPTION
          'Cônjuge (%) pertence a outro cliente; o vínculo conjugal vive dentro de um cliente só',
          NEW.conjuge_id
          USING ERRCODE = '23514';
      END IF;
      RETURN NULL;
    END IF;
  END IF;

  IF TG_OP = 'UPDATE'
     AND OLD.conjuge_id IS NOT NULL
     AND OLD.conjuge_id IS DISTINCT FROM NEW.conjuge_id THEN
    UPDATE public.pessoa
       SET conjuge_id = NULL
     WHERE id = OLD.conjuge_id
       AND conjuge_id = NEW.id
       AND cliente_id = NEW.cliente_id;
  END IF;

  IF NEW.conjuge_id IS NULL THEN
    UPDATE public.pessoa
       SET conjuge_id = NULL
     WHERE conjuge_id = NEW.id
       AND cliente_id = NEW.cliente_id;
    RETURN NULL;
  END IF;

  SELECT conjuge_id INTO v_conjuge_do_novo
    FROM public.pessoa
   WHERE id = NEW.conjuge_id;

  IF v_conjuge_do_novo IS NOT NULL AND v_conjuge_do_novo <> NEW.id THEN
    UPDATE public.pessoa
       SET conjuge_id = NULL
     WHERE id = v_conjuge_do_novo
       AND conjuge_id = NEW.conjuge_id
       AND cliente_id = NEW.cliente_id;
  END IF;

  UPDATE public.pessoa
     SET conjuge_id = NULL
   WHERE conjuge_id = NEW.conjuge_id
     AND id <> NEW.id
     AND cliente_id = NEW.cliente_id;

  UPDATE public.pessoa
     SET conjuge_id = NULL
   WHERE conjuge_id = NEW.id
     AND id <> NEW.conjuge_id
     AND cliente_id = NEW.cliente_id;

  UPDATE public.pessoa
     SET conjuge_id = NEW.id
   WHERE id = NEW.conjuge_id
     AND conjuge_id IS DISTINCT FROM NEW.id
     AND cliente_id = NEW.cliente_id;

  RETURN NULL;
END;
$$;


--
-- Name: FUNCTION tg_pessoa_conjuge_reciproco(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tg_pessoa_conjuge_reciproco() IS 'Mantém pessoa.conjuge_id simétrico e exclusivo em qualquer caminho de escrita: espelha o vínculo no parceiro, desfaz o vínculo anterior dos dois lados na troca e limpa o outro lado quando o cônjuge é removido. Tudo confinado ao mesmo cliente_id; cônjuge de outro cliente é rejeitado (23514). SECURITY DEFINER porque é consequência de sistema, não uma escrita do usuário na linha do parceiro.';


--
-- Name: tg_representante_block_disable_acesso_chamados(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_representante_block_disable_acesso_chamados() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.acesso_chamados IS TRUE
     AND (NEW.acesso_chamados IS DISTINCT FROM TRUE)
     AND auth.uid() IS NOT NULL
     AND NOT public.has_role(auth.uid(), 'admin'::app_role)
  THEN
    RAISE EXCEPTION
      'Você não tem permissão para desabilitar acesso ao chamados, fale com a equipe Digital para realizar essa operação'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: tg_ticket_messages_bloqueia_fechado(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_ticket_messages_bloqueia_fechado() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_status text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'client'::app_role) THEN
    RETURN NEW;
  END IF;

  SELECT status INTO v_status FROM public.tickets WHERE id = NEW.ticket_id;

  IF v_status = 'fechado' THEN
    RAISE EXCEPTION
      'Chamado encerrado: nao aceita novas mensagens. Abra um novo chamado.'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: tg_ticket_messages_bloqueia_reenvio(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_ticket_messages_bloqueia_reenvio() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
      FROM public.ticket_messages m
     WHERE m.ticket_id = NEW.ticket_id
       AND m.user_id   = NEW.user_id
       AND m.is_admin  IS NOT DISTINCT FROM NEW.is_admin
       AND m.message   = NEW.message
       AND m.created_at > now() - interval '5 minutes'
  ) THEN
    RAISE EXCEPTION
      'Mensagem idêntica já registrada neste chamado nos últimos 5 minutos'
      USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: tg_ticket_messages_reabre_resolvido(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_ticket_messages_reabre_resolvido() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT COALESCE(NEW.is_admin, false) THEN
    UPDATE public.tickets
       SET status = 'em_andamento'
     WHERE id = NEW.ticket_id
       AND status = 'resolvido';
  END IF;
  RETURN NULL;
END;
$$;


--
-- Name: tg_tickets_set_closed_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tg_tickets_set_closed_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.status = 'fechado' AND COALESCE(OLD.status, '') <> 'fechado' THEN
    NEW.closed_at := now();
  ELSIF NEW.status <> 'fechado' AND COALESCE(OLD.status, '') = 'fechado' THEN
    NEW.closed_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: FUNCTION tg_tickets_set_closed_at(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.tg_tickets_set_closed_at() IS 'Mantém tickets.closed_at como consequência do status. Só `fechado` marca a data; `resolvido` é intermediário (janela de aceite de 3 dias). Sair de `fechado` limpa a data, o que preserva a reabertura pela equipe.';


--
-- Name: ticket_messages_guard_update(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ticket_messages_guard_update() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.ticket_id IS DISTINCT FROM OLD.ticket_id THEN
    RAISE EXCEPTION 'Não é permitido mover a mensagem para outro chamado';
  END IF;
  IF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    RAISE EXCEPTION 'Não é permitido alterar o autor da mensagem';
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: titularidade_definir_cliente_da_matricula(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.titularidade_definir_cliente_da_matricula() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
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


--
-- Name: tmpl_bloco_familia_um_nivel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.tmpl_bloco_familia_um_nivel() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
declare
  cabeca_e_variante boolean;
  tem_variantes boolean;
begin
  if new.familia_id is null then
    return new;
  end if;

  select familia_id is not null
    into cabeca_e_variante
    from public.tmpl_bloco
   where id = new.familia_id;

  if coalesce(cabeca_e_variante, false) then
    raise exception 'Família de blocos é de um nível só: % já é variante de outra família', new.familia_id;
  end if;

  select exists (select 1 from public.tmpl_bloco where familia_id = new.id)
    into tem_variantes;

  if tem_variantes then
    raise exception 'Bloco % é cabeça de família e não pode virar variante de outro', new.id;
  end if;

  return new;
end;
$$;


--
-- Name: update_atualizado_em_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_atualizado_em_column() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


--
-- Name: user_estrutura_area_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_estrutura_area_ids(_user_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT eq.area_id
  FROM public.estrutura_equipe_membros em
  JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
  WHERE em.user_id = _user_id AND eq.area_id IS NOT NULL
  UNION
  SELECT eq.area_id
  FROM public.estrutura_equipes eq
  WHERE eq.gestor_id = _user_id AND eq.area_id IS NOT NULL;
$$;


--
-- Name: user_estrutura_equipe_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.user_estrutura_equipe_ids(_user_id uuid) RETURNS SETOF uuid
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT em.equipe_id
  FROM public.estrutura_equipe_membros em
  WHERE em.user_id = _user_id
  UNION
  SELECT eq.id
  FROM public.estrutura_equipes eq
  WHERE eq.gestor_id = _user_id;
$$;


--
-- Name: validar_solicitacao_item_nao_aplicavel(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validar_solicitacao_item_nao_aplicavel() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
begin
  if not exists (
    select 1
      from public.solicitacao_item si
      join public.solicitacao s on s.id = si.solicitacao_id
     where si.id = new.solicitacao_item_id
       and si.status = 'ativo'::public.osg_solicitacao_item_status
       and s.cliente_id = new.cliente_id
  ) then
    raise exception 'O item não pertence à solicitação ativa deste cliente';
  end if;

  if new.pessoa_id is not null and not exists (
    select 1 from public.pessoa p where p.id = new.pessoa_id and p.cliente_id = new.cliente_id
  ) then
    raise exception 'A pessoa não pertence ao cliente da solicitação';
  end if;

  if new.bem_id is not null and not exists (
    select 1 from public.bem b where b.id = new.bem_id and b.cliente_id = new.cliente_id
  ) then
    raise exception 'O bem não pertence ao cliente da solicitação';
  end if;

  if new.matricula_id is not null and not exists (
    select 1
      from public.matricula m
      left join public.bem b on b.id = m.bem_id
     where m.id = new.matricula_id
       and (
         b.cliente_id = new.cliente_id
         or exists (
           select 1
             from public.titularidade t
             join public.pessoa p on p.id = t.titular_pessoa_id
            where t.matricula_id = m.id
              and p.cliente_id = new.cliente_id
         )
       )
  ) then
    raise exception 'A matrícula não pertence ao cliente da solicitação';
  end if;

  return new;
end;
$$;


--
-- Name: validate_correcoes_icms_contribuinte(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_correcoes_icms_contribuinte() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contribuinte WHERE id = NEW.contribuinte_id) THEN
    RAISE EXCEPTION 'Contribuinte invalido: id % nao encontrado', NEW.contribuinte_id;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_org_task_reviewer(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_org_task_reviewer() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'INSERT'
     AND NEW.reviewer_id IS NOT NULL
     AND NEW.status IS DISTINCT FROM 'review'::public.fiscal_task_status THEN
    RAISE EXCEPTION 'O revisor so pode ser definido quando a tarefa esta em revisao'
      USING ERRCODE = '23514';
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.reviewer_id IS DISTINCT FROM OLD.reviewer_id
     AND NEW.status IS DISTINCT FROM 'review'::public.fiscal_task_status
     AND NOT (
       NEW.reviewer_id IS NULL
       AND OLD.reviewer_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1
         FROM public.profiles p
         WHERE p.id = OLD.reviewer_id
       )
     ) THEN
    RAISE EXCEPTION 'O revisor so pode ser alterado quando a tarefa esta em revisao'
      USING ERRCODE = '23514';
  END IF;

  IF NEW.status = 'review'::public.fiscal_task_status
     AND NEW.reviewer_id IS NOT NULL
     AND NOT public.is_valid_org_task_reviewer(
       NEW.reviewer_id,
       NEW.project_id,
       NEW.assigned_to
     ) THEN
    RAISE EXCEPTION 'Revisor deve ser sublider, lider ou admin vinculado ao cluster da tarefa e diferente do responsavel'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;


--
-- Name: validate_per_contribuinte(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_per_contribuinte() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.contribuinte WHERE id = NEW.id_contribuinte) THEN
    RAISE EXCEPTION 'Contribuinte invalido: id % nao encontrado', NEW.id_contribuinte;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_tax_project_contribuinte(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_tax_project_contribuinte() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.contribuinte_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.contribuinte WHERE id = NEW.contribuinte_id) THEN
      RAISE EXCEPTION 'Contribuinte invalido: id % nao encontrado', NEW.contribuinte_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: validate_tax_project_external_client(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.validate_tax_project_external_client() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF NEW.external_client_id IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.cliente WHERE id = NEW.external_client_id) THEN
      RAISE EXCEPTION 'Cliente invalido: id % nao encontrado', NEW.external_client_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: ve_todas_as_sprints(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.ve_todas_as_sprints() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT public.has_role(auth.uid(),'admin'::app_role)
      OR public.is_membro_digital(auth.uid());
$$;


--
-- Name: FUNCTION ve_todas_as_sprints(); Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON FUNCTION public.ve_todas_as_sprints() IS 'Parte de sprint_visivel() que não depende da linha: admin ou membro do Digital enxerga qualquer sprint. Sem argumento de propósito, para o planejador resolver como InitPlan quando chamada de dentro de (SELECT ...) numa policy.';


--
-- Name: visible_org_project_ids(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.visible_org_project_ids(_uid uuid) RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT COALESCE(array_agg(DISTINCT pid), '{}')::uuid[]
  FROM (
    -- membro direto
    SELECT opm.project_id AS pid
    FROM public.org_project_members opm
    WHERE opm.user_id = _uid

    UNION

    -- responsável, líder ou criador
    SELECT p.id
    FROM public.org_projects p
    WHERE p.responsible_id = _uid
       OR p.leader_id = _uid
       OR p.created_by = _uid

    UNION

    -- líder: membros do projeto pertencem a alguma equipe/área do líder
    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
    JOIN public.estrutura_equipes eq ON eq.id = em.equipe_id
    WHERE public.has_role(_uid, 'lider'::app_role)
      AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_uid))

    UNION

    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
    WHERE public.has_role(_uid, 'lider'::app_role)
      AND eq.area_id IN (SELECT public.user_estrutura_area_ids(_uid))

    UNION

    -- sublíder: membros do projeto pertencem a equipe do sublíder
    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipe_membros em ON em.user_id = opm.user_id
    WHERE public.has_role(_uid, 'sublider'::app_role)
      AND em.equipe_id IN (SELECT public.user_estrutura_equipe_ids(_uid))

    UNION

    SELECT opm.project_id
    FROM public.org_project_members opm
    JOIN public.estrutura_equipes eq ON eq.gestor_id = opm.user_id
    WHERE public.has_role(_uid, 'sublider'::app_role)
      AND eq.id IN (SELECT public.user_estrutura_equipe_ids(_uid))
  ) s
  WHERE pid IS NOT NULL;
$$;


--
-- Name: access_change_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.access_change_log (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    changed_by uuid NOT NULL,
    action text NOT NULL,
    old_value text,
    new_value text,
    details jsonb,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: administracao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.administracao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pj_pessoa_id uuid NOT NULL,
    administrador_pessoa_id uuid NOT NULL,
    cargo text,
    pode_isoladamente boolean,
    data_inicio date,
    data_fim date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    poderes jsonb
);


--
-- Name: COLUMN administracao.pj_pessoa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracao.pj_pessoa_id IS 'PJ administrada';


--
-- Name: COLUMN administracao.administrador_pessoa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracao.administrador_pessoa_id IS 'Pessoa que administra a PJ';


--
-- Name: COLUMN administracao.pode_isoladamente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracao.pode_isoladamente IS 'Se o administrador pode agir isoladamente';


--
-- Name: COLUMN administracao.poderes; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.administracao.poderes IS 'Poderes do administrador: { forma: isolada|conjunta, excecoes: [{ atos, exigencia }], observacao }. `forma` é a regra geral (espelhada em pode_isoladamente), `excecoes` são os atos que fogem dela e `observacao` é texto livre. Nulo = cadastro anterior à coluna; nesse caso a forma vem de pode_isoladamente.';


--
-- Name: analises_semestrais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.analises_semestrais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ciclo_id uuid,
    responsavel_id uuid,
    entregas_realizadas text,
    riscos_identificados text,
    ajustes_necessarios text,
    comentario_lider text,
    comentario_avaliado text,
    status text DEFAULT 'pendente'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: area_servicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.area_servicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    servico_id uuid NOT NULL,
    estrutura_area_id uuid NOT NULL
);


--
-- Name: atualizacoes_meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.atualizacoes_meta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meta_id uuid,
    progresso_anterior numeric,
    progresso_novo numeric,
    comentario text,
    autor_id uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    area text NOT NULL,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    entity_name text NOT NULL,
    action text NOT NULL,
    changed_fields jsonb,
    performed_by uuid NOT NULL,
    performed_at timestamp with time zone DEFAULT now() NOT NULL,
    details text
);


--
-- Name: bkp_20260807_ticket_messages_dup; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bkp_20260807_ticket_messages_dup (
    id uuid NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid NOT NULL,
    is_admin boolean,
    message text NOT NULL,
    created_at timestamp with time zone,
    copia_numero integer NOT NULL,
    segundos_apos integer NOT NULL,
    backup_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE bkp_20260807_ticket_messages_dup; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.bkp_20260807_ticket_messages_dup IS 'Backup das mensagens duplicadas removidas pela migração 20260807120000. Restauração: INSERT INTO ticket_messages (id, ticket_id, user_id, is_admin, message, created_at) SELECT id, ticket_id, user_id, is_admin, message, created_at FROM bkp_20260807_ticket_messages_dup (desligar o trigger trg_ticket_messages_bloqueia_reenvio antes). Pode ser descartada após validação em produção.';


--
-- Name: capital_integralizacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.capital_integralizacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    bem_id uuid NOT NULL,
    socio_pessoa_id uuid NOT NULL,
    empresa_destino_pessoa_id uuid NOT NULL,
    vlr_mercado numeric,
    pct_vlr_mercado numeric,
    vlr_contabil numeric,
    pct_vlr_contabil numeric,
    vlr_capital_arredondado numeric,
    pct_capital numeric,
    reserva_capital numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: COLUMN capital_integralizacao.socio_pessoa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.capital_integralizacao.socio_pessoa_id IS 'Sócio que integraliza o bem no capital';


--
-- Name: COLUMN capital_integralizacao.empresa_destino_pessoa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.capital_integralizacao.empresa_destino_pessoa_id IS 'PJ destino que recebe o bem como capital';


--
-- Name: COLUMN capital_integralizacao.reserva_capital; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.capital_integralizacao.reserva_capital IS 'Parcela alocada em reserva de capital';


--
-- Name: cartorio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cartorio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_completo text NOT NULL,
    comarca text NOT NULL,
    uf character(2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT cartorio_uf_chk CHECK ((uf ~ '^[A-Z]{2}$'::text))
);


--
-- Name: catalog_clients; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.catalog_clients (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    responsible text,
    description text,
    color text DEFAULT '#3B82F6'::text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    estrutura_area_id uuid
);


--
-- Name: centros_custo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.centros_custo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text NOT NULL,
    nome text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: checklist_cliente_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.checklist_cliente_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    item_padrao_id uuid,
    modulo text NOT NULL,
    entidade text NOT NULL,
    documento text NOT NULL,
    nota text,
    categoria public.osg_doc_categoria,
    categoria_docbox text,
    confidencial boolean DEFAULT false NOT NULL,
    obrigatorio boolean DEFAULT false NOT NULL,
    origem public.osg_checklist_origem DEFAULT 'padrao'::public.osg_checklist_origem NOT NULL,
    status public.osg_checklist_status DEFAULT 'pendente'::public.osg_checklist_status NOT NULL,
    pessoa_id uuid,
    bem_id uuid,
    matricula_id uuid,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid DEFAULT auth.uid()
);


--
-- Name: ciclos_avaliacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ciclos_avaliacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    data_inicio date NOT NULL,
    data_fim date NOT NULL,
    data_analise_semestral date,
    status text DEFAULT 'planejado'::text,
    descricao text,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: client_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    document_type text NOT NULL,
    name text NOT NULL,
    description text,
    url text,
    file_path text,
    file_name text,
    file_size bigint,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT client_documents_document_type_check CHECK ((document_type = ANY (ARRAY['dashboard'::text, 'documento'::text])))
);


--
-- Name: client_visible_projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.client_visible_projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    project_id uuid NOT NULL,
    visible_since timestamp with time zone DEFAULT now(),
    notes text,
    created_at timestamp with time zone DEFAULT now(),
    created_by uuid
);


--
-- Name: cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    fixo text,
    telefone text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    municipio text,
    uf text,
    ativo boolean DEFAULT true,
    categoria text,
    excluido boolean DEFAULT false NOT NULL,
    ambiente text DEFAULT 'prod'::text NOT NULL,
    observacoes text,
    CONSTRAINT cliente_nome_nao_vazio CHECK ((btrim(nome) <> ''::text))
);


--
-- Name: cliente_clusters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cliente_clusters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    cluster_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE cliente_clusters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.cliente_clusters IS 'N:N — vincula clientes aos clusters (Tax, Consultoria, OSG). Um cliente pode ser atendido por múltiplos clusters.';


--
-- Name: cliente_setor_regiao_atual; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cliente_setor_regiao_atual WITH (security_invoker='true') AS
 SELECT DISTINCT ON (id_cliente) id_cliente,
    setor_cliente,
    setor_cliente_id,
    regiao
   FROM public.ordem_servico os
  WHERE (excluido = false)
  ORDER BY id_cliente, data_emissao DESC NULLS LAST, created_at DESC;


--
-- Name: documento_arquivo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_arquivo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    fonte public.osg_doc_fonte DEFAULT 'cliente'::public.osg_doc_fonte NOT NULL,
    categoria public.osg_doc_categoria NOT NULL,
    bem_id uuid,
    matricula_id uuid,
    pessoa_id uuid,
    documento_gerado_id uuid,
    nome_original text NOT NULL,
    gcs_uri text,
    checksum text,
    mime text,
    tamanho bigint,
    status public.osg_doc_status DEFAULT 'pendente'::public.osg_doc_status NOT NULL,
    excluido boolean DEFAULT false NOT NULL,
    ambiente text DEFAULT 'dev'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid DEFAULT auth.uid(),
    checklist_item_id uuid,
    area public.osg_doc_area,
    solicitacao_id uuid,
    triado_em timestamp with time zone,
    triado_por uuid,
    documento_tipo_id uuid,
    revisao public.osg_doc_revisao DEFAULT 'pendente'::public.osg_doc_revisao NOT NULL,
    revisao_em timestamp with time zone,
    revisao_por uuid,
    revisao_motivo text,
    CONSTRAINT documento_arquivo_um_dono_apenas CHECK (((((((pessoa_id IS NOT NULL))::integer + ((bem_id IS NOT NULL))::integer) + ((matricula_id IS NOT NULL))::integer) + ((triado_em IS NOT NULL))::integer) <= 1))
);


--
-- Name: COLUMN documento_arquivo.solicitacao_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documento_arquivo.solicitacao_id IS 'De qual solicitação veio o lote. Nulo = arquivo sem pedido associado. NÃO liga o arquivo ao item pedido: a classificação item x arquivo é trabalho posterior do analista.';


--
-- Name: COLUMN documento_arquivo.triado_em; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documento_arquivo.triado_em IS 'Quando alguém decidiu que este arquivo não é de nenhuma entidade e sim do cliente como um todo. Nulo = ainda no balde, esperando triagem. Não confundir com arquivo sem dono: o balde é triado_em nulo E as três colunas de vínculo nulas.';


--
-- Name: COLUMN documento_arquivo.triado_por; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documento_arquivo.triado_por IS 'Quem tomou essa decisão. Sem FK, no mesmo padrão de created_by e updated_by desta tabela.';


--
-- Name: COLUMN documento_arquivo.documento_tipo_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documento_arquivo.documento_tipo_id IS 'Que documento este arquivo é (CPF, RG/CNH, comprovante de endereço...), referenciando o catálogo documento_tipo. Nulo = ainda não classificado; classificar é opcional e não bloqueia o vínculo. Ortogonal ao dono: responde "o que é", não "de quem é".';


--
-- Name: COLUMN documento_arquivo.revisao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documento_arquivo.revisao IS 'Veredito sobre o arquivo recebido do cliente: pendente (ainda não olhado), aprovado (o cliente não remove mais) ou recusado (não conta como recebido no checklist e o envio reabre). Vira aprovado por duas vias: o consultor no checklist (revisar_documento_pendencia) e a classificação no Cadastro por Documento, que grava o vínculo e a aprovação no mesmo patch. Só é interpretada para fonte cliente: arquivo produzido pela PSA não passa por aprovação.';


--
-- Name: COLUMN documento_arquivo.revisao_motivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documento_arquivo.revisao_motivo IS 'O que o cliente lê quando o arquivo é recusado. Só existe em revisao = recusado; aprovar limpa.';


--
-- Name: CONSTRAINT documento_arquivo_um_dono_apenas ON documento_arquivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT documento_arquivo_um_dono_apenas ON public.documento_arquivo IS 'O vínculo do arquivo é 1:1: no máximo uma entidade dona, ou a marca de triado como documento do cliente, nunca as duas. Linha com tudo nulo é aceita de propósito: é o arquivo ainda no balde.';


--
-- Name: pessoa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pessoa (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    contribuinte_id uuid,
    tipo_pessoa text NOT NULL,
    denominacao text NOT NULL,
    cpf_cnpj text,
    endereco_logradouro text,
    endereco_numero text,
    endereco_complemento text,
    endereco_bairro text,
    endereco_municipio text,
    endereco_uf text,
    endereco_cep text,
    nacionalidade text,
    estado_civil text,
    regime_bens text,
    data_nascimento date,
    filiacao_pai text,
    filiacao_mae text,
    profissao text,
    documento_identidade_numero text,
    documento_identidade_orgao text,
    documento_identidade_uf text,
    conjuge_id uuid,
    nire text,
    junta_comercial_uf text,
    data_constituicao date,
    objeto_social text,
    status_constituicao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    documento_identidade_tipo text,
    genero character(1),
    naturalidade_municipio text,
    naturalidade_uf text,
    filiacao_pai_pessoa_id uuid,
    filiacao_mae_pessoa_id uuid,
    is_fundador boolean DEFAULT false NOT NULL,
    tipo_empresa text,
    CONSTRAINT pessoa_documento_identidade_tipo_check CHECK (((documento_identidade_tipo IS NULL) OR (documento_identidade_tipo = ANY (ARRAY['rg'::text, 'cnh'::text, 'reservista'::text, 'ctps'::text])))),
    CONSTRAINT pessoa_genero_check CHECK (((genero IS NULL) OR (genero = ANY (ARRAY['M'::bpchar, 'F'::bpchar])))),
    CONSTRAINT pessoa_tipo_empresa_check CHECK (((tipo_empresa IS NULL) OR (tipo_empresa = ANY (ARRAY['PR'::text, 'CN'::text, 'SC'::text])))),
    CONSTRAINT pessoa_tipo_pessoa_check CHECK ((tipo_pessoa = ANY (ARRAY['PF'::text, 'PJ'::text])))
);


--
-- Name: COLUMN pessoa.contribuinte_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.contribuinte_id IS 'Nullable - vínculo opcional com contribuinte';


--
-- Name: COLUMN pessoa.tipo_pessoa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.tipo_pessoa IS 'PF ou PJ';


--
-- Name: COLUMN pessoa.denominacao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.denominacao IS 'Nome completo (PF) ou Razão social (PJ)';


--
-- Name: COLUMN pessoa.cpf_cnpj; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.cpf_cnpj IS 'CPF (PF) ou CNPJ (PJ)';


--
-- Name: COLUMN pessoa.nacionalidade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.nacionalidade IS 'PF only';


--
-- Name: COLUMN pessoa.estado_civil; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.estado_civil IS 'PF only';


--
-- Name: COLUMN pessoa.regime_bens; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.regime_bens IS 'PF only';


--
-- Name: COLUMN pessoa.data_nascimento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.data_nascimento IS 'PF only';


--
-- Name: COLUMN pessoa.filiacao_pai; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.filiacao_pai IS 'PF only';


--
-- Name: COLUMN pessoa.filiacao_mae; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.filiacao_mae IS 'PF only';


--
-- Name: COLUMN pessoa.profissao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.profissao IS 'PF only';


--
-- Name: COLUMN pessoa.documento_identidade_numero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.documento_identidade_numero IS 'PF only';


--
-- Name: COLUMN pessoa.documento_identidade_orgao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.documento_identidade_orgao IS 'PF only';


--
-- Name: COLUMN pessoa.documento_identidade_uf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.documento_identidade_uf IS 'PF only';


--
-- Name: COLUMN pessoa.conjuge_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.conjuge_id IS 'Cônjuge/companheiro(a). Relação simétrica e exclusiva garantida pelo gatilho trg_pessoa_conjuge_reciproco — escrever de um lado escreve o outro.';


--
-- Name: COLUMN pessoa.nire; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.nire IS 'PJ only';


--
-- Name: COLUMN pessoa.junta_comercial_uf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.junta_comercial_uf IS 'PJ only';


--
-- Name: COLUMN pessoa.data_constituicao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.data_constituicao IS 'PJ only';


--
-- Name: COLUMN pessoa.objeto_social; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.objeto_social IS 'PJ only';


--
-- Name: COLUMN pessoa.status_constituicao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.status_constituicao IS 'PJ only';


--
-- Name: COLUMN pessoa.documento_identidade_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.documento_identidade_tipo IS 'PF only: rg|cnh|reservista|ctps';


--
-- Name: COLUMN pessoa.genero; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.genero IS 'PF only: M ou F (concordância)';


--
-- Name: COLUMN pessoa.naturalidade_municipio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.naturalidade_municipio IS 'PF only';


--
-- Name: COLUMN pessoa.naturalidade_uf; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.naturalidade_uf IS 'PF only';


--
-- Name: COLUMN pessoa.filiacao_pai_pessoa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.filiacao_pai_pessoa_id IS 'PF only: nullable, se o pai estiver cadastrado';


--
-- Name: COLUMN pessoa.filiacao_mae_pessoa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.filiacao_mae_pessoa_id IS 'PF only: nullable, se a mãe estiver cadastrada';


--
-- Name: COLUMN pessoa.is_fundador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.is_fundador IS 'PF only: patriarca/matriarca do grupo';


--
-- Name: COLUMN pessoa.tipo_empresa; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.pessoa.tipo_empresa IS 'PJ only: PR=Proprietária | CN=Controladora | SC=Sócia';


--
-- Name: cobertura_documentos_cliente; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.cobertura_documentos_cliente WITH (security_invoker='on') AS
 SELECT i.cliente_id,
    i.id AS checklist_item_id,
        CASE
            WHEN ((i.pessoa_id IS NOT NULL) AND (p.tipo_pessoa = 'PJ'::text)) THEN 'pessoa_pj'::text
            WHEN (i.pessoa_id IS NOT NULL) THEN 'pessoa_pf'::text
            WHEN (i.matricula_id IS NOT NULL) THEN 'matricula'::text
            WHEN (i.bem_id IS NOT NULL) THEN 'bem'::text
            ELSE 'cliente'::text
        END AS entidade_tipo,
    COALESCE(i.pessoa_id, i.matricula_id, i.bem_id) AS entidade_id,
    COALESCE(p.denominacao,
        CASE
            WHEN (m.id IS NOT NULL) THEN (((((('Matrícula '::text || m.numero) || ' ('::text) || m.municipio_imovel) || '/'::text) || (m.uf_imovel)::text) || ')'::text)
            ELSE NULL::text
        END,
        CASE
            WHEN (b.id IS NOT NULL) THEN COALESCE(NULLIF(concat_ws(' — '::text, b.referencia_dp, b.denominacao), ''::text), 'Bem'::text)
            ELSE NULL::text
        END, 'Cliente'::text) AS entidade_rotulo,
    i.entidade AS entidade_catalogo,
    i.modulo,
    i.documento,
    i.categoria,
    i.obrigatorio,
    i.status,
    (( SELECT count(*) AS count
           FROM public.documento_arquivo d
          WHERE ((d.checklist_item_id = i.id) AND (d.excluido = false) AND (d.status = 'ativo'::public.osg_doc_status))))::integer AS arquivos_vinculados
   FROM (((public.checklist_cliente_item i
     LEFT JOIN public.pessoa p ON ((p.id = i.pessoa_id)))
     LEFT JOIN public.bem b ON ((b.id = i.bem_id)))
     LEFT JOIN public.matricula m ON ((m.id = i.matricula_id)));


--
-- Name: VIEW cobertura_documentos_cliente; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.cobertura_documentos_cliente IS 'Matriz de cobertura: um registro por documento solicitado, com a contagem de arquivos vinculados; linha com zero é o buraco e ausência de linha significa documento não solicitado para aquela entidade.';


--
-- Name: codigo_receita; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.codigo_receita (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    grupo_tributo_id uuid NOT NULL,
    codigo text NOT NULL,
    denominacao_receita text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: comentarios_avaliacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comentarios_avaliacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ciclo_id uuid,
    autor_id uuid NOT NULL,
    destinatario_id uuid,
    tipo text NOT NULL,
    conteudo text NOT NULL,
    visivel_para_membro boolean DEFAULT true,
    lido boolean DEFAULT false,
    lido_em timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT comentarios_avaliacao_tipo_check CHECK ((tipo = ANY (ARRAY['lider_para_membro'::text, 'membro_resposta'::text, 'membro_ponto_vista'::text])))
);


--
-- Name: contatos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contatos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_completo text NOT NULL,
    email text NOT NULL,
    telefone text,
    empresa text,
    mensagem text NOT NULL,
    servico_interesse text,
    status text DEFAULT 'novo'::text,
    notas_internas text,
    atendido_por uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    porte_empresa text,
    como_conheceu text,
    CONSTRAINT contatos_status_check CHECK ((status = ANY (ARRAY['novo'::text, 'em_andamento'::text, 'convertido'::text, 'arquivado'::text])))
);


--
-- Name: contribuinte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contribuinte (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    tipo_pessoa text NOT NULL,
    cpf_cnpj text,
    nome_razao_social text NOT NULL,
    inscricao_estadual text,
    cod_cnae text,
    setor text,
    simples_nacional boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    telefone text,
    nome_fantasia text,
    situacao_inscricao_estadual text,
    cep text,
    logradouro text,
    numero text,
    complemento text,
    bairro text,
    municipio text,
    uf text,
    contribuinte_faturamento boolean DEFAULT false,
    excluido boolean DEFAULT false NOT NULL,
    ambiente text DEFAULT 'prod'::text NOT NULL,
    setor_cliente_id uuid,
    CONSTRAINT contribuinte_tipo_pessoa_check CHECK ((tipo_pessoa = ANY (ARRAY['PF'::text, 'PJ'::text])))
);


--
-- Name: contribuinte_bal_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.contribuinte_bal_config (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_contribuinte uuid NOT NULL,
    balancete_detalhamento boolean,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: correcoes_icms; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.correcoes_icms (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contribuinte_id uuid NOT NULL,
    familia text NOT NULL,
    data_lancamento date NOT NULL,
    competencia text,
    descricao text NOT NULL,
    produto text,
    campos jsonb DEFAULT '{}'::jsonb NOT NULL,
    ambiente text DEFAULT 'prod'::text NOT NULL,
    excluido boolean DEFAULT false NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT correcoes_icms_familia_check CHECK ((familia = ANY (ARRAY['acucar'::text, 'etanol_interestado'::text, 'biodiesel'::text])))
);


--
-- Name: daily_standups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_standups (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sprint_id uuid,
    user_id uuid NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    did_yesterday text,
    will_do_today text,
    blockers text,
    created_at timestamp with time zone DEFAULT now(),
    project_id uuid,
    process_id uuid,
    blocked_deliverable_id uuid,
    blocker_owner text
);


--
-- Name: dashboard_cliente_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_cliente_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dashboard_id uuid NOT NULL,
    cliente_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: TABLE dashboard_cliente_access; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dashboard_cliente_access IS 'Clientes que podem abrir cada dashboard filter_type=cliente. Cada um vê só o próprio id_cliente.';


--
-- Name: dashboard_cluster_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_cluster_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    dashboard_id uuid NOT NULL,
    cluster_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid
);


--
-- Name: TABLE dashboard_cluster_access; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dashboard_cluster_access IS 'Clusters (gestores) que podem abrir cada dashboard cluster/nenhum. Vazio + all_clusters=false => só admin.';


--
-- Name: dashboards; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboards (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    embed_url text NOT NULL,
    param_names text[] DEFAULT '{}'::text[] NOT NULL,
    filter_type text DEFAULT 'cluster'::text NOT NULL,
    target_page text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    sop_url text,
    min_role public.app_role,
    grupo text,
    all_clusters boolean DEFAULT false NOT NULL,
    CONSTRAINT dashboards_filter_type_chk CHECK ((filter_type = ANY (ARRAY['cluster'::text, 'cliente'::text, 'nenhum'::text])))
);


--
-- Name: TABLE dashboards; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.dashboards IS 'Registro de dashboards do Looker Studio (cadastro na aba /equipe/acessos > Dashboards).';


--
-- Name: COLUMN dashboards.param_names; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dashboards.param_names IS 'Chaves dsN.<param> que a URL recebe (?params=). Multi-fonte = várias chaves.';


--
-- Name: COLUMN dashboards.filter_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dashboards.filter_type IS 'cluster|cliente|nenhum — define qual resolvedor preenche o valor do filtro em runtime.';


--
-- Name: COLUMN dashboards.sop_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dashboards.sop_url IS 'URL do manual/SOP do dashboard (botão "Manual" no consumidor).';


--
-- Name: COLUMN dashboards.min_role; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dashboards.min_role IS 'Nível mínimo (X ou superior) p/ abrir dashboards cluster/nenhum. NULL = team_member.';


--
-- Name: COLUMN dashboards.grupo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dashboards.grupo IS 'Família do relatório (ex.: PERDCOMP) — só p/ agrupar a exibição na tela de Acessos. NULL = sem grupo.';


--
-- Name: COLUMN dashboards.all_clusters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.dashboards.all_clusters IS 'true = todos os gestores (todos os clusters ativos), sem enumerar. false = usa dashboard_cluster_access.';


--
-- Name: dcomp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dcomp (
    nr_documento character varying(50) NOT NULL,
    nr_per_orig character varying(50) NOT NULL,
    mes_ano_exercicio date NOT NULL,
    dt_envio date NOT NULL,
    vlr_compensado numeric(15,2) NOT NULL,
    criado_em timestamp with time zone DEFAULT now(),
    criado_por uuid,
    atualizado_em timestamp with time zone DEFAULT now(),
    atualizado_por uuid,
    nr_dcomp_ret character varying
);


--
-- Name: deliverable_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.deliverable_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deliverable_id uuid NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    file_type text,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: demand_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.demand_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    demand_id uuid NOT NULL,
    title text NOT NULL,
    description text,
    due_date date NOT NULL,
    status text DEFAULT 'pending'::text,
    assigned_to uuid,
    estimated_hours numeric,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: difal_decisao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.difal_decisao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sessao_id uuid NOT NULL,
    cod_ncm text NOT NULL,
    decisao text NOT NULL,
    id_icms_st_bq text,
    decidido_em timestamp with time zone DEFAULT now()
);


--
-- Name: difal_sessao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.difal_sessao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id text NOT NULL,
    cliente_id uuid NOT NULL,
    cliente_nome text,
    periodo text NOT NULL,
    uf text NOT NULL,
    request_original jsonb NOT NULL,
    status text DEFAULT 'EM_ANDAMENTO'::text NOT NULL,
    criado_em timestamp with time zone DEFAULT now(),
    sincronizado_em timestamp with time zone
);


--
-- Name: distribuicao_dcomp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distribuicao_dcomp (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nr_documento character varying NOT NULL,
    tributo character varying NOT NULL,
    valor_tributo numeric(18,2) DEFAULT 0 NOT NULL,
    criado_em timestamp with time zone DEFAULT now() NOT NULL,
    criado_por uuid,
    atualizado_em timestamp with time zone DEFAULT now() NOT NULL,
    atualizado_por uuid,
    competencia date,
    valor_original numeric(18,2),
    grupo_tributo_id uuid,
    codigo_receita_id uuid
);


--
-- Name: distribuicao_receita; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distribuicao_receita (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_ordem_servico uuid NOT NULL,
    id_centro_custo uuid NOT NULL,
    percentual_rateio numeric DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    excluido boolean DEFAULT false NOT NULL
);


--
-- Name: documento_gerado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_gerado (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    pj_pessoa_id uuid,
    documento_template_id uuid,
    documento_anterior_id uuid,
    documento_raiz_id uuid,
    caminho_arquivo text,
    snapshot_flags jsonb,
    snapshot_dados jsonb,
    snapshot_versoes_blocos jsonb,
    status text DEFAULT 'rascunho'::text NOT NULL,
    gerado_por_id uuid,
    gerado_em timestamp with time zone,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    snapshot_validado_em timestamp with time zone,
    CONSTRAINT documento_gerado_status_check CHECK ((status = ANY (ARRAY['rascunho'::text, 'revisao'::text, 'finalizado'::text, 'registrado'::text])))
);


--
-- Name: documento_horas_historico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_horas_historico (
    id bigint NOT NULL,
    documento_id uuid NOT NULL,
    horas_antes numeric(10,2),
    horas_depois numeric(10,2),
    alterado_por uuid,
    registrado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documento_horas_historico_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.documento_horas_historico ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.documento_horas_historico_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: documento_notificacao_visto; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_notificacao_visto (
    user_id uuid NOT NULL,
    documento_gerado_id uuid NOT NULL,
    visto_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documento_override; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_override (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    documento_gerado_id uuid NOT NULL,
    tipo text NOT NULL,
    bloco_alvo_id uuid,
    bloco_substituto_id uuid,
    ordem integer,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT documento_override_campos_por_tipo CHECK ((((tipo = 'substituicao'::text) AND (bloco_alvo_id IS NOT NULL) AND (bloco_substituto_id IS NOT NULL)) OR ((tipo = 'supressao'::text) AND (bloco_alvo_id IS NOT NULL) AND (bloco_substituto_id IS NULL)) OR ((tipo = 'adicao'::text) AND (bloco_alvo_id IS NULL) AND (bloco_substituto_id IS NOT NULL)))),
    CONSTRAINT documento_override_tipo_check CHECK ((tipo = ANY (ARRAY['substituicao'::text, 'supressao'::text, 'adicao'::text])))
);


--
-- Name: documento_tipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_tipo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text NOT NULL,
    modulo text NOT NULL,
    entidade text NOT NULL,
    documento text NOT NULL,
    nota text,
    categoria public.osg_doc_categoria,
    categoria_docbox text,
    confidencial boolean DEFAULT false NOT NULL,
    obrigatorio_default boolean DEFAULT false NOT NULL,
    granularidade text DEFAULT 'cliente'::text NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid DEFAULT auth.uid(),
    grupo public.osg_doc_grupo NOT NULL,
    cliente_id uuid,
    solicitacao_item_id uuid,
    CONSTRAINT documento_tipo_avulso_completo CHECK (((cliente_id IS NULL) = (solicitacao_item_id IS NULL)))
);


--
-- Name: COLUMN documento_tipo.grupo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documento_tipo.grupo IS 'Gaveta da área do cliente em que o documento aparece (pf, pj, bens_imoveis, outros). Dado gravado e obrigatório desde a ALE-26: não inferir de entidade nem de categoria.';


--
-- Name: COLUMN documento_tipo.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documento_tipo.cliente_id IS 'Nulo = item do catálogo padrão, visível a todos. Preenchido = documento avulso, pedido à mão para este cliente. Todo leitor de LISTA do catálogo filtra `cliente_id is null`; a linha avulsa só é alcançada pelo vínculo com o item pedido.';


--
-- Name: COLUMN documento_tipo.solicitacao_item_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.documento_tipo.solicitacao_item_id IS 'De qual item manual da solicitação esta linha avulsa nasceu. Nulo no catálogo padrão. É o escopo: a linha avulsa pertence àquela solicitação e não vaza para a montagem de outras.';


--
-- Name: CONSTRAINT documento_tipo_avulso_completo ON documento_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT documento_tipo_avulso_completo ON public.documento_tipo IS 'Ou a linha é do catálogo padrão (as duas colunas nulas), ou é avulsa de um pedido manual (as duas preenchidas). Meio-termo seria uma linha avulsa sem escopo, invisível para quem a criou.';


--
-- Name: documentos_processo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos_processo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    tipo text,
    categoria text,
    formato text,
    origem text,
    tempo_minutos numeric(10,2),
    estrutura_entrada text,
    estruturado text,
    canonico_id uuid,
    cluster_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    ticket_id uuid,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: efd_correcoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.efd_correcoes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contribuinte_id text NOT NULL,
    arquivo_id character varying(50),
    empresa_cnpj text,
    periodo text,
    arquivo_tipo text NOT NULL,
    registro_tipo text NOT NULL,
    registro_original_id text,
    tipo_operacao text NOT NULL,
    snapshot jsonb NOT NULL,
    campos_alterados jsonb,
    batch_id uuid,
    motivo text,
    usuario_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    ativo boolean DEFAULT true,
    sync_status text,
    sync_sent_at timestamp with time zone,
    sync_error text,
    CONSTRAINT efd_correcoes_tipo_operacao_check CHECK ((tipo_operacao = ANY (ARRAY['I'::text, 'U'::text, 'D'::text])))
);


--
-- Name: estrutura_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estrutura_areas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cluster_id uuid NOT NULL,
    name text NOT NULL,
    color text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    page_categories text[] DEFAULT '{}'::text[],
    cost_center_id uuid,
    gestor_chamados_id uuid
);


--
-- Name: estrutura_clusters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estrutura_clusters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    nome_empresa text,
    cnpj text,
    cost_center_id uuid
);


--
-- Name: estrutura_equipe_membros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estrutura_equipe_membros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    equipe_id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: estrutura_equipes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.estrutura_equipes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    area_id uuid NOT NULL,
    name text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    gestor_id uuid
);


--
-- Name: etapa_documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etapa_documentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    etapa_id uuid NOT NULL,
    scenario text DEFAULT 'AS-IS'::text NOT NULL,
    documento_id uuid NOT NULL,
    sentido text NOT NULL,
    volume numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT etapa_documentos_cenario_check CHECK ((scenario = ANY (ARRAY['AS-IS'::text, 'TO-BE'::text]))),
    CONSTRAINT etapa_documentos_sentido_check CHECK ((sentido = ANY (ARRAY['entrada'::text, 'saida'::text])))
);


--
-- Name: etapa_responsaveis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etapa_responsaveis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    etapa_id uuid NOT NULL,
    scenario text DEFAULT 'AS-IS'::text NOT NULL,
    responsavel_id uuid NOT NULL,
    papel text NOT NULL,
    horas numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT etapa_responsaveis_cenario_check CHECK ((scenario = ANY (ARRAY['AS-IS'::text, 'TO-BE'::text]))),
    CONSTRAINT etapa_responsaveis_papel_check CHECK ((papel = ANY (ARRAY['executado'::text, 'aprovado'::text, 'executor'::text, 'aprovador'::text, 'revisor'::text])))
);


--
-- Name: etapa_sistemas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.etapa_sistemas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    etapa_id uuid NOT NULL,
    scenario text DEFAULT 'AS-IS'::text NOT NULL,
    sistema_id uuid NOT NULL,
    rateio numeric(7,2) DEFAULT 100,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT etapa_sistemas_cenario_check CHECK ((scenario = ANY (ARRAY['AS-IS'::text, 'TO-BE'::text])))
);


--
-- Name: exploracao_rural; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exploracao_rural (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    referencia text,
    tipo_exploracao public.osg_tipo_exploracao NOT NULL,
    bem_id uuid,
    imovel_descricao text,
    matricula_texto text,
    municipio text,
    uf text,
    area_total numeric,
    area_explorada numeric,
    area_unidade text DEFAULT 'ha'::text NOT NULL,
    explorador_pessoa_id uuid,
    explorador_nome text,
    outorgante_pessoa_id uuid,
    outorgante_nome text,
    declarado_irpf boolean DEFAULT false NOT NULL,
    data_assinatura date,
    data_encerramento date,
    vigencia text,
    sacas_por_hectare numeric,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid DEFAULT auth.uid(),
    CONSTRAINT chk_expr_explorador CHECK (((explorador_pessoa_id IS NULL) OR (explorador_nome IS NULL))),
    CONSTRAINT chk_expr_imovel CHECK (((bem_id IS NOT NULL) OR (imovel_descricao IS NOT NULL))),
    CONSTRAINT chk_expr_outorgante CHECK (((outorgante_pessoa_id IS NULL) OR (outorgante_nome IS NULL)))
);


--
-- Name: export_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.export_profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    name text NOT NULL,
    columns text[] NOT NULL,
    is_default boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tool_type text DEFAULT 'xml'::text NOT NULL
);


--
-- Name: COLUMN export_profiles.tool_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.export_profiles.tool_type IS 'Type of export tool: xml, efd';


--
-- Name: feedbacks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedbacks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ciclo_id uuid,
    tipo text NOT NULL,
    de_usuario_id uuid,
    para_usuario_id uuid,
    contexto text NOT NULL,
    comportamento text NOT NULL,
    impacto text NOT NULL,
    anonimo boolean DEFAULT false,
    visivel_para_avaliado boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: gargalo_etapas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gargalo_etapas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gargalo_id uuid NOT NULL,
    etapa_id uuid NOT NULL,
    scenario text DEFAULT 'AS-IS'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT gargalo_etapas_scenario_check CHECK ((scenario = ANY (ARRAY['AS-IS'::text, 'TO-BE'::text])))
);


--
-- Name: gargalo_melhorias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gargalo_melhorias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gargalo_id uuid NOT NULL,
    melhoria_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gargalo_processos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gargalo_processos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gargalo_id uuid NOT NULL,
    processo_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gargalo_responsaveis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gargalo_responsaveis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gargalo_id uuid NOT NULL,
    responsavel_id uuid NOT NULL,
    horas numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: gargalos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gargalos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descricao text,
    origem text,
    cluster_id uuid,
    melhoria_id uuid,
    horas_gastas numeric(12,2) DEFAULT 0,
    horas_implementacao numeric(12,2) DEFAULT 0,
    taxa_ocorrencia numeric(7,4) DEFAULT 0,
    taxa_captura_apos_melhoria numeric(7,4) DEFAULT 0,
    custo_externo_unico numeric(12,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: grupo_tributo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.grupo_tributo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sigla text NOT NULL,
    denominacao text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: impedimento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.impedimento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    matricula_id uuid NOT NULL,
    tipo text NOT NULL,
    referencia text,
    descricao text,
    credor_pessoa_id uuid,
    credor_nome text,
    data_constituicao date,
    data_validade date,
    vlr numeric(18,2),
    area_afetada numeric(18,4),
    impede_transferencia boolean DEFAULT false NOT NULL,
    cancelado boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT impedimento_credor_chk CHECK (((credor_pessoa_id IS NOT NULL) OR (credor_nome IS NOT NULL))),
    CONSTRAINT impedimento_validade_chk CHECK (((data_validade IS NULL) OR (data_constituicao IS NULL) OR (data_validade >= data_constituicao)))
);


--
-- Name: improvement_savings_details; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.improvement_savings_details (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    improvement_id uuid NOT NULL,
    savings_type text NOT NULL,
    description text NOT NULL,
    cost_before numeric DEFAULT 0,
    cost_after numeric DEFAULT 0,
    savings_value numeric DEFAULT 0 NOT NULL,
    is_monthly boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT improvement_savings_details_savings_type_check CHECK ((savings_type = ANY (ARRAY['system'::text, 'build_vs_buy'::text, 'other'::text])))
);


--
-- Name: improvement_team_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.improvement_team_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    improvement_id uuid NOT NULL,
    profile_id uuid,
    job_role_id uuid,
    hours_allocated numeric(10,2),
    is_baseline boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: inscricao_contribuinte; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inscricao_contribuinte (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    contribuinte_id uuid NOT NULL,
    situacao text DEFAULT 'sim'::text NOT NULL,
    numero_ie text,
    uf text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: itens_acao_1a1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.itens_acao_1a1 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    reuniao_id uuid,
    descricao text NOT NULL,
    responsavel_id uuid,
    prazo date,
    status text DEFAULT 'aberto'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: job_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    level text NOT NULL,
    category text,
    hourly_rate numeric(10,2) NOT NULL,
    monthly_salary_ref numeric(12,2),
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    cluster_id uuid,
    type text
);


--
-- Name: kpis_meta; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.kpis_meta (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    meta_id uuid,
    nome text NOT NULL,
    descricao text,
    valor_alvo numeric NOT NULL,
    valor_atual numeric DEFAULT 0,
    unidade text,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: melhoria_acoes_td; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.melhoria_acoes_td (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    melhoria_id uuid NOT NULL,
    acao_td text NOT NULL,
    ordem integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT melhoria_acoes_td_acao_td_check CHECK ((acao_td = ANY (ARRAY['Mapear AS-IS'::text, 'Padronizar'::text, 'Documentar'::text, 'Automatizar'::text, 'Redesenhar TO-BE'::text, 'Treinar'::text])))
);


--
-- Name: melhoria_processos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.melhoria_processos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    melhoria_id uuid NOT NULL,
    processo_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: melhoria_responsaveis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.melhoria_responsaveis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    melhoria_id uuid NOT NULL,
    responsavel_id uuid NOT NULL,
    papel text DEFAULT 'executor'::text NOT NULL,
    horas numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT melhoria_responsaveis_papel_check CHECK ((papel = ANY (ARRAY['executor'::text, 'treinando'::text])))
);


--
-- Name: melhoria_sistemas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.melhoria_sistemas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    melhoria_id uuid NOT NULL,
    sistema_id uuid NOT NULL,
    rateio numeric(7,2) DEFAULT 100,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: metas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.metas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ciclo_id uuid,
    meta_pai_id uuid,
    nivel text NOT NULL,
    dimensao text NOT NULL,
    titulo text NOT NULL,
    descricao text,
    criterio_evidencia text,
    prazo date,
    peso numeric DEFAULT 1.0,
    responsavel_id uuid,
    progresso_atual numeric DEFAULT 0,
    classificacao_final text,
    ajuste_qualitativo text,
    status text DEFAULT 'ativa'::text,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    ajuste_qualitativo_publico text,
    recomendacao_decisao text,
    ultima_atualizacao_membro timestamp with time zone,
    comentario_membro text,
    CONSTRAINT metas_recomendacao_decisao_check CHECK ((recomendacao_decisao = ANY (ARRAY['promover'::text, 'reajustar'::text, 'monitorar'::text, 'manter'::text])))
);


--
-- Name: notificacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    destinatario_id uuid NOT NULL,
    tipo public.notificacao_tipo NOT NULL,
    titulo text NOT NULL,
    corpo text,
    entidade_tipo text NOT NULL,
    entidade_id uuid NOT NULL,
    href text,
    agrupamento_chave text NOT NULL,
    quantidade integer DEFAULT 1 NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    lido_em timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid DEFAULT auth.uid(),
    CONSTRAINT notificacao_quantidade_check CHECK ((quantidade >= 1))
);


--
-- Name: TABLE notificacao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notificacao IS 'Caixa de entrada interna (o sino). Uma linha nao lida por destinatario e chave de agrupamento.';


--
-- Name: COLUMN notificacao.entidade_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notificacao.entidade_tipo IS 'Nome da tabela de origem do aviso: org_tasks, documento_arquivo, solicitacao, ...';


--
-- Name: COLUMN notificacao.entidade_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notificacao.entidade_id IS 'Id da linha de origem. Sem FK: a origem muda de tabela conforme o tipo.';


--
-- Name: COLUMN notificacao.href; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notificacao.href IS 'Rota do front para onde o clique no sino leva. Nulo = aviso sem destino.';


--
-- Name: COLUMN notificacao.agrupamento_chave; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notificacao.agrupamento_chave IS 'O que define "o mesmo aviso". NOT NULL: criar_notificacao() preenche com tipo:entidade_id quando o chamador nao passa nada.';


--
-- Name: COLUMN notificacao.quantidade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notificacao.quantidade IS 'Quantas vezes o mesmo evento repetiu enquanto o aviso seguia nao lido. Escrito so por criar_notificacao().';


--
-- Name: COLUMN notificacao.metadata; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notificacao.metadata IS 'Sobras do evento que o front usa para montar o texto. Nao e chave de nada.';


--
-- Name: COLUMN notificacao.lido_em; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notificacao.lido_em IS 'Unica coluna que o destinatario pode alterar (privilegio de coluna). Marcar como lida tira a linha do indice de agrupamento.';


--
-- Name: notificacao_envio; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.notificacao_envio (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    notificacao_id uuid,
    canal public.notificacao_canal NOT NULL,
    tipo public.notificacao_tipo NOT NULL,
    entidade_tipo text NOT NULL,
    entidade_id uuid NOT NULL,
    agrupamento_chave text,
    destinatario_id uuid,
    destinatario_email text,
    destinatario_telefone text,
    destinatario_papel text,
    sucesso boolean DEFAULT true NOT NULL,
    erro text,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    enviado_em timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: TABLE notificacao_envio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.notificacao_envio IS 'Log de borda: quem recebeu o que, por qual canal e quando. E o que permite nao repetir a mesma cobranca todo dia (ALE-1).';


--
-- Name: COLUMN notificacao_envio.notificacao_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notificacao_envio.notificacao_id IS 'NULAVEL de proposito: ha entrega sem linha no sino (e-mail ao cliente, que nao tem sino). Por isso tipo e entidade sao repetidos aqui: com o vinculo nulo, o log tem de se sustentar sozinho.';


--
-- Name: COLUMN notificacao_envio.destinatario_papel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.notificacao_envio.destinatario_papel IS 'cliente | responsavel | gestor, os mesmos papeis que notify-ticket ja monta.';


--
-- Name: novidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.novidades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    categoria text NOT NULL,
    titulo text NOT NULL,
    descricao text NOT NULL,
    data_publicacao timestamp with time zone DEFAULT now(),
    itens text[] DEFAULT '{}'::text[],
    imagem_url text,
    botao_texto text,
    botao_url text,
    ativo boolean DEFAULT true,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    conteudo_completo text,
    imagem_lateral_url text,
    imagem_lateral_posicao text DEFAULT 'direita'::text,
    texto_original text,
    CONSTRAINT novidades_categoria_check CHECK ((categoria = ANY (ARRAY['empresa'::text, 'tributario'::text, 'servicos'::text, 'cases'::text])))
);


--
-- Name: COLUMN novidades.conteudo_completo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.novidades.conteudo_completo IS 'Full content shown when "Ver mais" is clicked';


--
-- Name: COLUMN novidades.imagem_lateral_url; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.novidades.imagem_lateral_url IS 'URL for side image';


--
-- Name: COLUMN novidades.imagem_lateral_posicao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.novidades.imagem_lateral_posicao IS 'Position of side image: esquerda or direita';


--
-- Name: COLUMN novidades.texto_original; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.novidades.texto_original IS 'Original text before AI restructuring';


--
-- Name: org_comment_mentions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_comment_mentions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    comment_id uuid NOT NULL,
    mentioned_user_id uuid NOT NULL,
    lido_em timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    motivo text DEFAULT 'mencao'::text NOT NULL,
    CONSTRAINT org_comment_mentions_motivo_check CHECK ((motivo = ANY (ARRAY['mencao'::text, 'resposta'::text])))
);


--
-- Name: COLUMN org_comment_mentions.motivo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.org_comment_mentions.motivo IS 'Por que esta linha existe: ''mencao'' (o autor citou a pessoa no corpo) ou ''resposta'' (o autor respondeu um comentário dela). O UNIQUE (comment_id, mentioned_user_id) mantém uma linha só por pessoa e comentário — quando os dois acontecem no mesmo comentário, vale ''mencao'', que é o motivo mais forte.';


--
-- Name: org_project_members; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_project_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text DEFAULT 'member'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: org_task_comments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_task_comments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    task_id uuid NOT NULL,
    user_id uuid,
    user_name text,
    comment text NOT NULL,
    is_system boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: os_produtos_contratados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.os_produtos_contratados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ordem_servico_id uuid NOT NULL,
    produto_segmento_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    horas_contratadas numeric
);


--
-- Name: page_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.page_permissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    page_path text NOT NULL,
    page_name text NOT NULL,
    page_description text,
    category text DEFAULT 'geral'::text NOT NULL,
    is_active boolean DEFAULT true,
    requires_admin boolean DEFAULT false,
    requires_team_member boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: parentesco; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parentesco (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    pessoa_id uuid NOT NULL,
    parente_pessoa_id uuid NOT NULL,
    tipo text,
    natureza text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    CONSTRAINT parentesco_no_self CHECK ((pessoa_id <> parente_pessoa_id))
);


--
-- Name: per; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.per (
    nr_per character varying(50) NOT NULL,
    exercicio integer NOT NULL,
    tri_exercicio integer NOT NULL,
    dt_solicitada date NOT NULL,
    tp_credito character varying(50) NOT NULL,
    vlr_credito numeric(15,2) NOT NULL,
    nr_proc_ret character varying(50),
    criado_em timestamp with time zone DEFAULT now(),
    criado_por uuid,
    id_contribuinte uuid NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now(),
    atualizado_por uuid,
    vlr_ressarcido numeric DEFAULT 0,
    porcentagem_psa numeric,
    vlr_ressarcido_original numeric(18,2),
    CONSTRAINT per_tri_exercicio_check CHECK (((tri_exercicio >= 1) AND (tri_exercicio <= 4)))
);


--
-- Name: per_situacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.per_situacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nr_proc_per character varying(50) NOT NULL,
    situacao character varying(50) NOT NULL,
    dt_pagamento date,
    criado_em timestamp with time zone DEFAULT now(),
    criado_por uuid
);


--
-- Name: per_with_contribuinte; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.per_with_contribuinte WITH (security_invoker='true') AS
 SELECT p.nr_per,
    p.exercicio,
    p.tri_exercicio,
    p.dt_solicitada,
    p.tp_credito,
    p.vlr_credito,
    p.nr_proc_ret,
    p.criado_em,
    p.criado_por,
    p.id_contribuinte,
    p.atualizado_em,
    p.atualizado_por,
    p.vlr_ressarcido,
    p.porcentagem_psa,
    c.nome_razao_social AS contribuinte_nome,
    c.ambiente AS contribuinte_ambiente
   FROM (public.per p
     LEFT JOIN public.contribuinte c ON ((c.id = p.id_contribuinte)));


--
-- Name: performance_preferencias; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.performance_preferencias (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario_id uuid,
    periodo_padrao text DEFAULT '30d'::text,
    area_padrao text DEFAULT 'todas'::text,
    widgets_ocultos text[] DEFAULT '{}'::text[],
    updated_at timestamp with time zone DEFAULT now(),
    dashboard_layout jsonb DEFAULT '{}'::jsonb,
    CONSTRAINT performance_preferencias_periodo_padrao_check CHECK ((periodo_padrao = ANY (ARRAY['7d'::text, '30d'::text, '90d'::text, 'ciclo'::text])))
);


--
-- Name: pis_cofins_class; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pis_cofins_class (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cod_ncm text,
    cod_produto text,
    id_contribuinte uuid,
    id_regra uuid,
    classificado_por uuid,
    classificado_em timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: pis_cofins_regra; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pis_cofins_regra (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    id_segmento text NOT NULL,
    cod_ncm text NOT NULL,
    cst_pis text,
    cst_cofins text,
    desc_cst text,
    base_legal text,
    permite_credito text,
    tipo_credito text,
    observacoes text,
    data_vigencia_inicio bigint,
    data_vigencia_fim bigint,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now(),
    updated_by text
);


--
-- Name: ppr_regras_ciclo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ppr_regras_ciclo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ciclo_id uuid,
    faixa_minima numeric NOT NULL,
    faixa_maxima numeric,
    classificacao text NOT NULL,
    multiplicador_bonus numeric DEFAULT 1.0 NOT NULL,
    descricao_publica text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT ppr_regras_ciclo_classificacao_check CHECK ((classificacao = ANY (ARRAY['supera'::text, 'atende'::text, 'atende_parcialmente'::text, 'abaixo'::text])))
);


--
-- Name: procedimentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.procedimentos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    source_url text,
    source_type text NOT NULL,
    arquivo_path text,
    processos_associados text[] DEFAULT '{}'::text[],
    ai_titulo text,
    ai_resumo text,
    ai_etapas jsonb DEFAULT '[]'::jsonb,
    ai_complexidade text,
    ai_tags text[] DEFAULT '{}'::text[],
    status_geracao text DEFAULT 'processando'::text,
    status_publicacao text DEFAULT 'ativo'::text,
    erro_mensagem text,
    confirmado_por uuid,
    confirmado_em timestamp with time zone,
    created_by uuid DEFAULT auth.uid(),
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now(),
    ai_cover_url text,
    CONSTRAINT procedimentos_ai_complexidade_check CHECK ((ai_complexidade = ANY (ARRAY['simples'::text, 'intermediario'::text, 'avancado'::text]))),
    CONSTRAINT procedimentos_source_type_check CHECK ((source_type = ANY (ARRAY['link'::text, 'pdf'::text, 'docx'::text]))),
    CONSTRAINT procedimentos_status_geracao_check CHECK ((status_geracao = ANY (ARRAY['processando'::text, 'gerado'::text, 'erro'::text]))),
    CONSTRAINT procedimentos_status_publicacao_check CHECK ((status_publicacao = ANY (ARRAY['ativo'::text, 'em_revisao'::text, 'arquivado'::text])))
);


--
-- Name: process_improvements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_improvements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    process_id uuid NOT NULL,
    sprint_deliverable_id uuid,
    project_id uuid,
    baseline_time_hours numeric(10,2),
    baseline_cost_monthly numeric(12,2),
    baseline_volume integer,
    baseline_people_involved integer,
    improved_time_hours numeric(10,2),
    improved_cost_monthly numeric(12,2),
    improved_volume integer,
    improved_people_involved integer,
    evaluation_period_days integer DEFAULT 30,
    evaluation_start_date date,
    evaluation_end_date date,
    evaluation_status text DEFAULT 'pending'::text,
    time_saved_hours numeric(10,2),
    cost_saved_monthly numeric(12,2),
    time_saved_percent numeric(5,2),
    cost_saved_percent numeric(5,2),
    implementation_hours numeric(10,2),
    implementation_cost numeric(12,2),
    roi_time_months numeric(5,2),
    roi_fte_annual numeric(12,2),
    roi_percentage numeric(8,2),
    improvement_description text,
    evaluated_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    system_savings_monthly numeric DEFAULT 0,
    build_vs_buy_savings numeric DEFAULT 0,
    other_savings_monthly numeric DEFAULT 0,
    cluster_id uuid,
    improvement_status text,
    training_hours numeric(12,2) DEFAULT NULL::numeric,
    one_time_external_cost numeric(12,2) DEFAULT NULL::numeric
);


--
-- Name: process_scenarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_scenarios (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    process_id uuid NOT NULL,
    parent_scenario_id uuid,
    improvement_id uuid,
    project_id uuid,
    name text NOT NULL,
    description text,
    scenario_kind public.scenario_kind NOT NULL,
    scenario_type public.scenario_type DEFAULT 'variant'::public.scenario_type NOT NULL,
    unit_basis public.scenario_unit_basis DEFAULT 'per_month'::public.scenario_unit_basis NOT NULL,
    status public.scenario_status DEFAULT 'draft'::public.scenario_status NOT NULL,
    varied_field text NOT NULL,
    locked_fields text[] DEFAULT ARRAY[]::text[] NOT NULL,
    parameters jsonb NOT NULL,
    computed_metrics jsonb,
    is_locked boolean DEFAULT false NOT NULL,
    notes text,
    created_by uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    snapshot_at timestamp with time zone,
    annual_cost numeric(14,2) DEFAULT 0,
    annual_hours numeric(14,2) DEFAULT 0,
    annual_savings numeric(14,2) DEFAULT 0,
    roi_percent numeric(10,4) DEFAULT 0,
    payback_months numeric(10,2) DEFAULT 0,
    hours_freed numeric(14,2) DEFAULT 0,
    investment numeric(14,2) DEFAULT 0
);


--
-- Name: TABLE process_scenarios; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.process_scenarios IS 'Cenarios what-if de processos. Parameters jsonb e o snapshot imutavel das variaveis congeladas; varied_field e locked_fields documentam o contrato cientifico da simulacao.';


--
-- Name: COLUMN process_scenarios.scenario_kind; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.process_scenarios.scenario_kind IS 'scale=varia volume; efficiency=varia tempo; investment=varia custos de sistema/build vs buy';


--
-- Name: COLUMN process_scenarios.unit_basis; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.process_scenarios.unit_basis IS 'Base de calculo: per_unit, per_month ou per_year';


--
-- Name: COLUMN process_scenarios.parameters; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.process_scenarios.parameters IS 'Snapshot imutavel apos is_locked=true. Estrutura tipica: {time_hours, volume, people, cost_monthly, team_members[], savings[]}';


--
-- Name: process_stages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.process_stages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    process_id uuid,
    stage_order integer NOT NULL,
    name text NOT NULL,
    description text,
    responsible text,
    time_current text,
    time_target text,
    frequency text,
    volume text,
    automation_level text,
    inputs jsonb DEFAULT '[]'::jsonb,
    outputs jsonb DEFAULT '[]'::jsonb,
    systems jsonb DEFAULT '[]'::jsonb,
    related_projects text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    job_role_id uuid,
    scenario text DEFAULT 'AS-IS'::text NOT NULL,
    stage_as_is_id uuid,
    execution text,
    lead_time_days numeric(10,2) DEFAULT NULL::numeric,
    volume_per_process numeric(12,2) DEFAULT NULL::numeric,
    error_rate numeric(7,4) DEFAULT NULL::numeric,
    rework_rate numeric(7,4) DEFAULT NULL::numeric,
    error_cost numeric(12,2) DEFAULT NULL::numeric,
    error_volume numeric(12,2) DEFAULT NULL::numeric,
    CONSTRAINT process_stages_scenario_check CHECK ((scenario = ANY (ARRAY['AS-IS'::text, 'TO-BE'::text])))
);


--
-- Name: processes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.processes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    area text,
    stage text DEFAULT 'discovery'::text NOT NULL,
    priority text DEFAULT 'medium'::text,
    frequency text,
    volume_month integer,
    financial_impact text,
    project_id uuid,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    code character varying(50),
    client_id uuid,
    formatted_content text,
    document_path text,
    last_ai_sync timestamp with time zone,
    time_spent_hours numeric(10,2),
    time_spent_frequency text,
    cost_monthly numeric(12,2),
    volume_executions integer,
    people_involved integer DEFAULT 1,
    complexity_level text DEFAULT 'medium'::text,
    automation_potential numeric(5,2),
    evaluation_period_days integer DEFAULT 30,
    sop_link text,
    sop_document_path text,
    last_roi_percentage numeric,
    last_cost_saved_monthly numeric,
    last_time_saved_hours numeric,
    last_improvement_date timestamp with time zone,
    sop_before_link text,
    sop_before_document_path text,
    sop_before_content text,
    equipe_id uuid,
    cluster_id uuid,
    order_index integer,
    deliverable text,
    evaluation_status text,
    training_hours numeric(12,2) DEFAULT NULL::numeric,
    mapped_at timestamp with time zone
);


--
-- Name: COLUMN processes.equipe_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.processes.equipe_id IS 'FK opcional para estrutura_equipes. Quando preenchido, prevalece sobre catalog_clients para exibicao e agrupamento no mapeamento.';


--
-- Name: produto_documento_tipo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produto_documento_tipo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produto_segmento_id uuid NOT NULL,
    item_padrao_id uuid NOT NULL,
    obrigatorio boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid DEFAULT auth.uid()
);


--
-- Name: TABLE produto_documento_tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.produto_documento_tipo IS 'Vínculo produto x documento padrão: quais itens de checklist_item_padrao cada produto_segmento exige. Alimenta a geração da solicitação de documentos a partir da OS.';


--
-- Name: COLUMN produto_documento_tipo.obrigatorio; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.produto_documento_tipo.obrigatorio IS 'Override por produto do obrigatorio_default do item padrão.';


--
-- Name: produto_segmento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produto_segmento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    codigo text NOT NULL,
    nome text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    cluster_id uuid
);


--
-- Name: produto_servico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.produto_servico (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    produto_segmento_id uuid NOT NULL,
    servico_prestado_id uuid NOT NULL
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    first_name text NOT NULL,
    last_name text,
    phone text,
    company text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    email text,
    first_access_done boolean DEFAULT false,
    first_access_at timestamp with time zone,
    last_sign_in_at timestamp with time zone
);


--
-- Name: profiles_safe; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.profiles_safe WITH (security_invoker='true', security_barrier='true') AS
 SELECT id,
    first_name,
    last_name
   FROM public.list_profiles_safe() list_profiles_safe(id, first_name, last_name);


--
-- Name: project_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_type text,
    file_size bigint,
    category text DEFAULT 'general'::text,
    sprint_id uuid,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    process_id uuid
);


--
-- Name: project_processes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_processes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid,
    process_id uuid,
    impact_type text DEFAULT 'secundario'::text,
    impacted_stages text[] DEFAULT '{}'::text[],
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: project_servicos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.project_servicos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    servico_id uuid NOT NULL
);


--
-- Name: projects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'active'::text,
    client_name text,
    start_date date,
    end_date date,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    client_id uuid,
    external_client_id uuid,
    leader_id uuid,
    area text,
    product_service text,
    project_front text,
    justification_type text,
    justification_detail text,
    equipe_id uuid,
    cluster_id uuid,
    projects_per_year integer
);


--
-- Name: COLUMN projects.external_client_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.external_client_id IS 'Cliente PSA externo (da tabela cliente)';


--
-- Name: COLUMN projects.leader_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.leader_id IS 'Líder interno do projeto (da tabela profiles)';


--
-- Name: COLUMN projects.area; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.area IS 'Área do projeto: fiscal, consultoria, fixos, transversal, etc';


--
-- Name: COLUMN projects.product_service; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.product_service IS 'Produto ou serviço relacionado ao projeto';


--
-- Name: COLUMN projects.project_front; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.project_front IS 'Frente/categoria do projeto';


--
-- Name: COLUMN projects.justification_type; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.justification_type IS 'Tipo de justificativa: financeiro, tempo, comunicacao, automacao, qualidade, compliance';


--
-- Name: COLUMN projects.justification_detail; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.projects.justification_detail IS 'Detalhamento da justificativa do projeto';


--
-- Name: projeto_flag_valor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projeto_flag_valor (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    pj_pessoa_id uuid,
    flag_id uuid NOT NULL,
    valor boolean NOT NULL,
    setado_por_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: projeto_justificativas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projeto_justificativas (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    projeto_id uuid NOT NULL,
    justificativa text NOT NULL,
    ordem integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT projeto_justificativas_justificativa_check CHECK ((justificativa = ANY (ARRAY['Economia / Eficiência'::text, 'Automação'::text, 'Qualidade'::text, 'Comunicação'::text, 'Compliance'::text])))
);


--
-- Name: quadro_societario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quadro_societario (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    empresa_pessoa_id uuid NOT NULL,
    socio_pessoa_id uuid NOT NULL,
    quotas integer,
    vlr_total numeric,
    percentual numeric,
    data_referencia date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: COLUMN quadro_societario.empresa_pessoa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quadro_societario.empresa_pessoa_id IS 'PJ cujo quadro societário é descrito';


--
-- Name: COLUMN quadro_societario.socio_pessoa_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quadro_societario.socio_pessoa_id IS 'Sócio (pessoa) participante da PJ';


--
-- Name: COLUMN quadro_societario.percentual; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.quadro_societario.percentual IS 'Percentual de participação do sócio';


--
-- Name: relatorios_gerados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.relatorios_gerados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ciclo_id uuid,
    membro_id uuid,
    tipo text NOT NULL,
    conteudo_ia text,
    gerado_por uuid,
    gerado_em timestamp with time zone DEFAULT now(),
    status text DEFAULT 'gerando'::text,
    CONSTRAINT relatorios_gerados_status_check CHECK ((status = ANY (ARRAY['gerando'::text, 'pronto'::text, 'erro'::text]))),
    CONSTRAINT relatorios_gerados_tipo_check CHECK ((tipo = ANY (ARRAY['avaliacao_completa'::text, 'resumo_executivo'::text, 'recomendacao_bonus'::text, 'historico_evolucao'::text])))
);


--
-- Name: representante; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.representante (
    id_representante uuid DEFAULT gen_random_uuid() NOT NULL,
    id_cliente uuid NOT NULL,
    nome text NOT NULL,
    email text,
    telefone text,
    cargo text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    tipo_representante text,
    observacoes text,
    acesso_chamados boolean DEFAULT false,
    excluido boolean DEFAULT false NOT NULL,
    user_id uuid
);


--
-- Name: reunioes_1a1; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reunioes_1a1 (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    lider_id uuid,
    membro_id uuid,
    ciclo_id uuid,
    data_reuniao date NOT NULL,
    temas_discutidos text,
    sentimento integer,
    observacoes_lider text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: rls_precheck_allowed_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rls_precheck_allowed_tables (
    table_name text NOT NULL,
    allowed_ops text[] DEFAULT ARRAY[]::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: roi_snapshots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.roi_snapshots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    checkpoint_id uuid NOT NULL,
    scope_kind text NOT NULL,
    scope_id uuid,
    process_id uuid NOT NULL,
    label text,
    snapshot_at timestamp with time zone DEFAULT now() NOT NULL,
    annual_cost numeric,
    annual_hours numeric,
    annual_savings numeric,
    roi_percent numeric,
    payback_months numeric,
    hours_freed numeric,
    investment numeric,
    created_by uuid DEFAULT auth.uid(),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT roi_snapshots_scope_kind_check CHECK ((scope_kind = ANY (ARRAY['process'::text, 'project'::text])))
);


--
-- Name: TABLE roi_snapshots; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.roi_snapshots IS 'Histórico de mensurações de ROI por processo. checkpoint_id agrupa o save (1 linha = escopo process; N = escopo project). Append-only.';


--
-- Name: routines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.routines (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    title text NOT NULL,
    description text,
    frequency text DEFAULT 'daily'::text NOT NULL,
    status text DEFAULT 'pending'::text NOT NULL,
    assigned_to uuid,
    estimated_hours numeric,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_recurring boolean DEFAULT false,
    start_date date,
    due_date date
);


--
-- Name: servicos_prestados; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.servicos_prestados (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    cluster_id uuid
);


--
-- Name: setor_cliente; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.setor_cliente (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    sigla text NOT NULL,
    descricao text,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sistema_clusters; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sistema_clusters (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sistema_id uuid NOT NULL,
    cluster_id uuid NOT NULL,
    rateio numeric(7,2) DEFAULT 100,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sistema_responsaveis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sistema_responsaveis (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sistema_id uuid NOT NULL,
    responsavel_id uuid NOT NULL,
    horas numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: sistemas_processo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sistemas_processo (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    descricao text,
    tipo text,
    origem text,
    cluster_id uuid,
    custo_licenca_mensal numeric(12,2) DEFAULT 0,
    custo_variavel_por_uso numeric(12,2) DEFAULT 0,
    custo_por_operacao numeric(12,2) DEFAULT 0,
    custo_setup numeric(12,2) DEFAULT 0,
    tipo_custo text,
    obs_licenca text,
    obs_variavel text,
    obs_custo_por_operacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: solicitacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitacao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    cliente_id uuid NOT NULL,
    ordem_servico_id uuid,
    status public.osg_solicitacao_status DEFAULT 'rascunho'::public.osg_solicitacao_status NOT NULL,
    enviada_em timestamp with time zone,
    encerrada_em timestamp with time zone,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid DEFAULT auth.uid()
);


--
-- Name: TABLE solicitacao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitacao IS 'Cabeçalho do pedido de documentos ao cliente. No máximo um não encerrado por cliente.';


--
-- Name: COLUMN solicitacao.ordem_servico_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao.ordem_servico_id IS 'De qual OS o pedido nasceu. Nulo quando montado à mão.';


--
-- Name: COLUMN solicitacao.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao.status IS 'rascunho = o consultor ainda monta e o cliente não vê; enviada = o cliente vê; encerrada = ciclo fechado, libera abrir outro.';


--
-- Name: COLUMN solicitacao.enviada_em; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao.enviada_em IS 'Preenchido na transição para enviada (ALE-30).';


--
-- Name: COLUMN solicitacao.encerrada_em; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao.encerrada_em IS 'Preenchido na transição para encerrada (ALE-30). O encerramento é manual, nunca automático por completude.';


--
-- Name: solicitacao_item; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitacao_item (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    solicitacao_id uuid NOT NULL,
    item_padrao_id uuid,
    granularidade text NOT NULL,
    grupo public.osg_doc_grupo NOT NULL,
    documento text,
    entidade text,
    nota text,
    status public.osg_solicitacao_item_status DEFAULT 'ativo'::public.osg_solicitacao_item_status NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid DEFAULT auth.uid(),
    CONSTRAINT solicitacao_item_granularidade_chk CHECK ((granularidade = ANY (ARRAY['pessoa_pf'::text, 'pessoa_pj'::text, 'matricula_rural'::text, 'matricula_urbana'::text, 'bem'::text, 'cliente'::text])))
);


--
-- Name: TABLE solicitacao_item; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitacao_item IS 'A lista de documentos de um pedido. Item vindo do catálogo NÃO copia texto: documento, entidade e nota ficam nulos e a leitura herda de documento_tipo.';


--
-- Name: COLUMN solicitacao_item.item_padrao_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao_item.item_padrao_id IS 'Tipo do catálogo. Nulo = documento criado à mão pelo analista.';


--
-- Name: COLUMN solicitacao_item.granularidade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao_item.granularidade IS 'Por qual coisa o documento se repete: pessoa_pf, pessoa_pj, matricula_rural, matricula_urbana, bem ou cliente.';


--
-- Name: COLUMN solicitacao_item.grupo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao_item.grupo IS 'Gaveta da área do cliente. Dado gravado, não inferido de entidade nem de categoria.';


--
-- Name: COLUMN solicitacao_item.documento; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao_item.documento IS 'Nulo = herda de documento_tipo.documento. Preenchido = o analista sobrescreveu para este cliente.';


--
-- Name: COLUMN solicitacao_item.entidade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao_item.entidade IS 'Nulo = herda de documento_tipo.entidade. É só rótulo derivado da granularidade; NUNCA volta a ser eixo de agrupamento (quem agrupa é grupo).';


--
-- Name: COLUMN solicitacao_item.nota; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao_item.nota IS 'Nulo = herda de documento_tipo.nota. É a instrução que o cliente lê.';


--
-- Name: COLUMN solicitacao_item.status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao_item.status IS 'Intenção do analista: ativo ou dispensado. Nunca "recebido": o arquivo recebido não se liga ao item pedido.';


--
-- Name: COLUMN solicitacao_item.observacao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.solicitacao_item.observacao IS 'Motivo, quando o analista dispensa o item.';


--
-- Name: solicitacao_item_nao_aplicavel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.solicitacao_item_nao_aplicavel (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    solicitacao_item_id uuid NOT NULL,
    cliente_id uuid NOT NULL,
    pessoa_id uuid,
    bem_id uuid,
    matricula_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid DEFAULT auth.uid(),
    CONSTRAINT solicitacao_item_nao_aplicavel_um_alvo CHECK ((num_nonnulls(pessoa_id, bem_id, matricula_id) = 1))
);


--
-- Name: TABLE solicitacao_item_nao_aplicavel; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.solicitacao_item_nao_aplicavel IS 'Marca que um item ativo da solicitação não se aplica a uma pessoa, bem ou matrícula específicos.';


--
-- Name: sprint_backlog_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sprint_backlog_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sprint_id uuid,
    title text NOT NULL,
    description text,
    priority text DEFAULT 'medium'::text,
    estimated_hours numeric,
    suggested_by uuid,
    status text DEFAULT 'pending'::text,
    moved_to_deliverable_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_id uuid,
    cluster_id uuid
);


--
-- Name: sprint_deliverables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sprint_deliverables (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sprint_id uuid,
    title text NOT NULL,
    description text,
    assigned_to uuid,
    due_date date NOT NULL,
    status text DEFAULT 'pending'::text,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    estimated_hours numeric,
    start_date date,
    parent_id uuid,
    task_code text,
    project_id uuid,
    process_id uuid,
    actual_hours numeric,
    retrospective_report text,
    CONSTRAINT sprint_deliverables_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'in_progress'::text, 'completed'::text])))
);


--
-- Name: sprint_deliverables_backup_20260809; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sprint_deliverables_backup_20260809 (
    id uuid,
    sprint_id uuid,
    task_code text,
    title text,
    description text,
    salvo_em timestamp with time zone
);


--
-- Name: sprint_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sprint_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sprint_id uuid,
    title text NOT NULL,
    description text,
    event_date date NOT NULL,
    start_time time without time zone,
    end_time time without time zone,
    event_type text DEFAULT 'meeting'::text,
    participants uuid[] DEFAULT '{}'::uuid[],
    location text,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT sprint_events_event_type_check CHECK ((event_type = ANY (ARRAY['meeting'::text, 'session'::text, 'presentation'::text, 'daily'::text, 'planning'::text, 'retrospective'::text])))
);


--
-- Name: sprint_metrics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sprint_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sprint_id uuid,
    name text NOT NULL,
    target_value numeric,
    current_value numeric DEFAULT 0,
    unit text,
    category text,
    updated_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: sprints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sprints (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    goal text,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status text DEFAULT 'active'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    project_id uuid
);


--
-- Name: sprint_resumo; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.sprint_resumo WITH (security_invoker='on') AS
 WITH horas AS (
         SELECT d.sprint_id,
            sum(d.estimated_hours) AS horas_alocadas
           FROM public.sprint_deliverables d
          WHERE ((d.sprint_id IS NOT NULL) AND (d.assigned_to IS NOT NULL) AND (d.estimated_hours IS NOT NULL) AND (d.estimated_hours <> (0)::numeric) AND (NOT (EXISTS ( SELECT 1
                   FROM public.sprint_deliverables f
                  WHERE (f.parent_id = d.id)))))
          GROUP BY d.sprint_id
        ), impacto AS (
         SELECT d.sprint_id,
            sum(COALESCE(i.cost_saved_monthly, (0)::numeric)) AS custo_economizado_mensal,
            sum(COALESCE(i.time_saved_hours, (0)::numeric)) AS horas_liberadas,
            count(*) AS melhorias
           FROM (public.process_improvements i
             JOIN public.sprint_deliverables d ON ((d.id = i.sprint_deliverable_id)))
          WHERE ((i.evaluation_status = 'completed'::text) AND (d.sprint_id IS NOT NULL))
          GROUP BY d.sprint_id
        )
 SELECT s.id AS sprint_id,
    COALESCE(h.horas_alocadas, (0)::numeric) AS horas_alocadas,
    COALESCE(p.custo_economizado_mensal, (0)::numeric) AS custo_economizado_mensal,
    COALESCE(p.horas_liberadas, (0)::numeric) AS horas_liberadas,
    COALESCE(p.melhorias, (0)::bigint) AS melhorias
   FROM ((public.sprints s
     LEFT JOIN horas h ON ((h.sprint_id = s.id)))
     LEFT JOIN impacto p ON ((p.sprint_id = s.id)));


--
-- Name: VIEW sprint_resumo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON VIEW public.sprint_resumo IS 'Uma linha por sprint com os agregados que a lista /equipe/sprints exibe no card: horas alocadas (entregáveis-folha com responsável) e impacto das melhorias concluídas (custo mensal economizado, horas liberadas, contagem). Existe para a lista não precisar baixar os entregáveis de todas as sprints. Visibilidade = RLS das tabelas de origem (view security_invoker).';


--
-- Name: ticket_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_attachments (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    file_name text NOT NULL,
    file_path text NOT NULL,
    file_size bigint NOT NULL,
    file_type text,
    uploaded_by uuid,
    uploaded_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ticket_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ticket_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    ticket_id uuid NOT NULL,
    user_id uuid NOT NULL,
    message text NOT NULL,
    is_admin boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: tickets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tickets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    status text DEFAULT 'aberto'::text,
    priority text DEFAULT 'normal'::text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    department text,
    assigned_to uuid,
    activity_status text DEFAULT 'aguardando_resposta'::text,
    deadline date,
    estrutura_area_id uuid,
    cliente_id uuid,
    cluster_id uuid,
    closed_at timestamp with time zone,
    assigned_at timestamp with time zone,
    CONSTRAINT tickets_priority_check CHECK ((priority = ANY (ARRAY['baixa'::text, 'normal'::text, 'alta'::text, 'urgente'::text]))),
    CONSTRAINT tickets_status_check CHECK ((status = ANY (ARRAY['aberto'::text, 'em_andamento'::text, 'resolvido'::text, 'fechado'::text])))
);


--
-- Name: COLUMN tickets.estrutura_area_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tickets.estrutura_area_id IS 'Área/cluster do chamado — FK para estrutura_areas. Substitui o campo department hardcoded.';


--
-- Name: COLUMN tickets.cliente_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tickets.cliente_id IS 'Cliente-empresa vinculado ao chamado — FK para cliente.';


--
-- Name: titularidade; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.titularidade (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    matricula_id uuid,
    titular_pessoa_id uuid NOT NULL,
    tipo text NOT NULL,
    fracao numeric(7,4),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    bem_id uuid,
    integralizador boolean DEFAULT false NOT NULL,
    CONSTRAINT titularidade_ancora_xor CHECK ((((matricula_id IS NOT NULL) AND (bem_id IS NULL)) OR ((matricula_id IS NULL) AND (bem_id IS NOT NULL)))),
    CONSTRAINT titularidade_fracao_chk CHECK (((fracao > (0)::numeric) AND (fracao <= (100)::numeric))),
    CONSTRAINT titularidade_tipo_chk CHECK ((tipo = ANY (ARRAY['FATO'::text, 'DIREITO'::text, 'USUFRUTO'::text, 'NUE_PROP'::text])))
);


--
-- Name: COLUMN titularidade.matricula_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.titularidade.matricula_id IS 'Âncora em matrícula (imóvel). Exclusivo com bem_id.';


--
-- Name: COLUMN titularidade.bem_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.titularidade.bem_id IS 'Âncora direta no bem (sem matrícula). Exclusivo com matricula_id.';


--
-- Name: COLUMN titularidade.integralizador; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.titularidade.integralizador IS 'Titular que integraliza e lidera a descrição do imóvel; os demais titulares viram a área remanescente. Máx. um por âncora (índices únicos parciais).';


--
-- Name: tmpl_bloco; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tmpl_bloco (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    categoria text,
    descricao text,
    escopo_documento_raiz_id uuid,
    bloco_origem_id uuid,
    tipo_derivacao text,
    ativo boolean DEFAULT true NOT NULL,
    autor_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    tipo text DEFAULT 'livre'::text NOT NULL,
    repete_colecao text,
    ancora text,
    familia_id uuid,
    variante_seletor jsonb,
    variante_rotulo text,
    variante_ordem integer,
    CONSTRAINT tmpl_bloco_ancora_formato CHECK ((ancora ~ '^[A-Za-z_][A-Za-z0-9_]*$'::text)),
    CONSTRAINT tmpl_bloco_familia_nao_auto CHECK (((familia_id IS NULL) OR (familia_id <> id))),
    CONSTRAINT tmpl_bloco_tipo_check CHECK ((tipo = ANY (ARRAY['capitulo'::text, 'clausula'::text, 'paragrafo'::text, 'livre'::text]))),
    CONSTRAINT tmpl_bloco_variante_coerente CHECK ((((familia_id IS NULL) AND (variante_seletor IS NULL) AND (variante_rotulo IS NULL) AND (variante_ordem IS NULL)) OR ((familia_id IS NOT NULL) AND (variante_seletor IS NOT NULL) AND (variante_ordem IS NOT NULL)))),
    CONSTRAINT tmpl_bloco_variante_nao_repete CHECK (((familia_id IS NULL) OR (repete_colecao IS NULL))),
    CONSTRAINT tmpl_bloco_variante_seletor_objeto CHECK (((variante_seletor IS NULL) OR (jsonb_typeof(variante_seletor) = 'object'::text)))
);


--
-- Name: COLUMN tmpl_bloco.tipo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tmpl_bloco.tipo IS 'Tipo estrutural: capitulo, clausula, paragrafo ou livre. Governa a numeração automática na composição.';


--
-- Name: COLUMN tmpl_bloco.repete_colecao; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tmpl_bloco.repete_colecao IS 'Coleção do contexto sobre a qual o bloco repete na composição (uma instância por item; parágrafo repetidor). Nulo = bloco normal.';


--
-- Name: COLUMN tmpl_bloco.ancora; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tmpl_bloco.ancora IS 'Âncora estável p/ referências de numeração: outros blocos citam {{ refs.<ancora> }}. Só letras/dígitos/underscore.';


--
-- Name: COLUMN tmpl_bloco.familia_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tmpl_bloco.familia_id IS 'Cabeça da família de variantes deste bloco. Nulo = bloco normal (comportamento de sempre). Preenchido = este bloco é UMA variante, e quem entra no modelo é a cabeça.';


--
-- Name: COLUMN tmpl_bloco.variante_seletor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tmpl_bloco.variante_seletor IS 'Condições que fazem esta variante ser a escolhida, como mapa campo => valor esperado, avaliado contra o item da coleção na expansão. Objeto vazio = variante padrão (atende qualquer caso).';


--
-- Name: COLUMN tmpl_bloco.variante_rotulo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tmpl_bloco.variante_rotulo IS 'Rótulo curto do caso ("Rural, condomínio, propriedade"), para a Biblioteca e para quem monta o modelo.';


--
-- Name: COLUMN tmpl_bloco.variante_ordem; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tmpl_bloco.variante_ordem IS 'Ordem de avaliação dentro da família (menor primeiro). A variante padrão fica por último, senão ela captura todos os casos.';


--
-- Name: tmpl_bloco_flag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tmpl_bloco_flag (
    bloco_id uuid NOT NULL,
    flag_id uuid NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: tmpl_bloco_versao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tmpl_bloco_versao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bloco_id uuid NOT NULL,
    numero_versao integer NOT NULL,
    caminho_arquivo text,
    checksum text,
    atual boolean DEFAULT false NOT NULL,
    autor_id uuid,
    changelog text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    conteudo text
);


--
-- Name: tmpl_documento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tmpl_documento (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    tipo text,
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: tmpl_documento_bloco; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tmpl_documento_bloco (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    documento_id uuid NOT NULL,
    bloco_id uuid NOT NULL,
    ordem integer NOT NULL,
    obrigatorio boolean DEFAULT false NOT NULL,
    observacao text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: tmpl_flag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tmpl_flag (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    tipo text NOT NULL,
    escopo text NOT NULL,
    expressao_sql text,
    descricao text,
    ativo boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by uuid,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    entidade text,
    campo text,
    valor text,
    CONSTRAINT tmpl_flag_definicao_por_tipo CHECK ((((tipo = 'manual'::text) AND (expressao_sql IS NULL) AND (entidade IS NULL) AND (campo IS NULL) AND (valor IS NULL)) OR ((tipo = 'derivada'::text) AND (((expressao_sql IS NOT NULL) AND (entidade IS NULL) AND (campo IS NULL) AND (valor IS NULL)) OR ((expressao_sql IS NULL) AND (entidade IS NOT NULL) AND (campo IS NOT NULL) AND (valor IS NOT NULL)))))),
    CONSTRAINT tmpl_flag_escopo_check CHECK ((escopo = ANY (ARRAY['cliente'::text, 'pj'::text]))),
    CONSTRAINT tmpl_flag_tipo_check CHECK ((tipo = ANY (ARRAY['derivada'::text, 'manual'::text])))
);


--
-- Name: COLUMN tmpl_flag.entidade; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tmpl_flag.entidade IS 'Flag declarativa: chave da fonte no contexto de geração (ex.: empresa)';


--
-- Name: COLUMN tmpl_flag.campo; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tmpl_flag.campo IS 'Flag declarativa: campo do registro da fonte (ex.: tipo_empresa)';


--
-- Name: COLUMN tmpl_flag.valor; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.tmpl_flag.valor IS 'Flag declarativa: valor que ativa a flag (ex.: PR)';


--
-- Name: tool_area_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tool_area_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tool_id uuid,
    area text NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now()
);


--
-- Name: tools; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tools (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    description text,
    status text DEFAULT 'development'::text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_page_access; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_page_access (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    page_permission_id uuid NOT NULL,
    granted_by uuid,
    granted_at timestamp with time zone DEFAULT now()
);


--
-- Name: user_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    role public.app_role DEFAULT 'client'::public.app_role NOT NULL
);


--
-- Name: work_package_code_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_package_code_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: access_change_log access_change_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.access_change_log
    ADD CONSTRAINT access_change_log_pkey PRIMARY KEY (id);


--
-- Name: administracao administracao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracao
    ADD CONSTRAINT administracao_pkey PRIMARY KEY (id);


--
-- Name: administracao administracao_poderes_objeto; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.administracao
    ADD CONSTRAINT administracao_poderes_objeto CHECK (((poderes IS NULL) OR (jsonb_typeof(poderes) = 'object'::text))) NOT VALID;


--
-- Name: analises_semestrais analises_semestrais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analises_semestrais
    ADD CONSTRAINT analises_semestrais_pkey PRIMARY KEY (id);


--
-- Name: atualizacoes_meta atualizacoes_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atualizacoes_meta
    ADD CONSTRAINT atualizacoes_meta_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: bem bem_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bem
    ADD CONSTRAINT bem_pkey PRIMARY KEY (id);


--
-- Name: bem bem_referencia_unq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bem
    ADD CONSTRAINT bem_referencia_unq UNIQUE (cliente_id, referencia_dp);


--
-- Name: bkp_20260807_ticket_messages_dup bkp_20260807_ticket_messages_dup_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bkp_20260807_ticket_messages_dup
    ADD CONSTRAINT bkp_20260807_ticket_messages_dup_pkey PRIMARY KEY (id);


--
-- Name: capital_integralizacao capital_integralizacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_integralizacao
    ADD CONSTRAINT capital_integralizacao_pkey PRIMARY KEY (id);


--
-- Name: cartorio cartorio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cartorio
    ADD CONSTRAINT cartorio_pkey PRIMARY KEY (id);


--
-- Name: cartorio cartorio_unq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cartorio
    ADD CONSTRAINT cartorio_unq UNIQUE (nome_completo, comarca, uf);


--
-- Name: catalog_clients catalog_clients_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_clients
    ADD CONSTRAINT catalog_clients_name_key UNIQUE (name);


--
-- Name: catalog_clients catalog_clients_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_clients
    ADD CONSTRAINT catalog_clients_pkey PRIMARY KEY (id);


--
-- Name: centros_custo centros_custo_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.centros_custo
    ADD CONSTRAINT centros_custo_codigo_key UNIQUE (codigo);


--
-- Name: centros_custo centros_custo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.centros_custo
    ADD CONSTRAINT centros_custo_pkey PRIMARY KEY (id);


--
-- Name: checklist_cliente_item checklist_cliente_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_cliente_item
    ADD CONSTRAINT checklist_cliente_item_pkey PRIMARY KEY (id);


--
-- Name: ciclos_avaliacao ciclos_avaliacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ciclos_avaliacao
    ADD CONSTRAINT ciclos_avaliacao_pkey PRIMARY KEY (id);


--
-- Name: client_documents client_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_documents
    ADD CONSTRAINT client_documents_pkey PRIMARY KEY (id);


--
-- Name: client_visible_projects client_visible_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_visible_projects
    ADD CONSTRAINT client_visible_projects_pkey PRIMARY KEY (id);


--
-- Name: client_visible_projects client_visible_projects_user_id_project_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_visible_projects
    ADD CONSTRAINT client_visible_projects_user_id_project_id_key UNIQUE (user_id, project_id);


--
-- Name: cliente_clusters cliente_clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_clusters
    ADD CONSTRAINT cliente_clusters_pkey PRIMARY KEY (id);


--
-- Name: cliente cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente
    ADD CONSTRAINT cliente_pkey PRIMARY KEY (id);


--
-- Name: codigo_receita codigo_receita_grupo_codigo_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codigo_receita
    ADD CONSTRAINT codigo_receita_grupo_codigo_unique UNIQUE (grupo_tributo_id, codigo);


--
-- Name: codigo_receita codigo_receita_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codigo_receita
    ADD CONSTRAINT codigo_receita_pkey PRIMARY KEY (id);


--
-- Name: comentarios_avaliacao comentarios_avaliacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comentarios_avaliacao
    ADD CONSTRAINT comentarios_avaliacao_pkey PRIMARY KEY (id);


--
-- Name: contatos contatos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contatos
    ADD CONSTRAINT contatos_pkey PRIMARY KEY (id);


--
-- Name: contribuinte_bal_config contribuinte_bal_config_id_contribuinte_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribuinte_bal_config
    ADD CONSTRAINT contribuinte_bal_config_id_contribuinte_key UNIQUE (id_contribuinte);


--
-- Name: contribuinte_bal_config contribuinte_bal_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribuinte_bal_config
    ADD CONSTRAINT contribuinte_bal_config_pkey PRIMARY KEY (id);


--
-- Name: contribuinte contribuinte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribuinte
    ADD CONSTRAINT contribuinte_pkey PRIMARY KEY (id);


--
-- Name: correcoes_icms correcoes_icms_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.correcoes_icms
    ADD CONSTRAINT correcoes_icms_pkey PRIMARY KEY (id);


--
-- Name: daily_standups daily_standups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_standups
    ADD CONSTRAINT daily_standups_pkey PRIMARY KEY (id);


--
-- Name: daily_standups daily_standups_user_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_standups
    ADD CONSTRAINT daily_standups_user_id_date_key UNIQUE (user_id, date);


--
-- Name: dashboard_cliente_access dashboard_cliente_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cliente_access
    ADD CONSTRAINT dashboard_cliente_access_pkey PRIMARY KEY (id);


--
-- Name: dashboard_cliente_access dashboard_cliente_access_unq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cliente_access
    ADD CONSTRAINT dashboard_cliente_access_unq UNIQUE (dashboard_id, cliente_id);


--
-- Name: dashboard_cluster_access dashboard_cluster_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cluster_access
    ADD CONSTRAINT dashboard_cluster_access_pkey PRIMARY KEY (id);


--
-- Name: dashboard_cluster_access dashboard_cluster_access_unq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cluster_access
    ADD CONSTRAINT dashboard_cluster_access_unq UNIQUE (dashboard_id, cluster_id);


--
-- Name: dashboards dashboards_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_pkey PRIMARY KEY (id);


--
-- Name: dcomp dcomp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dcomp
    ADD CONSTRAINT dcomp_pkey PRIMARY KEY (nr_documento);


--
-- Name: deliverable_attachments deliverable_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverable_attachments
    ADD CONSTRAINT deliverable_attachments_pkey PRIMARY KEY (id);


--
-- Name: demand_items demand_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_pkey PRIMARY KEY (id);


--
-- Name: difal_decisao difal_decisao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difal_decisao
    ADD CONSTRAINT difal_decisao_pkey PRIMARY KEY (id);


--
-- Name: difal_decisao difal_decisao_sessao_id_cod_ncm_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difal_decisao
    ADD CONSTRAINT difal_decisao_sessao_id_cod_ncm_key UNIQUE (sessao_id, cod_ncm);


--
-- Name: difal_sessao difal_sessao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difal_sessao
    ADD CONSTRAINT difal_sessao_pkey PRIMARY KEY (id);


--
-- Name: distribuicao_dcomp distribuicao_dcomp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribuicao_dcomp
    ADD CONSTRAINT distribuicao_dcomp_pkey PRIMARY KEY (id);


--
-- Name: distribuicao_receita distribuicao_receita_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribuicao_receita
    ADD CONSTRAINT distribuicao_receita_pkey PRIMARY KEY (id);


--
-- Name: documento_arquivo documento_arquivo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_arquivo
    ADD CONSTRAINT documento_arquivo_pkey PRIMARY KEY (id);


--
-- Name: documento_gerado documento_gerado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_gerado
    ADD CONSTRAINT documento_gerado_pkey PRIMARY KEY (id);


--
-- Name: documento_horas_historico documento_horas_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_horas_historico
    ADD CONSTRAINT documento_horas_historico_pkey PRIMARY KEY (id);


--
-- Name: documento_notificacao_visto documento_notificacao_visto_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_notificacao_visto
    ADD CONSTRAINT documento_notificacao_visto_pkey PRIMARY KEY (user_id, documento_gerado_id);


--
-- Name: documento_override documento_override_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_override
    ADD CONSTRAINT documento_override_pkey PRIMARY KEY (id);


--
-- Name: documento_tipo documento_tipo_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_tipo
    ADD CONSTRAINT documento_tipo_codigo_key UNIQUE (codigo);


--
-- Name: documento_tipo documento_tipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_tipo
    ADD CONSTRAINT documento_tipo_pkey PRIMARY KEY (id);


--
-- Name: documentos_processo documentos_processo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_processo
    ADD CONSTRAINT documentos_processo_pkey PRIMARY KEY (id);


--
-- Name: documents documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_pkey PRIMARY KEY (id);


--
-- Name: efd_correcoes efd_correcoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.efd_correcoes
    ADD CONSTRAINT efd_correcoes_pkey PRIMARY KEY (id);


--
-- Name: estrutura_areas estrutura_areas_cluster_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_areas
    ADD CONSTRAINT estrutura_areas_cluster_id_name_key UNIQUE (cluster_id, name);


--
-- Name: estrutura_areas estrutura_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_areas
    ADD CONSTRAINT estrutura_areas_pkey PRIMARY KEY (id);


--
-- Name: estrutura_clusters estrutura_clusters_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_clusters
    ADD CONSTRAINT estrutura_clusters_name_key UNIQUE (name);


--
-- Name: estrutura_clusters estrutura_clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_clusters
    ADD CONSTRAINT estrutura_clusters_pkey PRIMARY KEY (id);


--
-- Name: estrutura_equipe_membros estrutura_equipe_membros_equipe_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_equipe_membros
    ADD CONSTRAINT estrutura_equipe_membros_equipe_id_user_id_key UNIQUE (equipe_id, user_id);


--
-- Name: estrutura_equipe_membros estrutura_equipe_membros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_equipe_membros
    ADD CONSTRAINT estrutura_equipe_membros_pkey PRIMARY KEY (id);


--
-- Name: estrutura_equipes estrutura_equipes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_equipes
    ADD CONSTRAINT estrutura_equipes_pkey PRIMARY KEY (id);


--
-- Name: etapa_documentos etapa_documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_documentos
    ADD CONSTRAINT etapa_documentos_pkey PRIMARY KEY (id);


--
-- Name: etapa_documentos etapa_documentos_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_documentos
    ADD CONSTRAINT etapa_documentos_uniq UNIQUE (etapa_id, scenario, documento_id, sentido);


--
-- Name: etapa_responsaveis etapa_responsaveis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_responsaveis
    ADD CONSTRAINT etapa_responsaveis_pkey PRIMARY KEY (id);


--
-- Name: etapa_responsaveis etapa_responsaveis_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_responsaveis
    ADD CONSTRAINT etapa_responsaveis_uniq UNIQUE (etapa_id, scenario, responsavel_id, papel);


--
-- Name: etapa_sistemas etapa_sistemas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_sistemas
    ADD CONSTRAINT etapa_sistemas_pkey PRIMARY KEY (id);


--
-- Name: etapa_sistemas etapa_sistemas_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_sistemas
    ADD CONSTRAINT etapa_sistemas_uniq UNIQUE (etapa_id, scenario, sistema_id);


--
-- Name: exploracao_rural exploracao_rural_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exploracao_rural
    ADD CONSTRAINT exploracao_rural_pkey PRIMARY KEY (id);


--
-- Name: export_profiles export_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.export_profiles
    ADD CONSTRAINT export_profiles_pkey PRIMARY KEY (id);


--
-- Name: feedbacks feedbacks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_pkey PRIMARY KEY (id);


--
-- Name: gargalo_etapas gargalo_etapas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_etapas
    ADD CONSTRAINT gargalo_etapas_pkey PRIMARY KEY (id);


--
-- Name: gargalo_etapas gargalo_etapas_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_etapas
    ADD CONSTRAINT gargalo_etapas_uniq UNIQUE (gargalo_id, etapa_id, scenario);


--
-- Name: gargalo_melhorias gargalo_melhorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_melhorias
    ADD CONSTRAINT gargalo_melhorias_pkey PRIMARY KEY (id);


--
-- Name: gargalo_melhorias gargalo_melhorias_uniq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_melhorias
    ADD CONSTRAINT gargalo_melhorias_uniq UNIQUE (gargalo_id, melhoria_id);


--
-- Name: gargalo_processos gargalo_processos_gargalo_id_processo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_processos
    ADD CONSTRAINT gargalo_processos_gargalo_id_processo_id_key UNIQUE (gargalo_id, processo_id);


--
-- Name: gargalo_processos gargalo_processos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_processos
    ADD CONSTRAINT gargalo_processos_pkey PRIMARY KEY (id);


--
-- Name: gargalo_responsaveis gargalo_responsaveis_gargalo_id_responsavel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_responsaveis
    ADD CONSTRAINT gargalo_responsaveis_gargalo_id_responsavel_id_key UNIQUE (gargalo_id, responsavel_id);


--
-- Name: gargalo_responsaveis gargalo_responsaveis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_responsaveis
    ADD CONSTRAINT gargalo_responsaveis_pkey PRIMARY KEY (id);


--
-- Name: gargalos gargalos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalos
    ADD CONSTRAINT gargalos_pkey PRIMARY KEY (id);


--
-- Name: grupo_tributo grupo_tributo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_tributo
    ADD CONSTRAINT grupo_tributo_pkey PRIMARY KEY (id);


--
-- Name: grupo_tributo grupo_tributo_sigla_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.grupo_tributo
    ADD CONSTRAINT grupo_tributo_sigla_key UNIQUE (sigla);


--
-- Name: impedimento impedimento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impedimento
    ADD CONSTRAINT impedimento_pkey PRIMARY KEY (id);


--
-- Name: improvement_savings_details improvement_savings_details_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_savings_details
    ADD CONSTRAINT improvement_savings_details_pkey PRIMARY KEY (id);


--
-- Name: improvement_team_members improvement_team_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_team_members
    ADD CONSTRAINT improvement_team_members_pkey PRIMARY KEY (id);


--
-- Name: inscricao_contribuinte inscricao_contribuinte_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscricao_contribuinte
    ADD CONSTRAINT inscricao_contribuinte_pkey PRIMARY KEY (id);


--
-- Name: itens_acao_1a1 itens_acao_1a1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_acao_1a1
    ADD CONSTRAINT itens_acao_1a1_pkey PRIMARY KEY (id);


--
-- Name: job_roles job_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_roles
    ADD CONSTRAINT job_roles_pkey PRIMARY KEY (id);


--
-- Name: kpis_meta kpis_meta_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpis_meta
    ADD CONSTRAINT kpis_meta_pkey PRIMARY KEY (id);


--
-- Name: matricula matricula_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT matricula_pkey PRIMARY KEY (id);


--
-- Name: melhoria_acoes_td melhoria_acoes_td_melhoria_id_acao_td_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_acoes_td
    ADD CONSTRAINT melhoria_acoes_td_melhoria_id_acao_td_key UNIQUE (melhoria_id, acao_td);


--
-- Name: melhoria_acoes_td melhoria_acoes_td_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_acoes_td
    ADD CONSTRAINT melhoria_acoes_td_pkey PRIMARY KEY (id);


--
-- Name: melhoria_processos melhoria_processos_melhoria_id_processo_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_processos
    ADD CONSTRAINT melhoria_processos_melhoria_id_processo_id_key UNIQUE (melhoria_id, processo_id);


--
-- Name: melhoria_processos melhoria_processos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_processos
    ADD CONSTRAINT melhoria_processos_pkey PRIMARY KEY (id);


--
-- Name: melhoria_responsaveis melhoria_responsaveis_melhoria_id_responsavel_id_papel_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_responsaveis
    ADD CONSTRAINT melhoria_responsaveis_melhoria_id_responsavel_id_papel_key UNIQUE (melhoria_id, responsavel_id, papel);


--
-- Name: melhoria_responsaveis melhoria_responsaveis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_responsaveis
    ADD CONSTRAINT melhoria_responsaveis_pkey PRIMARY KEY (id);


--
-- Name: melhoria_sistemas melhoria_sistemas_melhoria_id_sistema_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_sistemas
    ADD CONSTRAINT melhoria_sistemas_melhoria_id_sistema_id_key UNIQUE (melhoria_id, sistema_id);


--
-- Name: melhoria_sistemas melhoria_sistemas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_sistemas
    ADD CONSTRAINT melhoria_sistemas_pkey PRIMARY KEY (id);


--
-- Name: metas metas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metas
    ADD CONSTRAINT metas_pkey PRIMARY KEY (id);


--
-- Name: notificacao_envio notificacao_envio_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacao_envio
    ADD CONSTRAINT notificacao_envio_pkey PRIMARY KEY (id);


--
-- Name: notificacao notificacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacao
    ADD CONSTRAINT notificacao_pkey PRIMARY KEY (id);


--
-- Name: novidades novidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.novidades
    ADD CONSTRAINT novidades_pkey PRIMARY KEY (id);


--
-- Name: ordem_servico ordem_servico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordem_servico
    ADD CONSTRAINT ordem_servico_pkey PRIMARY KEY (id);


--
-- Name: org_comment_attachments org_comment_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comment_attachments
    ADD CONSTRAINT org_comment_attachments_pkey PRIMARY KEY (id);


--
-- Name: org_comment_mentions org_comment_mentions_comment_id_mentioned_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comment_mentions
    ADD CONSTRAINT org_comment_mentions_comment_id_mentioned_user_id_key UNIQUE (comment_id, mentioned_user_id);


--
-- Name: org_comment_mentions org_comment_mentions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comment_mentions
    ADD CONSTRAINT org_comment_mentions_pkey PRIMARY KEY (id);


--
-- Name: org_comments org_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comments
    ADD CONSTRAINT org_comments_pkey PRIMARY KEY (id);


--
-- Name: org_project_members org_project_members_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_project_members
    ADD CONSTRAINT org_project_members_pkey PRIMARY KEY (id);


--
-- Name: org_project_members org_project_members_project_id_user_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_project_members
    ADD CONSTRAINT org_project_members_project_id_user_id_key UNIQUE (project_id, user_id);


--
-- Name: org_projects org_projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_projects
    ADD CONSTRAINT org_projects_pkey PRIMARY KEY (id);


--
-- Name: org_task_comments org_task_comments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_task_comments
    ADD CONSTRAINT org_task_comments_pkey PRIMARY KEY (id);


--
-- Name: org_tasks org_tasks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tasks
    ADD CONSTRAINT org_tasks_pkey PRIMARY KEY (id);


--
-- Name: os_produtos_contratados os_produtos_contratados_ordem_servico_id_produto_segmento_i_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.os_produtos_contratados
    ADD CONSTRAINT os_produtos_contratados_ordem_servico_id_produto_segmento_i_key UNIQUE (ordem_servico_id, produto_segmento_id);


--
-- Name: os_produtos_contratados os_produtos_contratados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.os_produtos_contratados
    ADD CONSTRAINT os_produtos_contratados_pkey PRIMARY KEY (id);


--
-- Name: page_permissions page_permissions_page_path_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_permissions
    ADD CONSTRAINT page_permissions_page_path_key UNIQUE (page_path);


--
-- Name: page_permissions page_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.page_permissions
    ADD CONSTRAINT page_permissions_pkey PRIMARY KEY (id);


--
-- Name: parentesco parentesco_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parentesco
    ADD CONSTRAINT parentesco_pkey PRIMARY KEY (id);


--
-- Name: per per_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.per
    ADD CONSTRAINT per_pkey PRIMARY KEY (nr_per);


--
-- Name: per_situacao per_situacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.per_situacao
    ADD CONSTRAINT per_situacao_pkey PRIMARY KEY (id);


--
-- Name: performance_preferencias performance_preferencias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_preferencias
    ADD CONSTRAINT performance_preferencias_pkey PRIMARY KEY (id);


--
-- Name: performance_preferencias performance_preferencias_usuario_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.performance_preferencias
    ADD CONSTRAINT performance_preferencias_usuario_id_key UNIQUE (usuario_id);


--
-- Name: pessoa pessoa_conjuge_nao_e_a_propria; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.pessoa
    ADD CONSTRAINT pessoa_conjuge_nao_e_a_propria CHECK ((conjuge_id IS DISTINCT FROM id)) NOT VALID;


--
-- Name: pessoa pessoa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pessoa
    ADD CONSTRAINT pessoa_pkey PRIMARY KEY (id);


--
-- Name: pis_cofins_class pis_cofins_class_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pis_cofins_class
    ADD CONSTRAINT pis_cofins_class_pkey PRIMARY KEY (id);


--
-- Name: pis_cofins_regra pis_cofins_regra_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pis_cofins_regra
    ADD CONSTRAINT pis_cofins_regra_pkey PRIMARY KEY (id);


--
-- Name: ppr_regras_ciclo ppr_regras_ciclo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppr_regras_ciclo
    ADD CONSTRAINT ppr_regras_ciclo_pkey PRIMARY KEY (id);


--
-- Name: procedimentos procedimentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.procedimentos
    ADD CONSTRAINT procedimentos_pkey PRIMARY KEY (id);


--
-- Name: process_improvements process_improvements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_improvements
    ADD CONSTRAINT process_improvements_pkey PRIMARY KEY (id);


--
-- Name: process_scenarios process_scenarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_scenarios
    ADD CONSTRAINT process_scenarios_pkey PRIMARY KEY (id);


--
-- Name: process_stages process_stages_id_scenario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_stages
    ADD CONSTRAINT process_stages_id_scenario_key UNIQUE (id, scenario);


--
-- Name: process_stages process_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_stages
    ADD CONSTRAINT process_stages_pkey PRIMARY KEY (id, scenario);


--
-- Name: processes processes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_pkey PRIMARY KEY (id);


--
-- Name: produto_documento_tipo produto_documento_tipo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_documento_tipo
    ADD CONSTRAINT produto_documento_tipo_pkey PRIMARY KEY (id);


--
-- Name: produto_documento_tipo produto_documento_tipo_unq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_documento_tipo
    ADD CONSTRAINT produto_documento_tipo_unq UNIQUE (produto_segmento_id, item_padrao_id);


--
-- Name: produto_segmento produto_segmento_codigo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_segmento
    ADD CONSTRAINT produto_segmento_codigo_key UNIQUE (codigo);


--
-- Name: produto_segmento produto_segmento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_segmento
    ADD CONSTRAINT produto_segmento_pkey PRIMARY KEY (id);


--
-- Name: produto_servico produto_servico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_servico
    ADD CONSTRAINT produto_servico_pkey PRIMARY KEY (id);


--
-- Name: produto_servico produto_servico_produto_segmento_id_servico_prestado_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_servico
    ADD CONSTRAINT produto_servico_produto_segmento_id_servico_prestado_id_key UNIQUE (produto_segmento_id, servico_prestado_id);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: project_documents project_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_pkey PRIMARY KEY (id);


--
-- Name: project_processes project_processes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_processes
    ADD CONSTRAINT project_processes_pkey PRIMARY KEY (id);


--
-- Name: project_processes project_processes_project_id_process_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_processes
    ADD CONSTRAINT project_processes_project_id_process_id_key UNIQUE (project_id, process_id);


--
-- Name: projects projects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_pkey PRIMARY KEY (id);


--
-- Name: projeto_flag_valor projeto_flag_valor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_flag_valor
    ADD CONSTRAINT projeto_flag_valor_pkey PRIMARY KEY (id);


--
-- Name: projeto_justificativas projeto_justificativas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_justificativas
    ADD CONSTRAINT projeto_justificativas_pkey PRIMARY KEY (id);


--
-- Name: projeto_justificativas projeto_justificativas_projeto_id_justificativa_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_justificativas
    ADD CONSTRAINT projeto_justificativas_projeto_id_justificativa_key UNIQUE (projeto_id, justificativa);


--
-- Name: quadro_societario quadro_societario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quadro_societario
    ADD CONSTRAINT quadro_societario_pkey PRIMARY KEY (id);


--
-- Name: relatorios_gerados relatorios_gerados_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relatorios_gerados
    ADD CONSTRAINT relatorios_gerados_pkey PRIMARY KEY (id);


--
-- Name: representante representante_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.representante
    ADD CONSTRAINT representante_pkey PRIMARY KEY (id_representante);


--
-- Name: reunioes_1a1 reunioes_1a1_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reunioes_1a1
    ADD CONSTRAINT reunioes_1a1_pkey PRIMARY KEY (id);


--
-- Name: rls_precheck_allowed_tables rls_precheck_allowed_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rls_precheck_allowed_tables
    ADD CONSTRAINT rls_precheck_allowed_tables_pkey PRIMARY KEY (table_name);


--
-- Name: roi_snapshots roi_snapshots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roi_snapshots
    ADD CONSTRAINT roi_snapshots_pkey PRIMARY KEY (id);


--
-- Name: routines routines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT routines_pkey PRIMARY KEY (id);


--
-- Name: setor_cliente setor_cliente_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.setor_cliente
    ADD CONSTRAINT setor_cliente_pkey PRIMARY KEY (id);


--
-- Name: setor_cliente setor_cliente_sigla_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.setor_cliente
    ADD CONSTRAINT setor_cliente_sigla_key UNIQUE (sigla);


--
-- Name: sistema_clusters sistema_clusters_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistema_clusters
    ADD CONSTRAINT sistema_clusters_pkey PRIMARY KEY (id);


--
-- Name: sistema_clusters sistema_clusters_sistema_id_cluster_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistema_clusters
    ADD CONSTRAINT sistema_clusters_sistema_id_cluster_id_key UNIQUE (sistema_id, cluster_id);


--
-- Name: sistema_responsaveis sistema_responsaveis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistema_responsaveis
    ADD CONSTRAINT sistema_responsaveis_pkey PRIMARY KEY (id);


--
-- Name: sistema_responsaveis sistema_responsaveis_sistema_id_responsavel_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistema_responsaveis
    ADD CONSTRAINT sistema_responsaveis_sistema_id_responsavel_id_key UNIQUE (sistema_id, responsavel_id);


--
-- Name: sistemas_processo sistemas_processo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistemas_processo
    ADD CONSTRAINT sistemas_processo_pkey PRIMARY KEY (id);


--
-- Name: solicitacao_item_nao_aplicavel solicitacao_item_nao_aplicavel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item_nao_aplicavel
    ADD CONSTRAINT solicitacao_item_nao_aplicavel_pkey PRIMARY KEY (id);


--
-- Name: solicitacao_item solicitacao_item_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item
    ADD CONSTRAINT solicitacao_item_pkey PRIMARY KEY (id);


--
-- Name: solicitacao solicitacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao
    ADD CONSTRAINT solicitacao_pkey PRIMARY KEY (id);


--
-- Name: sprint_backlog_items sprint_backlog_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_backlog_items
    ADD CONSTRAINT sprint_backlog_items_pkey PRIMARY KEY (id);


--
-- Name: sprint_deliverables sprint_deliverables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_deliverables
    ADD CONSTRAINT sprint_deliverables_pkey PRIMARY KEY (id);


--
-- Name: sprint_events sprint_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_events
    ADD CONSTRAINT sprint_events_pkey PRIMARY KEY (id);


--
-- Name: sprint_metrics sprint_metrics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_metrics
    ADD CONSTRAINT sprint_metrics_pkey PRIMARY KEY (id);


--
-- Name: sprints sprints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprints
    ADD CONSTRAINT sprints_pkey PRIMARY KEY (id);


--
-- Name: area_servicos tax_area_categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.area_servicos
    ADD CONSTRAINT tax_area_categorias_pkey PRIMARY KEY (id);


--
-- Name: servicos_prestados tax_categorias_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicos_prestados
    ADD CONSTRAINT tax_categorias_nome_key UNIQUE (nome);


--
-- Name: servicos_prestados tax_categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicos_prestados
    ADD CONSTRAINT tax_categorias_pkey PRIMARY KEY (id);


--
-- Name: project_servicos tax_project_categorias_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_servicos
    ADD CONSTRAINT tax_project_categorias_pkey PRIMARY KEY (id);


--
-- Name: project_servicos tax_project_categorias_project_id_categoria_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_servicos
    ADD CONSTRAINT tax_project_categorias_project_id_categoria_id_key UNIQUE (project_id, servico_id);


--
-- Name: ticket_attachments ticket_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_pkey PRIMARY KEY (id);


--
-- Name: ticket_messages ticket_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_pkey PRIMARY KEY (id);


--
-- Name: tickets tickets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_pkey PRIMARY KEY (id);


--
-- Name: titularidade titularidade_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titularidade
    ADD CONSTRAINT titularidade_pkey PRIMARY KEY (id);


--
-- Name: titularidade titularidade_unq; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titularidade
    ADD CONSTRAINT titularidade_unq UNIQUE (matricula_id, titular_pessoa_id, tipo);


--
-- Name: tmpl_bloco_flag tmpl_bloco_flag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_flag
    ADD CONSTRAINT tmpl_bloco_flag_pkey PRIMARY KEY (bloco_id, flag_id);


--
-- Name: tmpl_bloco tmpl_bloco_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco
    ADD CONSTRAINT tmpl_bloco_pkey PRIMARY KEY (id);


--
-- Name: tmpl_bloco_versao tmpl_bloco_versao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_versao
    ADD CONSTRAINT tmpl_bloco_versao_pkey PRIMARY KEY (id);


--
-- Name: tmpl_bloco_versao tmpl_bloco_versao_unica; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_versao
    ADD CONSTRAINT tmpl_bloco_versao_unica UNIQUE (bloco_id, numero_versao);


--
-- Name: tmpl_documento_bloco tmpl_documento_bloco_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_documento_bloco
    ADD CONSTRAINT tmpl_documento_bloco_pkey PRIMARY KEY (id);


--
-- Name: tmpl_documento_bloco tmpl_documento_bloco_unico; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_documento_bloco
    ADD CONSTRAINT tmpl_documento_bloco_unico UNIQUE (documento_id, bloco_id);


--
-- Name: tmpl_documento tmpl_documento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_documento
    ADD CONSTRAINT tmpl_documento_pkey PRIMARY KEY (id);


--
-- Name: tmpl_flag tmpl_flag_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_flag
    ADD CONSTRAINT tmpl_flag_nome_key UNIQUE (nome);


--
-- Name: tmpl_flag tmpl_flag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_flag
    ADD CONSTRAINT tmpl_flag_pkey PRIMARY KEY (id);


--
-- Name: tool_area_access tool_area_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_area_access
    ADD CONSTRAINT tool_area_access_pkey PRIMARY KEY (id);


--
-- Name: tool_area_access tool_area_access_tool_id_area_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_area_access
    ADD CONSTRAINT tool_area_access_tool_id_area_key UNIQUE (tool_id, area);


--
-- Name: tools tools_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tools
    ADD CONSTRAINT tools_pkey PRIMARY KEY (id);


--
-- Name: cliente_clusters unique_cliente_cluster; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_clusters
    ADD CONSTRAINT unique_cliente_cluster UNIQUE (cliente_id, cluster_id);


--
-- Name: solicitacao_item uq_solicitacao_item_documento; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item
    ADD CONSTRAINT uq_solicitacao_item_documento UNIQUE (solicitacao_id, documento);


--
-- Name: CONSTRAINT uq_solicitacao_item_documento ON solicitacao_item; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON CONSTRAINT uq_solicitacao_item_documento ON public.solicitacao_item IS 'Impede o mesmo documento manual duas vezes na mesma solicitacao. Nao afeta item de catalogo, cujo documento e nulo e por isso nunca colide.';


--
-- Name: user_page_access user_page_access_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_page_access
    ADD CONSTRAINT user_page_access_pkey PRIMARY KEY (id);


--
-- Name: user_page_access user_page_access_user_id_page_permission_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_page_access
    ADD CONSTRAINT user_page_access_user_id_page_permission_id_key UNIQUE (user_id, page_permission_id);


--
-- Name: user_roles user_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_pkey PRIMARY KEY (id);


--
-- Name: user_roles user_roles_user_id_role_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_role_key UNIQUE (user_id, role);


--
-- Name: bem_cliente_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bem_cliente_idx ON public.bem USING btree (cliente_id);


--
-- Name: bem_empresa_destino_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bem_empresa_destino_idx ON public.bem USING btree (empresa_destino_pessoa_id);


--
-- Name: bem_tipo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX bem_tipo_idx ON public.bem USING btree (tipo_bem);


--
-- Name: cartorio_uf_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cartorio_uf_idx ON public.cartorio USING btree (uf);


--
-- Name: idx_access_change_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_change_log_created_at ON public.access_change_log USING btree (created_at DESC);


--
-- Name: idx_access_change_log_user_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_access_change_log_user_id ON public.access_change_log USING btree (user_id);


--
-- Name: idx_administracao_administrador_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administracao_administrador_pessoa_id ON public.administracao USING btree (administrador_pessoa_id);


--
-- Name: idx_administracao_pj_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_administracao_pj_pessoa_id ON public.administracao USING btree (pj_pessoa_id);


--
-- Name: idx_audit_logs_area_performed_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_area_performed_at ON public.audit_logs USING btree (area, performed_at DESC);


--
-- Name: idx_audit_logs_entity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_audit_logs_entity ON public.audit_logs USING btree (entity_type, entity_id);


--
-- Name: idx_capital_integralizacao_bem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capital_integralizacao_bem_id ON public.capital_integralizacao USING btree (bem_id);


--
-- Name: idx_capital_integralizacao_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capital_integralizacao_cliente_id ON public.capital_integralizacao USING btree (cliente_id);


--
-- Name: idx_capital_integralizacao_empresa_destino_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capital_integralizacao_empresa_destino_pessoa_id ON public.capital_integralizacao USING btree (empresa_destino_pessoa_id);


--
-- Name: idx_capital_integralizacao_socio_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_capital_integralizacao_socio_pessoa_id ON public.capital_integralizacao USING btree (socio_pessoa_id);


--
-- Name: idx_chk_cli_bem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chk_cli_bem ON public.checklist_cliente_item USING btree (bem_id);


--
-- Name: idx_chk_cli_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chk_cli_cliente ON public.checklist_cliente_item USING btree (cliente_id);


--
-- Name: idx_chk_cli_matricula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chk_cli_matricula ON public.checklist_cliente_item USING btree (matricula_id);


--
-- Name: idx_chk_cli_padrao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chk_cli_padrao ON public.checklist_cliente_item USING btree (item_padrao_id);


--
-- Name: idx_chk_cli_pessoa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_chk_cli_pessoa ON public.checklist_cliente_item USING btree (pessoa_id);


--
-- Name: idx_cliente_clusters_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_clusters_cliente ON public.cliente_clusters USING btree (cliente_id);


--
-- Name: idx_cliente_clusters_cluster; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_clusters_cluster ON public.cliente_clusters USING btree (cluster_id);


--
-- Name: idx_cliente_nome_normalizado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cliente_nome_normalizado ON public.cliente USING btree (public.nome_cliente_normalizado(nome));


--
-- Name: idx_codigo_receita_grupo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_codigo_receita_grupo ON public.codigo_receita USING btree (grupo_tributo_id);


--
-- Name: idx_contribuinte_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contribuinte_cliente_id ON public.contribuinte USING btree (cliente_id);


--
-- Name: idx_contribuinte_cpf_cnpj; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contribuinte_cpf_cnpj ON public.contribuinte USING btree (cpf_cnpj);


--
-- Name: idx_contribuinte_tipo_pessoa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_contribuinte_tipo_pessoa ON public.contribuinte USING btree (tipo_pessoa);


--
-- Name: idx_correcoes_batch; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correcoes_batch ON public.efd_correcoes USING btree (batch_id) WHERE (batch_id IS NOT NULL);


--
-- Name: idx_correcoes_empresa_periodo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correcoes_empresa_periodo ON public.efd_correcoes USING btree (empresa_cnpj, periodo);


--
-- Name: idx_correcoes_icms_lookup; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correcoes_icms_lookup ON public.correcoes_icms USING btree (contribuinte_id, familia, data_lancamento) WHERE (excluido = false);


--
-- Name: idx_correcoes_registro_ativo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_correcoes_registro_ativo ON public.efd_correcoes USING btree (registro_tipo, registro_original_id) WHERE (ativo = true);


--
-- Name: idx_correcoes_unica_ativa; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_correcoes_unica_ativa ON public.efd_correcoes USING btree (registro_tipo, registro_original_id) WHERE (ativo = true);


--
-- Name: idx_daily_standups_blocked_deliverable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_standups_blocked_deliverable ON public.daily_standups USING btree (blocked_deliverable_id);


--
-- Name: idx_daily_standups_process_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_standups_process_id ON public.daily_standups USING btree (process_id);


--
-- Name: idx_daily_standups_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_daily_standups_project_id ON public.daily_standups USING btree (project_id);


--
-- Name: idx_dash_cliente_access_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dash_cliente_access_cliente ON public.dashboard_cliente_access USING btree (cliente_id);


--
-- Name: idx_dash_cliente_access_dashboard; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dash_cliente_access_dashboard ON public.dashboard_cliente_access USING btree (dashboard_id);


--
-- Name: idx_dash_cluster_access_cluster; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dash_cluster_access_cluster ON public.dashboard_cluster_access USING btree (cluster_id);


--
-- Name: idx_dash_cluster_access_dashboard; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dash_cluster_access_dashboard ON public.dashboard_cluster_access USING btree (dashboard_id);


--
-- Name: idx_dashboards_ativos; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dashboards_ativos ON public.dashboards USING btree (is_active);


--
-- Name: idx_dcomp_nr_dcomp_ret; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dcomp_nr_dcomp_ret ON public.dcomp USING btree (nr_dcomp_ret) WHERE (nr_dcomp_ret IS NOT NULL);


--
-- Name: idx_dcomp_nr_per_orig; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dcomp_nr_per_orig ON public.dcomp USING btree (nr_per_orig);


--
-- Name: idx_deliverables_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliverables_parent ON public.sprint_deliverables USING btree (parent_id);


--
-- Name: idx_deliverables_task_code; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_deliverables_task_code ON public.sprint_deliverables USING btree (task_code);


--
-- Name: idx_difal_decisao_ncm; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_difal_decisao_ncm ON public.difal_decisao USING btree (cod_ncm);


--
-- Name: idx_difal_decisao_sessao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_difal_decisao_sessao ON public.difal_decisao USING btree (sessao_id);


--
-- Name: idx_difal_sessao_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_difal_sessao_cliente ON public.difal_sessao USING btree (cliente_id);


--
-- Name: idx_difal_sessao_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_difal_sessao_status ON public.difal_sessao USING btree (status);


--
-- Name: idx_difal_sessao_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_difal_sessao_usuario ON public.difal_sessao USING btree (usuario_id);


--
-- Name: idx_distribuicao_dcomp_codigo_receita_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribuicao_dcomp_codigo_receita_id ON public.distribuicao_dcomp USING btree (codigo_receita_id);


--
-- Name: idx_distribuicao_dcomp_grupo_tributo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribuicao_dcomp_grupo_tributo_id ON public.distribuicao_dcomp USING btree (grupo_tributo_id);


--
-- Name: idx_distribuicao_dcomp_nr_documento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_distribuicao_dcomp_nr_documento ON public.distribuicao_dcomp USING btree (nr_documento);


--
-- Name: idx_doc_arq_bem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_arq_bem ON public.documento_arquivo USING btree (bem_id) WHERE (excluido = false);


--
-- Name: idx_doc_arq_checklist_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_arq_checklist_item ON public.documento_arquivo USING btree (checklist_item_id) WHERE (excluido = false);


--
-- Name: idx_doc_arq_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_arq_cliente ON public.documento_arquivo USING btree (cliente_id) WHERE (excluido = false);


--
-- Name: idx_doc_arq_matricula; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_arq_matricula ON public.documento_arquivo USING btree (matricula_id) WHERE (excluido = false);


--
-- Name: idx_doc_arq_pessoa; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_arq_pessoa ON public.documento_arquivo USING btree (pessoa_id) WHERE (excluido = false);


--
-- Name: idx_doc_arq_solicitacao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_doc_arq_solicitacao ON public.documento_arquivo USING btree (solicitacao_id) WHERE (excluido = false);


--
-- Name: idx_dochist_documento_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_dochist_documento_id ON public.documento_horas_historico USING btree (documento_id, registrado_em DESC);


--
-- Name: idx_docproc_canonico_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_docproc_canonico_id ON public.documentos_processo USING btree (canonico_id);


--
-- Name: idx_docproc_cluster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_docproc_cluster_id ON public.documentos_processo USING btree (cluster_id);


--
-- Name: idx_documento_arquivo_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documento_arquivo_tipo ON public.documento_arquivo USING btree (documento_tipo_id) WHERE (excluido = false);


--
-- Name: idx_documento_gerado_anterior_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documento_gerado_anterior_id ON public.documento_gerado USING btree (documento_anterior_id);


--
-- Name: idx_documento_gerado_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documento_gerado_cliente_id ON public.documento_gerado USING btree (cliente_id);


--
-- Name: idx_documento_gerado_pj_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documento_gerado_pj_pessoa_id ON public.documento_gerado USING btree (pj_pessoa_id);


--
-- Name: idx_documento_gerado_raiz_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documento_gerado_raiz_id ON public.documento_gerado USING btree (documento_raiz_id);


--
-- Name: idx_documento_gerado_template_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documento_gerado_template_id ON public.documento_gerado USING btree (documento_template_id);


--
-- Name: idx_documento_override_bloco_alvo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documento_override_bloco_alvo_id ON public.documento_override USING btree (bloco_alvo_id);


--
-- Name: idx_documento_override_bloco_substituto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documento_override_bloco_substituto_id ON public.documento_override USING btree (bloco_substituto_id);


--
-- Name: idx_documento_override_documento_gerado_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documento_override_documento_gerado_id ON public.documento_override USING btree (documento_gerado_id);


--
-- Name: idx_documento_tipo_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_documento_tipo_cliente ON public.documento_tipo USING btree (cliente_id) WHERE (cliente_id IS NOT NULL);


--
-- Name: idx_estrutura_equipes_gestor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_estrutura_equipes_gestor_id ON public.estrutura_equipes USING btree (gestor_id);


--
-- Name: idx_etapa_doc_documento_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etapa_doc_documento_id ON public.etapa_documentos USING btree (documento_id);


--
-- Name: idx_etapa_doc_etapa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etapa_doc_etapa_id ON public.etapa_documentos USING btree (etapa_id, scenario);


--
-- Name: idx_etapa_resp_etapa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etapa_resp_etapa_id ON public.etapa_responsaveis USING btree (etapa_id, scenario);


--
-- Name: idx_etapa_resp_responsavel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etapa_resp_responsavel_id ON public.etapa_responsaveis USING btree (responsavel_id);


--
-- Name: idx_etapa_sis_etapa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etapa_sis_etapa_id ON public.etapa_sistemas USING btree (etapa_id, scenario);


--
-- Name: idx_etapa_sis_sistema_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_etapa_sis_sistema_id ON public.etapa_sistemas USING btree (sistema_id);


--
-- Name: idx_export_profiles_user_tool; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_export_profiles_user_tool ON public.export_profiles USING btree (user_id, tool_type);


--
-- Name: idx_expr_bem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expr_bem ON public.exploracao_rural USING btree (bem_id);


--
-- Name: idx_expr_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_expr_cliente ON public.exploracao_rural USING btree (cliente_id);


--
-- Name: idx_garg_proc_processo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_garg_proc_processo_id ON public.gargalo_processos USING btree (processo_id);


--
-- Name: idx_gargalo_etapas_etapa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gargalo_etapas_etapa_id ON public.gargalo_etapas USING btree (etapa_id, scenario);


--
-- Name: idx_gargalo_etapas_gargalo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gargalo_etapas_gargalo_id ON public.gargalo_etapas USING btree (gargalo_id);


--
-- Name: idx_gargalo_melhorias_gargalo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gargalo_melhorias_gargalo ON public.gargalo_melhorias USING btree (gargalo_id);


--
-- Name: idx_gargalo_melhorias_melhoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gargalo_melhorias_melhoria ON public.gargalo_melhorias USING btree (melhoria_id);


--
-- Name: idx_gargalos_cluster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gargalos_cluster_id ON public.gargalos USING btree (cluster_id);


--
-- Name: idx_gargalos_melhoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_gargalos_melhoria_id ON public.gargalos USING btree (melhoria_id);


--
-- Name: idx_improvement_savings_details_improvement_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_improvement_savings_details_improvement_id ON public.improvement_savings_details USING btree (improvement_id);


--
-- Name: idx_improvement_savings_details_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_improvement_savings_details_type ON public.improvement_savings_details USING btree (savings_type);


--
-- Name: idx_improvements_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_improvements_process ON public.process_improvements USING btree (process_id);


--
-- Name: idx_improvements_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_improvements_project ON public.process_improvements USING btree (project_id);


--
-- Name: idx_improvements_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_improvements_status ON public.process_improvements USING btree (evaluation_status);


--
-- Name: idx_job_roles_cluster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_roles_cluster_id ON public.job_roles USING btree (cluster_id);


--
-- Name: idx_matricula_bem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_matricula_bem_id ON public.matricula USING btree (bem_id);


--
-- Name: idx_mel_acao_melhoria_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mel_acao_melhoria_id ON public.melhoria_acoes_td USING btree (melhoria_id);


--
-- Name: idx_mel_proc_processo_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mel_proc_processo_id ON public.melhoria_processos USING btree (processo_id);


--
-- Name: idx_mel_resp_responsavel_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_mel_resp_responsavel_id ON public.melhoria_responsaveis USING btree (responsavel_id);


--
-- Name: idx_ordem_servico_regiao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordem_servico_regiao ON public.ordem_servico USING btree (regiao);


--
-- Name: idx_ordem_servico_setor_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ordem_servico_setor_cliente_id ON public.ordem_servico USING btree (setor_cliente_id);


--
-- Name: idx_org_projects_equipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_projects_equipe_id ON public.org_projects USING btree (equipe_id);


--
-- Name: idx_org_projects_ordem_servico; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_projects_ordem_servico ON public.org_projects USING btree (ordem_servico_id);


--
-- Name: idx_org_projects_produto_segmento; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_projects_produto_segmento ON public.org_projects USING btree (produto_segmento_id) WHERE (produto_segmento_id IS NOT NULL);


--
-- Name: idx_org_tasks_client_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_tasks_client_id ON public.org_tasks USING btree (client_id);


--
-- Name: idx_org_tasks_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_tasks_project_id ON public.org_tasks USING btree (project_id);


--
-- Name: idx_org_tasks_reviewer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_org_tasks_reviewer_id ON public.org_tasks USING btree (reviewer_id);


--
-- Name: idx_parentesco_parente_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parentesco_parente_pessoa_id ON public.parentesco USING btree (parente_pessoa_id);


--
-- Name: idx_parentesco_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_parentesco_pessoa_id ON public.parentesco USING btree (pessoa_id);


--
-- Name: idx_per_id_contribuinte; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_per_id_contribuinte ON public.per USING btree (id_contribuinte);


--
-- Name: idx_per_nr_proc_ret; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_per_nr_proc_ret ON public.per USING btree (nr_proc_ret);


--
-- Name: idx_per_situacao_criado_em; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_per_situacao_criado_em ON public.per_situacao USING btree (nr_proc_per, criado_em DESC);


--
-- Name: idx_per_situacao_nr_proc_per; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_per_situacao_nr_proc_per ON public.per_situacao USING btree (nr_proc_per);


--
-- Name: idx_pessoa_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pessoa_cliente_id ON public.pessoa USING btree (cliente_id);


--
-- Name: idx_pessoa_conjuge_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pessoa_conjuge_id ON public.pessoa USING btree (conjuge_id);


--
-- Name: idx_pessoa_contribuinte_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pessoa_contribuinte_id ON public.pessoa USING btree (contribuinte_id);


--
-- Name: idx_pessoa_cpf_cnpj; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pessoa_cpf_cnpj ON public.pessoa USING btree (cpf_cnpj);


--
-- Name: idx_pessoa_filiacao_mae_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pessoa_filiacao_mae_pessoa_id ON public.pessoa USING btree (filiacao_mae_pessoa_id);


--
-- Name: idx_pessoa_filiacao_pai_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pessoa_filiacao_pai_pessoa_id ON public.pessoa USING btree (filiacao_pai_pessoa_id);


--
-- Name: idx_process_improvements_cluster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_process_improvements_cluster_id ON public.process_improvements USING btree (cluster_id);


--
-- Name: idx_process_improvements_sprint_deliverable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_process_improvements_sprint_deliverable ON public.process_improvements USING btree (sprint_deliverable_id);


--
-- Name: idx_process_scenarios_parent; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_process_scenarios_parent ON public.process_scenarios USING btree (parent_scenario_id);


--
-- Name: idx_process_scenarios_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_process_scenarios_process ON public.process_scenarios USING btree (process_id);


--
-- Name: idx_process_scenarios_process_snapshot; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_process_scenarios_process_snapshot ON public.process_scenarios USING btree (process_id, snapshot_at DESC);


--
-- Name: idx_process_scenarios_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_process_scenarios_project ON public.process_scenarios USING btree (project_id);


--
-- Name: idx_process_scenarios_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_process_scenarios_status ON public.process_scenarios USING btree (status);


--
-- Name: idx_process_stages_scenario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_process_stages_scenario ON public.process_stages USING btree (scenario);


--
-- Name: idx_process_stages_stage_as_is_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_process_stages_stage_as_is_id ON public.process_stages USING btree (stage_as_is_id);


--
-- Name: idx_processes_cluster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_processes_cluster_id ON public.processes USING btree (cluster_id);


--
-- Name: idx_processes_equipe; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_processes_equipe ON public.processes USING btree (equipe_id);


--
-- Name: idx_processes_project_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_processes_project_id ON public.processes USING btree (project_id);


--
-- Name: idx_processes_stage; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_processes_stage ON public.processes USING btree (stage);


--
-- Name: idx_produto_documento_tipo_item; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_produto_documento_tipo_item ON public.produto_documento_tipo USING btree (item_padrao_id);


--
-- Name: idx_profiles_first_access_done; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_profiles_first_access_done ON public.profiles USING btree (first_access_done);


--
-- Name: idx_proj_just_projeto_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_proj_just_projeto_id ON public.projeto_justificativas USING btree (projeto_id);


--
-- Name: idx_project_documents_process_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_project_documents_process_id ON public.project_documents USING btree (process_id);


--
-- Name: idx_projects_cluster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_cluster_id ON public.projects USING btree (cluster_id);


--
-- Name: idx_projects_equipe_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projects_equipe_id ON public.projects USING btree (equipe_id);


--
-- Name: idx_projeto_flag_valor_cliente_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projeto_flag_valor_cliente_id ON public.projeto_flag_valor USING btree (cliente_id);


--
-- Name: idx_projeto_flag_valor_flag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projeto_flag_valor_flag_id ON public.projeto_flag_valor USING btree (flag_id);


--
-- Name: idx_projeto_flag_valor_pj_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_projeto_flag_valor_pj_pessoa_id ON public.projeto_flag_valor USING btree (pj_pessoa_id);


--
-- Name: idx_quadro_societario_empresa_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quadro_societario_empresa_pessoa_id ON public.quadro_societario USING btree (empresa_pessoa_id);


--
-- Name: idx_quadro_societario_socio_pessoa_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_quadro_societario_socio_pessoa_id ON public.quadro_societario USING btree (socio_pessoa_id);


--
-- Name: idx_roi_snapshots_checkpoint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roi_snapshots_checkpoint ON public.roi_snapshots USING btree (checkpoint_id);


--
-- Name: idx_roi_snapshots_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roi_snapshots_process ON public.roi_snapshots USING btree (process_id, snapshot_at DESC);


--
-- Name: idx_roi_snapshots_scope; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_roi_snapshots_scope ON public.roi_snapshots USING btree (scope_kind, scope_id, snapshot_at DESC);


--
-- Name: idx_sistema_clusters_cluster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sistema_clusters_cluster_id ON public.sistema_clusters USING btree (cluster_id);


--
-- Name: idx_sistemas_processo_cluster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sistemas_processo_cluster_id ON public.sistemas_processo USING btree (cluster_id);


--
-- Name: idx_solicitacao_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitacao_cliente ON public.solicitacao USING btree (cliente_id);


--
-- Name: idx_solicitacao_item_solicitacao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitacao_item_solicitacao ON public.solicitacao_item USING btree (solicitacao_id);


--
-- Name: idx_solicitacao_item_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitacao_item_tipo ON public.solicitacao_item USING btree (item_padrao_id);


--
-- Name: idx_solicitacao_nao_aplicavel_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_solicitacao_nao_aplicavel_cliente ON public.solicitacao_item_nao_aplicavel USING btree (cliente_id);


--
-- Name: idx_sprint_backlog_items_cluster_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sprint_backlog_items_cluster_id ON public.sprint_backlog_items USING btree (cluster_id);


--
-- Name: idx_sprint_deliverables_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sprint_deliverables_process ON public.sprint_deliverables USING btree (process_id);


--
-- Name: idx_sprint_deliverables_project; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sprint_deliverables_project ON public.sprint_deliverables USING btree (project_id);


--
-- Name: idx_sprint_deliverables_sprint; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sprint_deliverables_sprint ON public.sprint_deliverables USING btree (sprint_id);


--
-- Name: idx_tickets_activity_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_activity_status ON public.tickets USING btree (activity_status);


--
-- Name: idx_tickets_assigned_to; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_assigned_to ON public.tickets USING btree (assigned_to);


--
-- Name: idx_tickets_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_cliente ON public.tickets USING btree (cliente_id);


--
-- Name: idx_tickets_estrutura_area; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tickets_estrutura_area ON public.tickets USING btree (estrutura_area_id);


--
-- Name: idx_titularidade_bem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_titularidade_bem_id ON public.titularidade USING btree (bem_id);


--
-- Name: idx_titularidade_integralizador_bem; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_titularidade_integralizador_bem ON public.titularidade USING btree (bem_id) WHERE (integralizador AND (bem_id IS NOT NULL));


--
-- Name: idx_titularidade_integralizador_matricula; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX idx_titularidade_integralizador_matricula ON public.titularidade USING btree (matricula_id) WHERE (integralizador AND (matricula_id IS NOT NULL));


--
-- Name: idx_tmpl_bloco_bloco_origem_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tmpl_bloco_bloco_origem_id ON public.tmpl_bloco USING btree (bloco_origem_id);


--
-- Name: idx_tmpl_bloco_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tmpl_bloco_categoria ON public.tmpl_bloco USING btree (categoria);


--
-- Name: idx_tmpl_bloco_escopo_documento_raiz_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tmpl_bloco_escopo_documento_raiz_id ON public.tmpl_bloco USING btree (escopo_documento_raiz_id);


--
-- Name: idx_tmpl_bloco_familia_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tmpl_bloco_familia_id ON public.tmpl_bloco USING btree (familia_id);


--
-- Name: idx_tmpl_bloco_flag_flag_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tmpl_bloco_flag_flag_id ON public.tmpl_bloco_flag USING btree (flag_id);


--
-- Name: idx_tmpl_bloco_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tmpl_bloco_tipo ON public.tmpl_bloco USING btree (tipo);


--
-- Name: idx_tmpl_bloco_versao_bloco_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tmpl_bloco_versao_bloco_id ON public.tmpl_bloco_versao USING btree (bloco_id);


--
-- Name: idx_tmpl_documento_bloco_bloco_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tmpl_documento_bloco_bloco_id ON public.tmpl_documento_bloco USING btree (bloco_id);


--
-- Name: idx_tmpl_documento_bloco_documento_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tmpl_documento_bloco_documento_id ON public.tmpl_documento_bloco USING btree (documento_id);


--
-- Name: idx_tmpl_flag_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_tmpl_flag_tipo ON public.tmpl_flag USING btree (tipo);


--
-- Name: impedimento_ativo_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX impedimento_ativo_idx ON public.impedimento USING btree (matricula_id) WHERE (cancelado = false);


--
-- Name: impedimento_credor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX impedimento_credor_idx ON public.impedimento USING btree (credor_pessoa_id);


--
-- Name: impedimento_matricula_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX impedimento_matricula_idx ON public.impedimento USING btree (matricula_id);


--
-- Name: matricula_anterior_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matricula_anterior_idx ON public.matricula USING btree (matricula_anterior_id);


--
-- Name: matricula_bem_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matricula_bem_idx ON public.matricula USING btree (bem_id);


--
-- Name: matricula_cartorio_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matricula_cartorio_idx ON public.matricula USING btree (cartorio_id);


--
-- Name: matricula_cliente_cartorio_numero_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX matricula_cliente_cartorio_numero_uk ON public.matricula USING btree (cliente_id, cartorio_id, numero) WHERE (cliente_id IS NOT NULL);


--
-- Name: INDEX matricula_cliente_cartorio_numero_uk; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.matricula_cliente_cartorio_numero_uk IS 'B1: o número da matrícula é único por cliente + cartório. Dois clientes podem ter a mesma matrícula (condomínio, espólio, permuta, desmembramento) e ambientes dev/prod nunca disputam chave, porque são clientes diferentes.';


--
-- Name: matricula_sem_cliente_cartorio_numero_uk; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX matricula_sem_cliente_cartorio_numero_uk ON public.matricula USING btree (cartorio_id, numero) WHERE (cliente_id IS NULL);


--
-- Name: INDEX matricula_sem_cliente_cartorio_numero_uk; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON INDEX public.matricula_sem_cliente_cartorio_numero_uk IS 'B1: matrículas ainda não atribuídas a um cliente seguem com unicidade global entre si.';


--
-- Name: matricula_uf_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX matricula_uf_idx ON public.matricula USING btree (uf_imovel);


--
-- Name: notificacao_agrupamento_uq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX notificacao_agrupamento_uq ON public.notificacao USING btree (destinatario_id, agrupamento_chave) WHERE (lido_em IS NULL);


--
-- Name: notificacao_envio_dedup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacao_envio_dedup_idx ON public.notificacao_envio USING btree (tipo, entidade_tipo, entidade_id, canal, enviado_em DESC);


--
-- Name: notificacao_envio_destinatario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacao_envio_destinatario_idx ON public.notificacao_envio USING btree (destinatario_id, enviado_em DESC);


--
-- Name: notificacao_nao_lidas_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX notificacao_nao_lidas_idx ON public.notificacao USING btree (destinatario_id, created_at DESC) WHERE (lido_em IS NULL);


--
-- Name: org_comment_attachments_comment_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_comment_attachments_comment_id_idx ON public.org_comment_attachments USING btree (comment_id);


--
-- Name: org_comment_mentions_unread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_comment_mentions_unread_idx ON public.org_comment_mentions USING btree (mentioned_user_id, created_at DESC) WHERE (lido_em IS NULL);


--
-- Name: org_comment_mentions_usuario_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_comment_mentions_usuario_idx ON public.org_comment_mentions USING btree (mentioned_user_id, comment_id);


--
-- Name: org_comments_author_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_comments_author_idx ON public.org_comments USING btree (author_id);


--
-- Name: org_comments_entity_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_comments_entity_created_idx ON public.org_comments USING btree (entity_type, entity_id, created_at DESC) WHERE (excluido = false);


--
-- Name: org_comments_feed_autor_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_comments_feed_autor_idx ON public.org_comments USING btree (author_id, created_at DESC, id DESC) WHERE ((excluido = false) AND (kind = 'comment'::public.org_comment_kind));


--
-- Name: org_comments_feed_cronologico_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_comments_feed_cronologico_idx ON public.org_comments USING btree (created_at DESC, id DESC) WHERE ((excluido = false) AND (kind = 'comment'::public.org_comment_kind));


--
-- Name: org_comments_parent_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_comments_parent_idx ON public.org_comments USING btree (parent_id) WHERE (parent_id IS NOT NULL);


--
-- Name: org_comments_project_feed_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_comments_project_feed_idx ON public.org_comments USING btree (project_id, created_at DESC, id DESC) WHERE ((excluido = false) AND (kind = 'comment'::public.org_comment_kind));


--
-- Name: org_project_members_user_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX org_project_members_user_idx ON public.org_project_members USING btree (user_id);


--
-- Name: sprint_backlog_items_project_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX sprint_backlog_items_project_id_idx ON public.sprint_backlog_items USING btree (project_id);


--
-- Name: titularidade_matricula_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX titularidade_matricula_idx ON public.titularidade USING btree (matricula_id);


--
-- Name: titularidade_pessoa_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX titularidade_pessoa_idx ON public.titularidade USING btree (titular_pessoa_id);


--
-- Name: uq_documento_tipo_solicitacao_item; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_documento_tipo_solicitacao_item ON public.documento_tipo USING btree (solicitacao_item_id) WHERE (solicitacao_item_id IS NOT NULL);


--
-- Name: uq_processes_code_not_null; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_processes_code_not_null ON public.processes USING btree (code) WHERE (code IS NOT NULL);


--
-- Name: uq_projeto_flag_valor_escopo_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_projeto_flag_valor_escopo_cliente ON public.projeto_flag_valor USING btree (cliente_id, flag_id) WHERE (pj_pessoa_id IS NULL);


--
-- Name: uq_projeto_flag_valor_escopo_pj; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_projeto_flag_valor_escopo_pj ON public.projeto_flag_valor USING btree (cliente_id, pj_pessoa_id, flag_id) WHERE (pj_pessoa_id IS NOT NULL);


--
-- Name: uq_solicitacao_ativa_por_cliente; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_solicitacao_ativa_por_cliente ON public.solicitacao USING btree (cliente_id) WHERE (status <> 'encerrada'::public.osg_solicitacao_status);


--
-- Name: uq_solicitacao_item_padrao; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_solicitacao_item_padrao ON public.solicitacao_item USING btree (solicitacao_id, item_padrao_id);


--
-- Name: uq_solicitacao_nao_aplicavel_bem; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_solicitacao_nao_aplicavel_bem ON public.solicitacao_item_nao_aplicavel USING btree (solicitacao_item_id, bem_id) WHERE (bem_id IS NOT NULL);


--
-- Name: uq_solicitacao_nao_aplicavel_matricula; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_solicitacao_nao_aplicavel_matricula ON public.solicitacao_item_nao_aplicavel USING btree (solicitacao_item_id, matricula_id) WHERE (matricula_id IS NOT NULL);


--
-- Name: uq_solicitacao_nao_aplicavel_pessoa; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_solicitacao_nao_aplicavel_pessoa ON public.solicitacao_item_nao_aplicavel USING btree (solicitacao_item_id, pessoa_id) WHERE (pessoa_id IS NOT NULL);


--
-- Name: uq_tmpl_bloco_familia_ordem; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_tmpl_bloco_familia_ordem ON public.tmpl_bloco USING btree (familia_id, variante_ordem) WHERE (familia_id IS NOT NULL);


--
-- Name: uq_tmpl_bloco_familia_seletor; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_tmpl_bloco_familia_seletor ON public.tmpl_bloco USING btree (familia_id, variante_seletor) WHERE (familia_id IS NOT NULL);


--
-- Name: uq_tmpl_bloco_versao_atual; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_tmpl_bloco_versao_atual ON public.tmpl_bloco_versao USING btree (bloco_id) WHERE atual;


--
-- Name: user_page_access_user_page_uniq; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX user_page_access_user_page_uniq ON public.user_page_access USING btree (user_id, page_permission_id);


--
-- Name: administracao trg_administracao_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_administracao_updated_at BEFORE UPDATE ON public.administracao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: page_permissions trg_auto_grant_new_page; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_auto_grant_new_page AFTER INSERT ON public.page_permissions FOR EACH ROW EXECUTE FUNCTION public.auto_grant_new_page_to_area_users();


--
-- Name: capital_integralizacao trg_capital_integralizacao_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_capital_integralizacao_updated_at BEFORE UPDATE ON public.capital_integralizacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tickets trg_capture_ticket_assignment; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_capture_ticket_assignment BEFORE UPDATE OF assigned_to ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.capture_ticket_assignment();


--
-- Name: checklist_cliente_item trg_chk_cli_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_chk_cli_updated_at BEFORE UPDATE ON public.checklist_cliente_item FOR EACH ROW EXECUTE FUNCTION public.checklist_touch_updated_at();


--
-- Name: cliente_clusters trg_cliente_cluster_last; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_cliente_cluster_last BEFORE DELETE ON public.cliente_clusters FOR EACH ROW EXECUTE FUNCTION public.enforce_cliente_cluster_last();


--
-- Name: cliente trg_cliente_tem_cluster; Type: TRIGGER; Schema: public; Owner: -
--

CREATE CONSTRAINT TRIGGER trg_cliente_tem_cluster AFTER INSERT OR UPDATE ON public.cliente DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION public.enforce_cliente_tem_cluster();


--
-- Name: codigo_receita trg_codigo_receita_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_codigo_receita_updated_at BEFORE UPDATE ON public.codigo_receita FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: correcoes_icms trg_correcoes_icms_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_correcoes_icms_updated_at BEFORE UPDATE ON public.correcoes_icms FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: correcoes_icms trg_correcoes_icms_validate_contribuinte; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_correcoes_icms_validate_contribuinte BEFORE INSERT OR UPDATE ON public.correcoes_icms FOR EACH ROW EXECUTE FUNCTION public.validate_correcoes_icms_contribuinte();


--
-- Name: dashboards trg_dashboards_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dashboards_updated_at BEFORE UPDATE ON public.dashboards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: distribuicao_dcomp trg_distribuicao_dcomp_atualizado_em; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_distribuicao_dcomp_atualizado_em BEFORE UPDATE ON public.distribuicao_dcomp FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em_column();


--
-- Name: documento_arquivo trg_doc_arq_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_doc_arq_updated_at BEFORE UPDATE ON public.documento_arquivo FOR EACH ROW EXECUTE FUNCTION public.documento_arquivo_touch_updated_at();


--
-- Name: documento_gerado trg_documento_gerado_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_documento_gerado_updated_at BEFORE UPDATE ON public.documento_gerado FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documento_override trg_documento_override_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_documento_override_updated_at BEFORE UPDATE ON public.documento_override FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: documento_tipo trg_documento_tipo_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_documento_tipo_updated_at BEFORE UPDATE ON public.documento_tipo FOR EACH ROW EXECUTE FUNCTION public.checklist_touch_updated_at();


--
-- Name: documentos_processo trg_documentos_processo_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_documentos_processo_updated_at BEFORE UPDATE ON public.documentos_processo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: exploracao_rural trg_expr_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_expr_updated_at BEFORE UPDATE ON public.exploracao_rural FOR EACH ROW EXECUTE FUNCTION public.checklist_touch_updated_at();


--
-- Name: process_scenarios trg_freeze_scenario_parameters; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_freeze_scenario_parameters BEFORE UPDATE ON public.process_scenarios FOR EACH ROW EXECUTE FUNCTION public.freeze_scenario_parameters();


--
-- Name: gargalos trg_gargalos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_gargalos_updated_at BEFORE UPDATE ON public.gargalos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: processes trg_generate_process_code; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_process_code BEFORE INSERT ON public.processes FOR EACH ROW EXECUTE FUNCTION public.generate_process_code();


--
-- Name: grupo_tributo trg_grupo_tributo_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_grupo_tributo_updated_at BEFORE UPDATE ON public.grupo_tributo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: matricula trg_matricula_definir_cliente; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_matricula_definir_cliente BEFORE INSERT OR UPDATE ON public.matricula FOR EACH ROW EXECUTE FUNCTION public.matricula_definir_cliente();


--
-- Name: notificacao trg_notificacao_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notificacao_updated_at BEFORE UPDATE ON public.notificacao FOR EACH ROW EXECUTE FUNCTION public.checklist_touch_updated_at();


--
-- Name: documento_arquivo trg_notificar_documento_recebido; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notificar_documento_recebido AFTER INSERT ON public.documento_arquivo FOR EACH ROW WHEN (((new.fonte = 'cliente'::public.osg_doc_fonte) AND (new.excluido = false))) EXECUTE FUNCTION public.notificar_documento_recebido();


--
-- Name: org_tasks trg_notificar_tarefa_atribuida; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notificar_tarefa_atribuida AFTER UPDATE OF assigned_to ON public.org_tasks FOR EACH ROW WHEN (((new.assigned_to IS NOT NULL) AND (new.assigned_to IS DISTINCT FROM old.assigned_to) AND (new.assigned_to IS DISTINCT FROM COALESCE(auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid)))) EXECUTE FUNCTION public.notificar_tarefa_atribuida();


--
-- Name: org_tasks trg_notificar_tarefa_em_revisao; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notificar_tarefa_em_revisao AFTER UPDATE OF status ON public.org_tasks FOR EACH ROW WHEN (((new.status = 'review'::public.fiscal_task_status) AND (old.status IS DISTINCT FROM new.status))) EXECUTE FUNCTION public.notificar_tarefa_em_revisao();


--
-- Name: org_comment_mentions trg_org_comment_mentions_guard_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_org_comment_mentions_guard_update BEFORE UPDATE ON public.org_comment_mentions FOR EACH ROW EXECUTE FUNCTION public.org_comment_mentions_guard_update();


--
-- Name: org_comments trg_org_comments_guard_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_org_comments_guard_update BEFORE UPDATE ON public.org_comments FOR EACH ROW EXECUTE FUNCTION public.org_comments_guard_update();


--
-- Name: org_comments trg_org_comments_resolve_scope; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_org_comments_resolve_scope BEFORE INSERT ON public.org_comments FOR EACH ROW EXECUTE FUNCTION public.org_comments_resolve_scope();


--
-- Name: org_comments trg_org_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_org_comments_updated_at BEFORE UPDATE ON public.org_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: org_comments trg_org_comments_validate_parent; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_org_comments_validate_parent BEFORE INSERT OR UPDATE ON public.org_comments FOR EACH ROW EXECUTE FUNCTION public.org_comments_validate_parent();


--
-- Name: org_tasks trg_org_tasks_cascade_delete_comments; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_org_tasks_cascade_delete_comments AFTER DELETE ON public.org_tasks FOR EACH ROW EXECUTE FUNCTION public.org_tasks_cascade_delete_comments();


--
-- Name: org_tasks trg_org_tasks_team_member_status_only; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_org_tasks_team_member_status_only BEFORE UPDATE ON public.org_tasks FOR EACH ROW EXECUTE FUNCTION public.org_tasks_team_member_status_only();


--
-- Name: org_tasks trg_org_tasks_validate_reviewer; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_org_tasks_validate_reviewer BEFORE INSERT OR UPDATE ON public.org_tasks FOR EACH ROW EXECUTE FUNCTION public.validate_org_task_reviewer();


--
-- Name: parentesco trg_parentesco_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_parentesco_updated_at BEFORE UPDATE ON public.parentesco FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: pessoa trg_pessoa_conjuge_reciproco; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pessoa_conjuge_reciproco AFTER INSERT OR UPDATE OF conjuge_id, cliente_id ON public.pessoa FOR EACH ROW EXECUTE FUNCTION public.tg_pessoa_conjuge_reciproco();


--
-- Name: pessoa trg_pessoa_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pessoa_updated_at BEFORE UPDATE ON public.pessoa FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: process_stages trg_process_stages_as_is_cascade; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_process_stages_as_is_cascade AFTER DELETE ON public.process_stages FOR EACH ROW EXECUTE FUNCTION public.process_stages_cascade_as_is_delete();


--
-- Name: produto_documento_tipo trg_produto_documento_tipo_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_produto_documento_tipo_updated_at BEFORE UPDATE ON public.produto_documento_tipo FOR EACH ROW EXECUTE FUNCTION public.checklist_touch_updated_at();


--
-- Name: projects trg_projects_sync_area_from_equipe; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_projects_sync_area_from_equipe BEFORE INSERT OR UPDATE OF equipe_id ON public.projects FOR EACH ROW EXECUTE FUNCTION public.sync_project_area_from_equipe();


--
-- Name: projeto_flag_valor trg_projeto_flag_valor_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_projeto_flag_valor_updated_at BEFORE UPDATE ON public.projeto_flag_valor FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quadro_societario trg_quadro_societario_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quadro_societario_updated_at BEFORE UPDATE ON public.quadro_societario FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: representante trg_representante_block_disable_acesso_chamados; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_representante_block_disable_acesso_chamados BEFORE UPDATE ON public.representante FOR EACH ROW WHEN ((old.acesso_chamados IS DISTINCT FROM new.acesso_chamados)) EXECUTE FUNCTION public.tg_representante_block_disable_acesso_chamados();


--
-- Name: process_scenarios trg_scenario_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_scenario_updated_at BEFORE UPDATE ON public.process_scenarios FOR EACH ROW EXECUTE FUNCTION public.set_scenario_updated_at();


--
-- Name: bem trg_set_updated_by; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.bem FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();


--
-- Name: cartorio trg_set_updated_by; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.cartorio FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();


--
-- Name: impedimento trg_set_updated_by; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.impedimento FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();


--
-- Name: matricula trg_set_updated_by; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.matricula FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();


--
-- Name: titularidade trg_set_updated_by; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_set_updated_by BEFORE UPDATE ON public.titularidade FOR EACH ROW EXECUTE FUNCTION public.set_updated_by();


--
-- Name: sistemas_processo trg_sistemas_processo_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_sistemas_processo_updated_at BEFORE UPDATE ON public.sistemas_processo FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: solicitacao_item trg_solicitacao_item_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_solicitacao_item_updated_at BEFORE UPDATE ON public.solicitacao_item FOR EACH ROW EXECUTE FUNCTION public.checklist_touch_updated_at();


--
-- Name: solicitacao trg_solicitacao_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_solicitacao_updated_at BEFORE UPDATE ON public.solicitacao FOR EACH ROW EXECUTE FUNCTION public.checklist_touch_updated_at();


--
-- Name: ticket_messages trg_ticket_messages_bloqueia_fechado; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ticket_messages_bloqueia_fechado BEFORE INSERT ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.tg_ticket_messages_bloqueia_fechado();


--
-- Name: ticket_messages trg_ticket_messages_bloqueia_reenvio; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ticket_messages_bloqueia_reenvio BEFORE INSERT ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.tg_ticket_messages_bloqueia_reenvio();


--
-- Name: ticket_messages trg_ticket_messages_guard_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ticket_messages_guard_update BEFORE UPDATE ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.ticket_messages_guard_update();


--
-- Name: ticket_messages trg_ticket_messages_reabre_resolvido; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ticket_messages_reabre_resolvido AFTER INSERT ON public.ticket_messages FOR EACH ROW EXECUTE FUNCTION public.tg_ticket_messages_reabre_resolvido();


--
-- Name: tickets trg_tickets_set_closed_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tickets_set_closed_at BEFORE UPDATE OF status ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.tg_tickets_set_closed_at();


--
-- Name: titularidade trg_titularidade_definir_cliente_da_matricula; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_titularidade_definir_cliente_da_matricula AFTER INSERT ON public.titularidade FOR EACH ROW EXECUTE FUNCTION public.titularidade_definir_cliente_da_matricula();


--
-- Name: tmpl_bloco trg_tmpl_bloco_familia_um_nivel; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tmpl_bloco_familia_um_nivel BEFORE INSERT OR UPDATE OF familia_id ON public.tmpl_bloco FOR EACH ROW EXECUTE FUNCTION public.tmpl_bloco_familia_um_nivel();


--
-- Name: tmpl_bloco_flag trg_tmpl_bloco_flag_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tmpl_bloco_flag_updated_at BEFORE UPDATE ON public.tmpl_bloco_flag FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tmpl_bloco trg_tmpl_bloco_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tmpl_bloco_updated_at BEFORE UPDATE ON public.tmpl_bloco FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tmpl_bloco_versao trg_tmpl_bloco_versao_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tmpl_bloco_versao_updated_at BEFORE UPDATE ON public.tmpl_bloco_versao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tmpl_documento_bloco trg_tmpl_documento_bloco_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tmpl_documento_bloco_updated_at BEFORE UPDATE ON public.tmpl_documento_bloco FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tmpl_documento trg_tmpl_documento_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tmpl_documento_updated_at BEFORE UPDATE ON public.tmpl_documento FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tmpl_flag trg_tmpl_flag_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tmpl_flag_updated_at BEFORE UPDATE ON public.tmpl_flag FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: solicitacao_item_nao_aplicavel trg_validar_solicitacao_item_nao_aplicavel; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validar_solicitacao_item_nao_aplicavel BEFORE INSERT OR UPDATE ON public.solicitacao_item_nao_aplicavel FOR EACH ROW EXECUTE FUNCTION public.validar_solicitacao_item_nao_aplicavel();


--
-- Name: org_projects trg_validate_org_project_contribuinte; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_org_project_contribuinte BEFORE INSERT OR UPDATE ON public.org_projects FOR EACH ROW EXECUTE FUNCTION public.validate_tax_project_contribuinte();


--
-- Name: org_projects trg_validate_org_project_external_client; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_org_project_external_client BEFORE INSERT OR UPDATE ON public.org_projects FOR EACH ROW EXECUTE FUNCTION public.validate_tax_project_external_client();


--
-- Name: per trg_validate_per_contribuinte; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_per_contribuinte BEFORE INSERT OR UPDATE ON public.per FOR EACH ROW EXECUTE FUNCTION public.validate_per_contribuinte();


--
-- Name: analises_semestrais update_analises_semestrais_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_analises_semestrais_updated_at BEFORE UPDATE ON public.analises_semestrais FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ciclos_avaliacao update_ciclos_avaliacao_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ciclos_avaliacao_updated_at BEFORE UPDATE ON public.ciclos_avaliacao FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: client_documents update_client_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_client_documents_updated_at BEFORE UPDATE ON public.client_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cliente update_cliente_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cliente_updated_at BEFORE UPDATE ON public.cliente FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contatos update_contatos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contatos_updated_at BEFORE UPDATE ON public.contatos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contribuinte_bal_config update_contribuinte_bal_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contribuinte_bal_config_updated_at BEFORE UPDATE ON public.contribuinte_bal_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: contribuinte update_contribuinte_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_contribuinte_updated_at BEFORE UPDATE ON public.contribuinte FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dcomp update_dcomp_atualizado_em; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dcomp_atualizado_em BEFORE UPDATE ON public.dcomp FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em_column();


--
-- Name: demand_items update_demand_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_demand_items_updated_at BEFORE UPDATE ON public.demand_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: estrutura_areas update_estrutura_areas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_estrutura_areas_updated_at BEFORE UPDATE ON public.estrutura_areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: estrutura_clusters update_estrutura_clusters_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_estrutura_clusters_updated_at BEFORE UPDATE ON public.estrutura_clusters FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: export_profiles update_export_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_export_profiles_updated_at BEFORE UPDATE ON public.export_profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: inscricao_contribuinte update_inscricao_contribuinte_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_inscricao_contribuinte_updated_at BEFORE UPDATE ON public.inscricao_contribuinte FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: itens_acao_1a1 update_itens_acao_1a1_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_itens_acao_1a1_updated_at BEFORE UPDATE ON public.itens_acao_1a1 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: kpis_meta update_kpis_meta_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kpis_meta_updated_at BEFORE UPDATE ON public.kpis_meta FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: metas update_metas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_metas_updated_at BEFORE UPDATE ON public.metas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: novidades update_novidades_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_novidades_updated_at BEFORE UPDATE ON public.novidades FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: org_projects update_org_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_org_projects_updated_at BEFORE UPDATE ON public.org_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: org_tasks update_org_tasks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_org_tasks_updated_at BEFORE UPDATE ON public.org_tasks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: per update_per_atualizado_em; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_per_atualizado_em BEFORE UPDATE ON public.per FOR EACH ROW EXECUTE FUNCTION public.update_atualizado_em_column();


--
-- Name: performance_preferencias update_performance_preferencias_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_performance_preferencias_updated_at BEFORE UPDATE ON public.performance_preferencias FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: procedimentos update_procedimentos_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_procedimentos_updated_at BEFORE UPDATE ON public.procedimentos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: process_improvements update_process_improvements_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_process_improvements_updated_at BEFORE UPDATE ON public.process_improvements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: process_stages update_process_stages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_process_stages_updated_at BEFORE UPDATE ON public.process_stages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: processes update_processes_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_processes_updated_at BEFORE UPDATE ON public.processes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles update_profiles_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: project_documents update_project_documents_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_project_documents_updated_at BEFORE UPDATE ON public.project_documents FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: projects update_projects_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON public.projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: representante update_representante_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_representante_updated_at BEFORE UPDATE ON public.representante FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: reunioes_1a1 update_reunioes_1a1_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_reunioes_1a1_updated_at BEFORE UPDATE ON public.reunioes_1a1 FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: routines update_routines_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_routines_updated_at BEFORE UPDATE ON public.routines FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sprint_backlog_items update_sprint_backlog_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sprint_backlog_items_updated_at BEFORE UPDATE ON public.sprint_backlog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sprint_deliverables update_sprint_deliverables_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sprint_deliverables_updated_at BEFORE UPDATE ON public.sprint_deliverables FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: sprints update_sprints_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_sprints_updated_at BEFORE UPDATE ON public.sprints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tickets update_tickets_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: tools update_tools_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_tools_updated_at BEFORE UPDATE ON public.tools FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: administracao administracao_administrador_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracao
    ADD CONSTRAINT administracao_administrador_pessoa_id_fkey FOREIGN KEY (administrador_pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: administracao administracao_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracao
    ADD CONSTRAINT administracao_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: administracao administracao_pj_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracao
    ADD CONSTRAINT administracao_pj_pessoa_id_fkey FOREIGN KEY (pj_pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: administracao administracao_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.administracao
    ADD CONSTRAINT administracao_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: analises_semestrais analises_semestrais_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.analises_semestrais
    ADD CONSTRAINT analises_semestrais_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE;


--
-- Name: area_servicos area_servicos_estrutura_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.area_servicos
    ADD CONSTRAINT area_servicos_estrutura_area_id_fkey FOREIGN KEY (estrutura_area_id) REFERENCES public.estrutura_areas(id) ON DELETE CASCADE;


--
-- Name: atualizacoes_meta atualizacoes_meta_meta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.atualizacoes_meta
    ADD CONSTRAINT atualizacoes_meta_meta_id_fkey FOREIGN KEY (meta_id) REFERENCES public.metas(id) ON DELETE CASCADE;


--
-- Name: bem bem_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bem
    ADD CONSTRAINT bem_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE RESTRICT;


--
-- Name: bem bem_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bem
    ADD CONSTRAINT bem_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: bem bem_empresa_destino_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bem
    ADD CONSTRAINT bem_empresa_destino_pessoa_id_fkey FOREIGN KEY (empresa_destino_pessoa_id) REFERENCES public.pessoa(id) ON DELETE SET NULL;


--
-- Name: bem bem_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bem
    ADD CONSTRAINT bem_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: capital_integralizacao capital_integralizacao_bem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_integralizacao
    ADD CONSTRAINT capital_integralizacao_bem_id_fkey FOREIGN KEY (bem_id) REFERENCES public.bem(id) ON DELETE CASCADE;


--
-- Name: capital_integralizacao capital_integralizacao_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_integralizacao
    ADD CONSTRAINT capital_integralizacao_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: capital_integralizacao capital_integralizacao_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_integralizacao
    ADD CONSTRAINT capital_integralizacao_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: capital_integralizacao capital_integralizacao_empresa_destino_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_integralizacao
    ADD CONSTRAINT capital_integralizacao_empresa_destino_pessoa_id_fkey FOREIGN KEY (empresa_destino_pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: capital_integralizacao capital_integralizacao_socio_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_integralizacao
    ADD CONSTRAINT capital_integralizacao_socio_pessoa_id_fkey FOREIGN KEY (socio_pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: capital_integralizacao capital_integralizacao_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.capital_integralizacao
    ADD CONSTRAINT capital_integralizacao_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: cartorio cartorio_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cartorio
    ADD CONSTRAINT cartorio_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: cartorio cartorio_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cartorio
    ADD CONSTRAINT cartorio_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: catalog_clients catalog_clients_estrutura_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.catalog_clients
    ADD CONSTRAINT catalog_clients_estrutura_area_id_fkey FOREIGN KEY (estrutura_area_id) REFERENCES public.estrutura_areas(id) ON DELETE SET NULL;


--
-- Name: checklist_cliente_item checklist_cliente_item_bem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_cliente_item
    ADD CONSTRAINT checklist_cliente_item_bem_id_fkey FOREIGN KEY (bem_id) REFERENCES public.bem(id) ON DELETE CASCADE;


--
-- Name: checklist_cliente_item checklist_cliente_item_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_cliente_item
    ADD CONSTRAINT checklist_cliente_item_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: checklist_cliente_item checklist_cliente_item_item_padrao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_cliente_item
    ADD CONSTRAINT checklist_cliente_item_item_padrao_id_fkey FOREIGN KEY (item_padrao_id) REFERENCES public.documento_tipo(id) ON DELETE SET NULL;


--
-- Name: checklist_cliente_item checklist_cliente_item_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_cliente_item
    ADD CONSTRAINT checklist_cliente_item_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matricula(id) ON DELETE CASCADE;


--
-- Name: checklist_cliente_item checklist_cliente_item_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.checklist_cliente_item
    ADD CONSTRAINT checklist_cliente_item_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: client_documents client_documents_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_documents
    ADD CONSTRAINT client_documents_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: client_documents client_documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_documents
    ADD CONSTRAINT client_documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: client_visible_projects client_visible_projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_visible_projects
    ADD CONSTRAINT client_visible_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: client_visible_projects client_visible_projects_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_visible_projects
    ADD CONSTRAINT client_visible_projects_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: client_visible_projects client_visible_projects_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.client_visible_projects
    ADD CONSTRAINT client_visible_projects_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: cliente_clusters cliente_clusters_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_clusters
    ADD CONSTRAINT cliente_clusters_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: cliente_clusters cliente_clusters_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cliente_clusters
    ADD CONSTRAINT cliente_clusters_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE CASCADE;


--
-- Name: codigo_receita codigo_receita_grupo_tributo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.codigo_receita
    ADD CONSTRAINT codigo_receita_grupo_tributo_id_fkey FOREIGN KEY (grupo_tributo_id) REFERENCES public.grupo_tributo(id) ON DELETE RESTRICT;


--
-- Name: comentarios_avaliacao comentarios_avaliacao_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comentarios_avaliacao
    ADD CONSTRAINT comentarios_avaliacao_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE;


--
-- Name: contribuinte_bal_config contribuinte_bal_config_id_contribuinte_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribuinte_bal_config
    ADD CONSTRAINT contribuinte_bal_config_id_contribuinte_fkey FOREIGN KEY (id_contribuinte) REFERENCES public.contribuinte(id) NOT VALID;


--
-- Name: contribuinte contribuinte_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribuinte
    ADD CONSTRAINT contribuinte_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: contribuinte contribuinte_setor_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.contribuinte
    ADD CONSTRAINT contribuinte_setor_cliente_id_fkey FOREIGN KEY (setor_cliente_id) REFERENCES public.setor_cliente(id);


--
-- Name: daily_standups daily_standups_blocked_deliverable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_standups
    ADD CONSTRAINT daily_standups_blocked_deliverable_id_fkey FOREIGN KEY (blocked_deliverable_id) REFERENCES public.sprint_deliverables(id) ON DELETE SET NULL;


--
-- Name: daily_standups daily_standups_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_standups
    ADD CONSTRAINT daily_standups_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE SET NULL;


--
-- Name: daily_standups daily_standups_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_standups
    ADD CONSTRAINT daily_standups_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: daily_standups daily_standups_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_standups
    ADD CONSTRAINT daily_standups_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;


--
-- Name: daily_standups daily_standups_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_standups
    ADD CONSTRAINT daily_standups_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id);


--
-- Name: dashboard_cliente_access dashboard_cliente_access_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cliente_access
    ADD CONSTRAINT dashboard_cliente_access_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: dashboard_cliente_access dashboard_cliente_access_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cliente_access
    ADD CONSTRAINT dashboard_cliente_access_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: dashboard_cliente_access dashboard_cliente_access_dashboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cliente_access
    ADD CONSTRAINT dashboard_cliente_access_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES public.dashboards(id) ON DELETE CASCADE;


--
-- Name: dashboard_cluster_access dashboard_cluster_access_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cluster_access
    ADD CONSTRAINT dashboard_cluster_access_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE CASCADE;


--
-- Name: dashboard_cluster_access dashboard_cluster_access_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cluster_access
    ADD CONSTRAINT dashboard_cluster_access_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: dashboard_cluster_access dashboard_cluster_access_dashboard_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_cluster_access
    ADD CONSTRAINT dashboard_cluster_access_dashboard_id_fkey FOREIGN KEY (dashboard_id) REFERENCES public.dashboards(id) ON DELETE CASCADE;


--
-- Name: dashboards dashboards_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: dashboards dashboards_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboards
    ADD CONSTRAINT dashboards_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: dcomp dcomp_criado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dcomp
    ADD CONSTRAINT dcomp_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);


--
-- Name: dcomp dcomp_nr_dcomp_ret_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dcomp
    ADD CONSTRAINT dcomp_nr_dcomp_ret_fkey FOREIGN KEY (nr_dcomp_ret) REFERENCES public.dcomp(nr_documento);


--
-- Name: dcomp dcomp_nr_per_orig_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dcomp
    ADD CONSTRAINT dcomp_nr_per_orig_fkey FOREIGN KEY (nr_per_orig) REFERENCES public.per(nr_per);


--
-- Name: deliverable_attachments deliverable_attachments_deliverable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverable_attachments
    ADD CONSTRAINT deliverable_attachments_deliverable_id_fkey FOREIGN KEY (deliverable_id) REFERENCES public.sprint_deliverables(id) ON DELETE CASCADE;


--
-- Name: deliverable_attachments deliverable_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.deliverable_attachments
    ADD CONSTRAINT deliverable_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: demand_items demand_items_demand_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.demand_items
    ADD CONSTRAINT demand_items_demand_id_fkey FOREIGN KEY (demand_id) REFERENCES public.routines(id) ON DELETE CASCADE;


--
-- Name: difal_decisao difal_decisao_sessao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difal_decisao
    ADD CONSTRAINT difal_decisao_sessao_id_fkey FOREIGN KEY (sessao_id) REFERENCES public.difal_sessao(id) ON DELETE CASCADE;


--
-- Name: difal_sessao difal_sessao_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.difal_sessao
    ADD CONSTRAINT difal_sessao_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE RESTRICT;


--
-- Name: distribuicao_dcomp distribuicao_dcomp_codigo_receita_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribuicao_dcomp
    ADD CONSTRAINT distribuicao_dcomp_codigo_receita_id_fkey FOREIGN KEY (codigo_receita_id) REFERENCES public.codigo_receita(id) ON DELETE RESTRICT;


--
-- Name: distribuicao_dcomp distribuicao_dcomp_grupo_tributo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribuicao_dcomp
    ADD CONSTRAINT distribuicao_dcomp_grupo_tributo_id_fkey FOREIGN KEY (grupo_tributo_id) REFERENCES public.grupo_tributo(id) ON DELETE RESTRICT;


--
-- Name: distribuicao_dcomp distribuicao_dcomp_nr_documento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribuicao_dcomp
    ADD CONSTRAINT distribuicao_dcomp_nr_documento_fkey FOREIGN KEY (nr_documento) REFERENCES public.dcomp(nr_documento) ON DELETE CASCADE;


--
-- Name: distribuicao_receita distribuicao_receita_id_centro_custo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribuicao_receita
    ADD CONSTRAINT distribuicao_receita_id_centro_custo_fkey FOREIGN KEY (id_centro_custo) REFERENCES public.centros_custo(id) ON DELETE CASCADE;


--
-- Name: distribuicao_receita distribuicao_receita_id_ordem_servico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribuicao_receita
    ADD CONSTRAINT distribuicao_receita_id_ordem_servico_fkey FOREIGN KEY (id_ordem_servico) REFERENCES public.ordem_servico(id) ON DELETE CASCADE;


--
-- Name: documento_arquivo documento_arquivo_bem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_arquivo
    ADD CONSTRAINT documento_arquivo_bem_id_fkey FOREIGN KEY (bem_id) REFERENCES public.bem(id) ON DELETE SET NULL;


--
-- Name: documento_arquivo documento_arquivo_checklist_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_arquivo
    ADD CONSTRAINT documento_arquivo_checklist_item_id_fkey FOREIGN KEY (checklist_item_id) REFERENCES public.checklist_cliente_item(id) ON DELETE SET NULL;


--
-- Name: documento_arquivo documento_arquivo_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_arquivo
    ADD CONSTRAINT documento_arquivo_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE RESTRICT;


--
-- Name: documento_arquivo documento_arquivo_documento_gerado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_arquivo
    ADD CONSTRAINT documento_arquivo_documento_gerado_id_fkey FOREIGN KEY (documento_gerado_id) REFERENCES public.documento_gerado(id) ON DELETE SET NULL;


--
-- Name: documento_arquivo documento_arquivo_documento_tipo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_arquivo
    ADD CONSTRAINT documento_arquivo_documento_tipo_id_fkey FOREIGN KEY (documento_tipo_id) REFERENCES public.documento_tipo(id) ON DELETE SET NULL;


--
-- Name: documento_arquivo documento_arquivo_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_arquivo
    ADD CONSTRAINT documento_arquivo_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matricula(id) ON DELETE SET NULL;


--
-- Name: documento_arquivo documento_arquivo_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_arquivo
    ADD CONSTRAINT documento_arquivo_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoa(id) ON DELETE SET NULL;


--
-- Name: documento_arquivo documento_arquivo_revisao_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_arquivo
    ADD CONSTRAINT documento_arquivo_revisao_por_fkey FOREIGN KEY (revisao_por) REFERENCES public.profiles(id);


--
-- Name: documento_arquivo documento_arquivo_solicitacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_arquivo
    ADD CONSTRAINT documento_arquivo_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES public.solicitacao(id) ON DELETE SET NULL;


--
-- Name: documento_gerado documento_gerado_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_gerado
    ADD CONSTRAINT documento_gerado_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: documento_gerado documento_gerado_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_gerado
    ADD CONSTRAINT documento_gerado_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: documento_gerado documento_gerado_documento_anterior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_gerado
    ADD CONSTRAINT documento_gerado_documento_anterior_id_fkey FOREIGN KEY (documento_anterior_id) REFERENCES public.documento_gerado(id) ON DELETE SET NULL;


--
-- Name: documento_gerado documento_gerado_documento_raiz_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_gerado
    ADD CONSTRAINT documento_gerado_documento_raiz_id_fkey FOREIGN KEY (documento_raiz_id) REFERENCES public.documento_gerado(id) ON DELETE SET NULL;


--
-- Name: documento_gerado documento_gerado_documento_template_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_gerado
    ADD CONSTRAINT documento_gerado_documento_template_id_fkey FOREIGN KEY (documento_template_id) REFERENCES public.tmpl_documento(id) ON DELETE RESTRICT;


--
-- Name: documento_gerado documento_gerado_gerado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_gerado
    ADD CONSTRAINT documento_gerado_gerado_por_id_fkey FOREIGN KEY (gerado_por_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: documento_gerado documento_gerado_pj_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_gerado
    ADD CONSTRAINT documento_gerado_pj_pessoa_id_fkey FOREIGN KEY (pj_pessoa_id) REFERENCES public.pessoa(id) ON DELETE SET NULL;


--
-- Name: documento_gerado documento_gerado_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_gerado
    ADD CONSTRAINT documento_gerado_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: documento_horas_historico documento_horas_historico_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_horas_historico
    ADD CONSTRAINT documento_horas_historico_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES public.documentos_processo(id) ON DELETE CASCADE;


--
-- Name: documento_notificacao_visto documento_notificacao_visto_documento_gerado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_notificacao_visto
    ADD CONSTRAINT documento_notificacao_visto_documento_gerado_id_fkey FOREIGN KEY (documento_gerado_id) REFERENCES public.documento_gerado(id) ON DELETE CASCADE;


--
-- Name: documento_notificacao_visto documento_notificacao_visto_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_notificacao_visto
    ADD CONSTRAINT documento_notificacao_visto_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: documento_override documento_override_bloco_alvo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_override
    ADD CONSTRAINT documento_override_bloco_alvo_id_fkey FOREIGN KEY (bloco_alvo_id) REFERENCES public.tmpl_bloco(id) ON DELETE RESTRICT;


--
-- Name: documento_override documento_override_bloco_substituto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_override
    ADD CONSTRAINT documento_override_bloco_substituto_id_fkey FOREIGN KEY (bloco_substituto_id) REFERENCES public.tmpl_bloco(id) ON DELETE RESTRICT;


--
-- Name: documento_override documento_override_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_override
    ADD CONSTRAINT documento_override_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: documento_override documento_override_documento_gerado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_override
    ADD CONSTRAINT documento_override_documento_gerado_id_fkey FOREIGN KEY (documento_gerado_id) REFERENCES public.documento_gerado(id) ON DELETE CASCADE;


--
-- Name: documento_override documento_override_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_override
    ADD CONSTRAINT documento_override_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: documento_tipo documento_tipo_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_tipo
    ADD CONSTRAINT documento_tipo_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: documento_tipo documento_tipo_solicitacao_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_tipo
    ADD CONSTRAINT documento_tipo_solicitacao_item_id_fkey FOREIGN KEY (solicitacao_item_id) REFERENCES public.solicitacao_item(id) ON DELETE CASCADE;


--
-- Name: documentos_processo documentos_processo_canonico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_processo
    ADD CONSTRAINT documentos_processo_canonico_id_fkey FOREIGN KEY (canonico_id) REFERENCES public.documentos_processo(id) ON DELETE SET NULL;


--
-- Name: documentos_processo documentos_processo_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos_processo
    ADD CONSTRAINT documentos_processo_cluster_id_fk FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: documents documents_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE SET NULL;


--
-- Name: documents documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES auth.users(id);


--
-- Name: documents documents_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documents
    ADD CONSTRAINT documents_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: efd_correcoes efd_correcoes_usuario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.efd_correcoes
    ADD CONSTRAINT efd_correcoes_usuario_id_fkey FOREIGN KEY (usuario_id) REFERENCES auth.users(id);


--
-- Name: estrutura_areas estrutura_areas_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_areas
    ADD CONSTRAINT estrutura_areas_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE CASCADE;


--
-- Name: estrutura_areas estrutura_areas_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_areas
    ADD CONSTRAINT estrutura_areas_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.centros_custo(id);


--
-- Name: estrutura_areas estrutura_areas_gestor_chamados_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_areas
    ADD CONSTRAINT estrutura_areas_gestor_chamados_id_fkey FOREIGN KEY (gestor_chamados_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: estrutura_clusters estrutura_clusters_cost_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_clusters
    ADD CONSTRAINT estrutura_clusters_cost_center_id_fkey FOREIGN KEY (cost_center_id) REFERENCES public.centros_custo(id);


--
-- Name: estrutura_equipe_membros estrutura_equipe_membros_equipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_equipe_membros
    ADD CONSTRAINT estrutura_equipe_membros_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.estrutura_equipes(id) ON DELETE CASCADE;


--
-- Name: estrutura_equipe_membros estrutura_equipe_membros_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_equipe_membros
    ADD CONSTRAINT estrutura_equipe_membros_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: estrutura_equipes estrutura_equipes_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_equipes
    ADD CONSTRAINT estrutura_equipes_area_id_fkey FOREIGN KEY (area_id) REFERENCES public.estrutura_areas(id) ON DELETE CASCADE;


--
-- Name: estrutura_equipes estrutura_equipes_gestor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.estrutura_equipes
    ADD CONSTRAINT estrutura_equipes_gestor_id_fkey FOREIGN KEY (gestor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: etapa_documentos etapa_documentos_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_documentos
    ADD CONSTRAINT etapa_documentos_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES public.documentos_processo(id) ON DELETE CASCADE;


--
-- Name: etapa_documentos etapa_documentos_etapa_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_documentos
    ADD CONSTRAINT etapa_documentos_etapa_fk FOREIGN KEY (etapa_id, scenario) REFERENCES public.process_stages(id, scenario) ON DELETE CASCADE;


--
-- Name: etapa_responsaveis etapa_responsaveis_etapa_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_responsaveis
    ADD CONSTRAINT etapa_responsaveis_etapa_fk FOREIGN KEY (etapa_id, scenario) REFERENCES public.process_stages(id, scenario) ON DELETE CASCADE;


--
-- Name: etapa_responsaveis etapa_responsaveis_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_responsaveis
    ADD CONSTRAINT etapa_responsaveis_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.job_roles(id) ON DELETE CASCADE;


--
-- Name: etapa_sistemas etapa_sistemas_etapa_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_sistemas
    ADD CONSTRAINT etapa_sistemas_etapa_fk FOREIGN KEY (etapa_id, scenario) REFERENCES public.process_stages(id, scenario) ON DELETE CASCADE;


--
-- Name: etapa_sistemas etapa_sistemas_sistema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.etapa_sistemas
    ADD CONSTRAINT etapa_sistemas_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES public.sistemas_processo(id) ON DELETE CASCADE;


--
-- Name: exploracao_rural exploracao_rural_bem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exploracao_rural
    ADD CONSTRAINT exploracao_rural_bem_id_fkey FOREIGN KEY (bem_id) REFERENCES public.bem(id) ON DELETE SET NULL;


--
-- Name: exploracao_rural exploracao_rural_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exploracao_rural
    ADD CONSTRAINT exploracao_rural_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: exploracao_rural exploracao_rural_explorador_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exploracao_rural
    ADD CONSTRAINT exploracao_rural_explorador_pessoa_id_fkey FOREIGN KEY (explorador_pessoa_id) REFERENCES public.pessoa(id) ON DELETE SET NULL;


--
-- Name: exploracao_rural exploracao_rural_outorgante_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exploracao_rural
    ADD CONSTRAINT exploracao_rural_outorgante_pessoa_id_fkey FOREIGN KEY (outorgante_pessoa_id) REFERENCES public.pessoa(id) ON DELETE SET NULL;


--
-- Name: feedbacks feedbacks_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks
    ADD CONSTRAINT feedbacks_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_avaliacao(id) ON DELETE SET NULL;


--
-- Name: gargalo_etapas gargalo_etapas_etapa_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_etapas
    ADD CONSTRAINT gargalo_etapas_etapa_fk FOREIGN KEY (etapa_id, scenario) REFERENCES public.process_stages(id, scenario) ON DELETE CASCADE;


--
-- Name: gargalo_etapas gargalo_etapas_gargalo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_etapas
    ADD CONSTRAINT gargalo_etapas_gargalo_id_fkey FOREIGN KEY (gargalo_id) REFERENCES public.gargalos(id) ON DELETE CASCADE;


--
-- Name: gargalo_melhorias gargalo_melhorias_gargalo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_melhorias
    ADD CONSTRAINT gargalo_melhorias_gargalo_id_fkey FOREIGN KEY (gargalo_id) REFERENCES public.gargalos(id) ON DELETE CASCADE;


--
-- Name: gargalo_melhorias gargalo_melhorias_melhoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_melhorias
    ADD CONSTRAINT gargalo_melhorias_melhoria_id_fkey FOREIGN KEY (melhoria_id) REFERENCES public.process_improvements(id) ON DELETE CASCADE;


--
-- Name: gargalo_processos gargalo_processos_gargalo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_processos
    ADD CONSTRAINT gargalo_processos_gargalo_id_fkey FOREIGN KEY (gargalo_id) REFERENCES public.gargalos(id) ON DELETE CASCADE;


--
-- Name: gargalo_processos gargalo_processos_processo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_processos
    ADD CONSTRAINT gargalo_processos_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processes(id) ON DELETE CASCADE;


--
-- Name: gargalo_responsaveis gargalo_responsaveis_gargalo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_responsaveis
    ADD CONSTRAINT gargalo_responsaveis_gargalo_id_fkey FOREIGN KEY (gargalo_id) REFERENCES public.gargalos(id) ON DELETE CASCADE;


--
-- Name: gargalo_responsaveis gargalo_responsaveis_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalo_responsaveis
    ADD CONSTRAINT gargalo_responsaveis_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.job_roles(id) ON DELETE CASCADE;


--
-- Name: gargalos gargalos_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalos
    ADD CONSTRAINT gargalos_cluster_id_fk FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: gargalos gargalos_melhoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gargalos
    ADD CONSTRAINT gargalos_melhoria_id_fkey FOREIGN KEY (melhoria_id) REFERENCES public.process_improvements(id) ON DELETE SET NULL;


--
-- Name: impedimento impedimento_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impedimento
    ADD CONSTRAINT impedimento_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: impedimento impedimento_credor_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impedimento
    ADD CONSTRAINT impedimento_credor_pessoa_id_fkey FOREIGN KEY (credor_pessoa_id) REFERENCES public.pessoa(id) ON DELETE SET NULL;


--
-- Name: impedimento impedimento_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impedimento
    ADD CONSTRAINT impedimento_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matricula(id) ON DELETE CASCADE;


--
-- Name: impedimento impedimento_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.impedimento
    ADD CONSTRAINT impedimento_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: improvement_savings_details improvement_savings_details_improvement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_savings_details
    ADD CONSTRAINT improvement_savings_details_improvement_id_fkey FOREIGN KEY (improvement_id) REFERENCES public.process_improvements(id) ON DELETE CASCADE;


--
-- Name: improvement_team_members improvement_team_members_improvement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_team_members
    ADD CONSTRAINT improvement_team_members_improvement_id_fkey FOREIGN KEY (improvement_id) REFERENCES public.process_improvements(id) ON DELETE CASCADE;


--
-- Name: improvement_team_members improvement_team_members_job_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_team_members
    ADD CONSTRAINT improvement_team_members_job_role_id_fkey FOREIGN KEY (job_role_id) REFERENCES public.job_roles(id);


--
-- Name: improvement_team_members improvement_team_members_profile_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.improvement_team_members
    ADD CONSTRAINT improvement_team_members_profile_id_fkey FOREIGN KEY (profile_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: inscricao_contribuinte inscricao_contribuinte_contribuinte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscricao_contribuinte
    ADD CONSTRAINT inscricao_contribuinte_contribuinte_id_fkey FOREIGN KEY (contribuinte_id) REFERENCES public.contribuinte(id) NOT VALID;


--
-- Name: itens_acao_1a1 itens_acao_1a1_reuniao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.itens_acao_1a1
    ADD CONSTRAINT itens_acao_1a1_reuniao_id_fkey FOREIGN KEY (reuniao_id) REFERENCES public.reunioes_1a1(id) ON DELETE CASCADE;


--
-- Name: job_roles job_roles_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_roles
    ADD CONSTRAINT job_roles_cluster_id_fk FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: kpis_meta kpis_meta_meta_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.kpis_meta
    ADD CONSTRAINT kpis_meta_meta_id_fkey FOREIGN KEY (meta_id) REFERENCES public.metas(id) ON DELETE CASCADE;


--
-- Name: matricula matricula_bem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT matricula_bem_id_fkey FOREIGN KEY (bem_id) REFERENCES public.bem(id) ON DELETE SET NULL;


--
-- Name: matricula matricula_cartorio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT matricula_cartorio_id_fkey FOREIGN KEY (cartorio_id) REFERENCES public.cartorio(id) ON DELETE RESTRICT;


--
-- Name: matricula matricula_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT matricula_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE SET NULL;


--
-- Name: matricula matricula_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT matricula_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: matricula matricula_matricula_anterior_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT matricula_matricula_anterior_id_fkey FOREIGN KEY (matricula_anterior_id) REFERENCES public.matricula(id) ON DELETE SET NULL;


--
-- Name: matricula matricula_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.matricula
    ADD CONSTRAINT matricula_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: melhoria_acoes_td melhoria_acoes_td_melhoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_acoes_td
    ADD CONSTRAINT melhoria_acoes_td_melhoria_id_fkey FOREIGN KEY (melhoria_id) REFERENCES public.process_improvements(id) ON DELETE CASCADE;


--
-- Name: melhoria_processos melhoria_processos_melhoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_processos
    ADD CONSTRAINT melhoria_processos_melhoria_id_fkey FOREIGN KEY (melhoria_id) REFERENCES public.process_improvements(id) ON DELETE CASCADE;


--
-- Name: melhoria_processos melhoria_processos_processo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_processos
    ADD CONSTRAINT melhoria_processos_processo_id_fkey FOREIGN KEY (processo_id) REFERENCES public.processes(id) ON DELETE CASCADE;


--
-- Name: melhoria_responsaveis melhoria_responsaveis_melhoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_responsaveis
    ADD CONSTRAINT melhoria_responsaveis_melhoria_id_fkey FOREIGN KEY (melhoria_id) REFERENCES public.process_improvements(id) ON DELETE CASCADE;


--
-- Name: melhoria_responsaveis melhoria_responsaveis_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_responsaveis
    ADD CONSTRAINT melhoria_responsaveis_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.job_roles(id) ON DELETE CASCADE;


--
-- Name: melhoria_sistemas melhoria_sistemas_melhoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_sistemas
    ADD CONSTRAINT melhoria_sistemas_melhoria_id_fkey FOREIGN KEY (melhoria_id) REFERENCES public.process_improvements(id) ON DELETE CASCADE;


--
-- Name: melhoria_sistemas melhoria_sistemas_sistema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.melhoria_sistemas
    ADD CONSTRAINT melhoria_sistemas_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES public.sistemas_processo(id) ON DELETE CASCADE;


--
-- Name: metas metas_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metas
    ADD CONSTRAINT metas_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE;


--
-- Name: metas metas_meta_pai_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.metas
    ADD CONSTRAINT metas_meta_pai_id_fkey FOREIGN KEY (meta_pai_id) REFERENCES public.metas(id) ON DELETE SET NULL;


--
-- Name: notificacao notificacao_destinatario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacao
    ADD CONSTRAINT notificacao_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: notificacao_envio notificacao_envio_destinatario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacao_envio
    ADD CONSTRAINT notificacao_envio_destinatario_id_fkey FOREIGN KEY (destinatario_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: notificacao_envio notificacao_envio_notificacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.notificacao_envio
    ADD CONSTRAINT notificacao_envio_notificacao_id_fkey FOREIGN KEY (notificacao_id) REFERENCES public.notificacao(id) ON DELETE SET NULL;


--
-- Name: ordem_servico ordem_servico_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordem_servico
    ADD CONSTRAINT ordem_servico_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: ordem_servico ordem_servico_id_produto_segmento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordem_servico
    ADD CONSTRAINT ordem_servico_id_produto_segmento_fkey FOREIGN KEY (id_produto_segmento) REFERENCES public.produto_segmento(id) ON DELETE SET NULL;


--
-- Name: ordem_servico ordem_servico_id_servico_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordem_servico
    ADD CONSTRAINT ordem_servico_id_servico_fkey FOREIGN KEY (id_servico) REFERENCES public.servicos_prestados(id) ON DELETE SET NULL;


--
-- Name: ordem_servico ordem_servico_setor_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ordem_servico
    ADD CONSTRAINT ordem_servico_setor_cliente_id_fkey FOREIGN KEY (setor_cliente_id) REFERENCES public.setor_cliente(id);


--
-- Name: org_comment_attachments org_comment_attachments_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comment_attachments
    ADD CONSTRAINT org_comment_attachments_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.org_comments(id) ON DELETE CASCADE;


--
-- Name: org_comment_attachments org_comment_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comment_attachments
    ADD CONSTRAINT org_comment_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: org_comment_mentions org_comment_mentions_comment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comment_mentions
    ADD CONSTRAINT org_comment_mentions_comment_id_fkey FOREIGN KEY (comment_id) REFERENCES public.org_comments(id) ON DELETE CASCADE;


--
-- Name: org_comment_mentions org_comment_mentions_mentioned_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comment_mentions
    ADD CONSTRAINT org_comment_mentions_mentioned_user_id_fkey FOREIGN KEY (mentioned_user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;


--
-- Name: org_comments org_comments_author_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comments
    ADD CONSTRAINT org_comments_author_id_fkey FOREIGN KEY (author_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: org_comments org_comments_excluido_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comments
    ADD CONSTRAINT org_comments_excluido_por_fkey FOREIGN KEY (excluido_por) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: org_comments org_comments_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comments
    ADD CONSTRAINT org_comments_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.org_comments(id) ON DELETE CASCADE;


--
-- Name: org_comments org_comments_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_comments
    ADD CONSTRAINT org_comments_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.org_projects(id) ON DELETE CASCADE;


--
-- Name: org_project_members org_project_members_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_project_members
    ADD CONSTRAINT org_project_members_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.org_projects(id) ON DELETE CASCADE;


--
-- Name: org_project_members org_project_members_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_project_members
    ADD CONSTRAINT org_project_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_servicos org_project_servicos_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_servicos
    ADD CONSTRAINT org_project_servicos_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.org_projects(id) ON DELETE CASCADE;


--
-- Name: org_projects org_projects_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_projects
    ADD CONSTRAINT org_projects_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: org_projects org_projects_equipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_projects
    ADD CONSTRAINT org_projects_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.estrutura_equipes(id);


--
-- Name: org_projects org_projects_estrutura_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_projects
    ADD CONSTRAINT org_projects_estrutura_area_id_fkey FOREIGN KEY (estrutura_area_id) REFERENCES public.estrutura_areas(id);


--
-- Name: org_projects org_projects_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_projects
    ADD CONSTRAINT org_projects_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: org_projects org_projects_ordem_servico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_projects
    ADD CONSTRAINT org_projects_ordem_servico_id_fkey FOREIGN KEY (ordem_servico_id) REFERENCES public.ordem_servico(id);


--
-- Name: org_projects org_projects_produto_segmento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_projects
    ADD CONSTRAINT org_projects_produto_segmento_id_fkey FOREIGN KEY (produto_segmento_id) REFERENCES public.produto_segmento(id);


--
-- Name: org_projects org_projects_responsible_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_projects
    ADD CONSTRAINT org_projects_responsible_id_fkey FOREIGN KEY (responsible_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: org_projects org_projects_servico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_projects
    ADD CONSTRAINT org_projects_servico_id_fkey FOREIGN KEY (servico_id) REFERENCES public.servicos_prestados(id);


--
-- Name: org_task_comments org_task_comments_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_task_comments
    ADD CONSTRAINT org_task_comments_task_id_fkey FOREIGN KEY (task_id) REFERENCES public.org_tasks(id) ON DELETE CASCADE;


--
-- Name: org_task_comments org_task_comments_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_task_comments
    ADD CONSTRAINT org_task_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: org_tasks org_tasks_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tasks
    ADD CONSTRAINT org_tasks_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: org_tasks org_tasks_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tasks
    ADD CONSTRAINT org_tasks_categoria_id_fkey FOREIGN KEY (servico_id) REFERENCES public.servicos_prestados(id) ON DELETE SET NULL;


--
-- Name: org_tasks org_tasks_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tasks
    ADD CONSTRAINT org_tasks_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.cliente(id) ON DELETE SET NULL;


--
-- Name: org_tasks org_tasks_contribuinte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tasks
    ADD CONSTRAINT org_tasks_contribuinte_id_fkey FOREIGN KEY (contribuinte_id) REFERENCES public.contribuinte(id) NOT VALID;


--
-- Name: org_tasks org_tasks_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tasks
    ADD CONSTRAINT org_tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: org_tasks org_tasks_parent_task_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tasks
    ADD CONSTRAINT org_tasks_parent_task_id_fkey FOREIGN KEY (parent_task_id) REFERENCES public.org_tasks(id) ON DELETE CASCADE;


--
-- Name: org_tasks org_tasks_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tasks
    ADD CONSTRAINT org_tasks_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.org_projects(id) ON DELETE SET NULL;


--
-- Name: org_tasks org_tasks_reviewer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_tasks
    ADD CONSTRAINT org_tasks_reviewer_id_fkey FOREIGN KEY (reviewer_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: os_produtos_contratados os_produtos_contratados_ordem_servico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.os_produtos_contratados
    ADD CONSTRAINT os_produtos_contratados_ordem_servico_id_fkey FOREIGN KEY (ordem_servico_id) REFERENCES public.ordem_servico(id) ON DELETE CASCADE;


--
-- Name: os_produtos_contratados os_produtos_contratados_produto_segmento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.os_produtos_contratados
    ADD CONSTRAINT os_produtos_contratados_produto_segmento_id_fkey FOREIGN KEY (produto_segmento_id) REFERENCES public.produto_segmento(id) ON DELETE RESTRICT;


--
-- Name: parentesco parentesco_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parentesco
    ADD CONSTRAINT parentesco_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: parentesco parentesco_parente_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parentesco
    ADD CONSTRAINT parentesco_parente_pessoa_id_fkey FOREIGN KEY (parente_pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: parentesco parentesco_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parentesco
    ADD CONSTRAINT parentesco_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: parentesco parentesco_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parentesco
    ADD CONSTRAINT parentesco_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: per per_criado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.per
    ADD CONSTRAINT per_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);


--
-- Name: per per_nr_proc_ret_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.per
    ADD CONSTRAINT per_nr_proc_ret_fkey FOREIGN KEY (nr_proc_ret) REFERENCES public.per(nr_per);


--
-- Name: per_situacao per_situacao_criado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.per_situacao
    ADD CONSTRAINT per_situacao_criado_por_fkey FOREIGN KEY (criado_por) REFERENCES auth.users(id);


--
-- Name: per_situacao per_situacao_nr_proc_per_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.per_situacao
    ADD CONSTRAINT per_situacao_nr_proc_per_fkey FOREIGN KEY (nr_proc_per) REFERENCES public.per(nr_per);


--
-- Name: pessoa pessoa_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pessoa
    ADD CONSTRAINT pessoa_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: pessoa pessoa_conjuge_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pessoa
    ADD CONSTRAINT pessoa_conjuge_id_fkey FOREIGN KEY (conjuge_id) REFERENCES public.pessoa(id) ON DELETE SET NULL;


--
-- Name: pessoa pessoa_contribuinte_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pessoa
    ADD CONSTRAINT pessoa_contribuinte_id_fkey FOREIGN KEY (contribuinte_id) REFERENCES public.contribuinte(id) ON DELETE SET NULL;


--
-- Name: pessoa pessoa_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pessoa
    ADD CONSTRAINT pessoa_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: pessoa pessoa_filiacao_mae_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pessoa
    ADD CONSTRAINT pessoa_filiacao_mae_pessoa_id_fkey FOREIGN KEY (filiacao_mae_pessoa_id) REFERENCES public.pessoa(id) ON DELETE SET NULL;


--
-- Name: pessoa pessoa_filiacao_pai_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pessoa
    ADD CONSTRAINT pessoa_filiacao_pai_pessoa_id_fkey FOREIGN KEY (filiacao_pai_pessoa_id) REFERENCES public.pessoa(id) ON DELETE SET NULL;


--
-- Name: pessoa pessoa_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pessoa
    ADD CONSTRAINT pessoa_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: pis_cofins_class pis_cofins_class_classificado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pis_cofins_class
    ADD CONSTRAINT pis_cofins_class_classificado_por_fkey FOREIGN KEY (classificado_por) REFERENCES public.profiles(id);


--
-- Name: pis_cofins_class pis_cofins_class_id_contribuinte_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pis_cofins_class
    ADD CONSTRAINT pis_cofins_class_id_contribuinte_fkey FOREIGN KEY (id_contribuinte) REFERENCES public.contribuinte(id);


--
-- Name: pis_cofins_class pis_cofins_class_id_regra_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pis_cofins_class
    ADD CONSTRAINT pis_cofins_class_id_regra_fkey FOREIGN KEY (id_regra) REFERENCES public.pis_cofins_regra(id);


--
-- Name: ppr_regras_ciclo ppr_regras_ciclo_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ppr_regras_ciclo
    ADD CONSTRAINT ppr_regras_ciclo_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_avaliacao(id) ON DELETE CASCADE;


--
-- Name: process_improvements process_improvements_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_improvements
    ADD CONSTRAINT process_improvements_cluster_id_fk FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: process_improvements process_improvements_evaluated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_improvements
    ADD CONSTRAINT process_improvements_evaluated_by_fkey FOREIGN KEY (evaluated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: process_improvements process_improvements_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_improvements
    ADD CONSTRAINT process_improvements_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE CASCADE;


--
-- Name: process_improvements process_improvements_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_improvements
    ADD CONSTRAINT process_improvements_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: process_improvements process_improvements_sprint_deliverable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_improvements
    ADD CONSTRAINT process_improvements_sprint_deliverable_id_fkey FOREIGN KEY (sprint_deliverable_id) REFERENCES public.sprint_deliverables(id);


--
-- Name: process_scenarios process_scenarios_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_scenarios
    ADD CONSTRAINT process_scenarios_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;


--
-- Name: process_scenarios process_scenarios_improvement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_scenarios
    ADD CONSTRAINT process_scenarios_improvement_id_fkey FOREIGN KEY (improvement_id) REFERENCES public.process_improvements(id) ON DELETE SET NULL;


--
-- Name: process_scenarios process_scenarios_parent_scenario_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_scenarios
    ADD CONSTRAINT process_scenarios_parent_scenario_id_fkey FOREIGN KEY (parent_scenario_id) REFERENCES public.process_scenarios(id) ON DELETE SET NULL;


--
-- Name: process_scenarios process_scenarios_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_scenarios
    ADD CONSTRAINT process_scenarios_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE CASCADE;


--
-- Name: process_scenarios process_scenarios_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_scenarios
    ADD CONSTRAINT process_scenarios_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: process_stages process_stages_job_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_stages
    ADD CONSTRAINT process_stages_job_role_id_fkey FOREIGN KEY (job_role_id) REFERENCES public.job_roles(id);


--
-- Name: process_stages process_stages_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.process_stages
    ADD CONSTRAINT process_stages_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE CASCADE;


--
-- Name: processes processes_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.catalog_clients(id);


--
-- Name: processes processes_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_cluster_id_fk FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: processes processes_equipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.estrutura_equipes(id) ON DELETE SET NULL;


--
-- Name: processes processes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.processes
    ADD CONSTRAINT processes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: produto_documento_tipo produto_documento_tipo_item_padrao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_documento_tipo
    ADD CONSTRAINT produto_documento_tipo_item_padrao_id_fkey FOREIGN KEY (item_padrao_id) REFERENCES public.documento_tipo(id) ON DELETE CASCADE;


--
-- Name: produto_documento_tipo produto_documento_tipo_produto_segmento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_documento_tipo
    ADD CONSTRAINT produto_documento_tipo_produto_segmento_id_fkey FOREIGN KEY (produto_segmento_id) REFERENCES public.produto_segmento(id) ON DELETE CASCADE;


--
-- Name: produto_segmento produto_segmento_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_segmento
    ADD CONSTRAINT produto_segmento_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: produto_servico produto_servico_produto_segmento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_servico
    ADD CONSTRAINT produto_servico_produto_segmento_id_fkey FOREIGN KEY (produto_segmento_id) REFERENCES public.produto_segmento(id) ON DELETE CASCADE;


--
-- Name: produto_servico produto_servico_servico_prestado_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.produto_servico
    ADD CONSTRAINT produto_servico_servico_prestado_id_fkey FOREIGN KEY (servico_prestado_id) REFERENCES public.servicos_prestados(id) ON DELETE CASCADE;


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: project_documents project_documents_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE SET NULL;


--
-- Name: project_documents project_documents_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE SET NULL;


--
-- Name: project_documents project_documents_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_documents
    ADD CONSTRAINT project_documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: project_processes project_processes_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_processes
    ADD CONSTRAINT project_processes_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE CASCADE;


--
-- Name: project_processes project_processes_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_processes
    ADD CONSTRAINT project_processes_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: projects projects_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_client_id_fkey FOREIGN KEY (client_id) REFERENCES public.catalog_clients(id);


--
-- Name: projects projects_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_cluster_id_fk FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: projects projects_equipe_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_equipe_id_fkey FOREIGN KEY (equipe_id) REFERENCES public.estrutura_equipes(id) ON DELETE SET NULL;


--
-- Name: projects projects_external_client_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_external_client_id_fkey FOREIGN KEY (external_client_id) REFERENCES public.cliente(id);


--
-- Name: projects projects_leader_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projects
    ADD CONSTRAINT projects_leader_id_fkey FOREIGN KEY (leader_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: projeto_flag_valor projeto_flag_valor_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_flag_valor
    ADD CONSTRAINT projeto_flag_valor_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: projeto_flag_valor projeto_flag_valor_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_flag_valor
    ADD CONSTRAINT projeto_flag_valor_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: projeto_flag_valor projeto_flag_valor_flag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_flag_valor
    ADD CONSTRAINT projeto_flag_valor_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.tmpl_flag(id) ON DELETE CASCADE;


--
-- Name: projeto_flag_valor projeto_flag_valor_pj_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_flag_valor
    ADD CONSTRAINT projeto_flag_valor_pj_pessoa_id_fkey FOREIGN KEY (pj_pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: projeto_flag_valor projeto_flag_valor_setado_por_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_flag_valor
    ADD CONSTRAINT projeto_flag_valor_setado_por_id_fkey FOREIGN KEY (setado_por_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: projeto_flag_valor projeto_flag_valor_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_flag_valor
    ADD CONSTRAINT projeto_flag_valor_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: projeto_justificativas projeto_justificativas_projeto_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_justificativas
    ADD CONSTRAINT projeto_justificativas_projeto_id_fkey FOREIGN KEY (projeto_id) REFERENCES public.projects(id) ON DELETE CASCADE;


--
-- Name: quadro_societario quadro_societario_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quadro_societario
    ADD CONSTRAINT quadro_societario_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: quadro_societario quadro_societario_empresa_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quadro_societario
    ADD CONSTRAINT quadro_societario_empresa_pessoa_id_fkey FOREIGN KEY (empresa_pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: quadro_societario quadro_societario_socio_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quadro_societario
    ADD CONSTRAINT quadro_societario_socio_pessoa_id_fkey FOREIGN KEY (socio_pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: quadro_societario quadro_societario_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quadro_societario
    ADD CONSTRAINT quadro_societario_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: relatorios_gerados relatorios_gerados_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.relatorios_gerados
    ADD CONSTRAINT relatorios_gerados_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_avaliacao(id) ON DELETE SET NULL;


--
-- Name: representante representante_id_cliente_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.representante
    ADD CONSTRAINT representante_id_cliente_fkey FOREIGN KEY (id_cliente) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: representante representante_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.representante
    ADD CONSTRAINT representante_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: reunioes_1a1 reunioes_1a1_ciclo_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reunioes_1a1
    ADD CONSTRAINT reunioes_1a1_ciclo_id_fkey FOREIGN KEY (ciclo_id) REFERENCES public.ciclos_avaliacao(id) ON DELETE SET NULL;


--
-- Name: roi_snapshots roi_snapshots_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roi_snapshots
    ADD CONSTRAINT roi_snapshots_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: roi_snapshots roi_snapshots_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.roi_snapshots
    ADD CONSTRAINT roi_snapshots_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id) ON DELETE CASCADE;


--
-- Name: routines routines_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT routines_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: routines routines_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.routines
    ADD CONSTRAINT routines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: servicos_prestados servicos_prestados_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.servicos_prestados
    ADD CONSTRAINT servicos_prestados_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id);


--
-- Name: sistema_clusters sistema_clusters_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistema_clusters
    ADD CONSTRAINT sistema_clusters_cluster_id_fk FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE CASCADE;


--
-- Name: sistema_clusters sistema_clusters_sistema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistema_clusters
    ADD CONSTRAINT sistema_clusters_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES public.sistemas_processo(id) ON DELETE CASCADE;


--
-- Name: sistema_responsaveis sistema_responsaveis_responsavel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistema_responsaveis
    ADD CONSTRAINT sistema_responsaveis_responsavel_id_fkey FOREIGN KEY (responsavel_id) REFERENCES public.job_roles(id) ON DELETE CASCADE;


--
-- Name: sistema_responsaveis sistema_responsaveis_sistema_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistema_responsaveis
    ADD CONSTRAINT sistema_responsaveis_sistema_id_fkey FOREIGN KEY (sistema_id) REFERENCES public.sistemas_processo(id) ON DELETE CASCADE;


--
-- Name: sistemas_processo sistemas_processo_cluster_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sistemas_processo
    ADD CONSTRAINT sistemas_processo_cluster_id_fk FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: solicitacao solicitacao_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao
    ADD CONSTRAINT solicitacao_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: solicitacao_item solicitacao_item_item_padrao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item
    ADD CONSTRAINT solicitacao_item_item_padrao_id_fkey FOREIGN KEY (item_padrao_id) REFERENCES public.documento_tipo(id) ON DELETE RESTRICT;


--
-- Name: solicitacao_item_nao_aplicavel solicitacao_item_nao_aplicavel_bem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item_nao_aplicavel
    ADD CONSTRAINT solicitacao_item_nao_aplicavel_bem_id_fkey FOREIGN KEY (bem_id) REFERENCES public.bem(id) ON DELETE CASCADE;


--
-- Name: solicitacao_item_nao_aplicavel solicitacao_item_nao_aplicavel_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item_nao_aplicavel
    ADD CONSTRAINT solicitacao_item_nao_aplicavel_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id) ON DELETE CASCADE;


--
-- Name: solicitacao_item_nao_aplicavel solicitacao_item_nao_aplicavel_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item_nao_aplicavel
    ADD CONSTRAINT solicitacao_item_nao_aplicavel_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: solicitacao_item_nao_aplicavel solicitacao_item_nao_aplicavel_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item_nao_aplicavel
    ADD CONSTRAINT solicitacao_item_nao_aplicavel_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matricula(id) ON DELETE CASCADE;


--
-- Name: solicitacao_item_nao_aplicavel solicitacao_item_nao_aplicavel_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item_nao_aplicavel
    ADD CONSTRAINT solicitacao_item_nao_aplicavel_pessoa_id_fkey FOREIGN KEY (pessoa_id) REFERENCES public.pessoa(id) ON DELETE CASCADE;


--
-- Name: solicitacao_item_nao_aplicavel solicitacao_item_nao_aplicavel_solicitacao_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item_nao_aplicavel
    ADD CONSTRAINT solicitacao_item_nao_aplicavel_solicitacao_item_id_fkey FOREIGN KEY (solicitacao_item_id) REFERENCES public.solicitacao_item(id) ON DELETE CASCADE;


--
-- Name: solicitacao_item solicitacao_item_solicitacao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao_item
    ADD CONSTRAINT solicitacao_item_solicitacao_id_fkey FOREIGN KEY (solicitacao_id) REFERENCES public.solicitacao(id) ON DELETE CASCADE;


--
-- Name: solicitacao solicitacao_ordem_servico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.solicitacao
    ADD CONSTRAINT solicitacao_ordem_servico_id_fkey FOREIGN KEY (ordem_servico_id) REFERENCES public.ordem_servico(id) ON DELETE SET NULL;


--
-- Name: sprint_backlog_items sprint_backlog_items_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_backlog_items
    ADD CONSTRAINT sprint_backlog_items_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: sprint_backlog_items sprint_backlog_items_moved_to_deliverable_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_backlog_items
    ADD CONSTRAINT sprint_backlog_items_moved_to_deliverable_id_fkey FOREIGN KEY (moved_to_deliverable_id) REFERENCES public.sprint_deliverables(id);


--
-- Name: sprint_backlog_items sprint_backlog_items_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_backlog_items
    ADD CONSTRAINT sprint_backlog_items_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE SET NULL;


--
-- Name: sprint_backlog_items sprint_backlog_items_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_backlog_items
    ADD CONSTRAINT sprint_backlog_items_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE CASCADE;


--
-- Name: sprint_backlog_items sprint_backlog_items_suggested_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_backlog_items
    ADD CONSTRAINT sprint_backlog_items_suggested_by_fkey FOREIGN KEY (suggested_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: sprint_deliverables sprint_deliverables_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_deliverables
    ADD CONSTRAINT sprint_deliverables_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: sprint_deliverables sprint_deliverables_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_deliverables
    ADD CONSTRAINT sprint_deliverables_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.sprint_deliverables(id) ON DELETE CASCADE;


--
-- Name: sprint_deliverables sprint_deliverables_process_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_deliverables
    ADD CONSTRAINT sprint_deliverables_process_id_fkey FOREIGN KEY (process_id) REFERENCES public.processes(id);


--
-- Name: sprint_deliverables sprint_deliverables_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_deliverables
    ADD CONSTRAINT sprint_deliverables_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: sprint_deliverables sprint_deliverables_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_deliverables
    ADD CONSTRAINT sprint_deliverables_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE CASCADE;


--
-- Name: sprint_events sprint_events_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_events
    ADD CONSTRAINT sprint_events_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE CASCADE;


--
-- Name: sprint_metrics sprint_metrics_sprint_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprint_metrics
    ADD CONSTRAINT sprint_metrics_sprint_id_fkey FOREIGN KEY (sprint_id) REFERENCES public.sprints(id) ON DELETE CASCADE;


--
-- Name: sprints sprints_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprints
    ADD CONSTRAINT sprints_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: sprints sprints_project_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sprints
    ADD CONSTRAINT sprints_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects(id);


--
-- Name: area_servicos tax_area_categorias_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.area_servicos
    ADD CONSTRAINT tax_area_categorias_categoria_id_fkey FOREIGN KEY (servico_id) REFERENCES public.servicos_prestados(id) ON DELETE CASCADE;


--
-- Name: project_servicos tax_project_categorias_categoria_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.project_servicos
    ADD CONSTRAINT tax_project_categorias_categoria_id_fkey FOREIGN KEY (servico_id) REFERENCES public.servicos_prestados(id) ON DELETE RESTRICT;


--
-- Name: ticket_attachments ticket_attachments_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_attachments ticket_attachments_uploaded_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_attachments
    ADD CONSTRAINT ticket_attachments_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: ticket_messages ticket_messages_ticket_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_ticket_id_fkey FOREIGN KEY (ticket_id) REFERENCES public.tickets(id) ON DELETE CASCADE;


--
-- Name: ticket_messages ticket_messages_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ticket_messages
    ADD CONSTRAINT ticket_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: tickets tickets_assigned_to_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_cliente_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_cliente_id_fkey FOREIGN KEY (cliente_id) REFERENCES public.cliente(id);


--
-- Name: tickets tickets_cluster_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_cluster_id_fkey FOREIGN KEY (cluster_id) REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;


--
-- Name: tickets tickets_estrutura_area_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_estrutura_area_id_fkey FOREIGN KEY (estrutura_area_id) REFERENCES public.estrutura_areas(id);


--
-- Name: tickets tickets_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tickets
    ADD CONSTRAINT tickets_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: titularidade titularidade_bem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titularidade
    ADD CONSTRAINT titularidade_bem_id_fkey FOREIGN KEY (bem_id) REFERENCES public.bem(id) ON DELETE CASCADE;


--
-- Name: titularidade titularidade_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titularidade
    ADD CONSTRAINT titularidade_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);


--
-- Name: titularidade titularidade_matricula_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titularidade
    ADD CONSTRAINT titularidade_matricula_id_fkey FOREIGN KEY (matricula_id) REFERENCES public.matricula(id) ON DELETE CASCADE;


--
-- Name: titularidade titularidade_titular_pessoa_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titularidade
    ADD CONSTRAINT titularidade_titular_pessoa_id_fkey FOREIGN KEY (titular_pessoa_id) REFERENCES public.pessoa(id) ON DELETE RESTRICT;


--
-- Name: titularidade titularidade_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.titularidade
    ADD CONSTRAINT titularidade_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id);


--
-- Name: tmpl_bloco tmpl_bloco_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco
    ADD CONSTRAINT tmpl_bloco_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_bloco tmpl_bloco_bloco_origem_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco
    ADD CONSTRAINT tmpl_bloco_bloco_origem_id_fkey FOREIGN KEY (bloco_origem_id) REFERENCES public.tmpl_bloco(id) ON DELETE SET NULL;


--
-- Name: tmpl_bloco tmpl_bloco_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco
    ADD CONSTRAINT tmpl_bloco_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_bloco tmpl_bloco_escopo_documento_raiz_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco
    ADD CONSTRAINT tmpl_bloco_escopo_documento_raiz_fk FOREIGN KEY (escopo_documento_raiz_id) REFERENCES public.documento_gerado(id) ON DELETE SET NULL;


--
-- Name: tmpl_bloco tmpl_bloco_familia_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco
    ADD CONSTRAINT tmpl_bloco_familia_id_fkey FOREIGN KEY (familia_id) REFERENCES public.tmpl_bloco(id) ON DELETE CASCADE;


--
-- Name: tmpl_bloco_flag tmpl_bloco_flag_bloco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_flag
    ADD CONSTRAINT tmpl_bloco_flag_bloco_id_fkey FOREIGN KEY (bloco_id) REFERENCES public.tmpl_bloco(id) ON DELETE CASCADE;


--
-- Name: tmpl_bloco_flag tmpl_bloco_flag_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_flag
    ADD CONSTRAINT tmpl_bloco_flag_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_bloco_flag tmpl_bloco_flag_flag_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_flag
    ADD CONSTRAINT tmpl_bloco_flag_flag_id_fkey FOREIGN KEY (flag_id) REFERENCES public.tmpl_flag(id) ON DELETE CASCADE;


--
-- Name: tmpl_bloco_flag tmpl_bloco_flag_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_flag
    ADD CONSTRAINT tmpl_bloco_flag_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_bloco tmpl_bloco_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco
    ADD CONSTRAINT tmpl_bloco_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_bloco_versao tmpl_bloco_versao_autor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_versao
    ADD CONSTRAINT tmpl_bloco_versao_autor_id_fkey FOREIGN KEY (autor_id) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_bloco_versao tmpl_bloco_versao_bloco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_versao
    ADD CONSTRAINT tmpl_bloco_versao_bloco_id_fkey FOREIGN KEY (bloco_id) REFERENCES public.tmpl_bloco(id) ON DELETE CASCADE;


--
-- Name: tmpl_bloco_versao tmpl_bloco_versao_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_versao
    ADD CONSTRAINT tmpl_bloco_versao_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_bloco_versao tmpl_bloco_versao_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_bloco_versao
    ADD CONSTRAINT tmpl_bloco_versao_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_documento_bloco tmpl_documento_bloco_bloco_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_documento_bloco
    ADD CONSTRAINT tmpl_documento_bloco_bloco_id_fkey FOREIGN KEY (bloco_id) REFERENCES public.tmpl_bloco(id) ON DELETE RESTRICT;


--
-- Name: tmpl_documento_bloco tmpl_documento_bloco_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_documento_bloco
    ADD CONSTRAINT tmpl_documento_bloco_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_documento_bloco tmpl_documento_bloco_documento_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_documento_bloco
    ADD CONSTRAINT tmpl_documento_bloco_documento_id_fkey FOREIGN KEY (documento_id) REFERENCES public.tmpl_documento(id) ON DELETE CASCADE;


--
-- Name: tmpl_documento_bloco tmpl_documento_bloco_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_documento_bloco
    ADD CONSTRAINT tmpl_documento_bloco_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_documento tmpl_documento_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_documento
    ADD CONSTRAINT tmpl_documento_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_documento tmpl_documento_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_documento
    ADD CONSTRAINT tmpl_documento_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_flag tmpl_flag_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_flag
    ADD CONSTRAINT tmpl_flag_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tmpl_flag tmpl_flag_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tmpl_flag
    ADD CONSTRAINT tmpl_flag_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES public.profiles(id) ON DELETE SET NULL;


--
-- Name: tool_area_access tool_area_access_tool_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tool_area_access
    ADD CONSTRAINT tool_area_access_tool_id_fkey FOREIGN KEY (tool_id) REFERENCES public.tools(id) ON DELETE CASCADE;


--
-- Name: user_page_access user_page_access_page_permission_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_page_access
    ADD CONSTRAINT user_page_access_page_permission_id_fkey FOREIGN KEY (page_permission_id) REFERENCES public.page_permissions(id) ON DELETE CASCADE;


--
-- Name: user_roles user_roles_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_roles
    ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: produto_servico Admins can manage produto_servico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage produto_servico" ON public.produto_servico TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_page_access Admins can manage user page access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage user page access" ON public.user_page_access TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles Admins can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_page_access Admins can view all user page access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all user page access" ON public.user_page_access FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: codigo_receita Admins manage codigo_receita; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage codigo_receita" ON public.codigo_receita TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: grupo_tributo Admins manage grupo_tributo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage grupo_tributo" ON public.grupo_tributo TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_page_access Admins podem gerenciar acessos de usuário; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem gerenciar acessos de usuário" ON public.user_page_access TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: page_permissions Admins podem gerenciar permissões de página; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem gerenciar permissões de página" ON public.page_permissions USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: access_change_log Admins podem ver histórico de alterações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins podem ver histórico de alterações" ON public.access_change_log FOR SELECT USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente_clusters Clients can read their cliente_clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can read their cliente_clusters" ON public.cliente_clusters FOR SELECT TO authenticated USING ((cliente_id IN ( SELECT representante.id_cliente
   FROM public.representante
  WHERE ((representante.user_id = auth.uid()) AND (representante.excluido = false)))));


--
-- Name: representante Clients can read their own representante; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can read their own representante" ON public.representante FOR SELECT TO authenticated USING (((excluido = false) AND (auth.uid() = user_id)));


--
-- Name: client_visible_projects Clients can view their assigned projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view their assigned projects" ON public.client_visible_projects FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: client_documents Clients can view their documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Clients can view their documents" ON public.client_documents FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: correcoes_icms Equipe pode atualizar correcoes ICMS; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Equipe pode atualizar correcoes ICMS" ON public.correcoes_icms FOR UPDATE USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role))) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: correcoes_icms Equipe pode inserir correcoes ICMS; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Equipe pode inserir correcoes ICMS" ON public.correcoes_icms FOR INSERT WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (created_by = auth.uid())));


--
-- Name: job_roles Lider e admin podem gerenciar job_roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lider e admin podem gerenciar job_roles" ON public.job_roles TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: correcoes_icms Lider+ pode deletar correcoes ICMS; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Lider+ pode deletar correcoes ICMS" ON public.correcoes_icms FOR DELETE USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)));


--
-- Name: comentarios_avaliacao Membro ve comentarios destinados a ele; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Membro ve comentarios destinados a ele" ON public.comentarios_avaliacao FOR SELECT TO authenticated USING ((((auth.uid() = destinatario_id) AND (visivel_para_membro = true)) OR (auth.uid() = autor_id) OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)));


--
-- Name: roi_snapshots Team members can delete roi_snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can delete roi_snapshots" ON public.roi_snapshots FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'team_member'::public.app_role, 'lider'::public.app_role, 'sublider'::public.app_role]))))));


--
-- Name: process_scenarios Team members can delete scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can delete scenarios" ON public.process_scenarios FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'team_member'::public.app_role, 'lider'::public.app_role, 'sublider'::public.app_role]))))));


--
-- Name: roi_snapshots Team members can insert roi_snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can insert roi_snapshots" ON public.roi_snapshots FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'team_member'::public.app_role, 'lider'::public.app_role, 'sublider'::public.app_role]))))));


--
-- Name: process_scenarios Team members can insert scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can insert scenarios" ON public.process_scenarios FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'team_member'::public.app_role, 'lider'::public.app_role, 'sublider'::public.app_role]))))));


--
-- Name: improvement_team_members Team members can manage improvement members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can manage improvement members" ON public.improvement_team_members USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'team_member'::public.app_role]))))));


--
-- Name: estrutura_areas Team members can read areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can read areas" ON public.estrutura_areas FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: estrutura_clusters Team members can read clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can read clusters" ON public.estrutura_clusters FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: contribuinte_bal_config Team members can read contribuinte_bal_config; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can read contribuinte_bal_config" ON public.contribuinte_bal_config FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: estrutura_equipe_membros Team members can read equipe membros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can read equipe membros" ON public.estrutura_equipe_membros FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: estrutura_equipes Team members can read equipes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can read equipes" ON public.estrutura_equipes FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: gargalo_etapas Team members can read gargalo_etapas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can read gargalo_etapas" ON public.gargalo_etapas FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'team_member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: gargalo_melhorias Team members can read gargalo_melhorias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can read gargalo_melhorias" ON public.gargalo_melhorias FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'team_member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: process_scenarios Team members can update unlocked scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can update unlocked scenarios" ON public.process_scenarios FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'team_member'::public.app_role, 'lider'::public.app_role, 'sublider'::public.app_role]))))));


--
-- Name: user_roles Team members can view all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: catalog_clients Team members can view catalog_clients; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view catalog_clients" ON public.catalog_clients FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: improvement_team_members Team members can view improvement members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view improvement members" ON public.improvement_team_members FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: job_roles Team members can view job roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view job roles" ON public.job_roles FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: project_documents Team members can view project documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view project documents" ON public.project_documents FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: project_processes Team members can view project processes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view project processes" ON public.project_processes FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: roi_snapshots Team members can view roi_snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view roi_snapshots" ON public.roi_snapshots FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'team_member'::public.app_role, 'lider'::public.app_role, 'sublider'::public.app_role]))))));


--
-- Name: improvement_savings_details Team members can view savings details; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view savings details" ON public.improvement_savings_details FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: process_scenarios Team members can view scenarios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view scenarios" ON public.process_scenarios FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_roles
  WHERE ((user_roles.user_id = auth.uid()) AND (user_roles.role = ANY (ARRAY['admin'::public.app_role, 'team_member'::public.app_role, 'lider'::public.app_role, 'sublider'::public.app_role]))))));


--
-- Name: tool_area_access Team members can view tool access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view tool access" ON public.tool_area_access FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tools Team members can view tools; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can view tools" ON public.tools FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: gargalo_etapas Team members can write gargalo_etapas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can write gargalo_etapas" ON public.gargalo_etapas TO authenticated USING ((public.has_role(auth.uid(), 'team_member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'team_member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: gargalo_melhorias Team members can write gargalo_melhorias; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Team members can write gargalo_melhorias" ON public.gargalo_melhorias TO authenticated USING ((public.has_role(auth.uid(), 'team_member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'team_member'::public.app_role) OR public.has_role(auth.uid(), 'admin'::public.app_role)));


--
-- Name: export_profiles Users can view own export profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own export profiles" ON public.export_profiles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_page_access Users can view their own page access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own page access" ON public.user_page_access FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_roles Users can view their own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: performance_preferencias Usuario acessa proprias prefs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuario acessa proprias prefs" ON public.performance_preferencias USING ((auth.uid() = usuario_id));


--
-- Name: user_page_access Usuários podem ver próprias permissões; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver próprias permissões" ON public.user_page_access FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: access_change_log; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.access_change_log ENABLE ROW LEVEL SECURITY;

--
-- Name: administracao admin can delete administracao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete administracao" ON public.administracao FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: capital_integralizacao admin can delete capital_integralizacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete capital_integralizacao" ON public.capital_integralizacao FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: dashboards admin can delete dashboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete dashboards" ON public.dashboards FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: documento_arquivo admin can delete documento_arquivo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete documento_arquivo" ON public.documento_arquivo FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) AND ((cliente_id IS NULL) OR public.cliente_visivel_para(cliente_id))));


--
-- Name: documento_gerado admin can delete documento_gerado; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete documento_gerado" ON public.documento_gerado FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: documento_override admin can delete documento_override; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete documento_override" ON public.documento_override FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: projeto_flag_valor admin can delete projeto_flag_valor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete projeto_flag_valor" ON public.projeto_flag_valor FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: quadro_societario admin can delete quadro_societario; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete quadro_societario" ON public.quadro_societario FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tmpl_bloco admin can delete tmpl_bloco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete tmpl_bloco" ON public.tmpl_bloco FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tmpl_bloco_flag admin can delete tmpl_bloco_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete tmpl_bloco_flag" ON public.tmpl_bloco_flag FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tmpl_bloco_versao admin can delete tmpl_bloco_versao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete tmpl_bloco_versao" ON public.tmpl_bloco_versao FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tmpl_documento admin can delete tmpl_documento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete tmpl_documento" ON public.tmpl_documento FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tmpl_documento_bloco admin can delete tmpl_documento_bloco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete tmpl_documento_bloco" ON public.tmpl_documento_bloco FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: tmpl_flag admin can delete tmpl_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can delete tmpl_flag" ON public.tmpl_flag FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: documento_arquivo admin can restore documento_arquivo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can restore documento_arquivo" ON public.documento_arquivo FOR UPDATE TO authenticated USING (((excluido = true) AND public.has_role(auth.uid(), 'admin'::public.app_role) AND ((cliente_id IS NULL) OR public.cliente_visivel_para(cliente_id)))) WITH CHECK (((excluido = false) AND public.has_role(auth.uid(), 'admin'::public.app_role) AND ((cliente_id IS NULL) OR public.cliente_visivel_para(cliente_id))));


--
-- Name: documento_arquivo admin can view deleted documento_arquivo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "admin can view deleted documento_arquivo" ON public.documento_arquivo FOR SELECT TO authenticated USING (((excluido = true) AND public.has_role(auth.uid(), 'admin'::public.app_role) AND ((cliente_id IS NULL) OR public.cliente_visivel_para(cliente_id))));


--
-- Name: area_servicos admin_all_area_servicos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_all_area_servicos ON public.area_servicos TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: servicos_prestados admin_all_servicos_prestados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_all_servicos_prestados ON public.servicos_prestados TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente_clusters admin_full_access_cliente_clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_access_cliente_clusters ON public.cliente_clusters USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente_clusters admin_full_cliente_clusters_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_cliente_clusters_delete ON public.cliente_clusters FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente_clusters admin_full_cliente_clusters_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_cliente_clusters_insert ON public.cliente_clusters FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente_clusters admin_full_cliente_clusters_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_cliente_clusters_select ON public.cliente_clusters FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente_clusters admin_full_cliente_clusters_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_cliente_clusters_update ON public.cliente_clusters FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente admin_full_cliente_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_cliente_delete ON public.cliente FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente admin_full_cliente_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_cliente_insert ON public.cliente FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente admin_full_cliente_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_cliente_select ON public.cliente FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente admin_full_cliente_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_cliente_update ON public.cliente FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contribuinte admin_full_contribuinte_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_contribuinte_delete ON public.contribuinte FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contribuinte admin_full_contribuinte_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_contribuinte_insert ON public.contribuinte FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contribuinte admin_full_contribuinte_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_contribuinte_select ON public.contribuinte FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: contribuinte admin_full_contribuinte_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_contribuinte_update ON public.contribuinte FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: distribuicao_receita admin_full_distribuicao_receita_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_distribuicao_receita_delete ON public.distribuicao_receita FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: distribuicao_receita admin_full_distribuicao_receita_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_distribuicao_receita_insert ON public.distribuicao_receita FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: distribuicao_receita admin_full_distribuicao_receita_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_distribuicao_receita_select ON public.distribuicao_receita FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: distribuicao_receita admin_full_distribuicao_receita_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_distribuicao_receita_update ON public.distribuicao_receita FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inscricao_contribuinte admin_full_inscricao_contribuinte_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_inscricao_contribuinte_delete ON public.inscricao_contribuinte FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inscricao_contribuinte admin_full_inscricao_contribuinte_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_inscricao_contribuinte_insert ON public.inscricao_contribuinte FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inscricao_contribuinte admin_full_inscricao_contribuinte_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_inscricao_contribuinte_select ON public.inscricao_contribuinte FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: inscricao_contribuinte admin_full_inscricao_contribuinte_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_inscricao_contribuinte_update ON public.inscricao_contribuinte FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ordem_servico admin_full_ordem_servico_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_ordem_servico_delete ON public.ordem_servico FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ordem_servico admin_full_ordem_servico_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_ordem_servico_insert ON public.ordem_servico FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ordem_servico admin_full_ordem_servico_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_ordem_servico_select ON public.ordem_servico FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ordem_servico admin_full_ordem_servico_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_ordem_servico_update ON public.ordem_servico FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: os_produtos_contratados admin_full_os_produtos_contratados_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_os_produtos_contratados_delete ON public.os_produtos_contratados FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: os_produtos_contratados admin_full_os_produtos_contratados_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_os_produtos_contratados_insert ON public.os_produtos_contratados FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: os_produtos_contratados admin_full_os_produtos_contratados_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_os_produtos_contratados_select ON public.os_produtos_contratados FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: os_produtos_contratados admin_full_os_produtos_contratados_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_os_produtos_contratados_update ON public.os_produtos_contratados FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: representante admin_full_representante_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_representante_delete ON public.representante FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: representante admin_full_representante_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_representante_insert ON public.representante FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: representante admin_full_representante_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_representante_select ON public.representante FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: representante admin_full_representante_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_full_representante_update ON public.representante FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: cliente_clusters admin_manage_cliente_clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_manage_cliente_clusters ON public.cliente_clusters TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: administracao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.administracao ENABLE ROW LEVEL SECURITY;

--
-- Name: analises_semestrais; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.analises_semestrais ENABLE ROW LEVEL SECURITY;

--
-- Name: area_servicos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.area_servicos ENABLE ROW LEVEL SECURITY;

--
-- Name: atualizacoes_meta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.atualizacoes_meta ENABLE ROW LEVEL SECURITY;

--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: bem; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bem ENABLE ROW LEVEL SECURITY;

--
-- Name: bkp_20260807_ticket_messages_dup bkp_20260807_dup_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY bkp_20260807_dup_select_admin ON public.bkp_20260807_ticket_messages_dup FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: bkp_20260807_ticket_messages_dup; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.bkp_20260807_ticket_messages_dup ENABLE ROW LEVEL SECURITY;

--
-- Name: capital_integralizacao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.capital_integralizacao ENABLE ROW LEVEL SECURITY;

--
-- Name: cartorio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cartorio ENABLE ROW LEVEL SECURITY;

--
-- Name: catalog_clients; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.catalog_clients ENABLE ROW LEVEL SECURITY;

--
-- Name: centros_custo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;

--
-- Name: centros_custo centros_custo_select_internal; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY centros_custo_select_internal ON public.centros_custo FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: checklist_cliente_item; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.checklist_cliente_item ENABLE ROW LEVEL SECURITY;

--
-- Name: ciclos_avaliacao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ciclos_avaliacao ENABLE ROW LEVEL SECURITY;

--
-- Name: client_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: client_visible_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.client_visible_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: cliente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cliente ENABLE ROW LEVEL SECURITY;

--
-- Name: documento_arquivo cliente can insert own documento_arquivo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cliente can insert own documento_arquivo" ON public.documento_arquivo FOR INSERT TO authenticated WITH CHECK (((fonte = 'cliente'::public.osg_doc_fonte) AND (cliente_id = public.resolve_user_cliente_id(auth.uid()))));


--
-- Name: documento_arquivo cliente can view own documento_arquivo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cliente can view own documento_arquivo" ON public.documento_arquivo FOR SELECT TO authenticated USING (((fonte = 'cliente'::public.osg_doc_fonte) AND (excluido = false) AND (cliente_id = public.resolve_user_cliente_id(auth.uid()))));


--
-- Name: solicitacao cliente can view own solicitacao enviada; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cliente can view own solicitacao enviada" ON public.solicitacao FOR SELECT TO authenticated USING (((cliente_id = public.resolve_user_cliente_id(auth.uid())) AND (status = ANY (ARRAY['enviada'::public.osg_solicitacao_status, 'em_checklist'::public.osg_solicitacao_status]))));


--
-- Name: solicitacao_item cliente can view own solicitacao_item enviada; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cliente can view own solicitacao_item enviada" ON public.solicitacao_item FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.solicitacao s
  WHERE ((s.id = solicitacao_item.solicitacao_id) AND (s.cliente_id = public.resolve_user_cliente_id(auth.uid())) AND (s.status = ANY (ARRAY['enviada'::public.osg_solicitacao_status, 'em_checklist'::public.osg_solicitacao_status]))))));


--
-- Name: cliente_clusters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.cliente_clusters ENABLE ROW LEVEL SECURITY;

--
-- Name: cliente cliente_select_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cliente_select_scoped ON public.cliente FOR SELECT TO authenticated USING (((excluido = false) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(id)) OR (public.resolve_user_cliente_id(auth.uid()) = id))));


--
-- Name: checklist_cliente_item cluster can view checklist_cliente_item; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster can view checklist_cliente_item" ON public.checklist_cliente_item FOR SELECT TO authenticated USING (public.cliente_visivel_para(cliente_id));


--
-- Name: exploracao_rural cluster can view exploracao_rural; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster can view exploracao_rural" ON public.exploracao_rural FOR SELECT TO authenticated USING (public.cliente_visivel_para(cliente_id));


--
-- Name: solicitacao cluster can view solicitacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster can view solicitacao" ON public.solicitacao FOR SELECT TO authenticated USING (public.cliente_visivel_para(cliente_id));


--
-- Name: solicitacao_item_nao_aplicavel cluster can view solicitacao item nao aplicavel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster can view solicitacao item nao aplicavel" ON public.solicitacao_item_nao_aplicavel FOR SELECT TO authenticated USING (public.cliente_visivel_para(cliente_id));


--
-- Name: solicitacao_item cluster can view solicitacao_item; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster can view solicitacao_item" ON public.solicitacao_item FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.solicitacao s
  WHERE ((s.id = solicitacao_item.solicitacao_id) AND public.cliente_visivel_para(s.cliente_id)))));


--
-- Name: checklist_cliente_item cluster team_member can delete checklist_cliente_item; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster team_member can delete checklist_cliente_item" ON public.checklist_cliente_item FOR DELETE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(cliente_id)));


--
-- Name: solicitacao_item_nao_aplicavel cluster team_member can delete solicitacao item nao aplicavel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster team_member can delete solicitacao item nao aplicavel" ON public.solicitacao_item_nao_aplicavel FOR DELETE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(cliente_id)));


--
-- Name: checklist_cliente_item cluster team_member can insert checklist_cliente_item; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster team_member can insert checklist_cliente_item" ON public.checklist_cliente_item FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(cliente_id)));


--
-- Name: solicitacao_item_nao_aplicavel cluster team_member can insert solicitacao item nao aplicavel; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster team_member can insert solicitacao item nao aplicavel" ON public.solicitacao_item_nao_aplicavel FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(cliente_id) AND (EXISTS ( SELECT 1
   FROM (public.solicitacao_item si
     JOIN public.solicitacao s ON ((s.id = si.solicitacao_id)))
  WHERE ((si.id = solicitacao_item_nao_aplicavel.solicitacao_item_id) AND (s.cliente_id = s.cliente_id))))));


--
-- Name: checklist_cliente_item cluster team_member can update checklist_cliente_item; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster team_member can update checklist_cliente_item" ON public.checklist_cliente_item FOR UPDATE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(cliente_id))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(cliente_id)));


--
-- Name: exploracao_rural cluster team_member delete exploracao_rural; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster team_member delete exploracao_rural" ON public.exploracao_rural FOR DELETE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(cliente_id)));


--
-- Name: exploracao_rural cluster team_member insert exploracao_rural; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster team_member insert exploracao_rural" ON public.exploracao_rural FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(cliente_id)));


--
-- Name: exploracao_rural cluster team_member update exploracao_rural; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "cluster team_member update exploracao_rural" ON public.exploracao_rural FOR UPDATE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(cliente_id))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.cliente_visivel_para(cliente_id)));


--
-- Name: codigo_receita; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.codigo_receita ENABLE ROW LEVEL SECURITY;

--
-- Name: comentarios_avaliacao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.comentarios_avaliacao ENABLE ROW LEVEL SECURITY;

--
-- Name: contatos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contatos ENABLE ROW LEVEL SECURITY;

--
-- Name: contribuinte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contribuinte ENABLE ROW LEVEL SECURITY;

--
-- Name: contribuinte_bal_config; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.contribuinte_bal_config ENABLE ROW LEVEL SECURITY;

--
-- Name: contribuinte contribuinte_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY contribuinte_select ON public.contribuinte FOR SELECT TO authenticated USING (((excluido = false) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.cliente_visivel_para(cliente_id))));


--
-- Name: correcoes_icms; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.correcoes_icms ENABLE ROW LEVEL SECURITY;

--
-- Name: correcoes_icms correcoes_icms_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY correcoes_icms_select ON public.correcoes_icms FOR SELECT USING (((excluido = false) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR public.can_view_contribuinte(auth.uid(), contribuinte_id))));


--
-- Name: daily_standups; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_standups ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_standups daily_standups_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY daily_standups_select ON public.daily_standups FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_membro_digital(auth.uid()) OR (user_id = auth.uid()) OR ((sprint_id IS NOT NULL) AND public.sprint_visivel(sprint_id)) OR ((project_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = daily_standups.project_id) AND (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))))));


--
-- Name: dashboard_cliente_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dashboard_cliente_access ENABLE ROW LEVEL SECURITY;

--
-- Name: dashboard_cluster_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dashboard_cluster_access ENABLE ROW LEVEL SECURITY;

--
-- Name: dashboards; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dashboards ENABLE ROW LEVEL SECURITY;

--
-- Name: dcomp; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.dcomp ENABLE ROW LEVEL SECURITY;

--
-- Name: dcomp dcomp_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dcomp_select ON public.dcomp FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.per p
  WHERE (((p.nr_per)::text = (dcomp.nr_per_orig)::text) AND public.can_view_contribuinte(auth.uid(), p.id_contribuinte))))));


--
-- Name: deliverable_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.deliverable_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: deliverable_attachments deliverable_attachments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deliverable_attachments_select ON public.deliverable_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.sprint_deliverables d
  WHERE ((d.id = deliverable_attachments.deliverable_id) AND public.sprint_visivel(d.sprint_id)))));


--
-- Name: demand_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.demand_items ENABLE ROW LEVEL SECURITY;

--
-- Name: demand_items demand_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY demand_items_select ON public.demand_items FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_membro_digital(auth.uid()) OR (assigned_to = auth.uid())));


--
-- Name: notificacao destinatario can update own notificacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "destinatario can update own notificacao" ON public.notificacao FOR UPDATE TO authenticated USING ((destinatario_id = ( SELECT auth.uid() AS uid))) WITH CHECK ((destinatario_id = ( SELECT auth.uid() AS uid)));


--
-- Name: notificacao destinatario can view own notificacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "destinatario can view own notificacao" ON public.notificacao FOR SELECT TO authenticated USING ((destinatario_id = ( SELECT auth.uid() AS uid)));


--
-- Name: documento_horas_historico dhh_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dhh_delete ON public.documento_horas_historico FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: documento_horas_historico dhh_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dhh_insert ON public.documento_horas_historico FOR INSERT TO authenticated WITH CHECK (((alterado_por = auth.uid()) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


--
-- Name: documento_horas_historico dhh_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dhh_select ON public.documento_horas_historico FOR SELECT TO authenticated USING (((alterado_por = auth.uid()) OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)));


--
-- Name: documento_horas_historico dhh_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dhh_update ON public.documento_horas_historico FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: difal_decisao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.difal_decisao ENABLE ROW LEVEL SECURITY;

--
-- Name: difal_decisao difal_decisao_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY difal_decisao_select ON public.difal_decisao FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.difal_sessao s
  WHERE ((s.id = difal_decisao.sessao_id) AND public.cliente_visivel_para(s.cliente_id))))));


--
-- Name: difal_sessao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.difal_sessao ENABLE ROW LEVEL SECURITY;

--
-- Name: difal_sessao difal_sessao_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY difal_sessao_select ON public.difal_sessao FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.cliente_visivel_para(cliente_id)));


--
-- Name: distribuicao_dcomp; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.distribuicao_dcomp ENABLE ROW LEVEL SECURITY;

--
-- Name: distribuicao_dcomp distribuicao_dcomp_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY distribuicao_dcomp_select ON public.distribuicao_dcomp FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM (public.dcomp d
     JOIN public.per p ON (((p.nr_per)::text = (d.nr_per_orig)::text)))
  WHERE (((d.nr_documento)::text = (distribuicao_dcomp.nr_documento)::text) AND public.can_view_contribuinte(auth.uid(), p.id_contribuinte))))));


--
-- Name: distribuicao_receita; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.distribuicao_receita ENABLE ROW LEVEL SECURITY;

--
-- Name: distribuicao_receita distribuicao_receita_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY distribuicao_receita_select ON public.distribuicao_receita FOR SELECT TO authenticated USING (((excluido = false) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.ordem_servico os
  WHERE ((os.id = distribuicao_receita.id_ordem_servico) AND public.cliente_visivel_para(os.id_cliente)))))));


--
-- Name: documento_arquivo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documento_arquivo ENABLE ROW LEVEL SECURITY;

--
-- Name: documento_gerado; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documento_gerado ENABLE ROW LEVEL SECURITY;

--
-- Name: documento_horas_historico; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documento_horas_historico ENABLE ROW LEVEL SECURITY;

--
-- Name: documento_notificacao_visto; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documento_notificacao_visto ENABLE ROW LEVEL SECURITY;

--
-- Name: documento_override; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documento_override ENABLE ROW LEVEL SECURITY;

--
-- Name: documento_tipo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documento_tipo ENABLE ROW LEVEL SECURITY;

--
-- Name: documentos_processo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documentos_processo ENABLE ROW LEVEL SECURITY;

--
-- Name: documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

--
-- Name: efd_correcoes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.efd_correcoes ENABLE ROW LEVEL SECURITY;

--
-- Name: efd_correcoes efd_correcoes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY efd_correcoes_select ON public.efd_correcoes FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.contribuinte c
  WHERE (((c.id)::text = efd_correcoes.contribuinte_id) AND public.cliente_visivel_para(c.cliente_id))))));


--
-- Name: notificacao_envio equipe e destinatario can view notificacao_envio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "equipe e destinatario can view notificacao_envio" ON public.notificacao_envio FOR SELECT TO authenticated USING (((destinatario_id = ( SELECT auth.uid() AS uid)) OR public.has_role_or_higher(( SELECT auth.uid() AS uid), 'team_member'::public.app_role)));


--
-- Name: estrutura_areas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estrutura_areas ENABLE ROW LEVEL SECURITY;

--
-- Name: estrutura_clusters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estrutura_clusters ENABLE ROW LEVEL SECURITY;

--
-- Name: estrutura_equipe_membros; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estrutura_equipe_membros ENABLE ROW LEVEL SECURITY;

--
-- Name: estrutura_equipes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.estrutura_equipes ENABLE ROW LEVEL SECURITY;

--
-- Name: etapa_documentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.etapa_documentos ENABLE ROW LEVEL SECURITY;

--
-- Name: etapa_responsaveis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.etapa_responsaveis ENABLE ROW LEVEL SECURITY;

--
-- Name: etapa_sistemas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.etapa_sistemas ENABLE ROW LEVEL SECURITY;

--
-- Name: exploracao_rural; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exploracao_rural ENABLE ROW LEVEL SECURITY;

--
-- Name: export_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.export_profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: feedbacks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

--
-- Name: gargalo_etapas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gargalo_etapas ENABLE ROW LEVEL SECURITY;

--
-- Name: gargalo_melhorias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gargalo_melhorias ENABLE ROW LEVEL SECURITY;

--
-- Name: gargalo_processos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gargalo_processos ENABLE ROW LEVEL SECURITY;

--
-- Name: gargalo_responsaveis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gargalo_responsaveis ENABLE ROW LEVEL SECURITY;

--
-- Name: gargalos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.gargalos ENABLE ROW LEVEL SECURITY;

--
-- Name: grupo_tributo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.grupo_tributo ENABLE ROW LEVEL SECURITY;

--
-- Name: impedimento; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.impedimento ENABLE ROW LEVEL SECURITY;

--
-- Name: improvement_savings_details; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.improvement_savings_details ENABLE ROW LEVEL SECURITY;

--
-- Name: improvement_team_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.improvement_team_members ENABLE ROW LEVEL SECURITY;

--
-- Name: inscricao_contribuinte; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.inscricao_contribuinte ENABLE ROW LEVEL SECURITY;

--
-- Name: inscricao_contribuinte inscricao_contribuinte_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY inscricao_contribuinte_select ON public.inscricao_contribuinte FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.can_view_contribuinte(auth.uid(), contribuinte_id)));


--
-- Name: itens_acao_1a1; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.itens_acao_1a1 ENABLE ROW LEVEL SECURITY;

--
-- Name: job_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.job_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: kpis_meta; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.kpis_meta ENABLE ROW LEVEL SECURITY;

--
-- Name: bem lider+ can delete bem; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ can delete bem" ON public.bem FOR DELETE USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: cartorio lider+ can delete cartorio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ can delete cartorio" ON public.cartorio FOR DELETE USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: impedimento lider+ can delete impedimento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ can delete impedimento" ON public.impedimento FOR DELETE USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: matricula lider+ can delete matricula; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ can delete matricula" ON public.matricula FOR DELETE USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: parentesco lider+ can delete parentesco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ can delete parentesco" ON public.parentesco FOR DELETE USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: pessoa lider+ can delete pessoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ can delete pessoa" ON public.pessoa FOR DELETE USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: titularidade lider+ can delete titularidade; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ can delete titularidade" ON public.titularidade FOR DELETE USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: dashboards lider+ can insert dashboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ can insert dashboards" ON public.dashboards FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: dashboards lider+ can update dashboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ can update dashboards" ON public.dashboards FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: dashboards lider+ can view dashboards; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ can view dashboards" ON public.dashboards FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: dashboard_cliente_access lider+ delete dashboard_cliente_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ delete dashboard_cliente_access" ON public.dashboard_cliente_access FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: dashboard_cluster_access lider+ delete dashboard_cluster_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ delete dashboard_cluster_access" ON public.dashboard_cluster_access FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: dashboard_cliente_access lider+ insert dashboard_cliente_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ insert dashboard_cliente_access" ON public.dashboard_cliente_access FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: dashboard_cluster_access lider+ insert dashboard_cluster_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ insert dashboard_cluster_access" ON public.dashboard_cluster_access FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: dashboard_cliente_access lider+ view dashboard_cliente_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ view dashboard_cliente_access" ON public.dashboard_cliente_access FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: dashboard_cluster_access lider+ view dashboard_cluster_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "lider+ view dashboard_cluster_access" ON public.dashboard_cluster_access FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: analises_semestrais lider_manage_analises_semestrais; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_analises_semestrais ON public.analises_semestrais TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: estrutura_areas lider_manage_areas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_areas ON public.estrutura_areas TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: atualizacoes_meta lider_manage_atualizacoes_meta; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_atualizacoes_meta ON public.atualizacoes_meta TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: centros_custo lider_manage_centros_custo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_centros_custo ON public.centros_custo TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: ciclos_avaliacao lider_manage_ciclos_avaliacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_ciclos_avaliacao ON public.ciclos_avaliacao TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: estrutura_clusters lider_manage_clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_clusters ON public.estrutura_clusters TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: estrutura_equipe_membros lider_manage_equipe_membros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_equipe_membros ON public.estrutura_equipe_membros TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: estrutura_equipes lider_manage_equipes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_equipes ON public.estrutura_equipes TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: feedbacks lider_manage_feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_feedbacks ON public.feedbacks TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: itens_acao_1a1 lider_manage_itens_acao_1a1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_itens_acao_1a1 ON public.itens_acao_1a1 TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: metas lider_manage_metas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_metas ON public.metas TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: reunioes_1a1 lider_manage_reunioes_1a1; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lider_manage_reunioes_1a1 ON public.reunioes_1a1 TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: kpis_meta manage_kpis_meta_scoped; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY manage_kpis_meta_scoped ON public.kpis_meta TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.metas m
  WHERE ((m.id = kpis_meta.meta_id) AND ((m.responsavel_id = auth.uid()) OR (m.created_by = auth.uid()))))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.metas m
  WHERE ((m.id = kpis_meta.meta_id) AND ((m.responsavel_id = auth.uid()) OR (m.created_by = auth.uid())))))));


--
-- Name: matricula; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.matricula ENABLE ROW LEVEL SECURITY;

--
-- Name: melhoria_acoes_td; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.melhoria_acoes_td ENABLE ROW LEVEL SECURITY;

--
-- Name: melhoria_processos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.melhoria_processos ENABLE ROW LEVEL SECURITY;

--
-- Name: melhoria_responsaveis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.melhoria_responsaveis ENABLE ROW LEVEL SECURITY;

--
-- Name: melhoria_sistemas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.melhoria_sistemas ENABLE ROW LEVEL SECURITY;

--
-- Name: metas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

--
-- Name: notificacao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notificacao ENABLE ROW LEVEL SECURITY;

--
-- Name: notificacao_envio; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.notificacao_envio ENABLE ROW LEVEL SECURITY;

--
-- Name: novidades; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.novidades ENABLE ROW LEVEL SECURITY;

--
-- Name: novidades novidades_select_gestao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY novidades_select_gestao ON public.novidades FOR SELECT TO authenticated USING (public.pode_gerenciar_novidades(auth.uid()));


--
-- Name: novidades novidades_select_publico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY novidades_select_publico ON public.novidades FOR SELECT TO authenticated, anon USING ((ativo = true));


--
-- Name: ordem_servico; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ordem_servico ENABLE ROW LEVEL SECURITY;

--
-- Name: ordem_servico ordem_servico_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ordem_servico_select ON public.ordem_servico FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR ((excluido = false) AND (public.cliente_visivel_para(id_cliente) OR ((cluster_id IS NOT NULL) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))))));


--
-- Name: org_comment_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_comment_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: org_comment_attachments org_comment_attachments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_comment_attachments_delete ON public.org_comment_attachments FOR DELETE TO authenticated USING (((uploaded_by = auth.uid()) OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)));


--
-- Name: org_comment_attachments org_comment_attachments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_comment_attachments_insert ON public.org_comment_attachments FOR INSERT TO authenticated WITH CHECK (((uploaded_by = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.org_comments c
  WHERE ((c.id = org_comment_attachments.comment_id) AND (c.excluido = false) AND (c.author_id = auth.uid()))))));


--
-- Name: org_comment_attachments org_comment_attachments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_comment_attachments_select ON public.org_comment_attachments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.org_comments c
  WHERE ((c.id = org_comment_attachments.comment_id) AND (c.excluido = false) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (c.project_id = ANY (public.visible_org_project_ids(auth.uid()))) OR ((c.entity_type = 'org_task'::public.org_comment_entity) AND (c.entity_id = ANY (public.own_org_task_ids(auth.uid())))))))));


--
-- Name: org_comment_mentions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_comment_mentions ENABLE ROW LEVEL SECURITY;

--
-- Name: org_comment_mentions org_comment_mentions_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_comment_mentions_insert ON public.org_comment_mentions FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.org_comments c
  WHERE ((c.id = org_comment_mentions.comment_id) AND (c.author_id = auth.uid())))));


--
-- Name: org_comment_mentions org_comment_mentions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_comment_mentions_select ON public.org_comment_mentions FOR SELECT TO authenticated USING (((mentioned_user_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.org_comments c
  WHERE ((c.id = org_comment_mentions.comment_id) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (c.author_id = auth.uid()) OR (c.project_id = ANY (public.visible_org_project_ids(auth.uid()))) OR ((c.entity_type = 'org_task'::public.org_comment_entity) AND (c.entity_id = ANY (public.own_org_task_ids(auth.uid()))))))))));


--
-- Name: org_comment_mentions org_comment_mentions_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_comment_mentions_update ON public.org_comment_mentions FOR UPDATE TO authenticated USING ((mentioned_user_id = auth.uid())) WITH CHECK ((mentioned_user_id = auth.uid()));


--
-- Name: org_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: org_comments org_comments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_comments_insert ON public.org_comments FOR INSERT TO authenticated WITH CHECK (((author_id = auth.uid()) AND (excluido = false) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (project_id = ANY (public.visible_org_project_ids(auth.uid()))) OR ((entity_type = 'org_task'::public.org_comment_entity) AND (entity_id = ANY (public.own_org_task_ids(auth.uid())))))));


--
-- Name: org_comments org_comments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_comments_select ON public.org_comments FOR SELECT TO authenticated USING ((( SELECT public.has_role(( SELECT auth.uid() AS uid), 'admin'::public.app_role) AS has_role) OR (project_id = ANY (public.visible_org_project_ids(( SELECT auth.uid() AS uid)))) OR ((entity_type = 'org_task'::public.org_comment_entity) AND (entity_id = ANY (public.own_org_task_ids(( SELECT auth.uid() AS uid)))))));


--
-- Name: org_comments org_comments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_comments_update ON public.org_comments FOR UPDATE TO authenticated USING (((author_id = auth.uid()) OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role))) WITH CHECK (((author_id = auth.uid()) OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)));


--
-- Name: org_project_members; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_project_members ENABLE ROW LEVEL SECURITY;

--
-- Name: org_projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_projects ENABLE ROW LEVEL SECURITY;

--
-- Name: org_task_comments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_task_comments ENABLE ROW LEVEL SECURITY;

--
-- Name: org_task_comments org_task_comments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY org_task_comments_select ON public.org_task_comments FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.org_task_visivel(task_id)));


--
-- Name: org_tasks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_tasks ENABLE ROW LEVEL SECURITY;

--
-- Name: os_produtos_contratados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.os_produtos_contratados ENABLE ROW LEVEL SECURITY;

--
-- Name: os_produtos_contratados os_produtos_contratados_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY os_produtos_contratados_select ON public.os_produtos_contratados FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.ordem_servico os
  WHERE ((os.id = os_produtos_contratados.ordem_servico_id) AND public.cliente_visivel_para(os.id_cliente))))));


--
-- Name: bem osg_cluster_select_bem; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY osg_cluster_select_bem ON public.bem FOR SELECT TO authenticated USING (public.cliente_visivel_para(cliente_id));


--
-- Name: capital_integralizacao osg_cluster_select_capital_integralizacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY osg_cluster_select_capital_integralizacao ON public.capital_integralizacao FOR SELECT TO authenticated USING (public.cliente_visivel_para(cliente_id));


--
-- Name: matricula osg_cluster_select_matricula; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY osg_cluster_select_matricula ON public.matricula FOR SELECT TO authenticated USING (public.cliente_visivel_para(COALESCE(cliente_id, public.cliente_id_de_bem(bem_id))));


--
-- Name: parentesco osg_cluster_select_parentesco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY osg_cluster_select_parentesco ON public.parentesco FOR SELECT TO authenticated USING (public.cliente_visivel_para(public.cliente_id_de_pessoa(pessoa_id)));


--
-- Name: pessoa osg_cluster_select_pessoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY osg_cluster_select_pessoa ON public.pessoa FOR SELECT TO authenticated USING (public.cliente_visivel_para(cliente_id));


--
-- Name: quadro_societario osg_cluster_select_quadro_societario; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY osg_cluster_select_quadro_societario ON public.quadro_societario FOR SELECT TO authenticated USING (public.cliente_visivel_para(public.cliente_id_de_pessoa(empresa_pessoa_id)));


--
-- Name: titularidade osg_cluster_select_titularidade; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY osg_cluster_select_titularidade ON public.titularidade FOR SELECT TO authenticated USING (public.cliente_visivel_para(COALESCE(public.cliente_id_de_bem(bem_id), public.cliente_id_de_matricula(matricula_id))));


--
-- Name: documento_notificacao_visto own notificacao_visto; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "own notificacao_visto" ON public.documento_notificacao_visto TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: page_permissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.page_permissions ENABLE ROW LEVEL SECURITY;

--
-- Name: parentesco; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parentesco ENABLE ROW LEVEL SECURITY;

--
-- Name: per; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.per ENABLE ROW LEVEL SECURITY;

--
-- Name: per per_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY per_select ON public.per FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.can_view_contribuinte(auth.uid(), id_contribuinte)));


--
-- Name: per_situacao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.per_situacao ENABLE ROW LEVEL SECURITY;

--
-- Name: per_situacao per_situacao_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY per_situacao_select ON public.per_situacao FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.per p
  WHERE (((p.nr_per)::text = (per_situacao.nr_proc_per)::text) AND public.can_view_contribuinte(auth.uid(), p.id_contribuinte))))));


--
-- Name: performance_preferencias; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.performance_preferencias ENABLE ROW LEVEL SECURITY;

--
-- Name: pessoa; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pessoa ENABLE ROW LEVEL SECURITY;

--
-- Name: pis_cofins_class; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pis_cofins_class ENABLE ROW LEVEL SECURITY;

--
-- Name: pis_cofins_class pis_cofins_class_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pis_cofins_class_select ON public.pis_cofins_class FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: pis_cofins_regra; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pis_cofins_regra ENABLE ROW LEVEL SECURITY;

--
-- Name: pis_cofins_regra pis_cofins_regra_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pis_cofins_regra_select ON public.pis_cofins_regra FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: ppr_regras_ciclo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ppr_regras_ciclo ENABLE ROW LEVEL SECURITY;

--
-- Name: procedimentos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.procedimentos ENABLE ROW LEVEL SECURITY;

--
-- Name: process_improvements; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.process_improvements ENABLE ROW LEVEL SECURITY;

--
-- Name: process_scenarios; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.process_scenarios ENABLE ROW LEVEL SECURITY;

--
-- Name: process_stages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.process_stages ENABLE ROW LEVEL SECURITY;

--
-- Name: processes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.processes ENABLE ROW LEVEL SECURITY;

--
-- Name: produto_documento_tipo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produto_documento_tipo ENABLE ROW LEVEL SECURITY;

--
-- Name: produto_segmento; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produto_segmento ENABLE ROW LEVEL SECURITY;

--
-- Name: produto_servico; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.produto_servico ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: project_documents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_documents ENABLE ROW LEVEL SECURITY;

--
-- Name: project_processes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_processes ENABLE ROW LEVEL SECURITY;

--
-- Name: project_servicos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.project_servicos ENABLE ROW LEVEL SECURITY;

--
-- Name: projects; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

--
-- Name: projeto_flag_valor; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projeto_flag_valor ENABLE ROW LEVEL SECURITY;

--
-- Name: projeto_justificativas; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.projeto_justificativas ENABLE ROW LEVEL SECURITY;

--
-- Name: projeto_justificativas projeto_justificativas_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projeto_justificativas_delete ON public.projeto_justificativas FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = projeto_justificativas.projeto_id) AND ((p.cluster_id IS NULL) OR (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))))))));


--
-- Name: projeto_justificativas projeto_justificativas_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projeto_justificativas_insert ON public.projeto_justificativas FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = projeto_justificativas.projeto_id) AND ((p.cluster_id IS NULL) OR (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))))))));


--
-- Name: projeto_justificativas projeto_justificativas_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projeto_justificativas_select ON public.projeto_justificativas FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = projeto_justificativas.projeto_id) AND ((p.cluster_id IS NULL) OR (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))))));


--
-- Name: projeto_justificativas projeto_justificativas_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY projeto_justificativas_update ON public.projeto_justificativas FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = projeto_justificativas.projeto_id) AND ((p.cluster_id IS NULL) OR (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = projeto_justificativas.projeto_id) AND ((p.cluster_id IS NULL) OR (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))))))));


--
-- Name: quadro_societario; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.quadro_societario ENABLE ROW LEVEL SECURITY;

--
-- Name: relatorios_gerados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.relatorios_gerados ENABLE ROW LEVEL SECURITY;

--
-- Name: relatorios_gerados relatorios_gerados_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY relatorios_gerados_delete ON public.relatorios_gerados FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: relatorios_gerados relatorios_gerados_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY relatorios_gerados_insert ON public.relatorios_gerados FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'lider'::public.app_role) OR public.has_role(auth.uid(), 'sublider'::public.app_role)));


--
-- Name: relatorios_gerados relatorios_gerados_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY relatorios_gerados_select ON public.relatorios_gerados FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'lider'::public.app_role) OR public.has_role(auth.uid(), 'sublider'::public.app_role)));


--
-- Name: relatorios_gerados relatorios_gerados_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY relatorios_gerados_update ON public.relatorios_gerados FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'lider'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'lider'::public.app_role)));


--
-- Name: representante; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.representante ENABLE ROW LEVEL SECURITY;

--
-- Name: reunioes_1a1; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.reunioes_1a1 ENABLE ROW LEVEL SECURITY;

--
-- Name: access_change_log rls_access_change_log_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_access_change_log_insert ON public.access_change_log FOR INSERT TO authenticated WITH CHECK (((changed_by = auth.uid()) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


--
-- Name: analises_semestrais rls_analises_semestrais_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_analises_semestrais_select ON public.analises_semestrais FOR SELECT TO authenticated USING (((auth.uid() = responsavel_id) OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)));


--
-- Name: atualizacoes_meta rls_atualizacoes_meta_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_atualizacoes_meta_select ON public.atualizacoes_meta FOR SELECT TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.metas m
  WHERE (m.id = atualizacoes_meta.meta_id)))));


--
-- Name: audit_logs rls_audit_logs_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_audit_logs_insert ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (((performed_by = auth.uid()) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


--
-- Name: audit_logs rls_audit_logs_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_audit_logs_select ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: catalog_clients rls_catalog_clients_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_catalog_clients_delete ON public.catalog_clients FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: catalog_clients rls_catalog_clients_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_catalog_clients_insert ON public.catalog_clients FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: catalog_clients rls_catalog_clients_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_catalog_clients_update ON public.catalog_clients FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: ciclos_avaliacao rls_ciclos_avaliacao_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ciclos_avaliacao_select ON public.ciclos_avaliacao FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: cliente rls_cliente_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_cliente_delete ON public.cliente FOR DELETE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(id)));


--
-- Name: cliente rls_cliente_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_cliente_insert ON public.cliente FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: cliente rls_cliente_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_cliente_update ON public.cliente FOR UPDATE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(id))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(id)));


--
-- Name: codigo_receita rls_codigo_receita_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_codigo_receita_select ON public.codigo_receita FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: comentarios_avaliacao rls_comentarios_avaliacao_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_comentarios_avaliacao_delete ON public.comentarios_avaliacao FOR DELETE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = autor_id)));


--
-- Name: comentarios_avaliacao rls_comentarios_avaliacao_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_comentarios_avaliacao_insert ON public.comentarios_avaliacao FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = autor_id)));


--
-- Name: comentarios_avaliacao rls_comentarios_avaliacao_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_comentarios_avaliacao_update ON public.comentarios_avaliacao FOR UPDATE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = autor_id))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = autor_id)));


--
-- Name: contatos rls_contatos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_contatos_delete ON public.contatos FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: contatos rls_contatos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_contatos_insert ON public.contatos FOR INSERT TO authenticated, anon WITH CHECK (true);


--
-- Name: contatos rls_contatos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_contatos_select ON public.contatos FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: contatos rls_contatos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_contatos_update ON public.contatos FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: contribuinte_bal_config rls_contribuinte_bal_config_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_contribuinte_bal_config_delete ON public.contribuinte_bal_config FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: contribuinte_bal_config rls_contribuinte_bal_config_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_contribuinte_bal_config_insert ON public.contribuinte_bal_config FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: contribuinte_bal_config rls_contribuinte_bal_config_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_contribuinte_bal_config_update ON public.contribuinte_bal_config FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: contribuinte rls_contribuinte_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_contribuinte_delete ON public.contribuinte FOR DELETE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(cliente_id)));


--
-- Name: contribuinte rls_contribuinte_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_contribuinte_insert ON public.contribuinte FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(cliente_id)));


--
-- Name: contribuinte rls_contribuinte_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_contribuinte_update ON public.contribuinte FOR UPDATE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(cliente_id))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(cliente_id)));


--
-- Name: daily_standups rls_daily_standups_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_daily_standups_delete ON public.daily_standups FOR DELETE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = user_id)));


--
-- Name: daily_standups rls_daily_standups_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_daily_standups_insert ON public.daily_standups FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = user_id)));


--
-- Name: daily_standups rls_daily_standups_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_daily_standups_update ON public.daily_standups FOR UPDATE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = user_id))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = user_id)));


--
-- Name: dcomp rls_dcomp_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_dcomp_delete ON public.dcomp FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: dcomp rls_dcomp_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_dcomp_insert ON public.dcomp FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: dcomp rls_dcomp_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_dcomp_update ON public.dcomp FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: deliverable_attachments rls_deliverable_attachments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_deliverable_attachments_delete ON public.deliverable_attachments FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: deliverable_attachments rls_deliverable_attachments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_deliverable_attachments_insert ON public.deliverable_attachments FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: deliverable_attachments rls_deliverable_attachments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_deliverable_attachments_update ON public.deliverable_attachments FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: demand_items rls_demand_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_demand_items_delete ON public.demand_items FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: demand_items rls_demand_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_demand_items_insert ON public.demand_items FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: demand_items rls_demand_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_demand_items_update ON public.demand_items FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: difal_decisao rls_difal_decisao_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_difal_decisao_delete ON public.difal_decisao FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: difal_decisao rls_difal_decisao_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_difal_decisao_insert ON public.difal_decisao FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: difal_decisao rls_difal_decisao_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_difal_decisao_update ON public.difal_decisao FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: difal_sessao rls_difal_sessao_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_difal_sessao_delete ON public.difal_sessao FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: difal_sessao rls_difal_sessao_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_difal_sessao_insert ON public.difal_sessao FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: difal_sessao rls_difal_sessao_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_difal_sessao_update ON public.difal_sessao FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: distribuicao_dcomp rls_distribuicao_dcomp_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_distribuicao_dcomp_delete ON public.distribuicao_dcomp FOR DELETE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM (public.dcomp d
     JOIN public.per p ON (((p.nr_per)::text = (d.nr_per_orig)::text)))
  WHERE (((d.nr_documento)::text = (distribuicao_dcomp.nr_documento)::text) AND public.can_view_contribuinte(auth.uid(), p.id_contribuinte)))))));


--
-- Name: distribuicao_dcomp rls_distribuicao_dcomp_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_distribuicao_dcomp_insert ON public.distribuicao_dcomp FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM (public.dcomp d
     JOIN public.per p ON (((p.nr_per)::text = (d.nr_per_orig)::text)))
  WHERE (((d.nr_documento)::text = (distribuicao_dcomp.nr_documento)::text) AND public.can_view_contribuinte(auth.uid(), p.id_contribuinte)))))));


--
-- Name: distribuicao_dcomp rls_distribuicao_dcomp_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_distribuicao_dcomp_update ON public.distribuicao_dcomp FOR UPDATE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM (public.dcomp d
     JOIN public.per p ON (((p.nr_per)::text = (d.nr_per_orig)::text)))
  WHERE (((d.nr_documento)::text = (distribuicao_dcomp.nr_documento)::text) AND public.can_view_contribuinte(auth.uid(), p.id_contribuinte))))))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND (public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM (public.dcomp d
     JOIN public.per p ON (((p.nr_per)::text = (d.nr_per_orig)::text)))
  WHERE (((d.nr_documento)::text = (distribuicao_dcomp.nr_documento)::text) AND public.can_view_contribuinte(auth.uid(), p.id_contribuinte)))))));


--
-- Name: distribuicao_receita rls_distribuicao_receita_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_distribuicao_receita_delete ON public.distribuicao_receita FOR DELETE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)));


--
-- Name: distribuicao_receita rls_distribuicao_receita_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_distribuicao_receita_insert ON public.distribuicao_receita FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: distribuicao_receita rls_distribuicao_receita_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_distribuicao_receita_update ON public.distribuicao_receita FOR UPDATE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role))) WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: documentos_processo rls_documentos_processo_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_documentos_processo_delete ON public.documentos_processo FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: documentos_processo rls_documentos_processo_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_documentos_processo_insert ON public.documentos_processo FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: documentos_processo rls_documentos_processo_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_documentos_processo_select ON public.documentos_processo FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: documentos_processo rls_documentos_processo_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_documentos_processo_update ON public.documentos_processo FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: documents rls_documents_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_documents_delete ON public.documents FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: documents rls_documents_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_documents_insert ON public.documents FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: documents rls_documents_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_documents_select ON public.documents FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: documents rls_documents_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_documents_update ON public.documents FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: efd_correcoes rls_efd_correcoes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_efd_correcoes_delete ON public.efd_correcoes FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: efd_correcoes rls_efd_correcoes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_efd_correcoes_insert ON public.efd_correcoes FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: efd_correcoes rls_efd_correcoes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_efd_correcoes_update ON public.efd_correcoes FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: etapa_documentos rls_etapa_documentos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_documentos_delete ON public.etapa_documentos FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_documentos rls_etapa_documentos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_documentos_insert ON public.etapa_documentos FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_documentos rls_etapa_documentos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_documentos_select ON public.etapa_documentos FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_documentos rls_etapa_documentos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_documentos_update ON public.etapa_documentos FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_responsaveis rls_etapa_responsaveis_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_responsaveis_delete ON public.etapa_responsaveis FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_responsaveis rls_etapa_responsaveis_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_responsaveis_insert ON public.etapa_responsaveis FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_responsaveis rls_etapa_responsaveis_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_responsaveis_select ON public.etapa_responsaveis FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_responsaveis rls_etapa_responsaveis_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_responsaveis_update ON public.etapa_responsaveis FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_sistemas rls_etapa_sistemas_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_sistemas_delete ON public.etapa_sistemas FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_sistemas rls_etapa_sistemas_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_sistemas_insert ON public.etapa_sistemas FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_sistemas rls_etapa_sistemas_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_sistemas_select ON public.etapa_sistemas FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: etapa_sistemas rls_etapa_sistemas_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_etapa_sistemas_update ON public.etapa_sistemas FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.process_stage_cluster_visivel(etapa_id))));


--
-- Name: export_profiles rls_export_profiles_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_export_profiles_delete ON public.export_profiles FOR DELETE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = user_id)));


--
-- Name: export_profiles rls_export_profiles_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_export_profiles_insert ON public.export_profiles FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = user_id)));


--
-- Name: export_profiles rls_export_profiles_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_export_profiles_update ON public.export_profiles FOR UPDATE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = user_id))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (auth.uid() = user_id)));


--
-- Name: feedbacks rls_feedbacks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_feedbacks_select ON public.feedbacks FOR SELECT TO authenticated USING (((auth.uid() = de_usuario_id) OR ((auth.uid() = para_usuario_id) AND (visivel_para_avaliado = true)) OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)));


--
-- Name: gargalo_processos rls_gargalo_processos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalo_processos_delete ON public.gargalo_processos FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND public.gargalo_cluster_visivel(gargalo_id))));


--
-- Name: gargalo_processos rls_gargalo_processos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalo_processos_insert ON public.gargalo_processos FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.gargalo_cluster_visivel(gargalo_id))));


--
-- Name: gargalo_processos rls_gargalo_processos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalo_processos_select ON public.gargalo_processos FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.gargalo_cluster_visivel(gargalo_id))));


--
-- Name: gargalo_processos rls_gargalo_processos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalo_processos_update ON public.gargalo_processos FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.gargalo_cluster_visivel(gargalo_id)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.gargalo_cluster_visivel(gargalo_id))));


--
-- Name: gargalo_responsaveis rls_gargalo_responsaveis_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalo_responsaveis_delete ON public.gargalo_responsaveis FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND public.gargalo_cluster_visivel(gargalo_id))));


--
-- Name: gargalo_responsaveis rls_gargalo_responsaveis_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalo_responsaveis_insert ON public.gargalo_responsaveis FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.gargalo_cluster_visivel(gargalo_id))));


--
-- Name: gargalo_responsaveis rls_gargalo_responsaveis_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalo_responsaveis_select ON public.gargalo_responsaveis FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.gargalo_cluster_visivel(gargalo_id))));


--
-- Name: gargalo_responsaveis rls_gargalo_responsaveis_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalo_responsaveis_update ON public.gargalo_responsaveis FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.gargalo_cluster_visivel(gargalo_id)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.gargalo_cluster_visivel(gargalo_id))));


--
-- Name: gargalos rls_gargalos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalos_delete ON public.gargalos FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: gargalos rls_gargalos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalos_insert ON public.gargalos FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: gargalos rls_gargalos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalos_select ON public.gargalos FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: gargalos rls_gargalos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_gargalos_update ON public.gargalos FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: grupo_tributo rls_grupo_tributo_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_grupo_tributo_select ON public.grupo_tributo FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: improvement_savings_details rls_improvement_savings_details_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_improvement_savings_details_delete ON public.improvement_savings_details FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: improvement_savings_details rls_improvement_savings_details_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_improvement_savings_details_insert ON public.improvement_savings_details FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: improvement_savings_details rls_improvement_savings_details_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_improvement_savings_details_update ON public.improvement_savings_details FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: inscricao_contribuinte rls_inscricao_contribuinte_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_inscricao_contribuinte_delete ON public.inscricao_contribuinte FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: inscricao_contribuinte rls_inscricao_contribuinte_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_inscricao_contribuinte_insert ON public.inscricao_contribuinte FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: inscricao_contribuinte rls_inscricao_contribuinte_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_inscricao_contribuinte_update ON public.inscricao_contribuinte FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: itens_acao_1a1 rls_itens_acao_1a1_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_itens_acao_1a1_select ON public.itens_acao_1a1 FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.reunioes_1a1 r
  WHERE ((r.id = itens_acao_1a1.reuniao_id) AND ((r.lider_id = auth.uid()) OR (r.membro_id = auth.uid()) OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role))))));


--
-- Name: kpis_meta rls_kpis_meta_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_kpis_meta_select ON public.kpis_meta FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.metas m
  WHERE ((m.id = kpis_meta.meta_id) AND ((m.responsavel_id = auth.uid()) OR (m.created_by = auth.uid())))))));


--
-- Name: melhoria_acoes_td rls_melhoria_acoes_td_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_acoes_td_delete ON public.melhoria_acoes_td FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_acoes_td rls_melhoria_acoes_td_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_acoes_td_insert ON public.melhoria_acoes_td FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_acoes_td rls_melhoria_acoes_td_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_acoes_td_select ON public.melhoria_acoes_td FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_acoes_td rls_melhoria_acoes_td_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_acoes_td_update ON public.melhoria_acoes_td FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_processos rls_melhoria_processos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_processos_delete ON public.melhoria_processos FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_processos rls_melhoria_processos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_processos_insert ON public.melhoria_processos FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_processos rls_melhoria_processos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_processos_select ON public.melhoria_processos FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_processos rls_melhoria_processos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_processos_update ON public.melhoria_processos FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_responsaveis rls_melhoria_responsaveis_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_responsaveis_delete ON public.melhoria_responsaveis FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_responsaveis rls_melhoria_responsaveis_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_responsaveis_insert ON public.melhoria_responsaveis FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_responsaveis rls_melhoria_responsaveis_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_responsaveis_select ON public.melhoria_responsaveis FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_responsaveis rls_melhoria_responsaveis_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_responsaveis_update ON public.melhoria_responsaveis FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_sistemas rls_melhoria_sistemas_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_sistemas_delete ON public.melhoria_sistemas FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_sistemas rls_melhoria_sistemas_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_sistemas_insert ON public.melhoria_sistemas FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_sistemas rls_melhoria_sistemas_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_sistemas_select ON public.melhoria_sistemas FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: melhoria_sistemas rls_melhoria_sistemas_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_melhoria_sistemas_update ON public.melhoria_sistemas FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.melhoria_cluster_visivel(melhoria_id))));


--
-- Name: metas rls_metas_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_metas_select ON public.metas FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (responsavel_id = auth.uid()) OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)));


--
-- Name: novidades rls_novidades_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_novidades_delete ON public.novidades FOR DELETE TO authenticated USING (public.pode_gerenciar_novidades(auth.uid()));


--
-- Name: novidades rls_novidades_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_novidades_insert ON public.novidades FOR INSERT TO authenticated WITH CHECK (public.pode_gerenciar_novidades(auth.uid()));


--
-- Name: novidades rls_novidades_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_novidades_update ON public.novidades FOR UPDATE TO authenticated USING (public.pode_gerenciar_novidades(auth.uid())) WITH CHECK (public.pode_gerenciar_novidades(auth.uid()));


--
-- Name: ordem_servico rls_ordem_servico_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ordem_servico_delete ON public.ordem_servico FOR DELETE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND (public.cliente_visivel_para(id_cliente) OR ((cluster_id IS NOT NULL) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))));


--
-- Name: ordem_servico rls_ordem_servico_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ordem_servico_insert ON public.ordem_servico FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND (public.cliente_visivel_para(id_cliente) OR ((cluster_id IS NOT NULL) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))));


--
-- Name: ordem_servico rls_ordem_servico_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ordem_servico_update ON public.ordem_servico FOR UPDATE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND (public.cliente_visivel_para(id_cliente) OR ((cluster_id IS NOT NULL) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND (public.cliente_visivel_para(id_cliente) OR ((cluster_id IS NOT NULL) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))));


--
-- Name: org_project_members rls_org_project_members_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_project_members_delete ON public.org_project_members FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: org_project_members rls_org_project_members_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_project_members_insert ON public.org_project_members FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: org_project_members rls_org_project_members_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_project_members_update ON public.org_project_members FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: org_projects rls_org_projects_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_projects_delete ON public.org_projects FOR DELETE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) OR (created_by = auth.uid())));


--
-- Name: org_projects rls_org_projects_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_projects_insert ON public.org_projects FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(( SELECT auth.uid() AS uid), 'sublider'::public.app_role) OR (public.has_role_or_higher(( SELECT auth.uid() AS uid), 'team_member'::public.app_role) AND (created_by = ( SELECT auth.uid() AS uid)))));


--
-- Name: org_projects rls_org_projects_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_projects_select ON public.org_projects FOR SELECT USING ((public.has_role(( SELECT auth.uid() AS uid), 'admin'::public.app_role) OR (created_by = ( SELECT auth.uid() AS uid)) OR (responsible_id = ( SELECT auth.uid() AS uid)) OR (leader_id = ( SELECT auth.uid() AS uid)) OR public.can_view_org_project(( SELECT auth.uid() AS uid), id)));


--
-- Name: org_projects rls_org_projects_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_projects_update ON public.org_projects FOR UPDATE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.is_project_member(auth.uid(), id)))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.is_project_member(auth.uid(), id))));


--
-- Name: org_task_comments rls_org_task_comments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_task_comments_delete ON public.org_task_comments FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: org_task_comments rls_org_task_comments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_task_comments_insert ON public.org_task_comments FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: org_task_comments rls_org_task_comments_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_task_comments_update ON public.org_task_comments FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: org_tasks rls_org_tasks_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_tasks_delete ON public.org_tasks FOR DELETE TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND (created_by = auth.uid()))));


--
-- Name: org_tasks rls_org_tasks_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_tasks_insert ON public.org_tasks FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) OR (assigned_to = auth.uid())));


--
-- Name: org_tasks rls_org_tasks_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_tasks_select ON public.org_tasks FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR ((project_id IS NOT NULL) AND (public.has_role(auth.uid(), 'lider'::public.app_role) OR public.has_role(auth.uid(), 'sublider'::public.app_role)) AND public.can_view_org_project(auth.uid(), project_id)) OR (assigned_to = auth.uid()) OR (created_by = auth.uid()) OR ((reviewer_id = auth.uid()) AND (status = 'review'::public.fiscal_task_status))));


--
-- Name: org_tasks rls_org_tasks_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_org_tasks_update ON public.org_tasks FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR ((project_id IS NOT NULL) AND (public.has_role(auth.uid(), 'lider'::public.app_role) OR public.has_role(auth.uid(), 'sublider'::public.app_role)) AND public.can_view_org_project(auth.uid(), project_id)) OR (assigned_to = auth.uid()) OR (created_by = auth.uid()) OR ((reviewer_id = auth.uid()) AND (status = 'review'::public.fiscal_task_status)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR ((project_id IS NOT NULL) AND (public.has_role(auth.uid(), 'lider'::public.app_role) OR public.has_role(auth.uid(), 'sublider'::public.app_role)) AND public.can_view_org_project(auth.uid(), project_id)) OR (assigned_to = auth.uid()) OR (created_by = auth.uid()) OR ((reviewer_id = auth.uid()) AND (status = ANY (ARRAY['review'::public.fiscal_task_status, 'em_ajuste'::public.fiscal_task_status])))));


--
-- Name: os_produtos_contratados rls_os_produtos_contratados_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_os_produtos_contratados_delete ON public.os_produtos_contratados FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: os_produtos_contratados rls_os_produtos_contratados_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_os_produtos_contratados_insert ON public.os_produtos_contratados FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: os_produtos_contratados rls_os_produtos_contratados_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_os_produtos_contratados_update ON public.os_produtos_contratados FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: page_permissions rls_page_permissions_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_page_permissions_select ON public.page_permissions FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: per rls_per_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_per_delete ON public.per FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: per rls_per_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_per_insert ON public.per FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: per_situacao rls_per_situacao_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_per_situacao_delete ON public.per_situacao FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: per_situacao rls_per_situacao_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_per_situacao_insert ON public.per_situacao FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: per_situacao rls_per_situacao_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_per_situacao_update ON public.per_situacao FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: per rls_per_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_per_update ON public.per FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: performance_preferencias rls_performance_preferencias_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_performance_preferencias_select ON public.performance_preferencias FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: pis_cofins_class rls_pis_cofins_class_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_pis_cofins_class_delete ON public.pis_cofins_class FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: pis_cofins_class rls_pis_cofins_class_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_pis_cofins_class_insert ON public.pis_cofins_class FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: pis_cofins_class rls_pis_cofins_class_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_pis_cofins_class_update ON public.pis_cofins_class FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: pis_cofins_regra rls_pis_cofins_regra_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_pis_cofins_regra_delete ON public.pis_cofins_regra FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: pis_cofins_regra rls_pis_cofins_regra_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_pis_cofins_regra_insert ON public.pis_cofins_regra FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: pis_cofins_regra rls_pis_cofins_regra_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_pis_cofins_regra_update ON public.pis_cofins_regra FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: ppr_regras_ciclo rls_ppr_regras_ciclo_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ppr_regras_ciclo_modify ON public.ppr_regras_ciclo TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: ppr_regras_ciclo rls_ppr_regras_ciclo_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ppr_regras_ciclo_select ON public.ppr_regras_ciclo FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: rls_precheck_allowed_tables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.rls_precheck_allowed_tables ENABLE ROW LEVEL SECURITY;

--
-- Name: rls_precheck_allowed_tables rls_precheck_allowed_tables_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_precheck_allowed_tables_select ON public.rls_precheck_allowed_tables FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: procedimentos rls_procedimentos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_procedimentos_delete ON public.procedimentos FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: procedimentos rls_procedimentos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_procedimentos_insert ON public.procedimentos FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: procedimentos rls_procedimentos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_procedimentos_update ON public.procedimentos FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: process_improvements rls_process_improvements_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_process_improvements_delete ON public.process_improvements FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: process_improvements rls_process_improvements_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_process_improvements_insert ON public.process_improvements FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: process_improvements rls_process_improvements_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_process_improvements_select ON public.process_improvements FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: process_improvements rls_process_improvements_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_process_improvements_update ON public.process_improvements FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: process_stages rls_process_stages_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_process_stages_delete ON public.process_stages FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.processes p
  WHERE ((p.id = process_stages.process_id) AND (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))))));


--
-- Name: process_stages rls_process_stages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_process_stages_insert ON public.process_stages FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.processes p
  WHERE ((p.id = process_stages.process_id) AND (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))))));


--
-- Name: process_stages rls_process_stages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_process_stages_select ON public.process_stages FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.processes p
  WHERE ((p.id = process_stages.process_id) AND (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))))));


--
-- Name: process_stages rls_process_stages_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_process_stages_update ON public.process_stages FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.processes p
  WHERE ((p.id = process_stages.process_id) AND (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (EXISTS ( SELECT 1
   FROM public.processes p
  WHERE ((p.id = process_stages.process_id) AND (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))))));


--
-- Name: processes rls_processes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_processes_delete ON public.processes FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: processes rls_processes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_processes_insert ON public.processes FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: processes rls_processes_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_processes_select ON public.processes FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: processes rls_processes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_processes_update ON public.processes FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: produto_segmento rls_produto_segmento_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_produto_segmento_select ON public.produto_segmento FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: produto_servico rls_produto_servico_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_produto_servico_select ON public.produto_servico FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: profiles rls_profiles_select_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_profiles_select_admin ON public.profiles FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles rls_profiles_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_profiles_select_self ON public.profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: profiles rls_profiles_update_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_profiles_update_admin ON public.profiles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: profiles rls_profiles_update_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_profiles_update_self ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: project_documents rls_project_documents_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_project_documents_delete ON public.project_documents FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: project_documents rls_project_documents_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_project_documents_insert ON public.project_documents FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: project_documents rls_project_documents_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_project_documents_update ON public.project_documents FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: project_processes rls_project_processes_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_project_processes_delete ON public.project_processes FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: project_processes rls_project_processes_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_project_processes_insert ON public.project_processes FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: project_processes rls_project_processes_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_project_processes_update ON public.project_processes FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: project_servicos rls_project_servicos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_project_servicos_delete ON public.project_servicos FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: project_servicos rls_project_servicos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_project_servicos_insert ON public.project_servicos FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: project_servicos rls_project_servicos_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_project_servicos_update ON public.project_servicos FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: projects rls_projects_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_projects_delete ON public.projects FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: projects rls_projects_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_projects_insert ON public.projects FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: projects rls_projects_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_projects_select ON public.projects FOR SELECT TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (created_by = auth.uid())) OR (EXISTS ( SELECT 1
   FROM public.client_visible_projects cvp
  WHERE ((cvp.project_id = projects.id) AND (cvp.user_id = auth.uid()))))));


--
-- Name: projects rls_projects_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_projects_update ON public.projects FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: representante rls_representante_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_representante_delete ON public.representante FOR DELETE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(id_cliente)));


--
-- Name: representante rls_representante_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_representante_insert ON public.representante FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(id_cliente)));


--
-- Name: representante rls_representante_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_representante_update ON public.representante FOR UPDATE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(id_cliente))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND public.cliente_visivel_para(id_cliente)));


--
-- Name: reunioes_1a1 rls_reunioes_1a1_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_reunioes_1a1_select ON public.reunioes_1a1 FOR SELECT TO authenticated USING (((auth.uid() = lider_id) OR (auth.uid() = membro_id) OR public.has_role_or_higher(auth.uid(), 'lider'::public.app_role)));


--
-- Name: routines rls_routines_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_routines_delete ON public.routines FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: routines rls_routines_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_routines_insert ON public.routines FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: routines rls_routines_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_routines_update ON public.routines FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: setor_cliente rls_setor_cliente_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_setor_cliente_delete ON public.setor_cliente FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: setor_cliente rls_setor_cliente_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_setor_cliente_insert ON public.setor_cliente FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: setor_cliente rls_setor_cliente_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_setor_cliente_select ON public.setor_cliente FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: setor_cliente rls_setor_cliente_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_setor_cliente_update ON public.setor_cliente FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: sistema_clusters rls_sistema_clusters_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistema_clusters_delete ON public.sistema_clusters FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: sistema_clusters rls_sistema_clusters_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistema_clusters_insert ON public.sistema_clusters FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: sistema_clusters rls_sistema_clusters_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistema_clusters_select ON public.sistema_clusters FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: sistema_clusters rls_sistema_clusters_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistema_clusters_update ON public.sistema_clusters FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: sistema_responsaveis rls_sistema_responsaveis_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistema_responsaveis_delete ON public.sistema_responsaveis FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND public.sistema_cluster_visivel(sistema_id))));


--
-- Name: sistema_responsaveis rls_sistema_responsaveis_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistema_responsaveis_insert ON public.sistema_responsaveis FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.sistema_cluster_visivel(sistema_id))));


--
-- Name: sistema_responsaveis rls_sistema_responsaveis_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistema_responsaveis_select ON public.sistema_responsaveis FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.sistema_cluster_visivel(sistema_id))));


--
-- Name: sistema_responsaveis rls_sistema_responsaveis_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistema_responsaveis_update ON public.sistema_responsaveis FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.sistema_cluster_visivel(sistema_id)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND public.sistema_cluster_visivel(sistema_id))));


--
-- Name: sistemas_processo rls_sistemas_processo_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistemas_processo_delete ON public.sistemas_processo FOR DELETE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: sistemas_processo rls_sistemas_processo_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistemas_processo_insert ON public.sistemas_processo FOR INSERT TO authenticated WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: sistemas_processo rls_sistemas_processo_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistemas_processo_select ON public.sistemas_processo FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND ((cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))) OR (EXISTS ( SELECT 1
   FROM public.sistema_clusters sc
  WHERE ((sc.sistema_id = sistemas_processo.id) AND (sc.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))))))));


--
-- Name: sistemas_processo rls_sistemas_processo_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sistemas_processo_update ON public.sistemas_processo FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: sprint_backlog_items rls_sprint_backlog_items_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_backlog_items_delete ON public.sprint_backlog_items FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: sprint_backlog_items rls_sprint_backlog_items_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_backlog_items_insert ON public.sprint_backlog_items FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: sprint_backlog_items rls_sprint_backlog_items_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_backlog_items_update ON public.sprint_backlog_items FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: sprint_deliverables rls_sprint_deliverables_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_deliverables_delete ON public.sprint_deliverables FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: sprint_deliverables rls_sprint_deliverables_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_deliverables_insert ON public.sprint_deliverables FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: sprint_deliverables rls_sprint_deliverables_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_deliverables_update ON public.sprint_deliverables FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: sprint_events rls_sprint_events_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_events_delete ON public.sprint_events FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: sprint_events rls_sprint_events_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_events_insert ON public.sprint_events FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: sprint_events rls_sprint_events_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_events_update ON public.sprint_events FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: sprint_metrics rls_sprint_metrics_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_metrics_delete ON public.sprint_metrics FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: sprint_metrics rls_sprint_metrics_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_metrics_insert ON public.sprint_metrics FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: sprint_metrics rls_sprint_metrics_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprint_metrics_update ON public.sprint_metrics FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: sprints rls_sprints_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprints_delete ON public.sprints FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: sprints rls_sprints_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprints_insert ON public.sprints FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: sprints rls_sprints_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_sprints_update ON public.sprints FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: ticket_attachments rls_ticket_attachments_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ticket_attachments_delete ON public.ticket_attachments FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: ticket_attachments rls_ticket_attachments_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ticket_attachments_insert ON public.ticket_attachments FOR INSERT TO authenticated WITH CHECK (((uploaded_by = auth.uid()) AND (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.tickets t
  WHERE ((t.id = ticket_attachments.ticket_id) AND (t.user_id = auth.uid())))))));


--
-- Name: ticket_attachments rls_ticket_attachments_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ticket_attachments_select ON public.ticket_attachments FOR SELECT TO authenticated USING (public.can_view_ticket(ticket_id));


--
-- Name: ticket_messages rls_ticket_messages_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ticket_messages_delete ON public.ticket_messages FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: ticket_messages rls_ticket_messages_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ticket_messages_insert ON public.ticket_messages FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) OR (EXISTS ( SELECT 1
   FROM public.tickets t
  WHERE ((t.id = ticket_messages.ticket_id) AND (t.user_id = auth.uid())))))));


--
-- Name: ticket_messages rls_ticket_messages_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ticket_messages_select ON public.ticket_messages FOR SELECT TO authenticated USING (public.can_view_ticket(ticket_id));


--
-- Name: ticket_messages rls_ticket_messages_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_ticket_messages_update ON public.ticket_messages FOR UPDATE TO authenticated USING (((user_id = auth.uid()) AND public.can_view_ticket(ticket_id))) WITH CHECK (((user_id = auth.uid()) AND public.can_view_ticket(ticket_id)));


--
-- Name: tickets rls_tickets_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_tickets_delete ON public.tickets FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: tickets rls_tickets_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_tickets_insert ON public.tickets FOR INSERT TO authenticated WITH CHECK ((((auth.uid() = user_id) AND public.has_role(auth.uid(), 'client'::public.app_role)) OR public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


--
-- Name: tickets rls_tickets_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_tickets_select ON public.tickets FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))) OR (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND (cliente_id IS NOT NULL) AND public.cliente_visivel_para(cliente_id)) OR (auth.uid() = user_id) OR public.is_ticket_assigned_to(id, auth.uid())));


--
-- Name: tickets rls_tickets_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_tickets_update ON public.tickets FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) OR (assigned_to = auth.uid()) OR ((auth.uid() = user_id) AND public.has_role(auth.uid(), 'client'::public.app_role)))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) OR (assigned_to = auth.uid()) OR ((auth.uid() = user_id) AND public.has_role(auth.uid(), 'client'::public.app_role))));


--
-- Name: tool_area_access rls_tool_area_access_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_tool_area_access_delete ON public.tool_area_access FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: tool_area_access rls_tool_area_access_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_tool_area_access_insert ON public.tool_area_access FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: tool_area_access rls_tool_area_access_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_tool_area_access_update ON public.tool_area_access FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: tools rls_tools_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_tools_delete ON public.tools FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'lider'::public.app_role));


--
-- Name: tools rls_tools_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_tools_insert ON public.tools FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tools rls_tools_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_tools_update ON public.tools FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: user_roles rls_user_roles_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_user_roles_delete ON public.user_roles FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles rls_user_roles_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_user_roles_insert ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: user_roles rls_user_roles_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_user_roles_update ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'admin'::public.app_role));


--
-- Name: roi_snapshots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.roi_snapshots ENABLE ROW LEVEL SECURITY;

--
-- Name: routines; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.routines ENABLE ROW LEVEL SECURITY;

--
-- Name: routines routines_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY routines_select ON public.routines FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_membro_digital(auth.uid()) OR (assigned_to = auth.uid()) OR (created_by = auth.uid())));


--
-- Name: procedimentos select_procedimentos_member; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY select_procedimentos_member ON public.procedimentos FOR SELECT TO authenticated USING ((public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) OR (public.has_role(auth.uid(), 'team_member'::public.app_role) AND (status_publicacao = 'ativo'::text) AND (status_geracao = 'gerado'::text) AND (confirmado_por IS NOT NULL))));


--
-- Name: servicos_prestados; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.servicos_prestados ENABLE ROW LEVEL SECURITY;

--
-- Name: setor_cliente; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.setor_cliente ENABLE ROW LEVEL SECURITY;

--
-- Name: sistema_clusters; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sistema_clusters ENABLE ROW LEVEL SECURITY;

--
-- Name: sistema_responsaveis; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sistema_responsaveis ENABLE ROW LEVEL SECURITY;

--
-- Name: sistemas_processo; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sistemas_processo ENABLE ROW LEVEL SECURITY;

--
-- Name: solicitacao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.solicitacao ENABLE ROW LEVEL SECURITY;

--
-- Name: solicitacao_item; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.solicitacao_item ENABLE ROW LEVEL SECURITY;

--
-- Name: solicitacao_item_nao_aplicavel; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.solicitacao_item_nao_aplicavel ENABLE ROW LEVEL SECURITY;

--
-- Name: sprint_backlog_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sprint_backlog_items ENABLE ROW LEVEL SECURITY;

--
-- Name: sprint_backlog_items sprint_backlog_items_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sprint_backlog_items_select ON public.sprint_backlog_items FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.is_membro_digital(auth.uid()) OR ((sprint_id IS NOT NULL) AND public.sprint_visivel(sprint_id)) OR ((project_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = sprint_backlog_items.project_id) AND (p.cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))))));


--
-- Name: sprint_deliverables; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sprint_deliverables ENABLE ROW LEVEL SECURITY;

--
-- Name: sprint_deliverables_backup_20260809; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sprint_deliverables_backup_20260809 ENABLE ROW LEVEL SECURITY;

--
-- Name: sprint_deliverables sprint_deliverables_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sprint_deliverables_select ON public.sprint_deliverables FOR SELECT TO authenticated USING ((( SELECT public.ve_todas_as_sprints() AS ve_todas_as_sprints) OR public.sprint_visivel(sprint_id)));


--
-- Name: sprint_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sprint_events ENABLE ROW LEVEL SECURITY;

--
-- Name: sprint_events sprint_events_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sprint_events_select ON public.sprint_events FOR SELECT TO authenticated USING ((( SELECT public.ve_todas_as_sprints() AS ve_todas_as_sprints) OR public.sprint_visivel(sprint_id)));


--
-- Name: sprint_metrics; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sprint_metrics ENABLE ROW LEVEL SECURITY;

--
-- Name: sprint_metrics sprint_metrics_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sprint_metrics_select ON public.sprint_metrics FOR SELECT TO authenticated USING ((( SELECT public.ve_todas_as_sprints() AS ve_todas_as_sprints) OR public.sprint_visivel(sprint_id)));


--
-- Name: sprints; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.sprints ENABLE ROW LEVEL SECURITY;

--
-- Name: sprints sprints_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sprints_select ON public.sprints FOR SELECT TO authenticated USING ((( SELECT public.ve_todas_as_sprints() AS ve_todas_as_sprints) OR ((project_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.projects p
  WHERE ((p.id = sprints.project_id) AND (p.cluster_id IN ( SELECT unnest(public.resolve_user_cluster_ids(auth.uid())) AS unnest))))))));


--
-- Name: solicitacao sublider na os can delete solicitacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sublider na os can delete solicitacao" ON public.solicitacao FOR DELETE TO authenticated USING (public.sublider_na_os(ordem_servico_id));


--
-- Name: solicitacao_item sublider na os can delete solicitacao_item; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sublider na os can delete solicitacao_item" ON public.solicitacao_item FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.solicitacao s
  WHERE ((s.id = solicitacao_item.solicitacao_id) AND public.sublider_na_os(s.ordem_servico_id)))));


--
-- Name: solicitacao sublider na os can insert solicitacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sublider na os can insert solicitacao" ON public.solicitacao FOR INSERT TO authenticated WITH CHECK (public.sublider_na_os(ordem_servico_id));


--
-- Name: solicitacao_item sublider na os can insert solicitacao_item; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sublider na os can insert solicitacao_item" ON public.solicitacao_item FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.solicitacao s
  WHERE ((s.id = solicitacao_item.solicitacao_id) AND public.sublider_na_os(s.ordem_servico_id)))));


--
-- Name: solicitacao sublider na os can update solicitacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sublider na os can update solicitacao" ON public.solicitacao FOR UPDATE TO authenticated USING (public.sublider_na_os(ordem_servico_id)) WITH CHECK (public.sublider_na_os(ordem_servico_id));


--
-- Name: solicitacao_item sublider na os can update solicitacao_item; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sublider na os can update solicitacao_item" ON public.solicitacao_item FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.solicitacao s
  WHERE ((s.id = solicitacao_item.solicitacao_id) AND public.sublider_na_os(s.ordem_servico_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.solicitacao s
  WHERE ((s.id = solicitacao_item.solicitacao_id) AND public.sublider_na_os(s.ordem_servico_id)))));


--
-- Name: produto_documento_tipo sublider+ can delete produto_documento_tipo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sublider+ can delete produto_documento_tipo" ON public.produto_documento_tipo FOR DELETE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: produto_documento_tipo sublider+ can insert produto_documento_tipo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sublider+ can insert produto_documento_tipo" ON public.produto_documento_tipo FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: produto_documento_tipo sublider+ can update produto_documento_tipo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "sublider+ can update produto_documento_tipo" ON public.produto_documento_tipo FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role));


--
-- Name: cliente_clusters sublider_or_higher_manage_own_cluster_links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sublider_or_higher_manage_own_cluster_links ON public.cliente_clusters TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid())))))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR (public.has_role_or_higher(auth.uid(), 'sublider'::public.app_role) AND (cluster_id = ANY (public.resolve_user_cluster_ids(auth.uid()))))));


--
-- Name: area_servicos team_lider_select_area_servicos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_lider_select_area_servicos ON public.area_servicos FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: servicos_prestados team_lider_select_servicos_prestados; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_lider_select_servicos_prestados ON public.servicos_prestados FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: client_documents team_manage_client_documents; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_manage_client_documents ON public.client_documents TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: client_visible_projects team_manage_client_visible_projects; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_manage_client_visible_projects ON public.client_visible_projects TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: produto_segmento team_manage_produto_segmento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_manage_produto_segmento ON public.produto_segmento TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: administracao team_member+ can insert administracao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert administracao" ON public.administracao FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: bem team_member+ can insert bem; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert bem" ON public.bem FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: capital_integralizacao team_member+ can insert capital_integralizacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert capital_integralizacao" ON public.capital_integralizacao FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: cartorio team_member+ can insert cartorio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert cartorio" ON public.cartorio FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: documento_arquivo team_member+ can insert documento_arquivo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert documento_arquivo" ON public.documento_arquivo FOR INSERT TO authenticated WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND ((cliente_id IS NULL) OR public.cliente_visivel_para(cliente_id))));


--
-- Name: documento_gerado team_member+ can insert documento_gerado; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert documento_gerado" ON public.documento_gerado FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: documento_override team_member+ can insert documento_override; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert documento_override" ON public.documento_override FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: impedimento team_member+ can insert impedimento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert impedimento" ON public.impedimento FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: matricula team_member+ can insert matricula; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert matricula" ON public.matricula FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: parentesco team_member+ can insert parentesco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert parentesco" ON public.parentesco FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: pessoa team_member+ can insert pessoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert pessoa" ON public.pessoa FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: projeto_flag_valor team_member+ can insert projeto_flag_valor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert projeto_flag_valor" ON public.projeto_flag_valor FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: quadro_societario team_member+ can insert quadro_societario; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert quadro_societario" ON public.quadro_societario FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: titularidade team_member+ can insert titularidade; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert titularidade" ON public.titularidade FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_bloco team_member+ can insert tmpl_bloco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert tmpl_bloco" ON public.tmpl_bloco FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_bloco_flag team_member+ can insert tmpl_bloco_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert tmpl_bloco_flag" ON public.tmpl_bloco_flag FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_bloco_versao team_member+ can insert tmpl_bloco_versao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert tmpl_bloco_versao" ON public.tmpl_bloco_versao FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_documento team_member+ can insert tmpl_documento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert tmpl_documento" ON public.tmpl_documento FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_documento_bloco team_member+ can insert tmpl_documento_bloco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert tmpl_documento_bloco" ON public.tmpl_documento_bloco FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_flag team_member+ can insert tmpl_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can insert tmpl_flag" ON public.tmpl_flag FOR INSERT TO authenticated WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: administracao team_member+ can update administracao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update administracao" ON public.administracao FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: bem team_member+ can update bem; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update bem" ON public.bem FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: capital_integralizacao team_member+ can update capital_integralizacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update capital_integralizacao" ON public.capital_integralizacao FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: cartorio team_member+ can update cartorio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update cartorio" ON public.cartorio FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: documento_arquivo team_member+ can update documento_arquivo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update documento_arquivo" ON public.documento_arquivo FOR UPDATE TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND ((cliente_id IS NULL) OR public.cliente_visivel_para(cliente_id)))) WITH CHECK ((public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND ((cliente_id IS NULL) OR public.cliente_visivel_para(cliente_id))));


--
-- Name: documento_gerado team_member+ can update documento_gerado; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update documento_gerado" ON public.documento_gerado FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: documento_override team_member+ can update documento_override; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update documento_override" ON public.documento_override FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: impedimento team_member+ can update impedimento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update impedimento" ON public.impedimento FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: matricula team_member+ can update matricula; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update matricula" ON public.matricula FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: parentesco team_member+ can update parentesco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update parentesco" ON public.parentesco FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: pessoa team_member+ can update pessoa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update pessoa" ON public.pessoa FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: projeto_flag_valor team_member+ can update projeto_flag_valor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update projeto_flag_valor" ON public.projeto_flag_valor FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: quadro_societario team_member+ can update quadro_societario; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update quadro_societario" ON public.quadro_societario FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: titularidade team_member+ can update titularidade; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update titularidade" ON public.titularidade FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_bloco team_member+ can update tmpl_bloco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update tmpl_bloco" ON public.tmpl_bloco FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_bloco_flag team_member+ can update tmpl_bloco_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update tmpl_bloco_flag" ON public.tmpl_bloco_flag FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_bloco_versao team_member+ can update tmpl_bloco_versao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update tmpl_bloco_versao" ON public.tmpl_bloco_versao FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_documento team_member+ can update tmpl_documento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update tmpl_documento" ON public.tmpl_documento FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_documento_bloco team_member+ can update tmpl_documento_bloco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update tmpl_documento_bloco" ON public.tmpl_documento_bloco FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_flag team_member+ can update tmpl_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can update tmpl_flag" ON public.tmpl_flag FOR UPDATE TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: administracao team_member+ can view administracao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view administracao" ON public.administracao FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: cartorio team_member+ can view cartorio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view cartorio" ON public.cartorio FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: documento_arquivo team_member+ can view documento_arquivo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view documento_arquivo" ON public.documento_arquivo FOR SELECT TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role) AND ((cliente_id IS NULL) OR public.cliente_visivel_para(cliente_id))));


--
-- Name: documento_gerado team_member+ can view documento_gerado; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view documento_gerado" ON public.documento_gerado FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: documento_override team_member+ can view documento_override; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view documento_override" ON public.documento_override FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: documento_tipo team_member+ can view documento_tipo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view documento_tipo" ON public.documento_tipo FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: impedimento team_member+ can view impedimento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view impedimento" ON public.impedimento FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: produto_documento_tipo team_member+ can view produto_documento_tipo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view produto_documento_tipo" ON public.produto_documento_tipo FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: projeto_flag_valor team_member+ can view projeto_flag_valor; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view projeto_flag_valor" ON public.projeto_flag_valor FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_bloco team_member+ can view tmpl_bloco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view tmpl_bloco" ON public.tmpl_bloco FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_bloco_flag team_member+ can view tmpl_bloco_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view tmpl_bloco_flag" ON public.tmpl_bloco_flag FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_bloco_versao team_member+ can view tmpl_bloco_versao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view tmpl_bloco_versao" ON public.tmpl_bloco_versao FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_documento team_member+ can view tmpl_documento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view tmpl_documento" ON public.tmpl_documento FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_documento_bloco team_member+ can view tmpl_documento_bloco; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view tmpl_documento_bloco" ON public.tmpl_documento_bloco FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: tmpl_flag team_member+ can view tmpl_flag; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can view tmpl_flag" ON public.tmpl_flag FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: documento_tipo team_member+ can write documento_tipo; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "team_member+ can write documento_tipo" ON public.documento_tipo TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)) WITH CHECK (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: cliente_clusters team_member_select_cliente_clusters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_member_select_cliente_clusters ON public.cliente_clusters FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: org_project_members team_select_org_project_members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_select_org_project_members ON public.org_project_members FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: project_servicos team_select_project_servicos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_select_project_servicos ON public.project_servicos FOR SELECT TO authenticated USING (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));


--
-- Name: representante team_select_representante; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY team_select_representante ON public.representante FOR SELECT TO authenticated USING (((excluido = false) AND public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)));


--
-- Name: ticket_attachments; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_attachments ENABLE ROW LEVEL SECURITY;

--
-- Name: ticket_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ticket_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: tickets; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;

--
-- Name: titularidade; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.titularidade ENABLE ROW LEVEL SECURITY;

--
-- Name: tmpl_bloco; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tmpl_bloco ENABLE ROW LEVEL SECURITY;

--
-- Name: tmpl_bloco_flag; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tmpl_bloco_flag ENABLE ROW LEVEL SECURITY;

--
-- Name: tmpl_bloco_versao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tmpl_bloco_versao ENABLE ROW LEVEL SECURITY;

--
-- Name: tmpl_documento; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tmpl_documento ENABLE ROW LEVEL SECURITY;

--
-- Name: tmpl_documento_bloco; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tmpl_documento_bloco ENABLE ROW LEVEL SECURITY;

--
-- Name: tmpl_flag; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tmpl_flag ENABLE ROW LEVEL SECURITY;

--
-- Name: tool_area_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tool_area_access ENABLE ROW LEVEL SECURITY;

--
-- Name: tools; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.tools ENABLE ROW LEVEL SECURITY;

--
-- Name: user_page_access; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_page_access ENABLE ROW LEVEL SECURITY;

--
-- Name: user_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime org_comments; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.org_comments;


--
-- Name: supabase_realtime sprint_deliverables; Type: PUBLICATION TABLE; Schema: public; Owner: -
--

ALTER PUBLICATION supabase_realtime ADD TABLE ONLY public.sprint_deliverables;


--
-- Name: FUNCTION anexar_documento_pendencia(_solicitacao_item_id uuid, _alvo_kind text, _alvo_id uuid, _categoria text, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.anexar_documento_pendencia(_solicitacao_item_id uuid, _alvo_kind text, _alvo_id uuid, _categoria text, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.anexar_documento_pendencia(_solicitacao_item_id uuid, _alvo_kind text, _alvo_id uuid, _categoria text, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) TO anon;
GRANT ALL ON FUNCTION public.anexar_documento_pendencia(_solicitacao_item_id uuid, _alvo_kind text, _alvo_id uuid, _categoria text, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) TO authenticated;
GRANT ALL ON FUNCTION public.anexar_documento_pendencia(_solicitacao_item_id uuid, _alvo_kind text, _alvo_id uuid, _categoria text, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) TO service_role;


--
-- Name: FUNCTION anexar_documento_solicitado(_item_id uuid, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.anexar_documento_solicitado(_item_id uuid, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.anexar_documento_solicitado(_item_id uuid, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) TO anon;
GRANT ALL ON FUNCTION public.anexar_documento_solicitado(_item_id uuid, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) TO authenticated;
GRANT ALL ON FUNCTION public.anexar_documento_solicitado(_item_id uuid, _gcs_uri text, _checksum text, _tamanho bigint, _mime text, _nome_original text, _ambiente text) TO service_role;


--
-- Name: FUNCTION auto_grant_new_page_to_area_users(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.auto_grant_new_page_to_area_users() TO anon;
GRANT ALL ON FUNCTION public.auto_grant_new_page_to_area_users() TO authenticated;
GRANT ALL ON FUNCTION public.auto_grant_new_page_to_area_users() TO service_role;


--
-- Name: FUNCTION can_perform(p_table text, p_op text, p_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_perform(p_table text, p_op text, p_id uuid) TO anon;
GRANT ALL ON FUNCTION public.can_perform(p_table text, p_op text, p_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_perform(p_table text, p_op text, p_id uuid) TO service_role;


--
-- Name: FUNCTION can_view_contribuinte(_uid uuid, _contribuinte_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_view_contribuinte(_uid uuid, _contribuinte_id uuid) TO anon;
GRANT ALL ON FUNCTION public.can_view_contribuinte(_uid uuid, _contribuinte_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_view_contribuinte(_uid uuid, _contribuinte_id uuid) TO service_role;


--
-- Name: FUNCTION can_view_org_project(_user_id uuid, _project_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_view_org_project(_user_id uuid, _project_id uuid) TO anon;
GRANT ALL ON FUNCTION public.can_view_org_project(_user_id uuid, _project_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_view_org_project(_user_id uuid, _project_id uuid) TO service_role;


--
-- Name: FUNCTION can_view_ticket(_ticket_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.can_view_ticket(_ticket_id uuid) TO anon;
GRANT ALL ON FUNCTION public.can_view_ticket(_ticket_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.can_view_ticket(_ticket_id uuid) TO service_role;


--
-- Name: FUNCTION capture_ticket_assignment(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.capture_ticket_assignment() TO anon;
GRANT ALL ON FUNCTION public.capture_ticket_assignment() TO authenticated;
GRANT ALL ON FUNCTION public.capture_ticket_assignment() TO service_role;


--
-- Name: FUNCTION checklist_touch_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.checklist_touch_updated_at() TO anon;
GRANT ALL ON FUNCTION public.checklist_touch_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.checklist_touch_updated_at() TO service_role;


--
-- Name: FUNCTION cliente_id_de_bem(_bem_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cliente_id_de_bem(_bem_id uuid) TO anon;
GRANT ALL ON FUNCTION public.cliente_id_de_bem(_bem_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cliente_id_de_bem(_bem_id uuid) TO service_role;


--
-- Name: FUNCTION cliente_id_de_matricula(_matricula_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cliente_id_de_matricula(_matricula_id uuid) TO anon;
GRANT ALL ON FUNCTION public.cliente_id_de_matricula(_matricula_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cliente_id_de_matricula(_matricula_id uuid) TO service_role;


--
-- Name: FUNCTION cliente_id_de_pessoa(_pessoa_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cliente_id_de_pessoa(_pessoa_id uuid) TO anon;
GRANT ALL ON FUNCTION public.cliente_id_de_pessoa(_pessoa_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cliente_id_de_pessoa(_pessoa_id uuid) TO service_role;


--
-- Name: FUNCTION cliente_visivel_para(_cliente_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.cliente_visivel_para(_cliente_id uuid) TO anon;
GRANT ALL ON FUNCTION public.cliente_visivel_para(_cliente_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.cliente_visivel_para(_cliente_id uuid) TO service_role;


--
-- Name: TABLE bem; Type: ACL; Schema: public; Owner: -
--

--
-- Zera os privilégios dos três roles antes de reaplicá-los.
--
-- Motivo: pg_dump emite GRANT, nunca "a ausência de grant". Todo ambiente
-- Supabase tem ALTER DEFAULT PRIVILEGES dando ALL no que o postgres cria, então
-- sem este REVOKE as tabelas nascem mais permissivas do que são em produção, e o
-- quanto mais depende de como o ambiente configurou as default privileges. Num
-- Supabase hospedado, por exemplo, authenticated ganharia DELETE em org_comments,
-- que produção nega de propósito (a exclusão é lógica, pela coluna excluido).
--
-- Com o REVOKE aqui, os GRANTs logo abaixo, que vieram do dump, passam a ser a
-- palavra final, e o resultado é o mesmo em qualquer ambiente. A cobertura foi
-- conferida: o dump emite GRANT explícito para todas as 150 relações e as 2
-- sequences nos casos em que produção concede algo, e omite exatamente onde
-- produção não concede nada (anon em 8 objetos, authenticated em
-- sprint_deliverables_backup_20260809).

REVOKE ALL ON ALL TABLES    IN SCHEMA public FROM anon, authenticated, service_role;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated, service_role;

GRANT ALL ON TABLE public.bem TO anon;
GRANT ALL ON TABLE public.bem TO authenticated;
GRANT ALL ON TABLE public.bem TO service_role;


--
-- Name: FUNCTION criar_bem_com_titular(bem_data jsonb, titular_data jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.criar_bem_com_titular(bem_data jsonb, titular_data jsonb) TO anon;
GRANT ALL ON FUNCTION public.criar_bem_com_titular(bem_data jsonb, titular_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.criar_bem_com_titular(bem_data jsonb, titular_data jsonb) TO service_role;


--
-- Name: FUNCTION criar_cliente_com_clusters(p_cliente jsonb, p_cluster_ids uuid[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.criar_cliente_com_clusters(p_cliente jsonb, p_cluster_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.criar_cliente_com_clusters(p_cliente jsonb, p_cluster_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.criar_cliente_com_clusters(p_cliente jsonb, p_cluster_ids uuid[]) TO service_role;


--
-- Name: TABLE matricula; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.matricula TO anon;
GRANT ALL ON TABLE public.matricula TO authenticated;
GRANT ALL ON TABLE public.matricula TO service_role;


--
-- Name: FUNCTION criar_matricula_com_titular(matricula_data jsonb, titular_data jsonb); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.criar_matricula_com_titular(matricula_data jsonb, titular_data jsonb) TO anon;
GRANT ALL ON FUNCTION public.criar_matricula_com_titular(matricula_data jsonb, titular_data jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.criar_matricula_com_titular(matricula_data jsonb, titular_data jsonb) TO service_role;


--
-- Name: FUNCTION criar_notificacao(_destinatario_id uuid, _tipo public.notificacao_tipo, _titulo text, _entidade_tipo text, _entidade_id uuid, _corpo text, _href text, _agrupamento text, _metadata jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.criar_notificacao(_destinatario_id uuid, _tipo public.notificacao_tipo, _titulo text, _entidade_tipo text, _entidade_id uuid, _corpo text, _href text, _agrupamento text, _metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.criar_notificacao(_destinatario_id uuid, _tipo public.notificacao_tipo, _titulo text, _entidade_tipo text, _entidade_id uuid, _corpo text, _href text, _agrupamento text, _metadata jsonb) TO anon;
GRANT ALL ON FUNCTION public.criar_notificacao(_destinatario_id uuid, _tipo public.notificacao_tipo, _titulo text, _entidade_tipo text, _entidade_id uuid, _corpo text, _href text, _agrupamento text, _metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.criar_notificacao(_destinatario_id uuid, _tipo public.notificacao_tipo, _titulo text, _entidade_tipo text, _entidade_id uuid, _corpo text, _href text, _agrupamento text, _metadata jsonb) TO service_role;


--
-- Name: FUNCTION criar_org_comment(_id uuid, _entity_type public.org_comment_entity, _entity_id uuid, _parent_id uuid, _body text, _mentions uuid[], _attachments jsonb, _respondido_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.criar_org_comment(_id uuid, _entity_type public.org_comment_entity, _entity_id uuid, _parent_id uuid, _body text, _mentions uuid[], _attachments jsonb, _respondido_id uuid) TO anon;
GRANT ALL ON FUNCTION public.criar_org_comment(_id uuid, _entity_type public.org_comment_entity, _entity_id uuid, _parent_id uuid, _body text, _mentions uuid[], _attachments jsonb, _respondido_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.criar_org_comment(_id uuid, _entity_type public.org_comment_entity, _entity_id uuid, _parent_id uuid, _body text, _mentions uuid[], _attachments jsonb, _respondido_id uuid) TO service_role;


--
-- Name: FUNCTION dashboard_project_ids_for_cluster(_cluster_id uuid, _include_orphans boolean); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.dashboard_project_ids_for_cluster(_cluster_id uuid, _include_orphans boolean) TO anon;
GRANT ALL ON FUNCTION public.dashboard_project_ids_for_cluster(_cluster_id uuid, _include_orphans boolean) TO authenticated;
GRANT ALL ON FUNCTION public.dashboard_project_ids_for_cluster(_cluster_id uuid, _include_orphans boolean) TO service_role;


--
-- Name: FUNCTION destinatarios_cliente(_cliente_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.destinatarios_cliente(_cliente_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.destinatarios_cliente(_cliente_id uuid) TO anon;
GRANT ALL ON FUNCTION public.destinatarios_cliente(_cliente_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.destinatarios_cliente(_cliente_id uuid) TO service_role;


--
-- Name: FUNCTION documento_arquivo_touch_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.documento_arquivo_touch_updated_at() TO anon;
GRANT ALL ON FUNCTION public.documento_arquivo_touch_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.documento_arquivo_touch_updated_at() TO service_role;


--
-- Name: FUNCTION enforce_cliente_cluster_last(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.enforce_cliente_cluster_last() TO anon;
GRANT ALL ON FUNCTION public.enforce_cliente_cluster_last() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_cliente_cluster_last() TO service_role;


--
-- Name: FUNCTION enforce_cliente_tem_cluster(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.enforce_cliente_tem_cluster() TO anon;
GRANT ALL ON FUNCTION public.enforce_cliente_tem_cluster() TO authenticated;
GRANT ALL ON FUNCTION public.enforce_cliente_tem_cluster() TO service_role;


--
-- Name: FUNCTION fechar_chamados_resolvidos_sem_resposta(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.fechar_chamados_resolvidos_sem_resposta() FROM PUBLIC;
GRANT ALL ON FUNCTION public.fechar_chamados_resolvidos_sem_resposta() TO anon;
GRANT ALL ON FUNCTION public.fechar_chamados_resolvidos_sem_resposta() TO authenticated;
GRANT ALL ON FUNCTION public.fechar_chamados_resolvidos_sem_resposta() TO service_role;


--
-- Name: TABLE ordem_servico; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ordem_servico TO anon;
GRANT ALL ON TABLE public.ordem_servico TO authenticated;
GRANT ALL ON TABLE public.ordem_servico TO service_role;


--
-- Name: TABLE org_comment_attachments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.org_comment_attachments TO anon;
GRANT ALL ON TABLE public.org_comment_attachments TO authenticated;
GRANT ALL ON TABLE public.org_comment_attachments TO service_role;


--
-- Name: TABLE org_comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.org_comments TO anon;
GRANT SELECT,INSERT,REFERENCES,TRIGGER,TRUNCATE,MAINTAIN,UPDATE ON TABLE public.org_comments TO authenticated;
GRANT ALL ON TABLE public.org_comments TO service_role;


--
-- Name: TABLE org_projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.org_projects TO anon;
GRANT ALL ON TABLE public.org_projects TO authenticated;
GRANT ALL ON TABLE public.org_projects TO service_role;


--
-- Name: TABLE org_tasks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.org_tasks TO anon;
GRANT ALL ON TABLE public.org_tasks TO authenticated;
GRANT ALL ON TABLE public.org_tasks TO service_role;


--
-- Name: TABLE org_comments_feed; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.org_comments_feed TO anon;
GRANT ALL ON TABLE public.org_comments_feed TO authenticated;
GRANT ALL ON TABLE public.org_comments_feed TO service_role;


--
-- Name: FUNCTION feed_org_comments(_cursor_created_at timestamp with time zone, _cursor_id uuid, _limit integer, _client_ids uuid[], _project_ids uuid[], _author_ids uuid[], _only_mentions boolean, _since timestamp with time zone); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.feed_org_comments(_cursor_created_at timestamp with time zone, _cursor_id uuid, _limit integer, _client_ids uuid[], _project_ids uuid[], _author_ids uuid[], _only_mentions boolean, _since timestamp with time zone) TO anon;
GRANT ALL ON FUNCTION public.feed_org_comments(_cursor_created_at timestamp with time zone, _cursor_id uuid, _limit integer, _client_ids uuid[], _project_ids uuid[], _author_ids uuid[], _only_mentions boolean, _since timestamp with time zone) TO authenticated;
GRANT ALL ON FUNCTION public.feed_org_comments(_cursor_created_at timestamp with time zone, _cursor_id uuid, _limit integer, _client_ids uuid[], _project_ids uuid[], _author_ids uuid[], _only_mentions boolean, _since timestamp with time zone) TO service_role;


--
-- Name: FUNCTION freeze_scenario_parameters(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.freeze_scenario_parameters() TO anon;
GRANT ALL ON FUNCTION public.freeze_scenario_parameters() TO authenticated;
GRANT ALL ON FUNCTION public.freeze_scenario_parameters() TO service_role;


--
-- Name: FUNCTION gargalo_cluster_visivel(_gargalo_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.gargalo_cluster_visivel(_gargalo_id uuid) TO anon;
GRANT ALL ON FUNCTION public.gargalo_cluster_visivel(_gargalo_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.gargalo_cluster_visivel(_gargalo_id uuid) TO service_role;


--
-- Name: FUNCTION generate_process_code(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.generate_process_code() TO anon;
GRANT ALL ON FUNCTION public.generate_process_code() TO authenticated;
GRANT ALL ON FUNCTION public.generate_process_code() TO service_role;


--
-- Name: FUNCTION gerar_solicitacao_os(_cliente_id uuid, _ordem_servico_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.gerar_solicitacao_os(_cliente_id uuid, _ordem_servico_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.gerar_solicitacao_os(_cliente_id uuid, _ordem_servico_id uuid) TO authenticated;


--
-- Name: FUNCTION get_accessible_dashboards(_target_page text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_accessible_dashboards(_target_page text) TO anon;
GRANT ALL ON FUNCTION public.get_accessible_dashboards(_target_page text) TO authenticated;
GRANT ALL ON FUNCTION public.get_accessible_dashboards(_target_page text) TO service_role;


--
-- Name: FUNCTION get_checklist_solicitado_cliente(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_checklist_solicitado_cliente() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_checklist_solicitado_cliente() TO anon;
GRANT ALL ON FUNCTION public.get_checklist_solicitado_cliente() TO authenticated;
GRANT ALL ON FUNCTION public.get_checklist_solicitado_cliente() TO service_role;


--
-- Name: FUNCTION get_cluster_members(_cluster_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_cluster_members(_cluster_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_cluster_members(_cluster_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_cluster_members(_cluster_id uuid) TO service_role;


--
-- Name: FUNCTION get_clusters_do_cliente_atual(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_clusters_do_cliente_atual() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_clusters_do_cliente_atual() TO authenticated;
GRANT ALL ON FUNCTION public.get_clusters_do_cliente_atual() TO service_role;


--
-- Name: FUNCTION get_dashboard_embed_url(_dashboard_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_dashboard_embed_url(_dashboard_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_dashboard_embed_url(_dashboard_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_dashboard_embed_url(_dashboard_id uuid) TO service_role;


--
-- Name: FUNCTION get_internal_users(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_internal_users() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_internal_users() TO authenticated;
GRANT ALL ON FUNCTION public.get_internal_users() TO service_role;


--
-- Name: FUNCTION get_ordens_by_client_name(p_client_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_ordens_by_client_name(p_client_id uuid) TO anon;
GRANT ALL ON FUNCTION public.get_ordens_by_client_name(p_client_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.get_ordens_by_client_name(p_client_id uuid) TO service_role;


--
-- Name: FUNCTION get_pendencias_documentos_cliente(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_pendencias_documentos_cliente() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_pendencias_documentos_cliente() TO anon;
GRANT ALL ON FUNCTION public.get_pendencias_documentos_cliente() TO authenticated;
GRANT ALL ON FUNCTION public.get_pendencias_documentos_cliente() TO service_role;


--
-- Name: FUNCTION get_profiles_with_email(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.get_profiles_with_email() TO anon;
GRANT ALL ON FUNCTION public.get_profiles_with_email() TO authenticated;
GRANT ALL ON FUNCTION public.get_profiles_with_email() TO service_role;


--
-- Name: FUNCTION get_profiles_with_min_role(_minimum_role public.app_role); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_profiles_with_min_role(_minimum_role public.app_role) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_profiles_with_min_role(_minimum_role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.get_profiles_with_min_role(_minimum_role public.app_role) TO service_role;


--
-- Name: FUNCTION get_solicitacao_ativa_cliente(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_solicitacao_ativa_cliente() FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_solicitacao_ativa_cliente() TO anon;
GRANT ALL ON FUNCTION public.get_solicitacao_ativa_cliente() TO authenticated;
GRANT ALL ON FUNCTION public.get_solicitacao_ativa_cliente() TO service_role;


--
-- Name: FUNCTION get_ticket_atendentes(_ticket_ids uuid[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_ticket_atendentes(_ticket_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_ticket_atendentes(_ticket_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.get_ticket_atendentes(_ticket_ids uuid[]) TO service_role;


--
-- Name: FUNCTION get_uploader_names(_ids uuid[]); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.get_uploader_names(_ids uuid[]) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_uploader_names(_ids uuid[]) TO anon;
GRANT ALL ON FUNCTION public.get_uploader_names(_ids uuid[]) TO authenticated;
GRANT ALL ON FUNCTION public.get_uploader_names(_ids uuid[]) TO service_role;


--
-- Name: FUNCTION handle_new_user(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.handle_new_user() TO anon;
GRANT ALL ON FUNCTION public.handle_new_user() TO authenticated;
GRANT ALL ON FUNCTION public.handle_new_user() TO service_role;


--
-- Name: FUNCTION has_role(_user_id uuid, _role public.app_role); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role(_user_id uuid, _role public.app_role) TO service_role;


--
-- Name: FUNCTION has_role_or_higher(_user_id uuid, _minimum_role public.app_role); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.has_role_or_higher(_user_id uuid, _minimum_role public.app_role) TO anon;
GRANT ALL ON FUNCTION public.has_role_or_higher(_user_id uuid, _minimum_role public.app_role) TO authenticated;
GRANT ALL ON FUNCTION public.has_role_or_higher(_user_id uuid, _minimum_role public.app_role) TO service_role;


--
-- Name: FUNCTION is_area_member(_user_id uuid, _estrutura_area_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_area_member(_user_id uuid, _estrutura_area_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_area_member(_user_id uuid, _estrutura_area_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_area_member(_user_id uuid, _estrutura_area_id uuid) TO service_role;


--
-- Name: FUNCTION is_membro_digital(p_uid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_membro_digital(p_uid uuid) TO anon;
GRANT ALL ON FUNCTION public.is_membro_digital(p_uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_membro_digital(p_uid uuid) TO service_role;


--
-- Name: FUNCTION is_project_member(_user_id uuid, _project_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_project_member(_user_id uuid, _project_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_project_member(_user_id uuid, _project_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_project_member(_user_id uuid, _project_id uuid) TO service_role;


--
-- Name: FUNCTION is_ticket_assigned_to(p_ticket_id uuid, p_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.is_ticket_assigned_to(p_ticket_id uuid, p_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.is_ticket_assigned_to(p_ticket_id uuid, p_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_ticket_assigned_to(p_ticket_id uuid, p_user_id uuid) TO service_role;


--
-- Name: FUNCTION is_valid_org_task_reviewer(_reviewer_id uuid, _project_id uuid, _assigned_to uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.is_valid_org_task_reviewer(_reviewer_id uuid, _project_id uuid, _assigned_to uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.is_valid_org_task_reviewer(_reviewer_id uuid, _project_id uuid, _assigned_to uuid) TO anon;
GRANT ALL ON FUNCTION public.is_valid_org_task_reviewer(_reviewer_id uuid, _project_id uuid, _assigned_to uuid) TO authenticated;
GRANT ALL ON FUNCTION public.is_valid_org_task_reviewer(_reviewer_id uuid, _project_id uuid, _assigned_to uuid) TO service_role;


--
-- Name: FUNCTION list_profiles_safe(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.list_profiles_safe() FROM PUBLIC;
GRANT ALL ON FUNCTION public.list_profiles_safe() TO anon;
GRANT ALL ON FUNCTION public.list_profiles_safe() TO authenticated;
GRANT ALL ON FUNCTION public.list_profiles_safe() TO service_role;


--
-- Name: FUNCTION mapa_uuid(slug text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mapa_uuid(slug text) TO anon;
GRANT ALL ON FUNCTION public.mapa_uuid(slug text) TO authenticated;
GRANT ALL ON FUNCTION public.mapa_uuid(slug text) TO service_role;


--
-- Name: FUNCTION mark_stuck_procedimentos(timeout_minutes integer); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.mark_stuck_procedimentos(timeout_minutes integer) TO anon;
GRANT ALL ON FUNCTION public.mark_stuck_procedimentos(timeout_minutes integer) TO authenticated;
GRANT ALL ON FUNCTION public.mark_stuck_procedimentos(timeout_minutes integer) TO service_role;


--
-- Name: FUNCTION matricula_definir_cliente(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.matricula_definir_cliente() TO anon;
GRANT ALL ON FUNCTION public.matricula_definir_cliente() TO authenticated;
GRANT ALL ON FUNCTION public.matricula_definir_cliente() TO service_role;


--
-- Name: FUNCTION melhoria_cluster_visivel(_melhoria_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.melhoria_cluster_visivel(_melhoria_id uuid) TO anon;
GRANT ALL ON FUNCTION public.melhoria_cluster_visivel(_melhoria_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.melhoria_cluster_visivel(_melhoria_id uuid) TO service_role;


--
-- Name: FUNCTION nome_cliente_normalizado(p_nome text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.nome_cliente_normalizado(p_nome text) TO anon;
GRANT ALL ON FUNCTION public.nome_cliente_normalizado(p_nome text) TO authenticated;
GRANT ALL ON FUNCTION public.nome_cliente_normalizado(p_nome text) TO service_role;


--
-- Name: FUNCTION notificar_documento_recebido(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notificar_documento_recebido() TO anon;
GRANT ALL ON FUNCTION public.notificar_documento_recebido() TO authenticated;
GRANT ALL ON FUNCTION public.notificar_documento_recebido() TO service_role;


--
-- Name: FUNCTION notificar_tarefa_atribuida(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notificar_tarefa_atribuida() TO anon;
GRANT ALL ON FUNCTION public.notificar_tarefa_atribuida() TO authenticated;
GRANT ALL ON FUNCTION public.notificar_tarefa_atribuida() TO service_role;


--
-- Name: FUNCTION notificar_tarefa_em_revisao(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.notificar_tarefa_em_revisao() TO anon;
GRANT ALL ON FUNCTION public.notificar_tarefa_em_revisao() TO authenticated;
GRANT ALL ON FUNCTION public.notificar_tarefa_em_revisao() TO service_role;


--
-- Name: FUNCTION org_comment_mentions_guard_update(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.org_comment_mentions_guard_update() TO anon;
GRANT ALL ON FUNCTION public.org_comment_mentions_guard_update() TO authenticated;
GRANT ALL ON FUNCTION public.org_comment_mentions_guard_update() TO service_role;


--
-- Name: FUNCTION org_comments_guard_update(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.org_comments_guard_update() TO anon;
GRANT ALL ON FUNCTION public.org_comments_guard_update() TO authenticated;
GRANT ALL ON FUNCTION public.org_comments_guard_update() TO service_role;


--
-- Name: FUNCTION org_comments_resolve_scope(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.org_comments_resolve_scope() TO anon;
GRANT ALL ON FUNCTION public.org_comments_resolve_scope() TO authenticated;
GRANT ALL ON FUNCTION public.org_comments_resolve_scope() TO service_role;


--
-- Name: FUNCTION org_comments_validate_parent(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.org_comments_validate_parent() TO anon;
GRANT ALL ON FUNCTION public.org_comments_validate_parent() TO authenticated;
GRANT ALL ON FUNCTION public.org_comments_validate_parent() TO service_role;


--
-- Name: FUNCTION org_project_cluster_ids(_project_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.org_project_cluster_ids(_project_id uuid) TO anon;
GRANT ALL ON FUNCTION public.org_project_cluster_ids(_project_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.org_project_cluster_ids(_project_id uuid) TO service_role;


--
-- Name: FUNCTION org_task_visivel(p_task_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.org_task_visivel(p_task_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.org_task_visivel(p_task_id uuid) TO anon;
GRANT ALL ON FUNCTION public.org_task_visivel(p_task_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.org_task_visivel(p_task_id uuid) TO service_role;


--
-- Name: FUNCTION org_tasks_cascade_delete_comments(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.org_tasks_cascade_delete_comments() TO anon;
GRANT ALL ON FUNCTION public.org_tasks_cascade_delete_comments() TO authenticated;
GRANT ALL ON FUNCTION public.org_tasks_cascade_delete_comments() TO service_role;


--
-- Name: FUNCTION org_tasks_team_member_status_only(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.org_tasks_team_member_status_only() FROM PUBLIC;
GRANT ALL ON FUNCTION public.org_tasks_team_member_status_only() TO anon;
GRANT ALL ON FUNCTION public.org_tasks_team_member_status_only() TO authenticated;
GRANT ALL ON FUNCTION public.org_tasks_team_member_status_only() TO service_role;


--
-- Name: FUNCTION own_org_task_ids(_uid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.own_org_task_ids(_uid uuid) TO anon;
GRANT ALL ON FUNCTION public.own_org_task_ids(_uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.own_org_task_ids(_uid uuid) TO service_role;


--
-- Name: FUNCTION pode_gerenciar_novidades(_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.pode_gerenciar_novidades(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.pode_gerenciar_novidades(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.pode_gerenciar_novidades(_user_id uuid) TO service_role;


--
-- Name: FUNCTION precheck_allowed_ops(p_table text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.precheck_allowed_ops(p_table text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.precheck_allowed_ops(p_table text) TO authenticated;
GRANT ALL ON FUNCTION public.precheck_allowed_ops(p_table text) TO service_role;


--
-- Name: FUNCTION preview_dashboard_embed_url(_dashboard_id uuid, _mode text, _cluster_ids uuid[], _user_id uuid, _cliente_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.preview_dashboard_embed_url(_dashboard_id uuid, _mode text, _cluster_ids uuid[], _user_id uuid, _cliente_id uuid) TO anon;
GRANT ALL ON FUNCTION public.preview_dashboard_embed_url(_dashboard_id uuid, _mode text, _cluster_ids uuid[], _user_id uuid, _cliente_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.preview_dashboard_embed_url(_dashboard_id uuid, _mode text, _cluster_ids uuid[], _user_id uuid, _cliente_id uuid) TO service_role;


--
-- Name: FUNCTION process_stage_cluster_visivel(_etapa_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.process_stage_cluster_visivel(_etapa_id uuid) TO anon;
GRANT ALL ON FUNCTION public.process_stage_cluster_visivel(_etapa_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.process_stage_cluster_visivel(_etapa_id uuid) TO service_role;


--
-- Name: FUNCTION process_stages_cascade_as_is_delete(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.process_stages_cascade_as_is_delete() TO anon;
GRANT ALL ON FUNCTION public.process_stages_cascade_as_is_delete() TO authenticated;
GRANT ALL ON FUNCTION public.process_stages_cascade_as_is_delete() TO service_role;


--
-- Name: FUNCTION psa_mapa_uuid(slug text); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.psa_mapa_uuid(slug text) TO anon;
GRANT ALL ON FUNCTION public.psa_mapa_uuid(slug text) TO authenticated;
GRANT ALL ON FUNCTION public.psa_mapa_uuid(slug text) TO service_role;


--
-- Name: FUNCTION registrar_envio(_canal public.notificacao_canal, _tipo public.notificacao_tipo, _entidade_tipo text, _entidade_id uuid, _notificacao_id uuid, _destinatario_id uuid, _email text, _telefone text, _papel text, _agrupamento text, _sucesso boolean, _erro text, _metadata jsonb); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.registrar_envio(_canal public.notificacao_canal, _tipo public.notificacao_tipo, _entidade_tipo text, _entidade_id uuid, _notificacao_id uuid, _destinatario_id uuid, _email text, _telefone text, _papel text, _agrupamento text, _sucesso boolean, _erro text, _metadata jsonb) FROM PUBLIC;
GRANT ALL ON FUNCTION public.registrar_envio(_canal public.notificacao_canal, _tipo public.notificacao_tipo, _entidade_tipo text, _entidade_id uuid, _notificacao_id uuid, _destinatario_id uuid, _email text, _telefone text, _papel text, _agrupamento text, _sucesso boolean, _erro text, _metadata jsonb) TO anon;
GRANT ALL ON FUNCTION public.registrar_envio(_canal public.notificacao_canal, _tipo public.notificacao_tipo, _entidade_tipo text, _entidade_id uuid, _notificacao_id uuid, _destinatario_id uuid, _email text, _telefone text, _papel text, _agrupamento text, _sucesso boolean, _erro text, _metadata jsonb) TO authenticated;
GRANT ALL ON FUNCTION public.registrar_envio(_canal public.notificacao_canal, _tipo public.notificacao_tipo, _entidade_tipo text, _entidade_id uuid, _notificacao_id uuid, _destinatario_id uuid, _email text, _telefone text, _papel text, _agrupamento text, _sucesso boolean, _erro text, _metadata jsonb) TO service_role;


--
-- Name: FUNCTION resolve_user_cliente_id(_uid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.resolve_user_cliente_id(_uid uuid) TO anon;
GRANT ALL ON FUNCTION public.resolve_user_cliente_id(_uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.resolve_user_cliente_id(_uid uuid) TO service_role;


--
-- Name: FUNCTION resolve_user_cluster_ids(_uid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.resolve_user_cluster_ids(_uid uuid) TO anon;
GRANT ALL ON FUNCTION public.resolve_user_cluster_ids(_uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.resolve_user_cluster_ids(_uid uuid) TO service_role;


--
-- Name: FUNCTION revisar_documento_pendencia(_documento_id uuid, _veredito text, _motivo text); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.revisar_documento_pendencia(_documento_id uuid, _veredito text, _motivo text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.revisar_documento_pendencia(_documento_id uuid, _veredito text, _motivo text) TO anon;
GRANT ALL ON FUNCTION public.revisar_documento_pendencia(_documento_id uuid, _veredito text, _motivo text) TO authenticated;
GRANT ALL ON FUNCTION public.revisar_documento_pendencia(_documento_id uuid, _veredito text, _motivo text) TO service_role;


--
-- Name: FUNCTION set_scenario_updated_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_scenario_updated_at() TO anon;
GRANT ALL ON FUNCTION public.set_scenario_updated_at() TO authenticated;
GRANT ALL ON FUNCTION public.set_scenario_updated_at() TO service_role;


--
-- Name: FUNCTION set_updated_by(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.set_updated_by() TO anon;
GRANT ALL ON FUNCTION public.set_updated_by() TO authenticated;
GRANT ALL ON FUNCTION public.set_updated_by() TO service_role;


--
-- Name: FUNCTION sistema_cluster_visivel(_sistema_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sistema_cluster_visivel(_sistema_id uuid) TO anon;
GRANT ALL ON FUNCTION public.sistema_cluster_visivel(_sistema_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.sistema_cluster_visivel(_sistema_id uuid) TO service_role;


--
-- Name: FUNCTION soft_delete_documento_cliente(_id uuid); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.soft_delete_documento_cliente(_id uuid) FROM PUBLIC;
GRANT ALL ON FUNCTION public.soft_delete_documento_cliente(_id uuid) TO anon;
GRANT ALL ON FUNCTION public.soft_delete_documento_cliente(_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.soft_delete_documento_cliente(_id uuid) TO service_role;


--
-- Name: FUNCTION sprint_visivel(p_sprint_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sprint_visivel(p_sprint_id uuid) TO anon;
GRANT ALL ON FUNCTION public.sprint_visivel(p_sprint_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.sprint_visivel(p_sprint_id uuid) TO service_role;


--
-- Name: FUNCTION sublider_na_os(_ordem_servico_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sublider_na_os(_ordem_servico_id uuid) TO anon;
GRANT ALL ON FUNCTION public.sublider_na_os(_ordem_servico_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.sublider_na_os(_ordem_servico_id uuid) TO service_role;


--
-- Name: FUNCTION sync_profile_access_state(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_profile_access_state() TO anon;
GRANT ALL ON FUNCTION public.sync_profile_access_state() TO authenticated;
GRANT ALL ON FUNCTION public.sync_profile_access_state() TO service_role;


--
-- Name: FUNCTION sync_project_area_from_equipe(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.sync_project_area_from_equipe() TO anon;
GRANT ALL ON FUNCTION public.sync_project_area_from_equipe() TO authenticated;
GRANT ALL ON FUNCTION public.sync_project_area_from_equipe() TO service_role;


--
-- Name: FUNCTION tg_pessoa_conjuge_reciproco(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_pessoa_conjuge_reciproco() TO anon;
GRANT ALL ON FUNCTION public.tg_pessoa_conjuge_reciproco() TO authenticated;
GRANT ALL ON FUNCTION public.tg_pessoa_conjuge_reciproco() TO service_role;


--
-- Name: FUNCTION tg_representante_block_disable_acesso_chamados(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_representante_block_disable_acesso_chamados() TO anon;
GRANT ALL ON FUNCTION public.tg_representante_block_disable_acesso_chamados() TO authenticated;
GRANT ALL ON FUNCTION public.tg_representante_block_disable_acesso_chamados() TO service_role;


--
-- Name: FUNCTION tg_ticket_messages_bloqueia_fechado(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_ticket_messages_bloqueia_fechado() TO anon;
GRANT ALL ON FUNCTION public.tg_ticket_messages_bloqueia_fechado() TO authenticated;
GRANT ALL ON FUNCTION public.tg_ticket_messages_bloqueia_fechado() TO service_role;


--
-- Name: FUNCTION tg_ticket_messages_bloqueia_reenvio(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_ticket_messages_bloqueia_reenvio() TO anon;
GRANT ALL ON FUNCTION public.tg_ticket_messages_bloqueia_reenvio() TO authenticated;
GRANT ALL ON FUNCTION public.tg_ticket_messages_bloqueia_reenvio() TO service_role;


--
-- Name: FUNCTION tg_ticket_messages_reabre_resolvido(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_ticket_messages_reabre_resolvido() TO anon;
GRANT ALL ON FUNCTION public.tg_ticket_messages_reabre_resolvido() TO authenticated;
GRANT ALL ON FUNCTION public.tg_ticket_messages_reabre_resolvido() TO service_role;


--
-- Name: FUNCTION tg_tickets_set_closed_at(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tg_tickets_set_closed_at() TO anon;
GRANT ALL ON FUNCTION public.tg_tickets_set_closed_at() TO authenticated;
GRANT ALL ON FUNCTION public.tg_tickets_set_closed_at() TO service_role;


--
-- Name: FUNCTION ticket_messages_guard_update(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ticket_messages_guard_update() TO anon;
GRANT ALL ON FUNCTION public.ticket_messages_guard_update() TO authenticated;
GRANT ALL ON FUNCTION public.ticket_messages_guard_update() TO service_role;


--
-- Name: FUNCTION titularidade_definir_cliente_da_matricula(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.titularidade_definir_cliente_da_matricula() TO anon;
GRANT ALL ON FUNCTION public.titularidade_definir_cliente_da_matricula() TO authenticated;
GRANT ALL ON FUNCTION public.titularidade_definir_cliente_da_matricula() TO service_role;


--
-- Name: FUNCTION tmpl_bloco_familia_um_nivel(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.tmpl_bloco_familia_um_nivel() TO anon;
GRANT ALL ON FUNCTION public.tmpl_bloco_familia_um_nivel() TO authenticated;
GRANT ALL ON FUNCTION public.tmpl_bloco_familia_um_nivel() TO service_role;


--
-- Name: FUNCTION update_atualizado_em_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_atualizado_em_column() TO anon;
GRANT ALL ON FUNCTION public.update_atualizado_em_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_atualizado_em_column() TO service_role;


--
-- Name: FUNCTION update_updated_at_column(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;


--
-- Name: FUNCTION user_estrutura_area_ids(_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.user_estrutura_area_ids(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.user_estrutura_area_ids(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_estrutura_area_ids(_user_id uuid) TO service_role;


--
-- Name: FUNCTION user_estrutura_equipe_ids(_user_id uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.user_estrutura_equipe_ids(_user_id uuid) TO anon;
GRANT ALL ON FUNCTION public.user_estrutura_equipe_ids(_user_id uuid) TO authenticated;
GRANT ALL ON FUNCTION public.user_estrutura_equipe_ids(_user_id uuid) TO service_role;


--
-- Name: FUNCTION validar_solicitacao_item_nao_aplicavel(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validar_solicitacao_item_nao_aplicavel() TO anon;
GRANT ALL ON FUNCTION public.validar_solicitacao_item_nao_aplicavel() TO authenticated;
GRANT ALL ON FUNCTION public.validar_solicitacao_item_nao_aplicavel() TO service_role;


--
-- Name: FUNCTION validate_correcoes_icms_contribuinte(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_correcoes_icms_contribuinte() TO anon;
GRANT ALL ON FUNCTION public.validate_correcoes_icms_contribuinte() TO authenticated;
GRANT ALL ON FUNCTION public.validate_correcoes_icms_contribuinte() TO service_role;


--
-- Name: FUNCTION validate_org_task_reviewer(); Type: ACL; Schema: public; Owner: -
--

REVOKE ALL ON FUNCTION public.validate_org_task_reviewer() FROM PUBLIC;
GRANT ALL ON FUNCTION public.validate_org_task_reviewer() TO anon;
GRANT ALL ON FUNCTION public.validate_org_task_reviewer() TO authenticated;
GRANT ALL ON FUNCTION public.validate_org_task_reviewer() TO service_role;


--
-- Name: FUNCTION validate_per_contribuinte(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_per_contribuinte() TO anon;
GRANT ALL ON FUNCTION public.validate_per_contribuinte() TO authenticated;
GRANT ALL ON FUNCTION public.validate_per_contribuinte() TO service_role;


--
-- Name: FUNCTION validate_tax_project_contribuinte(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_tax_project_contribuinte() TO anon;
GRANT ALL ON FUNCTION public.validate_tax_project_contribuinte() TO authenticated;
GRANT ALL ON FUNCTION public.validate_tax_project_contribuinte() TO service_role;


--
-- Name: FUNCTION validate_tax_project_external_client(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.validate_tax_project_external_client() TO anon;
GRANT ALL ON FUNCTION public.validate_tax_project_external_client() TO authenticated;
GRANT ALL ON FUNCTION public.validate_tax_project_external_client() TO service_role;


--
-- Name: FUNCTION ve_todas_as_sprints(); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.ve_todas_as_sprints() TO anon;
GRANT ALL ON FUNCTION public.ve_todas_as_sprints() TO authenticated;
GRANT ALL ON FUNCTION public.ve_todas_as_sprints() TO service_role;


--
-- Name: FUNCTION visible_org_project_ids(_uid uuid); Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON FUNCTION public.visible_org_project_ids(_uid uuid) TO anon;
GRANT ALL ON FUNCTION public.visible_org_project_ids(_uid uuid) TO authenticated;
GRANT ALL ON FUNCTION public.visible_org_project_ids(_uid uuid) TO service_role;


--
-- Name: TABLE access_change_log; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.access_change_log TO anon;
GRANT ALL ON TABLE public.access_change_log TO authenticated;
GRANT ALL ON TABLE public.access_change_log TO service_role;


--
-- Name: TABLE administracao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.administracao TO anon;
GRANT ALL ON TABLE public.administracao TO authenticated;
GRANT ALL ON TABLE public.administracao TO service_role;


--
-- Name: TABLE analises_semestrais; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.analises_semestrais TO anon;
GRANT ALL ON TABLE public.analises_semestrais TO authenticated;
GRANT ALL ON TABLE public.analises_semestrais TO service_role;


--
-- Name: TABLE area_servicos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.area_servicos TO anon;
GRANT ALL ON TABLE public.area_servicos TO authenticated;
GRANT ALL ON TABLE public.area_servicos TO service_role;


--
-- Name: TABLE atualizacoes_meta; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.atualizacoes_meta TO anon;
GRANT ALL ON TABLE public.atualizacoes_meta TO authenticated;
GRANT ALL ON TABLE public.atualizacoes_meta TO service_role;


--
-- Name: TABLE audit_logs; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.audit_logs TO anon;
GRANT ALL ON TABLE public.audit_logs TO authenticated;
GRANT ALL ON TABLE public.audit_logs TO service_role;


--
-- Name: TABLE bkp_20260807_ticket_messages_dup; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.bkp_20260807_ticket_messages_dup TO anon;
GRANT ALL ON TABLE public.bkp_20260807_ticket_messages_dup TO authenticated;
GRANT ALL ON TABLE public.bkp_20260807_ticket_messages_dup TO service_role;


--
-- Name: TABLE capital_integralizacao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.capital_integralizacao TO anon;
GRANT ALL ON TABLE public.capital_integralizacao TO authenticated;
GRANT ALL ON TABLE public.capital_integralizacao TO service_role;


--
-- Name: TABLE cartorio; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cartorio TO anon;
GRANT ALL ON TABLE public.cartorio TO authenticated;
GRANT ALL ON TABLE public.cartorio TO service_role;


--
-- Name: TABLE catalog_clients; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.catalog_clients TO anon;
GRANT ALL ON TABLE public.catalog_clients TO authenticated;
GRANT ALL ON TABLE public.catalog_clients TO service_role;


--
-- Name: TABLE centros_custo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.centros_custo TO anon;
GRANT ALL ON TABLE public.centros_custo TO authenticated;
GRANT ALL ON TABLE public.centros_custo TO service_role;


--
-- Name: TABLE checklist_cliente_item; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.checklist_cliente_item TO anon;
GRANT ALL ON TABLE public.checklist_cliente_item TO authenticated;
GRANT ALL ON TABLE public.checklist_cliente_item TO service_role;


--
-- Name: TABLE ciclos_avaliacao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ciclos_avaliacao TO anon;
GRANT ALL ON TABLE public.ciclos_avaliacao TO authenticated;
GRANT ALL ON TABLE public.ciclos_avaliacao TO service_role;


--
-- Name: TABLE client_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_documents TO anon;
GRANT ALL ON TABLE public.client_documents TO authenticated;
GRANT ALL ON TABLE public.client_documents TO service_role;


--
-- Name: TABLE client_visible_projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.client_visible_projects TO anon;
GRANT ALL ON TABLE public.client_visible_projects TO authenticated;
GRANT ALL ON TABLE public.client_visible_projects TO service_role;


--
-- Name: TABLE cliente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cliente TO anon;
GRANT ALL ON TABLE public.cliente TO authenticated;
GRANT ALL ON TABLE public.cliente TO service_role;


--
-- Name: TABLE cliente_clusters; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cliente_clusters TO anon;
GRANT ALL ON TABLE public.cliente_clusters TO authenticated;
GRANT ALL ON TABLE public.cliente_clusters TO service_role;


--
-- Name: TABLE cliente_setor_regiao_atual; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cliente_setor_regiao_atual TO anon;
GRANT ALL ON TABLE public.cliente_setor_regiao_atual TO authenticated;
GRANT ALL ON TABLE public.cliente_setor_regiao_atual TO service_role;


--
-- Name: TABLE documento_arquivo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documento_arquivo TO anon;
GRANT ALL ON TABLE public.documento_arquivo TO authenticated;
GRANT ALL ON TABLE public.documento_arquivo TO service_role;


--
-- Name: TABLE pessoa; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pessoa TO anon;
GRANT ALL ON TABLE public.pessoa TO authenticated;
GRANT ALL ON TABLE public.pessoa TO service_role;


--
-- Name: TABLE cobertura_documentos_cliente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.cobertura_documentos_cliente TO service_role;
GRANT SELECT ON TABLE public.cobertura_documentos_cliente TO authenticated;


--
-- Name: TABLE codigo_receita; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.codigo_receita TO anon;
GRANT ALL ON TABLE public.codigo_receita TO authenticated;
GRANT ALL ON TABLE public.codigo_receita TO service_role;


--
-- Name: TABLE comentarios_avaliacao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.comentarios_avaliacao TO anon;
GRANT ALL ON TABLE public.comentarios_avaliacao TO authenticated;
GRANT ALL ON TABLE public.comentarios_avaliacao TO service_role;


--
-- Name: TABLE contatos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.contatos TO anon;
GRANT ALL ON TABLE public.contatos TO authenticated;
GRANT ALL ON TABLE public.contatos TO service_role;


--
-- Name: TABLE contribuinte; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.contribuinte TO anon;
GRANT ALL ON TABLE public.contribuinte TO authenticated;
GRANT ALL ON TABLE public.contribuinte TO service_role;


--
-- Name: TABLE contribuinte_bal_config; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.contribuinte_bal_config TO anon;
GRANT ALL ON TABLE public.contribuinte_bal_config TO authenticated;
GRANT ALL ON TABLE public.contribuinte_bal_config TO service_role;


--
-- Name: TABLE correcoes_icms; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.correcoes_icms TO anon;
GRANT ALL ON TABLE public.correcoes_icms TO authenticated;
GRANT ALL ON TABLE public.correcoes_icms TO service_role;


--
-- Name: TABLE daily_standups; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.daily_standups TO anon;
GRANT ALL ON TABLE public.daily_standups TO authenticated;
GRANT ALL ON TABLE public.daily_standups TO service_role;


--
-- Name: TABLE dashboard_cliente_access; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dashboard_cliente_access TO anon;
GRANT ALL ON TABLE public.dashboard_cliente_access TO authenticated;
GRANT ALL ON TABLE public.dashboard_cliente_access TO service_role;


--
-- Name: TABLE dashboard_cluster_access; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dashboard_cluster_access TO anon;
GRANT ALL ON TABLE public.dashboard_cluster_access TO authenticated;
GRANT ALL ON TABLE public.dashboard_cluster_access TO service_role;


--
-- Name: TABLE dashboards; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dashboards TO anon;
GRANT ALL ON TABLE public.dashboards TO authenticated;
GRANT ALL ON TABLE public.dashboards TO service_role;


--
-- Name: TABLE dcomp; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.dcomp TO anon;
GRANT ALL ON TABLE public.dcomp TO authenticated;
GRANT ALL ON TABLE public.dcomp TO service_role;


--
-- Name: TABLE deliverable_attachments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.deliverable_attachments TO anon;
GRANT ALL ON TABLE public.deliverable_attachments TO authenticated;
GRANT ALL ON TABLE public.deliverable_attachments TO service_role;


--
-- Name: TABLE demand_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.demand_items TO anon;
GRANT ALL ON TABLE public.demand_items TO authenticated;
GRANT ALL ON TABLE public.demand_items TO service_role;


--
-- Name: TABLE difal_decisao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.difal_decisao TO anon;
GRANT ALL ON TABLE public.difal_decisao TO authenticated;
GRANT ALL ON TABLE public.difal_decisao TO service_role;


--
-- Name: TABLE difal_sessao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.difal_sessao TO anon;
GRANT ALL ON TABLE public.difal_sessao TO authenticated;
GRANT ALL ON TABLE public.difal_sessao TO service_role;


--
-- Name: TABLE distribuicao_dcomp; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.distribuicao_dcomp TO anon;
GRANT ALL ON TABLE public.distribuicao_dcomp TO authenticated;
GRANT ALL ON TABLE public.distribuicao_dcomp TO service_role;


--
-- Name: TABLE distribuicao_receita; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.distribuicao_receita TO anon;
GRANT ALL ON TABLE public.distribuicao_receita TO authenticated;
GRANT ALL ON TABLE public.distribuicao_receita TO service_role;


--
-- Name: TABLE documento_gerado; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documento_gerado TO anon;
GRANT ALL ON TABLE public.documento_gerado TO authenticated;
GRANT ALL ON TABLE public.documento_gerado TO service_role;


--
-- Name: TABLE documento_horas_historico; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documento_horas_historico TO anon;
GRANT ALL ON TABLE public.documento_horas_historico TO authenticated;
GRANT ALL ON TABLE public.documento_horas_historico TO service_role;


--
-- Name: SEQUENCE documento_horas_historico_id_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.documento_horas_historico_id_seq TO anon;
GRANT ALL ON SEQUENCE public.documento_horas_historico_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.documento_horas_historico_id_seq TO service_role;


--
-- Name: TABLE documento_notificacao_visto; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documento_notificacao_visto TO anon;
GRANT ALL ON TABLE public.documento_notificacao_visto TO authenticated;
GRANT ALL ON TABLE public.documento_notificacao_visto TO service_role;


--
-- Name: TABLE documento_override; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documento_override TO anon;
GRANT ALL ON TABLE public.documento_override TO authenticated;
GRANT ALL ON TABLE public.documento_override TO service_role;


--
-- Name: TABLE documento_tipo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documento_tipo TO anon;
GRANT ALL ON TABLE public.documento_tipo TO authenticated;
GRANT ALL ON TABLE public.documento_tipo TO service_role;


--
-- Name: TABLE documentos_processo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documentos_processo TO anon;
GRANT ALL ON TABLE public.documentos_processo TO authenticated;
GRANT ALL ON TABLE public.documentos_processo TO service_role;


--
-- Name: TABLE documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.documents TO anon;
GRANT ALL ON TABLE public.documents TO authenticated;
GRANT ALL ON TABLE public.documents TO service_role;


--
-- Name: TABLE efd_correcoes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.efd_correcoes TO anon;
GRANT ALL ON TABLE public.efd_correcoes TO authenticated;
GRANT ALL ON TABLE public.efd_correcoes TO service_role;


--
-- Name: TABLE estrutura_areas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.estrutura_areas TO anon;
GRANT ALL ON TABLE public.estrutura_areas TO authenticated;
GRANT ALL ON TABLE public.estrutura_areas TO service_role;


--
-- Name: TABLE estrutura_clusters; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.estrutura_clusters TO anon;
GRANT ALL ON TABLE public.estrutura_clusters TO authenticated;
GRANT ALL ON TABLE public.estrutura_clusters TO service_role;


--
-- Name: TABLE estrutura_equipe_membros; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.estrutura_equipe_membros TO anon;
GRANT ALL ON TABLE public.estrutura_equipe_membros TO authenticated;
GRANT ALL ON TABLE public.estrutura_equipe_membros TO service_role;


--
-- Name: TABLE estrutura_equipes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.estrutura_equipes TO anon;
GRANT ALL ON TABLE public.estrutura_equipes TO authenticated;
GRANT ALL ON TABLE public.estrutura_equipes TO service_role;


--
-- Name: TABLE etapa_documentos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.etapa_documentos TO anon;
GRANT ALL ON TABLE public.etapa_documentos TO authenticated;
GRANT ALL ON TABLE public.etapa_documentos TO service_role;


--
-- Name: TABLE etapa_responsaveis; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.etapa_responsaveis TO anon;
GRANT ALL ON TABLE public.etapa_responsaveis TO authenticated;
GRANT ALL ON TABLE public.etapa_responsaveis TO service_role;


--
-- Name: TABLE etapa_sistemas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.etapa_sistemas TO anon;
GRANT ALL ON TABLE public.etapa_sistemas TO authenticated;
GRANT ALL ON TABLE public.etapa_sistemas TO service_role;


--
-- Name: TABLE exploracao_rural; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.exploracao_rural TO anon;
GRANT ALL ON TABLE public.exploracao_rural TO authenticated;
GRANT ALL ON TABLE public.exploracao_rural TO service_role;


--
-- Name: TABLE export_profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.export_profiles TO anon;
GRANT ALL ON TABLE public.export_profiles TO authenticated;
GRANT ALL ON TABLE public.export_profiles TO service_role;


--
-- Name: TABLE feedbacks; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.feedbacks TO anon;
GRANT ALL ON TABLE public.feedbacks TO authenticated;
GRANT ALL ON TABLE public.feedbacks TO service_role;


--
-- Name: TABLE gargalo_etapas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.gargalo_etapas TO anon;
GRANT ALL ON TABLE public.gargalo_etapas TO authenticated;
GRANT ALL ON TABLE public.gargalo_etapas TO service_role;


--
-- Name: TABLE gargalo_melhorias; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.gargalo_melhorias TO anon;
GRANT ALL ON TABLE public.gargalo_melhorias TO authenticated;
GRANT ALL ON TABLE public.gargalo_melhorias TO service_role;


--
-- Name: TABLE gargalo_processos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.gargalo_processos TO anon;
GRANT ALL ON TABLE public.gargalo_processos TO authenticated;
GRANT ALL ON TABLE public.gargalo_processos TO service_role;


--
-- Name: TABLE gargalo_responsaveis; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.gargalo_responsaveis TO anon;
GRANT ALL ON TABLE public.gargalo_responsaveis TO authenticated;
GRANT ALL ON TABLE public.gargalo_responsaveis TO service_role;


--
-- Name: TABLE gargalos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.gargalos TO anon;
GRANT ALL ON TABLE public.gargalos TO authenticated;
GRANT ALL ON TABLE public.gargalos TO service_role;


--
-- Name: TABLE grupo_tributo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.grupo_tributo TO anon;
GRANT ALL ON TABLE public.grupo_tributo TO authenticated;
GRANT ALL ON TABLE public.grupo_tributo TO service_role;


--
-- Name: TABLE impedimento; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.impedimento TO anon;
GRANT ALL ON TABLE public.impedimento TO authenticated;
GRANT ALL ON TABLE public.impedimento TO service_role;


--
-- Name: TABLE improvement_savings_details; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.improvement_savings_details TO anon;
GRANT ALL ON TABLE public.improvement_savings_details TO authenticated;
GRANT ALL ON TABLE public.improvement_savings_details TO service_role;


--
-- Name: TABLE improvement_team_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.improvement_team_members TO anon;
GRANT ALL ON TABLE public.improvement_team_members TO authenticated;
GRANT ALL ON TABLE public.improvement_team_members TO service_role;


--
-- Name: TABLE inscricao_contribuinte; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.inscricao_contribuinte TO anon;
GRANT ALL ON TABLE public.inscricao_contribuinte TO authenticated;
GRANT ALL ON TABLE public.inscricao_contribuinte TO service_role;


--
-- Name: TABLE itens_acao_1a1; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.itens_acao_1a1 TO anon;
GRANT ALL ON TABLE public.itens_acao_1a1 TO authenticated;
GRANT ALL ON TABLE public.itens_acao_1a1 TO service_role;


--
-- Name: TABLE job_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.job_roles TO anon;
GRANT ALL ON TABLE public.job_roles TO authenticated;
GRANT ALL ON TABLE public.job_roles TO service_role;


--
-- Name: TABLE kpis_meta; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.kpis_meta TO anon;
GRANT ALL ON TABLE public.kpis_meta TO authenticated;
GRANT ALL ON TABLE public.kpis_meta TO service_role;


--
-- Name: TABLE melhoria_acoes_td; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.melhoria_acoes_td TO anon;
GRANT ALL ON TABLE public.melhoria_acoes_td TO authenticated;
GRANT ALL ON TABLE public.melhoria_acoes_td TO service_role;


--
-- Name: TABLE melhoria_processos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.melhoria_processos TO anon;
GRANT ALL ON TABLE public.melhoria_processos TO authenticated;
GRANT ALL ON TABLE public.melhoria_processos TO service_role;


--
-- Name: TABLE melhoria_responsaveis; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.melhoria_responsaveis TO anon;
GRANT ALL ON TABLE public.melhoria_responsaveis TO authenticated;
GRANT ALL ON TABLE public.melhoria_responsaveis TO service_role;


--
-- Name: TABLE melhoria_sistemas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.melhoria_sistemas TO anon;
GRANT ALL ON TABLE public.melhoria_sistemas TO authenticated;
GRANT ALL ON TABLE public.melhoria_sistemas TO service_role;


--
-- Name: TABLE metas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.metas TO anon;
GRANT ALL ON TABLE public.metas TO authenticated;
GRANT ALL ON TABLE public.metas TO service_role;


--
-- Name: TABLE notificacao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notificacao TO service_role;
GRANT SELECT ON TABLE public.notificacao TO authenticated;


--
-- Name: COLUMN notificacao.lido_em; Type: ACL; Schema: public; Owner: -
--

GRANT UPDATE(lido_em) ON TABLE public.notificacao TO authenticated;


--
-- Name: TABLE notificacao_envio; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.notificacao_envio TO service_role;
GRANT SELECT ON TABLE public.notificacao_envio TO authenticated;


--
-- Name: TABLE novidades; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.novidades TO anon;
GRANT ALL ON TABLE public.novidades TO authenticated;
GRANT ALL ON TABLE public.novidades TO service_role;


--
-- Name: TABLE org_comment_mentions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.org_comment_mentions TO anon;
GRANT ALL ON TABLE public.org_comment_mentions TO authenticated;
GRANT ALL ON TABLE public.org_comment_mentions TO service_role;


--
-- Name: TABLE org_project_members; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.org_project_members TO anon;
GRANT ALL ON TABLE public.org_project_members TO authenticated;
GRANT ALL ON TABLE public.org_project_members TO service_role;


--
-- Name: TABLE org_task_comments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.org_task_comments TO anon;
GRANT ALL ON TABLE public.org_task_comments TO authenticated;
GRANT ALL ON TABLE public.org_task_comments TO service_role;


--
-- Name: TABLE os_produtos_contratados; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.os_produtos_contratados TO anon;
GRANT ALL ON TABLE public.os_produtos_contratados TO authenticated;
GRANT ALL ON TABLE public.os_produtos_contratados TO service_role;


--
-- Name: TABLE page_permissions; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.page_permissions TO anon;
GRANT ALL ON TABLE public.page_permissions TO authenticated;
GRANT ALL ON TABLE public.page_permissions TO service_role;


--
-- Name: TABLE parentesco; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.parentesco TO anon;
GRANT ALL ON TABLE public.parentesco TO authenticated;
GRANT ALL ON TABLE public.parentesco TO service_role;


--
-- Name: TABLE per; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.per TO anon;
GRANT ALL ON TABLE public.per TO authenticated;
GRANT ALL ON TABLE public.per TO service_role;


--
-- Name: TABLE per_situacao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.per_situacao TO anon;
GRANT ALL ON TABLE public.per_situacao TO authenticated;
GRANT ALL ON TABLE public.per_situacao TO service_role;


--
-- Name: TABLE per_with_contribuinte; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.per_with_contribuinte TO anon;
GRANT ALL ON TABLE public.per_with_contribuinte TO authenticated;
GRANT ALL ON TABLE public.per_with_contribuinte TO service_role;


--
-- Name: TABLE performance_preferencias; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.performance_preferencias TO anon;
GRANT ALL ON TABLE public.performance_preferencias TO authenticated;
GRANT ALL ON TABLE public.performance_preferencias TO service_role;


--
-- Name: TABLE pis_cofins_class; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pis_cofins_class TO anon;
GRANT ALL ON TABLE public.pis_cofins_class TO authenticated;
GRANT ALL ON TABLE public.pis_cofins_class TO service_role;


--
-- Name: TABLE pis_cofins_regra; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.pis_cofins_regra TO anon;
GRANT ALL ON TABLE public.pis_cofins_regra TO authenticated;
GRANT ALL ON TABLE public.pis_cofins_regra TO service_role;


--
-- Name: TABLE ppr_regras_ciclo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ppr_regras_ciclo TO anon;
GRANT ALL ON TABLE public.ppr_regras_ciclo TO authenticated;
GRANT ALL ON TABLE public.ppr_regras_ciclo TO service_role;


--
-- Name: TABLE procedimentos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.procedimentos TO anon;
GRANT ALL ON TABLE public.procedimentos TO authenticated;
GRANT ALL ON TABLE public.procedimentos TO service_role;


--
-- Name: TABLE process_improvements; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.process_improvements TO anon;
GRANT ALL ON TABLE public.process_improvements TO authenticated;
GRANT ALL ON TABLE public.process_improvements TO service_role;


--
-- Name: TABLE process_scenarios; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.process_scenarios TO anon;
GRANT ALL ON TABLE public.process_scenarios TO authenticated;
GRANT ALL ON TABLE public.process_scenarios TO service_role;


--
-- Name: TABLE process_stages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.process_stages TO anon;
GRANT ALL ON TABLE public.process_stages TO authenticated;
GRANT ALL ON TABLE public.process_stages TO service_role;


--
-- Name: TABLE processes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.processes TO anon;
GRANT ALL ON TABLE public.processes TO authenticated;
GRANT ALL ON TABLE public.processes TO service_role;


--
-- Name: TABLE produto_documento_tipo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.produto_documento_tipo TO anon;
GRANT ALL ON TABLE public.produto_documento_tipo TO authenticated;
GRANT ALL ON TABLE public.produto_documento_tipo TO service_role;


--
-- Name: TABLE produto_segmento; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.produto_segmento TO anon;
GRANT ALL ON TABLE public.produto_segmento TO authenticated;
GRANT ALL ON TABLE public.produto_segmento TO service_role;


--
-- Name: TABLE produto_servico; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.produto_servico TO anon;
GRANT ALL ON TABLE public.produto_servico TO authenticated;
GRANT ALL ON TABLE public.produto_servico TO service_role;


--
-- Name: TABLE profiles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;


--
-- Name: TABLE profiles_safe; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.profiles_safe TO authenticated;
GRANT ALL ON TABLE public.profiles_safe TO service_role;


--
-- Name: TABLE project_documents; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_documents TO anon;
GRANT ALL ON TABLE public.project_documents TO authenticated;
GRANT ALL ON TABLE public.project_documents TO service_role;


--
-- Name: TABLE project_processes; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_processes TO anon;
GRANT ALL ON TABLE public.project_processes TO authenticated;
GRANT ALL ON TABLE public.project_processes TO service_role;


--
-- Name: TABLE project_servicos; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.project_servicos TO anon;
GRANT ALL ON TABLE public.project_servicos TO authenticated;
GRANT ALL ON TABLE public.project_servicos TO service_role;


--
-- Name: TABLE projects; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.projects TO anon;
GRANT ALL ON TABLE public.projects TO authenticated;
GRANT ALL ON TABLE public.projects TO service_role;


--
-- Name: TABLE projeto_flag_valor; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.projeto_flag_valor TO anon;
GRANT ALL ON TABLE public.projeto_flag_valor TO authenticated;
GRANT ALL ON TABLE public.projeto_flag_valor TO service_role;


--
-- Name: TABLE projeto_justificativas; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.projeto_justificativas TO anon;
GRANT ALL ON TABLE public.projeto_justificativas TO authenticated;
GRANT ALL ON TABLE public.projeto_justificativas TO service_role;


--
-- Name: TABLE quadro_societario; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.quadro_societario TO anon;
GRANT ALL ON TABLE public.quadro_societario TO authenticated;
GRANT ALL ON TABLE public.quadro_societario TO service_role;


--
-- Name: TABLE relatorios_gerados; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.relatorios_gerados TO anon;
GRANT ALL ON TABLE public.relatorios_gerados TO authenticated;
GRANT ALL ON TABLE public.relatorios_gerados TO service_role;


--
-- Name: TABLE representante; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.representante TO anon;
GRANT ALL ON TABLE public.representante TO authenticated;
GRANT ALL ON TABLE public.representante TO service_role;


--
-- Name: TABLE reunioes_1a1; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.reunioes_1a1 TO anon;
GRANT ALL ON TABLE public.reunioes_1a1 TO authenticated;
GRANT ALL ON TABLE public.reunioes_1a1 TO service_role;


--
-- Name: TABLE rls_precheck_allowed_tables; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.rls_precheck_allowed_tables TO anon;
GRANT ALL ON TABLE public.rls_precheck_allowed_tables TO authenticated;
GRANT ALL ON TABLE public.rls_precheck_allowed_tables TO service_role;


--
-- Name: TABLE roi_snapshots; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.roi_snapshots TO anon;
GRANT ALL ON TABLE public.roi_snapshots TO authenticated;
GRANT ALL ON TABLE public.roi_snapshots TO service_role;


--
-- Name: TABLE routines; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.routines TO anon;
GRANT ALL ON TABLE public.routines TO authenticated;
GRANT ALL ON TABLE public.routines TO service_role;


--
-- Name: TABLE servicos_prestados; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.servicos_prestados TO anon;
GRANT ALL ON TABLE public.servicos_prestados TO authenticated;
GRANT ALL ON TABLE public.servicos_prestados TO service_role;


--
-- Name: TABLE setor_cliente; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.setor_cliente TO anon;
GRANT ALL ON TABLE public.setor_cliente TO authenticated;
GRANT ALL ON TABLE public.setor_cliente TO service_role;


--
-- Name: TABLE sistema_clusters; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sistema_clusters TO anon;
GRANT ALL ON TABLE public.sistema_clusters TO authenticated;
GRANT ALL ON TABLE public.sistema_clusters TO service_role;


--
-- Name: TABLE sistema_responsaveis; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sistema_responsaveis TO anon;
GRANT ALL ON TABLE public.sistema_responsaveis TO authenticated;
GRANT ALL ON TABLE public.sistema_responsaveis TO service_role;


--
-- Name: TABLE sistemas_processo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sistemas_processo TO anon;
GRANT ALL ON TABLE public.sistemas_processo TO authenticated;
GRANT ALL ON TABLE public.sistemas_processo TO service_role;


--
-- Name: TABLE solicitacao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.solicitacao TO authenticated;
GRANT ALL ON TABLE public.solicitacao TO service_role;


--
-- Name: TABLE solicitacao_item; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.solicitacao_item TO authenticated;
GRANT ALL ON TABLE public.solicitacao_item TO service_role;


--
-- Name: TABLE solicitacao_item_nao_aplicavel; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.solicitacao_item_nao_aplicavel TO authenticated;
GRANT ALL ON TABLE public.solicitacao_item_nao_aplicavel TO service_role;


--
-- Name: TABLE sprint_backlog_items; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sprint_backlog_items TO anon;
GRANT ALL ON TABLE public.sprint_backlog_items TO authenticated;
GRANT ALL ON TABLE public.sprint_backlog_items TO service_role;


--
-- Name: TABLE sprint_deliverables; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sprint_deliverables TO anon;
GRANT ALL ON TABLE public.sprint_deliverables TO authenticated;
GRANT ALL ON TABLE public.sprint_deliverables TO service_role;


--
-- Name: TABLE sprint_deliverables_backup_20260809; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sprint_deliverables_backup_20260809 TO service_role;


--
-- Name: TABLE sprint_events; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sprint_events TO anon;
GRANT ALL ON TABLE public.sprint_events TO authenticated;
GRANT ALL ON TABLE public.sprint_events TO service_role;


--
-- Name: TABLE sprint_metrics; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sprint_metrics TO anon;
GRANT ALL ON TABLE public.sprint_metrics TO authenticated;
GRANT ALL ON TABLE public.sprint_metrics TO service_role;


--
-- Name: TABLE sprints; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sprints TO anon;
GRANT ALL ON TABLE public.sprints TO authenticated;
GRANT ALL ON TABLE public.sprints TO service_role;


--
-- Name: TABLE sprint_resumo; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.sprint_resumo TO anon;
GRANT ALL ON TABLE public.sprint_resumo TO authenticated;
GRANT ALL ON TABLE public.sprint_resumo TO service_role;


--
-- Name: TABLE ticket_attachments; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ticket_attachments TO anon;
GRANT ALL ON TABLE public.ticket_attachments TO authenticated;
GRANT ALL ON TABLE public.ticket_attachments TO service_role;


--
-- Name: TABLE ticket_messages; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.ticket_messages TO anon;
GRANT ALL ON TABLE public.ticket_messages TO authenticated;
GRANT ALL ON TABLE public.ticket_messages TO service_role;


--
-- Name: TABLE tickets; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tickets TO anon;
GRANT ALL ON TABLE public.tickets TO authenticated;
GRANT ALL ON TABLE public.tickets TO service_role;


--
-- Name: TABLE titularidade; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.titularidade TO anon;
GRANT ALL ON TABLE public.titularidade TO authenticated;
GRANT ALL ON TABLE public.titularidade TO service_role;


--
-- Name: TABLE tmpl_bloco; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tmpl_bloco TO anon;
GRANT ALL ON TABLE public.tmpl_bloco TO authenticated;
GRANT ALL ON TABLE public.tmpl_bloco TO service_role;


--
-- Name: TABLE tmpl_bloco_flag; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tmpl_bloco_flag TO anon;
GRANT ALL ON TABLE public.tmpl_bloco_flag TO authenticated;
GRANT ALL ON TABLE public.tmpl_bloco_flag TO service_role;


--
-- Name: TABLE tmpl_bloco_versao; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tmpl_bloco_versao TO anon;
GRANT ALL ON TABLE public.tmpl_bloco_versao TO authenticated;
GRANT ALL ON TABLE public.tmpl_bloco_versao TO service_role;


--
-- Name: TABLE tmpl_documento; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tmpl_documento TO anon;
GRANT ALL ON TABLE public.tmpl_documento TO authenticated;
GRANT ALL ON TABLE public.tmpl_documento TO service_role;


--
-- Name: TABLE tmpl_documento_bloco; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tmpl_documento_bloco TO anon;
GRANT ALL ON TABLE public.tmpl_documento_bloco TO authenticated;
GRANT ALL ON TABLE public.tmpl_documento_bloco TO service_role;


--
-- Name: TABLE tmpl_flag; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tmpl_flag TO anon;
GRANT ALL ON TABLE public.tmpl_flag TO authenticated;
GRANT ALL ON TABLE public.tmpl_flag TO service_role;


--
-- Name: TABLE tool_area_access; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tool_area_access TO anon;
GRANT ALL ON TABLE public.tool_area_access TO authenticated;
GRANT ALL ON TABLE public.tool_area_access TO service_role;


--
-- Name: TABLE tools; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.tools TO anon;
GRANT ALL ON TABLE public.tools TO authenticated;
GRANT ALL ON TABLE public.tools TO service_role;


--
-- Name: TABLE user_page_access; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_page_access TO anon;
GRANT ALL ON TABLE public.user_page_access TO authenticated;
GRANT ALL ON TABLE public.user_page_access TO service_role;


--
-- Name: TABLE user_roles; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON TABLE public.user_roles TO anon;
GRANT ALL ON TABLE public.user_roles TO authenticated;
GRANT ALL ON TABLE public.user_roles TO service_role;


--
-- Name: SEQUENCE work_package_code_seq; Type: ACL; Schema: public; Owner: -
--

GRANT ALL ON SEQUENCE public.work_package_code_seq TO anon;
GRANT ALL ON SEQUENCE public.work_package_code_seq TO authenticated;
GRANT ALL ON SEQUENCE public.work_package_code_seq TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR SEQUENCES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR FUNCTIONS; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;


--
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: public; Owner: -
--



--
-- PostgreSQL database dump complete
--
