-- 20260825133830_6b7c7681-21be-4323-82bf-f77113745d28.sql
--
-- IMPORTADA DO LEDGER DO SANDBOX, não escrita aqui primeiro. Esta versão estava
-- registrada em supabase_migrations.schema_migrations sem arquivo correspondente
-- no repositório (migration aplicada pelo chat do Lovable, que carimba a versão
-- dele). O corpo abaixo é o `statements` da própria linha do ledger, transcrito
-- sem alteração, para o repositório voltar a descrever o banco e o `db push`
-- deixar de abortar em "Remote migration versions not found".
--
-- Não editar para corrigir nada: correção vem em migration nova.

-- DIFAL Inteligente: DELETE em difal_decisao volta para team_member+.
--
-- Contexto: as linhas de difal_decisao sao o rascunho da sessao do proprio
-- usuario, apagadas pelo fluxo de "Salvar alteracoes" depois que a API de
-- sync recebe as classificacoes. A REORGANIZACAO RLS v2 (22/04/2026)
-- padronizou DELETE como lider+ em 55 tabelas de uma vez e pegou esta no
-- meio, o que trava o save inteiro para team_member e sublider desde que o
-- precheck `can_perform` passou a barrar o fluxo (25/05/2026).
--
-- INSERT e UPDATE da tabela ja sao team_member+; DELETE volta ao mesmo nivel.
-- difal_sessao segue com DELETE em lider+ de proposito: nenhum caminho do app
-- apaga sessao, so atualiza status.

drop policy if exists "rls_difal_decisao_delete" on public.difal_decisao;

create policy "rls_difal_decisao_delete" on public.difal_decisao
  for delete to authenticated
  using (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));
