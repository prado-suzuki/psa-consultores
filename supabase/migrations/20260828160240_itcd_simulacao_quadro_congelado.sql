-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260828160240, nome `itcd_simulacao_quadro_congelado` tal como registrado la.
-- Aplicada no banco por fora do repositorio e trazida para ca para o diretorio e
-- o ledger voltarem a bater, mesmo procedimento da reconciliacao de 26/08/2026
-- descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

-- O QUADRO COMPLETO CONGELADO na simulação de ITCD. Ver o arquivo
-- supabase/migrations/20260828140000_itcd_simulacao_quadro_congelado.sql para o
-- racional completo: a simulação é o REGISTRO DE EXECUÇÃO da doação, e derivar o
-- quadro na exibição faria revisão antiga mudar quando o cadastro ou o rateio mudam.

alter table public.itcd_simulacao_doador
  add column if not exists quotas_transmitidas integer not null default 0,
  add column if not exists quotas_final        integer not null default 0,
  add column if not exists emissao_conjunta    boolean not null default false,
  add column if not exists conjuge_pessoa_id   uuid references public.pessoa(id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'itcd_simulacao_doador_transmitidas_ck'
  ) then
    alter table public.itcd_simulacao_doador
      add constraint itcd_simulacao_doador_transmitidas_ck
      check (quotas_transmitidas >= 0 and quotas_transmitidas <= quotas);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'itcd_simulacao_doador_final_ck'
  ) then
    alter table public.itcd_simulacao_doador
      add constraint itcd_simulacao_doador_final_ck
      check (quotas_final >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'itcd_simulacao_doador_conjuge_ck'
  ) then
    alter table public.itcd_simulacao_doador
      add constraint itcd_simulacao_doador_conjuge_ck
      check (conjuge_pessoa_id is null or emissao_conjunta);
  end if;
end $$;

comment on column public.itcd_simulacao_doador.quotas is
  'Quotas que este doador TINHA na sociedade no momento da simulação. Congelado: o '
  'quadro societário muda, e o retrato não.';
comment on column public.itcd_simulacao_doador.quotas_transmitidas is
  'Quotas que efetivamente SAÍRAM dele — a fatia do que os donatários levaram, '
  'proporcional ao bloco dele. Doar não é o mesmo que poder dar: o que se oferece e '
  'não se distribui permanece com quem doa.';
comment on column public.itcd_simulacao_doador.quotas_final is
  'Com quantas quotas ele termina: quotas − quotas_transmitidas. Zero é o caso de '
  'quem doa tudo.';
comment on column public.itcd_simulacao_doador.emissao_conjunta is
  'true = a GIA sai no nome do casal (uma guia para os dois, patrimônio indiviso). '
  'false = uma guia só no nome dele. Muda quantas guias saem e a faixa de alíquota '
  'de cada uma, então é parte do ato, não de tela.';
comment on column public.itcd_simulacao_doador.conjuge_pessoa_id is
  'Com quem a guia foi emitida em conjunto. É o que permite o quadro antigo dizer '
  '"Avelino e Iracema" sem consultar o cadastro de hoje.';

alter table public.itcd_simulacao_donatario
  add column if not exists quotas_atuais integer not null default 0,
  add column if not exists quotas_final  integer not null default 0;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'itcd_simulacao_donatario_atuais_ck'
  ) then
    alter table public.itcd_simulacao_donatario
      add constraint itcd_simulacao_donatario_atuais_ck
      check (quotas_atuais >= 0);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'itcd_simulacao_donatario_final_ck'
  ) then
    alter table public.itcd_simulacao_donatario
      add constraint itcd_simulacao_donatario_final_ck
      check (quotas_final >= 0);
  end if;
end $$;

comment on column public.itcd_simulacao_donatario.quotas_atuais is
  'Quotas que este donatário JÁ TINHA na sociedade antes deste ato — capital próprio '
  'integralizado ou doação anterior, indistintamente. Congelado, porque o quadro '
  'societário muda. Zero é o caso comum: quem entra no quadro pela doação. NÃO afeta '
  'o imposto — a base é o que ele recebe.';
comment on column public.itcd_simulacao_donatario.quotas_final is
  'Com quantas quotas ele termina: quotas_atuais + quotas_legitima + '
  'quotas_disponivel.';

comment on table public.itcd_simulacao is
  'Uma apuração de ITCD na doação de quotas, e o REGISTRO DE EXECUÇÃO dela: guarda a '
  'UPF, o universo de quotas, os totais do acervo, o quadro inteiro (quem doou o quê, '
  'quem recebeu o quê, com quanto cada um ficou) e o resultado apurado. Abrir uma '
  'simulação é LER — mudança no cadastro, na lei ou no motor não altera revisão '
  'antiga.';
