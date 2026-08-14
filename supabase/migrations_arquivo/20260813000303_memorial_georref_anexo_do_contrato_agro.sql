-- B5 (parte de conteúdo) — o contrato Agro passa a usar o bloco de memorial
-- guardado, e o memorial vira anexo anunciado em vez de sobra depois das
-- testemunhas.
--
-- O QUE ESTAVA ERRADO
-- O .docx do contrato terminava com "O imóvel possui área de  ha e perímetro de
-- m, georreferenciado no sistema , certificado junto ao SIGEF sob o código  em ,
-- conforme o memorial descritivo:" e uma tabela de vértices só com cabeçalho,
-- depois das testemunhas, numa matrícula com georreferenciado = Não.
--
-- Não é o bloco guardado: o bloco "Memorial descritivo do georreferenciamento
-- (SIGEF)" (20260810160000) existe, é usado pelo modelo "Matrícula Digitada" e
-- envolve tudo em {{#imovel.georefArea}}. O que entrou na composição do
-- "Contrato Social — Sociedade Limitada (Agro)" foi uma CÓPIA sem a guarda,
-- montada na Biblioteca antes do bloco de verdade existir (a própria
-- 20260810160000 o chama de "bloco de teste no contrato").
--
-- A CORREÇÃO É DEDUPLICAR, NÃO REMENDAR A CÓPIA
-- Emendar a cópia deixaria duas redações do mesmo memorial vivas, e a próxima
-- correção teria que lembrar das duas. A composição do Agro passa a referenciar o
-- MESMO bloco que a Matrícula Digitada usa; a cópia sai da composição e, se
-- nenhum outro modelo a usar, é desativada na Biblioteca com o motivo escrito na
-- descrição (desativar, e não apagar: documento já gerado a referencia).
--
-- Nada aqui escreve guarda nova em volta de bloco: o descarte de bloco que
-- renderizou vazio é regra de composição, entregue pelo motor (raia L2, item 2 do
-- contrato). A guarda que o bloco canônico já tem continua onde está — ela é
-- anterior a esta frente e não é o mecanismo em que a correção se apoia.
--
-- ORDENAÇÃO: O MEMORIAL É ANEXO
-- A composição do Agro é versionada: o seed original está em
-- 20260602200000_seed_contrato_social_agro.sql:256, o re-seed tipado apaga e
-- reinsere tudo com `ordem` e `obrigatorio` explícitos
-- (20260603143244_16b921c7…:41 e :287) e 20260810180000:170-193 ainda reordena
-- Instalação/Competências. O que NÃO está em migration nenhuma é a cópia sem
-- guarda do memorial, o que confirma que ela nasceu na Biblioteca e entrou na
-- composição por lá — por isso ela é localizada pela forma do conteúdo, e não
-- pelo nome.
-- O memorial saiu depois do fecho porque a posição vem da ordem da composição, e
-- quem largou a cópia lá a deixou no fim. Depois das assinaturas é o lugar
-- CERTO de um anexo — o que faltava era ele se anunciar como tal em vez de
-- aparecer como um parágrafo órfão logo abaixo das testemunhas. Então:
--   1. o bloco ganha um título dentro da própria guarda (sem georref, some o
--      título junto com o memorial — um título em bloco separado seria prosa fixa
--      sem placeholder e o motor nunca o descartaria, deixando "ANEXO" sozinho);
--   2. a posição na composição do Agro passa a ser calculada (última), e não
--      herdada de onde o autor largou o bloco.
-- O título é neutro ("MEMORIAL DESCRITIVO DO GEORREFERENCIAMENTO (SIGEF)") de
-- propósito: o mesmo bloco é o corpo do modelo "Matrícula Digitada", onde chamá-lo
-- de anexo seria mentira. Um tipo estrutural 'anexo' de verdade (numeração
-- própria, "Anexo I", "Anexo II") é mudança de engine e de schema, fora da raia de
-- conteúdo — fica registrado aqui como o passo seguinte.
--
-- Idempotente: a cópia só sai se estiver lá, o título só entra se faltar, e a
-- reordenação é um no-op quando o bloco já é o último.
--
-- Reversão: devolver a cópia à composição do Agro (ativo = true, ordem no fim),
-- tirar de lá o bloco canônico e apagar a versão de título criada aqui.

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

  -- ------------------------------------------------------------------ 1 -------
  -- Título dentro da guarda, para o memorial se anunciar onde quer que ele entre.
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

  -- ------------------------------------------------------------------ 2 -------
  -- As cópias sem guarda que estão na composição do Agro: identificadas pela
  -- forma (falam de georefArea e têm a tabela de vértices), nunca pelo nome,
  -- porque nasceram na Biblioteca e nenhuma migration sabe como o autor as
  -- chamou. TODAS saem, não só uma: uma segunda cópia (a Biblioteca não impede
  -- duplicar) reproduziria o mesmo defeito, e escolher "a primeira" sem ordem
  -- definida deixaria o resultado à sorte do plano de execução.
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

  -- ------------------------------------------------------------------ 3 -------
  -- O bloco canônico entra (ou desce) para a última posição: anexo vem depois do
  -- fecho, e a posição é calculada, não herdada de onde o autor largou o bloco.
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
