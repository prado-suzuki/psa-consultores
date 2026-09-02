-- ============================================================================
-- Calculadora de ITCD/MT — o domínio da simulação. SUC-01B.
-- ============================================================================
--
-- O QUE ESTA MIGRATION RESOLVE
--    A simulação não tem onde morar. Zero tabelas hoje — conferido por busca de
--    nome contendo itcd/itcmd/simula/upf/legitim/donat.
--
-- O QUE ELA NÃO FAZ, E POR QUÊ
--    Não cria campo de valor de ITR, porque ele já existe:
--    `matricula.vlr_imposto_anual`. O nome diz imposto, mas o campo guarda o
--    valor DECLARADO no ITR — é assim que o Diagnóstico Patrimonial o usa, é
--    isso que a OSG preenche, e o formulário da matrícula o rotula "ITR anual"
--    para imóvel rural e "IPTU anual" para urbano. O nome ficou infeliz; trocá-lo
--    é renomeação de coluna em uso, e não entra nesta migration.
--    Conferido nos 8 registros preenchidos do sandbox: sete são valor de terra —
--    R$ 13.188, R$ 9.182 e R$ 2.940 por hectare — e um, a matrícula 9.617 de
--    exercício 2020, traz exatamente um milésimo do valor da linha irmã de 2021.
--    Uma linha suja, não um campo ambíguo.
--    `bem.vlr_itr_iptu` também existe, e continua sem uso: não há campo para ele
--    em tela nenhuma, e está vazio em 27 de 27. O valor de imóvel vive na
--    matrícula, que é a regra do front (`valoresDoBem.ts`).
--
-- A REGRA QUE AMARRA O DESENHO
--    "Mudança cadastral ou de parâmetro não pode alterar silenciosamente uma
--    revisão antiga" (ponto de atenção da SUC-01B). Por isso a simulação é um
--    RETRATO COMPLETO: guarda a UPF, o universo de quotas, os totais do acervo,
--    as quotas de cada doador, as de cada donatário E o resultado apurado. Abrir
--    uma simulação antiga é LER, nunca recalcular.
--    Isso é o que dispensa versionar regra no banco: se a lei mudar, ou se o
--    motor mudar em qualquer detalhe, o número antigo continua o que era. A
--    alternativa — guardar parâmetro e reapurar ao abrir — faria o valor que foi
--    ao cliente mudar sozinho, e avisar "o motor mudou" não devolve o antigo.
--
-- Idempotente: vai ser aplicada por dois caminhos (sandbox pelo CLI, produção
-- pelo Lovable) e existir em duas versões.

-- ── 1. Enum ─────────────────────────────────────────────────────────────────
-- Um só. Não há enum de cenário: os três cenários são três COLUNAS da simulação,
-- e não linhas de uma tabela filha. Enum sem coluna que o use é peso morto.
do $$
begin
  if not exists (select 1 from pg_type where typname = 'itcd_simulacao_status') then
    -- `substituida` é o que uma revisão nova faz com a anterior: ela não é
    -- apagada nem editada, é sucedida. Sem isso, "histórico de revisões" viraria
    -- update no lugar, que é exatamente o que o card proíbe.
    create type public.itcd_simulacao_status as enum
      ('rascunho', 'gerada', 'aprovada', 'substituida');
  end if;
end $$;

-- ── 2. A simulação ──────────────────────────────────────────────────────────
--
-- NÃO existe tabela de UPF por competência, de propósito. Cada simulação carrega
-- a sua: `competencia` e `upf` ficam aqui, congelados. Uma tabela de série
-- serviria só para dizer ao analista qual é a UPF do mês — e isso a tela resolve
-- sugerindo, sem precisar de um parâmetro global que ninguém tem a obrigação de
-- atualizar. De quebra, mês sem UPF publicada deixa de ser bloqueio: o analista
-- informa o valor e a simulação registra o que usou.
create table if not exists public.itcd_simulacao (
  id                   uuid primary key default gen_random_uuid(),
  cliente_id           uuid not null references public.cliente(id) on delete cascade,
  -- A PJ cujas quotas são doadas.
  empresa_pessoa_id    uuid not null references public.pessoa(id),
  status               public.itcd_simulacao_status not null default 'rascunho',
  -- Retrato: competência E valor da UPF, juntos. A competência sozinha exigiria
  -- consultar a série em outro lugar na hora de exibir, e aí a simulação de hoje
  -- mudaria de resultado se aquele outro lugar mudasse.
  competencia          text not null,
  vlr_upf              numeric(10,2) not null check (vlr_upf > 0),
  -- Universo de quotas no momento da simulação.
  quotas_total         integer not null check (quotas_total > 0),
  -- Totais do acervo por cenário, congelados. NOT NULL: apurar os três cenários
  -- é o objetivo da calculadora, e simulação com cenário vazio não é entregável.
  -- O rascunho na tela pode ser parcial; o que se SALVA não.
  vlr_acervo_contabil  numeric(18,2) not null check (vlr_acervo_contabil >= 0),
  vlr_acervo_itr       numeric(18,2) not null check (vlr_acervo_itr >= 0),
  vlr_acervo_mercado   numeric(18,2) not null check (vlr_acervo_mercado >= 0),
  -- O imposto total de cada cenário. Nada aqui é recalculado ao abrir: a
  -- simulação é gravada INTEIRA, resultado incluído, e a tela só exibe.
  --
  -- É o que torna a tabela de faixas desnecessária no banco. Se a lei mudar, ou
  -- se o motor mudar — arredondamento, ordem de operação, qualquer coisa —, a
  -- simulação antiga continua mostrando o que mostrou, sem precisar versionar
  -- regra nenhuma. Recalcular ao abrir daria o oposto: o número que foi ao
  -- cliente mudaria sozinho, e avisar "o motor mudou" não devolveria o antigo.
  vlr_imposto_contabil numeric(18,2) not null check (vlr_imposto_contabil >= 0),
  vlr_imposto_itr      numeric(18,2) not null check (vlr_imposto_itr >= 0),
  vlr_imposto_mercado  numeric(18,2) not null check (vlr_imposto_mercado >= 0),
  -- Revisão: a nova aponta para a que sucedeu, e a antiga vira `substituida`.
  versao               integer not null default 1 check (versao > 0),
  origem_simulacao_id  uuid references public.itcd_simulacao(id) on delete set null,
  observacao           text,
  aprovada_por         uuid,
  aprovada_em          timestamp with time zone,
  created_at           timestamp with time zone not null default now(),
  created_by           uuid,
  updated_at           timestamp with time zone not null default now(),
  updated_by           uuid
);

create index if not exists itcd_simulacao_cliente_idx
  on public.itcd_simulacao (cliente_id, created_at desc);
create index if not exists itcd_simulacao_origem_idx
  on public.itcd_simulacao (origem_simulacao_id);

comment on table public.itcd_simulacao is
  'Uma apuração de ITCD na doação de quotas. Retrato: guarda a UPF, o universo de '
  'quotas e os totais do acervo que usou, para que mudança no cadastro não altere '
  'revisão antiga.';

-- ── 3. Quem doa ─────────────────────────────────────────────────────────────
-- A legítima é metade do patrimônio de CADA doador, dividida entre os herdeiros,
-- com teto ao inteiro por doador. Somar os patrimônios antes de dividir dá outro
-- número — logo as quotas por doador precisam estar registradas, não só o total.
create table if not exists public.itcd_simulacao_doador (
  id             uuid primary key default gen_random_uuid(),
  simulacao_id       uuid not null references public.itcd_simulacao(id) on delete cascade,
  doador_pessoa_id   uuid not null references public.pessoa(id),
  quotas             integer not null check (quotas > 0),
  created_at     timestamp with time zone not null default now(),
  unique (simulacao_id, doador_pessoa_id)
);

-- ── 4. Quem recebe ──────────────────────────────────────────────────────────
create table if not exists public.itcd_simulacao_donatario (
  id                     uuid primary key default gen_random_uuid(),
  simulacao_id           uuid not null references public.itcd_simulacao(id) on delete cascade,
  donatario_pessoa_id    uuid not null references public.pessoa(id),
  -- Calculada pelo motor.
  quotas_legitima        integer not null check (quotas_legitima >= 0),
  -- Escolhida pelo analista: o destino da parte disponível depende do cliente.
  quotas_disponivel      integer not null default 0 check (quotas_disponivel >= 0),
  -- Percentual do capital que este donatário já recebeu POR DOAÇÃO antes deste
  -- ato. Percentual, e não valor, porque é a formulação do motor.
  --
  -- Não confundir com quota pré-existente: a filha que já figura no quadro
  -- societário pode ter chegado lá por capital próprio integralizado, e isso NÃO
  -- é doação anterior. O quadro societário é lido ao vivo e não entra em coluna
  -- nenhuma — ele nem afeta o imposto, só a participação final exibida. Quanto
  -- daquela participação veio de instrumento de doação é o que só o analista
  -- sabe, e é o que este campo guarda.
  --
  -- A tela sugere o valor somando o que a pessoa já recebeu em simulações
  -- anteriores desta base, e o analista pode corrigir. `null` = nenhuma.
  pct_doacao_anterior    numeric(7,4) check (pct_doacao_anterior >= 0
                                            and pct_doacao_anterior <= 100),

  -- O RESULTADO deste donatário, gravado. Percentual com 4 casas, como o motor
  -- devolve. Base e imposto nos três cenários, para a tela não recalcular nada:
  -- abrir uma simulação é ler, não apurar de novo.
  percentual             numeric(7,4) not null check (percentual > 0
                                                     and percentual <= 100),
  vlr_base_contabil      numeric(18,2) not null check (vlr_base_contabil >= 0),
  vlr_base_itr           numeric(18,2) not null check (vlr_base_itr >= 0),
  vlr_base_mercado       numeric(18,2) not null check (vlr_base_mercado >= 0),
  vlr_imposto_contabil   numeric(18,2) not null check (vlr_imposto_contabil >= 0),
  vlr_imposto_itr        numeric(18,2) not null check (vlr_imposto_itr >= 0),
  vlr_imposto_mercado    numeric(18,2) not null check (vlr_imposto_mercado >= 0),

  created_at             timestamp with time zone not null default now(),
  unique (simulacao_id, donatario_pessoa_id)
);

-- ── 5. Helper de visibilidade ───────────────────────────────────────────────
-- Mesmo formato de `cliente_id_de_bem` e `cliente_id_de_pessoa`: as filhas da
-- simulação não carregam `cliente_id`, então a policy chega nele pelo pai.
create or replace function public.cliente_id_de_itcd_simulacao(_simulacao_id uuid)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select cliente_id from public.itcd_simulacao where id = _simulacao_id;
$$;

-- ── 6. RLS ──────────────────────────────────────────────────────────────────
-- Mesmo desenho das tabelas de cadastro OSG: SELECT por visibilidade de cliente,
-- escrita por papel.
alter table public.itcd_simulacao            enable row level security;
alter table public.itcd_simulacao_doador     enable row level security;
alter table public.itcd_simulacao_donatario  enable row level security;

drop policy if exists "osg_cluster_select_itcd_simulacao" on public.itcd_simulacao;
create policy "osg_cluster_select_itcd_simulacao"
  on public.itcd_simulacao for select to authenticated
  using (cliente_visivel_para(cliente_id));

drop policy if exists "team_member+ can insert itcd_simulacao" on public.itcd_simulacao;
create policy "team_member+ can insert itcd_simulacao"
  on public.itcd_simulacao for insert to authenticated
  with check (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- Editar é de team_member para cima; APROVAR é de sublider para cima. A guarda
-- vive no `with check`, sobre a linha nova: qualquer update passa, menos o que
-- deixa a simulação em `aprovada` sem o papel. Aprovar é mudança de status e
-- vale pelos três cenários de uma vez — é o portão antes de a apresentação sair
-- para o cliente (SUC-01C: "a revisão aprovada fica disponível para SUC-02").
drop policy if exists "team_member+ can update itcd_simulacao" on public.itcd_simulacao;
create policy "team_member+ can update itcd_simulacao"
  on public.itcd_simulacao for update to authenticated
  using (has_role_or_higher(auth.uid(), 'team_member'::app_role))
  with check (
    status <> 'aprovada'::public.itcd_simulacao_status
    or has_role_or_higher(auth.uid(), 'sublider'::app_role)
  );

drop policy if exists "lider+ can delete itcd_simulacao" on public.itcd_simulacao;
create policy "lider+ can delete itcd_simulacao"
  on public.itcd_simulacao for delete to authenticated
  using (has_role_or_higher(auth.uid(), 'lider'::app_role));

-- As duas filhas seguem o pai, sem repetir a regra de papel em três lugares.
do $$
declare
  t text;
begin
  foreach t in array array['itcd_simulacao_doador',
                           'itcd_simulacao_donatario']
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
