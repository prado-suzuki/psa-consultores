-- Modelo "Matrícula Digitada": o terceiro tipo base, e o primeiro documento que
-- nasce da família de variantes em vez de repetir a descrição do imóvel.
--
-- O QUE É
-- A casa já digita a matrícula usando os mesmos modelos Word que deram origem às
-- 5 redações da família (20260806140000). Então o documento é: identificação da
-- matrícula, a descrição do imóvel resolvida por caso, e o memorial do
-- georreferenciamento quando a matrícula tem georref.
--
-- A FAMÍLIA RESOLVE FORA DO LAÇO
-- No contrato social a inclusão mora dentro de {{#imoveis}} e resolve por item.
-- Aqui o documento é de UMA matrícula: o token fica no topo do bloco e lê o
-- binding unitário `imovel`, que o consultor liga a uma matrícula no passo de
-- registros. Funciona pelo mesmo caminho: `mapearRegistro('matricula', …)` publica
-- as condicionais rural/urbano/posse e inteiro/fracionado, e o JOIN do registro
-- (ver MATRICULA_GERACAO_SELECT) já traz bem, cartório e titulares.
--
-- POR QUE O TIPO NÃO É 'societario'
-- `useGerarDocumentoController` compara o tipo com 'societario' para aplicar as
-- normalizações de binding LEGADO (referências e seleção). Este modelo nasce
-- limpo, então herdar aquele tipo só o faria passar por reescritas que não têm o
-- que reescrever. Fica 'matricula_digitada'.
--
-- O MEMORIAL É CONDICIONAL
-- A tabela de vértices vem do BigQuery pela matrícula (useGeorefByMatricula), e os
-- campos georef* entram com '' quando não há. Sem guarda, matrícula sem georref
-- sairia com "área de  ha" e uma tabela só de cabeçalho, porque {{#vertices}} não
-- rende linha nenhuma e o segmentador ainda enxerga cabeçalho + separadora. Por
-- isso o bloco inteiro vive dentro de {{#imovel.georefArea}}: sem georref, ele
-- desaparece do documento.
--
-- TODOS OS BLOCOS SÃO 'livre'
-- Não há capítulo, cláusula nem parágrafo aqui: é uma transcrição, não um
-- instrumento. Assim a numeração automática não entra.
--
-- Idempotente: sai fora se o modelo já existir.
--
-- Reversão:
--   delete from public.tmpl_documento where nome = 'Matrícula Digitada';
--   delete from public.tmpl_bloco where nome in (
--     'Matrícula digitada: identificação', 'Matrícula digitada: descrição do imóvel',
--     'Memorial descritivo do georreferenciamento (SIGEF)');

BEGIN;

do $mig$
declare
  doc uuid;
  b_ident uuid;
  b_desc uuid;
  b_memorial uuid;
begin
  if exists (select 1 from public.tmpl_documento where nome = 'Matrícula Digitada') then
    raise notice 'Modelo "Matrícula Digitada" já existe, nada a fazer.';
    return;
  end if;

  -- 1. Identificação da matrícula (cabeçalho da folha).
  insert into public.tmpl_bloco (nome, categoria, tipo, descricao)
  values (
    'Matrícula digitada: identificação',
    'imovel',
    'livre',
    'Cabeçalho da matrícula digitada: número, livro/folha e cartório. Cada peça é condicional, porque matrícula antiga chega sem livro ou sem folha.'
  ) returning id into b_ident;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (
    b_ident, 1, true,
    $blk$*MATRÍCULA Nº {{ imovel.numero }}*{{#imovel.livro}}, Livro {{ imovel.livro }}{{/imovel.livro}}{{#imovel.folha}}, Folhas/Ficha {{ imovel.folha }}{{/imovel.folha}}{{#imovel.cartorio}}
{{ imovel.cartorio }}{{#imovel.comarca}}, comarca de {{ imovel.comarca }}{{/imovel.comarca}}{{#imovel.ufCartorio}}, Estado de {{ imovel.ufCartorio }}{{/imovel.ufCartorio}}{{/imovel.cartorio}}$blk$,
    'Versão inicial.'
  );

  -- 2. A descrição, delegada à família (uma redação por caso de imóvel).
  insert into public.tmpl_bloco (nome, categoria, tipo, descricao)
  values (
    'Matrícula digitada: descrição do imóvel',
    'imovel',
    'livre',
    'Delega à família "Descrição de imóvel": a redação (rural/urbano, exclusiva/condomínio, direitos não averbados) é escolhida a partir do imóvel ligado ao binding.'
  ) returning id into b_desc;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (
    b_desc, 1, true,
    $blk${{familia nome="Descrição de imóvel"}}$blk$,
    'Versão inicial: uma linha, porque o texto é da variante eleita na geração.'
  );

  -- 3. Memorial do georreferenciamento, só quando a matrícula tem georref.
  insert into public.tmpl_bloco (nome, categoria, tipo, descricao)
  values (
    'Memorial descritivo do georreferenciamento (SIGEF)',
    'imovel',
    'livre',
    'Área, perímetro, sistema e certificação SIGEF mais a tabela de vértices, vindos do BigQuery pela matrícula. O bloco inteiro é condicional: matrícula sem georref não escreve nada.'
  ) returning id into b_memorial;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (
    b_memorial, 1, true,
    $blk${{#imovel.georefArea}}O imóvel possui área de {{ imovel.georefArea }} ha e perímetro de {{ imovel.georefPerimetro }} m, georreferenciado no sistema {{ imovel.georefSistema }}, certificado junto ao SIGEF sob o código {{ imovel.georefCertificacao }} em {{ imovel.georefDataCertificacao }}, conforme o memorial descritivo:

| VÉRTICE | | | | SEGMENTO VANTE | | | |
| Código | Longitude | Latitude | Altitude (m) | Código | Azimute | Dist. (m) | Confrontações |
| :--: | :--: | :--: | --: | :--: | :--: | --: | :-- |
{{#vertices}}| {{ vertice.codVertice }} | {{ vertice.longitude }} | {{ vertice.latitude }} | {{ vertice.altitude }} | {{ vertice.codVante }} | {{ vertice.azimute }} | {{ vertice.distancia }} | {{ vertice.confrontacoes }} |{{/vertices}}{{/imovel.georefArea}}$blk$,
    'Versão inicial: o mesmo memorial que existia como bloco de teste no contrato, agora condicionado ao georref e com nome de bloco de verdade.'
  );

  insert into public.tmpl_documento (nome, tipo, descricao)
  values (
    'Matrícula Digitada',
    'matricula_digitada',
    'Transcrição de uma matrícula: identificação, descrição do imóvel pela família de variantes e memorial do georreferenciamento quando houver. Ligue o binding do imóvel a uma matrícula no passo de registros.'
  ) returning id into doc;

  insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
  values (doc, b_ident, 1, true), (doc, b_desc, 2, true), (doc, b_memorial, 3, true);
end
$mig$;

COMMIT;
