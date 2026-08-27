-- 20260824212503_dev_corrige_created_at_retroativo_v2.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- Corrige em DEV o efeito do erro na 20260824205811 (a v1 desta correcao mirou uma
-- janela de horario errada e nao casou com nada).
--
-- `add column ... default now()` num comando so faz o Postgres reescrever a tabela
-- avaliando o default UMA vez: as 31 linhas ficaram todas com o mesmo carimbo, o
-- instante do ALTER, afirmando que nasceram ali quando sao de 07 a 24/08.
--
-- Todas as linhas atuais sao anteriores a coluna -- a mais nova e o teste da GES-04,
-- das 20:06, e o ALTER rodou as 21:22. Por isso o update e incondicional: nao existe
-- linha com carimbo proprio a preservar. O guarda esta no `where` mesmo assim, para
-- o caso de alguem re-rodar isto depois de a tabela ter linhas novas.
--
-- O arquivo original ja foi corrigido para dois passos (add SEM default, depois set
-- default), entao producao recebera a forma certa e nao precisa desta correcao.
update public.notificacao_envio
   set created_at = null
 where created_at is not null
   and created_at > coalesce(enviado_em, created_at - interval '1 second');
