-- Ledger do `bun run db:sync`: qual migration deste repositório já rodou, e com
-- que conteúdo.
--
-- POR QUE NÃO USAR `supabase_migrations.schema_migrations`. Aquela tabela é do CLI,
-- e o `db push` a lê de um jeito rígido: ele se recusa a aplicar uma versão mais
-- antiga que a última registrada. Com quatro pessoas empurrando de quatro branches,
-- isso trava quem tiver o timestamp menor, por causa de trabalho que a pessoa nem
-- sabe que existe. Medido em 02/09/2026 no sandbox: 165 arquivos no repositório,
-- 133 versões no ledger do CLI, 55 arquivos que ele não conhece e 23 versões dele
-- sem arquivo nenhum.
--
-- Este ledger responde outra pergunta, que é a que importa: "quais dos MEUS arquivos
-- ainda não rodaram". Ordem deixa de importar, e o que outra pessoa aplicou some do
-- caminho em vez de travar.
--
-- O `sha256` existe para o caso comum de editar a migration depois de aplicá-la, o
-- que acontece toda hora antes de pushar: o hash muda, o script percebe e reaplica.
-- Reaplicar só é seguro porque toda migration é idempotente (ver "Toda migration é
-- idempotente" no AGENTS.md), então uma coisa depende da outra.
--
-- `autor`, `branch` e `commit_sha` são o que o ledger do CLI não guarda, e são o que
-- permite o script AVISAR que o sandbox tem migration que ainda não está em
-- origin/develop, em vez de deixar isso silencioso.
--
-- Em produção esta tabela é inerte: nada no app a lê, e o `db:sync` só aponta para o
-- sandbox. Ela vem para cá em vez de existir só no sandbox porque schema que só
-- existe num dos bancos é justamente o que o AGENTS.md proíbe.
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
