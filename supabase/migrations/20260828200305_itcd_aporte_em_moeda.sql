-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260828200305, nome `itcd_aporte_em_moeda` tal como registrado la.
-- Aplicada no banco por fora do repositorio e trazida para ca para o diretorio e
-- o ledger voltarem a bater, mesmo procedimento da reconciliacao de 26/08/2026
-- descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

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
