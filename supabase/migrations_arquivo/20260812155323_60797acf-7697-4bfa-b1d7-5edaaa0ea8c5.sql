BEGIN;

do $mig$
declare
  b record;
  novo text;
  proxima integer;
  tocados uuid[] := array[]::uuid[];
  marcador constant text := '@@LINHAS_DE_ASSINATURA@@';
  assinaturas constant text :=
$assin${{#signatarios sep="\n\n"}}_______________________________________
*{{ signatario.nomeMaiusculo }}*
{{ signatario.papel }}{{#signatario.qualificacao}}
{{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}$assin$;
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
      $re$\{\{#socios[^}]*?\}\}_{5,}.*?\{\{/socios\}\}$re$,
      marcador,
      'g'
    );

    if novo is distinct from b.conteudo then
      novo := replace(novo, marcador, assinaturas);

      select coalesce(max(numero_versao), 0) + 1 into proxima
        from public.tmpl_bloco_versao where bloco_id = b.id;

      update public.tmpl_bloco_versao set atual = false
       where bloco_id = b.id and atual;

      insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
      values (
        b.id, proxima, true, novo,
        'B12/B13: o fecho percorre {{#signatarios}} em vez de {{#socios}}. Cônjuge outorgante e administrador não sócio ganham linha de assinatura própria, com o papel pronto vindo do motor, e o sufixo " e Outorga Conjugal" sai do rótulo do sócio.'
      );

      tocados := tocados || b.id;
      raise notice 'B12/B13: bloco "%" versionado (v%).', b.nome, proxima;
    end if;
  end loop;

  if cardinality(tocados) = 0 then
    raise notice 'B12/B13: nenhum bloco com laço de assinatura sobre sócios — nada a fazer.';
    return;
  end if;

  update public.documento_override o
     set observacao = trim(coalesce(o.observacao, '') ||
       ' [Biblioteca 13/08/2026: o bloco de origem foi corrigido (B12/B13, assinaturas por signatário). Este ajuste do documento foi PRESERVADO como está e NÃO recebeu a correção — revise o texto do ajuste.]')
   where o.bloco_alvo_id = any(tocados)
     and coalesce(o.observacao, '') not like '%[Biblioteca 13/08/2026:%';
end
$mig$;

COMMIT;