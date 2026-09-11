-- A doação de quotas com reserva de usufruto entra no livro, e o ônus sobre a
-- quota vira ESTADO da sociedade.
--
-- Fatia 1 da frente "AC de transferência de quotas entre sócios da
-- participações" (docs/osg/doacao-de-quotas-com-usufruto.md). O livro de
-- movimentos (20260818192932) já sabia registrar `doacao`: quem doa, para quem,
-- quantas quotas. Faltava tudo o que a 3ª alteração da MMS Participações
-- publica além disso, e que a resolução da peça não tem de onde tirar:
--
--   1. a ORIGEM da doação no patrimônio do doador (parte legítima e parte
--      disponível, quota a quota) e a DATA do instrumento particular de doação
--      que a peça anexa. São atributos do movimento, e ficam nele;
--   2. o USUFRUTO reservado (o doador transmite a nua propriedade e guarda uso,
--      gozo e voto, para si e para o cônjuge) e os GRAVAMES (inalienabilidade,
--      impenhorabilidade, incomunicabilidade, reversibilidade) sobre as quotas
--      doadas.
--
-- O item 2 NÃO é coluna do movimento, e a razão está no próprio corpus: o
-- gravame reaparece, palavra por palavra, em três pontos fixos de TODA
-- consolidação futura da sociedade (capítulo de capital, capítulo de alienação
-- de quotas e a cláusula autônoma de usufruto e voto), inclusive nas alterações
-- que nada têm a ver com doação. Se ele fosse texto de uma peça, a peça seguinte
-- o apagaria da versão vigente do contrato. Por isso é tabela própria, lida por
-- quem projeta o estado da sociedade, e não só por quem escreve a resolução da
-- doação. A instituição de usufruto avulsa (ato próprio, sem quota mudando de
-- mão, como na guia 338021 do Agro Aliança) cabe na mesma tabela sem movimento.
--
-- A calculadora de ITCD já modela usufruto (`itcd_simulacao_usufruto` e
-- `itcd_simulacao_concessao`), mas como CENÁRIO congelado de uma simulação. Isto
-- aqui é o fato: o que o instrumento vai publicar e o contrato passa a carregar.
--
-- Nada aqui aplica em produção. Sandbox pelo `bun run db:sync --apply`,
-- produção pelo chat do Lovable. Idempotente: roda duas vezes e dá no mesmo.

-- ---------------------------------------------------------------------------
-- 1. O que a doação declara sobre si mesma, no movimento.
-- ---------------------------------------------------------------------------
alter table public.movimentacao_quotas
  add column if not exists quotas_legitima   bigint,
  add column if not exists quotas_disponivel bigint,
  add column if not exists instrumento_data  date;

-- Origem declarada é opcional (nem todo instrumento a declara), mas quando
-- declarada é quota a quota: legítima + disponível = quotas doadas. Fora da
-- doação as três colunas não têm significado e ficam nulas: cessão onerosa não
-- sai de legítima nenhuma, e aporte não tem instrumento de doação.
do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.movimentacao_quotas'::regclass
                    and conname = 'movimentacao_quotas_origem_da_doacao_check') then
    alter table public.movimentacao_quotas
      add constraint movimentacao_quotas_origem_da_doacao_check
        check (
          case when tipo = 'doacao' then
            (quotas_legitima is null and quotas_disponivel is null)
            or (quotas_legitima is not null and quotas_disponivel is not null
                and quotas_legitima >= 0 and quotas_disponivel >= 0
                and quotas_legitima + quotas_disponivel = quotas)
          else
            quotas_legitima is null and quotas_disponivel is null and instrumento_data is null
          end
        );
  end if;
end $$;

comment on column public.movimentacao_quotas.quotas_legitima is
  'Quotas doadas da parte LEGÍTIMA do patrimônio do doador. Só na doação, e sempre junto de quotas_disponivel: as duas somam as quotas do movimento. Nulas quando o instrumento não declara a origem. A sobra da divisão em metades fica na legítima, como nos instrumentos registrados.';
comment on column public.movimentacao_quotas.quotas_disponivel is
  'Quotas doadas da parte DISPONÍVEL do patrimônio do doador. Ver quotas_legitima.';
comment on column public.movimentacao_quotas.instrumento_data is
  'Data do instrumento particular de doação que a alteração contratual anexa como parte integrante. Só na doação. Não é a data do movimento (data_movimento), que é a do ato societário.';

-- ---------------------------------------------------------------------------
-- 2. O ônus sobre a quota: usufruto e gravames, como estado da sociedade.
-- ---------------------------------------------------------------------------
create table if not exists public.onus_quotas (
  id                         uuid primary key default gen_random_uuid(),
  cliente_id                 uuid not null references public.cliente(id) on delete cascade,
  empresa_pessoa_id          uuid not null references public.pessoa(id),
  -- O movimento que criou o ônus (a doação). ON DELETE CASCADE: desfazer o
  -- ato leva o movimento, e um ônus sem a doação que o gerou descreveria quota
  -- que ninguém recebeu. Nulo na instituição de usufruto avulsa.
  movimento_id               uuid references public.movimentacao_quotas(id) on delete cascade,
  -- Quem tem a quota e, se houver usufruto, não vota: o donatário.
  nu_proprietario_pessoa_id  uuid not null references public.pessoa(id),
  -- Quem usufrui: uso, gozo e voto. LISTA porque o casal usufrui em conjunto,
  -- com acrescimento ao sobrevivente (art. 1.411 do Código Civil). Vazia
  -- quando só há gravame, sem usufruto (a cessão gratuita de 2021).
  usufrutuario_pessoa_ids    uuid[] not null default '{}',
  usufruto_origem            text,
  -- O usufruto alcança o voto (art. 114 da Lei 6.404/76 via art. 1.053 do CC).
  -- É o padrão da casa; sem ele o usufrutuário recebe os frutos e não vota.
  usufruto_com_voto          boolean not null default true,
  quotas                     bigint not null,
  gravames                   text[] not null default '{}',
  -- Quando o ônus se extinguiu (óbito dos usufrutuários, revogação conjunta).
  -- Nulo enquanto vige. O histórico fica: extinguir não apaga.
  extinto_em                 date,
  created_at                 timestamptz not null default now(),
  created_by                 uuid,
  updated_at                 timestamptz not null default now(),
  updated_by                 uuid
);

do $$
begin
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.onus_quotas'::regclass
                    and conname = 'onus_quotas_quotas_check') then
    alter table public.onus_quotas
      add constraint onus_quotas_quotas_check check (quotas > 0);
  end if;

  -- Usufruto tem origem, e origem só existe com usufruto: `reserva` nasce da
  -- doação (o donatário devolve ao doador o voto do que recebeu), `instituicao`
  -- é ato próprio do proprietário.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.onus_quotas'::regclass
                    and conname = 'onus_quotas_usufruto_coerente_check') then
    alter table public.onus_quotas
      add constraint onus_quotas_usufruto_coerente_check
        check (
          (cardinality(usufrutuario_pessoa_ids) = 0 and usufruto_origem is null)
          or (cardinality(usufrutuario_pessoa_ids) > 0
              and usufruto_origem in ('reserva', 'instituicao'))
        );
  end if;

  -- Só os quatro gravames que os instrumentos recentes usam. "Indisponibilidade"
  -- (tríade de 2016) fica de fora de propósito: serve para LER o passivo
  -- herdado, nunca para gravar ônus novo.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.onus_quotas'::regclass
                    and conname = 'onus_quotas_gravames_check') then
    alter table public.onus_quotas
      add constraint onus_quotas_gravames_check
        check (gravames <@ array['inalienabilidade', 'impenhorabilidade',
                                 'incomunicabilidade', 'reversibilidade']::text[]);
  end if;

  -- Linha sem usufruto e sem gravame não é ônus nenhum.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.onus_quotas'::regclass
                    and conname = 'onus_quotas_tem_onus_check') then
    alter table public.onus_quotas
      add constraint onus_quotas_tem_onus_check
        check (cardinality(usufrutuario_pessoa_ids) > 0 or cardinality(gravames) > 0);
  end if;

  -- Ninguém usufrui a própria quota: isso é propriedade plena.
  if not exists (select 1 from pg_constraint
                  where conrelid = 'public.onus_quotas'::regclass
                    and conname = 'onus_quotas_nu_proprietario_nao_usufrui_check') then
    alter table public.onus_quotas
      add constraint onus_quotas_nu_proprietario_nao_usufrui_check
        check (not (nu_proprietario_pessoa_id = any (usufrutuario_pessoa_ids)));
  end if;
end $$;

create index if not exists idx_onus_quotas_empresa
  on public.onus_quotas (empresa_pessoa_id);
create index if not exists idx_onus_quotas_movimento
  on public.onus_quotas (movimento_id);

alter table public.onus_quotas enable row level security;

do $$
begin
  if not exists (select 1 from pg_trigger
                  where tgrelid = 'public.onus_quotas'::regclass
                    and tgname = 'trg_onus_quotas_updated_at') then
    create trigger trg_onus_quotas_updated_at
      before update on public.onus_quotas
      for each row execute function public.update_updated_at_column();
  end if;
end $$;

-- As MESMAS policies de ato_societario: quem enxerga o movimento enxerga o
-- ônus que ele criou. DELETE a team_member porque o ônus cai junto com o ato
-- desfeito (cascade), e extinguir/corrigir um ônus é gesto de consultor.
drop policy if exists "osg_cluster_select_onus_quotas" on public.onus_quotas;
create policy "osg_cluster_select_onus_quotas" on public.onus_quotas
  for select using (public.cliente_visivel_para(cliente_id));

drop policy if exists "team_member+ can insert onus_quotas" on public.onus_quotas;
create policy "team_member+ can insert onus_quotas" on public.onus_quotas
  for insert with check (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));

drop policy if exists "team_member+ can update onus_quotas" on public.onus_quotas;
create policy "team_member+ can update onus_quotas" on public.onus_quotas
  for update using (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));

drop policy if exists "team_member+ can delete onus_quotas" on public.onus_quotas;
create policy "team_member+ can delete onus_quotas" on public.onus_quotas
  for delete using (public.has_role_or_higher(auth.uid(), 'team_member'::public.app_role));

comment on table public.onus_quotas is
  'Ônus sobre quotas de uma sociedade: reserva ou instituição de usufruto (quem tem a quota e quem vota por ela) e gravames (inalienabilidade, impenhorabilidade, incomunicabilidade, reversibilidade). É ESTADO da sociedade, não texto de uma peça: toda consolidação futura reimprime o ônus vigente nos três pontos fixos do contrato, e é daqui que ela lê. Nasce da doação (movimento_id) ou de instituição avulsa (movimento_id nulo).';
comment on column public.onus_quotas.nu_proprietario_pessoa_id is
  'Quem tem a quota. Com usufruto, é quem NÃO vota por ela: o donatário. Sem usufruto (só gravame), é simplesmente o titular das quotas gravadas.';
comment on column public.onus_quotas.usufrutuario_pessoa_ids is
  'Quem usufrui (uso, gozo e, se usufruto_com_voto, voto). Lista porque o casal usufrui em conjunto e o direito acresce ao sobrevivente (art. 1.411 do CC). O bloco conta UMA vez no total, não uma por cabeça.';
comment on column public.onus_quotas.usufruto_origem is
  'reserva = veio da doação, o donatário concede de volta ao doador o voto do que recebeu. instituicao = ato próprio do proprietário, com guia própria. Nulo sem usufruto.';
comment on column public.onus_quotas.gravames is
  'Subconjunto de {inalienabilidade, impenhorabilidade, incomunicabilidade, reversibilidade}, extensivos aos frutos. Vazio quando só há usufruto.';
comment on column public.onus_quotas.extinto_em is
  'Data em que o ônus deixou de viger (óbito dos usufrutuários, revogação conjunta). Nulo enquanto vige; o consolidado só reimprime ônus vigente.';
