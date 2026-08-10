-- 20260812120000_notificacao_base.sql
-- EDU-1 · A caixa de entrada interna (o sino) e o registro de entrega.
--
-- Hoje o sino tem tres fontes e as tres sao DERIVADAS: chamado em aberto, tarefa
-- em revisao e mencao em comentario. Aviso derivado existe enquanto o estado
-- existe e some quando ele muda, entao nao ha onde gravar "o cliente anexou um
-- arquivo", que nao deixa estado nenhum para tras.
--
-- Decisoes:
--   - uma linha NAO LIDA por (destinatario_id, agrupamento_chave). O segundo
--     evento igual incrementa `quantidade` em vez de abrir linha nova: e o que
--     impede 63 itens de checklist virarem 63 avisos. Ler zera o agrupamento.
--   - quem escreve em `notificacao` e SEMPRE criar_notificacao(). A caixa e
--     escrita PARA OUTRA PESSOA, logo nao existe policy de INSERT para
--     authenticated.
--   - o usuario final so altera `lido_em`, e isso e garantido por REVOKE ALL
--     seguido de GRANT UPDATE (lido_em), nao por trigger-guarda (ver o
--     comentario na secao de permissoes).
--   - `notificacao_envio` e log de borda e repete tipo/entidade porque ha
--     entrega SEM linha no sino (e-mail ao cliente, que nao tem sino).
--
-- Conferido no banco em 09/08/2026, nao presumido: nao existem `notificacao`,
-- `notificacao_envio`, `notificacao_tipo` nem `notificacao_canal`;
-- checklist_touch_updated_at(), has_role_or_higher(uuid, app_role) e
-- resolve_user_cliente_id(uuid) existem; profiles.id, cliente.id,
-- representante.id_cliente, representante.user_id, representante.email,
-- representante.telefone, representante.nome e representante.excluido existem
-- (a PK de representante e `id_representante`, nao `id`).
--
-- Reversao:
--   drop function if exists public.destinatarios_cliente(uuid);
--   drop function if exists public.registrar_envio(public.notificacao_canal,
--     public.notificacao_tipo, text, uuid, uuid, uuid, text, text, text, text,
--     boolean, text, jsonb);
--   drop function if exists public.criar_notificacao(uuid,
--     public.notificacao_tipo, text, text, uuid, text, text, text, jsonb);
--   drop table if exists public.notificacao_envio;
--   drop table if exists public.notificacao;
--   drop type if exists public.notificacao_canal;
--   drop type if exists public.notificacao_tipo;

BEGIN;

-- CREATE TYPE nao aceita IF NOT EXISTS -> guarda, padrao de 20260803170000.
do $$ begin
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'notificacao_tipo') then
    create type public.notificacao_tipo as enum (
      'tarefa_atribuida',
      'tarefa_em_revisao',
      'documento_recebido',
      'solicitacao_enviada',
      'documento_aprovado',
      'documento_recusado',
      'cobranca_pendencia'
    );
  end if;
  if not exists (select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
                  where n.nspname = 'public' and t.typname = 'notificacao_canal') then
    create type public.notificacao_canal as enum ('sino', 'email', 'whatsapp');
  end if;
end $$;
-- Os 7 tipos nascem juntos de proposito: os 3 ultimos so sao usados na proxima
-- sprint, mas ALTER TYPE ... ADD VALUE nao roda dentro de transacao e cada valor
-- novo custaria uma migration solta.

create table if not exists public.notificacao (
  id                uuid        primary key default gen_random_uuid(),
  destinatario_id   uuid        not null references public.profiles(id) on delete cascade,
  tipo              public.notificacao_tipo not null,
  titulo            text        not null,
  corpo             text,
  entidade_tipo     text        not null,
  entidade_id       uuid        not null,
  href              text,
  agrupamento_chave text        not null,
  quantidade        integer     not null default 1 check (quantidade >= 1),
  metadata          jsonb       not null default '{}'::jsonb,
  lido_em           timestamptz,
  created_at        timestamptz not null default now(),
  -- created_by/updated_by SEM FK: o AGENTS.md proibe FK direta para auth.users
  -- e as tabelas irmas do modulo deixam essas duas colunas soltas.
  created_by        uuid        default auth.uid(),
  updated_at        timestamptz not null default now(),
  updated_by        uuid        default auth.uid()
);

-- Sem coluna `ambiente` de proposito: o destinatario e um profile, e profiles
-- nao e multi-ambiente. A separacao dev/prod chega pela entidade referenciada.

comment on table public.notificacao is
  'Caixa de entrada interna (o sino). Uma linha nao lida por destinatario e chave de agrupamento.';
comment on column public.notificacao.entidade_tipo is
  'Nome da tabela de origem do aviso: org_tasks, documento_arquivo, solicitacao, ...';
comment on column public.notificacao.entidade_id is
  'Id da linha de origem. Sem FK: a origem muda de tabela conforme o tipo.';
comment on column public.notificacao.href is
  'Rota do front para onde o clique no sino leva. Nulo = aviso sem destino.';
comment on column public.notificacao.agrupamento_chave is
  'O que define "o mesmo aviso". NOT NULL: criar_notificacao() preenche com tipo:entidade_id quando o chamador nao passa nada.';
comment on column public.notificacao.quantidade is
  'Quantas vezes o mesmo evento repetiu enquanto o aviso seguia nao lido. Escrito so por criar_notificacao().';
comment on column public.notificacao.lido_em is
  'Unica coluna que o destinatario pode alterar (privilegio de coluna). Marcar como lida tira a linha do indice de agrupamento.';
comment on column public.notificacao.metadata is
  'Sobras do evento que o front usa para montar o texto. Nao e chave de nada.';

-- E ESTE indice que agrupa, e nao um IF no aplicativo: dois eventos simultaneos
-- passariam pelas duas verificacoes e abririam duas linhas. Enquanto a linha
-- daquela chave seguir NAO LIDA, o segundo insert falha por unicidade e o
-- ON CONFLICT de criar_notificacao() incrementa `quantidade`. Depois de lida, a
-- linha sai do indice e o proximo evento abre linha nova, que e o desejado.
create unique index if not exists notificacao_agrupamento_uq
  on public.notificacao (destinatario_id, agrupamento_chave)
  where lido_em is null;

-- Leitura do sino: as nao lidas de uma pessoa, da mais nova para a mais velha.
-- Mesma forma de org_comment_mentions_unread_idx.
create index if not exists notificacao_nao_lidas_idx
  on public.notificacao (destinatario_id, created_at desc)
  where lido_em is null;

create table if not exists public.notificacao_envio (
  id                    uuid        primary key default gen_random_uuid(),
  notificacao_id        uuid        references public.notificacao(id) on delete set null,
  canal                 public.notificacao_canal not null,
  tipo                  public.notificacao_tipo  not null,
  entidade_tipo         text        not null,
  entidade_id           uuid        not null,
  agrupamento_chave     text,
  destinatario_id       uuid        references public.profiles(id) on delete set null,
  destinatario_email    text,
  destinatario_telefone text,
  destinatario_papel    text,
  sucesso               boolean     not null default true,
  erro                  text,
  metadata              jsonb       not null default '{}'::jsonb,
  enviado_em            timestamptz not null default now()
);

comment on table public.notificacao_envio is
  'Log de borda: quem recebeu o que, por qual canal e quando. E o que permite nao repetir a mesma cobranca todo dia (ALE-1).';
comment on column public.notificacao_envio.notificacao_id is
  'NULAVEL de proposito: ha entrega sem linha no sino (e-mail ao cliente, que nao tem sino). Por isso tipo e entidade sao repetidos aqui: com o vinculo nulo, o log tem de se sustentar sozinho.';
comment on column public.notificacao_envio.destinatario_papel is
  'cliente | responsavel | gestor, os mesmos papeis que notify-ticket ja monta.';

-- A consulta do ALE-1 e "esse aviso ja saiu para essa entidade por esse canal?".
create index if not exists notificacao_envio_dedup_idx
  on public.notificacao_envio (tipo, entidade_tipo, entidade_id, canal, enviado_em desc);
create index if not exists notificacao_envio_destinatario_idx
  on public.notificacao_envio (destinatario_id, enviado_em desc);

-- Reaproveita a funcao que ja existe (20260707130000), nao cria outra.
drop trigger if exists trg_notificacao_updated_at on public.notificacao;
create trigger trg_notificacao_updated_at
  before update on public.notificacao
  for each row execute function public.checklist_touch_updated_at();

-- ── RLS ─────────────────────────────────────────────────────────────────────
alter table public.notificacao       enable row level security;
alter table public.notificacao_envio enable row level security;

create policy "destinatario can view own notificacao"
  on public.notificacao for select to authenticated
  using (destinatario_id = (select auth.uid()));

create policy "destinatario can update own notificacao"
  on public.notificacao for update to authenticated
  using      (destinatario_id = (select auth.uid()))
  with check (destinatario_id = (select auth.uid()));

-- NENHUMA policy de INSERT nem de DELETE para authenticated, DE PROPOSITO:
-- notificacao e escrita PARA OUTRA PESSOA. A unica porta de escrita e
-- criar_notificacao(), SECURITY DEFINER, que roda como dona da tabela e por
-- isso nao passa pela RLS.

create policy "equipe e destinatario can view notificacao_envio"
  on public.notificacao_envio for select to authenticated
  using (destinatario_id = (select auth.uid())
         or public.has_role_or_higher((select auth.uid()), 'team_member'::app_role));

-- ── Funcoes ─────────────────────────────────────────────────────────────────

create or replace function public.criar_notificacao(
  _destinatario_id uuid,
  _tipo            public.notificacao_tipo,
  _titulo          text,
  _entidade_tipo   text,
  _entidade_id     uuid,
  _corpo           text default null,
  _href            text default null,
  _agrupamento     text default null,
  _metadata        jsonb default '{}'::jsonb
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_chave text := coalesce(_agrupamento, _tipo::text || ':' || _entidade_id::text);
  v_id    uuid;
begin
  -- Destinatario nulo nao e erro: e o caso da tarefa sem responsavel.
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
  -- updated_at fica por conta de trg_notificacao_updated_at, em um lugar so.

  return v_id;
end $$;

comment on function public.criar_notificacao(uuid, public.notificacao_tipo, text, text,
  uuid, text, text, text, jsonb) is
  'Unica porta de escrita em notificacao. Devolve SEMPRE o id da linha, criada ou agrupada, e null apenas quando _destinatario_id e null. Agrupa por (destinatario_id, agrupamento_chave) entre as NAO LIDAS.';

create or replace function public.registrar_envio(
  _canal           public.notificacao_canal,
  _tipo            public.notificacao_tipo,
  _entidade_tipo   text,
  _entidade_id     uuid,
  _notificacao_id  uuid    default null,
  _destinatario_id uuid    default null,
  _email           text    default null,
  _telefone        text    default null,
  _papel           text    default null,
  _agrupamento     text    default null,
  _sucesso         boolean default true,
  _erro            text    default null,
  _metadata        jsonb   default '{}'::jsonb
) returns uuid
language sql security definer set search_path = public as $$
  insert into public.notificacao_envio (
    notificacao_id, canal, tipo, entidade_tipo, entidade_id, agrupamento_chave,
    destinatario_id, destinatario_email, destinatario_telefone,
    destinatario_papel, sucesso, erro, metadata)
  values (_notificacao_id, _canal, _tipo, _entidade_tipo, _entidade_id, _agrupamento,
          _destinatario_id, _email, _telefone, _papel, _sucesso, _erro,
          coalesce(_metadata, '{}'::jsonb))
  returning id;
$$;

comment on function public.registrar_envio(public.notificacao_canal, public.notificacao_tipo,
  text, uuid, uuid, uuid, text, text, text, text, boolean, text, jsonb) is
  'Grava uma linha por destinatario e canal. Chamada pela borda (ALE-1); falha dela nunca pode derrubar o envio que ja aconteceu.';

-- O inverso de resolve_user_cliente_id(): daquele cliente para os usuarios dele.
-- Mesmo join (representante -> cliente, os dois nao excluidos) lido ao contrario.
-- nome e telefone entram agora de proposito: trocar a lista de colunas de uma
-- funcao RETURNS TABLE exige DROP + CREATE, e o WhatsApp (ALE-11) vai precisar.
create or replace function public.destinatarios_cliente(_cliente_id uuid)
returns table (user_id uuid, nome text, email text, telefone text)
language sql stable security definer set search_path = public as $$
  select distinct r.user_id, r.nome, r.email, r.telefone
    from public.representante r
    join public.cliente c on c.id = r.id_cliente and c.excluido = false
   where r.id_cliente = _cliente_id
     and r.excluido = false
     and r.user_id is not null;
$$;

comment on function public.destinatarios_cliente(uuid) is
  'De um cliente para os usuarios que o representam. Inverso de resolve_user_cliente_id().';

-- ── Permissoes ──────────────────────────────────────────────────────────────
-- COMECA REVOGANDO, e isto NAO e zelo: toda tabela nova em `public` nasce com
-- ALL para anon, authenticated e service_role, por ALTER DEFAULT PRIVILEGES do
-- projeto. Conferido em 09/08/2026: `solicitacao` esta com
-- authenticated=arwdDxtm apesar de a migration dela ter concedido so
-- select/insert/update/delete. Sem o revoke abaixo, o privilegio de coluna da
-- linha seguinte nao vale nada, porque o UPDATE de tabela inteira ja veio de
-- graca junto com a tabela.
revoke all on public.notificacao       from anon, authenticated;
revoke all on public.notificacao_envio from anon, authenticated;

grant select on public.notificacao       to authenticated;
grant select on public.notificacao_envio to authenticated;

-- PRIVILEGIO DE COLUNA, e nao trigger-guarda como em org_comment_mentions: la
-- ninguem escreve do lado do servidor, aqui criar_notificacao() faz UPDATE de
-- quantidade/titulo/corpo no caminho de agrupamento, e trigger BEFORE UPDATE
-- dispara TAMBEM para SECURITY DEFINER. O guarda copiado do molde quebraria o
-- agrupamento; o privilegio de coluna nao, porque nao vale para a dona da funcao.
grant update (lido_em) on public.notificacao to authenticated;

-- Sem INSERT e sem DELETE para authenticated, em nenhuma das duas tabelas.
grant all on public.notificacao, public.notificacao_envio to service_role;

revoke all on function public.criar_notificacao(uuid, public.notificacao_tipo, text,
  text, uuid, text, text, text, jsonb) from public;
grant execute on function public.criar_notificacao(uuid, public.notificacao_tipo, text,
  text, uuid, text, text, text, jsonb) to service_role;

revoke all on function public.registrar_envio(public.notificacao_canal,
  public.notificacao_tipo, text, uuid, uuid, uuid, text, text, text, text,
  boolean, text, jsonb) from public;
grant execute on function public.registrar_envio(public.notificacao_canal,
  public.notificacao_tipo, text, uuid, uuid, uuid, text, text, text, text,
  boolean, text, jsonb) to service_role;

revoke all     on function public.destinatarios_cliente(uuid) from public;
grant execute  on function public.destinatarios_cliente(uuid) to service_role;

COMMIT;
