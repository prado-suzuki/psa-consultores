-- OSG · exclusão de documento recebido: o binário passa a ser apagado no GCS
-- (endpoint /osg/documentos/delete-object) e a linha permanece como rastro com
-- excluido=true. A janela de soft-delete do bucket (7 dias) é o caminho de
-- recuperação, e ela só é utilizável se a linha continuar alcançável.
BEGIN;

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

drop policy if exists "admin can view deleted documento_arquivo" on public.documento_arquivo;
create policy "admin can view deleted documento_arquivo" on public.documento_arquivo
  for select to authenticated
  using (
    excluido = true
    and public.has_role(auth.uid(), 'admin'::app_role)
    and (cliente_id is null or public.cliente_visivel_para(cliente_id))
  );

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

drop policy if exists "admin can delete documento_arquivo" on public.documento_arquivo;
create policy "admin can delete documento_arquivo" on public.documento_arquivo
  for delete to authenticated
  using (
    public.has_role(auth.uid(), 'admin'::app_role)
    and (cliente_id is null or public.cliente_visivel_para(cliente_id))
  );

COMMIT;