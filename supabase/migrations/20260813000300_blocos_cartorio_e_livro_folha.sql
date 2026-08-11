-- B4 e B14 — o texto dos blocos volta a usar o NOME CADASTRADO do cartório e
-- passa a escrever livro e folha como numeral + extenso.
--
-- O QUE ESTAVA ERRADO
--   B4. As 5 variantes da família "Descrição de imóvel" (20260806140000, redação
--       final em 20260810120000) escrevem o rótulo institucional à mão:
--       "do Cartório de Registro de Imóveis de {{ imovel.comarca }}". O nome que
--       o cadastro guarda ("Cartório de 1° Ofício de Imóveis") é jogado fora e o
--       ofício, que é o que identifica a serventia, some do contrato.
--   B14. As mesmas variantes escrevem "no Livro {{ imovel.livroExtenso }},
--       Folhas/Ficha {{ imovel.folhaExtenso }}", ou seja, o extenso SUBSTITUI o
--       numeral em vez de acompanhá-lo. O padrão da casa (e o resto do próprio
--       documento, com área, valor e quotas) é "02 (dois)".
--
-- A REDAÇÃO CANÔNICA (docs/osg/contrato-l2-l3-motor-e-blocos.md, itens 1 e 5)
--   do {{ imovel.cartorio }}{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}
--   no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}), folhas/ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }})
--
-- Os campos `imovel.cartorioComarca`, `imovel.livroNumeral` e `imovel.folhaNumeral`
-- são entrega do motor (raia L2, src/lib/templates/mapeadores.ts) e chegam junto:
--   - `cartorio` nunca vem vazio (sem nome cadastrado, o mapeador devolve o rótulo
--     genérico "Cartório de Registro de Imóveis", sem comarca e sem preposição);
--   - `cartorioComarca` só traz a comarca quando ela AINDA NÃO estiver contida no
--     nome, para que "2º Ofício de Registro de Imóveis de Sinop" não vire
--     "… de Sinop da comarca de Sinop". A supressão da redundância é decisão do
--     mapeador, num lugar só, não de cada bloco;
--   - `livroNumeral`/`folhaNumeral` preenchem com zero à esquerda só o que é
--     puramente numérico ("2" → "02"), então "2-AUX" sai íntegro.
--
-- POR QUE É UMA VARREDURA E NÃO UMA REESCRITA DOS 5 TEXTOS
-- Os blocos são editáveis pela Biblioteca: o conteúdo `atual` em produção pode já
-- ter ajustes do consultor que nenhuma migration conhece. Gravar por cima os 5
-- textos inteiros apagaria esses ajustes. Então a migration faz uma EMENDA
-- TEXTUAL (regexp_replace) sobre o conteúdo atual, qualquer que ele seja, e só
-- versiona os blocos em que a emenda mudou alguma coisa. Isso também alcança
-- blocos montados direto na Biblioteca, que nenhuma migration cita pelo nome.
--
-- O QUE A VARREDURA ALCANÇA, ALÉM DAS 5 VARIANTES
--   - "Matrícula digitada: identificação" (20260810160000) já usava
--     {{ imovel.cartorio }}, mas completava com {{ imovel.comarca }}, que é a
--     comarca crua: mesmo defeito latente do B4 (redundância quando o nome já
--     traz a comarca). Passa a usar {{ imovel.cartorioComarca }}.
--   - ", Estado de {{ imovel.ufCartorio }}" era o único pedaço da frase do
--     cartório sem guarda: cadastro sem UF escrevia ", Estado de ,". Ganha a
--     mesma guarda de trecho que livro, folha e CCIR já têm — é guarda DE TRECHO
--     dentro de um bloco que tem outro conteúdo, não guarda de bloco inteiro
--     (essa é do motor, item 2 do contrato).
--
-- OVERRIDE DE CLIENTE É PRESERVADO (item 7 do contrato)
-- Override na Biblioteca é um tmpl_bloco DERIVADO (bloco_origem_id preenchido,
-- ver src/hooks/useOverrideBloco.ts) apontado por um documento_override. A
-- varredura só toca blocos com `bloco_origem_id is null`, então o texto que o
-- consultor escreveu para um documento específico não é alterado. Como esse texto
-- continua com a redação antiga, cada override afetado recebe uma NOTA no motivo,
-- para o ajuste não virar defeito silencioso.
--
-- Idempotente: reaplicar não casa mais nenhum padrão (o texto novo não contém o
-- antigo), logo não cria versão nem inverte qual é a `atual`. A nota do override
-- é gravada uma vez só (marcador no próprio texto).
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
    novo := b.conteudo;

    -- B4.1 — rótulo institucional escrito à mão dá lugar ao nome cadastrado.
    novo := regexp_replace(
      novo,
      $re$Cartório de Registro de Imóveis de[[:space:]]*\{\{[[:space:]]*imovel\.comarca[[:space:]]*\}\}$re$,
      $re${{ imovel.cartorio }}{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}$re$,
      'g'
    );

    -- B4.2 — onde a comarca já era complemento do nome cadastrado, ela passa a
    -- vir do campo que suprime a redundância. O miolo da frase é preservado pelo
    -- retrovisor \1 (", comarca de " em um bloco, " da comarca de " em outro).
    novo := regexp_replace(
      novo,
      $re$\{\{#[[:space:]]*imovel\.comarca[[:space:]]*\}\}([^{]*)\{\{[[:space:]]*imovel\.comarca[[:space:]]*\}\}\{\{/[[:space:]]*imovel\.comarca[[:space:]]*\}\}$re$,
      $re${{#imovel.cartorioComarca}}\1{{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}$re$,
      'g'
    );

    -- B4.3 — a UF do cartório vira trecho opcional, como o resto da frase.
    -- Só entra onde ainda não há guarda, senão a segunda passada aninharia uma
    -- guarda dentro da outra.
    if novo not like '%{{#imovel.ufCartorio}}%' then
      novo := regexp_replace(
        novo,
        $re$,[[:space:]]*Estado de[[:space:]]*\{\{[[:space:]]*imovel\.ufCartorio[[:space:]]*\}\}$re$,
        $re${{#imovel.ufCartorio}}, Estado de {{ imovel.ufCartorio }}{{/imovel.ufCartorio}}$re$,
        'g'
      );
    end if;

    -- B14 — o extenso deixa de substituir o numeral e passa a acompanhá-lo.
    novo := regexp_replace(
      novo,
      $re$Livro[[:space:]]*\{\{[[:space:]]*imovel\.livroExtenso[[:space:]]*\}\}$re$,
      $re$Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }})$re$,
      'gi'
    );
    novo := regexp_replace(
      novo,
      $re$Folhas/Ficha[[:space:]]*\{\{[[:space:]]*imovel\.folhaExtenso[[:space:]]*\}\}$re$,
      $re$folhas/ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }})$re$,
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

  -- Override de cliente: preservado (é bloco derivado, fora da varredura) e
  -- registrado, para que o ajuste pontual não fique com o defeito sem ninguém saber.
  update public.documento_override o
     set observacao = trim(coalesce(o.observacao, '') ||
       ' [Biblioteca 13/08/2026: o bloco de origem foi corrigido (B4 nome do cartório, B14 livro/folha em numeral + extenso). Este ajuste do documento foi PRESERVADO como está e NÃO recebeu a correção — revise o texto do ajuste.]')
   where o.bloco_alvo_id = any(tocados)
     and coalesce(o.observacao, '') not like '%[Biblioteca 13/08/2026:%';
end
$mig$;

COMMIT;
