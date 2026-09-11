-- Exploração rural: o capital social do outorgante NA DATA da assinatura
--
-- Migration nova, e não emenda nas de cadastro: a `20260901144006` e as duas
-- seguintes já foram aplicadas. Catálogo e schema gravados só mudam por arquivo
-- próprio, para o histórico dizer o que existia e o que passou a existir.
--
-- ── POR QUE UMA COLUNA, E NÃO A SOMA DO QUADRO SOCIETÁRIO ───────────────────
--
-- O preâmbulo dos instrumentos agrários declara o capital da parceira
-- outorgante:
--
--   "MMS AGRO LTDA, pessoa jurídica de direito privado, inscrita no CNPJ/MF sob
--    o n.º 48.030.499/0001-06, registrada na Junta Comercial do Estado de Mato
--    Grosso sob o NIRE n.º 51202129910, COM CAPITAL SOCIAL TOTALMENTE SUBSCRITO
--    E INTEGRALIZADO NO VALOR DE R$ 872.674,00 (oitocentos e setenta e dois mil,
--    seiscentos e setenta e quatro reais), com sede estabelecida na Rodovia…"
--
-- Esse valor é RETRATO: é o capital vigente no dia em que se assinou. Somar o
-- quadro societário de hoje imprimiria, no contrato de 2022, o capital de depois
-- do aumento — e o instrumento passaria a afirmar um valor que a Junta não
-- registrava naquela data. `pessoa` não guarda histórico de capital, e o motor
-- que calcula o capital do Contrato Social (`calcularCapitalSociedade`) responde
-- pela sociedade AGORA, que é outra pergunta.
--
-- É a mesma decisão já tomada para a origem da posse:
-- `exploracao_rural_origem_externa.outorgante_capital_social_na_assinatura`
-- existe pelo mesmo motivo, e esta coluna repete o nome de propósito — o leitor
-- do schema deve reconhecer o padrão sem precisar deduzi-lo.
--
-- Consumo: `entradaDoInstrumento` (useGeracaoDocumento.ts) lê a coluna e
-- `qualificacaoDoOutorgante` (contextoRural.ts) a costura na frase pelo mesmo
-- `montarQualificacao` que escreve a qualificação de qualquer pessoa jurídica.
-- Nula, o trecho do capital simplesmente não entra: o preâmbulo continua correto,
-- só mais curto.
--
-- Idempotente: `add column if not exists`.

alter table public.exploracao_rural
  add column if not exists outorgante_capital_social_na_assinatura numeric;

comment on column public.exploracao_rural.outorgante_capital_social_na_assinatura is
  'Capital social da pessoa jurídica outorgante na data da assinatura deste '
  'instrumento, como o preâmbulo o declara. Retrato: não se deriva do quadro '
  'societário atual, que responde pela sociedade hoje e não pela data do ato. '
  'Mesmo papel de exploracao_rural_origem_externa.outorgante_capital_social_na_assinatura.';

-- Valor negativo não é capital, e zero também não é o que a frase declara
-- ("totalmente subscrito e integralizado no valor de R$ 0,00" não se assina).
-- Nulo continua válido: é o "não declarado neste instrumento".
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conrelid = 'public.exploracao_rural'::regclass
       and conname = 'chk_expr_outorgante_capital_positivo'
  ) then
    alter table public.exploracao_rural
      add constraint chk_expr_outorgante_capital_positivo
      check (outorgante_capital_social_na_assinatura is null
             or outorgante_capital_social_na_assinatura > 0);
  end if;
end $$;
