-- B6 (parte de conteúdo) — o valor nominal da quota deixa de ser literal no
-- texto e passa a vir da sociedade.
--
-- O QUE ESTAVA ERRADO
-- Todo bloco de capital escreve "no valor nominal de R$ 1,00 (um real) cada uma".
-- Enquanto a quota valer exatamente um real isso parece inofensivo, mas é o
-- literal que esconde a incoerência do B6: a cláusula afirma um valor nominal
-- que o cálculo não garante (capital de R$ 558.413,55 dividido em 558.414 quotas
-- de R$ 1,00 dá R$ 558.414,00, quarenta e cinco centavos a mais). Com o valor
-- nominal saindo do mesmo ponto que fecha a conta, o texto não pode mais
-- contradizer o número, e uma sociedade com quota de outro valor nominal para de
-- gerar contrato errado.
--
-- A REDAÇÃO CANÔNICA (docs/osg/contrato-l2-l3-motor-e-blocos.md, item 6)
--   R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }})
--
-- Os dois campos são entrega do motor (raia L2), que devolve capital, total de
-- quotas e valor nominal já coerentes entre si:
--   Σ quotas dos sócios = sociedade.totalQuotas
--   sociedade.totalQuotas × valor nominal = sociedade.capitalValor
--
-- POR QUE EMENDA TEXTUAL, E NÃO REESCRITA DO BLOCO
-- O literal aparece em seis migrations de seed, mas o que importa é o bloco VIVO
-- (o que a composição do modelo referencia), e o conteúdo `atual` dele pode ter
-- ajustes feitos pela Biblioteca. A migration emenda o texto atual, qualquer que
-- ele seja, e só versiona quem realmente mudou — assim alcança tanto
-- "Capital Social - Agro" quanto "Cláusula — Capital social integralizado em
-- moeda corrente" (que repete o literal duas vezes, no caput e no laço de
-- sócios) e qualquer bloco de capital montado na Biblioteca.
--
-- O trecho "valor nominal de" faz parte do padrão de propósito: é o que garante
-- que só o valor nominal da quota é trocado, e não uma quantia de R$ 1,00 que
-- por acaso apareça em outro bloco.
--
-- OVERRIDE DE CLIENTE É PRESERVADO (item 7 do contrato): a varredura só toca
-- blocos com `bloco_origem_id is null`; o bloco derivado de um override fica como
-- está e o motivo do override recebe uma nota.
--
-- Idempotente: o texto novo não contém mais o literal, então reaplicar não casa
-- nada e não cria versão.
--
-- Reversão: para cada bloco tocado, apagar a versão criada aqui e devolver
-- atual=true à imediatamente anterior.

BEGIN;

do $mig$
declare
  b record;
  novo text;
  proxima integer;
  tocados uuid[] := array[]::uuid[];
begin
  for b in
    select bl.id, bl.nome, v.conteudo
      from public.tmpl_bloco bl
      join public.tmpl_bloco_versao v on v.bloco_id = bl.id and v.atual
     where bl.bloco_origem_id is null
       and v.conteudo is not null
     order by bl.nome
  loop
    novo := regexp_replace(
      b.conteudo,
      $re$valor nominal de R\$[[:space:]]*1,00[[:space:]]*\(um real\)$re$,
      $re$valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }})$re$,
      'gi'
    );

    if novo is distinct from b.conteudo then
      select coalesce(max(numero_versao), 0) + 1 into proxima
        from public.tmpl_bloco_versao where bloco_id = b.id;

      update public.tmpl_bloco_versao set atual = false
       where bloco_id = b.id and atual;

      insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
      values (
        b.id, proxima, true, novo,
        'B6: o valor nominal da quota deixa de ser o literal "R$ 1,00 (um real)" e passa a vir de {{ sociedade.quotaValorNominal }}, no mesmo ponto que fecha capital × quotas.'
      );

      tocados := tocados || b.id;
      raise notice 'B6: bloco "%" versionado (v%).', b.nome, proxima;
    end if;
  end loop;

  if cardinality(tocados) = 0 then
    raise notice 'B6: nenhum bloco com o literal "R$ 1,00 (um real)" — nada a fazer.';
    return;
  end if;

  update public.documento_override o
     set observacao = trim(coalesce(o.observacao, '') ||
       ' [Biblioteca 13/08/2026: o bloco de origem foi corrigido (B6, valor nominal da quota vindo da sociedade). Este ajuste do documento foi PRESERVADO como está e NÃO recebeu a correção — revise o texto do ajuste.]')
   where o.bloco_alvo_id = any(tocados)
     and coalesce(o.observacao, '') not like '%[Biblioteca 13/08/2026:%';
end
$mig$;

COMMIT;
