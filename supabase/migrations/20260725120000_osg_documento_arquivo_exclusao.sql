-- OSG · exclusão de documento recebido: o binário passa a ser apagado no GCS
-- (endpoint /osg/documentos/delete-object) e a linha permanece como rastro com
-- excluido=true. A janela de soft-delete do bucket (7 dias) é o caminho de
-- recuperação, e ela só é utilizável se a linha continuar alcançável.
--
-- Três ajustes que o fluxo exige:
--   1) registrar QUEM excluiu — `updated_by` tem default auth.uid(), mas default
--      só vale no INSERT, então UPDATE nunca preenchia a coluna;
--   2) deixar o admin VER e REVERTER uma linha já excluída: as policies criadas
--      em 20260722131112 exigem `excluido = false` no USING, o que tornava a
--      linha inalcançável exatamente depois da exclusão (sem leitura, sem
--      restauração, sem lixeira possível);
--   3) mesma correção na policy de DELETE: o hard delete do admin era impossível
--      justamente para as linhas que ele deveria alcançar.
--
-- As policies de team_member+ NÃO mudam: continuam restritas a excluido = false.
BEGIN;

-- 1) updated_at + updated_by em qualquer UPDATE.
--    coalesce preserva o autor anterior quando o UPDATE não vem de um usuário
--    autenticado (ex.: rotina com service_role, onde auth.uid() é null).
--    O guard de tg_op existe porque OLD só é atribuído em UPDATE/DELETE: se algum
--    dia este trigger for reusado em INSERT, sem ele todo insert falharia com
--    'record "old" is not assigned yet'.
--    `set search_path` restaura o hardening que a definição original tinha
--    (20260618215626) e que se perdeu em 20260622120000 — `create or replace`
--    descarta atributos não repetidos, e o linter do Supabase sinaliza
--    function_search_path_mutable.
create or replace function public.documento_arquivo_touch_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  if tg_op = 'UPDATE' then
    new.updated_by = coalesce(auth.uid(), old.updated_by);
  end if;
  return new;
end;
$$;

-- 2) admin enxerga o que foi excluído (policies são permissivas: esta soma-se à
--    de team_member+, não a substitui). As leituras da aplicação continuam
--    filtrando `.eq('excluido', false)`, então nada passa a aparecer nas listas.
drop policy if exists "admin can view deleted documento_arquivo" on public.documento_arquivo;
create policy "admin can view deleted documento_arquivo" on public.documento_arquivo
  for select to authenticated
  using (
    excluido = true
    and public.has_role(auth.uid(), 'admin'::app_role)
    and (cliente_id is null or public.cliente_visivel_para(cliente_id))
  );

-- 2b) admin pode reverter excluido=true -> false (restauração manual dentro dos
--     7 dias, junto com `gcloud storage restore` do blob). O par
--     USING(excluido=true) + WITH CHECK(excluido=false) restringe esta policy à
--     transição de restauração: sem isso ela seria UPDATE irrestrito em linha
--     excluída (policies são permissivas, então valeria por OR e deixaria o
--     admin reescrever o "rastro" que a exclusão deveria preservar).
drop policy if exists "admin can restore documento_arquivo" on public.documento_arquivo;
create policy "admin can restore documento_arquivo" on public.documento_arquivo
  for update to authenticated
  using (
    excluido = true
    and public.has_role(auth.uid(), 'admin'::app_role)
    and (cliente_id is null or public.cliente_visivel_para(cliente_id))
  )
  with check (
    excluido = false
    and public.has_role(auth.uid(), 'admin'::app_role)
    and (cliente_id is null or public.cliente_visivel_para(cliente_id))
  );

-- 3) hard delete do admin deixa de exigir excluido = false.
drop policy if exists "admin can delete documento_arquivo" on public.documento_arquivo;
create policy "admin can delete documento_arquivo" on public.documento_arquivo
  for delete to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::app_role)
    and (cliente_id is null or public.cliente_visivel_para(cliente_id))
  );

COMMIT;
