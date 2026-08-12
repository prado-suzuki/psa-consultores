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