-- Transcreve o composse palavra por palavra e completa a parceria
--
-- ── O QUE MOTIVOU ───────────────────────────────────────────────────────────
--
-- Em 02/09/2026 os .docx GERADOS foram comparados por script, token a token,
-- contra os .docx ASSINADOS do MMS (`Instrumentos Agrários/Minutas antigas`, as
-- versões VF de onde saíram os PDFs registrados). O diff mediu:
--
--   · parceria — corpo   3.296 palavras no assinado, 3.285 no gerado (−0,3%)
--   · parceria — anexo   1.028 / 1.022 (−0,6%)
--   · composse — corpo   2.975 / 2.225  →  −750 palavras, −25,2%
--   · composse — anexo     599 / 614
--
-- Um quarto do composse não estava lá. Os blocos guardavam a redação RESUMIDA
-- que se escreveu antes de os assinados serem lidos: dois parágrafos inteiros
-- não existiam, um caput tinha sido reescrito curto, e catorze cláusulas
-- perdiam o final. Esta migration troca essa redação pela transcrição literal.
--
-- ── A REGRA QUE ESTA MIGRATION SEGUE ────────────────────────────────────────
--
-- Decidida com o usuário em 02/09/2026:
--
--   1. erro ÓBVIO do assinado (o "CEP78043-298" colado, o CPF com ponto no
--      lugar do hífen, "quatros reais", "girasol", a data errada, concordância
--      quebrada) → o gerador CORRIGE;
--   2. inconsistência que eles fazem por estilo → o gerador REPRODUZ;
--   3. estilo → o mais parecido com o .docx; onde o .docx se contradiz, a
--      variante mais frequente; sem maioria, o padrão dos outros contratos da
--      casa (Contrato Social).
--
-- Por isso o texto abaixo mantém "especificadamente", "tão-somente" e
-- "negocias"→"negociais" (o primeiro é redação, o último é erro), e mantém as
-- VARIÁVEIS onde o valor é do cadastro: transcrição literal não é congelar o
-- dado de um cliente dentro do modelo.
--
-- ── TIPO ────────────────────────────────────────────────────────────────────
--
-- Só DADOS: nenhum DDL, nenhuma coluna, nenhum índice. Mexe em
-- `tmpl_bloco` (dois blocos novos), `tmpl_bloco_versao` (versão nova onde o
-- texto mudou) e `tmpl_documento_bloco` (a ordem dos blocos novos).
--
-- VAI PARA PRODUÇÃO: o catálogo de modelos é o mesmo nos dois bancos, e um
-- contrato gerado em produção com o texto resumido é um contrato incompleto.
--
-- ── IDEMPOTENTE ─────────────────────────────────────────────────────────────
--
-- `nova_versao` só grava se o conteúdo DIFERIR do vigente, e busca o bloco por
-- nome + CATEGORIA. A busca por nome sozinha foi o que causou a colisão de
-- 02/09 (ver 20260902175625): `select ... into` com duas linhas pega a primeira
-- e não reclama, e o texto da composse foi gravado no Contrato Social.

-- ---------------------------------------------------------------------------
-- 0. Ferramentas da migration
-- ---------------------------------------------------------------------------
create or replace function pg_temp.nova_versao(
  p_nome      text,
  p_categoria text,
  p_conteudo  text,
  p_changelog text
) returns void language plpgsql as $fn$
declare
  v_bloco   uuid;
  v_quantos integer;
  v_proxima integer;
begin
  select count(*) into v_quantos
    from public.tmpl_bloco
   where nome = p_nome and categoria = p_categoria;

  if v_quantos = 0 then
    raise exception 'Bloco não encontrado: % (categoria %)', p_nome, p_categoria;
  end if;
  -- Homônimo DENTRO da mesma categoria é ambiguidade real: parar é melhor que
  -- escrever no bloco errado, que é exatamente o dano de 02/09.
  if v_quantos > 1 then
    raise exception '% blocos com o nome % na categoria % — ambíguo.', v_quantos, p_nome, p_categoria;
  end if;

  select id into v_bloco
    from public.tmpl_bloco
   where nome = p_nome and categoria = p_categoria;

  if exists (
    select 1 from public.tmpl_bloco_versao
     where bloco_id = v_bloco and atual and conteudo = p_conteudo
  ) then
    return;
  end if;

  select coalesce(max(numero_versao), 0) + 1 into v_proxima
    from public.tmpl_bloco_versao where bloco_id = v_bloco;

  update public.tmpl_bloco_versao set atual = false where bloco_id = v_bloco and atual;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, conteudo, atual, changelog)
  values (v_bloco, v_proxima, p_conteudo, true, p_changelog);
end $fn$;

create or replace function pg_temp.bloco_novo(
  p_documento  text,
  p_nome       text,
  p_categoria  text,
  p_tipo       text,
  p_ordem      integer,
  p_conteudo   text,
  p_changelog  text
) returns void language plpgsql as $fn$
declare
  v_bloco uuid;
  v_doc   uuid;
begin
  select id into v_doc from public.tmpl_documento where nome = p_documento;
  if v_doc is null then
    raise exception 'Documento não encontrado: %', p_documento;
  end if;

  select id into v_bloco
    from public.tmpl_bloco where nome = p_nome and categoria = p_categoria;

  if v_bloco is null then
    insert into public.tmpl_bloco (nome, categoria, tipo, descricao)
    values (p_nome, p_categoria, p_tipo, p_changelog)
    returning id into v_bloco;
  end if;

  if not exists (select 1 from public.tmpl_bloco_versao where bloco_id = v_bloco) then
    insert into public.tmpl_bloco_versao (bloco_id, numero_versao, conteudo, atual, changelog)
    values (v_bloco, 1, p_conteudo, true, p_changelog);
  end if;

  -- UNIQUE em (documento_id, bloco_id): o vínculo é único por par, e reaplicar
  -- a migration só reposiciona a ordem.
  insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
  values (v_doc, v_bloco, p_ordem, true)
  on conflict (documento_id, bloco_id) do update set ordem = excluded.ordem;
end $fn$;


-- ===========================================================================
-- 1. PARCERIA RURAL
-- ===========================================================================

-- 1.1 O título em DUAS linhas, com a quebra do assinado.
--
-- Os cinco documentos da casa quebram o título em dois parágrafos centralizados,
-- e a quebra é escolhida, não sobra de largura: o assinado corta depois de
-- "PARCERIA", e o gerador, emitindo um parágrafo só, cortava depois de "PARA".
-- Duas linhas em caixa alta no MESMO bloco livre saem as duas como título — ver
-- `detectarCapa` em docx.ts.
select pg_temp.nova_versao(
  'Título — Parceria rural',
  'parceria-rural',
  '*INSTRUMENTO PARTICULAR DE PARCERIA*' || E'\n' ||
  '*PARA FINS DE EXPLORAÇÃO {{ instrumento.natureza }}*',
  'Título em duas linhas, com a quebra do instrumento assinado (depois de PARCERIA).'
);

-- 1.2 Os parceiros outorgados num PARÁGRAFO SÓ.
--
-- O assinado qualifica os dois outorgados de forma corrida ("…Estado de Mato
-- Grosso; CEP 78043-298 e MARIA AUXILIADORA MALHEIROS, natural de Cuiabá/MT…").
-- O separador com `\n\n` abria um parágrafo por outorgado e inseria uma linha em
-- branco no meio do preâmbulo, onde o assinado não tem nenhuma.
select pg_temp.nova_versao(
  'Preâmbulo — Parceiros outorgados',
  'parceria-rural',
  '*~PARCEIROS OUTORGADOS~*: {{#exploradores sep="; " fim=" e "}}{{ explorador.qualificacao }}{{/exploradores}}.',
  'Outorgados num único parágrafo, como no assinado: separador "; " e fecho " e ".'
);

-- 1.3 O bloco que FALTAVA: o fecho do preâmbulo.
--
-- Entre a qualificação dos outorgados e o Capítulo I, o assinado tem o parágrafo
-- que declara o que as partes estão contratando. Ele não existia no catálogo da
-- parceria — o composse tem o equivalente na ordem 90 — e por isso o documento
-- gerado ia do preâmbulo direto para a primeira cláusula.
--
-- Ordem 35: entre 30 (outorgados) e 40 (Capítulo I).
--
-- O nome do instrumento sai em NEGRITO, não em itálico: conferido run por run no
-- .docx assinado (`<w:b/>` presente, `<w:i/>` ausente).
select pg_temp.bloco_novo(
  'Parceria Rural',
  'Fecho do preâmbulo (parceria)',
  'parceria-rural',
  'livre',
  35,
  'As partes acima identificadas têm, entre si, justas e contratadas, o presente ' ||
  '*Instrumento Particular de Parceria para Fins de Exploração {{ instrumento.naturezaTitulo }}*, ' ||
  'que se regerá pelas cláusulas e condições descritas no presente.',
  'Fecho do preâmbulo, transcrito do instrumento assinado. O bloco não existia.'
);

-- 1.4 A natureza em MINÚSCULA no meio da frase, e as aspas curvas.
--
-- "constituem parceria rural para exploração agropecuária" — o assinado só usa
-- caixa alta no título. O campo `natureza` é sempre maiúsculo; quem serve à
-- prosa é `naturezaMinuscula`.
--
-- As aspas da faixa de alíneas viram curvas: os cinco documentos da casa usam
-- “…” 46 vezes e a aspa reta nenhuma.
select pg_temp.nova_versao(
  'Cláusula — Áreas cedidas em parceria',
  'parceria-rural',
  'As partes, por este instrumento contratual, constituem parceria rural para exploração ' ||
  '{{ instrumento.naturezaMinuscula }} em áreas de terras rurais, nos termos do art. 96 da Lei 4.504/64, ' ||
  'cedendo a *PARCEIRA OUTORGANTE* em favor dos *PARCEIROS OUTORGADOS* os imóveis de sua posse e/ou ' ||
  'propriedade, descritos nas alíneas “{{ instrumento.primeiraAlinea }}” à “{{ instrumento.ultimaAlinea }}” ' ||
  'a seguir descritas, com os seus limites e confrontações dispostos no *ANEXO ÚNICO* deste instrumento:',
  'Natureza em minúscula no meio da frase e aspas curvas na faixa de alíneas.'
);

select pg_temp.nova_versao(
  'Cláusula — Vigência da parceria',
  'parceria-rural',
  'A presente parceria rural para fins de exploração {{ instrumento.naturezaMinuscula }} tem vigência ' ||
  'a contar da data da assinatura deste instrumento e findará em *{{ instrumento.dataEncerramentoExtenso }}*.',
  'Natureza em minúscula no meio da frase.'
);

-- O subtítulo do capítulo é Title Case ("Das Atividades Agropecuárias"), e
-- `naturezaPlural` é caixa alta: saía "Das Atividades AGROPECUÁRIAS".
select pg_temp.nova_versao(
  'Capítulo — Das atividades',
  'parceria-rural',
  'Das Atividades {{ instrumento.naturezaPluralTitulo }}',
  'Natureza no plural em Title Case, para acompanhar o subtítulo.'
);

-- 1.5 A palavra que o bloco ACRESCENTOU à redação oficial.
--
-- O bloco escrevia "modificação da destinação *dele*"; o assinado diz
-- "modificação da destinação, salvo mediante prévio e expresso consentimento".
-- "dele" não corrige erro nenhum — é palavra minha dentro de cláusula assinada,
-- e mexer na redação oficial é inadmissível.
--
-- Achada pelo teste que compara o BLOCO com o assinado, fragmento a fragmento, e
-- não pelo diff do documento gerado: ali a troca aparecia no meio de outras 282
-- e eu a li como estilo.
select pg_temp.nova_versao(
  'Cláusula — Vedação de cessão',
  'parceria-rural',
  'Resta, desde já, vedada aos *PARCEIROS OUTORGADOS* a cessão do presente contrato e modificação da ' ||
  'destinação, salvo mediante prévio e expresso consentimento da outra parte.',
  'Sai o "dele", que não está no instrumento assinado.'
);

-- 1.6 O fecho, com a régua do assinado.
--
-- 33 sublinhados na parceria (dois de dois), contra os 39 que o bloco tinha.
-- A ordem Nome / RG / CPF é a do próprio instrumento de parceria, e fica: dentro
-- dele é unânime, ainda que o composse e o condomínio usem Nome / CPF / RG.
select pg_temp.nova_versao(
  'Fecho e assinaturas (parceria)',
  'parceria-rural',
  'Por estarem, assim justos e contratados, firmam o presente instrumento, em ' ||
  '{{ instrumento.numeroVias }} ({{ instrumento.numeroViasExtenso }}) vias de igual teor e forma, ' ||
  'juntamente com 02 (duas) testemunhas.' || E'\n\n' ||
  '{{ instrumento.foroComarca }}/{{ instrumento.foroUf }}, {{ instrumento.dataAssinaturaExtenso }}.' || E'\n\n' ||
  -- `sep`/`fim` levam a ESCAPE literal `\n`, e não um salto de linha de verdade:
  -- quem desfaz o escape é o motor, em `desescapar` (render.ts). Newline cru
  -- dentro do atributo quebraria a tag da coleção e o fecho inteiro sairia como
  -- "seção não resolvida". Por isso este literal NÃO é `E'…'`.
  '{{#signatarios sep="\n\n" fim="\n\n"}}_________________________________' || E'\n' ||
  '*{{ signatario.nomeMaiusculo }}*' || E'\n' ||
  '{{ signatario.papel }}{{#signatario.qualificacao}} {{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}' || E'\n\n' ||
  '*Testemunhas:*' || E'\n\n' ||
  '_________________________________' || E'\n' || '*Nome:*' || E'\n' || '*RG:*' || E'\n' || '*CPF/MF:*' || E'\n\n' ||
  '_________________________________' || E'\n' || '*Nome:*' || E'\n' || '*RG:*' || E'\n' || '*CPF/MF:*',
  'Régua de assinatura com 33 sublinhados, como no instrumento assinado.'
);


-- ===========================================================================
-- 2. ALÍNEAS DOS IMÓVEIS — a letra que faltava
-- ===========================================================================
--
-- No assinado os seis imóveis são LISTA AUTOMÁTICA do Word (numId=15,
-- lowerLetter, lvlText "%1)"), tanto na Cláusula Primeira quanto no Anexo Único
-- dos dois contratos. O gerador não emite numeração automática — zero parágrafos
-- com `w:numPr` — e também não escrevia a letra como texto: as seis alíneas
-- saíam sem marcador nenhum, e a Cláusula Primeira citava "descritos nas alíneas
-- “a” à “f”" apontando para o vazio.
--
-- A letra já existia no contexto (`{{ imovel.alinea }}`, calculada uma vez em
-- `comAlinea` e compartilhada com o Considerando V). Só não estava no texto.
--
-- "folhas/ficha" em minúscula: 15 ocorrências contra 3 nos assinados, e 9 contra
-- 0 nos Contratos Sociais.
--
-- ⚠️ `Alínea — Imóvel cedido` é UM bloco usado pelos DOIS documentos (parceria
-- @55 e composse @445) — conferido por consulta. Uma versão nova corrige os dois.
select pg_temp.nova_versao(
  'Alínea — Imóvel cedido',
  'parceria-rural',
  '*{{ imovel.alinea }})* *{{ imovel.areaCedida }} ({{ imovel.areaCedidaExtenso }})* de um imóvel rural ' ||
  'com área de {{ imovel.area }} ({{ imovel.areaExtenso }}), denominado *{{ imovel.denominacao }}*, ' ||
  '*de propriedade de* {{ imovel.proprietario }}, *situado no* município de {{ imovel.municipio }}, ' ||
  'Estado {{ imovel.ufComPreposicao }}, *com registro na matrícula de* n.º *{{ imovel.numero }}*' ||
  '{{#imovel.livro}}, no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}){{/imovel.livro}}' ||
  '{{#imovel.folha}}, folhas/ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }}){{/imovel.folha}}' ||
  '{{#imovel.cartorio}} do {{ imovel.cartorio }}' ||
  '{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}' ||
  '{{#imovel.ufCartorio}}, Estado {{ imovel.ufCartorioComPreposicao }}{{/imovel.ufCartorio}}{{/imovel.cartorio}}' ||
  '{{#imovel.ccir}}, *inscrito no cadastro de imóvel rural sob o n.º {{ imovel.ccir }}*{{/imovel.ccir}};',
  'A alínea passa a imprimir a própria letra ("a)"…"f)"), que no assinado é lista automática do Word. "folhas/ficha" em minúscula.'
);

select pg_temp.nova_versao(
  'Alínea — Imóvel cedido com limites e perímetro',
  'parceria-rural',
  '*{{ imovel.alinea }})* *{{ imovel.areaCedida }} ({{ imovel.areaCedidaExtenso }})* de um imóvel rural ' ||
  'com área de {{ imovel.area }} ({{ imovel.areaExtenso }}), denominado *{{ imovel.denominacao }}*, ' ||
  '*de propriedade de* {{ imovel.proprietario }}, *situado no* município de {{ imovel.municipio }}, ' ||
  'Estado {{ imovel.ufComPreposicao }}, *com registro na matrícula de* n.º *{{ imovel.numero }}*' ||
  '{{#imovel.livro}}, no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}){{/imovel.livro}}' ||
  '{{#imovel.folha}}, folhas/ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }}){{/imovel.folha}}' ||
  '{{#imovel.cartorio}} do {{ imovel.cartorio }}' ||
  '{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}' ||
  '{{#imovel.ufCartorio}}, Estado {{ imovel.ufCartorioComPreposicao }}{{/imovel.ufCartorio}}{{/imovel.cartorio}}' ||
  '{{#imovel.ccir}}, *inscrito no cadastro de imóvel rural sob o n.º {{ imovel.ccir }}*{{/imovel.ccir}}' ||
  '{{#imovel.confrontacoes}}, com os seguintes limites e confrontações: {{ imovel.confrontacoes }}{{/imovel.confrontacoes}}' ||
  '{{#imovel.georefPerimetro}}. Elementos do Perímetro: {{#vertices sep="; " fim="; "}}{{ vertice.codVertice }}-{{ vertice.codVante }}, ' ||
  '{{ vertice.distancia }} metros {{ vertice.azimute }}{{#vertice.confrontacoes}} {{ vertice.confrontacoes }}{{/vertice.confrontacoes}}{{/vertices}}' ||
  'constante na cláusula primeira{{/imovel.georefPerimetro}};',
  'Mesma correção da alínea do corpo: a letra passa a ser impressa e "folhas/ficha" em minúscula.'
);


-- ===========================================================================
-- 3. COMPOSSE RURAL PRO INDIVISO — a transcrição
-- ===========================================================================

-- 3.1 Título em duas linhas, com a quebra do assinado (depois de CONSTITUIÇÃO).
select pg_temp.nova_versao(
  'Título — Composse rural pro indiviso',
  'composse-rural',
  '*INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO*' || E'\n' ||
  '*DE COMPOSSE RURAL PRO INDIVISO*',
  'Título em duas linhas, com a quebra do instrumento assinado.'
);

-- 3.2 Os compossuidores num PARÁGRAFO SÓ.
--
-- Mesmo defeito do preâmbulo da parceria (item 1.2), e encontrado depois dele:
-- o assinado qualifica os dois compossuidores de forma corrida, terminando em
-- "…CEP 78.043-298; e MARIA AUXILIADORA MALHEIROS, brasileira, …", e o separador
-- com `\n\n` abria um parágrafo por compossuidor.
--
-- Passou pela primeira leitura porque o diff acusou o trecho como "parágrafo só
-- no gerado" — que é como um parágrafo partido aparece — e não como divergência
-- de token. Quem pegou foi o mapa bloco a bloco do instrumento assinado.
select pg_temp.nova_versao(
  'Preâmbulo — Compossuidores',
  'composse-rural',
  '{{#compossuidores sep="; " fim="; e "}}{{ compossuidor.qualificacao }}{{/compossuidores}}, ' ||
  'neste ato doravante denominados *COMPOSSUIDORES RURAIS* ou simplesmente *COMPOSSUIDORES*.',
  'Compossuidores num único parágrafo, como no assinado: separador "; " e fecho "; e ".'
);

-- 3.3 O "PREÂMBULO" é sublinhado no assinado (`w:u val="single"`).
select pg_temp.nova_versao(
  'Título — Preâmbulo',
  'composse-rural',
  '*~PREÂMBULO~*',
  'Sublinhado, como no assinado.'
);

-- 3.4 Considerando V: o número de instrumentos concorda, e a data sai por extenso.
--
-- Três correções neste bloco:
--
--   · "advém DO SEGUINTE INSTRUMENTO" no singular. O bloco fixava o plural, e o
--     assinado do MMS está no singular porque a posse dos seis imóveis vem de um
--     contrato só. Quem decide é a contagem de GRUPOS de origem
--     (`instrumento.origemUnica` / `origensVarias`), não o cadastro;
--   · a data do instrumento de origem POR EXTENSO ("firmado em 10 de outubro de
--     2.022"). Saía "10/10/2022", num formato que nenhum outro trecho usa;
--   · "como Parceira Outorgante *a empresa* MMS AGRO LTDA" — só quando o
--     outorgante da origem é pessoa jurídica. "A empresa João da Silva" seria uma
--     afirmação falsa sobre a contraparte.
--
-- A data 11/10/2.022 que o assinado cita é erro deles: a parceria foi firmada em
-- 10/10 e 11/10 é a data do próprio composse. Fica corrigida (regra 1).
select pg_temp.nova_versao(
  'Considerando V — Origem da posse dos imóveis',
  'composse-rural',
  '*V)* CONSIDERANDO que a posse dos imóveis rurais descritos no Anexo único deste instrumento advém ' ||
  '{{#instrumento.origemUnica}}do seguinte instrumento{{/instrumento.origemUnica}}' ||
  '{{#instrumento.origensVarias}}dos seguintes instrumentos{{/instrumento.origensVarias}}:' || E'\n\n' ||
  -- Escape literal `\n`, não salto de linha: ver a nota do fecho da parceria.
  '{{#origensDaPosse sep="\n\n"}}*{{ origemPosse.letra }})* {{ origemPosse.itens }} ' ||
  '{{ origemPosse.advir }} {{ origemPosse.tipoPorExtenso }}' ||
  '{{#origemPosse.propria}}, sendo o imóvel já explorado diretamente pelos próprios COMPOSSUIDORES RURAIS, ' ||
  'sem instrumento de cessão de terceiro por trás{{/origemPosse.propria}}' ||
  '{{#origemPosse.deTerceiro}}, firmado em {{ origemPosse.dataAssinaturaExtenso }}, no qual figuram como ' ||
  'Parceiros Outorgados os COMPOSSUIDORES RURAIS e como Parceira Outorgante {{#sePJ}}a empresa {{/sePJ}}' ||
  '{{ outorgante.qualificacao }}{{/origemPosse.deTerceiro}};{{/origensDaPosse}}',
  'Concordância do número de instrumentos, data da origem por extenso e "a empresa" só para outorgante PJ.'
);

-- 3.5 Cláusula Segunda, Parágrafo Segundo — as quatro alíneas por inteiro.
--
-- O que faltava, alínea por alínea: a hipótese que abre a alínea "a" (o
-- desinteresse do compossuidor e dos herdeiros), "de qualquer um daqueles", "de
-- acordo com as normas técnicas contábeis vigentes à época"; em "b", a
-- referência ao caput e à alínea "a", o nome do INPC por extenso e a lista de
-- eventos que dão origem à liquidação; em "c", o alcance das avaliações e os
-- percentuais da Cláusula Segunda; em "d", "a este(s) compossuidor(es)" e
-- "incluindo forma de avaliação, prazo e forma de pagamento".
--
-- "será determinado" → "serão determinados": o sujeito é "os valores devidos".
select pg_temp.nova_versao(
  'Parágrafo — Liquidação de haveres',
  'composse-rural',
  'Caberá a cada COMPOSSUIDOR tão somente a participação estipulada no caput desta cláusula, restando ' ||
  'ainda acordado que caso haja a dissolução da composse, por qualquer motivo, as partes ou terceiros ' ||
  'interessados acordarão como se dará a liquidação dos haveres, sendo que na ausência de comum acordo, ' ||
  'a liquidação dos haveres do compossuidor retirante, seu cônjuge ou companheiro(a), herdeiro(a), ' ||
  'sucessor(a) e/ou terceiro, observará o disposto nas alíneas abaixo:' || E'\n\n' ||
  '*a)* Não sendo possível ou inexistindo interesse do compossuidor, de herdeiros, sucessores, do cônjuge ' ||
  'meeiro ou companheiro(a) e/ou não sendo aprovado o ingresso de qualquer um destes por qualquer um dos ' ||
  'compossuidores remanescentes, o valor dos haveres de qualquer um daqueles será apurado e liquidado com ' ||
  'base no valor do patrimônio líquido da composse apurado em balanço especificadamente para este fim, ' ||
  'levantado, no máximo, 60 (sessenta) dias antes do evento, de acordo com as normas técnicas contábeis ' ||
  'vigentes à época;' || E'\n\n' ||
  '*b)* O pagamento dos haveres das pessoas relacionadas no caput e na alínea “a” deste parágrafo será ' ||
  'realizado em moeda corrente nacional, através de depósito em conta bancária do beneficiário, em ' ||
  '{{ instrumento.liquidacaoParcelas }} ({{ instrumento.liquidacaoParcelasExtenso }}) parcelas iguais e ' ||
  '{{ instrumento.liquidacaoPeriodicidadeProsa }} atualizadas monetariamente pela variação do INPC – ' ||
  'Índice Nacional de Preços ao Consumidor, ou outro índice que vier a substituí-lo, vencendo a primeira ' ||
  'em {{ instrumento.liquidacaoPrimeiroVencimento }} que deu origem à liquidação (pedido de retirada, ' ||
  'exclusão, ciência da sociedade quanto a qualidade de herdeiro, sucessor e/ou cônjuge meeiro ou outro ' ||
  'fato ou ato jurídico);' || E'\n\n' ||
  '*c)* Os compossuidores estabelecem que todas as avaliações dos haveres que eventualmente forem ' ||
  'necessárias para cumprir o que estiver disposto no presente instrumento de composse, inclusive para o ' ||
  'que trata esta cláusula, serão realizadas por empresa especializada, cuja nomeação competirá aos ' ||
  'compossuidores que possuírem a maioria da participação na composse, observados os percentuais ' ||
  'descritos no caput desta Cláusula Segunda;' || E'\n\n' ||
  '*d)* Em todos os demais casos em que ocorrer a resolução da composse face a um ou mais ' ||
  'compossuidor(es), ainda que não esteja expressamente previsto neste instrumento, os valores devidos a ' ||
  'este(s) compossuidor(es) serão determinados através da metodologia descrita nas alíneas anteriores, ' ||
  'incluindo forma de avaliação, prazo e forma de pagamento.',
  'Transcrição literal das quatro alíneas do instrumento assinado.'
);

-- 3.6 Cláusula Quarta — o que a indivisão alcança e a renovação do prazo.
--
-- Faltavam "que eventualmente adquiram e/ou edifiquem em nome da composse e/ou
-- por força do presente instrumento" e "renovando-se o prazo de 03 (três) anos".
-- O aviso prévio volta à redação do assinado ("03 (três) meses antes do
-- vencimento", e não "com 3 meses de antecedência").
select pg_temp.nova_versao(
  'Cláusula — Prazo de indivisão',
  'composse-rural',
  'Os COMPOSSUIDORES RURAIS determinam que seja deixada indivisa a coisa comum, em especial os imóveis, ' ||
  'bens, benfeitorias, máquinas, equipamentos, implementos etc. que eventualmente adquiram e/ou ' ||
  'edifiquem em nome da composse e/ou por força do presente instrumento pelo prazo de ' ||
  '{{ instrumento.prazoIndivisaoQuantidade }} ({{ instrumento.prazoIndivisaoQuantidadeExtenso }}) ' ||
  '{{ instrumento.prazoIndivisaoUnidade }}{{#instrumento.indivisaoProrrogavel}}, podendo ainda ser ' ||
  'prorrogado por igual interstício se não houver, por escrito, {{ instrumento.indivisaoAvisoQuantidade }} ' ||
  '({{ instrumento.indivisaoAvisoQuantidadeExtenso }}) {{ instrumento.indivisaoAvisoUnidade }} antes do ' ||
  'vencimento, o requerimento de divisão da coisa comum por qualquer um dos COMPOSSUIDORES RURAIS; ' ||
  'renovando-se o prazo de {{ instrumento.prazoIndivisaoQuantidade }} ' ||
  '({{ instrumento.prazoIndivisaoQuantidadeExtenso }}) {{ instrumento.prazoIndivisaoUnidade }} ' ||
  'sucessivamente, até que formalmente uma das partes notifique a outra desejando a divisão da coisa ' ||
  'comum e a extinção da presente composse{{/instrumento.indivisaoProrrogavel}}.',
  'Transcrição literal: alcance da indivisão, aviso prévio e renovação do prazo.'
);

-- 3.7 Cláusula Sexta — os dois parágrafos por inteiro.
select pg_temp.nova_versao(
  'Parágrafo — Receitas e despesas por livro caixa',
  'composse-rural',
  'Os resultados serão auferidos levando-se em consideração todas as receitas e despesas (custos), ' ||
  'obtidos pela atividade realizada em comum, apurados mediante livro caixa sob o regime de caixa, nos ' ||
  'termos das normativas estabelecidas pelo CFC (Conselho Federal de Contabilidade).',
  'O nome do CFC por extenso, como no assinado.'
);

select pg_temp.nova_versao(
  'Parágrafo — Prejuízo proporcional',
  'composse-rural',
  'Havendo prejuízo, estes serão suportados proporcionalmente por cada um dos COMPOSSUIDORES, observada ' ||
  'a proporção descrita no caput da Cláusula Segunda e o disposto na Cláusula Sétima.',
  'Volta a remissão à proporção da Cláusula Segunda e à Cláusula Sétima.'
);

-- 3.8 Cláusula Sétima — o caput inteiro e o parágrafo único que NÃO EXISTIA.
--
-- No caput faltavam "utilizados nas propriedades rurais inclusas neste pacto",
-- "assim como quaisquer outras" e "e outros de qualquer espécie". "negocias" do
-- assinado é erro de digitação e sai como "negociais" (regra 1).
select pg_temp.nova_versao(
  'Cláusula — Responsabilidades suportadas pela composse',
  'composse-rural',
  'As responsabilidades decorrentes da contratação de trabalhadores rurais ou diaristas utilizados nas ' ||
  'propriedades rurais inclusas neste pacto, assim como quaisquer outras obrigações trabalhistas ou ' ||
  'sociais, os passivos tributários, fiscais, ambientais, cíveis, bancários, contratuais, negociais e ' ||
  'outros de qualquer espécie serão suportados pela COMPOSSE, nos moldes da lei e deste contrato.',
  'Transcrição literal do caput da Cláusula Sétima.'
);

-- Parágrafo único da Cláusula Sétima: 90 palavras que não estavam em bloco
-- nenhum. É ele que manda os custos de manutenção, operacionais, administrativos
-- e as benfeitorias entrarem na composição do resultado (e no cálculo de
-- haveres) — sem isso o contrato apura resultado sem dizer o que o compõe.
--
-- Ordem 235: depois da Cláusula Sétima (230) e antes da Oitava (240). Como
-- `tipo = paragrafo`, o motor numera "Parágrafo Único" sozinho.
select pg_temp.bloco_novo(
  'Composse Rural Pro Indiviso',
  'Parágrafo — Custos que compõem o resultado',
  'composse-rural',
  'paragrafo',
  235,
  'Além dos custos elencados no caput, todos os demais oriundos da manutenção das benfeitorias e bens ' ||
  'próprios e/ou cedidos sob o regime de parceria ou outra forma de cessão, apurados em decorrência da ' ||
  'exploração das atividades objeto deste contrato realizada pelos COMPOSSUIDORES, bem como os custos ' ||
  'operacionais, despesas administrativas, financeiras e comerciais, máquinas e equipamentos adquiridos ' ||
  'e benfeitorias edificadas farão parte da composição do resultado (ou do cálculo para apuração de ' ||
  'haveres) da presente COMPOSSE RURAL, desde que devidamente contabilizada na forma como dispõe o ' ||
  'parágrafo primeiro da Cláusula Sexta.',
  'Parágrafo único da Cláusula Sétima do instrumento assinado. O bloco não existia.'
);

-- 3.9 Cláusula Oitava — a ressalva do nome designado.
select pg_temp.nova_versao(
  'Cláusula — Inscrição estadual da composse',
  'composse-rural',
  'A COMPOSSE deverá abrir inscrição estadual para a exploração de suas atividades, observado, se ' ||
  'necessário ou possível, o nome designado para a COMPOSSE previsto no parágrafo primeiro da Cláusula ' ||
  'Segunda.',
  'Volta a ressalva "se necessário ou possível" do assinado.'
);

-- 3.10 Cláusula Nona — o caput que havia sido reescrito curto.
--
-- O bloco dizia "insumos e demais itens necessários à exploração do objeto deste
-- contrato". O assinado enumera as fontes de recurso e os itens um por um, e
-- termina mandando REGISTRAR os débitos para quitação conforme as receitas — a
-- obrigação de registro tinha desaparecido junto com a lista.
select pg_temp.nova_versao(
  'Cláusula — Financiamento do capital de giro',
  'composse-rural',
  'Caberá aos COMPOSSUIDORES financiarem, com recursos próprios ou de terceiros (empréstimos, ' ||
  'financiamentos bancários, de fornecedores, etc.), as necessidades de capital de giro, insumos, ' ||
  'sementes, adubos, fertilizantes, mão-de-obra para lavoura, mão-de-obra para manutenção e conserto dos ' ||
  'equipamentos, combustíveis, peças, pequenos investimentos em infraestrutura, enfim, tudo o que for ' ||
  'necessário para a exploração do objeto deste contrato de COMPOSSE, registrando os referidos débitos ' ||
  'para que, conforme as receitas sejam auferidas, sejam quitados.',
  'Transcrição literal do caput da Cláusula Nona.'
);

select pg_temp.nova_versao(
  'Parágrafo — CPR e cessão de frutos em garantia',
  'composse-rural',
  '{{#instrumento.penhor}}Fica possibilitada, ainda, a contratação de financiamentos rurais pelos ' ||
  'COMPOSSUIDORES, observados os limites descritos na Cláusula Décima Primeira, desde que o financiamento ' ||
  'se destine à exploração econômica da composse, podendo ceder frutos da atividade comum como garantia, ' ||
  'mediante a emissão de Cédula de Produto Rural ou outro instrumento jurídico com o mesmo fim.' ||
  '{{/instrumento.penhor}}',
  'Volta o limite da Cláusula Décima Primeira e a destinação à exploração econômica da composse.'
);

-- Parágrafo segundo da Cláusula Nona: outras 95 palavras ausentes. É o que faz o
-- custo do financiamento e as receitas (venda, incentivos, descontos, devoluções,
-- variação monetária, serviços) integrarem o resultado da safra.
--
-- Ordem 265: depois do parágrafo da CPR (260) e antes da Cláusula Décima (270).
-- Sob a MESMA guarda `{{#instrumento.penhor}}` do parágrafo anterior — ele se
-- refere a "o parágrafo anterior", e sem a guarda ficaria pendurado num contrato
-- sem penhor. Com os dois parágrafos presentes o motor passa a numerá-los
-- "Primeiro" e "Segundo", como no assinado (hoje sai "Único").
select pg_temp.bloco_novo(
  'Composse Rural Pro Indiviso',
  'Parágrafo — Custo dos financiamentos no resultado',
  'composse-rural',
  'paragrafo',
  265,
  '{{#instrumento.penhor}}O custo dos financiamentos a serem obtidos de terceiros (despesas ' ||
  'financeiras), a que se refere o parágrafo anterior utilizado tão-somente no custeio das atividades ' ||
  'atinentes à presente composse, será parte integrante na apuração do resultado de cada safra, assim ' ||
  'como todas as receitas auferidas, tais como: venda de produtos, incentivos fiscais, incentivos ' ||
  'governamentais (prêmios e outros), descontos financeiros (por antecipação de pagamentos, e outros), ' ||
  'devoluções de compras, resultado positivo de variação monetária e ou cambial e prestações de ' ||
  'serviços.{{/instrumento.penhor}}',
  'Parágrafo segundo da Cláusula Nona do instrumento assinado. O bloco não existia.'
);

-- 3.11 Cláusula Décima — "estatuída neste instrumento".
select pg_temp.nova_versao(
  'Cláusula — Repasse dos lucros',
  'composse-rural',
  'Os lucros obtidos pela atividade rural resultante da composse estatuída neste instrumento serão ' ||
  'repassados aos COMPOSSUIDORES RURAIS na forma estabelecida na Cláusula Segunda.',
  'Volta "estatuída neste instrumento".'
);

-- 3.12 O subtítulo do Capítulo III não tem artigo.
--
-- O bloco dizia "Da Administração"; o assinado escreve "CAPÍTULO III –
-- ADMINISTRAÇÃO", seco. É o único dos cinco capítulos do composse sem artigo, e
-- o "Da" era acréscimo meu — o mesmo caso do "dele" da parceria (item 1.5).
--
-- Fica em Title Case porque subtítulo de capítulo é Title Case em toda a casa
-- (27 capítulos nos dois Contratos Sociais); o que sai é só a palavra a mais.
select pg_temp.nova_versao(
  'Capítulo — Da administração',
  'composse-rural',
  'Administração',
  'Sai o artigo "Da": o Capítulo III do assinado é "ADMINISTRAÇÃO", sem artigo.'
);

-- 3.13 Cláusula Décima Primeira, Parágrafo Primeiro — caput e DUAS alíneas.
--
-- Aqui o bloco não só resumia: INVERTIA o sentido. O assinado diz que os atos
-- "só poderão ser realizados PELO compossuidor JOSE EDUARDO… que administra a
-- composse" — é uma RESERVA de competência ao administrador. O bloco dizia que
-- eles "só podem ser feitos isoladamente por José Eduardo…", que se lê como
-- permissão de agir sozinho. E os dois atos reservados, que no assinado são duas
-- alíneas, estavam fundidos numa frase.
--
-- A concordância do verbo fica em cada ramo ("que administra" / "que
-- administram"), e a coleção de nomeados fora dos ramos — a mesma forma do bloco
-- de administração e poderes.
select pg_temp.nova_versao(
  'Parágrafo — Atos que exigem maioria ou nomeados',
  'composse-rural',
  '{{#instrumento.administracaoMaioria}}Os seguintes atos só poderão ser realizados pelos COMPOSSUIDORES ' ||
  'que representem a maioria dos percentuais descritos na Cláusula Segunda, sob pena de nulidade e serem ' ||
  'inoponíveis à *COMPOSSE*:{{/instrumento.administracaoMaioria}}' ||
  '{{#instrumento.administracaoNomeados}}Os seguintes atos só poderão ser realizados ' ||
  '{{#instrumento.nomeadoUnico}}pelo compossuidor {{/instrumento.nomeadoUnico}}' ||
  '{{#instrumento.nomeadosEmConjunto}}pelos compossuidores {{/instrumento.nomeadosEmConjunto}}' ||
  '{{#administradoresNomeados sep=", " fim=" e "}}*{{ adminNomeado.nomeMaiusculo }}*{{/administradoresNomeados}}' ||
  '{{#instrumento.nomeadoUnico}} que administra a composse{{/instrumento.nomeadoUnico}}' ||
  '{{#instrumento.nomeadosEmConjunto}} que administram a composse{{/instrumento.nomeadosEmConjunto}}' ||
  ', sob pena de nulidade e serem inoponíveis à *COMPOSSE*:{{/instrumento.administracaoNomeados}}' || E'\n\n' ||
  '*a)* Locar, arrendar e/ou formar parcerias rurais a qualquer título em nome da *COMPOSSE*;' || E'\n\n' ||
  '*b)* Emitir garantias de qualquer natureza a favor de terceiros (não *COMPOSSUIDORES*), incluindo ' ||
  'aval, fiança, endossos etc.',
  'Transcrição literal: reserva de competência ao administrador (o bloco invertia o sentido) e as duas alíneas separadas.'
);

select pg_temp.nova_versao(
  'Parágrafo — Incapacidade civil superveniente',
  'composse-rural',
  'Havendo incapacidade civil superveniente de qualquer administrador, a administração da COMPOSSE ' ||
  'passará a ser desempenhada isoladamente pelo administrador remanescente que se encontrar em pleno ' ||
  'gozo da capacidade civil, inclusive para os atos ou negócios jurídicos descritos no parágrafo primeiro ' ||
  'desta cláusula.',
  'Transcrição literal, incluindo a remissão ao parágrafo primeiro.'
);

-- 3.14 Capítulo do penhor — as quatro cláusulas por inteiro.
select pg_temp.nova_versao(
  'Cláusula — Autorização do penhor',
  'composse-rural',
  'Os COMPOSSUIDORES autorizam, desde já, que sejam oferecidos em garantia de financiamentos a serem ' ||
  'concedidos por Instituições Financeiras, durante toda a vigência deste instrumento contratual, a ' ||
  'totalidade da produção a ser auferida nos imóveis rurais objetos desta COMPOSSE, bem como os ' ||
  'materiais agrários, benfeitorias e semoventes de sua posse ou propriedade ali localizados.',
  '"instrumento contratual", como no assinado.'
);

select pg_temp.nova_versao(
  'Cláusula — Prazo do penhor por safra',
  'composse-rural',
  'Os COMPOSSUIDORES declaram ter plena ciência de que o penhor dos produtos dados em garantia em cada ' ||
  'safra, previstos no item precedente, valerá pelo prazo da respectiva obrigação garantida, em ' ||
  'conformidade com o artigo 1.439 do Código Civil (Lei 10.406/2.002), não podendo ser superior ao ' ||
  'período de vigência deste instrumento contratual.',
  'Volta "previstos no item precedente" e a citação da Lei 10.406/2.002.'
);

select pg_temp.nova_versao(
  'Cláusula — Destinação prioritária à liquidação',
  'composse-rural',
  'Os COMPOSSUIDORES autorizam ainda, que sejam destinados prioritariamente, sob renúncia plena de todos ' ||
  'os direitos sobre os bens, o produto oriundo da venda da produção financiada e/ou de bens vinculados, ' ||
  'à liquidação dos respectivos débitos contraídos, antes mesmo do pagamento e/ou repartição dos frutos ' ||
  'de que o mesmo faz jus a título desta COMPOSSE.',
  'Volta a renúncia de direitos sobre os bens e "de que o mesmo faz jus a título".'
);

select pg_temp.nova_versao(
  'Cláusula — Fiscalização pelas instituições financeiras',
  'composse-rural',
  'Os COMPOSSUIDORES declaram ter plena ciência do direito que assiste às Instituições Financeiras de ' ||
  'fiscalizar os empreendimentos financiados e vistoriar, por conseguinte, os bens vinculados, ' ||
  'localizados na mencionada propriedade, concordando que ditos bens ali permaneçam até a final ' ||
  'liquidação das dívidas pertinentes, mantendo-se essa condição mesmo no caso de alienação do imóvel.',
  'Volta a permanência dos bens até a liquidação, inclusive em caso de alienação.'
);

-- 3.15 Disposições gerais.
select pg_temp.nova_versao(
  'Cláusula — Preservação dos recursos naturais',
  'composse-rural',
  'Obrigam-se as partes à preservação dos recursos naturais existentes nas áreas ocupadas pela COMPOSSE ' ||
  'na forma da lei, objetivando, ainda, este contrato, a proteção social e econômica dos COMPOSSUIDORES ' ||
  'RURAIS.',
  'Volta a finalidade de proteção social e econômica dos compossuidores.'
);

select pg_temp.nova_versao(
  'Cláusula — Irrevogabilidade e foro',
  'composse-rural',
  'Este instrumento constitui acordo irrevogável e irretratável entre as PARTES, obrigando seus ' ||
  'respectivos herdeiros e sucessores, em todos os seus termos, podendo ser rescindido mediante distrato ' ||
  'em comum acordo, sendo que nenhuma alteração terá qualquer efeito, a menos que feita por escrito e ' ||
  'assinada por cada um dos COMPOSSUIDORES RURAIS, elegendo as partes o foro da Comarca de ' ||
  '{{ instrumento.foroComarca }}, Estado de {{ instrumento.foroUfExtenso }}, para dirimir quaisquer ' ||
  'conflitos que possam surgir em virtude deste pacto.',
  'Volta "em todos os seus termos" e "que possam surgir em virtude deste pacto".'
);

-- 3.16 O fecho, com a régua do assinado (30 sublinhados, dois de dois).
select pg_temp.nova_versao(
  'Fecho e assinaturas (composse)',
  'composse-rural',
  'E assim, por estarem justos e contratados, os *COMPOSSUIDORES RURAIS* assinam este *INSTRUMENTO* em ' ||
  '{{ instrumento.numeroVias }} ({{ instrumento.numeroViasExtenso }}) vias de igual teor e forma, ' ||
  'perante as 02 (duas) testemunhas abaixo.' || E'\n\n' ||
  '{{ instrumento.foroComarca }}/{{ instrumento.foroUf }}, {{ instrumento.dataAssinaturaExtenso }}.' || E'\n\n' ||
  -- Escape literal `\n`, não salto de linha: ver a nota do fecho da parceria.
  '{{#signatarios sep="\n\n" fim="\n\n"}}______________________________' || E'\n' ||
  '*{{ signatario.nomeMaiusculo }}*' || E'\n' ||
  '{{ signatario.papel }}{{#signatario.qualificacao}} {{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}' || E'\n\n' ||
  '*Testemunhas:*' || E'\n\n' ||
  '______________________________' || E'\n' || '*Nome:*' || E'\n' || '*CPF/MF:*' || E'\n' || '*RG:*' || E'\n\n' ||
  '______________________________' || E'\n' || '*Nome:*' || E'\n' || '*CPF/MF:*' || E'\n' || '*RG:*',
  'Régua de assinatura com 30 sublinhados, como no instrumento assinado.'
);


-- ===========================================================================
-- 4. AS ASPAS DE CITAÇÃO QUE FALTARAM
-- ===========================================================================
--
-- A casa usa aspas CURVAS: 46 ocorrências de “…” nos cinco documentos assinados
-- e nenhuma aspa reta. Eu havia trocado só as da Cláusula Primeira da parceria e
-- esquecido estes cinco blocos.
--
-- Quem encontrou foi a guarda do passo 5 desta própria migration, ao abortar a
-- primeira tentativa de aplicação. Vale registrar por que ela quase não achou: a
-- versão anterior da guarda procurava aspa reta ao lado de letra
-- (`[[:alpha:]]"`), e isso casa com o `n"` de `sep="\n\n"` — sintaxe legítima do
-- motor. Contando bloco certo como errado, o número deixou de significar coisa
-- alguma. A guarda agora TIRA as tags `{{…}}` antes de procurar: depois disso,
-- qualquer aspa reta que sobre é citação.
--
-- Nada além das aspas muda nestes cinco: o resto é o texto vigente, verbatim.

select pg_temp.nova_versao(
  'Considerando I — Interesse em associar-se',
  'composse-rural',
  '*I)* CONSIDERANDO que os COMPOSSUIDORES RURAIS têm interesse em se associarem para exploração de ' ||
  'atividade agropecuária, vez que possuem, no conjunto, conhecimento técnico especializado, capital, ' ||
  'máquinas e equipamentos, e ainda, são legítimos possuidores dos imóveis rurais descritos nas alíneas ' ||
  '“{{ instrumento.primeiraAlinea }}” à “{{ instrumento.ultimaAlinea }}”, do ANEXO ÚNICO deste instrumento.',
  'Aspas curvas na faixa de alíneas.'
);

select pg_temp.nova_versao(
  'Parágrafo — Frutos da pecuária na recria e engorda',
  'parceria-rural',
  '{{#instrumento.pecuariaRecriaEngorda}}Considerar-se-á como “frutos” da pecuária, no caso de recria e ' ||
  'engorda, o ganho de peso (kg) dos animais adquiridos pelos *PARCEIROS OUTORGADOS* para exploração de ' ||
  '“pecuária de engorda” nas áreas objeto desta parceria. O ganho de peso descrito anteriormente será ' ||
  'auferido pela diferença entre o peso inicial de aquisição de cada animal e o peso identificado na ' ||
  'alienação do mesmo, sendo que eventuais animais já existentes nas áreas que são objeto desta parceria ' ||
  'deverão ser pesados em até 30 (trinta) dias contados da assinatura deste instrumento, o qual será ' ||
  'igualmente reconhecido como “peso inicial”. Identificado o ganho de peso, será assegurada à ' ||
  '*PARCEIRA OUTORGANTE* a parcela de frutos descrita no _caput_, a qual lhe será entregue através da ' ||
  'cessão de animais dos *PARCEIROS OUTORGADOS* com peso proporcional aos frutos.' ||
  '{{/instrumento.pecuariaRecriaEngorda}}',
  'Aspas curvas em “frutos”, “pecuária de engorda” e “peso inicial”.'
);

select pg_temp.nova_versao(
  'Parágrafo — Frutos da pecuária na cria',
  'parceria-rural',
  '{{#instrumento.pecuariaCria}}Considerar-se-á como “frutos” da pecuária, no caso de cria, os bezerros ' ||
  'nascidos do rebanho de fêmea de todos os animais decorrentes da presente parceria, sendo que à ' ||
  '*PARCEIRA OUTORGANTE* será assegurada a parcela dos frutos descrita no _caput_, a qual lhe será ' ||
  'entregue através da cessão de animais dos *PARCEIROS OUTORGADOS* em quantidade proporcional aos ' ||
  'frutos.{{/instrumento.pecuariaCria}}',
  'Aspas curvas em “frutos”.'
);

select pg_temp.nova_versao(
  'Parágrafo — Frutos da pecuária no ciclo completo',
  'parceria-rural',
  '{{#instrumento.pecuariaCicloCompleto}}Considerar-se-á como “frutos” da pecuária, no caso do ciclo ' ||
  'completo, o peso (kg) adquiridos pelos animais nos imóveis objeto desta parceria a cada 12 (doze) ' ||
  'meses contados a partir da assinatura deste contrato, utilizando-se como parâmetro as notas fiscais ' ||
  'de venda e/ou eventuais controles internos dos *PARCEIROS OUTORGADOS*.' ||
  '{{/instrumento.pecuariaCicloCompleto}}',
  'Aspas curvas em “frutos”.'
);

select pg_temp.nova_versao(
  'Parágrafo — Mora na entrega dos frutos',
  'parceria-rural',
  'Havendo inadimplemento quanto à entrega dos frutos da parceria à *PARCEIRA OUTORGANTE*, ' ||
  'independentemente de qualquer notificação judicial ou extrajudicial, estarão os ' ||
  '*PARCEIROS OUTORGADOS* constituídos em mora, incidindo sobre o valor vencido a atualização monetária ' ||
  'pelo INPC, além de multa moratória de 10% (dez por cento) e juros moratórios de 1% (um por cento) ao ' ||
  'mês, sendo considerados como “valor”, para fins da parceria agrícola e pecuária, os preços apurados ' ||
  'pelo {{ instrumento.institutoPreco }} na praça do foro deste contrato.',
  'Aspas curvas em “valor”.'
);


-- ---------------------------------------------------------------------------
-- 5. Conferência
-- ---------------------------------------------------------------------------
do $$
declare
  v_falta        text;
  v_sem_atual    integer;
  v_ordem_dup    integer;
  v_colisao      integer;
  v_reto         integer;
  v_atributo     integer;
begin
  -- Os dois blocos que não existiam, e o fecho do preâmbulo da parceria.
  for v_falta in
    select nome from (values
      ('Fecho do preâmbulo (parceria)'),
      ('Parágrafo — Custos que compõem o resultado'),
      ('Parágrafo — Custo dos financiamentos no resultado')
    ) as t(nome)
    where not exists (
      select 1 from public.tmpl_bloco b
        join public.tmpl_documento_bloco db on db.bloco_id = b.id
        join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
       where b.nome = t.nome
    )
  loop
    raise exception 'Bloco novo ausente ou sem vínculo/versão: %', v_falta;
  end loop;

  -- Todo bloco do catálogo com exatamente uma versão atual.
  select count(*) into v_sem_atual from (
    select b.id from public.tmpl_bloco b
      join public.tmpl_bloco_versao v on v.bloco_id = b.id
     group by b.id
    having count(*) filter (where v.atual) <> 1
  ) t;
  if v_sem_atual > 0 then
    raise exception '% bloco(s) sem exatamente uma versão atual.', v_sem_atual;
  end if;

  -- Nenhuma ordem repetida nos dois instrumentos agrários: ordem duplicada
  -- deixa a sequência de cláusulas à mercê do tie-break do banco.
  select count(*) into v_ordem_dup from (
    select db.documento_id, db.ordem
      from public.tmpl_documento_bloco db
      join public.tmpl_documento d on d.id = db.documento_id
     where d.nome in ('Parceria Rural', 'Composse Rural Pro Indiviso')
     group by db.documento_id, db.ordem
    having count(*) > 1
  ) t;
  if v_ordem_dup > 0 then
    raise exception '% ordem(ns) duplicada(s) nos instrumentos agrários.', v_ordem_dup;
  end if;

  -- A colisão de nome não voltou (rural x fora do rural).
  select count(*) into v_colisao
    from public.tmpl_bloco r
    join public.tmpl_bloco o on o.nome = r.nome
   where r.categoria in ('parceria-rural','composse-rural')
     and o.categoria not in ('parceria-rural','composse-rural');
  if v_colisao > 0 then
    raise exception '% nome(s) de bloco rural colidindo com bloco de fora do rural.', v_colisao;
  end if;

  -- Nenhuma aspa reta de CITAÇÃO sobrou nos blocos rurais: a casa usa “…” (46
  -- ocorrências nos cinco assinados, aspa reta nenhuma).
  --
  -- A aspa reta é legítima dentro da sintaxe do motor — `sep="; "`, `fim=" e "`,
  -- `sep="\n\n"`. A primeira versão desta guarda tentou separar as duas coisas
  -- procurando aspa ao lado de letra, e o `n"` de `sep="\n\n"` casava: ela
  -- apontava bloco certo como errado e o número virou ruído. Tirar as tags
  -- `{{…}}` primeiro resolve sem heurística — o que sobra é citação.
  select count(*) into v_reto
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
   where b.categoria in ('parceria-rural','composse-rural')
     and regexp_replace(v.conteudo, '\{\{[^}]*\}\}', '', 'g') like '%"%';
  if v_reto > 0 then
    raise exception '% bloco(s) rural(is) com aspa reta de citação.', v_reto;
  end if;

  -- Nenhum atributo de coleção com salto de linha CRU: o motor espera a escape
  -- `\n` e desfaz o escape em `desescapar` (render.ts). Newline de verdade dentro
  -- de sep/fim quebra a tag da coleção, e o bloco sai como seção não resolvida.
  -- Foi o defeito que eu introduzi na primeira versão desta migration.
  select count(*) into v_atributo
    from public.tmpl_bloco b
    join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
   where b.categoria in ('parceria-rural','composse-rural')
     -- Parênteses: `~` tem precedência MAIOR que `||`, e sem eles o Postgres lê
     -- `(conteudo ~ regex) || chr(10)` — booleano concatenado com texto.
     and v.conteudo ~ ('\{\{#[^}]*(sep|fim)="[^"]*' || chr(10));
  if v_atributo > 0 then
    raise exception '% bloco(s) com salto de linha cru dentro de sep/fim.', v_atributo;
  end if;

  raise notice 'Composse transcrito, parceria completa, alíneas com letra.';
end $$;
