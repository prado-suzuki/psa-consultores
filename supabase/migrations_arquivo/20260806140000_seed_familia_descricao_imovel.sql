-- Seed: família "Descrição de imóvel" com as 5 variantes dos modelos Word da casa.
--
-- Transcrição dos dois modelos de referência ("Modelo de descrição de imóvel
-- rural" e "Modelo de descrição de imóvel urbano"), com os trechos entre
-- colchetes trocados pelos placeholders do vocabulário. É o primeiro uso real das
-- colunas de família criadas em 20260806120000.
--
-- POR QUE SÃO 5 E NÃO 8 VARIANTES
-- Os dois modelos somam 8 redações, mas dois eixos são de naturezas diferentes:
--   Do IMÓVEL (cabem no seletor da variante): rural x urbano, propriedade
--   exclusiva x condomínio, propriedade x direitos de escritura não averbada.
--   Do DOCUMENTO (não cabem): integralização x parceria/arrendamento. As duas
--   variantes de parceria do modelo rural são idênticas às de integralização
--   menos o valor contábil, então o seletor delas seria igual ao das de
--   integralização, e o índice único uq_tmpl_bloco_familia_seletor as barraria.
--   Isso não é limitação do índice, é o índice acusando que o eixo é do
--   documento: ele já tem lugar no engine, que são as flags de composição.
-- As 5 variantes usam o texto COM valor contábil (integralização). A supressão do
-- valor na parceria fica para a flag, não para uma sexta variante.
--
-- PLACEHOLDERS QUE AINDA NÃO EXISTEM
-- A transcrição fiel exige campos que o vocabulário (src/lib/templates/vocabulario.ts)
-- ainda não tem. Ficam escritos aqui de propósito, para o texto não nascer torto e
-- para deixar explícita a lista do que o passo de classificação precisa criar:
--   imovel.rural / imovel.urbano / imovel.posse   classificação (matricula.tipo_bem,
--                                                 matricula.tipo_exploracao_posse)
--   imovel.enderecoLogradouro / enderecoNumero /  endereço urbano (colunas criadas
--   enderecoComplemento / enderecoBairro /        em 20260806120500, em bem)
--   enderecoCep
--   imovel.areaConstruida / temAreaConstruida     bem.area_construida_m2
--   imovel.inscricaoMunicipal                     bem.inscricao_municipal
--   imovel.promessaData / promissariaVendedora    sem coluna no banco ainda
-- Enquanto não existirem, a prévia da Biblioteca os mostra como campo não
-- resolvido, que é o comportamento correto (falha cedo, nunca texto errado no
-- contrato). A família NÃO é anexada a nenhum modelo nesta migration, então
-- nenhum documento pode gerar com ela ainda.
--
-- A CABEÇA FICA SEM repete_colecao, DE PROPÓSITO
-- A variante é escolhida por IMÓVEL, e uma família resolve por INSTÂNCIA de bloco.
-- As duas granularidades só coincidem se a cabeça repetir sobre uma coleção de
-- imóveis, e hoje `imoveis` não é coleção de topo: é seção aninhada dentro de cada
-- item de `integralizacoes` (ver PAPEIS_LISTA em src/lib/templates/binding.ts,
-- secoesItem), porque o texto da casa agrupa por sócio ("o sócio X integraliza:
-- a) ... b) ..."). Cravar 'integralizacoes' aqui daria uma variante por sócio, que
-- é a granularidade errada. Fica nulo até essa decisão ser tomada junto do
-- resolvedor.
--
-- EFEITO IMEDIATO NA TELA
-- Até o card deck entrar, a Biblioteca lista as 5 variantes como cards soltos, do
-- mesmo jeito que listaria qualquer bloco: useBlocos só esconde derivados de
-- override (bloco_origem_id), ainda não conhece familia_id.
--
-- Idempotente: se a cabeça já existir, não faz nada.
--
-- Reversão (apaga as 5 variantes por cascade):
--   delete from public.tmpl_bloco where nome = 'Descrição de imóvel' and familia_id is null;

BEGIN;

do $seed$
declare
  cabeca_id uuid;
  variante_id uuid;
  d record;
begin
  select id into cabeca_id
    from public.tmpl_bloco
   where nome = 'Descrição de imóvel' and familia_id is null;

  if cabeca_id is not null then
    raise notice 'Família "Descrição de imóvel" já existe (%), seed não fez nada.', cabeca_id;
    return;
  end if;

  insert into public.tmpl_bloco (nome, categoria, tipo, descricao)
  values (
    'Descrição de imóvel',
    'capital',
    'paragrafo',
    'Família de variantes: uma redação por caso de imóvel (rural x urbano, exclusiva x condomínio, propriedade x direitos). Quem monta o modelo referencia esta cabeça; a variante é escolhida por imóvel na geração.'
  )
  returning id into cabeca_id;

  for d in
    select *
      from (values
        (
          'Direitos de escritura não averbada',
          1,
          '{"imovel.posse": "sim"}'::jsonb,
          $blk$Um imóvel rural com área de {{ imovel.area }} ({{ imovel.areaExtenso }}), denominado {{ imovel.denominacao }}, de posse/propriedade de {{ imovel.proprietario }}, situado no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}, com registro na matrícula de nº {{ imovel.numero }}, no Livro {{ imovel.livroExtenso }}, Folhas/Ficha {{ imovel.folhaExtenso }} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}, inscrito no cadastro de imóvel rural sob o nº {{ imovel.ccir }}, cujos direitos e créditos são provenientes do Instrumento Particular de Contrato de Promessa de Venda e Compra de Imóvel Rural firmado em {{ imovel.promessaData }}, contrato este no qual {{ imovel.proprietario }} figura como Promissário Comprador (cujas obrigações dele foram totalmente cumpridas e quitadas) e como Promissária Vendedora {{ imovel.promissariaVendedora }}, pelo valor de R$ {{ imovel.valor }} ({{ imovel.valorExtenso }}).$blk$
        ),
        (
          'Rural, propriedade exclusiva',
          2,
          '{"imovel.rural": "sim", "imovel.inteiro": "sim"}'::jsonb,
          $blk$Um imóvel rural com área de {{ imovel.area }} ({{ imovel.areaExtenso }}), denominado {{ imovel.denominacao }}, de propriedade de {{ imovel.proprietario }}, situado no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}, com registro na matrícula de nº {{ imovel.numero }}, no Livro {{ imovel.livroExtenso }}, Folhas/Ficha {{ imovel.folhaExtenso }} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}, no valor de R$ {{ imovel.valor }} ({{ imovel.valorExtenso }}), inscrito no cadastro de imóvel rural sob o nº {{ imovel.ccir }}, com os seguintes limites e confrontações: {{ imovel.confrontacoes }}.$blk$
        ),
        (
          'Rural, condomínio',
          3,
          '{"imovel.rural": "sim", "imovel.fracionado": "sim"}'::jsonb,
          $blk${{ imovel.percentual }} ({{ imovel.percentualExtenso }}) de um imóvel rural com área de {{ imovel.area }} ({{ imovel.areaExtenso }}), denominado {{ imovel.denominacao }}, de propriedade de {{ imovel.proprietario }}, situado no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}, com registro na matrícula de nº {{ imovel.numero }}, no Livro {{ imovel.livroExtenso }}, Folhas/Ficha {{ imovel.folhaExtenso }} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}, no valor de R$ {{ imovel.valor }} ({{ imovel.valorExtenso }}), inscrito no cadastro de imóvel rural sob o nº {{ imovel.ccir }}, com os seguintes limites e confrontações: {{ imovel.confrontacoes }}. A área remanescente deste imóvel é de propriedade dos seguintes condôminos: {{ imovel.remanescente }}.$blk$
        ),
        (
          'Urbano, propriedade exclusiva',
          4,
          '{"imovel.urbano": "sim", "imovel.inteiro": "sim"}'::jsonb,
          $blk$Um imóvel urbano com área total de {{ imovel.area }} ({{ imovel.areaExtenso }}){{#imovel.temAreaConstruida}}, sendo {{ imovel.areaConstruida }} de área construída{{/imovel.temAreaConstruida}}, localizado na {{ imovel.enderecoLogradouro }}, nº {{ imovel.enderecoNumero }}, {{#imovel.enderecoComplemento}}{{ imovel.enderecoComplemento }}, {{/imovel.enderecoComplemento}}{{ imovel.enderecoBairro }}, no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}, CEP {{ imovel.enderecoCep }}, de propriedade de {{ imovel.proprietario }}, com registro na matrícula de nº {{ imovel.numero }}, no Livro {{ imovel.livroExtenso }}, Folhas/Ficha {{ imovel.folhaExtenso }} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}, inscrito no cadastro municipal sob o nº {{ imovel.inscricaoMunicipal }}, no valor de R$ {{ imovel.valor }} ({{ imovel.valorExtenso }}), e com os seguintes limites e confrontações: {{ imovel.confrontacoes }}.$blk$
        ),
        (
          'Urbano, condomínio',
          5,
          '{"imovel.urbano": "sim", "imovel.fracionado": "sim"}'::jsonb,
          $blk${{ imovel.percentual }} ({{ imovel.percentualExtenso }}) de um imóvel urbano com área total de {{ imovel.area }} ({{ imovel.areaExtenso }}){{#imovel.temAreaConstruida}}, sendo {{ imovel.areaConstruida }} de área construída{{/imovel.temAreaConstruida}}, localizado na {{ imovel.enderecoLogradouro }}, nº {{ imovel.enderecoNumero }}, {{#imovel.enderecoComplemento}}{{ imovel.enderecoComplemento }}, {{/imovel.enderecoComplemento}}{{ imovel.enderecoBairro }}, no município de {{ imovel.municipio }}, Estado de {{ imovel.uf }}, CEP {{ imovel.enderecoCep }}, de propriedade de {{ imovel.proprietario }}, com registro na matrícula de nº {{ imovel.numero }}, no Livro {{ imovel.livroExtenso }}, Folhas/Ficha {{ imovel.folhaExtenso }} do Cartório de Registro de Imóveis de {{ imovel.comarca }}, Estado de {{ imovel.ufCartorio }}, inscrito no cadastro municipal sob o nº {{ imovel.inscricaoMunicipal }}, no valor de R$ {{ imovel.valor }} ({{ imovel.valorExtenso }}), e com os seguintes limites e confrontações: {{ imovel.confrontacoes }}. A área remanescente deste imóvel é de propriedade dos seguintes condôminos: {{ imovel.remanescente }}.$blk$
        )
      ) as t(rotulo, ordem, seletor, conteudo)
     order by ordem
  loop
    insert into public.tmpl_bloco (
      nome, categoria, tipo, familia_id, variante_seletor, variante_rotulo, variante_ordem
    )
    values (
      'Descrição de imóvel: ' || d.rotulo,
      'capital',
      -- Variante não numera nem repete por si: quem faz isso é a cabeça.
      'livre',
      cabeca_id,
      d.seletor,
      d.rotulo,
      d.ordem
    )
    returning id into variante_id;

    insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
    values (
      variante_id, 1, true, d.conteudo,
      'Transcrição inicial dos modelos Word de descrição de imóvel (rural e urbano).'
    );
  end loop;
end
$seed$;

COMMIT;
