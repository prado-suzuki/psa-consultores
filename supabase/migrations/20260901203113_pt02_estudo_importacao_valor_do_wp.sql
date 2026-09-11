-- PT-02: onde o papel de trabalho de Planejamento Tributário passa a morar.
--
-- Três tabelas, e não uma, porque o WP muda no meio do trabalho: o Fiscal sobe,
-- olha o slide, corrige a planilha e sobe de novo. Com uma tabela só, o segundo
-- upload sobrescreveria o primeiro e se perderia a versão que gerou o slide já
-- entregue ao cliente. Foi assim que o estudo do Grupo Piccini terminou com
-- 13.828.554 no slide e 17.587.813 na planilha, no mesmo cliente.
--
--   wp_estudo    o trabalho, um por cliente e OS. Sobrevive aos uploads e é onde
--                a PT-04 vai pendurar o estado do workflow.
--   wp_importacao cada upload: o arquivo, o checksum e a versão do mapa que leu.
--   wp_valor     cada número lido, com o endereço da célula de onde saiu.
--
-- Alçada, decidida com o Bernardo e o Eduardo em 01/09/2026:
--   lê      team_member+, e só de cliente que ele enxerga
--   escreve team_member+
--   apaga   admin, e por marca (`excluido`), não por DELETE
--   edita   ninguém, fora o estado do estudo
--
-- **Importação e valor são imutáveis de propósito.** Eles são o retrato do que a
-- planilha dizia naquele dia; um valor editável faria o checksum e a versão do
-- mapa guardados ao lado virarem mentira. Corrigir é corrigir a planilha e subir
-- de novo, e é isso que mantém o WP e o slide falando a mesma língua.
--
-- **O cliente não vê nada disto, e não é esquecimento.** O WP é evidência
-- interna; o cliente recebe a apresentação. Não acrescente policy de cliente aqui
-- por simetria com `documento_arquivo` e `solicitacao`.

-- ---------------------------------------------------------------- enums

do $$
begin
  if not exists (select 1 from pg_type where typname = 'wp_bloco') then
    -- Os quatro últimos ainda não são lidos pelo parser, e entram agora para não
    -- exigir uma migration por bloco: `alter type ... add value` não divide
    -- transação com o uso do valor, o que obriga a um arquivo separado por vez.
    create type public.wp_bloco as enum (
      'resumo', 'dre', 'apuracao', 'farol', 'imoveis', 'bens', 'dividas'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'wp_unidade') then
    create type public.wp_unidade as enum ('moeda', 'percentual', 'texto', 'marcador');
  end if;
end $$;

-- --------------------------------------------------------------- tabelas

create table if not exists public.wp_estudo (
  id uuid primary key default gen_random_uuid(),
  cliente_id uuid not null references public.cliente(id),
  -- A OS é a âncora: a PT-04 manda resolver os projetos "somente por
  -- ordem_servico_id", sem cair para busca por cliente.
  ordem_servico_id uuid references public.ordem_servico(id),
  descricao text,
  criado_por uuid references public.profiles(id),
  excluido boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.wp_estudo is
  'O trabalho de Planejamento Tributário de um cliente numa OS. Sobrevive aos uploads do WP.';

create table if not exists public.wp_importacao (
  id uuid primary key default gen_random_uuid(),
  estudo_id uuid not null references public.wp_estudo(id) on delete cascade,
  versao integer not null,
  -- O arquivo NÃO entra em `documento_arquivo`, e isso é decisão, não descuido.
  -- Aquela tabela aceitaria (`area` tem o valor `fiscal` e `fonte` tem `psa`), mas
  -- as listas de documento do cliente não filtram por área nem por categoria, e o
  -- WP apareceria no explorador de arquivos da OSG junto com RG e matrícula. O que
  -- se reusa é o mecanismo: `subirArquivoGcs` sobe o binário e devolve estes
  -- quatro campos, e a linha é gravada aqui.
  gcs_uri text,
  nome_original text,
  mime text,
  tamanho bigint,
  -- Vem do `finalize` do upload, calculado pelo backend. Bloqueia subir duas vezes
  -- o mesmo arquivo, que é o engano mais comum.
  checksum text not null,
  -- Com que régua esta revisão foi lida. Quando o modelo mudar e o mapa subir de
  -- versão, as revisões antigas continuam explicáveis.
  versao_do_mapa text not null,
  importado_por uuid references public.profiles(id),
  -- O que a leitura reclamou, guardado junto: sem isto, saber por que uma revisão
  -- ficou incompleta exigiria subir o arquivo de novo.
  problemas jsonb not null default '[]'::jsonb,
  excluido boolean not null default false,
  created_at timestamptz not null default now()
);

comment on table public.wp_importacao is
  'Um upload do WP. Imutável: corrigir é subir de novo, gerando a importação seguinte.';

create table if not exists public.wp_valor (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.wp_importacao(id) on delete cascade,
  bloco public.wp_bloco not null,
  rotulo text not null,
  nivel smallint,
  cenario text not null,
  contribuinte text,
  ano integer not null,
  -- Dois campos porque a planilha traz número e texto na mesma coluna: a linha
  -- "Opção pela forma de apuração" devolve `Presumido`, e o `Farol` traz alíquota
  -- ao lado de marcador de sim e não.
  valor_numerico numeric,
  valor_texto text,
  unidade public.wp_unidade not null,
  -- `Resumo!D16`. É o que deixa conferir na planilha e depurar estudo torto.
  origem_celula text not null
);

comment on table public.wp_valor is
  'Cada número lido do WP, com o endereço da célula de origem.';

-- ------------------------------------------------------------ restrições

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'wp_importacao_versao_unica') then
    alter table public.wp_importacao
      add constraint wp_importacao_versao_unica unique (estudo_id, versao);
  end if;

  -- A regra que o Eduardo definiu: o mesmo arquivo não sobe duas vezes.
  if not exists (select 1 from pg_constraint where conname = 'wp_importacao_checksum_unico') then
    alter table public.wp_importacao
      add constraint wp_importacao_checksum_unico unique (estudo_id, checksum);
  end if;

  -- Uma célula produz um valor. Duplicata aqui é bug de leitura, não dado.
  if not exists (select 1 from pg_constraint where conname = 'wp_valor_celula_unica') then
    alter table public.wp_valor
      add constraint wp_valor_celula_unica unique (importacao_id, origem_celula);
  end if;

  -- Um valor é número ou texto, nunca os dois nem nenhum.
  if not exists (select 1 from pg_constraint where conname = 'wp_valor_tem_um_valor') then
    alter table public.wp_valor
      add constraint wp_valor_tem_um_valor check (
        (valor_numerico is not null and valor_texto is null)
        or (valor_numerico is null and valor_texto is not null)
      );
  end if;
end $$;

create index if not exists wp_estudo_cliente_idx on public.wp_estudo (cliente_id) where excluido = false;
create index if not exists wp_estudo_os_idx on public.wp_estudo (ordem_servico_id) where excluido = false;
create index if not exists wp_importacao_estudo_idx on public.wp_importacao (estudo_id, versao desc) where excluido = false;
create index if not exists wp_valor_importacao_idx on public.wp_valor (importacao_id, bloco);

drop trigger if exists wp_estudo_updated_at on public.wp_estudo;
create trigger wp_estudo_updated_at
  before update on public.wp_estudo
  for each row execute function public.update_updated_at_column();

-- ------------------------------------------------------------------ RLS

alter table public.wp_estudo enable row level security;
alter table public.wp_importacao enable row level security;
alter table public.wp_valor enable row level security;

-- O recorte das filhas sobe até o estudo por esta função, em vez de repetir o
-- join em seis policies. `security definer` porque a policy da filha não pode
-- depender da policy da mãe: sem isto a checagem daria falso para quem enxerga o
-- estudo, já que a leitura de dentro da policy também passa por RLS.
create or replace function public.wp_estudo_visivel(_estudo_id uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select exists (
    select 1 from public.wp_estudo e
    where e.id = _estudo_id
      and e.excluido = false
      and public.cliente_visivel_para(e.cliente_id)
  );
$$;

comment on function public.wp_estudo_visivel(uuid) is
  'Se a pessoa enxerga o estudo, e portanto as importações e os valores dele.';

-- wp_estudo -----------------------------------------------------------------

drop policy if exists "team_member+ can view wp_estudo" on public.wp_estudo;
create policy "team_member+ can view wp_estudo"
  on public.wp_estudo for select
  using (
    excluido = false
    and has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id)
  );

drop policy if exists "admin can view deleted wp_estudo" on public.wp_estudo;
create policy "admin can view deleted wp_estudo"
  on public.wp_estudo for select
  using (excluido = true and has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "team_member+ can insert wp_estudo" on public.wp_estudo;
create policy "team_member+ can insert wp_estudo"
  on public.wp_estudo for insert
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id)
  );

drop policy if exists "team_member+ can update wp_estudo" on public.wp_estudo;
create policy "team_member+ can update wp_estudo"
  on public.wp_estudo for update
  using (
    excluido = false
    and has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and cliente_visivel_para(cliente_id)
  );

drop policy if exists "admin can delete wp_estudo" on public.wp_estudo;
create policy "admin can delete wp_estudo"
  on public.wp_estudo for delete
  using (has_role(auth.uid(), 'admin'::app_role));

-- wp_importacao ----------------------------------------------------------------

drop policy if exists "quem ve o estudo ve a importacao" on public.wp_importacao;
create policy "quem ve o estudo ve a importacao"
  on public.wp_importacao for select
  using (excluido = false and wp_estudo_visivel(estudo_id));

drop policy if exists "admin can view deleted wp_importacao" on public.wp_importacao;
create policy "admin can view deleted wp_importacao"
  on public.wp_importacao for select
  using (excluido = true and has_role(auth.uid(), 'admin'::app_role));

drop policy if exists "team_member+ can insert wp_importacao" on public.wp_importacao;
create policy "team_member+ can insert wp_importacao"
  on public.wp_importacao for insert
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and wp_estudo_visivel(estudo_id)
  );

-- Só o admin, e só para marcar como apagada. Não existe policy de UPDATE para
-- team_member aqui: importação é retrato, e retrato não se edita.
drop policy if exists "admin can soft delete wp_importacao" on public.wp_importacao;
create policy "admin can soft delete wp_importacao"
  on public.wp_importacao for update
  using (has_role(auth.uid(), 'admin'::app_role));

-- wp_valor ------------------------------------------------------------------

drop policy if exists "quem ve a importacao ve o valor" on public.wp_valor;
create policy "quem ve a importacao ve o valor"
  on public.wp_valor for select
  using (
    exists (
      select 1 from public.wp_importacao r
      where r.id = importacao_id and r.excluido = false and wp_estudo_visivel(r.estudo_id)
    )
  );

drop policy if exists "team_member+ can insert wp_valor" on public.wp_valor;
create policy "team_member+ can insert wp_valor"
  on public.wp_valor for insert
  with check (
    has_role_or_higher(auth.uid(), 'team_member'::app_role)
    and exists (
      select 1 from public.wp_importacao r
      where r.id = importacao_id and wp_estudo_visivel(r.estudo_id)
    )
  );

-- Sem UPDATE e sem DELETE em `wp_valor`, de propósito. O valor morre junto com a
-- revisão, pelo `on delete cascade`.
