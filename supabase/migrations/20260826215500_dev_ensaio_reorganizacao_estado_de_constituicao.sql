-- SANDBOX. Leva o cliente de teste ao ESTADO DE CONSTITUIÇÃO, para o ensaio do
-- par de instrumentos da reorganização societária.
--
-- Frente 6 de docs/planos/ledger-societario-e-alteracao-derivada.md, item 1.
--
-- Cliente: [TESTE] Dinossauro Aposentado Previdência e Fósseis Ltda
--          8f9c2796-b9f3-4349-923b-b04e86bc6012
--   PR     Farroupilha Comércio Ltda   29d31f73-8fbd-44c3-a856-81ddf7809378
--   CN     Jatobá Sementes S.A.        11c1394b-5bc7-4b93-a6f1-98a7fa64088b
--
-- O que estava errado para o ensaio: a controladora tinha dois sócios de
-- 4.770.898 quotas cada, que é ESTADO POSTERIOR (parece o resultado de uma
-- subida que nunca foi lançada), e com pessoas que nem sequer são os titulares
-- dos imóveis da proprietária. Um ensaio que parte daí não prova nada: ele já
-- começa depois do ato que se quer provar.
--
-- Depois desta migration, a controladora fica no capital de CONSTITUIÇÃO dela:
-- R$ 1.000,00 divididos em 500 quotas para cada fundador, que é a proporção do
-- caso MMS Participações e é o resíduo a que o aporte da subida vai SOMAR (é ele
-- que produz o desalinhamento de proporção que o macro avisa).
--
-- OS FUNDADORES SÃO OS TITULARES DOS IMÓVEIS, Lucas Nogueira e Marina Salgado.
-- Precisa ser assim: a subida transfere para a controladora as quotas que eles
-- têm na proprietária, e as quotas deles na proprietária nascem dos imóveis que
-- eles integralizam. Fundador diferente do titular quebraria o par.
--
-- A PROPRIETÁRIA FICA DE PROPÓSITO SEM QUADRO GRAVADO. Ela tem bens aprovados
-- para integralização com matrículas e titulares, e a tela do Quadro Societário
-- PROPÕE o quadro de constituição a partir deles: apertar "Gravar quadro
-- societário" é o primeiro passo do ensaio, e é uma das coisas que o ensaio
-- serve para verificar. Reproduzir aqui, em SQL, o rateio por bem e o
-- arredondamento de `proporAportesIniciais` duplicaria a regra em duas
-- linguagens, e a primeira divergência de centavo passaria despercebida
-- justamente no cenário que existe para achar divergências.
--
-- Idempotente. Restrita ao cliente de teste por id em toda condição: não há
-- comando aqui que possa alcançar outro cliente.

do $$
declare
  v_cliente uuid := '8f9c2796-b9f3-4349-923b-b04e86bc6012';
  v_cn      uuid := '11c1394b-5bc7-4b93-a6f1-98a7fa64088b';
  v_pr      uuid := '29d31f73-8fbd-44c3-a856-81ddf7809378';
  v_lucas   uuid := 'd7ce85da-60ba-4197-903b-df2dcdb65afa';
  v_marina  uuid := 'ac4de794-bb04-4d8e-bdf9-1f34632aef72';
  v_base    timestamptz := timestamptz '2022-09-15 12:00:00+00';
begin
  -- Nada acontece fora do sandbox nem se o cenário tiver sido apagado.
  if not exists (select 1 from public.cliente where id = v_cliente) then
    return;
  end if;

  -- 1. O estado posterior sai. Só movimento SEM documento: um movimento já
  --    formalizado por uma peça é história registrada, e apagá-lo deixaria a
  --    peça descrevendo um ato que não existe mais.
  delete from public.movimentacao_quotas
   where cliente_id = v_cliente
     and empresa_pessoa_id = v_cn
     and documento_gerado_id is null;

  -- 2. O capital de constituição da controladora: 500 quotas para cada fundador.
  --    `created_at` explícito e escalonado, e não now(): now() é o timestamp da
  --    TRANSAÇÃO, e um insert em lote empataria o carimbo das duas linhas, o
  --    `ordem` da view viraria empate e a ordem dos sócios no preâmbulo do
  --    contrato ficaria indeterminada.
  if not exists (
    select 1 from public.movimentacao_quotas
     where cliente_id = v_cliente and empresa_pessoa_id = v_cn
  ) then
    insert into public.movimentacao_quotas
      (cliente_id, tipo, empresa_pessoa_id, destino_pessoa_id, quotas,
       vlr_capital_arredondado, data_movimento, created_at)
    values
      (v_cliente, 'aporte', v_cn, v_lucas,  500, 500, date '2022-09-15', v_base),
      (v_cliente, 'aporte', v_cn, v_marina, 500, 500, date '2022-09-15', v_base + interval '1 millisecond');
  end if;

  -- 3. A proprietária volta a não ter quadro gravado, para a tela propor o de
  --    constituição a partir dos bens (ver o cabeçalho). Mesma guarda do
  --    documento formalizado.
  delete from public.movimentacao_quotas
   where cliente_id = v_cliente
     and empresa_pessoa_id = v_pr
     and documento_gerado_id is null;
end $$;
