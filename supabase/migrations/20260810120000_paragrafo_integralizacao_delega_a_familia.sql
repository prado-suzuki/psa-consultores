-- O parágrafo de integralização passa a DELEGAR a descrição do imóvel à família
-- de variantes, e as variantes ganham a ênfase da casa.
--
-- O PROBLEMA QUE ISSO RESOLVE
-- O bloco "Parágrafo, Integralização de imóveis (por sócio)" descrevia o imóvel
-- com a redação rural escrita à mão ("um imóvel rural, com área de…, denominado
-- …"). Todo imóvel saía rural: o imóvel urbano do cliente aparecia no contrato
-- como "um imóvel rural denominado Sala Comercial 1204", sem endereço, sem área
-- construída e sem inscrição municipal, porque o texto não tinha onde pôr isso.
-- As 5 variantes semeadas em 20260806140000 existem exatamente para isso, mas não
-- eram usadas por ninguém: a família não era referenciada por modelo nenhum.
--
-- COMO PASSA A FUNCIONAR
-- O engine ganhou a inclusão de família ({{familia nome="…"}}, ver
-- src/lib/templates/familia.ts): dentro do laço {{#imoveis}}, cada alínea resolve
-- a SUA variante a partir dos dados daquele imóvel. O parágrafo continua sendo o
-- repetidor sobre `integralizacoes` (um por sócio, agrupamento que a casa usa) e
-- segue dono do caput, da alínea e da referência cruzada; o que sai dele é só a
-- descrição do imóvel.
--
-- POR QUE A CABEÇA CONTINUA SEM `repete_colecao`
-- Ela não é um bloco do modelo: ninguém a adiciona a um documento. A família é
-- citada POR DENTRO do bloco hospedeiro, e é o hospedeiro que repete. Era a
-- decisão que o seed deixou pendente ("ou nasce coleção de imóveis de topo, ou a
-- resolução desce para dentro do laço") — ficou a segunda, porque uma coleção de
-- imóveis de topo daria um parágrafo por imóvel e perderia tanto o agrupamento
-- por sócio quanto a referência "descrito na alínea 'a' do parágrafo segundo".
--
-- O QUE MUDA NO TEXTO, ALÉM DA DELEGAÇÃO
--   1. O ramo de REFERÊNCIA também dizia "imóvel rural". Como ele não descreve o
--      imóvel (só aponta para a alínea onde ele já foi descrito), o tipo sai da
--      frase: "Imóvel descrito na alínea 'a' do parágrafo segundo".
--   2. O conteúdo antigo tinha quebras de linha e indentação no MEIO das frases,
--      herdadas do recorte do SQL que o escreveu, e elas iam para o contrato
--      porque o render é literal. O novo conteúdo é de uma linha só (a única
--      quebra é a que separa o caput das alíneas).
--   3. As variantes recebem a ênfase que o parágrafo antigo tinha (área,
--      denominação, rótulo da matrícula, valor e fração em negrito), para o
--      contrato gerado continuar com a mesma cara, e cada peça opcional
--      (livro, folha, CCIR, endereço, inscrição municipal, confrontações) passa a
--      ser condicionada, como o parágrafo antigo já fazia.
--
-- NOVA VERSÃO no hospedeiro, EDIÇÃO NO LUGAR nas variantes
-- O hospedeiro já produziu documento, então a redação antiga vira história
-- (numero_versao anterior, atual=false) e a nova entra como atual — documento já
-- selado segue renderizando do seu snapshot_versoes_blocos. As variantes nunca
-- produziram documento (nenhum modelo as citava, nenhum snapshot as referencia),
-- então a ênfase corrige a v1 no lugar, como fez 20260806160000.
--
-- Idempotente: o hospedeiro só ganha versão nova se a atual ainda não citar a
-- família, e as variantes recebem um texto final (reaplicar grava o mesmo valor).
--
-- Reversão:
--   1) apagar a versão nova do hospedeiro e devolver atual=true à anterior;
--   2) reaplicar 20260806140000 e 20260806160000 sobre as 5 variantes (é de lá que
--      vem a transcrição sem ênfase e sem os condicionais).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Redação final das 5 variantes: a transcrição dos modelos Word, agora com a
--    ênfase da casa (marcas `*`) e com CADA PEÇA OPCIONAL condicionada, do mesmo
--    jeito que o parágrafo antigo já fazia.
--
--    Por que os condicionais entram junto: o cadastro real tem imóvel urbano
--    APROVADO sem endereço (Mms Agro, prod) e urbano nunca tem CCIR. Sem guarda,
--    o contrato sairia com "localizado na , s/nº, ," e "sob o nº .". A regra é a
--    da casa: o que pode faltar não escreve o pedaço da frase.
--
--    O que NÃO muda: a estrutura das frases, a ordem dos elementos e a forma
--    "do Cartório de Registro de Imóveis de {{ comarca }}", todas como
--    transcritas dos modelos Word em 20260806140000.
-- ---------------------------------------------------------------------------
do $texto$
declare
  cabeca uuid;
  d record;
begin
  select id into cabeca from public.tmpl_bloco
   where nome = 'Descrição de imóvel' and familia_id is null;
  if cabeca is null then
    raise notice 'Família "Descrição de imóvel" não encontrada — nada a fazer.';
    return;
  end if;

  for d in
    select *
      from (values
        (
          'Direitos de escritura não averbada',
          $blk$Um imóvel rural com área de *{{ imovel.area }} ({{ imovel.areaExtenso }})*, denominado *{{ imovel.denominacao }}*, de posse/propriedade de {{ imovel.proprietario }}, situado no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}, com registro na *matrícula de nº *{{ imovel.numero }}{{#imovel.livro}}, no Livro {{ imovel.livroExtenso }}{{/imovel.livro}}{{#imovel.folha}}, Folhas/Ficha {{ imovel.folhaExtenso }}{{/imovel.folha}} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}{{#imovel.ccir}}, inscrito no cadastro de imóvel rural sob o nº {{ imovel.ccir }}{{/imovel.ccir}}, cujos direitos e créditos são provenientes do Instrumento Particular de Contrato de Promessa de Venda e Compra de Imóvel Rural firmado em {{ imovel.promessaData }}, contrato este no qual {{ imovel.proprietario }} figura como Promissário Comprador (cujas obrigações dele foram totalmente cumpridas e quitadas) e como Promissária Vendedora {{ imovel.promissariaVendedora }}, pelo valor de *R$ {{ imovel.valor }} ({{ imovel.valorExtenso }})*.$blk$
        ),
        (
          'Rural, propriedade exclusiva',
          $blk$Um imóvel rural com área de *{{ imovel.area }} ({{ imovel.areaExtenso }})*, denominado *{{ imovel.denominacao }}*, de propriedade de {{ imovel.proprietario }}, situado no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}, com registro na *matrícula de nº *{{ imovel.numero }}{{#imovel.livro}}, no Livro {{ imovel.livroExtenso }}{{/imovel.livro}}{{#imovel.folha}}, Folhas/Ficha {{ imovel.folhaExtenso }}{{/imovel.folha}} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}, no valor de *R$ {{ imovel.valor }} ({{ imovel.valorExtenso }})*{{#imovel.ccir}}, inscrito no cadastro de imóvel rural sob o nº {{ imovel.ccir }}{{/imovel.ccir}}{{#imovel.confrontacoes}}, com os seguintes limites e confrontações: {{ imovel.confrontacoes }}{{/imovel.confrontacoes}}.$blk$
        ),
        (
          'Rural, condomínio',
          $blk$*{{ imovel.percentual }}* ({{ imovel.percentualExtenso }}) de um imóvel rural com área de *{{ imovel.area }} ({{ imovel.areaExtenso }})*, denominado *{{ imovel.denominacao }}*, de propriedade de {{ imovel.proprietario }}, situado no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}, com registro na *matrícula de nº *{{ imovel.numero }}{{#imovel.livro}}, no Livro {{ imovel.livroExtenso }}{{/imovel.livro}}{{#imovel.folha}}, Folhas/Ficha {{ imovel.folhaExtenso }}{{/imovel.folha}} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}, no valor de *R$ {{ imovel.valor }} ({{ imovel.valorExtenso }})*{{#imovel.ccir}}, inscrito no cadastro de imóvel rural sob o nº {{ imovel.ccir }}{{/imovel.ccir}}{{#imovel.confrontacoes}}, com os seguintes limites e confrontações: {{ imovel.confrontacoes }}{{/imovel.confrontacoes}}. A área remanescente deste imóvel é de propriedade dos seguintes condôminos: {{ imovel.remanescente }}.$blk$
        ),
        (
          'Urbano, propriedade exclusiva',
          $blk$Um imóvel urbano com área total de *{{ imovel.area }} ({{ imovel.areaExtenso }})*{{#imovel.temAreaConstruida}}, sendo {{ imovel.areaConstruida }} de área construída{{/imovel.temAreaConstruida}}{{#imovel.enderecoLogradouro}}, localizado na {{ imovel.enderecoLogradouro }}, {{ imovel.enderecoNumeroProsa }}{{#imovel.enderecoComplemento}}, {{ imovel.enderecoComplemento }}{{/imovel.enderecoComplemento}}{{#imovel.enderecoBairro}}, {{ imovel.enderecoBairro }}{{/imovel.enderecoBairro}}{{/imovel.enderecoLogradouro}}, no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}{{#imovel.enderecoCep}}, CEP {{ imovel.enderecoCep }}{{/imovel.enderecoCep}}, de propriedade de {{ imovel.proprietario }}, com registro na *matrícula de nº *{{ imovel.numero }}{{#imovel.livro}}, no Livro {{ imovel.livroExtenso }}{{/imovel.livro}}{{#imovel.folha}}, Folhas/Ficha {{ imovel.folhaExtenso }}{{/imovel.folha}} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}{{#imovel.inscricaoMunicipal}}, inscrito no cadastro municipal sob o nº {{ imovel.inscricaoMunicipal }}{{/imovel.inscricaoMunicipal}}, no valor de *R$ {{ imovel.valor }} ({{ imovel.valorExtenso }})*{{#imovel.confrontacoes}}, e com os seguintes limites e confrontações: {{ imovel.confrontacoes }}{{/imovel.confrontacoes}}.$blk$
        ),
        (
          'Urbano, condomínio',
          $blk$*{{ imovel.percentual }}* ({{ imovel.percentualExtenso }}) de um imóvel urbano com área total de *{{ imovel.area }} ({{ imovel.areaExtenso }})*{{#imovel.temAreaConstruida}}, sendo {{ imovel.areaConstruida }} de área construída{{/imovel.temAreaConstruida}}{{#imovel.enderecoLogradouro}}, localizado na {{ imovel.enderecoLogradouro }}, {{ imovel.enderecoNumeroProsa }}{{#imovel.enderecoComplemento}}, {{ imovel.enderecoComplemento }}{{/imovel.enderecoComplemento}}{{#imovel.enderecoBairro}}, {{ imovel.enderecoBairro }}{{/imovel.enderecoBairro}}{{/imovel.enderecoLogradouro}}, no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}{{#imovel.enderecoCep}}, CEP {{ imovel.enderecoCep }}{{/imovel.enderecoCep}}, de propriedade de {{ imovel.proprietario }}, com registro na *matrícula de nº *{{ imovel.numero }}{{#imovel.livro}}, no Livro {{ imovel.livroExtenso }}{{/imovel.livro}}{{#imovel.folha}}, Folhas/Ficha {{ imovel.folhaExtenso }}{{/imovel.folha}} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}{{#imovel.inscricaoMunicipal}}, inscrito no cadastro municipal sob o nº {{ imovel.inscricaoMunicipal }}{{/imovel.inscricaoMunicipal}}, no valor de *R$ {{ imovel.valor }} ({{ imovel.valorExtenso }})*{{#imovel.confrontacoes}}, e com os seguintes limites e confrontações: {{ imovel.confrontacoes }}{{/imovel.confrontacoes}}. A área remanescente deste imóvel é de propriedade dos seguintes condôminos: {{ imovel.remanescente }}.$blk$
        )
      ) as t(rotulo, conteudo)
  loop
    update public.tmpl_bloco_versao v
       set conteudo = d.conteudo
      from public.tmpl_bloco b
     where b.id = v.bloco_id
       and b.familia_id = cabeca
       and b.variante_rotulo = d.rotulo
       and v.atual;
  end loop;
end
$texto$;

-- ---------------------------------------------------------------------------
-- 2. Nova versão do parágrafo hospedeiro, delegando a descrição à família.
-- ---------------------------------------------------------------------------
do $mig$
declare
  bloco uuid;
  proxima integer;
begin
  select id into bloco
    from public.tmpl_bloco
   where nome = 'Parágrafo — Integralização de imóveis (por sócio)';

  if bloco is null then
    raise notice 'Bloco hospedeiro não encontrado — nada a fazer.';
    return;
  end if;

  if exists (
    select 1 from public.tmpl_bloco_versao
     where bloco_id = bloco and atual and conteudo like '%{{familia nome=%'
  ) then
    raise notice 'Parágrafo já delega à família — nada a fazer.';
    return;
  end if;

  select coalesce(max(numero_versao), 0) + 1 into proxima
    from public.tmpl_bloco_versao where bloco_id = bloco;

  update public.tmpl_bloco_versao set atual = false where bloco_id = bloco and atual;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (
    bloco,
    proxima,
    true,
    -- Uma linha só por frase: quebra de linha no conteúdo vai literal para o
    -- contrato. A única aqui separa o caput das alíneas.
    $novo$O sócio *{{ socio.nome }}* subscreve e integraliza neste ato junto ao capital social da sociedade{{#socio.vlrTotal}} o montante de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}),{{/socio.vlrTotal}} através dos bens imóveis abaixo descritos, sendo:
{{#imoveis sep="\n\n"}}{{ imovel.alinea }}) {{#completa}}{{familia nome="Descrição de imóvel"}}{{/completa}}{{#referencia}}{{#imovel.fracionado}}{{ imovel.percentual }} ({{ imovel.percentualExtenso }}) de um imóvel{{/imovel.fracionado}}{{#imovel.inteiro}}Imóvel{{/imovel.inteiro}} descrito na alínea "{{ imovel.refAlinea }}" do {{ refItem.ref }}, desta cláusula, matrícula de n.º {{ imovel.numero }}, de propriedade de {{ imovel.proprietario }}{{#imovel.valor}}, no valor de R$ {{ imovel.valor }} ({{ imovel.valorExtenso }}){{/imovel.valor}}{{#imovel.fracionado}}, sendo a área remanescente deste imóvel de {{ imovel.remanescente }}{{/imovel.fracionado}}.{{/referencia}}{{/imoveis}}$novo$,
    'Descrição do imóvel delegada à família "Descrição de imóvel": cada alínea resolve a redação do seu caso (rural/urbano, exclusiva/condomínio, direitos não averbados) em vez de todas saírem como rural. O ramo de referência deixa de afirmar "rural", e o texto perde as quebras de linha que iam para o contrato no meio das frases.'
  );
end
$mig$;

-- ---------------------------------------------------------------------------
-- 3. A descrição da cabeça passa a ensinar como referenciá-la (é o texto que a
--    Biblioteca mostra no deck de variantes).
-- ---------------------------------------------------------------------------
update public.tmpl_bloco
   set descricao = 'Família de variantes: uma redação por caso de imóvel (rural x urbano, exclusiva x condomínio, propriedade x direitos). Não se adiciona ao modelo: escreva {{familia nome="Descrição de imóvel"}} dentro do bloco que descreve os imóveis (ex.: no laço {{#imoveis}} do parágrafo de integralização) e a variante é escolhida por imóvel na geração.'
 where nome = 'Descrição de imóvel' and familia_id is null;

COMMIT;
