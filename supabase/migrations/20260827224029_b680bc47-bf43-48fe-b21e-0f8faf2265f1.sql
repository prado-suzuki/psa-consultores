CREATE OR REPLACE FUNCTION public.notificar_projetos_da_os(
  _solicitacao_id uuid,
  _evento         text,
  _detalhe        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid      uuid := auth.uid();
  v_sol      record;
  v_tipo     public.notificacao_tipo;
  v_kind     public.org_comment_kind;
  v_titulo   text;
  v_corpo    text;
  v_autor    text;
  v_dia      text := to_char((now() AT TIME ZONE 'America/Cuiaba')::date, 'YYYY-MM-DD');
  v_prefixo  text;
  v_agrupa   text;
  v_envio    uuid;
  v_projetos int := 0;
  v_eventos  int := 0;
  v_sinos    int := 0;
  v_proj     record;
  v_part     record;
BEGIN
  IF v_uid IS NULL OR NOT public.has_role_or_higher(v_uid, 'team_member'::public.app_role) THEN
    RAISE EXCEPTION 'Sem permissao para registrar aviso nos projetos da OS'
      USING ERRCODE = '42501';
  END IF;

  SELECT s.id, s.cliente_id, s.ordem_servico_id
    INTO v_sol
  FROM public.solicitacao s
  WHERE s.id = _solicitacao_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Solicitacao % nao encontrada', _solicitacao_id USING ERRCODE = '23503';
  END IF;

  CASE _evento
    WHEN 'solicitacao_enviada' THEN
      v_tipo   := 'solicitacao_enviada';
      v_kind   := 'documentos_solicitados';
      v_titulo := 'Documentos solicitados ao cliente';
      v_corpo  := 'Lista de documentos enviada ao cliente. O acesso ao portal foi liberado.';
    WHEN 'situacao_documentos' THEN
      v_tipo   := 'cobranca_pendencia';
      v_kind   := 'documentos_cobrados';
      v_titulo := 'Documentos cobrados do cliente';
      v_corpo  := 'Cobrança de documentos pendentes enviada ao cliente.';
    WHEN 'documento_aprovado' THEN
      v_tipo   := 'documento_aprovado';
      v_kind   := 'documentos_conferidos';
      v_titulo := 'Solicitação encerrada';
      v_corpo  := 'Solicitação encerrada após a conferência da documentação.';
    ELSE
      RAISE EXCEPTION 'Evento desconhecido: %', _evento USING ERRCODE = '23514';
  END CASE;

  IF _detalhe IS NOT NULL AND btrim(_detalhe) <> '' THEN
    v_corpo := v_corpo || ' ' || btrim(_detalhe);
  END IF;

  IF v_sol.ordem_servico_id IS NULL THEN
    RETURN jsonb_build_object('projetos', 0, 'eventos', 0, 'sinos', 0, 'motivo', 'sem_os');
  END IF;

  v_prefixo := v_tipo::text || ':solicitacao:' || v_sol.id::text || ':sino:';
  v_agrupa  := v_tipo::text || ':solicitacao:' || v_sol.id::text;

  SELECT nullif(btrim(p.first_name || ' ' || coalesce(p.last_name, '')), '')
    INTO v_autor
  FROM public.profiles p
  WHERE p.id = v_uid;
  v_autor := coalesce(v_autor, 'Sistema');

  FOR v_proj IN
    SELECT p.id
    FROM public.org_projects p
    WHERE p.ordem_servico_id = v_sol.ordem_servico_id
    ORDER BY p.created_at, p.id
  LOOP
    v_projetos := v_projetos + 1;

    v_envio := public.reservar_envio(
      _chave         => v_prefixo || 'proj:' || v_proj.id::text || ':' || v_dia,
      _canal         => 'sino'::public.notificacao_canal,
      _tipo          => v_tipo,
      _entidade_tipo => 'org_project',
      _entidade_id   => v_proj.id,
      _metadata      => jsonb_build_object('solicitacao_id', v_sol.id, 'evento', _evento)
    );

    IF v_envio IS NOT NULL THEN
      INSERT INTO public.org_comments (entity_type, entity_id, author_id, author_name, body, kind)
      VALUES ('org_project'::public.org_comment_entity, v_proj.id, v_uid, v_autor, v_corpo, v_kind);

      PERFORM public.confirmar_envio(v_envio, 'enviado'::public.notificacao_envio_status);
      v_eventos := v_eventos + 1;
    END IF;
  END LOOP;

  FOR v_part IN
    SELECT DISTINCT ON (x.u) x.u AS user_id, p.id AS project_id
    FROM public.org_projects p
    CROSS JOIN LATERAL (
      SELECT m.user_id AS u FROM public.org_project_members m WHERE m.project_id = p.id
      UNION SELECT p.responsible_id
      UNION SELECT p.leader_id
    ) x
    WHERE p.ordem_servico_id = v_sol.ordem_servico_id
      AND x.u IS NOT NULL
      AND x.u <> v_uid
    ORDER BY x.u, p.created_at, p.id
  LOOP
    v_envio := public.reservar_envio(
      _chave           => v_prefixo || v_part.user_id::text || ':' || v_dia,
      _canal           => 'sino'::public.notificacao_canal,
      _tipo            => v_tipo,
      _entidade_tipo   => 'org_project',
      _entidade_id     => v_part.project_id,
      _destinatario_id => v_part.user_id,
      _metadata        => jsonb_build_object('solicitacao_id', v_sol.id, 'evento', _evento)
    );

    IF v_envio IS NOT NULL THEN
      PERFORM public.criar_notificacao(
        _destinatario_id => v_part.user_id,
        _tipo            => v_tipo,
        _titulo          => v_titulo,
        _entidade_tipo   => 'org_project',
        _entidade_id     => v_part.project_id,
        _corpo           => v_corpo,
        _href            => NULL,
        _agrupamento     => v_agrupa,
        _metadata        => jsonb_build_object('solicitacao_id', v_sol.id, 'evento', _evento)
      );

      PERFORM public.confirmar_envio(v_envio, 'enviado'::public.notificacao_envio_status);
      v_sinos := v_sinos + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'projetos', v_projetos,
    'eventos',  v_eventos,
    'sinos',    v_sinos
  );
END;
$function$;