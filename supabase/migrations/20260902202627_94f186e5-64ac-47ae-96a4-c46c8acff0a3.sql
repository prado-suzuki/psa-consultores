-- ═══════════════════════════════════════════════════════════════════════════════
-- APORTE EM MOEDA CORRENTE — o cenário que dispensa a reserva de usufruto
--
-- Dinheiro integralizado no capital, que vira quotas novas para quem pagou. É a
-- alternativa à reserva de usufruto: em vez de doar tudo e guardar o voto, quem quer
-- participação entrega dinheiro e chega ao percentual por PROPRIEDADE. Sem usufruto,
-- sem instrumento de usufruto, sem a guia dele.
--
-- É POR ISSO QUE ELE PRECISA SER GRAVADO. A apresentação compara os cenários lado a
-- lado — com reserva, com instituição, com aporte — e sem esta coluna a simulação do
-- aporte voltaria do banco com quotas a mais que nada explica.
--
-- APORTE NÃO É FATO GERADOR DE ITCD. Ninguém transmite nada: a pessoa entrega dinheiro
-- à sociedade e recebe quotas em troca. Ele muda o imposto por via indireta — o capital
-- cresce, e com ele o denominador de todos os percentuais.
--
-- QUALQUER UM APORTA, doador ou donatário, e por isso a coluna existe nas DUAS tabelas
-- filhas. Não há regra dizendo que só o fundador pode pagar.
--
-- ── O QUE ESTA MIGRATION NÃO FAZ ──────────────────────────────────────────────
-- Não cria campo de moeda corrente no CADASTRO. O capital social com moeda é outra
-- frente, do tech lead, e enquanto ela não existe a moeda segue lançada como bem. Aqui
-- o aporte é hipótese DESTA simulação: ele vive no motor do ITCD e no registro dela.
--
-- ── AS DUAS COLUNAS, E POR QUE SÃO DUAS ───────────────────────────────────────
-- `vlr_aporte_moeda` é o dinheiro. `quotas_do_aporte` é quantas quotas ele comprou, ao
-- preço da quota no momento do aporte — `acervo contábil ÷ total de quotas`, ambos
-- ANTES do aporte.
--
-- A quantidade NÃO é derivável do que já está gravado: `quotas_total` e
-- `vlr_acervo_contabil` do pai são os valores DEPOIS do aporte, então o preço da quota
-- de antes se perdeu. Sem a coluna, o quadro antigo não conseguiria dizer quantas das
-- quotas de alguém vieram de dinheiro — que é exatamente o que explica o cenário.
--
-- Nas holdings desta carteira a quota é de R$ 1,00 e os dois números coincidem. Isso é
-- coincidência do caso, não regra: capital com quota de outro valor grava diferente.
--
-- Idempotente: vai ser aplicada por dois caminhos (sandbox pelo CLI, produção pelo chat
-- do Lovable) e existir em duas versões.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table public.itcd_simulacao_doador
  add column if not exists vlr_aporte_moeda numeric(18,2) not null default 0,
  add column if not exists quotas_do_aporte integer       not null default 0;

alter table public.itcd_simulacao_donatario
  add column if not exists vlr_aporte_moeda numeric(18,2) not null default 0,
  add column if not exists quotas_do_aporte integer       not null default 0;

do $$
declare
  t text;
begin
  -- ZERO É O CASO COMUM e é o default: a maioria dos cenários não tem aporte. Negativo
  -- não é aporte — retirada de capital é outro ato, com outras consequências, e não se
  -- modela como aporte de sinal invertido.
  foreach t in array array['itcd_simulacao_doador', 'itcd_simulacao_donatario']
  loop
    if not exists (
      select 1 from pg_constraint where conname = t || '_aporte_vlr_ck'
    ) then
      execute format(
        'alter table public.%I add constraint %I check (vlr_aporte_moeda >= 0)',
        t, t || '_aporte_vlr_ck'
      );
    end if;
    if not exists (
      select 1 from pg_constraint where conname = t || '_aporte_quotas_ck'
    ) then
      execute format(
        'alter table public.%I add constraint %I check (quotas_do_aporte >= 0)',
        t, t || '_aporte_quotas_ck'
      );
    end if;
    -- DINHEIRO E QUOTAS ANDAM JUNTOS: aporte com valor e zero quota diria que o
    -- dinheiro entrou e não comprou nada, e quota de aporte sem valor diria que
    -- alguém recebeu quota de graça. Os dois casos são erro de gravação, não cenário.
    if not exists (
      select 1 from pg_constraint where conname = t || '_aporte_coerente_ck'
    ) then
      execute format($f$
        alter table public.%I add constraint %I
        check ((vlr_aporte_moeda = 0 and quotas_do_aporte = 0)
            or (vlr_aporte_moeda > 0 and quotas_do_aporte > 0))
      $f$, t, t || '_aporte_coerente_ck');
    end if;
  end loop;
end $$;

comment on column public.itcd_simulacao_doador.vlr_aporte_moeda is
  'Dinheiro que este doador integralizou no capital NESTA simulação. Hipótese do '
  'cenário, não fato do cadastro. NÃO é fato gerador de ITCD: ninguém transmite nada.';
comment on column public.itcd_simulacao_doador.quotas_do_aporte is
  'Quantas das quotas dele vieram do aporte, ao preço da quota antes dele. Gravado '
  'porque o preço de antes não é recuperável do que está no pai — lá o acervo e o '
  'total de quotas já são os de depois.';

comment on column public.itcd_simulacao_donatario.vlr_aporte_moeda is
  'O mesmo, do lado de quem recebe: donatário também aporta. Não há regra dizendo que '
  'só o fundador pode pagar.';
comment on column public.itcd_simulacao_donatario.quotas_do_aporte is
  'Quantas das quotas dele vieram do aporte. Somadas às recebidas por doação, dão a '
  'participação final — e só as recebidas por doação pagam imposto.';

comment on column public.itcd_simulacao.quotas_total is
  'O universo de quotas da sociedade nesta simulação, COM as quotas criadas por aporte '
  'em moeda. É o denominador de todos os percentuais do quadro.';
comment on column public.itcd_simulacao.vlr_acervo_contabil is
  'Total contábil do acervo nesta simulação, COM o aporte em moeda somado pelo valor de '
  'face. Moeda não se reavalia: ela entra pelo que diz nos três cenários, e nunca '
  'multiplicada pelo preço da quota daquela régua.';