BEGIN;

do $mig$
declare
  doc_agro uuid;
  b_memorial uuid;
  b_copia uuid;
  v_conteudo text;
  novo text;
  proxima integer;
  ord_max integer;
begin
  select id into doc_agro
    from public.tmpl_documento
   where nome = 'Contrato Social — Sociedade Limitada (Agro)';

  select id into b_memorial
    from public.tmpl_bloco
   where nome = 'Memorial descritivo do georreferenciamento (SIGEF)'
     and bloco_origem_id is null;

  if b_memorial is null then
    raise notice 'B5: bloco canônico do memorial não existe (20260810160000 não aplicada?) — nada a fazer.';
    return;
  end if;

  select conteudo into v_conteudo
    from public.tmpl_bloco_versao where bloco_id = b_memorial and atual;

  if v_conteudo is not null and v_conteudo not like '%MEMORIAL DESCRITIVO DO GEORREFERENCIAMENTO (SIGEF)%' then
    novo := replace(
      v_conteudo,
      $de${{#imovel.georefArea}}O imóvel possui área de$de$,
      $para${{#imovel.georefArea}}*MEMORIAL DESCRITIVO DO GEORREFERENCIAMENTO (SIGEF)*

O imóvel possui área de$para$
    );

    if novo is distinct from v_conteudo then
      select coalesce(max(numero_versao), 0) + 1 into proxima
        from public.tmpl_bloco_versao where bloco_id = b_memorial;

      update public.tmpl_bloco_versao set atual = false
       where bloco_id = b_memorial and atual;

      insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
      values (
        b_memorial, proxima, true, novo,
        'B5: o memorial se anuncia com título, dentro da mesma guarda do georref — sem georref, título e memorial somem juntos. É o que o distingue de um parágrafo órfão quando ele entra como anexo, depois das assinaturas do contrato.'
      );
      raise notice 'B5: título do memorial versionado (v%).', proxima;
    else
      raise notice 'B5: o memorial foi editado na Biblioteca e o caput não bate com o texto conhecido — título NÃO inserido, para não desfazer a edição.';
    end if;
  end if;

  if doc_agro is null then
    raise notice 'B5: modelo "Contrato Social — Sociedade Limitada (Agro)" não encontrado — composição não alterada.';
    return;
  end if;

  for b_copia in
    select db.bloco_id
      from public.tmpl_documento_bloco db
      join public.tmpl_bloco bl on bl.id = db.bloco_id
      join public.tmpl_bloco_versao v on v.bloco_id = bl.id and v.atual
     where db.documento_id = doc_agro
       and bl.id <> b_memorial
       and v.conteudo like '%imovel.georefArea%'
       and v.conteudo like '%{{#vertices}}%'
     order by db.ordem, db.bloco_id
  loop
    delete from public.tmpl_documento_bloco
     where documento_id = doc_agro and bloco_id = b_copia;

    if not exists (select 1 from public.tmpl_documento_bloco where bloco_id = b_copia) then
      update public.tmpl_bloco
         set ativo = false,
             descricao = trim(coalesce(descricao, '') ||
               ' [Desativado em 13/08/2026 (B5): era uma cópia do memorial sem a guarda {{#imovel.georefArea}}, e imprimia a frase e a tabela vazias em matrícula sem georreferenciamento. O bloco vivo é "Memorial descritivo do georreferenciamento (SIGEF)".]')
       where id = b_copia and ativo;
    end if;
    raise notice 'B5: cópia sem guarda (%) removida da composição do Agro.', b_copia;
  end loop;

  select coalesce(max(ordem), 0) into ord_max
    from public.tmpl_documento_bloco where documento_id = doc_agro;

  if exists (
    select 1 from public.tmpl_documento_bloco
     where documento_id = doc_agro and bloco_id = b_memorial
  ) then
    update public.tmpl_documento_bloco
       set ordem = case when ordem < ord_max then ord_max + 1 else ordem end,
           obrigatorio = true
     where documento_id = doc_agro and bloco_id = b_memorial
       and (ordem < ord_max or not obrigatorio);
  else
    insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
    values (doc_agro, b_memorial, ord_max + 1, true);
    raise notice 'B5: memorial canônico entrou na composição do Agro na posição %.', ord_max + 1;
  end if;
end
$mig$;

COMMIT;