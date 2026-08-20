-- 20260814230000_documento_download.sql
-- EDU-5 - Quem pediu a URL assinada de qual documento, e quando.
--
-- Hoje nao existe uma unica linha, em nenhuma tabela, dizendo isso. E o registro
-- NAO pode ser audit_logs: a policy rls_audit_logs_insert exige
-- performed_by = auth.uid() AND has_role_or_higher(auth.uid(), 'team_member'),
-- o portal do cliente (ColetaDocumentosCliente -> useBaixarDocumento) baixa com
-- papel 'client', e useAuditLog engole o erro num try/catch que so escreve no
-- console. O download do cliente, que e o caso que mais importa auditar, nao
-- apareceria e ninguem saberia. Some-se que AuditLogEntry.action so aceita
-- created/updated/deleted, e baixar nao e nenhum dos tres.
--
-- Decisoes de 09/08/2026:
--   - APPEND-ONLY: sem updated_at, sem updated_by, sem trigger de data e sem
--     policy de INSERT/UPDATE/DELETE. A unica porta de escrita e a funcao.
--   - SEM indice unico. Baixar o mesmo documento duas vezes e exatamente o fato
--     que este registro existe para guardar; deduplicar seria apagar o dado.
--   - cliente_id, ambiente e papel sao COPIADOS da linha lida de
--     documento_arquivo (ou decididos pela guarda), nunca recebidos do front.
--     E o que impede o cliente de gravar linha em nome de outro.
--   - `ambiente` existe aqui porque a aba de leitura (EDU-8) precisa separar dev
--     de prod, e a alternativa (JOIN com documento_arquivo) passa pela RLS de
--     documento_arquivo, que esconde documento excluido e documento de outro
--     cluster: linhas de auditoria sumiriam da aba justo nos casos que mais
--     interessam.
--   - `papel` e congelado no momento do evento. Nao da para derivar depois de
--     user_roles porque papel muda com o tempo, e "foi o CLIENTE que baixou" e
--     o fato central deste registro.
--   - `baixado_por` fica SEM FK, como documento_arquivo.created_by. O nome sai
--     da RPC get_uploader_names, que ja existe. FK para profiles ou bloquearia
--     a remocao de um usuario ou levaria a linha de auditoria junto em cascata.
--
-- CONFERIDO NO BANCO EM 14/08/2026, nao presumido:
--   documento_download, os tres indices e registrar_download_documento NAO
--   existem (consulta de colisao devolveu zero).
--   As quatro dependencias existem com as assinaturas esperadas:
--   has_role(_user_id uuid, _role app_role),
--   has_role_or_higher(_user_id uuid, _minimum_role app_role),
--   cliente_visivel_para(_cliente_id uuid) e resolve_user_cliente_id(_uid uuid).
--   osg_doc_fonte = (cliente, psa, arquivar).
--   documento_arquivo tem 210 linhas (eram 207 em 09/08), cliente_id NOT NULL e
--   nenhuma linha com cliente nulo; ambiente com 'dev' e 'prod' (7 em prod);
--   178 documentos estao com excluido = true, o que confirma que a exclusao
--   logica e mesmo o caminho normal.
--   get_uploader_names existe.
--
--   AS TRES POLICIES VIVAS DE LEITURA DE documento_arquivo, lidas em pg_policies
--   hoje, confirmam o aviso do enunciado (a migration 20260622120000 foi mesmo
--   superada pela 20260722131112):
--     team_member+ can view documento_arquivo:
--       excluido = false AND has_role_or_higher(team_member)
--       AND (cliente_id IS NULL OR cliente_visivel_para(cliente_id))
--     admin can view deleted documento_arquivo:
--       excluido = true AND has_role(admin)
--       AND (cliente_id IS NULL OR cliente_visivel_para(cliente_id))
--     cliente can view own documento_arquivo:
--       fonte = 'cliente' AND excluido = false
--       AND cliente_id = resolve_user_cliente_id(auth.uid())
--
--   DIFERENCA DELIBERADA: a guarda abaixo NAO reproduz o ramo
--   `cliente_id IS NULL`. Como documento_arquivo.cliente_id e NOT NULL, aquele
--   ramo e codigo morto hoje; e se a coluna um dia virar anulavel, a funcao
--   recusa onde a policy permitiria, que e o lado certo de errar.
--
--   CONFIRMADO LENDO O CORPO: resolve_user_cliente_id LEVANTA EXCECAO quando o
--   usuario esta ligado a mais de um id_cliente, e devolve NULL quando nao esta
--   ligado a nenhum. E por isso que a guarda e IF/ELSIF encadeado e nao um unico
--   OR (ver ATENCAO abaixo). Com NULL, a comparacao com v_cliente da NULL, nao
--   verdadeiro, e a chamada cai no ramo de recusa: falha fechando.
--
-- DOIS RISCOS DE DESENHO, registrados por serem reais e nao escondidos:
--   1. O `on delete cascade` em documento_id significa que apagar um documento
--      DE VERDADE apaga junto o historico de acesso a ele, e quem pode apagar de
--      verdade e o admin (policy "admin can delete documento_arquivo"). Num
--      registro de auditoria isso e uma fraqueza: o admin consegue eliminar a
--      prova de quem acessou. Atenua o fato de o caminho normal ser a exclusao
--      logica, que nao toca nesta tabela. Mantido como o enunciado manda; a
--      terceira via nao considerada la seria `on delete set null`, guardando a
--      linha mesmo sem o documento.
--   2. service_role recebe ALL e ignora RLS, entao ele escreve e apaga aqui. E
--      necessario para o backend e e a unica porta que fura o append-only.
--
-- O NOME DO ARQUIVO nao e o que a tarefa prescreve (20260812130000): aquela
-- faixa ja passou e as migrations de 14/08 chegaram a 20260814220000. Conteudo
-- identico, versao 20260814230000.
--
-- Reversao:
--   drop function if exists public.registrar_download_documento(uuid, text);
--   drop table if exists public.documento_download;

BEGIN;

create table if not exists public.documento_download (
  id           uuid        primary key default gen_random_uuid(),
  documento_id uuid        not null references public.documento_arquivo(id) on delete cascade,
  cliente_id   uuid        not null references public.cliente(id) on delete restrict,
  ambiente     text        not null,
  baixado_por  uuid        not null,
  papel        text        not null,
  acao         text        not null default 'download',
  baixado_em   timestamptz not null default now(),
  constraint documento_download_acao_chk  check (acao  in ('download', 'preview')),
  constraint documento_download_papel_chk check (papel in ('equipe', 'cliente'))
);
-- Sem updated_at, sem updated_by e SEM trigger de updated_at: e log, nao
-- cadastro. Nao copie o trigger do molde.
-- Sem check em `ambiente` de proposito: documento_arquivo.ambiente nao tem uma,
-- e um dominio mais estrito aqui faria a funcao abortar no dia em que aparecer
-- um terceiro ambiente la.
-- Sem indice unico, e sem constraint de unicidade de qualquer forma.

comment on table public.documento_download is
  'Append-only: quem pediu a URL assinada de qual documento e quando. Unica porta de escrita: registrar_download_documento().';
comment on column public.documento_download.cliente_id is
  'Copiado da linha de documento_arquivo, nunca recebido do front: e o que impede o cliente de gravar linha em nome de outro.';
comment on column public.documento_download.ambiente is
  'Copiado de documento_arquivo.ambiente. Existe aqui para a aba de leitura separar dev de prod sem depender de um JOIN que passa pela RLS de documento_arquivo.';
comment on column public.documento_download.baixado_por is
  'auth.uid() de quem chamou. SEM FK, como documento_arquivo.created_by; o nome sai da RPC get_uploader_names.';
comment on column public.documento_download.papel is
  'equipe | cliente, congelado no momento do evento. Nao e derivavel depois de user_roles, porque papel muda com o tempo.';
comment on column public.documento_download.acao is
  'download | preview. preview vem de usePreviewUrl, que assina a mesma URL para exibir inline em vez de baixar.';

-- As tres consultas da aba (EDU-8), com `ambiente` na frente porque consulta de
-- tabela multi-ambiente e obrigada a filtrar por ele (AGENTS.md).
create index if not exists idx_documento_download_documento
  on public.documento_download (ambiente, documento_id, baixado_em desc);
create index if not exists idx_documento_download_usuario
  on public.documento_download (ambiente, baixado_por,  baixado_em desc);
create index if not exists idx_documento_download_cliente
  on public.documento_download (ambiente, cliente_id,   baixado_em desc);

-- RLS ------------------------------------------------------------------------
alter table public.documento_download enable row level security;

-- Mesma forma da policy VIVA de leitura de documento_arquivo (20260722131112):
-- equipe E recorte de cluster. Sem o cliente_visivel_para, um team_member de
-- outro cluster leria o historico de download de um cliente que ele nem enxerga.
drop policy if exists "team_member+ do cluster can view documento_download" on public.documento_download;
create policy "team_member+ do cluster can view documento_download"
  on public.documento_download for select to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
         and public.cliente_visivel_para(cliente_id));

-- NENHUMA policy de insert, update ou delete: RLS ligada sem policy = ninguem
-- escreve direto. Append-only por construcao.
-- E NENHUMA leitura para o cliente: mostrar a ele qual analista abriu o arquivo
-- dele nao foi pedido.

-- Funcao ---------------------------------------------------------------------
create or replace function public.registrar_download_documento(
  _documento_id uuid,
  _acao         text default 'download'
) returns uuid
language plpgsql security definer set search_path = public as $fn$
declare
  v_cliente  uuid;
  v_ambiente text;
  v_fonte    public.osg_doc_fonte;
  v_excluido boolean;
  v_papel    text;
  v_id       uuid;
begin
  if auth.uid() is null then
    raise exception 'sem sessao' using errcode = '42501';
  end if;

  select d.cliente_id, d.ambiente, d.fonte, d.excluido
    into v_cliente, v_ambiente, v_fonte, v_excluido
    from public.documento_arquivo d
   where d.id = _documento_id;

  -- Mesma mensagem e mesmo errcode do "fora do escopo" logo abaixo, de
  -- proposito: mensagens diferentes fariam a funcao responder se um id existe.
  if not found then
    raise exception 'documento fora do seu escopo' using errcode = '42501';
  end if;

  -- SECURITY DEFINER ignora RLS, entao a regra das policies vivas de
  -- documento_arquivo e repetida aqui a mao. IF/ELSIF encadeado, e nao um unico
  -- OR: resolve_user_cliente_id() LEVANTA EXCECAO quando o usuario esta ligado
  -- a mais de um cliente, e o Postgres nao garante curto-circuito de OR.
  if public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
     and (v_excluido = false or public.has_role(auth.uid(), 'admin'::public.app_role))
     and public.cliente_visivel_para(v_cliente) then
    v_papel := 'equipe';
  elsif v_fonte = 'cliente'::public.osg_doc_fonte
        and v_excluido = false
        and v_cliente = public.resolve_user_cliente_id(auth.uid()) then
    v_papel := 'cliente';
  else
    raise exception 'documento fora do seu escopo' using errcode = '42501';
  end if;

  -- _acao NAO e validado aqui: o dominio mora na check da tabela, num lugar so.
  -- Valor invalido sobe como 23514, venha da funcao ou de insert direto.
  insert into public.documento_download
    (documento_id, cliente_id, ambiente, baixado_por, papel, acao)
  values (_documento_id, v_cliente, v_ambiente, auth.uid(), v_papel, _acao)
  returning id into v_id;

  return v_id;
end $fn$;

comment on function public.registrar_download_documento(uuid, text) is
  'Unica porta de escrita em documento_download; devolve o id da linha gravada. A regra de acesso de documento_arquivo esta duplicada no corpo porque SECURITY DEFINER ignora RLS, e a fonte dela sao as policies VIVAS: 20260722131112 para a equipe, 20260722155240 para o cliente.';

-- Permissoes -----------------------------------------------------------------
-- COMECA REVOGANDO, e isto nao e zelo: o pg_default_acl do schema public da ALL
-- (arwdDxtm) para anon, authenticated e service_role em TODA tabela nova, e
-- EXECUTE para os tres em toda funcao nova. Conferido: solicitacao e
-- solicitacao_item estao com authenticated=arwdDxtm apesar de as migrations
-- delas terem concedido apenas select/insert/update/delete. Hoje a RLS sem
-- policy de escrita ja barra o INSERT direto, mas o privilegio herdado fica
-- invisivel no arquivo: no dia em que alguem acrescentar uma policy permissiva
-- por outro motivo, INSERT, UPDATE e DELETE ficam vivos sem ninguem ter escrito
-- um grant.
revoke all on public.documento_download from anon, authenticated;

grant select on public.documento_download to authenticated;
grant all    on public.documento_download to service_role;

-- Sem INSERT, UPDATE nem DELETE para authenticated. Nao repita o
-- `grant select, insert, update, delete` do molde da solicitacao_item.

revoke all on function public.registrar_download_documento(uuid, text) from anon;
revoke all on function public.registrar_download_documento(uuid, text) from service_role;
revoke all on function public.registrar_download_documento(uuid, text) from public;
grant execute on function public.registrar_download_documento(uuid, text) to authenticated;

COMMIT;
