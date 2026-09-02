-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260828191819, nome `itcd_simulacao_usufruto` tal como registrado la.
-- Aplicada no banco por fora do repositorio e trazida para ca para o diretorio e
-- o ledger voltarem a bater, mesmo procedimento da reconciliacao de 26/08/2026
-- descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

-- ── 1. O NOME ─────────────────────────────────────────────────────────────
alter table public.itcd_simulacao
  add column if not exists nome text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'itcd_simulacao_nome_nao_vazio'
  ) then
    alter table public.itcd_simulacao
      add constraint itcd_simulacao_nome_nao_vazio
      check (nome is null or btrim(nome) <> '');
  end if;
end $$;

comment on column public.itcd_simulacao.nome is
  'Nome dado ao cenário pelo analista ("Sem reserva", "51% pelo Avelino"). NULL = sem '
  'nome, e a tela o chama pela versão. Não identifica: quem identifica é o id.';

-- ── 2. O USUFRUTO ─────────────────────────────────────────────────────────────
alter table public.itcd_simulacao
  add column if not exists com_reserva          boolean not null default false,
  add column if not exists pct_base_reserva     numeric(5,2) not null default 100.00,
  add column if not exists pct_base_instituicao numeric(5,2) not null default 70.00;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'itcd_simulacao_pct_base_reserva_ck'
  ) then
    alter table public.itcd_simulacao
      add constraint itcd_simulacao_pct_base_reserva_ck
      check (pct_base_reserva > 0 and pct_base_reserva <= 100);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'itcd_simulacao_pct_base_instituicao_ck'
  ) then
    alter table public.itcd_simulacao
      add constraint itcd_simulacao_pct_base_instituicao_ck
      check (pct_base_instituicao > 0 and pct_base_instituicao <= 100);
  end if;
end $$;

comment on column public.itcd_simulacao.com_reserva is
  'true = a guia da doação sai como DOAÇÃO COM RESERVA DE USUFRUTO: o doador transmite '
  'a nua propriedade e guarda uso, gozo e voto. Não altera as quotas doadas — altera a '
  'natureza da operação e a base do cálculo.';
comment on column public.itcd_simulacao.pct_base_reserva is
  'Percentual do valor que se TRIBUTA na guia da doação com reserva. 100 = art. 28, '
  '§3º, III, com encerramento da tributação. 70 = art. 11, §2º, I, e fica parcela '
  'devida na extinção do usufruto. Sem efeito quando com_reserva é false.';
comment on column public.itcd_simulacao.pct_base_instituicao is
  'O mesmo, para a guia de INSTITUIÇÃO DE USUFRUTO. Decisão independente da anterior: '
  'são duas guias, e o caso de referência usou 100 numa e 70 na outra no mesmo dia.';

do $$
begin
  if not exists (select 1 from pg_type where typname = 'itcd_papel_usufruto') then
    create type public.itcd_papel_usufruto as enum ('usufrui', 'concede');
  end if;
  if not exists (select 1 from pg_type where typname = 'itcd_origem_usufruto') then
    create type public.itcd_origem_usufruto as enum ('reserva', 'instituicao');
  end if;
end $$;

create table if not exists public.itcd_simulacao_usufruto (
  id                     uuid primary key default gen_random_uuid(),
  simulacao_id           uuid not null references public.itcd_simulacao(id) on delete cascade,
  pessoa_id              uuid not null references public.pessoa(id),
  papel                  public.itcd_papel_usufruto not null,
  quotas                 integer not null default 0 check (quotas >= 0),
  quotas_plena           integer not null default 0 check (quotas_plena >= 0),
  quotas_nua_reserva     integer not null default 0 check (quotas_nua_reserva >= 0),
  quotas_nua_instituicao integer not null default 0 check (quotas_nua_instituicao >= 0),
  quotas_usufruto        integer not null default 0 check (quotas_usufruto >= 0),
  created_at             timestamp with time zone not null default now(),
  unique (simulacao_id, pessoa_id),
  constraint itcd_simulacao_usufruto_fecha_ck
    check (quotas_plena + quotas_nua_reserva + quotas_nua_instituicao = quotas)
);

comment on table public.itcd_simulacao_usufruto is
  'O quadro de usufruto de uma simulação, uma linha por pessoa: em que papel entrou e '
  'como as quotas dela se dividem entre propriedade plena e nua propriedade. '
  'Congelado — abrir uma simulação é LER.';
comment on column public.itcd_simulacao_usufruto.papel is
  'usufrui = usufrutuário, recebe uso, gozo e voto (e é o beneficiário na guia). '
  'concede = nu-proprietário, segue dono das quotas e passa o voto adiante (e é o '
  'declarante da guia de instituição).';
comment on column public.itcd_simulacao_usufruto.quotas_usufruto is
  'Quotas de OUTROS que esta pessoa usufrui. Com dois usufrutuários do mesmo bloco o '
  'número aparece nas duas linhas: o direito é conjunto, com acrescimento ao '
  'sobrevivente (art. 1.411 do Código Civil). Somar a coluna conta o bloco duas vezes.';

create table if not exists public.itcd_simulacao_concessao (
  id                   uuid primary key default gen_random_uuid(),
  simulacao_id         uuid not null references public.itcd_simulacao(id) on delete cascade,
  de_pessoa_id         uuid not null references public.pessoa(id),
  para_pessoa_id       uuid not null references public.pessoa(id),
  origem               public.itcd_origem_usufruto not null,
  quotas               integer not null check (quotas > 0),
  vlr_base_contabil    numeric(18,2) check (vlr_base_contabil >= 0),
  vlr_base_itr         numeric(18,2) check (vlr_base_itr >= 0),
  vlr_base_mercado     numeric(18,2) check (vlr_base_mercado >= 0),
  vlr_imposto_contabil numeric(18,2) check (vlr_imposto_contabil >= 0),
  vlr_imposto_itr      numeric(18,2) check (vlr_imposto_itr >= 0),
  vlr_imposto_mercado  numeric(18,2) check (vlr_imposto_mercado >= 0),
  created_at           timestamp with time zone not null default now(),
  unique (simulacao_id, de_pessoa_id, para_pessoa_id, origem),
  constraint itcd_simulacao_concessao_partes_ck
    check (de_pessoa_id <> para_pessoa_id),
  constraint itcd_simulacao_concessao_valores_ck check (
    (origem = 'reserva'
      and vlr_base_contabil is null and vlr_base_itr is null
      and vlr_base_mercado is null and vlr_imposto_contabil is null
      and vlr_imposto_itr is null and vlr_imposto_mercado is null)
    or (origem = 'instituicao'
      and vlr_base_contabil is not null and vlr_base_itr is not null
      and vlr_base_mercado is not null and vlr_imposto_contabil is not null
      and vlr_imposto_itr is not null and vlr_imposto_mercado is not null)
  )
);

comment on table public.itcd_simulacao_concessao is
  'Quem passou o voto de quantas quotas a quem, numa simulação. Uma linha por par '
  'concedente → usufrutuário, que é uma guia quando a origem é instituição.';
comment on column public.itcd_simulacao_concessao.origem is
  'reserva = nasceu da própria doação, automática, sem guia própria (o imposto está '
  'na guia da doação). instituicao = ato declarado do proprietário, com guia, base e '
  'imposto próprios, e direção invertida: quem institui é o doador declarante.';
comment on column public.itcd_simulacao_concessao.quotas is
  'Quantas quotas tiveram o usufruto concedido neste par. Na instituição do caso de '
  'referência a conta sugeriu 1.284.748 e o instrumento instituiu 1.284.747 — a '
  'quantidade é decisão do instrumento, e é por isso que ela é gravada e não derivada.';

alter table public.itcd_simulacao_usufruto  enable row level security;
alter table public.itcd_simulacao_concessao enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['itcd_simulacao_usufruto',
                           'itcd_simulacao_concessao']
  loop
    execute format('drop policy if exists %I on public.%I',
                   'osg_cluster_select_' || t, t);
    execute format($f$
      create policy %I on public.%I for select to authenticated
        using (cliente_visivel_para(cliente_id_de_itcd_simulacao(simulacao_id)))
    $f$, 'osg_cluster_select_' || t, t);

    execute format('drop policy if exists %I on public.%I',
                   'team_member+ can write ' || t, t);
    execute format($f$
      create policy %I on public.%I for all to authenticated
        using (has_role_or_higher(auth.uid(), 'team_member'::app_role))
        with check (has_role_or_higher(auth.uid(), 'team_member'::app_role))
    $f$, 'team_member+ can write ' || t, t);
  end loop;
end $$;