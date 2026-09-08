-- PT-04: o vínculo do planejamento com o projeto passa por função, e ela avisa.
--
-- POR QUE ESTA MIGRATION EXISTE, e o que ela conserta:
--
-- A migration de 08/09 criou `wp_estudo.projeto_id`, e a tela passou a gravar
-- essa coluna com um `update` direto. Testando com a identidade da `bi@` ficou
-- claro que isso deixou a escrita governada apenas pela policy herdada da PT-02,
-- que é `team_member+` com cliente visível: qualquer pessoa do cluster mexia no
-- planejamento de um projeto que não é dela.
--
-- **A regra combinada é outra, e mais restritiva:** quem grava tem de estar
-- LIGADO AO PROJETO, como líder, responsável ou membro. Estar no cluster não
-- basta. (A regra de "sublíder ou acima" que chegou a ser cogitada era para
-- CONCLUIR o planejamento, e conclusão deixou de existir quando o desenho virou
-- em 08/09: o gatilho do aviso é a revisão ser carregada.)
--
-- Conferido antes de escrever: dos 134 projetos, **nenhum com OS fica sem membro
-- e sem líder**, então a regra não tranca ninguém para fora por falta de
-- cadastro. Nos projetos de Planejamento Tributário o líder e a Mônica estão em
-- todos.
--
-- O QUE MAIS ELA FAZ: publica o aviso. Textos aprovados pela Patricia em
-- 08/09/2026, e o "Responsável" é **quem subiu o papel de trabalho**, que é a
-- informação que falta a quem recebe.

-- ─────────────────────────────────────────────────────────────────────────────
-- Os valores de enum que o evento precisa
-- ─────────────────────────────────────────────────────────────────────────────

-- **Dois `kind`, e não um.** Na thread o título do evento sai do rótulo do
-- `kind`, e a Patricia aprovou dois títulos diferentes: um para a primeira
-- importação e outro para as revisões seguintes. Com um valor só, os dois
-- eventos apareceriam com o mesmo nome.
alter type public.org_comment_kind add value if not exists 'papel_de_trabalho_importado';
alter type public.org_comment_kind add value if not exists 'papel_de_trabalho_revisado';

-- No sino o título vai como parâmetro, então um tipo basta. Ele também é a chave
-- de agrupamento e o prefixo da idempotência.
alter type public.notificacao_tipo add value if not exists 'papel_de_trabalho_importado';

-- ─────────────────────────────────────────────────────────────────────────────
-- A função
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.vincular_planejamento_ao_projeto(
  _estudo_id uuid,
  _projeto_id uuid,
  _importacao_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_uid       uuid := auth.uid();
  v_est       record;
  v_proj      record;
  v_versao    integer;
  v_quem      uuid;
  v_autor     text;
  v_resp      text;
  v_kind      public.org_comment_kind;
  v_titulo    text;
  v_corpo     text;
  v_prefixo   text;
  v_envio     uuid;
  v_eventos   int := 0;
  v_sinos     int := 0;
  v_part      record;
begin
  if v_uid is null then
    raise exception 'Sem sessão para vincular o planejamento' using errcode = '42501';
  end if;

  select e.id, e.cliente_id, e.ordem_servico_id, e.projeto_id, e.excluido
    into v_est
  from public.wp_estudo e
  where e.id = _estudo_id;

  if not found or v_est.excluido then
    raise exception 'Planejamento não encontrado' using errcode = '23503';
  end if;

  select p.id, p.name, p.ordem_servico_id, p.leader_id, p.responsible_id
    into v_proj
  from public.org_projects p
  where p.id = _projeto_id;

  if not found then
    raise exception 'Projeto não encontrado' using errcode = '23503';
  end if;

  -- O gatilho `trg_wp_estudo_projeto_da_mesma_os` também recusa isto, e é a rede
  -- de segurança. Aqui a checagem existe para a mensagem chegar nomeando o
  -- projeto, em vez de sair o texto genérico do gatilho.
  if v_proj.ordem_servico_id is distinct from v_est.ordem_servico_id then
    raise exception 'O projeto "%" não pertence à ordem de serviço deste planejamento', v_proj.name
      using errcode = '23514';
  end if;

  -- ── A REGRA DE ESCRITA ────────────────────────────────────────────────────
  --
  -- Estar ligado ao projeto, de qualquer uma das três formas. Não olha papel:
  -- `team_member` que é membro do projeto sobe papel de trabalho, e é assim que
  -- o trabalho acontece. Quem não tem relação com o projeto não mexe, mesmo
  -- sendo do mesmo cluster e mesmo tendo papel alto.
  --
  -- **`coalesce(..., false)` não é enfeite.** `leader_id = v_uid` com
  -- `leader_id` nulo dá NULL, não false, e `NULL or NULL or false` é NULL:
  -- `if not NULL then` não entra no ramo, e a regra passava batido justamente
  -- nos projetos sem ninguém ligado, que são os que mais precisam dela. Achado
  -- testando contra um projeto de teste sem líder nem membros.
  if not coalesce(
    v_proj.leader_id = v_uid
    or v_proj.responsible_id = v_uid
    or exists (
      select 1 from public.org_project_members m
      where m.project_id = v_proj.id and m.user_id = v_uid
    ),
    false
  ) then
    raise exception
      'Você não está no projeto "%". Só quem é líder, responsável ou membro dele pode ligar o papel de trabalho a esse projeto.',
      v_proj.name
      using errcode = '42501';
  end if;

  -- ── O vínculo ─────────────────────────────────────────────────────────────
  update public.wp_estudo set projeto_id = v_proj.id where id = v_est.id;

  -- ── O texto do aviso ──────────────────────────────────────────────────────
  --
  -- **O responsável é quem SUBIU a revisão**, lido de `importado_por`, e não
  -- quem chama esta função. Na prática é a mesma pessoa, porque a tela chama
  -- logo depois de importar; ler da revisão mantém o texto correto se um dia
  -- alguém consertar um vínculo antigo.
  select i.versao, i.importado_por into v_versao, v_quem
  from public.wp_importacao i
  where i.id = _importacao_id and i.estudo_id = v_est.id;

  if not found then
    raise exception 'Revisão não encontrada neste planejamento' using errcode = '23503';
  end if;

  select nullif(btrim(p.first_name || ' ' || coalesce(p.last_name, '')), '')
    into v_resp
  from public.profiles p where p.id = v_quem;
  v_resp := coalesce(v_resp, 'não informado');

  select nullif(btrim(p.first_name || ' ' || coalesce(p.last_name, '')), '')
    into v_autor
  from public.profiles p where p.id = v_uid;
  v_autor := coalesce(v_autor, 'Sistema');

  if v_versao <= 1 then
    v_kind   := 'papel_de_trabalho_importado';
    v_titulo := 'Papel de trabalho importado';
    v_corpo  := 'O papel de trabalho foi importado para este planejamento. '
             || 'Os slides já podem ser gerados.' || chr(10)
             || 'Responsável: ' || v_resp;
  else
    v_kind   := 'papel_de_trabalho_revisado';
    v_titulo := 'Nova revisão do papel de trabalho';
    v_corpo  := 'A revisão ' || v_versao::text || ' foi importada. '
             || 'As versões anteriores continuam disponíveis.' || chr(10)
             || 'Responsável: ' || v_resp;
  end if;

  -- **A chave de idempotência é por REVISÃO**, e não por dia como na GES-03.
  -- Aqui o fato avisado é "esta revisão entrou", que acontece uma vez: repetir a
  -- chamada, por retry ou por duplo clique, não pode gerar dois avisos.
  v_prefixo := 'papel_de_trabalho_importado:revisao:' || _importacao_id::text || ':';

  -- ── O evento na thread do projeto ─────────────────────────────────────────
  --
  -- Um só, no projeto escolhido. **O Feed vem de graça:** ele é a vista
  -- consolidada de `org_comments`, não um destino separado.
  --
  -- **A chave inclui o PROJETO, e não só a revisão.** O sino é chaveado por
  -- destinatário, então trocar o projeto avisa a gente nova; sem o projeto aqui
  -- a thread ficava chaveada apenas pela revisão, e o projeto novo recebia sino
  -- sem nunca receber o evento. Duas contas diferentes para o mesmo aviso.
  v_envio := public.reservar_envio(
    _chave         => v_prefixo || 'thread:' || v_proj.id::text,
    _canal         => 'sino'::public.notificacao_canal,
    _tipo          => 'papel_de_trabalho_importado'::public.notificacao_tipo,
    _entidade_tipo => 'org_project',
    _entidade_id   => v_proj.id,
    _metadata      => jsonb_build_object(
                        'estudo_id', v_est.id,
                        'importacao_id', _importacao_id,
                        'versao', v_versao)
  );

  if v_envio is not null then
    insert into public.org_comments (entity_type, entity_id, author_id, author_name, body, kind)
    values ('org_project'::public.org_comment_entity, v_proj.id, v_uid, v_autor, v_corpo, v_kind);

    perform public.confirmar_envio(v_envio, 'enviado'::public.notificacao_envio_status);
    v_eventos := v_eventos + 1;
  end if;

  -- ── Um sino por pessoa ────────────────────────────────────────────────────
  --
  -- Líder, responsável e membros do projeto escolhido, tirando quem subiu. O
  -- `DISTINCT` é o que garante um aviso por pessoa quando ela é, por exemplo,
  -- líder e membro ao mesmo tempo.
  for v_part in
    select distinct x.u as user_id
    from (
      select m.user_id as u from public.org_project_members m where m.project_id = v_proj.id
      union select v_proj.leader_id
      union select v_proj.responsible_id
    ) x
    where x.u is not null and x.u <> v_quem and x.u <> v_uid
  loop
    v_envio := public.reservar_envio(
      _chave           => v_prefixo || 'sino:' || v_part.user_id::text,
      _canal           => 'sino'::public.notificacao_canal,
      _tipo            => 'papel_de_trabalho_importado'::public.notificacao_tipo,
      _entidade_tipo   => 'org_project',
      _entidade_id     => v_proj.id,
      _destinatario_id => v_part.user_id,
      _metadata        => jsonb_build_object(
                            'estudo_id', v_est.id,
                            'importacao_id', _importacao_id,
                            'versao', v_versao)
    );

    if v_envio is not null then
      perform public.criar_notificacao(
        _destinatario_id => v_part.user_id,
        _tipo            => 'papel_de_trabalho_importado'::public.notificacao_tipo,
        _titulo          => v_titulo,
        _entidade_tipo   => 'org_project',
        _entidade_id     => v_proj.id,
        _corpo           => v_corpo,
        _href            => null,
        _agrupamento     => 'papel_de_trabalho_importado:projeto:' || v_proj.id::text,
        _metadata        => jsonb_build_object(
                              'estudo_id', v_est.id,
                              'importacao_id', _importacao_id,
                              'versao', v_versao)
      );

      perform public.confirmar_envio(v_envio, 'enviado'::public.notificacao_envio_status);
      v_sinos := v_sinos + 1;
    end if;
  end loop;

  return jsonb_build_object(
    'projeto_id', v_proj.id,
    'projeto', v_proj.name,
    'versao', v_versao,
    'eventos', v_eventos,
    'sinos', v_sinos
  );
end;
$$;

comment on function public.vincular_planejamento_ao_projeto(uuid, uuid, uuid) is
  'PT-04. Liga o planejamento a um projeto da OS e avisa aquele projeto: um evento '
  'na thread, que o Feed também mostra, e um sino por pessoa ligada ao projeto, '
  'tirando quem subiu. Idempotente por revisão. Recusa quem não é líder, '
  'responsável nem membro do projeto.';

grant execute on function public.vincular_planejamento_ao_projeto(uuid, uuid, uuid) to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- GATE
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  v_falhas text[] := '{}';
begin
  if not exists (
    select 1 from pg_proc where proname = 'vincular_planejamento_ao_projeto'
  ) then
    v_falhas := v_falhas || 'a função não foi criada';
  end if;

  if not exists (
    select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'org_comment_kind' and e.enumlabel = 'papel_de_trabalho_revisado'
  ) then
    v_falhas := v_falhas || 'falta o kind de revisão seguinte';
  end if;

  if not exists (
    select 1 from pg_type t join pg_enum e on e.enumtypid = t.oid
    where t.typname = 'notificacao_tipo' and e.enumlabel = 'papel_de_trabalho_importado'
  ) then
    v_falhas := v_falhas || 'falta o tipo de notificação';
  end if;

  if array_length(v_falhas, 1) > 0 then
    raise exception 'GATE da PT-04 falhou: %', array_to_string(v_falhas, '; ');
  end if;

  raise notice 'GATE ok: função de vínculo e aviso criada, enums no lugar.';
end $$;
