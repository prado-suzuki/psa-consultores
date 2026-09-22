-- Anexo em item do backlog.
--
-- O anexo da tarefa da sprint mora em `deliverable_attachments`, presa a
-- `sprint_deliverables` por `deliverable_id`. O item do backlog é outra tabela
-- (`sprint_backlog_items`), então ganhou uma segunda chave, `backlog_item_id`,
-- e a linha passa a pertencer a exatamente um dos dois.
--
-- Tabela única, e não uma `backlog_item_attachments` à parte, por causa do
-- "Mover para Sprint": o item vira entregável, e o anexo acompanha trocando o
-- dono na mesma linha (`deliverable_id` preenchido, `backlog_item_id` nulo). O
-- arquivo no bucket não se move nem se copia.
--
-- O bucket `deliverable-attachments` não muda: as políticas dele olham só o
-- papel de quem chama, não o caminho do arquivo.

alter table public.deliverable_attachments
  add column if not exists backlog_item_id uuid
    references public.sprint_backlog_items(id) on delete cascade;

alter table public.deliverable_attachments
  alter column deliverable_id drop not null;

alter table public.deliverable_attachments
  drop constraint if exists deliverable_attachments_um_dono;
alter table public.deliverable_attachments
  add constraint deliverable_attachments_um_dono
    check (num_nonnulls(deliverable_id, backlog_item_id) = 1);

create index if not exists deliverable_attachments_backlog_item_id_idx
  on public.deliverable_attachments (backlog_item_id)
  where backlog_item_id is not null;

-- Leitura: o ramo do entregável fica como estava; o do backlog vê o anexo de
-- quem vê o item, delegando à RLS de `sprint_backlog_items` pelo EXISTS.
drop policy if exists deliverable_attachments_select on public.deliverable_attachments;
create policy deliverable_attachments_select on public.deliverable_attachments
  for select to authenticated
  using (
    exists (
      select 1 from public.sprint_deliverables d
      where d.id = deliverable_attachments.deliverable_id
        and public.sprint_visivel(d.sprint_id)
    )
    or exists (
      select 1 from public.sprint_backlog_items b
      where b.id = deliverable_attachments.backlog_item_id
    )
  );
