-- ═══════════════════════════════════════════════════════════════════════════════
-- A GIA VIRA ENTIDADE — o resultado sai do donatário e vai para a guia
--
-- A apuração acontece POR GUIA, e a SEFAZ emite uma por doador declarante, com os
-- beneficiários dentro. O banco guardava o resultado por DONATÁRIO, somando as guias
-- em que ele aparece. Com um doador só, o resumo É a guia e nada se perde. Com dois,
-- a linha passa a descrever alguém que não existe.
--
-- ── O NÚMERO QUE MOSTRA O PROBLEMA ────────────────────────────────────────────
-- Pai e mãe doam ao mesmo filho, cada um na sua guia (é a regra do manual da SEFAZ
-- para comunhão parcial, págs. 9 e 16):
--
--   guia do pai   base 3.043.336,00   →  11.925 UPF  →  8%  →  164.354,88
--   guia da mãe   base   281.364,00   →   1.102 UPF  →  4%  →    3.598,56
--                                                    o filho paga  167.953,44
--
--   somando as bases: 3.324.700,00  →  13.028 UPF  →  8%  →  186.864,00
--
-- Os R$ 18.910,56 de diferença são economia REAL e legal: a fatia da mãe, dentro do
-- bolo, seria tributada a 8% (22.509,12); sozinha, cai na faixa de 4% e ganha dedução
-- própria (3.598,56). Doadores diferentes são apurações separadas — a chave da
-- acumulação é o TRIO doador · beneficiário · ano civil (Lei 10.488/2016, arts. 3º
-- e 5º).
--
-- O resumo por donatário guardava base 3.324.700,00 ao lado de imposto 167.953,44.
-- Cada número certo; juntos, impossíveis. Quem auditasse a linha faria
-- `imposto = f(base)` e acharia R$ 18.910,56 faltando.
--
-- ── O QUE ESTA MIGRATION FAZ ──────────────────────────────────────────────────
-- Move as sete colunas de RESULTADO para uma tabela nova, uma linha por guia. Cada
-- linha passa a fechar consigo mesma, e o total por donatário continua disponível —
-- é soma das guias dele. Duas leituras, em vez de uma trocada pela outra.
--
-- Resolve três coisas de uma vez:
--   1. auditar     cada linha se explica sozinha
--   2. reemitir    o analista preenche N guias, e o registro diz o que vai em cada
--   3. acumular    a doação anterior é por PAR, e agora tem onde morar
--
-- ── O QUE FICA NO DONATÁRIO ───────────────────────────────────────────────────
-- O QUADRO: quotas atuais, legítima, disponível, final, aporte — e o `percentual`,
-- que é participação no CAPITAL da sociedade e portanto é do donatário, não da guia.
--
-- ── `pct_doacao_anterior` → `vlr_doacao_anterior` ─────────────────────────────
-- Muda de lugar E de unidade, e as duas coisas por um motivo só. A docstring do motor
-- é explícita: "é por isso que o campo mora na ARESTA e não no donatário: doação de
-- outro doador entra numa apuração separada, e pendurar uma única doação anterior no
-- donatário a somaria na faixa errada".
--
-- A coluna antiga nasceu correta — o comentário dela dizia "percentual, e não valor,
-- porque é a formulação do motor", e era verdade em 26/08. O motor mudou de
-- formulação depois. Ela nunca teve escritor.
--
-- ── ESTA MIGRATION É SÓ SCHEMA ────────────────────────────────────────────────
-- Sem `insert`, sem `update`, sem `delete`. Produção é atualizada pelo chat do
-- Lovable, que roda este arquivo: dado de sandbox não pode viajar dentro dele.
-- Backfill e limpeza de teste, quando houver, são operação separada.
--
-- Idempotente: `if not exists` em tabela e constraint, `if exists` no drop,
-- `drop policy if exists` antes de cada policy.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. A GUIA ─────────────────────────────────────────────────────────────────
create table if not exists public.itcd_simulacao_gia (
  id                   uuid primary key default gen_random_uuid(),
  simulacao_id         uuid not null references public.itcd_simulacao(id) on delete cascade,
  -- QUEM EMITE. Numa guia de casal em conjunto o declarante é um dos dois, e o outro
  -- assina; a forma do ato vive em `itcd_simulacao_doador.emissao_conjunta`.
  doador_pessoa_id     uuid not null references public.pessoa(id),
  -- O BENEFICIÁRIO desta guia. Um doador com dois beneficiários emite UMA guia com
  -- duas linhas de beneficiário — e aqui isso são duas linhas, uma por par, porque a
  -- base e o imposto são apurados por beneficiário.
  donatario_pessoa_id  uuid not null references public.pessoa(id),
  -- Quantas quotas ESTE par transmitiu.
  quotas_recebidas     integer not null check (quotas_recebidas > 0),
  -- "Percentual Transmitido ao Beneficiário", o campo que o declarante digita:
  -- quotas deste par ÷ o que este doador transmite. Soma 100% por guia. Quatro casas,
  -- que é o que a guia usa (74,09% / 25,91% saem com quatro).
  pct_da_gia           numeric(7,4) not null
                       check (pct_da_gia > 0 and pct_da_gia <= 100),
  -- A ACUMULAÇÃO, em VALOR e por par. Nulo = nada declarado, e nulo é o caso comum:
  -- a OSG não acompanha doação anterior porque o sistema da SEFAZ acumula sozinho ao
  -- emitir. Zero diria "conferi e não havia", que é outra afirmação.
  vlr_doacao_anterior  numeric(18,2) check (vlr_doacao_anterior >= 0),
  -- OS TRÊS CENÁRIOS, obrigatórios: cenário sem valor é cadastro incompleto, e gravar
  -- zero afirmaria um imposto que ninguém apurou.
  vlr_base_contabil    numeric(18,2) not null check (vlr_base_contabil >= 0),
  vlr_base_itr         numeric(18,2) not null check (vlr_base_itr >= 0),
  vlr_base_mercado     numeric(18,2) not null check (vlr_base_mercado >= 0),
  vlr_imposto_contabil numeric(18,2) not null check (vlr_imposto_contabil >= 0),
  vlr_imposto_itr      numeric(18,2) not null check (vlr_imposto_itr >= 0),
  vlr_imposto_mercado  numeric(18,2) not null check (vlr_imposto_mercado >= 0),
  created_at           timestamp with time zone not null default now(),
  -- UM PAR NÃO EMITE DUAS GUIAS no mesmo ato: se o mesmo doador transmite ao mesmo
  -- beneficiário duas vezes, é uma linha com a soma das quotas — e a acumulação da
  -- lei é justamente o que trata das doações em atos DIFERENTES.
  unique (simulacao_id, doador_pessoa_id, donatario_pessoa_id),
  -- Ninguém doa para si mesmo.
  constraint itcd_simulacao_gia_partes_ck
    check (doador_pessoa_id <> donatario_pessoa_id)
);

comment on table public.itcd_simulacao_gia is
  'Uma linha por GUIA a emitir: o par doador declarante → beneficiário, com a base e o '
  'imposto apurados nos três cenários. É a unidade em que a SEFAZ tributa e em que o '
  'motor apura. O total por donatário é a soma das guias dele.';
comment on column public.itcd_simulacao_gia.pct_da_gia is
  'Percentual Transmitido ao Beneficiário: quotas deste par ÷ o que este doador '
  'transmite no ato. Soma 100% entre os beneficiários de uma mesma guia. NÃO é a '
  'participação no capital — essa vive em itcd_simulacao_donatario.percentual.';
comment on column public.itcd_simulacao_gia.vlr_doacao_anterior is
  'Quanto este par já havia transmitido antes deste ato, no mesmo ano civil. Em VALOR '
  'e por PAR, porque a chave da acumulação é o trio doador · beneficiário · ano civil: '
  'doação de outro doador entra em apuração separada, e somá-la aqui cairia na faixa '
  'errada. NULL = nada declarado.';

-- ── 2. RLS: segue o pai, como as outras filhas ────────────────────────────────
alter table public.itcd_simulacao_gia enable row level security;

drop policy if exists "osg_cluster_select_itcd_simulacao_gia"
  on public.itcd_simulacao_gia;
create policy "osg_cluster_select_itcd_simulacao_gia"
  on public.itcd_simulacao_gia for select to authenticated
  using (cliente_visivel_para(cliente_id_de_itcd_simulacao(simulacao_id)));

drop policy if exists "team_member+ can write itcd_simulacao_gia"
  on public.itcd_simulacao_gia;
create policy "team_member+ can write itcd_simulacao_gia"
  on public.itcd_simulacao_gia for all to authenticated
  using (has_role_or_higher(auth.uid(), 'team_member'::app_role))
  with check (has_role_or_higher(auth.uid(), 'team_member'::app_role));

-- ── 3. O RESULTADO SAI DO DONATÁRIO ───────────────────────────────────────────
-- Sete colunas. Sobram as onze do quadro, `percentual` entre elas.
alter table public.itcd_simulacao_donatario
  drop column if exists pct_doacao_anterior,
  drop column if exists vlr_base_contabil,
  drop column if exists vlr_base_itr,
  drop column if exists vlr_base_mercado,
  drop column if exists vlr_imposto_contabil,
  drop column if exists vlr_imposto_itr,
  drop column if exists vlr_imposto_mercado;

comment on table public.itcd_simulacao_donatario is
  'O QUADRO do lado de quem recebe: com quantas quotas estava, quanto levou de '
  'legítima e de disponível, quanto aportou em moeda e com quantas termina. O '
  'RESULTADO não vive aqui — ele é por guia, em itcd_simulacao_gia.';
comment on column public.itcd_simulacao_donatario.percentual is
  'Participação no CAPITAL da sociedade depois do ato, em %. Fica no donatário porque '
  'é dele: não se reparte por guia. O percentual DA GUIA é outro campo, em '
  'itcd_simulacao_gia.pct_da_gia.';
