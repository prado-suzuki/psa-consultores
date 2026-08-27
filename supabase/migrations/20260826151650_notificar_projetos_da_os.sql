-- 20260826151650_notificar_projetos_da_os.sql
-- GES-03 · os tres eventos da solicitacao OSG passam a registrar SINO INTERNO e
-- EVENTO NA THREAD de cada projeto da ordem de servico.
--
-- Conferido no banco em 26/08/2026, nao presumido:
--   . 66 OS tem projeto; 18 delas tem MAIS DE UM projeto (max 8).
--   . Em 16 dessas 18 o conjunto de participantes DIFERE entre os projetos da
--     mesma OS, e uma OS chega a 15 pessoas distintas.
--   . `notificacao` tem 26 linhas e NENHUMA dos tres tipos desta migracao: o
--     lado interno destes eventos nunca existiu.
--   . `notificacao_envio` tem 67 linhas, ou seja, o lado externo (e-mail e
--     WhatsApp, via n8n) roda e NAO e tocado aqui.
--
-- O QUE ESTA MIGRACAO SUBSTITUI. O lado interno existia so para o evento 1, em
-- src/lib/avisoSolicitacaoEnviada.ts, e a regra era: um projeto pela OS, senao um
-- projeto pelo cliente, e ao achar MAIS DE UM devolvia null e nao publicava nada.
-- Nas 18 OS multiprojeto isso e silencio garantido. Os dois arquivos do front
-- saem junto com esta migracao.
--
-- TRES DECISOES QUE GOVERNAM O DESENHO, e valem para quem mexer aqui depois:
--
-- 1. SECURITY DEFINER, e e deliberado. O criterio de aceite da GES-03 e "uma
--    entrada em TODOS os projetos da OS". A politica org_comments_insert exige
--    project_id = ANY (visible_org_project_ids(auth.uid())), e como o participante
--    do projeto A quase nunca esta no projeto B da mesma OS (16 de 18, medido
--    acima), com RLS de chamador o recado sairia em um projeto e as outras threads
--    ficariam mudas. Quem publica aqui e o SISTEMA; o analista entra como autor
--    para dar rastro, nao como quem pede permissao. A tranca esta no primeiro
--    bloco: papel de equipe, o que fecha a porta para o usuario do portal do
--    cliente, que tambem e `authenticated`.
--    Autorizado pelo Bernardo em 26/08/2026: "todas as pessoas relacionadas aos
--    projetos da OS devem ver o aviso".
--
-- 2. A CHAVE DE OCORRENCIA REUSA notificacao_envio NO CANAL `sino`. O valor
--    `sino` existe no enum notificacao_canal desde a EDU-1 e nunca foi usado: a
--    borda `notificar` roda com CANAIS = ['email','whatsapp']. Como o canal faz
--    parte da chave de idempotencia, o espaco de chaves do sino NAO ENCOSTA no do
--    e-mail e do WhatsApp, e a deduplicacao externa fica intacta.
--    O portao e obrigatorio, nao decorativo: criar_notificacao faz
--    ON CONFLICT ... DO UPDATE SET quantidade = quantidade + 1. Sem o portao um
--    retry nao criaria linha nova, mas o sino passaria a dizer "2 movimentacoes"
--    para um evento que aconteceu uma vez.
--    O formato da chave e o MESMO da borda (notificar/index.ts:260),
--    tipo:solicitacao:<id>:<canal>:<destino>:<AAAA-MM-DD>, com o dia em
--    America/Cuiaba, que e o fuso da casa. Nao inventamos formato novo.
--
-- 3. AS LINHAS DE `sino` NAO POLUEM O PAINEL DO CLIENTE. useHistoricoNotificacoes
--    filtra entidade_tipo = 'solicitacao'; as reservas daqui usam
--    entidade_tipo = 'org_project', entao nao aparecem no historico de avisos ao
--    cliente. Elas sao fechadas com confirmar_envio(..., 'enviado') porque o sino
--    nao tem provedor externo: ele foi entregue no instante em que foi criado.
--
-- Reversao: DROP FUNCTION public.notificar_projetos_da_os(uuid, text, text);
-- Os dois valores de enum do arquivo anterior ficam, inertes.

BEGIN;

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
  -- Tranca. A funcao ignora RLS (decisao 1), entao a autorizacao e explicita.
  -- has_role_or_higher(_, 'team_member') cobre team_member, sublider, lider e
  -- admin, e exclui `client` e `timecliente`, que sao os papeis do portal.
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

  -- O mapa dos tres eventos. O nome do evento e o da API da borda (event_type),
  -- para os dois lados serem chamados com o mesmo vocabulario no mesmo ponto do
  -- front. O tipo gravado no sino segue o enum do banco, e no evento 2 os dois
  -- divergem de proposito: e o mesmo desacoplamento do mapa TIPO_NO_BANCO da borda.
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
      -- "Solicitação encerrada" e não "Documentação conferida", por decisão do
      -- Bernardo em 26/08/2026: o gatilho do evento 3 e o ENCERRAMENTO, e e isso que
      -- o aviso interno deve nomear. O valor do enum segue `documentos_conferidos`
      -- porque enum do Postgres nao aceita DROP VALUE, e trocar o nome custaria uma
      -- migracao e um valor morto para sempre sem mudar nada na tela.
      v_titulo := 'Solicitação encerrada';
      v_corpo  := 'Solicitação encerrada após a conferência da documentação.';
    ELSE
      RAISE EXCEPTION 'Evento desconhecido: %', _evento USING ERRCODE = '23514';
  END CASE;

  -- O detalhe vem da tela, e so o evento 2 manda: e a conta que o analista estava
  -- OLHANDO quando clicou (checklistDerivado.ts). Recalcular aqui abriria a porta
  -- para a thread divergir da tela. Uma conta, uma fonte.
  IF _detalhe IS NOT NULL AND btrim(_detalhe) <> '' THEN
    v_corpo := v_corpo || ' ' || btrim(_detalhe);
  END IF;

  -- OS ausente e silencio, decidido em 26/08: sem OS nao ha projeto onde escrever,
  -- e solicitacao sem OS nao deveria existir. O fallback por cliente que o codigo
  -- antigo tinha esta FORA DE ESCOPO por enunciado da tarefa.
  IF v_sol.ordem_servico_id IS NULL THEN
    RETURN jsonb_build_object('projetos', 0, 'eventos', 0, 'sinos', 0, 'motivo', 'sem_os');
  END IF;

  v_prefixo := v_tipo::text || ':solicitacao:' || v_sol.id::text || ':sino:';

  -- Agrupamento do sino: por solicitacao e por tipo. Duas cobrancas em dias
  -- diferentes da MESMA solicitacao somam em `quantidade` na mesma linha nao lida,
  -- em vez de empilhar duas linhas no sino.
  v_agrupa := v_tipo::text || ':solicitacao:' || v_sol.id::text;

  SELECT nullif(btrim(p.first_name || ' ' || coalesce(p.last_name, '')), '')
    INTO v_autor
  FROM public.profiles p
  WHERE p.id = v_uid;
  v_autor := coalesce(v_autor, 'Sistema');

  -- Um evento na thread de CADA projeto da OS.
  --
  -- PROJETOS RESTRITOS: quando o switch existir (tarefa "3" da Sprint 12), o
  -- filtro entra NESTA consulta e so nela. E o unico lugar do fluxo que decide
  -- quais projetos da OS entram, e esta isolado de proposito.
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

    -- NULL = a chave ja existia: este projeto ja recebeu este evento hoje.
    IF v_envio IS NOT NULL THEN
      -- Sem project_id no payload: trg_org_comments_resolve_scope o preenche a
      -- partir de entity_type/entity_id. Mesmo caminho do insert que o hook
      -- antigo usava.
      INSERT INTO public.org_comments (entity_type, entity_id, author_id, author_name, body, kind)
      VALUES ('org_project'::public.org_comment_entity, v_proj.id, v_uid, v_autor, v_corpo, v_kind);

      PERFORM public.confirmar_envio(v_envio, 'enviado'::public.notificacao_envio_status);
      v_eventos := v_eventos + 1;
    END IF;
  END LOOP;

  -- Um sino por PARTICIPANTE DISTINTO.
  --
  -- Participante = membro do projeto, responsavel ou lider. DISTINCT ON (u) com
  -- ORDER BY u, p.created_at da a cada pessoa UM sino, apontando para o projeto
  -- mais antigo da OS em que ela esta: quem participa de tres projetos da mesma OS
  -- recebe um sino so, e cada um dos tres projetos recebeu seu evento no laco
  -- acima.
  --
  -- Quem clicou nao recebe sino do proprio ato (decisao de 26/08, a mesma regra
  -- dos gatilhos da EDU-2). Ele continua aparecendo como autor na thread.
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

  -- As tres contagens sao a auditoria que a tarefa pede: quem chamou consegue
  -- afirmar "3 projetos, 3 eventos, 6 sinos" sem ir ao banco conferir.
  RETURN jsonb_build_object(
    'projetos', v_projetos,
    'eventos',  v_eventos,
    'sinos',    v_sinos
  );
END;
$function$;

COMMENT ON FUNCTION public.notificar_projetos_da_os(uuid, text, text) IS
  'GES-03. Registra um evento na thread de TODOS os projetos da OS da solicitacao e um sino por participante distinto. Idempotente por dia via notificacao_envio no canal sino. Nao toca e-mail, WhatsApp nem n8n.';

REVOKE ALL ON FUNCTION public.notificar_projetos_da_os(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.notificar_projetos_da_os(uuid, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.notificar_projetos_da_os(uuid, text, text) TO authenticated;

COMMIT;
