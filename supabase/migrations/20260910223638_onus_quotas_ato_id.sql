-- O ônus precisa saber de que ATO nasceu, senão a instituição avulsa não é
-- desfazível.
--
-- Fatia 4 da frente (docs/osg/doacao-de-quotas-com-usufruto.md). O ônus da
-- DOAÇÃO se liga ao ato pela ponte do movimento: `movimento_id` aponta para o
-- lançamento, o lançamento aponta para `ato_societario`, e o cascade desfaz
-- tudo de uma vez. A INSTITUIÇÃO avulsa não tem movimento (nenhuma quota muda
-- de mão), então essa ponte não existe: sem esta coluna o ato seria criado, o
-- ônus ficaria pendurado sem dono, o card de Atos Societários não o mostraria
-- e reverter o ato deixaria um usufruto vivo que ninguém instituiu.
--
-- `ON DELETE CASCADE` pela mesma razão do `movimento_id`: desfazer o ato desfaz
-- o que ele produziu. A coluna é opcional porque o ônus antigo (o da doação,
-- que já se liga pelo movimento) não precisa dela para ser desfeito.
--
-- Nada aqui aplica em produção. Sandbox pelo `bun run db:sync --apply`.

alter table public.onus_quotas
  add column if not exists ato_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.onus_quotas'::regclass
                    and conname = 'onus_quotas_ato_id_fkey') then
    alter table public.onus_quotas
      add constraint onus_quotas_ato_id_fkey
        foreign key (ato_id) references public.ato_societario(id) on delete cascade;
  end if;

  -- Todo ônus nasce de alguma coisa: do movimento que o criou, ou do ato que o
  -- instituiu sem mover quota. Linha sem nenhum dos dois é ônus órfão, que
  -- nenhuma peça explica e nenhum gesto desfaz.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.onus_quotas'::regclass
                    and conname = 'onus_quotas_tem_origem_check') then
    alter table public.onus_quotas
      add constraint onus_quotas_tem_origem_check
        check (movimento_id is not null or ato_id is not null);
  end if;
end $$;

create index if not exists idx_onus_quotas_ato
  on public.onus_quotas (ato_id) where ato_id is not null;

comment on column public.onus_quotas.ato_id is
  'O ato societário que criou este ônus. Na doação é redundante com a ponte movimento -> ato e serve ao card de Atos Societários; na instituição de usufruto avulsa é o ÚNICO vínculo, porque nenhuma quota muda de mão e não há movimento. ON DELETE CASCADE: desfazer o ato desfaz o ônus que ele instituiu.';
