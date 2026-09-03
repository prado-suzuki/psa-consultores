-- Catálogo rural: TRANSCRIÇÃO do texto assinado (versão 2 dos blocos)
--
-- Migration nova: a `20260901190315` (catálogo) e a `20260901230122` (nomes e
-- pecuária) precedem esta, e catálogo é dado gravado — correção entra por
-- arquivo próprio. Os nomes usados aqui são os DEPOIS da renomeação.
--
-- ── POR QUE ─────────────────────────────────────────────────────────────────
--
-- O catálogo nasceu RESUMIDO. Medido: cláusula societária média = 629 caracteres
-- e 5,7 placeholders; a rural que eu escrevi = 281 e 1,0. A comparação com os
-- instrumentos assinados mostrou o que isso significa na prática — a alínea da
-- Cláusula Primeira tinha 190 caracteres onde o assinado tem ~450, sem Livro,
-- Folha, cartório, CCIR nem "de propriedade de".
--
-- ── DE ONDE VEM O TEXTO ─────────────────────────────────────────────────────
--
-- Dos instrumentos ASSINADOS pela OSG:
--
--   · MMS — parceria (7 págs. de scan) e composse (8/8), mais os dois Anexos;
--   · Bela Vista — parceria, composse e Anexo, em .docx;
--   · Mattei — parceria e composse, em .docx;
--   · o contrato-modelo `V1_Contrato Modelo Parceria Benfeitorias não
--     indenizaveis.docx`, que é o template com as lacunas da banca.
--
-- Os quatro instrumentos de parceria são o MESMO template, palavra por palavra
-- nas cláusulas legíveis — e é por isso que as Cláusulas Décima Primeira a
-- Décima Quarta, cuja folha ("Página 6 de 8") NÃO está no scan do MMS, entram
-- aqui com texto atestado e não com resumo: elas estão inteiras no Bela Vista e
-- no modelo. A prova de que é o mesmo texto: o §3 da Décima Quarta termina em
-- "…mantendo-se essa condição mesmo no caso de alienação do imóvel", que é
-- exatamente o fragmento que sobrou no topo da página seguinte do MMS.
--
-- ── VERSÃO 2, E NÃO UPDATE ──────────────────────────────────────────────────
--
-- Cada bloco alterado ganha uma linha nova em `tmpl_bloco_versao`, e a anterior
-- perde o `atual`. O histórico precisa poder dizer que o catálogo nasceu
-- resumido e foi transcrito; `update` no conteúdo apagaria isso.
--
-- ── O QUE ESTA MIGRATION CORRIGE DE ERRADO (não só de curto) ────────────────
--
-- 1. Citação legal do Considerando IV do composse: eu havia escrito "artigo 13
--    do Decreto 9.580/2.018". O assinado cita a Seção VII, artigos 50 ao 64, e
--    afasta expressamente o parágrafo primeiro do art. 14 da Lei 4.504/1.964.
-- 2. O §Único da Cláusula Décima da parceria tinha a ressalva "salvo se as
--    partes pactuarem em instrumento apartado condição diferente desta" —
--    invenção minha, e uma que abre exceção a uma renúncia de indenização.
--    Nenhum dos três instrumentos assinados a tem.
-- 3. O preâmbulo dos outorgados terminava em "— doravante denominados PARCEIROS
--    OUTORGADOS", que é padrão do COMPOSSE, não da parceria.
-- 4. A Cláusula Primeira do composse não mencionava pecuária; o assinado inclui
--    "cria, recria e engorda de bovinos, suínos, ovinos e aves".
-- 5. A administração do composse era parágrafo corrido; o assinado lista NOVE
--    alíneas de poderes (a–i). Sem elas o administrador sai sem poder nomeado —
--    e é o contrato que dá os poderes.
-- 6. Cinco parágrafos da parceria não existiam no catálogo: §5 da Quinta
--    (limpeza e beneficiamento), §3 da Nona (alienação não interrompe), §1 e §3
--    da Décima (manutenção das benfeitorias e função social) e o §Único da
--    Décima Primeira (responsabilidade por penalidades).
-- 7. O Anexo Único era TABELA de sete colunas. O assinado é prosa em alíneas — a
--    mesma frase da Cláusula Primeira, e no da parceria com a cauda de limites,
--    confrontações e Elementos do Perímetro.
--
-- ── O ÚNICO REUSO QUE A REGRA PERMITE ───────────────────────────────────────
--
-- Regra: dois blocos só viram um se texto E variáveis forem idênticos, caractere
-- a caractere. Redação diferente = dois blocos, e a montagem de modelos existe
-- para isso — reescrever a redação assinada para caber num bloco só não é
-- admissível.
--
-- Conferido bloco a bloco, o penhor, o foro, a cessão, a inscrição estadual e a
-- fiscalização têm redação DIFERENTE nos dois instrumentos e continuam
-- separados. Um par passa a regra: a alínea da Cláusula Primeira da parceria é
-- idêntica à alínea do Anexo Único do composse. Vira o bloco
-- `Alínea — Imóvel cedido`, usado pelos DOIS documentos. A do Anexo da parceria
-- é essa mesma frase MAIS a cauda do perímetro — e como a cauda está dentro da
-- mesma frase, não se separa em bloco: fica `Alínea — Imóvel cedido com limites
-- e perímetro`.
--
-- Idempotente: a versão nova só entra se o conteúdo diferir do atual, e as
-- inserções de bloco/documento usam `on conflict`.

-- ---------------------------------------------------------------------------
-- Guarda: ninguém pode depender destes blocos
-- ---------------------------------------------------------------------------
do $$
declare
  v_overrides integer;
  v_gerados   integer;
begin
  select count(*) into v_overrides
    from public.documento_override o
   where o.bloco_alvo_id in (
           select id from public.tmpl_bloco where categoria in ('parceria-rural','composse-rural'))
      or o.bloco_substituto_id in (
           select id from public.tmpl_bloco where categoria in ('parceria-rural','composse-rural'));
  if v_overrides > 0 then
    raise exception
      '% override(s) apontam para blocos do catálogo rural. Transcrever o texto mudaria o documento por baixo deles: revise antes.',
      v_overrides;
  end if;

  select count(*) into v_gerados
    from public.documento_gerado g
    join public.tmpl_documento d on d.id = g.documento_template_id
   where d.nome in ('Parceria Rural','Composse Rural Pro Indiviso');
  if v_gerados > 0 then
    raise exception
      '% documento(s) já gerado(s) a partir do catálogo rural. A versão 2 dos blocos mudaria a redação de peça existente: revise antes.',
      v_gerados;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Blocos NOVOS — os que não existiam no catálogo
-- ---------------------------------------------------------------------------
-- `Alínea — Imóvel cedido` aparece nas duas listas de documento (parceria e
-- composse): é o bloco compartilhado, e o `on conflict (nome)` garante que a
-- segunda passagem reaproveite o mesmo `tmpl_bloco` em vez de criar um gêmeo.
do $$
declare
  r        record;
  v_doc    uuid;
  v_bloco  uuid;
begin
  for r in
    select * from (values
  ('Parceria Rural', 'Alínea — Imóvel cedido', 'livre', null, 'imoveisDoAnexo', 55, '*{{ imovel.areaCedida }} ({{ imovel.areaCedidaExtenso }})* de um imóvel rural com área de {{ imovel.area }} ({{ imovel.areaExtenso }}), denominado *{{ imovel.denominacao }}*, *de propriedade de* {{ imovel.proprietario }}, *situado no* município de {{ imovel.municipio }}, Estado {{ imovel.ufComPreposicao }}, *com registro na matrícula de* n.º *{{ imovel.numero }}*{{#imovel.livro}}, no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}){{/imovel.livro}}{{#imovel.folha}}, Folhas/Ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }}){{/imovel.folha}}{{#imovel.cartorio}} do {{ imovel.cartorio }}{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}{{#imovel.ufCartorio}}, Estado {{ imovel.ufCartorioComPreposicao }}{{/imovel.ufCartorio}}{{/imovel.cartorio}}{{#imovel.ccir}}, *inscrito no cadastro de imóvel rural sob o n.º {{ imovel.ccir }}*{{/imovel.ccir}};'),
  ('Parceria Rural', 'Parágrafo — Limpeza e beneficiamento dos frutos', 'paragrafo', null, null, 185, null),
  ('Parceria Rural', 'Parágrafo — Alienação não interrompe a vigência', 'paragrafo', null, null, 265, null),
  ('Parceria Rural', 'Parágrafo — Manutenção das benfeitorias existentes', 'paragrafo', null, null, 285, null),
  ('Parceria Rural', 'Parágrafo — Função social da posse', 'paragrafo', null, null, 295, null),
  ('Parceria Rural', 'Parágrafo — Responsabilidade por penalidades', 'paragrafo', null, null, 315, null),
  ('Parceria Rural', 'Alínea — Imóvel cedido com limites e perímetro', 'livre', null, 'imoveisDoAnexo', 495, '*{{ imovel.areaCedida }} ({{ imovel.areaCedidaExtenso }})* de um imóvel rural com área de {{ imovel.area }} ({{ imovel.areaExtenso }}), denominado *{{ imovel.denominacao }}*, *de propriedade de* {{ imovel.proprietario }}, *situado no* município de {{ imovel.municipio }}, Estado {{ imovel.ufComPreposicao }}, *com registro na matrícula de* n.º *{{ imovel.numero }}*{{#imovel.livro}}, no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}){{/imovel.livro}}{{#imovel.folha}}, Folhas/Ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }}){{/imovel.folha}}{{#imovel.cartorio}} do {{ imovel.cartorio }}{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}{{#imovel.ufCartorio}}, Estado {{ imovel.ufCartorioComPreposicao }}{{/imovel.ufCartorio}}{{/imovel.cartorio}}{{#imovel.ccir}}, *inscrito no cadastro de imóvel rural sob o n.º {{ imovel.ccir }}*{{/imovel.ccir}}{{#imovel.confrontacoes}}, com os seguintes limites e confrontações: {{ imovel.confrontacoes }}{{/imovel.confrontacoes}}{{#imovel.georefPerimetro}}. Elementos do Perímetro: {{#vertices sep="; " fim="; "}}{{ vertice.codVertice }}-{{ vertice.codVante }}, {{ vertice.distancia }} metros {{ vertice.azimute }}{{#vertice.confrontacoes}} {{ vertice.confrontacoes }}{{/vertice.confrontacoes}}{{/vertices}}constante na cláusula primeira{{/imovel.georefPerimetro}};'),
  ('Composse Rural Pro Indiviso', 'Alínea — Imóvel cedido', 'livre', null, 'imoveisDoAnexo', 445, '*{{ imovel.areaCedida }} ({{ imovel.areaCedidaExtenso }})* de um imóvel rural com área de {{ imovel.area }} ({{ imovel.areaExtenso }}), denominado *{{ imovel.denominacao }}*, *de propriedade de* {{ imovel.proprietario }}, *situado no* município de {{ imovel.municipio }}, Estado {{ imovel.ufComPreposicao }}, *com registro na matrícula de* n.º *{{ imovel.numero }}*{{#imovel.livro}}, no Livro {{ imovel.livroNumeral }} ({{ imovel.livroExtenso }}){{/imovel.livro}}{{#imovel.folha}}, Folhas/Ficha {{ imovel.folhaNumeral }} ({{ imovel.folhaExtenso }}){{/imovel.folha}}{{#imovel.cartorio}} do {{ imovel.cartorio }}{{#imovel.cartorioComarca}} da comarca de {{ imovel.cartorioComarca }}{{/imovel.cartorioComarca}}{{#imovel.ufCartorio}}, Estado {{ imovel.ufCartorioComPreposicao }}{{/imovel.ufCartorio}}{{/imovel.cartorio}}{{#imovel.ccir}}, *inscrito no cadastro de imóvel rural sob o n.º {{ imovel.ccir }}*{{/imovel.ccir}};')
    ) as t(documento, nome, tipo, ancora, repete, ordem, conteudo)
  loop
    select id into v_doc from public.tmpl_documento where nome = r.documento;
    if v_doc is null then
      raise exception 'Documento "%" não encontrado: a 20260901190315 não foi aplicada.', r.documento;
    end if;

    -- `tmpl_bloco` não tem UNIQUE em `nome` (a chave é o `id`), então o
    -- reaproveitamento é explícito: procura, e só cria se não achar. É também o
    -- que faz o bloco COMPARTILHADO servir aos dois documentos — na segunda
    -- passagem ele já existe e só ganha a linha de `tmpl_documento_bloco`.
    select id into v_bloco from public.tmpl_bloco where nome = r.nome;
    if v_bloco is null then
      insert into public.tmpl_bloco (nome, categoria, tipo, ancora, repete_colecao, ativo)
      values (
        r.nome,
        case when r.documento = 'Parceria Rural' then 'parceria-rural' else 'composse-rural' end,
        r.tipo, r.ancora, r.repete, true
      )
      returning id into v_bloco;
    else
      update public.tmpl_bloco
         set tipo = r.tipo, ancora = coalesce(r.ancora, ancora),
             repete_colecao = r.repete, ativo = true
       where id = v_bloco;
    end if;

    if r.conteudo is not null then
      insert into public.tmpl_bloco_versao (bloco_id, numero_versao, conteudo, atual, changelog)
      select v_bloco, 1, r.conteudo, true,
             'Texto transcrito do instrumento assinado (bloco novo).'
       where not exists (select 1 from public.tmpl_bloco_versao where bloco_id = v_bloco);
    end if;

    insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
    values (v_doc, v_bloco, r.ordem, true)
    on conflict (documento_id, bloco_id) do update set ordem = excluded.ordem;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 1b. A âncora que faltava
-- ---------------------------------------------------------------------------
-- A Cláusula Quarta cita a Sétima ("incluindo o disposto na Cláusula Sétima"), e
-- essa referência sai de `{{ refs.caso_fortuito }}` — a numeração citada no texto
-- vem da MESMA passada que numera o documento, nunca de número escrito à mão.
-- O bloco da Cláusula Sétima nasceu sem âncora, e sem ela o placeholder não
-- resolve e a geração inteira lança.
update public.tmpl_bloco
   set ancora = 'caso_fortuito'
 where nome = 'Cláusula — Caso fortuito e força maior' and ancora is null;

-- ---------------------------------------------------------------------------
-- 2. A TRANSCRIÇÃO: versão nova de cada bloco cujo texto muda
-- ---------------------------------------------------------------------------
-- A versão só entra se o conteúdo DIFERIR do atual — assim reaplicar a migration
-- não empilha versões idênticas, e o histórico continua legível.
do $$
declare
  r         record;
  v_bloco   uuid;
  v_atual   text;
  v_proxima integer;
  v_tocados integer := 0;
begin
  for r in
    select * from (values
  ('Preâmbulo — Parceira outorgante',
   '*~PARCEIRA OUTORGANTE~*: {{ instrumento.outorganteQualificacao }}.'),
  ('Preâmbulo — Parceiros outorgados',
   '*~PARCEIROS OUTORGADOS~*: {{#exploradores sep=";\n\n" fim=" e\n\n"}}{{ explorador.qualificacao }}{{/exploradores}}.'),
  ('Cláusula — Áreas cedidas em parceria',
   'As partes, por este instrumento contratual, constituem parceria rural para exploração {{ instrumento.natureza }} em áreas de terras rurais, nos termos do art. 96 da Lei 4.504/64, cedendo a *PARCEIRA OUTORGANTE* em favor dos *PARCEIROS OUTORGADOS* os imóveis de sua posse e/ou propriedade, descritos nas alíneas "{{ instrumento.primeiraAlinea }}" à "{{ instrumento.ultimaAlinea }}" a seguir descritas, com os seus limites e confrontações dispostos no *ANEXO ÚNICO* deste instrumento:'),
  ('Cláusula — Vigência da parceria',
   'A presente parceria rural para fins de exploração {{ instrumento.natureza }} tem vigência a contar da data da assinatura deste instrumento e findará em *{{ instrumento.dataEncerramentoExtenso }}*.'),
  ('Parágrafo — Devolução ao término',
   'Não havendo renovação da presente parceria nos termos da {{ refs.preferencia }}, ao término da vigência deste instrumento, os *PARCEIROS OUTORGADOS* deverão devolver à *PARCEIRA OUTORGANTE*, independentemente de notificação ou interpelação judicial ou extrajudicial, os imóveis rurais objetos desta parceria.'),
  ('Parágrafo — Prazo indeterminado após o vencimento',
   '{{#instrumento.prorrogavel}}Ultrapassando o contrato a data prevista no _caput_ desta cláusula, o contrato passará a ser por tempo indeterminado, podendo a *PARCEIRA OUTORGANTE* rescindi-lo a qualquer tempo. Neste caso, deverá notificar por escrito os *PARCEIROS OUTORGADOS*, os quais deverão sair dos imóveis objetos desta parceria dentro do prazo de 30 (trinta) dias a contar do recebimento da referida notificação se inexistir produto pendente de colheita; ou, se pendente a colheita, 30 (trinta) dias após a sua realização.{{/instrumento.prorrogavel}}'),
  ('Cláusula — Atividades permitidas',
   'Os *PARCEIROS OUTORGADOS* poderão explorar nas áreas objeto deste instrumento de parceria lavouras de {{ instrumento.culturas }} ou outra cultura legalmente permitida que pretender explorar, ficando esclarecido que o mesmo poderá fazer uso da terra quantas vezes desejar, inclusive para exploração agrícola de safrinha, sem qualquer custo ou despesa adicional.{{#instrumento.pecuaria}} Em se tratando da exploração pecuária ou de animais, poderão fazer uso das terras para cria, recria e engorda de bovinos, suínos, ovinos, equinos e aves; ou outros animais, da maneira que lhes convier, obedecendo os limites deste contrato.{{/instrumento.pecuaria}}'),
  ('Cláusula — Despesas dos outorgados',
   'Competirão aos *PARCEIROS OUTORGADOS* suportarem todas as despesas de preparo, plantio, cultivo, colheita e extração, limpeza e beneficiamento dos produtos produzidos nas áreas objetos da presente parceria, incluindo, mas não se limitando, aos gastos com mão de obra, insumos, defensivos, adubos, corretivos de solo, máquinas, equipamentos, combustíveis, bem como, as despesas de aquisição de gado, vermífugos, ração, vacina, sais minerais e tudo mais que se fizer necessário para a subsistência, manutenção e desenvolvimento dos animais; ressalvadas as despesas expressamente assumidas pela *PARCEIRA OUTORGANTE* neste instrumento, incluindo o disposto na {{ refs.caso_fortuito }}, bem como as despesas que não estejam relacionadas à atividade rural e sim ao imóvel, a exemplo do pagamento de ITR, CAR, Georreferenciamento, CCIR, entre outros.'),
  ('Cláusula — Partilha dos frutos',
   'Resta desde já acordado entre as partes que caberá à *PARCEIRA OUTORGANTE* *{{ instrumento.percentualOutorgante }} ({{ instrumento.percentualOutorganteExtenso }})* de todos os frutos que forem produzidos nas áreas objeto da presente parceria e aos *PARCEIROS OUTORGADOS* os outros *{{ instrumento.percentualExplorador }} ({{ instrumento.percentualExploradorExtenso }})*, em conformidade com a previsão do artigo 96, VI, a, da Lei 4.504/64. Ademais, obrigam-se os *PARCEIROS OUTORGADOS* a armazenarem os frutos em depósito a ser indicado previamente pela *PARCEIRA OUTORGANTE*, suportando os custos decorrentes do transporte até o efetivo depósito.'),
  ('Parágrafo — Frutos da pecuária na recria e engorda',
   'Considerar-se-á como "frutos" da pecuária, no caso de recria e engorda, o ganho de peso (kg) dos animais adquiridos pelos *PARCEIROS OUTORGADOS* para exploração de "pecuária de engorda" nas áreas objeto desta parceria. O ganho de peso descrito anteriormente será auferido pela diferença entre o peso inicial de aquisição de cada animal e o peso identificado na alienação do mesmo, sendo que eventuais animais já existentes nas áreas que são objeto desta parceria deverão ser pesados em até 30 (trinta) dias contados da assinatura deste instrumento, o qual será igualmente reconhecido como "peso inicial". Identificado o ganho de peso, será assegurada à *PARCEIRA OUTORGANTE* a parcela de frutos descrita no _caput_, a qual lhe será entregue através da cessão de animais dos *PARCEIROS OUTORGADOS* com peso proporcional aos frutos.'),
  ('Parágrafo — Frutos da pecuária na cria',
   'Considerar-se-á como "frutos" da pecuária, no caso de cria, os bezerros nascidos do rebanho de fêmea de todos os animais decorrentes da presente parceria, sendo que à *PARCEIRA OUTORGANTE* será assegurada a parcela dos frutos descrita no _caput_, a qual lhe será entregue através da cessão de animais dos *PARCEIROS OUTORGADOS* em quantidade proporcional aos frutos.'),
  ('Parágrafo — Frutos da pecuária no ciclo completo',
   'Considerar-se-á como "frutos" da pecuária, no caso do ciclo completo, o peso (kg) adquiridos pelos animais nos imóveis objeto desta parceria a cada 12 (doze) meses contados a partir da assinatura deste contrato, utilizando-se como parâmetro as notas fiscais de venda e/ou eventuais controles internos dos *PARCEIROS OUTORGADOS*.'),
  ('Parágrafo — Frutos por exercício',
   'Os frutos da pecuária poderão ser calculados e distribuídos por exercício fiscal ou por período inferior a este, desde que as partes assim decidam em conjunto.'),
  ('Parágrafo — Limpeza e beneficiamento dos frutos',
   'Os *PARCEIROS OUTORGADOS* se responsabilizam pela limpeza, beneficiamento e demais operações necessárias a padronização dos frutos a serem pagos à *PARCEIRA OUTORGANTE*, como também os custos relacionados ao transporte destes produtos até o depósito, armazém, cerealista ou compradora indicada pela *PARCEIRA OUTORGANTE*. Ademais, não sendo possível o rateio dos frutos, eventual diferença será compensada à *PARCEIRA OUTORGANTE* em uma das próximas safras, e, se apurada essa diferença na última safra, a diferença será paga em pecúnia pelos *PARCEIROS OUTORGADOS* à *PARCEIRA OUTORGANTE* ou compensada em outros frutos, a critério da *PARCEIRA OUTORGANTE*.'),
  ('Parágrafo — Mora na entrega dos frutos',
   'Havendo inadimplemento quanto à entrega dos frutos da parceria à *PARCEIRA OUTORGANTE*, independentemente de qualquer notificação judicial ou extrajudicial, estarão os *PARCEIROS OUTORGADOS* constituídos em mora, incidindo sobre o valor vencido a atualização monetária pelo INPC, além de multa moratória de 10% (dez por cento) e juros moratórios de 1% (um por cento) ao mês, sendo considerados como "valor", para fins da parceria agrícola e pecuária, os preços apurados pelo {{ instrumento.institutoPreco }} na praça do foro deste contrato.'),
  ('Cláusula — Disposição dos frutos antes da partilha',
   'Os parceiros poderão dispor dos frutos ou produtos havidos antes de efetuada a partilha, podendo cada um deles realizar as respectivas comercializações independente de prévia ou posterior comunicação à outra parte, observado que cada um se responsabilizará por si só em eventuais negócios realizados perante terceiros se os frutos pactuados forem superiores ao resultado da parceria que lhe couber.'),
  ('Cláusula — Caso fortuito e força maior',
   'Havendo caso fortuito ou força maior que venha a destruir parcialmente a produção, os frutos colhidos ou aqueles pendentes, a perda será suportada pelas partes ora contratantes, consoante dispõe o artigo 96, §1°, inciso I da Lei 4.504/64.'),
  ('Cláusula — Obrigações da mão de obra rural',
   'As responsabilidades decorrentes da contratação de trabalhadores rurais ou diaristas utilizados nas propriedades rurais objeto deste pacto, assim como quaisquer outras obrigações trabalhistas sociais, os passivos tributários, fiscais, ambientais, previdenciários e outros, serão suportados exclusivamente pelos *PARCEIROS OUTORGADOS*.'),
  ('Cláusula — Preferência na renovação',
   'Nos termos do inciso IV do artigo 95 c/c o inciso VII do artigo 96, ambos da Lei 4.504/64, em igualdade de condições com terceiros, os *PARCEIROS OUTORGADOS* terão preferência à renovação da parceria rural, devendo a *PARCEIRA OUTORGANTE* até 06 (seis) meses antes do vencimento do prazo contratual ora estabelecido notificá-los dando-lhes conhecimento das eventuais propostas recebidas, inclusive instruindo a respectiva notificação com cópia autêntica da proposta.'),
  ('Parágrafo — Retomada para exploração direta',
   'Conforme previsto no artigo 95, inciso V, da Lei 4.504/1.964 c/c art. 96, VII, da mesma legislação, os direitos assegurados neste artigo não prevalecerão se, até o prazo de 06 (seis) meses antes do vencimento do contrato, a *PARCEIRA OUTORGANTE* declarar através de notificação escrita aos *PARCEIROS OUTORGADOS* que desejam retomar os imóveis para explorá-los diretamente.'),
  ('Parágrafo — Preferência na venda',
   'No caso de pretensão de alienação das áreas ou parte das áreas objeto deste instrumento, a *PARCEIRA OUTORGANTE* se obriga a dar conhecimento da venda aos *PARCEIROS OUTORGADOS* a fim de que estes possam, no prazo de 30 (trinta) dias, exercerem o direito de preferência.'),
  ('Parágrafo — Alienação não interrompe a vigência',
   'A alienação ou ainda a imposição de ônus reais sobre os imóveis objetos de exploração da presente parceria não interromperá a vigência deste instrumento.'),
  ('Cláusula — Devolução dos bens',
   'Os bens objeto da presente parceria serão devolvidos conforme entregues aos *PARCEIROS OUTORGADOS*, sem quaisquer modificações, salvo as deteriorações decorrentes do seu uso normal.'),
  ('Parágrafo — Manutenção das benfeitorias existentes',
   'Competirão aos *PARCEIROS OUTORGADOS* suportar as despesas decorrentes da manutenção das benfeitorias existentes nesta data edificadas sobre os imóveis até a efetiva devolução dos imóveis à *PARCEIRA OUTORGANTE*.'),
  ('Parágrafo — Benfeitorias não indenizáveis',
   'Todas as benfeitorias realizadas pelos *PARCEIROS OUTORGADOS*, sejam elas úteis ou voluptuárias, serão incorporadas aos imóveis, *~não~* incidindo sobre elas qualquer tipo de indenização.'),
  ('Parágrafo — Função social da posse',
   'Os *PARCEIROS OUTORGADOS* se obrigam a cumprir, na posse da terra a sua função social e o bem-estar coletivo de acordo com os direitos e deveres estabelecidos em lei e nos limites estabelecidos no presente instrumento.'),
  ('Cláusula — Manejo e conformidade',
   'Os *PARCEIROS OUTORGADOS* se comprometem a conduzir e fazer o manejo do solo e conservação dentro das recomendações agronômicas, bem como, explorar as atividades pecuárias dentro das recomendações veterinárias e zootécnicas, atendendo as leis ambientais e proibindo o uso de defensivos não autorizados pelo Ministério da Agricultura. Comprometem-se também a respeitar, fiscalizar e atender as leis, normas e diretrizes estabelecidas no país, para a preservação de reservas florestais, mananciais, animais, meio ambiente, trabalho escravo, utilização/produção de trabalho ilegal, invasões de terra, incêndios por queimada, dentre outros.'),
  ('Parágrafo — Responsabilidade por penalidades',
   'Qualquer penalidade ou ação civil, criminal, trabalhista, tributária e/ou qualquer tipo de indenização pleiteada, seja por ente público ou particular, direcionada aos *PARCEIROS OUTORGADOS*, por motivo exclusivo de erro, falta, desobediência, negligência ou imprudência deste, serão de sua inteira responsabilidade; devendo aqueles ressarcirem à *PARCEIRA OUTORGANTE* os eventuais prejuízos que ela for obrigada a suportar por força de atos culposos ou dolosos realizados pelos *PARCEIROS OUTORGADOS*.'),
  ('Cláusula — Rescisão por inadimplemento',
   'Havendo inadimplemento de quaisquer cláusulas deste contrato, gerará à parte contrária a faculdade de rescindi-lo mediante simples notificação à outra parte, assegurando, em todos os casos, que o produto ainda não colhido seja cultivado até o fim da respectiva safra, quando então os bens imóveis objetos da parceria deverão ser devolvidos à *PARCEIRA OUTORGANTE* e os frutos da respectiva safra serão partilhados.'),
  ('Cláusula — Rescisão por mútuo acordo',
   'O presente instrumento poderá ser rescindido, a qualquer tempo, por mútuo acordo entre as partes, desde que respeitado o término da safra em curso.'),
  ('Cláusula — Anuência ao penhor',
   '{{#instrumento.penhor}}A *PARCEIRA OUTORGANTE* neste ato autoriza expressamente os *PARCEIROS OUTORGADOS* a oferecerem em garantia de financiamentos a eles concedidos por instituições bancárias e financeiras, durante todo o lapso temporal da vigência deste instrumento contratual, bem como pela safra imediatamente seguinte, a totalidade da produção a ser auferida por conta de eventuais empreendimentos financiados nos imóveis objeto de parceria, bem como os materiais agrários, benfeitorias e semoventes de sua propriedade ali localizados.{{/instrumento.penhor}}'),
  ('Parágrafo — Penhor por período de vigência',
   '{{#instrumento.penhor}}A *PARCEIRA OUTORGANTE* declara ainda ciência que o penhor dos produtos dados em garantia em cada safra, valerá por todo o período de vigência desta parceria, de conformidade com o artigo 1.439 do Código Civil (Lei 10.406/2.002).{{/instrumento.penhor}}'),
  ('Parágrafo — Destinação prioritária dos frutos',
   '{{#instrumento.penhor}}A *PARCEIRA OUTORGANTE* autoriza ainda os *PARCEIROS OUTORGADOS* a destinar, prioritariamente, sob renúncia plena de todos os direitos, os frutos oriundos da exploração desta parceria, para liquidação dos débitos contraídos pelos *PARCEIROS OUTORGADOS* e que tenham relação direta com os imóveis, as culturas e/ou os animais explorados nas áreas cedidas em parceria.{{/instrumento.penhor}}'),
  ('Parágrafo — Fiscalização pelas instituições',
   '{{#instrumento.penhor}}A *PARCEIRA OUTORGANTE* declara ciente do direito que assiste as instituições privadas, incluindo bancárias, comerciais, industriais e financeiras, de fiscalizar os imóveis ora cedidos em parceria em decorrência de financiamentos concedidos aos *PARCEIROS OUTORGADOS* para exploração e/ou edificação de benfeitorias realizadas nestes bens, e, por conseguinte, os bens vinculados localizados nas propriedades; concordando que ditos bens ali permaneçam até o final da liquidação das dívidas pertinentes, mantendo-se essa condição mesmo no caso de alienação do imóvel.{{/instrumento.penhor}}'),
  ('Cláusula — Irrevogabilidade',
   'Este instrumento constitui acordo irrevogável e irretratável entre as partes, obrigando seus respectivos sucessores, em todos os seus termos, sendo que nenhuma alteração terá qualquer efeito, a menos que feita por escrito e assinada por cada um dos parceiros.'),
  ('Cláusula — Vedação de cessão',
   'Resta, desde já, vedada aos *PARCEIROS OUTORGADOS* a cessão do presente contrato e modificação da destinação dele, salvo mediante prévio e expresso consentimento da outra parte.'),
  ('Cláusula — Ônus alheios à exploração',
   'Os *PARCEIROS OUTORGADOS* se eximem, desde já, de quaisquer ônus que venham a recair sobre os imóveis e bens objetos do presente contrato de parceria e ora cedidos pela *PARCEIRA OUTORGANTE*, por força de dívidas assumidas exclusivamente por ela e/ou que não decorram da exploração das atividades rurais objeto da presente parceria, salvo as obrigações contraídas pelos próprios *PARCEIROS OUTORGADOS*, aquelas diretas ou indiretamente assumidas por força deste instrumento ou em decorrência dele.'),
  ('Cláusula — Regência pelo Estatuto da Terra',
   'A relação estabelecida pelo presente contrato em hipótese alguma se regerá pelas normas insculpidas na Consolidação das Leis do Trabalho, mas sim pelas constantes no Estatuto da Terra (Lei n.º 4.504/1.964) e no Decreto 59.566/1.966, uma vez que os *PARCEIROS OUTORGADOS* não se acham sob o vínculo de subordinação em relação à *PARCEIRA OUTORGANTE*, podendo estipular seus próprios horários de trabalho, assim como dos seus empregados e prepostos.'),
  ('Cláusula — Abertura de inscrição estadual',
   'A relação estabelecida pelo presente contrato autoriza a abertura das respectivas inscrições estaduais pelas partes.'),
  ('Cláusula — Foro de eleição',
   'Para dirimir quaisquer controvérsias oriundas deste instrumento, as partes elegem o foro da comarca de {{ instrumento.foroComarca }}, Estado {{ instrumento.foroUfComPreposicao }}, renunciando expressamente a qualquer outro, por mais privilegiado que seja.'),
  ('Fecho e assinaturas (parceria)',
   'Por estarem, assim justos e contratados, firmam o presente instrumento, em {{ instrumento.numeroVias }} ({{ instrumento.numeroViasExtenso }}) vias de igual teor e forma, juntamente com 02 (duas) testemunhas.

{{ instrumento.foroComarca }}/{{ instrumento.foroUf }}, {{ instrumento.dataAssinaturaExtenso }}.

{{#signatarios sep="\n\n" fim="\n\n"}}_______________________________________
*{{ signatario.nomeMaiusculo }}*
{{ signatario.papel }}{{#signatario.qualificacao}} {{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}

*Testemunhas:*

_______________________________________
*Nome:*
*RG:*
*CPF/MF:*

_______________________________________
*Nome:*
*RG:*
*CPF/MF:*'),
  ('Anexo Único (parceria)',
   '*~ANEXO ÚNICO~*

Descrição das áreas objeto do *INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO {{ instrumento.natureza }}*, pactuado entre *{{ instrumento.proprietarioComum }}* e {{#exploradores sep=", " fim=" e "}}*{{ explorador.nome }}*{{/exploradores}} em {{ instrumento.dataAssinaturaExtenso }}, sendo:'),
  ('Considerando IV — Tributação na pessoa física',
   '*CONSIDERANDO* que os *COMPOSSUIDORES RURAIS* buscam oportunidades para investimentos e exploração conjunta de negócios agrícolas, e para tanto, resolvem se organizar estabelecendo uma composse rural _pro indiviso_, afastando o direito expresso no parágrafo primeiro do art. 14 da Lei 4.504/1.964, elegendo a tributação na pessoa física, na forma entrevista na Seção VII, artigos 50 ao artigo 64 do Decreto 9.580/2.018;'),
  ('Cláusula — Constituição da composse',
   'Fica constituída uma *COMPOSSE RURAL* em que são *COMPOSSUIDORES RURAIS* as partes qualificadas no preâmbulo, com o objetivo de explorarem, sob o regime disposto neste instrumento, incluindo, mas não se limitando, ao cultivo de {{ instrumento.culturas }} ou outra cultura legalmente permitida que pretenderem explorar{{#instrumento.pecuaria}}, bem como, cria, recria e engorda de bovinos, suínos, ovinos e aves; ou outros animais de qualquer espécie, da maneira que lhe convier{{/instrumento.pecuaria}}, nas áreas rurais descritos no anexo único deste instrumento.'),
  ('Cláusula — Administração e poderes',
   'A *COMPOSSE* será administrada {{#instrumento.nomeadoUnico}}*~isoladamente~* por seu *COMPOSSUIDOR* {{/instrumento.nomeadoUnico}}{{#instrumento.nomeadosEmConjunto}}*~em conjunto~* por seus *COMPOSSUIDORES* {{/instrumento.nomeadosEmConjunto}}{{#administradoresNomeados sep=", " fim=" e "}}*{{ adminNomeado.nomeMaiusculo }}*{{/administradoresNomeados}}, que representará a composse ativa e passivamente, em juízo ou fora dela, perante qualquer repartição pública e/ou empresa privada, inclusive, mas não se limitando apenas a estes, face a Caixa Econômica Federal, Banco do Brasil S/A, instituições financeiras de qualquer natureza, Previdência Social, Receita Federal do Brasil, Procuradoria da Fazenda Nacional, MAPA - Ministério da Agricultura, Pecuária e Abastecimento, Secretarias de Meio Ambiente Estaduais ou Municipais, IBAMA, INCRA, Secretarias de Fazenda Estaduais, sindicatos rurais, CONAB, dentre outras, observando sempre os eventuais limites e condições impostas pelo presente instrumento, podendo para tanto:
    *a)* Celebrar instrumentos e negócios jurídicos, dentre os quais operações financeiras, empréstimos, financiamentos, contratos de compra e venda, instrumentos de constituição de garantias, dar em garantia bens da *COMPOSSE* ou por ela produzidos ou cultivados, emitir cédulas de produto rural, dentre outras;
    *b)* Comprar, adquirir, emprestar e permutar bens móveis de toda e qualquer natureza, incluindo fertilizantes, defensivos, sementes, mudas, insumos, peças, implementos, equipamentos, máquinas, suplementos e etc.;
    *c)* Assinar, comprometer e endossar quaisquer títulos, cédulas de crédito, notas promissórias, letras de câmbio e certificados de custódia;
    *d)* Abrir, encerrar, movimentar contas bancárias, assinar cheques, recibos e depósitos bancários;
    *e)* Firmar correspondência, guias para recolhimento de impostos e contribuições, requerimentos e petições dirigidas a Repartições e Autarquias Públicas Federais, Estaduais e Municipais, bancos e instituições, em expedientes para recolhimento de impostos, taxas e contribuições sociais ou procedimentos administrativos de qualquer natureza;
    *f)* Admitir e demitir funcionários, vendedores, representantes e agentes comerciais;
    *g)* Receber citação ou intimação referente a processos, procedimentos e autuações, administrativos ou judiciais;
    *h)* Fornecer fianças, avais e outras garantias, inclusive entre si, exceto para terceiros;
    *i)* Outorgar procurações (inclusive _ad judicia_) para defesa de interesses da *COMPOSSE*.'),
  ('Fecho e assinaturas (composse)',
   'E assim, por estarem justos e contratados, os *COMPOSSUIDORES RURAIS* assinam este *INSTRUMENTO* em {{ instrumento.numeroVias }} ({{ instrumento.numeroViasExtenso }}) vias de igual teor e forma, perante as 02 (duas) testemunhas abaixo.

{{ instrumento.foroComarca }}/{{ instrumento.foroUf }}, {{ instrumento.dataAssinaturaExtenso }}.

{{#signatarios sep="\n\n" fim="\n\n"}}_______________________________________
*{{ signatario.nomeMaiusculo }}*
{{ signatario.papel }}{{#signatario.qualificacao}} {{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}

*Testemunhas:*

_______________________________________
*Nome:*
*CPF/MF:*
*RG:*

_______________________________________
*Nome:*
*CPF/MF:*
*RG:*'),
  ('Anexo Único (composse)',
   '*~ANEXO ÚNICO~*

Descrição das áreas objeto do *Instrumento Particular de Constituição de Composse Rural _Pro Indiviso_* firmado por {{#compossuidores sep=", " fim=" e "}}*{{ compossuidor.nome }}*{{/compossuidores}} em {{ instrumento.dataAssinaturaExtenso }}, sendo:')
    ) as t(nome, conteudo)
  loop
    select id into v_bloco from public.tmpl_bloco where nome = r.nome;
    if v_bloco is null then
      raise exception 'Bloco "%" não encontrado. Confira se a 20260901230122 (renomeação) rodou antes desta.', r.nome;
    end if;

    select conteudo into v_atual
      from public.tmpl_bloco_versao where bloco_id = v_bloco and atual;

    if v_atual is not distinct from r.conteudo then
      continue;
    end if;

    select coalesce(max(numero_versao), 0) + 1 into v_proxima
      from public.tmpl_bloco_versao where bloco_id = v_bloco;

    update public.tmpl_bloco_versao set atual = false where bloco_id = v_bloco and atual;

    insert into public.tmpl_bloco_versao (bloco_id, numero_versao, conteudo, atual, changelog)
    values (v_bloco, v_proxima, r.conteudo, true,
            'Texto transcrito do instrumento assinado (antes era resumo).');

    v_tocados := v_tocados + 1;
  end loop;

  raise notice 'Transcrição: % bloco(s) ganharam versão nova.', v_tocados;
end $$;

-- ---------------------------------------------------------------------------
-- 3. As alíneas saem de dentro dos blocos que as embutiam
-- ---------------------------------------------------------------------------
-- A Cláusula Primeira da parceria passou a terminar em ":" e o Anexo do composse
-- perdeu a tabela: quem descreve cada imóvel agora é o bloco repetidor. Sem esta
-- limpeza a descrição sairia duas vezes.
--
-- Nada a apagar aqui além do conteúdo já substituído no passo 2 — o registro
-- fica para quem lê a migration entender por que os dois blocos encurtaram.

-- ---------------------------------------------------------------------------
-- 4. Verificação final
-- ---------------------------------------------------------------------------
do $$
declare
  v_sem_versao integer;
  v_resumidos  integer;
begin
  -- Bloco do documento sem versão atual: o motor lançaria na geração.
  select count(*) into v_sem_versao
    from public.tmpl_documento d
    join public.tmpl_documento_bloco db on db.documento_id = d.id
    join public.tmpl_bloco b on b.id = db.bloco_id
   where d.nome in ('Parceria Rural','Composse Rural Pro Indiviso')
     and not exists (select 1 from public.tmpl_bloco_versao v
                      where v.bloco_id = b.id and v.atual);
  if v_sem_versao > 0 then
    raise exception '% bloco(s) do catálogo rural sem versão atual.', v_sem_versao;
  end if;

  -- As cláusulas que sobraram com menos de 200 caracteres. Não é erro por si —
  -- "A relação estabelecida pelo presente contrato autoriza a abertura das
  -- respectivas inscrições estaduais pelas partes" tem 115 e está completa —,
  -- mas é o número que denunciou o catálogo resumido, então fica medido.
  select count(*) into v_resumidos
    from public.tmpl_documento d
    join public.tmpl_documento_bloco db on db.documento_id = d.id
    join public.tmpl_bloco b on b.id = db.bloco_id
    join public.tmpl_bloco_versao v on v.bloco_id = b.id and v.atual
   where d.nome in ('Parceria Rural','Composse Rural Pro Indiviso')
     and b.tipo = 'clausula'
     and length(v.conteudo) < 200;
  raise notice 'Cláusulas com menos de 200 caracteres depois da transcrição: %.', v_resumidos;
end $$;
