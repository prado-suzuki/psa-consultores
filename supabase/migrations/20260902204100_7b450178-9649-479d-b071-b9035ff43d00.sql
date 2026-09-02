-- Ledger do `bun run db:sync`: qual migration deste repositório já rodou, e com
-- que conteúdo.
create table if not exists public.psa_migrations_aplicadas (
  arquivo      text primary key,
  sha256       text not null,
  aplicada_em  timestamptz not null default now(),
  autor        text,
  branch       text,
  commit_sha   text
);

comment on table public.psa_migrations_aplicadas is
  'Ledger do bun run db:sync (ferramenta de desenvolvimento). Inerte em producao.';

-- RLS ligada e NENHUMA policy: só service_role e o dono leem. O app nunca toca aqui,
-- e tabela em `public` sem RLS aparece como alerta de seguranca no Supabase.
alter table public.psa_migrations_aplicadas enable row level security;