-- 20260824212412_dev_corrige_created_at_retroativo.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- Corrige em DEV o efeito de um erro na 20260824205811.
--
-- Aquela migracao acrescentou `created_at` com `default now()` num comando so, e o
-- Postgres faz as linhas EXISTENTES lerem o default -- todas as 31 linhas da replica
-- passaram a afirmar que nasceram no instante da migracao, quando sao de 07 a 24/08.
-- O arquivo original ja foi corrigido para dois passos (add sem default, depois set
-- default), entao PRODUCAO recebera a forma certa e nao precisa desta correcao.
--
-- Aqui so restaura a intencao registrada no comentario da coluna: linha anterior a
-- 24/08/2026 fica NULA, que se le como "reservada antes de a coluna existir".
--
-- ESCOPO: so linhas cujo `created_at` caiu no minuto da migracao. Se alguma linha
-- nova tiver sido criada depois, ela tem carimbo proprio e nao e tocada.
update public.notificacao_envio
   set created_at = null
 where created_at < timestamptz '2026-08-24 21:05:00+00'
   and created_at > timestamptz '2026-08-24 20:55:00+00';
