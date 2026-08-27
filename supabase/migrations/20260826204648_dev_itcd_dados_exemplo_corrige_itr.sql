-- IMPORTADA DO LEDGER DO SANDBOX (supabase_migrations.schema_migrations),
-- versao 20260826204648, nome `dev_itcd_dados_exemplo_corrige_itr` tal como registrado la.
-- Aplicada no banco por fora do repositorio (Lovable) e trazida para ca para o
-- diretorio e o ledger voltarem a bater, mesmo procedimento da reconciliacao de
-- 26/08/2026 descrita em docs/planos/ledger-societario-e-alteracao-derivada.md.
-- Conteudo identico ao que o ledger guarda: nada foi reescrito.

-- Três correções nos clientes de exemplo do ITCD, todas para alinhar ao WP.
--
-- 1. Matrícula 26.910: o ITR de 6.304.520,00 estava nulo por um erro meu. Não é
--    duplicação da 26.060: existem duas declarações de ITR 2025 de 800,0 ha, CIB
--    5026384-6 (Cristiano) e CIB 8979463-0 (Adriano), com VTN idêntico.
-- 2 e 3. A moeda corrente entra nos TRÊS cenários com o mesmo valor, como o WP
--    faz. Sem isso o cenário de ITR fica menor que o do WP.

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
    raise exception 'Clientes de exemplo do ITCD não encontrados; rode o seed antes.';
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
