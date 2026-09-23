-- Onde fica registrado cada deck da OSG (patrimonial e societária) gerado.
--
-- Espelha a `wp_apresentacao` da PT-03, de propósito: 13 das colunas são iguais
-- porque descrevem O ARQUIVO — qual molde, qual versão do gerador, que checksum,
-- que problemas — e isso não muda por a origem ter sido planilha ou cadastro.
--
-- **Não reaproveita `documento_arquivo`.** Aquela é a esteira de documento do
-- cliente, com `checklist_item_id`, `categoria`, `solicitacao_id` e `triado_em`:
-- uma apresentação gravada lá apareceria no checklist do cliente como se fosse
-- documento que ele precisa entregar. A `gerar-apresentacao` já dizia isso no
-- cabeçalho desde a primeira versão ("não mexe em documento_gerado/
-- documento_arquivo — reservado ao fluxo de minutas"); aqui a fronteira vira DDL.
--
-- ── As TRÊS diferenças para a `wp_apresentacao`, e por quê ───────────────────
--
-- 1. A âncora é `cliente_id`, não `importacao_id`: não existe importação deste
--    lado. O deck nasce do cadastro, que a equipe digita na tela.
--
-- 2. Existe `tipo`, porque um cliente tem DOIS decks distintos e cada um tem a
--    sua contagem de versões. Por isso a unique é `(cliente_id, tipo, versao)`.
--
-- 3. Existe `snapshot_dados`, e o tributário não precisa dela. Lá a FK aponta
--    para uma revisão IMUTÁVEL: o ponteiro já é um retrato, de graça. Aqui a FK
--    aponta para um cadastro VIVO — um mês depois ninguém consegue dizer o que o
--    deck afirmava. É a mesma razão pela qual a `documento_gerado`, que também
--    nasce de cadastro vivo, guarda `snapshot_dados` em 41 dos 41 documentos.

create table if not exists public.osg_apresentacao (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.cliente(id) on delete cascade,

  -- Qual dos dois decks. O texto é o mesmo que a Edge Function recebe em `tipo`.
  tipo text not null check (tipo in ('patrimonial', 'societaria')),

  -- Numeração por cliente E por tipo: gerar o societário não avança a versão do
  -- patrimonial.
  versao integer not null,

  -- O arquivo, no bucket privado `osg-apresentacoes`.
  storage_path text not null,
  nome_arquivo text not null,
  tamanho bigint,
  checksum text,

  -- Com que molde e com que código saiu. É o que permite achar o que regerar.
  template_nome text not null,
  template_checksum text,
  versao_do_gerador text not null,

  -- O que faltou no cadastro na hora da geração, congelado. Vazio é geração
  -- limpa. É o que responde depois "entregamos esse deck sabendo o que faltava?".
  problemas jsonb not null default '[]'::jsonb,

  -- O conteúdo que virou slide, já montado (sociedades, quadro, faixas do
  -- organograma) — não as linhas cruas do cadastro. Linha crua teria de ser
  -- reinterpretada; o modelo montado é o que o slide de fato disse.
  snapshot_dados jsonb,

  gerado_por uuid references auth.users(id),
  created_at timestamptz not null default now(),

  -- Descarte é marca, não exclusão: apresentação entregue a cliente não some do
  -- histórico.
  excluido boolean not null default false
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'osg_apresentacao_versao_unica') then
    alter table public.osg_apresentacao
      add constraint osg_apresentacao_versao_unica unique (cliente_id, tipo, versao);
  end if;
end $$;

create index if not exists osg_apresentacao_cliente_idx
  on public.osg_apresentacao (cliente_id, tipo) where excluido = false;

comment on table public.osg_apresentacao is
  'Cada .pptx da OSG gerado a partir do cadastro, com o molde, a versão e o retrato dos dados que o produziram.';
comment on column public.osg_apresentacao.snapshot_dados is
  'O conteúdo montado que virou slide. Existe porque o cadastro é vivo: sem o retrato não há como explicar um deck antigo.';
comment on column public.osg_apresentacao.problemas is
  'O que faltava no cadastro quando o deck saiu. A geração não é bloqueada por isso — é registrada.';

-- RLS: espelha o cadastro da OSG, não o do papel de trabalho. Quem enxerga o
-- cliente enxerga as apresentações dele, pela mesma `cliente_visivel_para` que
-- protege `bem`, `pessoa` e `matricula`.
alter table public.osg_apresentacao enable row level security;

drop policy if exists "quem ve o cliente ve a apresentacao osg" on public.osg_apresentacao;
create policy "quem ve o cliente ve a apresentacao osg"
  on public.osg_apresentacao for select
  using (excluido = false and public.cliente_visivel_para(cliente_id));

drop policy if exists "admin can view deleted osg_apresentacao" on public.osg_apresentacao;
create policy "admin can view deleted osg_apresentacao"
  on public.osg_apresentacao for select
  using (excluido = true and has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "team_member+ can insert osg_apresentacao" on public.osg_apresentacao;
create policy "team_member+ can insert osg_apresentacao"
  on public.osg_apresentacao for insert
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and public.cliente_visivel_para(cliente_id)
  );

-- NÃO EXISTE POLICY DE DELETE, e a ausência é herdada da `wp_apresentacao`: uma
-- apresentação entregue a cliente não se apaga do histórico, só se marca.
--
-- Isso tem uma consequência que o código precisa conhecer. Quando o upload do
-- arquivo falha depois de a versão já ter sido reservada, a `registrarApresentacao` tenta
-- desfazer a linha — e sob RLS um DELETE sem policy **não levanta erro**: afeta
-- zero linhas e devolve sucesso. Por isso ela confere as linhas apagadas, e não a
-- ausência de erro, e avisa quando a versão fica órfã para um admin descartar.
--
-- Só o admin, e só para marcar como descartada. Não existe UPDATE de conteúdo: o
-- registro de uma geração é retrato, igual ao da importação.
drop policy if exists "admin can soft delete osg_apresentacao" on public.osg_apresentacao;
create policy "admin can soft delete osg_apresentacao"
  on public.osg_apresentacao for update
  using (has_role(auth.uid(), 'admin'::app_role));

-- O bucket já existe no sandbox desde 14/08, criado à mão e vazio. Declarar aqui
-- conserta a dívida e garante que ele exista em produção também.
--
-- **O ARQUIVO dos moldes continua sendo passo manual**: bucket viaja por
-- migration, .pptx não viaja em git. Quem levar isto para produção precisa ter o
-- `TEMPLATE_PATRIMONIAL.pptx` e o `TEMPLATE_SOCIETARIA.pptx` no `osg-templates`.
insert into storage.buckets (id, name, public)
values ('osg-apresentacoes', 'osg-apresentacoes', false)
on conflict (id) do nothing;
