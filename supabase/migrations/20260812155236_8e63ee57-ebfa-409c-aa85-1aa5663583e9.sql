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
    novo := b.conteudo;

    novo := regexp_replace(
      novo,
      $re$Cartório de Registro de Imóveis de[[:space:]]*\{\{[[:space:]]*imovel\.comarca[[:space:]]*\}\}$re$,
      $re${{ imovel.cartorio }}{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}$re$,
      'g'
    );

    novo := regexp_replace(
      novo,
      $re$\{\{#[[:space:]]*imovel\.comarca[[:space:]]*\}\}([^{]*)\{\{[[:space:]]*imovel\.comarca[[:space:]]*\}\}\{\{/[[:space:]]*imovel\.comarca[[:space:]]*\}\}$re$,
      $re${{#imovel.cartorioComarca}}\1{{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}$re$,
      'g'
    );

    novo := regexp_replace(novo, $re$\{\{#[[:space:]]*imovel\.cartorio[[:space:]]*\}\}$re$, $re${{#imovel.temCartorio}}$re$, 'g');
    novo := regexp_replace(novo, $re$\{\{/[[:space:]]*imovel\.cartorio[[:space:]]*\}\}$re$, $re${{/imovel.temCartorio}}$re$, 'g');

    if novo not like '%{{#imovel.ufCartorio}}%' then
      novo := regexp_replace(
        novo,
        $re$,[[:space:]]*Estado de[[:space:]]*\{\{[[:space:]]*imovel\.ufCartorio[[:space:]]*\}\}$re$,
        $re${{#imovel.ufCartorio}}, Estado de {{ imovel.ufCartorio }}{{/imovel.ufCartorio}}$re$,
        'g'
      );
    end if;

    novo := regexp_replace(
      novo,
      $re$Livro[[:space:]]*\{\{[[:space:]]*imovel\.livroExtenso[[:space:]]*\}\}$re$,
      $re$Livro {{ imovel.livroNumeral }}{{#imovel.livroExtenso}} ({{ imovel.livroExtenso }}){{/imovel.livroExtenso}}$re$,
      'gi'
    );
    novo := regexp_replace(
      novo,
      $re$Folhas/Ficha[[:space:]]*\{\{[[:space:]]*imovel\.folhaExtenso[[:space:]]*\}\}$re$,
      $re$folhas/ficha {{ imovel.folhaNumeral }}{{#imovel.folhaExtenso}} ({{ imovel.folhaExtenso }}){{/imovel.folhaExtenso}}$re$,
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
        'B4/B14: o cartório passa a sair pelo nome cadastrado ({{ imovel.cartorio }}), com a comarca como complemento não redundante e a UF condicionada; livro e folha saem em numeral + extenso ("Livro 02 (dois), folhas/ficha 01 (um)").'
      );

      tocados := tocados || b.id;
      raise notice 'B4/B14: bloco "%" versionado (v%).', b.nome, proxima;
    end if;
  end loop;

  if cardinality(tocados) = 0 then
    raise notice 'B4/B14: nenhum bloco com a redação antiga — nada a fazer.';
    return;
  end if;

  update public.documento_override o
     set observacao = trim(coalesce(o.observacao, '') ||
       ' [Biblioteca 13/08/2026: o bloco de origem foi corrigido (B4 nome do cartório, B14 livro/folha em numeral + extenso). Este ajuste do documento foi PRESERVADO como está e NÃO recebeu a correção — revise o texto do ajuste.]')
   where o.bloco_alvo_id = any(tocados)
     and coalesce(o.observacao, '') not like '%[Biblioteca 13/08/2026:%';
end
$mig$;

COMMIT;