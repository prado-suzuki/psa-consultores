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