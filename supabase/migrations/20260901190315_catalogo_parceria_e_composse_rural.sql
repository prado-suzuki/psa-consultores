-- Catálogo dos dois contratos rurais: Parceria e Composse Pro Indiviso (AGR-02)
--
-- Semeia `tmpl_documento`, `tmpl_bloco`, `tmpl_bloco_versao` e `tmpl_documento_bloco`
-- com o texto dos dois instrumentos, e amplia um CHECK de `tmpl_documento` (ver
-- "Pré-condição de schema", abaixo).
--
-- É DADO, não código: depois disto a Luana ajusta redação de cláusula na Biblioteca
-- de Modelos, sem deploy. Só um TIPO DE ENTIDADE novo exigiria código.
--
-- ── FONTE DA REDAÇÃO ─────────────────────────────────────────────────────────
--
-- Os templates oficiais da banca, no Drive:
--   · `VF_Contrato Modelo Parceria Benfeitorias não indenizaveis_Com cláusula do
--      Ciclo Completo.docx` (id 1g9vN7avGEBdOALJ9N7adjj8GjFnzFzVR)
--   · `VF_Contrato Modelo_Composse Rural.docx` (id 1OpoA2d2_uJNYGuAta6IhcBXAb0_vLi7H)
--   · `VF_Modelo Anexo Único_Composse.docx` (id 1dpbHBMTmZmuCrx7p2mN36Ubs5aB6RpcP)
--
-- Transcritos cláusula a cláusula em `docs/osg/contratos_exploracao/
-- 05-modelo-parceria-rural.md` e `06-modelo-composse-rural.md` (branch
-- `ale-3-levantamento-contratos-rurais`), conferidos contra dois contratos
-- ASSINADOS e um Termo Aditivo. Onde template e contrato assinado divergem, o
-- template manda — está anotado nos relatórios.
--
-- ── O QUE É FLAG E O QUE É TEXTO FIXO ────────────────────────────────────────
--
-- Só entra como condicional o que tem lado positivo E negativo comprovados em
-- contrato real. Por isso `benfeitorias_indenizaveis` NÃO existe: os dez modelos
-- do Drive e o contrato assinado transcrito são todos "benfeitorias NÃO
-- indenizáveis", e a indenização, quando há, é instrumento apartado. Virou texto
-- fixo no Parágrafo Segundo da Cláusula Décima.
--
-- ── A FAMÍLIA DA MODALIDADE DA PECUÁRIA ──────────────────────────────────────
--
-- Cria/recria-engorda/ciclo completo são três redações do MESMO parágrafo de
-- "frutos", e entram como FAMÍLIA de blocos com variante. O que elege a variante,
-- porém, é DADO do cadastro (`exploracao_rural.modalidade_pecuaria`, criada pela
-- migration 20260901144006) e não uma escolha na tela Gerar: o resolvedor de
-- variante lê o contexto, e a tela não tem — nem deve ter — seletor de variante.
-- Qual pecuária o cliente pratica é fato da operação, não do documento.
--
-- A ligação obedece ao mecanismo que a Biblioteca já usa: `familia_id` aponta para
-- a CABEÇA (o bloco que entra no documento e escreve `{{familia nome="…"}}`), e só
-- a cabeça vai para `tmpl_documento_bloco`. Ver o comentário no ponto da inserção.
--
-- ── PLACEHOLDERS ─────────────────────────────────────────────────────────────
--
-- Contrato de nomes com os mapeadores agrários (src/lib/templates/contextoRural.ts)
-- e com o vocabulário declarado em `vocabulario.ts` / `binding.ts`:
--   `instrumento.*`                 cabeçalho do instrumento (entidade `instrumento`)
--   `outorgante.*`                  pessoa — binding de papel, como em qualquer peça
--   `{{#exploradores}}`             item `explorador`     — pessoa
--   `{{#compossuidores}}`           item `compossuidor`   — pessoa + `fracao`
--   `{{#administradoresNomeados}}`  item `adminNomeado`   — pessoa
--   `{{#imoveisDoAnexo}}`           item `imovel`         — matrícula + `alinea`, `areaCedida`
--   `{{#origensDaPosse}}`           item `origemPosse` + `outorgante` (pessoa)
--   `{{#signatarios}}`              item `signatario`     — a mesma fábrica do fecho societário
--
-- O item da origem NÃO se chama `origem`: esse nome já significa "sociedade de
-- origem das quotas" dentro de `{{#integralizacoes}}`, e dois sentidos para o mesmo
-- identificador é armadilha esperando alguém.
--
-- ── IDEMPOTÊNCIA ─────────────────────────────────────────────────────────────
--
-- Apaga e recria pelas categorias `parceria-rural` e `composse-rural`. Só é seguro
-- ENQUANTO nenhum documento tiver sido gerado a partir destes blocos: quando
-- houver, `documento_override` passa a referenciá-los e a recriação teria de virar
-- UPDATE por nome. Isso não fica em comentário — a guarda abaixo verifica e
-- INTERROMPE, porque apagar em silêncio o bloco que um documento gerado cita é o
-- tipo de estrago que só aparece meses depois.

-- ---------------------------------------------------------------------------
-- Pré-condição de schema: o escopo do documento
-- ---------------------------------------------------------------------------
-- `tmpl_documento.escopo` diz de QUE cadastro o documento depende, e o CHECK
-- conhecia dois valores: 'sociedade' (o Contrato Social, dirigido pela Empresa) e
-- 'avulso' (o que não depende de cadastro nenhum). O instrumento agrário é do
-- primeiro tipo, não do segundo: ele depende de uma linha de `exploracao_rural`,
-- de onde saem o cabeçalho e as cinco listas. Marcá-lo 'avulso' para caber no
-- CHECK antigo seria gravar uma informação falsa no catálogo.
--
-- Nada no código ramifica por este valor hoje (nenhuma função do banco o lê, e o
-- front só o carrega como texto), então ampliar o domínio não muda comportamento
-- de documento nenhum que já existe.
alter table public.tmpl_documento
  drop constraint if exists tmpl_documento_escopo_check;
alter table public.tmpl_documento
  add constraint tmpl_documento_escopo_check
  check (escopo in ('sociedade', 'avulso', 'exploracao_rural'));

-- ---------------------------------------------------------------------------
-- Guarda: a recriação só é segura se ninguém depender destes blocos
-- ---------------------------------------------------------------------------
do $$
declare
  v_documentos integer;
  v_overrides  integer;
begin
  select count(*) into v_documentos
    from public.documento_gerado g
    join public.tmpl_documento d on d.id = g.documento_template_id
   where d.nome in ('Parceria Rural','Composse Rural Pro Indiviso');

  select count(*) into v_overrides
    from public.documento_override o
   where o.bloco_alvo_id in (
           select id from public.tmpl_bloco where categoria in ('parceria-rural','composse-rural'))
      or o.bloco_substituto_id in (
           select id from public.tmpl_bloco where categoria in ('parceria-rural','composse-rural'));

  if v_documentos > 0 or v_overrides > 0 then
    raise exception
      'Já existem % documento(s) gerado(s) e % override(s) apontando para o catálogo rural. Recriar apagaria a referência deles: converta esta migration em UPDATE por nome antes de aplicar.',
      v_documentos, v_overrides;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- Limpeza (re-execução)
-- ---------------------------------------------------------------------------
delete from public.tmpl_documento_bloco
 where bloco_id in (select id from public.tmpl_bloco where categoria in ('parceria-rural','composse-rural'))
    or documento_id in (select id from public.tmpl_documento
                         where nome in ('Parceria Rural','Composse Rural Pro Indiviso'));
delete from public.tmpl_bloco_flag
 where bloco_id in (select id from public.tmpl_bloco where categoria in ('parceria-rural','composse-rural'));
delete from public.tmpl_bloco_versao
 where bloco_id in (select id from public.tmpl_bloco where categoria in ('parceria-rural','composse-rural'));
update public.tmpl_bloco set familia_id = null
 where categoria in ('parceria-rural','composse-rural') and familia_id is not null;
delete from public.tmpl_bloco where categoria in ('parceria-rural','composse-rural');
delete from public.tmpl_documento where nome in ('Parceria Rural','Composse Rural Pro Indiviso');

-- ---------------------------------------------------------------------------
-- Semeadura
-- ---------------------------------------------------------------------------
do $$
declare
  v_doc      uuid;
  v_bloco    uuid;
  v_familia  uuid;
  r          record;
begin

-- ══════════════════════════════════════════════════════════════════════════
-- PARCERIA RURAL
-- ══════════════════════════════════════════════════════════════════════════
insert into public.tmpl_documento (nome, tipo, descricao, ativo, escopo)
values (
  'Parceria Rural',
  'instrumento_agrario',
  'Instrumento Particular de Parceria para fins de exploração agropecuária ou agrícola. Um outorgante, N outorgados; a natureza da exploração troca a palavra em três trechos.',
  true,
  'exploracao_rural'
) returning id into v_doc;

for r in
  select * from (values

  -- ── Título e preâmbulo ────────────────────────────────────────────────
  (10, 'livre', 'Parceria — Título', null::text, null::text, false,
   '*INSTRUMENTO PARTICULAR DE PARCERIA PARA FINS DE EXPLORAÇÃO {{ instrumento.natureza }}*'),

  (20, 'livre', 'Parceria — Preâmbulo: parceira outorgante', null, null, false,
   '*PARCEIRA OUTORGANTE:*

{{ outorgante.qualificacao }}.'),

  (30, 'livre', 'Parceria — Preâmbulo: parceiros outorgados', null, null, false,
   '*PARCEIROS OUTORGADOS:*

{{#exploradores sep=";\n\n" fim="; e\n\n"}}{{ explorador.qualificacao }}{{/exploradores}} — doravante denominados *PARCEIROS OUTORGADOS*.

As partes acima identificadas têm, entre si, justas e contratadas, o presente Instrumento Particular de Parceria para Fins de Exploração {{ instrumento.natureza }}, que se regerá pelas cláusulas e condições descritas no presente.'),

  -- ── Cláusula Primeira: áreas cedidas ──────────────────────────────────
  (40, 'capitulo', 'Parceria — Capítulo: Das áreas cedidas em parceria', null, null, false,
   'Das Áreas Cedidas em Parceria'),

  (50, 'clausula', 'Parceria — Cláusula: áreas cedidas', null, 'areas_cedidas', false,
   'As partes, por este instrumento contratual, constituem parceria rural para exploração agropecuária em áreas de terras rurais, nos termos do art. 96 da Lei 4.504/64, cedendo a PARCEIRA OUTORGANTE em favor dos PARCEIROS OUTORGADOS os imóveis de sua posse e/ou propriedade, descritos nas alíneas "{{ instrumento.primeiraAlinea }}" à "{{ instrumento.ultimaAlinea }}" a seguir, com seus limites e confrontações dispostos no ANEXO ÚNICO deste instrumento:

{{#imoveisDoAnexo sep="\n"}}*{{ imovel.alinea }})* {{ imovel.areaCedida }} de um imóvel com área de {{ imovel.area }}, denominado *{{ imovel.denominacao }}*, matrícula nº {{ imovel.numero }}, município de {{ imovel.municipio }}, Estado de {{ imovel.uf }};{{/imoveisDoAnexo}}'),

  (60, 'paragrafo', 'Parceria — Parágrafo: propriedade e cartório dos imóveis', null, null, false,
   'Todos os imóveis são de propriedade de {{ instrumento.proprietarioComum }}, registrados no {{ instrumento.cartorioComum }}{{#instrumento.cartorioComumComarca}} da comarca de {{ instrumento.cartorioComumComarca }}{{/instrumento.cartorioComumComarca}}.'),

  -- ── Vigência ──────────────────────────────────────────────────────────
  (70, 'capitulo', 'Parceria — Capítulo: Da vigência', null, null, false, 'Da Vigência'),

  (80, 'clausula', 'Parceria — Cláusula: vigência', null, 'vigencia', false,
   'A presente parceria rural para fins de exploração {{ instrumento.natureza }} tem vigência a contar da data da assinatura deste instrumento e findará em {{ instrumento.dataEncerramento }}.'),

  (90, 'paragrafo', 'Parceria — Parágrafo: devolução ao término', null, null, false,
   'Não havendo renovação nos termos da Cláusula Nona, ao término da vigência, os PARCEIROS OUTORGADOS deverão devolver à PARCEIRA OUTORGANTE, independentemente de notificação, os imóveis rurais objetos desta parceria.'),

  (100, 'paragrafo', 'Parceria — Parágrafo: prazo indeterminado após o vencimento', null, null, false,
   '{{#instrumento.prorrogavel}}Ultrapassando o contrato a data prevista no caput desta cláusula, o contrato passará a ser por tempo indeterminado, podendo a PARCEIRA OUTORGANTE rescindi-lo a qualquer tempo. Neste caso, deverá notificar por escrito os PARCEIROS OUTORGADOS, os quais deverão sair dos imóveis objetos desta parceria dentro do prazo de 30 (trinta) dias a contar do recebimento da referida notificação se inexistir produto pendente de colheita; ou, se pendente a colheita, 30 (trinta) dias após a sua realização.{{/instrumento.prorrogavel}}'),

  -- ── Atividades ────────────────────────────────────────────────────────
  (110, 'capitulo', 'Parceria — Capítulo: Das atividades', null, null, false,
   'Das Atividades {{ instrumento.naturezaPlural }}'),

  (120, 'clausula', 'Parceria — Cláusula: atividades permitidas', null, 'atividades', false,
   'Os PARCEIROS OUTORGADOS poderão explorar nas áreas objeto deste instrumento de parceria lavouras de {{ instrumento.culturas }} ou outra cultura legalmente permitida que pretender explorar, ficando esclarecido que o mesmo poderá fazer uso da terra quantas vezes desejar, inclusive para exploração agrícola de safrinha, sem qualquer custo ou despesa adicional.{{#instrumento.pecuaria}} Em se tratando da exploração pecuária ou de animais, poderão fazer uso das terras para cria, recria e engorda de bovinos, suínos, ovinos, equinos e aves; ou outros animais, da maneira que lhes convier, obedecendo os limites deste contrato.{{/instrumento.pecuaria}}'),

  -- ── Despesas ──────────────────────────────────────────────────────────
  (130, 'capitulo', 'Parceria — Capítulo: Das despesas', null, null, false, 'Das Despesas'),

  (140, 'clausula', 'Parceria — Cláusula: despesas dos outorgados', null, null, false,
   'Competem aos PARCEIROS OUTORGADOS todas as despesas de preparo, plantio, cultivo, colheita, extração, limpeza e beneficiamento dos produtos, mão de obra, insumos, defensivos, adubos, corretivos de solo, máquinas, combustíveis e demais itens necessários à exploração — ressalvadas as despesas do imóvel em si (ITR, CAR, Georreferenciamento, CCIR), que permanecem com a PARCEIRA OUTORGANTE.'),

  -- ── Frutos ────────────────────────────────────────────────────────────
  (150, 'capitulo', 'Parceria — Capítulo: Da participação nos frutos', null, null, false,
   'Da Participação de Cada Parceiro nos Frutos da Parceria'),

  (160, 'clausula', 'Parceria — Cláusula: partilha dos frutos', null, 'partilha', false,
   'Caberá à PARCEIRA OUTORGANTE *{{ instrumento.percentualOutorgante }} ({{ instrumento.percentualOutorganteExtenso }})* de todos os frutos produzidos nas áreas objeto da parceria, e aos PARCEIROS OUTORGADOS os outros *{{ instrumento.percentualExplorador }} ({{ instrumento.percentualExploradorExtenso }})*, em conformidade com o art. 96, VI, "a", da Lei 4.504/64. Os PARCEIROS OUTORGADOS armazenam os frutos em depósito indicado pela PARCEIRA OUTORGANTE, arcando com o transporte.'),

  (180, 'paragrafo', 'Parceria — Parágrafo: frutos por exercício', null, null, false,
   'Os frutos da pecuária poderão ser calculados e distribuídos por exercício fiscal ou por período inferior, desde que as partes decidam em conjunto.'),

  (190, 'paragrafo', 'Parceria — Parágrafo: mora na entrega dos frutos', null, null, false,
   'Inadimplemento na entrega dos frutos gera mora automática, com atualização pelo INPC, multa de 10% (dez por cento) e juros de 1% (um por cento) ao mês, considerando-se como "valor" os preços apurados pelo IMEA na praça do foro deste contrato.'),

  (200, 'clausula', 'Parceria — Cláusula: disposição dos frutos antes da partilha', null, null, false,
   'Os parceiros podem dispor dos frutos antes da partilha, comercializando independentemente, respondendo cada um por si perante terceiros se os frutos pactuados excederem o resultado que lhe cabe.'),

  (210, 'clausula', 'Parceria — Cláusula: caso fortuito e força maior', null, null, false,
   'Caso fortuito ou força maior que destrua parcialmente a produção tem a perda suportada pelas partes, conforme art. 96, §1º, I, da Lei 4.504/64.'),

  (220, 'clausula', 'Parceria — Cláusula: obrigações da mão de obra rural', null, null, false,
   'Obrigações trabalhistas, sociais, tributárias, fiscais, ambientais e previdenciárias relativas à mão de obra rural são exclusivamente dos PARCEIROS OUTORGADOS.'),

  -- ── Preferência ───────────────────────────────────────────────────────
  (230, 'capitulo', 'Parceria — Capítulo: Do direito de preferência', null, null, false,
   'Do Direito de Preferência nos Casos de Alienação e/ou Renovação'),

  (240, 'clausula', 'Parceria — Cláusula: preferência na renovação', null, 'preferencia', false,
   'Nos termos do art. 95, IV, c/c art. 96, VII, da Lei 4.504/64, os PARCEIROS OUTORGADOS têm preferência à renovação, em igualdade de condições com terceiros — a PARCEIRA OUTORGANTE deve notificá-los até 6 (seis) meses antes do vencimento, com cópia de eventual proposta recebida.'),

  (250, 'paragrafo', 'Parceria — Parágrafo: retomada para exploração direta', null, null, false,
   'Esse direito não prevalece se a PARCEIRA OUTORGANTE notificar, com a mesma antecedência de 6 (seis) meses, que deseja retomar os imóveis para exploração direta.'),

  (260, 'paragrafo', 'Parceria — Parágrafo: preferência na venda', null, null, false,
   'Em caso de venda das áreas, a PARCEIRA OUTORGANTE deve avisar os PARCEIROS OUTORGADOS, que têm 30 (trinta) dias para exercer preferência.'),

  -- ── Função social e devolução ─────────────────────────────────────────
  (270, 'capitulo', 'Parceria — Capítulo: Da função social e da devolução dos bens', null, null, false,
   'Da Função Social e da Devolução dos Bens'),

  (280, 'clausula', 'Parceria — Cláusula: devolução dos bens', null, null, false,
   'Os bens serão devolvidos como entregues, salvo deterioração de uso normal.'),

  (290, 'paragrafo', 'Parceria — Parágrafo: benfeitorias não indenizáveis', null, null, false,
   'Todas as benfeitorias realizadas pelos PARCEIROS OUTORGADOS, sejam elas úteis ou voluptuárias, serão incorporadas aos imóveis, *não incidindo sobre elas qualquer tipo de indenização*, salvo se as partes pactuarem em instrumento apartado condição diferente desta.'),

  -- ── Uso do solo ───────────────────────────────────────────────────────
  (300, 'capitulo', 'Parceria — Capítulo: Do uso do solo e mão de obra', null, null, false,
   'Do Uso do Solo e Mão de Obra'),

  (310, 'clausula', 'Parceria — Cláusula: manejo e conformidade', null, null, false,
   'Manejo do solo conforme recomendações agronômicas; atividades pecuárias conforme normas veterinárias e zootécnicas; proibido uso de defensivos não autorizados; respeito a leis ambientais e trabalhistas, sem invasão de terra nem queimadas irregulares.'),

  -- ── Extinção ──────────────────────────────────────────────────────────
  (320, 'capitulo', 'Parceria — Capítulo: Da extinção do contrato', null, null, false,
   'Da Extinção do Contrato'),

  (330, 'clausula', 'Parceria — Cláusula: rescisão por inadimplemento', null, null, false,
   'Inadimplemento de qualquer cláusula permite rescisão mediante simples notificação, assegurada a colheita da safra em curso antes da devolução dos imóveis e partilha dos frutos daquela safra.'),

  (340, 'clausula', 'Parceria — Cláusula: rescisão por mútuo acordo', null, null, false,
   'Rescisão também pode ocorrer por mútuo acordo a qualquer tempo, respeitado o término da safra em curso.'),

  -- ── Anuência / penhor ─────────────────────────────────────────────────
  (350, 'capitulo', 'Parceria — Capítulo: Da anuência', null, null, false, 'Da Anuência'),

  (360, 'clausula', 'Parceria — Cláusula: anuência ao penhor', null, 'anuencia', false,
   'A PARCEIRA OUTORGANTE autoriza os PARCEIROS OUTORGADOS a oferecer em garantia de financiamentos bancários, durante toda a vigência (e a safra seguinte), a totalidade da produção, além de materiais agrários, benfeitorias e semoventes de sua propriedade.'),

  (370, 'paragrafo', 'Parceria — Parágrafo: penhor por período de vigência', null, null, false,
   'O penhor de cada safra vale por todo o período de vigência da parceria, conforme art. 1.439 do Código Civil.'),

  (380, 'paragrafo', 'Parceria — Parágrafo: destinação prioritária dos frutos', null, null, false,
   'A PARCEIRA OUTORGANTE autoriza os PARCEIROS OUTORGADOS a destinar, prioritariamente, sob renúncia plena de todos os direitos, os frutos oriundos da exploração desta parceria para liquidação dos débitos contraídos por eles e que tenham relação direta com os imóveis, as culturas e/ou os animais explorados.'),

  (390, 'paragrafo', 'Parceria — Parágrafo: fiscalização pelas instituições', null, null, false,
   'A PARCEIRA OUTORGANTE declara ciência do direito das instituições privadas — bancárias, comerciais, industriais e financeiras — de fiscalizar os imóveis cedidos, e concorda que os bens vinculados ali permaneçam até a liquidação final das dívidas, mesmo em caso de alienação do imóvel.'),

  -- ── Disposições gerais ────────────────────────────────────────────────
  (400, 'capitulo', 'Parceria — Capítulo: Disposições gerais', null, null, false,
   'Disposições Gerais'),

  (410, 'clausula', 'Parceria — Cláusula: irrevogabilidade', null, null, false,
   'Acordo irrevogável e irretratável, obrigando sucessores; alteração só por escrito, assinada por todos.'),

  (420, 'clausula', 'Parceria — Cláusula: vedação de cessão', null, null, false,
   'Vedada a cessão do contrato pelos PARCEIROS OUTORGADOS sem consentimento expresso da outra parte.'),

  (430, 'clausula', 'Parceria — Cláusula: ônus alheios à exploração', null, null, false,
   'Os PARCEIROS OUTORGADOS se eximem de ônus sobre os imóveis decorrentes de dívidas exclusivas da PARCEIRA OUTORGANTE alheias à exploração rural objeto do contrato.'),

  (440, 'clausula', 'Parceria — Cláusula: regência pelo Estatuto da Terra', null, null, false,
   'A relação *não* se rege pela CLT, e sim pelo Estatuto da Terra e pelo Decreto 59.566/1966, já que os PARCEIROS OUTORGADOS não estão subordinados à PARCEIRA OUTORGANTE, podendo estipular seus próprios horários de trabalho.'),

  (450, 'clausula', 'Parceria — Cláusula: abertura de inscrição estadual', null, null, false,
   'A relação estabelecida pelo presente contrato autoriza a abertura das respectivas inscrições estaduais pelas partes.'),

  -- ── Foro e fecho ──────────────────────────────────────────────────────
  (460, 'capitulo', 'Parceria — Capítulo: Do foro', null, null, false, 'Do Foro'),

  (470, 'clausula', 'Parceria — Cláusula: foro de eleição', null, 'foro', false,
   'Para dirimir quaisquer controvérsias oriundas deste instrumento, as partes elegem o foro da comarca de {{ instrumento.foroComarca }}, Estado de {{ instrumento.foroUfExtenso }}, renunciando expressamente a qualquer outro, por mais privilegiado que seja.'),

  (480, 'livre', 'Parceria — Fecho e assinaturas', null, null, false,
   'Por estarem assim justos e contratados, firmam o presente instrumento em {{ instrumento.numeroVias }} ({{ instrumento.numeroViasExtenso }}) vias de igual teor e forma, juntamente com 2 (duas) testemunhas.

{{ instrumento.foroComarca }}/{{ instrumento.foroUf }}, {{ instrumento.dataAssinatura }}.

{{#signatarios sep="\n\n"}}_______________________________________
*{{ signatario.nomeMaiusculo }}*
{{ signatario.papel }}{{#signatario.qualificacao}}
{{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}'),

  (490, 'livre', 'Parceria — Anexo Único', null, null, true,
   '*ANEXO ÚNICO*

Descrição das áreas objeto do Instrumento Particular de Parceria firmado em {{ instrumento.dataAssinatura }}, sendo:

| Item | Área cedida | Área total do imóvel | Nome do imóvel | Matrícula | Município/Estado | Proprietário |
| :--: | --: | --: | :-- | :--: | :--: | :-- |
{{#imoveisDoAnexo sep="
"}}| {{ imovel.alinea }} | {{ imovel.areaCedida }} | {{ imovel.area }} | {{ imovel.denominacao }} | {{ imovel.numero }} | {{ imovel.municipio }}/{{ imovel.uf }} | {{ imovel.proprietario }} |{{/imoveisDoAnexo}}')

  ) as t(ordem, tipo, nome, repete, ancora, reinicia, conteudo)
  order by 1
loop
  insert into public.tmpl_bloco (nome, categoria, tipo, repete_colecao, ancora, reinicia_numeracao, ativo)
  values (r.nome, 'parceria-rural', r.tipo, r.repete, r.ancora, r.reinicia, true)
  returning id into v_bloco;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (v_bloco, 1, true, r.conteudo,
          'Semeadura inicial a partir do template oficial da banca (migration 20260901190315).');

  insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
  values (v_doc, v_bloco, r.ordem, true);
end loop;

-- Família da modalidade da pecuária: três variantes do MESMO parágrafo de "frutos".
-- A banca troca de arquivo de modelo para escolher; aqui é uma família com seletor,
-- o mecanismo que a Biblioteca já tem (`familia_id` + `variante_seletor`).
--
-- ⚠️ `familia_id` aponta para a CABEÇA — o bloco que entra no documento e escreve
-- {{familia nome="…"}} —, NUNCA para um uuid solto. A primeira versão desta
-- migration gerava `gen_random_uuid()` e inseria as três variantes direto em
-- `tmpl_documento_bloco`; o resultado era invisível no teste de unidade e fatal na
-- tela: `useBibliotecaModelos` monta o registro por `porId.get(b.familia_id)` e
-- FILTRA do catálogo tudo que tem `familia_id`, então as variantes sumiriam do
-- catálogo, nunca seriam eleitas por `resolverVariante`, e o documento apontaria
-- para três blocos órfãos.
--
-- A cabeça guarda a inclusão dentro de duas condicionais: sem pecuária o
-- parágrafo não existe, e com pecuária mas sem modalidade escolhida ele renderiza
-- vazio e é DESCARTADO com aviso — em vez de `resolverVariante` derrubar a prévia
-- inteira por não achar seletor que case.
insert into public.tmpl_bloco (nome, categoria, tipo, ativo, reinicia_numeracao)
values ('Parceria — Parágrafo: frutos da pecuária', 'parceria-rural', 'paragrafo', true, false)
returning id into v_familia;

insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
values (v_familia, 1, true,
        '{{#instrumento.pecuaria}}{{#instrumento.temModalidadePecuaria}}{{familia nome="Parceria — Parágrafo: frutos da pecuária"}}{{/instrumento.temModalidadePecuaria}}{{/instrumento.pecuaria}}',
        'Semeadura inicial — cabeça da família da modalidade da pecuária (migration 20260901190315).');

-- Ordem 170: entre a cláusula da partilha (160) e o parágrafo do exercício (180).
-- Quem entra no documento é a CABEÇA; a variante é eleita no render.
insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
values (v_doc, v_familia, 170, true);

for r in
  select * from (values
  (1, 'cria', 'Cria (bezerros nascidos)',
   'Considerar-se-á como "frutos" da pecuária, no caso de *cria*, os bezerros nascidos do rebanho de fêmeas, sendo a parcela da PARCEIRA OUTORGANTE entregue através da cessão de animais em quantidade proporcional aos frutos.'),
  (2, 'recria_engorda', 'Recria e engorda (ganho de peso)',
   'Considerar-se-á como "frutos" da pecuária, no caso de *recria e engorda*, o ganho de peso (kg) dos animais, apurado pela diferença entre o peso de aquisição e o peso na alienação; animais já existentes nas áreas são pesados em até 30 (trinta) dias da assinatura, valendo esse como "peso inicial". A parcela da PARCEIRA OUTORGANTE é entregue via cessão de animais com peso proporcional.'),
  (3, 'ciclo_completo', 'Ciclo completo (peso adquirido em 12 meses)',
   'Considerar-se-á como "frutos" da pecuária, no caso do *ciclo completo*, o peso (kg) adquirido pelos animais nos imóveis objeto desta parceria a cada 12 (doze) meses contados da assinatura, utilizando-se como parâmetro as notas fiscais de venda e/ou eventuais controles internos dos PARCEIROS OUTORGADOS.')
  ) as t(ordem, seletor, rotulo, conteudo)
  order by 1
loop
  insert into public.tmpl_bloco (
    nome, categoria, tipo, ativo, familia_id, variante_seletor, variante_rotulo, variante_ordem,
    reinicia_numeracao
  )
  values (
    'Parceria — Parágrafo: frutos da pecuária (' || r.rotulo || ')',
    'parceria-rural', 'paragrafo', true, v_familia,
    jsonb_build_object('instrumento.modalidadePecuaria', r.seletor), r.rotulo, r.ordem, false
  )
  returning id into v_bloco;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (v_bloco, 1, true, r.conteudo,
          'Semeadura inicial — variante de família (migration 20260901190315).');
  -- A VARIANTE não entra em `tmpl_documento_bloco`: no documento está a cabeça.
end loop;

-- ══════════════════════════════════════════════════════════════════════════
-- COMPOSSE RURAL PRO INDIVISO
-- ══════════════════════════════════════════════════════════════════════════
insert into public.tmpl_documento (nome, tipo, descricao, ativo, escopo)
values (
  'Composse Rural Pro Indiviso',
  'instrumento_agrario',
  'Instrumento Particular de Constituição de Composse Rural Pro Indiviso. N compossuidores com fração que fecha 100%; a origem da posse é declarada por imóvel no Considerando V.',
  true,
  'exploracao_rural'
) returning id into v_doc;

for r in
  select * from (values

  (10, 'livre', 'Composse — Título', null::text, null::text, false,
   '*INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE COMPOSSE RURAL PRO INDIVISO*'),

  (20, 'livre', 'Composse — Preâmbulo: compossuidores', null, null, false,
   '{{#compossuidores sep=";\n\n" fim="; e\n\n"}}{{ compossuidor.qualificacao }}{{/compossuidores}}, neste ato doravante denominados *COMPOSSUIDORES RURAIS* ou simplesmente *COMPOSSUIDORES*.'),

  -- ── Preâmbulo (Considerandos) ─────────────────────────────────────────
  -- O preâmbulo NÃO é capítulo numerado: tipá-lo como `capitulo` fazia a
  -- numeração automática gastar o CAPÍTULO I nele, e o "Capítulo I – Do Objeto"
  -- do contrato saía sob um "*CAPÍTULO II*".
  (30, 'livre', 'Composse — Título: Preâmbulo', null, null, false, '*PREÂMBULO*'),

  (40, 'livre', 'Composse — Considerando I: interesse em associar-se', null, null, false,
   '*I)* CONSIDERANDO que os COMPOSSUIDORES RURAIS têm interesse em se associarem para exploração de atividade agropecuária, vez que possuem, no conjunto, conhecimento técnico especializado, capital, máquinas e equipamentos, e ainda, são legítimos possuidores dos imóveis rurais descritos nas alíneas "{{ instrumento.primeiraAlinea }}" à "{{ instrumento.ultimaAlinea }}", do ANEXO ÚNICO deste instrumento.'),

  (50, 'livre', 'Composse — Considerando II: base legal da composse', null, null, false,
   '*II)* CONSIDERANDO que os COMPOSSUIDORES desejam associar-se através de composse pro indiviso para utilização de imóvel rural, alicerçados nos artigos 1.196, 1.197, 1.199, 1.204, 1.314, 1.323 e 1.326 da Lei 10.406/2002 (que tratam da composse e dos condomínios voluntários, racional analogicamente adotado ao presente contrato), bem como as demais normas aplicáveis subsidiariamente ao presente acordo previstas na legislação brasileira;'),

  (60, 'livre', 'Composse — Considerando III: Estatuto da Terra', null, null, false,
   '*III)* CONSIDERANDO que o artigo 14 da Lei 4.504/1.964, também conhecida como Estatuto da Terra, determina que o poder público facilite e prestigie a criação e a expansão de associações de pessoas físicas e jurídicas que tenham por finalidade o racional desenvolvimento agrícola, pecuário, extrativo ou agroindustrial;'),

  (70, 'livre', 'Composse — Considerando IV: tributação na pessoa física', null, null, false,
   '*IV)* CONSIDERANDO que os COMPOSSUIDORES RURAIS buscam oportunidades para investimentos e exploração conjunta de negócios agrícolas, e para tanto, resolvem se organizar estabelecendo uma composse rural pro indiviso, elegendo a tributação na pessoa física, na forma entrevista no artigo 13 do Decreto 9.580/2.018;'),

  (80, 'livre', 'Composse — Considerando V: origem da posse dos imóveis', null, null, false,
   '*V)* CONSIDERANDO que a posse dos imóveis rurais descritos no Anexo único deste instrumento advém dos seguintes instrumentos:

{{#origensDaPosse sep="\n\n"}}*{{ origemPosse.letra }})* {{ origemPosse.itens }} {{ origemPosse.advir }} {{ origemPosse.tipoPorExtenso }}{{#origemPosse.propria}}, sendo o imóvel já explorado diretamente pelos próprios COMPOSSUIDORES RURAIS, sem instrumento de cessão de terceiro por trás{{/origemPosse.propria}}{{#origemPosse.deTerceiro}}, firmado em {{ origemPosse.dataAssinatura }}, no qual figuram como Parceiros Outorgados os COMPOSSUIDORES RURAIS e como Parceira Outorgante {{ outorgante.qualificacao }}{{/origemPosse.deTerceiro}};{{/origensDaPosse}}'),

  (90, 'livre', 'Composse — Fecho do preâmbulo', null, null, false,
   'As partes acima identificadas resolvem, em comum acordo, entabular o presente INSTRUMENTO PARTICULAR DE CONSTITUIÇÃO DE COMPOSSE RURAL PRO INDIVISO, para estabelecer compromissos com relação à administração dos negócios rurais originários do exercício comum da posse de imóvel rural (bens e know-how), o que fazem nos termos da legislação brasileira, especialmente as acima citadas e das cláusulas e condições abaixo estabelecidas.'),

  -- ── Capítulo I: objeto ────────────────────────────────────────────────
  (100, 'capitulo', 'Composse — Capítulo I: Do objeto', null, null, false,
   'Do Objeto'),

  (110, 'clausula', 'Composse — Cláusula: constituição da composse', null, 'objeto', false,
   'Fica constituída uma COMPOSSE RURAL em que são COMPOSSUIDORES RURAIS as partes qualificadas no preâmbulo, com o objetivo de explorarem, sob o regime disposto neste instrumento, incluindo, mas não se limitando, ao de {{ instrumento.culturas }}, ou outra cultura legalmente permitida que pretenderem explorar, nas áreas rurais descritas no anexo único deste instrumento.'),

  (120, 'clausula', 'Composse — Cláusula: frações e frutos', null, 'fracoes', false,
   'Os COMPOSSUIDORES RURAIS se obrigam na COMPOSSE RURAL objeto deste instrumento e gozarão dos frutos dela na proporção de suas partes, quais sejam: {{#compossuidores sep=", " fim=" e "}}*{{ compossuidor.fracao }} ({{ compossuidor.fracaoExtenso }}) para {{ compossuidor.nomeMaiusculo }}*{{/compossuidores}}.'),

  (130, 'paragrafo', 'Composse — Parágrafo: nome da composse', null, null, false,
   'A COMPOSSE girará, quando assim exigida em lei e/ou por força de eventuais solicitações de terceiros, sob o nome de *{{ instrumento.nomeComposse }}*.'),

  (140, 'paragrafo', 'Composse — Parágrafo: liquidação de haveres', null, null, false,
   'Caberá a cada COMPOSSUIDOR tão somente a participação estipulada no caput desta cláusula, restando ainda acordado que caso haja a dissolução da composse, por qualquer motivo, as partes ou terceiros interessados acordarão como se dará a liquidação dos haveres, sendo que na ausência de comum acordo, a liquidação dos haveres do compossuidor retirante, seu cônjuge ou companheiro(a), herdeiro(a), sucessor(a) e/ou terceiro, observará o disposto nas alíneas abaixo:

*a)* o valor dos haveres será apurado e liquidado com base no valor do patrimônio líquido da composse apurado em balanço específico para este fim, levantado no máximo 60 (sessenta) dias antes do evento;

*b)* o pagamento será realizado em moeda corrente nacional, através de depósito em conta bancária do beneficiário, em {{ instrumento.liquidacaoParcelas }} ({{ instrumento.liquidacaoParcelasExtenso }}) parcelas iguais e {{ instrumento.liquidacaoPeriodicidadeProsa }}, atualizadas monetariamente pela variação do INPC, vencendo a primeira em {{ instrumento.liquidacaoPrimeiroVencimento }} que deu origem à liquidação;

*c)* os compossuidores estabelecem que todas as avaliações dos haveres serão realizadas por empresa especializada, cuja nomeação competirá aos compossuidores que possuírem a maioria da participação na composse;

*d)* em todos os demais casos em que ocorrer a resolução da composse face a um ou mais compossuidor(es), ainda que não esteja expressamente previsto neste instrumento, os valores devidos serão determinados através da metodologia descrita nas alíneas anteriores.'),

  (150, 'clausula', 'Composse — Cláusula: despesas e ônus na proporção', null, null, false,
   'Os COMPOSSUIDORES RURAIS se obrigam aos termos aqui avençados, por si, herdeiros e sucessores, concorrendo para as despesas e suportando os ônus na proporção da parte ideal que possuem, quando feitas no uso regular da administração da composse.'),

  (160, 'clausula', 'Composse — Cláusula: prazo de indivisão', null, 'indivisao', false,
   'Os COMPOSSUIDORES RURAIS determinam que seja deixada indivisa a coisa comum, em especial os imóveis, bens, benfeitorias, máquinas, equipamentos, implementos etc., pelo prazo de {{ instrumento.prazoIndivisaoQuantidade }} ({{ instrumento.prazoIndivisaoQuantidadeExtenso }}) {{ instrumento.prazoIndivisaoUnidade }}{{#instrumento.indivisaoProrrogavel}}, podendo ainda ser prorrogado por igual interstício se não houver, por escrito e com {{ instrumento.indivisaoAvisoQuantidade }} ({{ instrumento.indivisaoAvisoQuantidadeExtenso }}) {{ instrumento.indivisaoAvisoUnidade }} de antecedência, o requerimento de divisão da coisa comum por qualquer um dos COMPOSSUIDORES RURAIS; renovando-se o prazo sucessivamente, até que formalmente uma das partes notifique a outra desejando a divisão da coisa comum e a extinção da presente composse{{/instrumento.indivisaoProrrogavel}}.'),

  (170, 'paragrafo', 'Composse — Parágrafo: imóvel que sai por fim da parceria de origem', null, null, false,
   'Os imóveis rurais que fazem parte integrante do objeto desta COMPOSSE RURAL que eventualmente deixarem de ser objeto de posse dos seus respectivos COMPOSSUIDORES em virtude de encerramento de contratos de parcerias de áreas rurais, deixarão espontaneamente de fazer parte do presente contrato, mantendo-se o presente contrato vigente e inalterado com relação as demais áreas subsistentes, até o fim do prazo previsto no caput desta cláusula, *não sendo motivo para rescisão da presente COMPOSSE RURAL ou elaboração de aditivos contratuais.*'),

  (180, 'clausula', 'Composse — Cláusula: vedação de transferir a terceiros', null, null, false,
   'Fica vedado aos COMPOSSUIDORES RURAIS modificar a destinação da presente composse pro indiviso, bem como transferir, dar posse, uso ou gozo, de quaisquer dos bens ou direitos comuns a terceiros, exceto se COMPOSSUIDORES RURAIS que representem a maioria dos percentuais descritos na Cláusula Segunda anuírem.'),

  -- ── Capítulo II: resultado ────────────────────────────────────────────
  (190, 'capitulo', 'Composse — Capítulo II: Do resultado da composse rural', null, null, false,
   'Do Resultado da Composse Rural'),

  (200, 'clausula', 'Composse — Cláusula: apuração por ano-safra', null, 'apuracao', false,
   'A apuração dos resultados da COMPOSSE obtidos pelos COMPOSSUIDORES relacionados à fruição econômica da atividade objeto deste contrato será realizada por ano/safra, cujo resultado positivo e líquido será distribuído, sempre no dia 31 de outubro de cada ano, proporcional à participação de cada compossuidor descrita na Cláusula Segunda, salvo deliberação em contrário na qual todos concordem.'),

  (210, 'paragrafo', 'Composse — Parágrafo: receitas e despesas por livro caixa', null, null, false,
   'Os resultados serão auferidos levando-se em consideração todas as receitas e despesas (custos), obtidos pela atividade realizada em comum, apurados mediante livro caixa sob o regime de caixa, nos termos das normativas estabelecidas pelo CFC.'),

  (220, 'paragrafo', 'Composse — Parágrafo: prejuízo proporcional', null, null, false,
   'Havendo prejuízo, estes serão suportados proporcionalmente por cada um dos COMPOSSUIDORES.'),

  (230, 'clausula', 'Composse — Cláusula: responsabilidades suportadas pela composse', null, null, false,
   'As responsabilidades decorrentes da contratação de trabalhadores rurais ou diaristas, obrigações trabalhistas ou sociais, passivos tributários, fiscais, ambientais, cíveis, bancários, contratuais e negociais serão suportados pela COMPOSSE, nos moldes da lei e deste contrato.'),

  (240, 'clausula', 'Composse — Cláusula: inscrição estadual', null, null, false,
   'A COMPOSSE deverá abrir inscrição estadual para a exploração de suas atividades, observado o nome designado para a COMPOSSE previsto no parágrafo primeiro da Cláusula Segunda.'),

  (250, 'clausula', 'Composse — Cláusula: financiamento do capital de giro', null, null, false,
   'Caberá aos COMPOSSUIDORES financiarem, com recursos próprios ou de terceiros, as necessidades de capital de giro, insumos e demais itens necessários à exploração do objeto deste contrato.'),

  (260, 'paragrafo', 'Composse — Parágrafo: CPR e cessão de frutos em garantia', null, null, false,
   '{{#instrumento.penhor}}Fica possibilitada a contratação de financiamentos rurais pelos COMPOSSUIDORES, podendo ceder frutos da atividade comum como garantia, mediante a emissão de Cédula de Produto Rural ou outro instrumento jurídico com o mesmo fim.{{/instrumento.penhor}}'),

  (270, 'clausula', 'Composse — Cláusula: repasse dos lucros', null, null, false,
   'Os lucros obtidos pela atividade rural resultante da composse serão repassados aos COMPOSSUIDORES RURAIS na forma estabelecida na Cláusula Segunda.'),

  -- ── Capítulo III: administração ───────────────────────────────────────
  (280, 'capitulo', 'Composse — Capítulo III: Administração', null, null, false,
   'Da Administração'),

  (290, 'clausula', 'Composse — Cláusula: administração e poderes', null, 'administracao', false,
   'A COMPOSSE será administrada isoladamente por seus COMPOSSUIDORES, que representarão a composse ativa e passivamente, em juízo ou fora dela, perante qualquer repartição pública e/ou empresa privada, observando os limites e condições deste instrumento, podendo: celebrar instrumentos e negócios jurídicos, operações financeiras, empréstimos, financiamentos, contratos de compra e venda, constituição de garantias; comprar, adquirir e permutar bens móveis; assinar títulos de crédito; abrir, encerrar e movimentar contas bancárias; admitir e demitir funcionários; e outorgar procurações para defesa de interesses da COMPOSSE.'),

  (300, 'paragrafo', 'Composse — Parágrafo: atos que exigem maioria ou nomeados', null, null, false,
   '{{#instrumento.administracaoMaioria}}Locar, arrendar e/ou formar parcerias rurais em nome da COMPOSSE, e emitir garantias a favor de terceiros (não compossuidores), só podem ser feitos em conjunto por COMPOSSUIDORES que representem a maioria dos percentuais da Cláusula Segunda, sob pena de nulidade.{{/instrumento.administracaoMaioria}}{{#instrumento.administracaoNomeados}}Locar, arrendar e/ou formar parcerias rurais em nome da COMPOSSE, e emitir garantias a favor de terceiros (não compossuidores), só podem ser feitos {{#instrumento.nomeadoUnico}}isoladamente por {{/instrumento.nomeadoUnico}}{{#instrumento.nomeadosEmConjunto}}em conjunto por {{/instrumento.nomeadosEmConjunto}}{{#administradoresNomeados sep=", " fim=" e "}}{{ adminNomeado.nome }}{{/administradoresNomeados}}, sob pena de nulidade.{{/instrumento.administracaoNomeados}}'),

  (310, 'paragrafo', 'Composse — Parágrafo: incapacidade civil superveniente', null, null, false,
   'Havendo incapacidade civil superveniente de qualquer administrador, a administração passará a ser desempenhada isoladamente pelo administrador remanescente em pleno gozo da capacidade civil.'),

  (320, 'clausula', 'Composse — Cláusula: acesso aos livros', null, null, false,
   'É facultado aos COMPOSSUIDORES RURAIS o acesso aos livros exclusivos da composse, registros, contratos financeiros e comerciais de compra de insumos e venda de produtos, assim como dos documentos de suporte à contabilidade.'),

  (330, 'clausula', 'Composse — Cláusula: nulidade de atos estranhos à composse', null, null, false,
   'São expressamente vedados, sendo nulos e inoperantes com relação aos COMPOSSUIDORES RURAIS, os atos de qualquer administrador ou procurador que os envolverem em obrigações relativas a negócios ou operações estranhas à COMPOSSE objeto deste instrumento.'),

  -- ── Capítulo IV: penhor ───────────────────────────────────────────────
  (340, 'capitulo', 'Composse — Capítulo IV: Do penhor', null, null, false,
   'Do Penhor'),

  (350, 'clausula', 'Composse — Cláusula: autorização do penhor', null, 'penhor', false,
   'Os COMPOSSUIDORES autorizam, desde já, que sejam oferecidos em garantia de financiamentos a serem concedidos por Instituições Financeiras, durante toda a vigência deste instrumento, a totalidade da produção a ser auferida nos imóveis rurais objetos desta COMPOSSE, bem como os materiais agrários, benfeitorias e semoventes de sua posse ou propriedade ali localizados.'),

  (360, 'clausula', 'Composse — Cláusula: prazo do penhor por safra', null, null, false,
   'Os COMPOSSUIDORES declaram ter plena ciência de que o penhor dos produtos dados em garantia em cada safra valerá pelo prazo da respectiva obrigação garantida, em conformidade com o artigo 1.439 do Código Civil, não podendo ser superior ao período de vigência deste instrumento.'),

  (370, 'clausula', 'Composse — Cláusula: destinação prioritária à liquidação', null, null, false,
   'Os COMPOSSUIDORES autorizam ainda que sejam destinados prioritariamente o produto oriundo da venda da produção financiada e/ou de bens vinculados, à liquidação dos respectivos débitos contraídos, antes mesmo do pagamento e/ou repartição dos frutos desta COMPOSSE.'),

  (380, 'clausula', 'Composse — Cláusula: fiscalização pelas instituições financeiras', null, null, false,
   'Os COMPOSSUIDORES declaram ter plena ciência do direito que assiste às Instituições Financeiras de fiscalizar os empreendimentos financiados e vistoriar os bens vinculados.'),

  -- ── Capítulo V: disposições gerais ────────────────────────────────────
  (390, 'capitulo', 'Composse — Capítulo V: Disposições gerais', null, null, false,
   'Disposições Gerais'),

  (400, 'clausula', 'Composse — Cláusula: vedação de cessão sem consentimento', null, null, false,
   'Nenhuma das partes poderá ceder ou transferir direitos e obrigações decorrentes deste INSTRUMENTO, salvo mediante prévio e expresso consentimento por escrito dos demais signatários.'),

  (410, 'clausula', 'Composse — Cláusula: preservação dos recursos naturais', null, null, false,
   'Obrigam-se as partes à preservação dos recursos naturais existentes nas áreas ocupadas pela COMPOSSE na forma da lei.'),

  (420, 'clausula', 'Composse — Cláusula: irrevogabilidade e foro', null, 'foro', false,
   'Este instrumento constitui acordo irrevogável e irretratável entre as PARTES, obrigando seus respectivos herdeiros e sucessores, podendo ser rescindido mediante distrato em comum acordo, sendo que nenhuma alteração terá qualquer efeito, a menos que feita por escrito e assinada por cada um dos COMPOSSUIDORES RURAIS, elegendo as partes o foro da Comarca de {{ instrumento.foroComarca }}, Estado de {{ instrumento.foroUfExtenso }}, para dirimir quaisquer conflitos.'),

  (430, 'livre', 'Composse — Fecho e assinaturas', null, null, false,
   'E assim, por estarem justos e contratados, os COMPOSSUIDORES RURAIS assinam este INSTRUMENTO em {{ instrumento.numeroVias }} ({{ instrumento.numeroViasExtenso }}) vias de igual teor e forma, perante as 02 (duas) testemunhas abaixo.

{{ instrumento.foroComarca }}/{{ instrumento.foroUf }}, {{ instrumento.dataAssinatura }}.

{{#signatarios sep="\n\n"}}_______________________________________
*{{ signatario.nomeMaiusculo }}*
{{ signatario.papel }}{{#signatario.qualificacao}}
{{ signatario.qualificacao }}{{/signatario.qualificacao}}{{/signatarios}}'),

  (440, 'livre', 'Composse — Anexo Único', null, null, true,
   '*ANEXO ÚNICO*

Descrição das áreas objeto do Instrumento Particular de Constituição de Composse Rural Pro Indiviso firmado por {{ instrumento.nomeComposse }}, em {{ instrumento.dataAssinatura }}, sendo:

| Item | Área cedida | Área total do imóvel | Nome do imóvel | Matrícula | Município/Estado | Proprietário |
| :--: | --: | --: | :-- | :--: | :--: | :-- |
{{#imoveisDoAnexo sep="
"}}| {{ imovel.alinea }} | {{ imovel.areaCedida }} | {{ imovel.area }} | {{ imovel.denominacao }} | {{ imovel.numero }} | {{ imovel.municipio }}/{{ imovel.uf }} | {{ imovel.proprietario }} |{{/imoveisDoAnexo}}')

  ) as t(ordem, tipo, nome, repete, ancora, reinicia, conteudo)
  order by 1
loop
  insert into public.tmpl_bloco (nome, categoria, tipo, repete_colecao, ancora, reinicia_numeracao, ativo)
  values (r.nome, 'composse-rural', r.tipo, r.repete, r.ancora, r.reinicia, true)
  returning id into v_bloco;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (v_bloco, 1, true, r.conteudo,
          'Semeadura inicial a partir do template oficial da banca (migration 20260901190315).');

  insert into public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
  values (v_doc, v_bloco, r.ordem, true);
end loop;

end $$;
