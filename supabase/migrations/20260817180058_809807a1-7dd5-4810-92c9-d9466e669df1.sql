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

create index if not exists idx_documento_download_documento
  on public.documento_download (ambiente, documento_id, baixado_em desc);
create index if not exists idx_documento_download_usuario
  on public.documento_download (ambiente, baixado_por,  baixado_em desc);
create index if not exists idx_documento_download_cliente
  on public.documento_download (ambiente, cliente_id,   baixado_em desc);

alter table public.documento_download enable row level security;

drop policy if exists "team_member+ do cluster can view documento_download" on public.documento_download;
create policy "team_member+ do cluster can view documento_download"
  on public.documento_download for select to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role)
         and public.cliente_visivel_para(cliente_id));

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

  if not found then
    raise exception 'documento fora do seu escopo' using errcode = '42501';
  end if;

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

  insert into public.documento_download
    (documento_id, cliente_id, ambiente, baixado_por, papel, acao)
  values (_documento_id, v_cliente, v_ambiente, auth.uid(), v_papel, _acao)
  returning id into v_id;

  return v_id;
end $fn$;

comment on function public.registrar_download_documento(uuid, text) is
  'Unica porta de escrita em documento_download; devolve o id da linha gravada. A regra de acesso de documento_arquivo esta duplicada no corpo porque SECURITY DEFINER ignora RLS, e a fonte dela sao as policies VIVAS: 20260722131112 para a equipe, 20260722155240 para o cliente.';

revoke all on public.documento_download from anon, authenticated;

grant select on public.documento_download to authenticated;
grant all    on public.documento_download to service_role;

revoke all on function public.registrar_download_documento(uuid, text) from anon;
revoke all on function public.registrar_download_documento(uuid, text) from service_role;
revoke all on function public.registrar_download_documento(uuid, text) from public;
grant execute on function public.registrar_download_documento(uuid, text) to authenticated;