-- PT-03: onde fica registrada cada apresentação gerada a partir de uma revisão.
--
-- O enunciado pede "registrar revisão, template, versão, checksum e resultado" e
-- "disponibilizar histórico e download". A `documento_gerado` não serve: ela é da
-- Oficina de Contratos, com `documento_template_id`, `snapshot_versoes_blocos` e
-- `substitui_documento_id`, e não tem onde pendurar a revisão do WP.
--
-- **Por que `template_nome` e `template_checksum` importam mais do que parecem.**
-- O deck de hoje é provisório, montado a partir de um estudo antigo enquanto o
-- modelo final não chega. Quando ele chegar, alguém vai precisar saber quais
-- apresentações por aí saíram do molde velho. Sem esse registro, não se sabe.

create table if not exists public.wp_apresentacao (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.wp_importacao(id) on delete cascade,

  -- Numeração por revisão: a mesma revisão pode gerar a apresentação de novo,
  -- por exemplo depois de o molde mudar, e as duas convivem.
  versao integer not null,

  -- O arquivo, no bucket privado `wp-apresentacoes`.
  storage_path text not null,
  nome_arquivo text not null,
  tamanho bigint,
  checksum text,

  -- Com que molde saiu. É o que permite achar o que precisa ser regerado.
  template_nome text not null,
  template_checksum text,
  versao_do_gerador text not null,

  -- O que o `validatePptx` achou, mais o que o gerador não soube preencher.
  -- Vazio é geração limpa.
  problemas jsonb not null default '[]'::jsonb,

  gerado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),

  -- Descarte é marca, como em `wp_importacao`: apresentação entregue a cliente
  -- não se apaga do histórico.
  excluido boolean not null default false
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wp_apresentacao_versao_unica') then
    alter table public.wp_apresentacao
      add constraint wp_apresentacao_versao_unica unique (importacao_id, versao);
  end if;
end $$;

create index if not exists wp_apresentacao_importacao_idx
  on public.wp_apresentacao (importacao_id) where excluido = false;

comment on table public.wp_apresentacao is
  'Cada .pptx gerado a partir de uma revisão do papel de trabalho, com o molde e a versão que o produziram.';
comment on column public.wp_apresentacao.template_checksum is
  'Identifica o molde exato. O deck é provisório até a Mônica enviar o modelo final; é por aqui que se acha o que regerar.';

-- RLS: espelha `wp_importacao`. Quem enxerga a revisão enxerga a apresentação
-- dela, e o descarte continua sendo coisa de admin.
alter table public.wp_apresentacao enable row level security;

create or replace function public.wp_importacao_visivel(_importacao_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.wp_importacao i
    where i.id = _importacao_id
      and i.excluido = false
      and public.wp_estudo_visivel(i.estudo_id)
  );
$$;

comment on function public.wp_importacao_visivel(uuid) is
  'Se a pessoa enxerga a revisão, e portanto as apresentações geradas a partir dela.';

drop policy if exists "quem ve a importacao ve a apresentacao" on public.wp_apresentacao;
create policy "quem ve a importacao ve a apresentacao"
  on public.wp_apresentacao for select
  using (excluido = false and public.wp_importacao_visivel(importacao_id));

drop policy if exists "admin can view deleted wp_apresentacao" on public.wp_apresentacao;
create policy "admin can view deleted wp_apresentacao"
  on public.wp_apresentacao for select
  using (excluido = true and has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "team_member+ can insert wp_apresentacao" on public.wp_apresentacao;
create policy "team_member+ can insert wp_apresentacao"
  on public.wp_apresentacao for insert
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and public.wp_importacao_visivel(importacao_id)
  );

-- Só o admin, e só para marcar como descartada. Não existe UPDATE de conteúdo:
-- o registro de uma geração é retrato, igual ao da importação.
drop policy if exists "admin can soft delete wp_apresentacao" on public.wp_apresentacao;
create policy "admin can soft delete wp_apresentacao"
  on public.wp_apresentacao for update
  using (has_role(auth.uid(), 'admin'::app_role));

-- Os dois buckets, criados por migration para viajarem com o código.
--
-- O `osg-templates` já existe em produção desde 27/07, criado à mão e sem
-- registro em lugar nenhum; declarar aqui conserta essa dívida e garante que ele
-- exista também no sandbox, onde hoje não existe.
--
-- **O ARQUIVO do molde continua sendo passo manual.** Bucket viaja por migration,
-- .pptx não viaja em git: quem levar esta funcionalidade para produção precisa
-- subir o `TEMPLATE_TRIBUTARIO.pptx` no `osg-templates`, senão a geração falha.
insert into storage.buckets (id, name, public)
values ('osg-templates', 'osg-templates', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('wp-apresentacoes', 'wp-apresentacoes', false)
on conflict (id) do nothing;
