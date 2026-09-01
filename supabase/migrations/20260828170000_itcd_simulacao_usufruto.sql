-- ════════════════════════════════════════════════════════════════════════════
-- O USUFRUTO, E O NOME DA SIMULAÇÃO
--
-- Duas coisas que faltavam para a simulação ser registro de execução completo. Elas
-- vêm juntas porque nenhuma das duas foi aplicada em lugar nenhum: separá-las seria
-- criar dois passos humanos no chat do Lovable sem nenhum ganho.
--
-- O que JÁ RODOU no sandbox continua nos arquivos de antes — 20260826154524
-- (as tabelas) e 20260828140000 (o quadro congelado). Migration aplicada é
-- histórico e não se reescreve: um ambiente novo tem de ser reconstruído pelos
-- mesmos arquivos que produziram o banco atual.
--
-- IDEMPOTENTE — `if not exists` em tabela, coluna, tipo e constraint, `drop policy
-- if exists` antes de cada policy. Ela vai por dois caminhos (sandbox pelo CLI,
-- produção pelo chat) e sobre bases em estágios diferentes.
--
--   1. O NOME da simulação
--   2. O USUFRUTO: parâmetros do ato, o quadro e as concessões
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. O NOME ──────────────────────────────────────────────────────
-- Hoje uma simulação só se chama pela ordem em que foi gerada: "Versão 1", "Versão
-- 2". Isso responde QUANDO, não O QUÊ. As variantes que a OSG leva ao cliente diferem
-- pelo que foi decidido — se houve reserva, de quem sai a instituição, qual o alvo de
-- voz e voto — e é isso que quem procura no histórico está procurando.
--
-- NULO por padrão: nulo significa "não tem nome", e a tela cai no rótulo da versão. Um
-- default 'Versão N' seria dado derivado gravado em coluna, e ficaria errado no dia em
-- que a numeração fosse recontada. SEM `unique`: dois cenários podem se chamar "Sem
-- reserva" em competências diferentes; quem identifica é o `id`.
--
-- O CHECK proíbe apenas string em branco: '' e '   ' são "sem nome" escrito de outra
-- forma, e deixar passar daria uma simulação sem rótulo nenhum na lista.
--
-- Renomear não é fato tributário: nada aqui toca valor, quota ou status.

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
-- O usufruto é ATO PRÓPRIO, e não um detalhe da doação. Ele tem natureza de operação
-- própria na SEFAZ/MT, guia própria, base própria e direção INVERTIDA: quem institui é
-- o doador declarante e o usufrutuário é o beneficiário.
--
-- E ele responde outra pergunta. A doação diz quem fica com as QUOTAS; o usufruto diz
-- quem fica com o VOTO. No caso de referência o fundador termina com 0% de participação
-- e 51% de voz e voto — dois números que nenhuma tabela da doação sabe dizer.
--
-- ── AS DUAS APURAÇÕES, DUAS GUIAS, DUAS DECISÕES ────────────────────────────
-- Guia 337978: DOAÇÃO COM RESERVA DE USUFRUTO — base 100% de R$ 4.448.500,00
-- Guia 338021: INSTITUIÇÃO DE USUFRUTO        — base  70% de R$ 1.284.747,00
--
-- Protocoladas no mesmo dia, pelo mesmo cliente, com a mesma UPF. A base é escolha
-- entre dois artigos do Decreto 2.125/03, e é escolha COM CONSEQUÊNCIA:
--
--   art. 11, §2º, I    redução automática a 70% no ato, e outra parcela devida na
--                      EXTINÇÃO do usufruto. Pagar menos agora é adiar.
--   art. 28, §3º, III  base integral antes da doação, COM ENCERRAMENTO: nada mais
--                      devido na renúncia ou na extinção.
--
-- São duas decisões independentes porque são duas guias — daí duas colunas, e não uma.

alter table public.itcd_simulacao
  -- A doação transmite a nua propriedade e o doador guarda uso, gozo e voto? Muda a
  -- NATUREZA da guia da doação, não o quadro dela.
  add column if not exists com_reserva          boolean not null default false,
  -- Os padrões são os das duas guias executadas, não uma preferência de tela.
  add column if not exists pct_base_reserva     numeric(5,2) not null default 100.00,
  add column if not exists pct_base_instituicao numeric(5,2) not null default 70.00;

do $$
begin
  -- O intervalo é o do motor: `(0, 100]`. NÃO se restringe a 70 e 100 — são os dois
  -- valores que a lei usa hoje e os dois que a tela oferece, mas travar o domínio
  -- aqui transformaria uma mudança de decreto em migration.
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

-- ── Os dois domínios fechados do usufruto ───────────────────────────────────
do $$
begin
  if not exists (select 1 from pg_type where typname = 'itcd_papel_usufruto') then
    -- Na mesma gramática de Doador/Donatário da doação:
    --   usufrui = USUFRUTUÁRIO,    recebe uso, gozo e voto. É dele o alvo de %.
    --   concede = NU-PROPRIETÁRIO, segue dono das quotas e passa o voto adiante.
    -- "Nu-proprietário" é o termo do instrumento: propriedade sem o uso.
    create type public.itcd_papel_usufruto as enum ('usufrui', 'concede');
  end if;
  if not exists (select 1 from pg_type where typname = 'itcd_origem_usufruto') then
    -- A RESERVA nasce da própria doação e não tem guia própria: ela vive DENTRO da
    -- guia da doação. A INSTITUIÇÃO é ato declarado, com guia e imposto próprios.
    -- É a distinção que decide se a linha gera guia — por isso é coluna, não cálculo.
    create type public.itcd_origem_usufruto as enum ('reserva', 'instituicao');
  end if;
end $$;

-- ── O QUADRO DO USUFRUTO, congelado ─────────────────────────────────────────
-- Mesma regra do quadro da doação: o retrato é gravado, não derivado. Plena, nua e
-- usufruto SÃO deriváveis das concessões — mas derivar na exibição faria a simulação
-- de março ler o motor de agosto, e "histórico" deixaria de significar algo.
--
-- E duas coisas aqui não são deriváveis de jeito nenhum: o PAPEL, que é escolha do
-- analista, e as QUOTAS de quem entrou só neste ato — conceder usufruto não exige ter
-- doado, e um sócio que ficou fora da doação pode instituir sobre o que sempre teve.
create table if not exists public.itcd_simulacao_usufruto (
  id                     uuid primary key default gen_random_uuid(),
  simulacao_id           uuid not null references public.itcd_simulacao(id) on delete cascade,
  pessoa_id              uuid not null references public.pessoa(id),
  papel                  public.itcd_papel_usufruto not null,
  -- Participação final que esta linha carregava. O usufruto reparte o VOTO destas
  -- quotas, não as quotas: o número não muda por causa dele.
  quotas                 integer not null default 0 check (quotas >= 0),
  -- Quotas que ela tem E vota.
  quotas_plena           integer not null default 0 check (quotas_plena >= 0),
  -- Quotas que ela tem e não vota, pelas duas origens, separadas porque a reserva é
  -- automática e a instituição é ato tributado.
  quotas_nua_reserva     integer not null default 0 check (quotas_nua_reserva >= 0),
  quotas_nua_instituicao integer not null default 0 check (quotas_nua_instituicao >= 0),
  -- Quotas DE OUTROS que ela usufrui — e vota. Não entra na soma acima.
  quotas_usufruto        integer not null default 0 check (quotas_usufruto >= 0),
  created_at             timestamp with time zone not null default now(),
  unique (simulacao_id, pessoa_id),
  -- A CONFERÊNCIA DA LINHA: toda quota que a pessoa tem está em exatamente um dos
  -- três estados. É o invariante do modelo, e é o que impede um quadro pela metade
  -- de entrar como se fosse registro de execução.
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

-- ── AS CONCESSÕES: quem passa o voto a quem, e a guia que sai disso ──────────
-- Uma linha por PAR (de → para), e não por concedente: com dois usufrutuários saem
-- duas guias, cada uma com a sua isenção de 500 UPF. Isso não é detalhe de formato —
-- é a alavanca. Na instituição do Agro Aliança, declarar o casal em vez de só o
-- Avelino daria R$ 20.366,92 no lugar dos R$ 28.169,92 que a guia recolheu.
create table if not exists public.itcd_simulacao_concessao (
  id                   uuid primary key default gen_random_uuid(),
  simulacao_id         uuid not null references public.itcd_simulacao(id) on delete cascade,
  de_pessoa_id         uuid not null references public.pessoa(id),
  para_pessoa_id       uuid not null references public.pessoa(id),
  origem               public.itcd_origem_usufruto not null,
  quotas               integer not null check (quotas > 0),
  -- Os três cenários da guia de INSTITUIÇÃO. Anuláveis porque a reserva não tem guia
  -- própria — e obrigatórios quando ela tem, pela constraint abaixo.
  vlr_base_contabil    numeric(18,2) check (vlr_base_contabil >= 0),
  vlr_base_itr         numeric(18,2) check (vlr_base_itr >= 0),
  vlr_base_mercado     numeric(18,2) check (vlr_base_mercado >= 0),
  vlr_imposto_contabil numeric(18,2) check (vlr_imposto_contabil >= 0),
  vlr_imposto_itr      numeric(18,2) check (vlr_imposto_itr >= 0),
  vlr_imposto_mercado  numeric(18,2) check (vlr_imposto_mercado >= 0),
  created_at           timestamp with time zone not null default now(),
  unique (simulacao_id, de_pessoa_id, para_pessoa_id, origem),
  -- Ninguém concede usufruto para si mesmo: seria dizer que a pessoa passou o voto
  -- para ela própria, o que não muda nada e some no total.
  constraint itcd_simulacao_concessao_partes_ck
    check (de_pessoa_id <> para_pessoa_id),
  -- OS TRÊS CENÁRIOS SÃO OBRIGATÓRIOS NA INSTITUIÇÃO, pela mesma razão de
  -- `itcd_simulacao_donatario`: cenário sem valor é cadastro incompleto, e gravar
  -- zero afirmaria um imposto que ninguém apurou. Na reserva os seis são nulos, e
  -- não zero: o imposto dela está na guia da doação, não aqui.
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

-- ── RLS: as duas novas seguem o pai, como as duas antigas ───────────────────
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
