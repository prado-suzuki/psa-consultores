-- Fixture reduzida: PostgreSQL/RLS reais, helpers de identidade/cluster simulados.
-- Nao representa replay integral do baseline nem autentica tokens JWT.
create role authenticated;
create role anon;
create schema auth;
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
create function public.has_role_or_higher(uuid, text) returns boolean language sql stable as $$
  select $1 is not null and current_setting('test.team', true) = 'yes'
$$;
create function public.cliente_visivel_para(uuid) returns boolean language sql stable as $$
  select $1::text = current_setting('test.cliente', true)
$$;
create table public.cliente (id uuid primary key, ambiente text not null, excluido boolean not null default false);
create table public.pessoa (id uuid primary key, cliente_id uuid references cliente, tipo_pessoa text);
create table public.tmpl_documento (id uuid primary key, escopo text);
create table public.documento_gerado (
  id uuid primary key, cliente_id uuid not null references cliente, pj_pessoa_id uuid references pessoa,
  documento_template_id uuid references tmpl_documento, status text not null default 'rascunho', papel text,
  documento_raiz_id uuid references documento_gerado, documento_anterior_id uuid references documento_gerado,
  substitui_documento_id uuid references documento_gerado, acompanha_documento_id uuid references documento_gerado,
  snapshot_dados jsonb, snapshot_flags jsonb, snapshot_versoes_blocos jsonb,
  snapshot_validado_em timestamptz, updated_at timestamptz default now(), updated_by uuid
);
create unique index documento_gerado_um_constitutivo_registrado on documento_gerado(cliente_id, pj_pessoa_id)
  where papel = 'constitutivo' and status = 'registrado';
create table public.documento_arquivo (
  id uuid primary key, cliente_id uuid not null references cliente, ambiente text not null,
  pessoa_id uuid references pessoa, documento_gerado_id uuid references documento_gerado,
  excluido boolean not null default false, status text not null, revisao text not null, categoria text not null,
  gcs_uri text, checksum text, tamanho bigint, mime text, nome_original text, revisao_por uuid, revisao_em timestamptz,
  updated_at timestamptz default now(), updated_by uuid
);
create table public.bem (
  id uuid primary key, cliente_id uuid not null references cliente, empresa_destino_pessoa_id uuid references pessoa,
  denominacao text, status_integralizacao text, updated_at timestamptz default now(), updated_by uuid
);
create table public.movimentacao_quotas (
  id uuid primary key, cliente_id uuid not null references cliente, empresa_pessoa_id uuid not null references pessoa,
  origem_pessoa_id uuid references pessoa, destino_pessoa_id uuid references pessoa, bem_id uuid references bem,
  documento_gerado_id uuid references documento_gerado, tipo text, quotas bigint,
  updated_at timestamptz default now(), updated_by uuid, created_at timestamptz default now(), created_by uuid
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), area text not null, entity_type text not null,
  entity_id text not null, entity_name text not null, action text not null, changed_fields jsonb,
  performed_by uuid not null, performed_at timestamptz default now(), details text
);
grant usage on schema public, auth to authenticated, anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
-- Policies amplas das tabelas internas e recorte de cliente das tabelas OSG.
alter table documento_gerado enable row level security;
create policy team on documento_gerado to authenticated using (has_role_or_higher(auth.uid(), 'team_member'));
alter table tmpl_documento enable row level security;
create policy team on tmpl_documento to authenticated using (has_role_or_higher(auth.uid(), 'team_member'));
alter table movimentacao_quotas enable row level security;
create policy team on movimentacao_quotas to authenticated using (has_role_or_higher(auth.uid(), 'team_member'));
alter table cliente enable row level security;
-- team_member le cliente, mas nao tem UPDATE (reservado a sublider no baseline).
create policy scope on cliente for select to authenticated using (cliente_visivel_para(id) and not excluido);
alter table pessoa enable row level security;
create policy scope on pessoa to authenticated using (cliente_visivel_para(cliente_id));
alter table bem enable row level security;
create policy scope on bem to authenticated using (cliente_visivel_para(cliente_id));
alter table documento_arquivo enable row level security;
create policy scope on documento_arquivo to authenticated using (cliente_visivel_para(cliente_id) and not excluido);
alter table audit_logs enable row level security;
create policy audit_insert on audit_logs for insert to authenticated
  with check (performed_by = auth.uid() and has_role_or_higher(auth.uid(), 'team_member'));
create policy audit_select on audit_logs for select to authenticated using (has_role_or_higher(auth.uid(), 'team_member'));
