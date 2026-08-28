-- ============================================================================
-- EXCLUSIVA DO SANDBOX — corrige três valores nos clientes de exemplo do ITCD.
-- Não altera schema. Não aplicar em produção.
-- ============================================================================
--
-- POR QUE EXISTE
--   O seed `20260826154525` já foi aplicado no sandbox com três valores errados.
--   Ele foi corrigido na origem, então rodar a pasta inteira num banco limpo já
--   produz o resultado certo — esta migration existe só para trazer o sandbox ao
--   mesmo estado sem recriar os clientes. Ela é idempotente: num banco onde o seed
--   já veio correto, os `update` gravam os mesmos valores.
--
-- O QUE ELA CORRIGE
--   1. Matrícula 26.910 do Santa Terezinha, ITR de R$ 6.304.520,00, que estava
--      nula. Eu a anulei achando que era duplicação da 26.060 e estava errado:
--      existem DUAS declarações de ITR 2025 de 800,0 ha, as duas chamadas "Fazenda
--      Santa Terezinha", com valor da terra nua idêntico —
--        CIB 5026384-6, contribuinte CRISTIANO COSTA BEBER
--        CIB 8979463-0, contribuinte ADRIANO COSTA BEBER
--      Dois imóveis, dois códigos, mesmo VTN. O WP estava certo desde o começo, e
--      o "Total Valor ITR" do slide 12 (R$ 29.155.992,05) só fecha com os dois.
--
--   2 e 3. A moeda corrente dos dois clientes passa a ter valor nos TRÊS cenários,
--      igual ao nominal, que é o que o WP faz (Santa Terezinha, QUADRO 2 linha 33;
--      Agro Aliança, aba principal linha 17: L = M = N). Dinheiro não tem valor de
--      ITR nem de mercado diferente do nominal, e sem esta linha o cenário de ITR
--      fica menor que o do WP.
--
-- DEPOIS DELA, OS TOTAIS
--   Agro Aliança bate com o TOTAL GERAL do WP nos três, ao centavo:
--     contábil    9.557.944,00   (L18)
--     ITR        37.574.919,57   (M18)
--     mercado    64.659.680,42   (N18)
--
--   Santa Terezinha bate com o WP depois das correções que os instrumentos impõem,
--   e a conta fecha exata:
--     ITR      29.155.992,05  do WP
--             −   265.441,60  matrículas 970 e 971, não integralizadas
--             −     2.005,38  moeda do WP
--             +         7,38  moeda real (1ª Alteração e contrato social)
--             +  1.833.039,19 matrícula 8.127, que o WP não lista
--             = 30.721.591,64
--     mercado 322.960.281,82 − 1.800.000,00 − 2.005,38 + 7,38 = 321.158.283,82

do $$
declare
  v_st  uuid;
  v_aa  uuid;
  n     integer;
begin
  select id into v_st from public.cliente
   where nome = 'Fazenda Santa Terezinha (exemplo ITCD)';
  select id into v_aa from public.cliente
   where nome = 'Agro Aliança - Família Bocolli (exemplo ITCD)';

  if v_st is null or v_aa is null then
    raise notice 'Clientes de exemplo do ITCD não existem; nada a corrigir.';
    return;
  end if;

  update public.matricula
     set vlr_imposto_anual = 6304520.00,
         imposto_anual_exercicio = 2025
   where cliente_id = v_st and numero = '26910';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Esperava 1 matrícula 26910 no Santa Terezinha, achei %', n;
  end if;

  update public.bem
     set vlr_imposto_anual = 7.38,
         vlr_mercado = 7.38
   where cliente_id = v_st and tipo_bem = 'OU' and referencia_dp = 'BO 01';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Esperava 1 bem de moeda no Santa Terezinha, achei %', n;
  end if;

  update public.bem
     set vlr_imposto_anual = 40983.60
   where cliente_id = v_aa and tipo_bem = 'OU' and referencia_dp = 'BO 01';
  get diagnostics n = row_count;
  if n <> 1 then
    raise exception 'Esperava 1 bem de moeda no Agro Aliança, achei %', n;
  end if;

  raise notice 'Correções de ITR aplicadas nos dois clientes de exemplo.';
end $$;
