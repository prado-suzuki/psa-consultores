-- O ônus extinto pela SUB-ROGAÇÃO precisa saber quem o extinguiu, senão
-- desfazer o ato não o ressuscita.
--
-- Fatia 4 da frente (docs/osg/doacao-de-quotas-com-usufruto.md). Quando uma
-- quota gravada muda de mão, o gravame acompanha o bem: o ônus do cedente
-- termina e nasce o do adquirente. O ônus novo aponta para o movimento que o
-- criou e o `ON DELETE CASCADE` já o leva embora quando o ato é desfeito. O
-- ÔNUS ANTIGO não tinha essa ponte: ele era só marcado `extinto_em`, e desfazer
-- o ato deixava a sociedade sem gravame nenhum, tendo havido gravame antes e
-- depois. É perda silenciosa de ônus, e num contrato isso é grave.
--
-- Com esta coluna, o reverso é uma linha: quem for desfazer o movimento
-- primeiro faz `extinto_em = null` onde `extinto_por_movimento_id` é ele, e só
-- então apaga. `ON DELETE SET NULL` (e não CASCADE) porque a linha apontada é o
-- ônus ANTIGO, que deve sobreviver ao movimento e voltar a viger.
--
-- A sub-rogação PARCIAL não altera a linha antiga: extingue-a inteira e insere
-- duas novas, ambas presas ao movimento — a parte que ficou com o cedente e a
-- que foi para o adquirente. Assim o desfazer é sempre o mesmo gesto, e nunca
-- há um número anterior a restaurar de memória.
--
-- Nada aqui aplica em produção. Sandbox pelo `bun run db:sync --apply`.

alter table public.onus_quotas
  add column if not exists extinto_por_movimento_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.onus_quotas'::regclass
                    and conname = 'onus_quotas_extinto_por_movimento_id_fkey') then
    alter table public.onus_quotas
      add constraint onus_quotas_extinto_por_movimento_id_fkey
        foreign key (extinto_por_movimento_id)
        references public.movimentacao_quotas(id) on delete set null;
  end if;

  -- Só ônus extinto tem quem o extinguiu. O contrário (extinto sem movimento)
  -- continua válido: é a extinção por óbito ou revogação, que não vem do livro.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.onus_quotas'::regclass
                    and conname = 'onus_quotas_extincao_coerente_check') then
    alter table public.onus_quotas
      add constraint onus_quotas_extincao_coerente_check
        check (extinto_por_movimento_id is null or extinto_em is not null);
  end if;
end $$;

create index if not exists idx_onus_quotas_extinto_por_movimento
  on public.onus_quotas (extinto_por_movimento_id)
  where extinto_por_movimento_id is not null;

comment on column public.onus_quotas.extinto_por_movimento_id is
  'O movimento que extinguiu este ônus ao sub-rogá-lo: a quota gravada mudou de mão, e o gravame acompanhou o bem. Existe para que desfazer o ato ressuscite o ônus antigo (extinto_em = null onde esta coluna aponta para o movimento apagado) em vez de a sociedade ficar sem um gravame que ninguém revogou. Nulo na extinção por óbito ou revogação, que não vem do livro.';
