-- Blocos que faltavam, apurados comparando os modelos com os contratos
-- registrados da MMS Agro e da MMS Participações (Jucemat, 21/09/2022).
--
-- O QUE ESTAVA ERRADO
-- Os dois modelos compartilhavam o MESMO bloco de capital, escrito para a Agro
-- ("por meio dos bens imóveis e valor em moeda corrente nacional arrolados no
-- parágrafo X desta cláusula") e repetindo sobre `integralizacoes`. A holding de
-- participações integraliza em DINHEIRO, e o que ela tem é o quadro societário:
-- sócios e valores digitados na tela de Quadro Societário. Gerando pelo modelo de
-- Participações, a cláusula de capital saía falando de imóveis que não existem.
-- O mesmo vale para o parágrafo único do objeto: só existia a versão agropecuária
-- ("As atividades agropecuárias descritas acima poderão ser exercidas...").
--
-- 1. CAPITAL EM MOEDA CORRENTE (bloco novo)
-- Lista os sócios do QUADRO ({{#socios}}), não das integralizações, e usa a
-- enumeração romana que passou a ser publicada no item de sócio. O capital e o
-- total de quotas já vêm somados do quadro para empresa não-PR
-- (calcularCapitalSociedade).
--
-- 2. PARÁGRAFO DO OBJETO, VERSÃO HOLDING (bloco novo)
-- Os dois CNAEs entram literais: são sempre os mesmos para holding não-financeira,
-- e o cadastro não tem onde guardar lista de CNAE (cod_cnae existe em
-- contribuinte, não em pessoa). Documento que precisar de outro ajusta por override.
--
-- 3. FECHO (versão nova do bloco que já existia)
-- Ganha três coisas do contrato real: o papel embaixo de cada assinatura ("Sócia
-- administradora e Outorga Conjugal"), o visto do advogado com nome e OAB, e as
-- testemunhas nomeadas. O papel usa três condicionais novas do item de sócio
-- (administrador / naoAdministrador / exigeOutorgaConjugal); a outorga sai pelo
-- regime de bens, dispensada só na separação absoluta (art. 1.647 do Código Civil).
-- Advogado e testemunhas são placeholders livres: viram campo de texto na tela
-- Gerar e resolvem em branco quando não preenchidos, então a linha assinável
-- continua saindo como antes se ninguém digitar nada.
-- Versão NOVA, não edição: este bloco já produziu documento selado.
--
-- 4. ORDEM DAS CLÁUSULAS DA REUNIÃO DE SÓCIOS
-- Nos dois contratos registrados a Instalação (Décima Sexta) vem ANTES das
-- Competências (Décima Sétima); nos modelos estava invertido, o que desloca a
-- numeração de todas as cláusulas seguintes. Corrigido nos dois.
--
-- 5. O QUE NÃO ENTRA AQUI (decisão do Bernardo)
-- O parágrafo de integralização de imóveis fica como está: falta nele a outorga
-- conjugal e a alínea do troco em moeda corrente ("i) O valor de R$ 1,64 em moeda
-- corrente nacional"), e essa segunda é mudança de CÁLCULO, não de texto: hoje a
-- sobra do arredondamento das quotas é jogada nas quotas do último sócio
-- (calcularParticipacoesPR), enquanto o contrato da casa paga a diferença em
-- dinheiro. Fica para uma frente própria.
--
-- Idempotente: sai fora se o bloco de capital em moeda corrente já existir.
--
-- Reversão: apagar os dois blocos novos, devolver atual=true à versão anterior do
-- fecho, e refazer as trocas no modelo de Participações (o bloco antigo continua
-- na Biblioteca).

BEGIN;

do $mig$
declare
  doc_part uuid;
  doc_agro uuid;
  b_capital_moeda uuid;
  b_objeto_holding uuid;
  b_fecho uuid;
  b_instalacao uuid;
  b_competencias uuid;
  proxima integer;
  doc uuid;
  ord_comp integer;
  ord_ultimo integer;
begin
  if exists (select 1 from public.tmpl_bloco where nome = 'Cláusula — Capital social integralizado em moeda corrente') then
    raise notice 'Blocos já cadastrados, nada a fazer.';
    return;
  end if;

  select id into doc_part from public.tmpl_documento where nome = 'Contrato Social — Sociedade Limitada (Participações)';
  select id into doc_agro from public.tmpl_documento where nome = 'Contrato Social — Sociedade Limitada (Agro)';

  -- ----------------------------------------------------------------- 1 --------
  insert into public.tmpl_bloco (nome, categoria, tipo, descricao)
  values (
    'Cláusula — Capital social integralizado em moeda corrente',
    'contrato-social',
    'clausula',
    'Capital subscrito e integralizado em dinheiro, com os sócios e os valores vindos do Quadro Societário. Alternativa ao capital da Agro, que arrola bens imóveis.'
  ) returning id into b_capital_moeda;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (
    b_capital_moeda, 1, true,
    $blk$O capital social da empresa será de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ 1,00 (um real) cada uma, sendo subscrito e integralizado da forma que segue: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor nominal de R$ 1,00 (um real) cada uma, totalizando R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}), integralizadas neste ato {{ socio.peloSocio }} *{{ socio.nomeMaiusculo }}* em moeda corrente nacional{{/socios}}; estando o capital social da empresa totalmente subscrito e integralizado pelos sócios e assim distribuído:$blk$,
    'Transcrição da Cláusula Quinta do contrato registrado da MMS Participações Ltda.'
  );

  -- ----------------------------------------------------------------- 2 --------
  insert into public.tmpl_bloco (nome, categoria, tipo, descricao)
  values (
    'Parágrafo — Objeto social (holding de participações)',
    'contrato-social',
    'paragrafo',
    'Codificação fiscal (CNAE) da holding não-financeira. Alternativa ao parágrafo do objeto agropecuário.'
  ) returning id into b_objeto_holding;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (
    b_objeto_holding, 1, true,
    $blk$Conforme descrição do objeto social, dispõe os sócios sobre a codificação fiscal (CNAE) relativa às atividades econômicas elencadas acima:
• 6462-0/00 - Holdings de instituições não-financeiras;
• 6463-8/00 - Outras sociedades de participação, exceto holdings.$blk$,
    'Transcrição do Parágrafo Único da Cláusula Quarta do contrato registrado da MMS Participações Ltda.'
  );

  -- ----------------------------------------------------------------- 3 --------
  select id into b_fecho from public.tmpl_bloco where nome = 'Fecho e assinaturas';

  select coalesce(max(numero_versao), 0) + 1 into proxima
    from public.tmpl_bloco_versao where bloco_id = b_fecho;
  update public.tmpl_bloco_versao set atual = false where bloco_id = b_fecho and atual;

  insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
  values (
    b_fecho, proxima, true,
    $blk$E, por estarem assim justos, certos e contratados, declaram de inteiro acordo, conforme cláusulas e condições prescritas, e assinam o presente instrumento na presença das testemunhas abaixo nomeadas.

{{ foroComarca }}/{{ foroUf }}, {{ dataAssinatura }}.


{{#socios sep="\n\n"}}_______________________________________
*{{ socio.nome }}*
{{#socio.administrador}}{{ socio.socioAdministrador }}{{/socio.administrador}}{{#socio.naoAdministrador}}{{ socio.socioTitulo }}{{/socio.naoAdministrador}}{{#socio.exigeOutorgaConjugal}} e Outorga Conjugal{{/socio.exigeOutorgaConjugal}}{{/socios}}


_______________________________________
{{ advogadoNome }}
OAB/{{ advogadoOabUf }} {{ advogadoOabNumero }}
Advogado

Testemunhas:

1. _______________________________  Nome: {{ testemunha1Nome }}  RG: {{ testemunha1Rg }}  CPF/MF: {{ testemunha1Cpf }}
2. _______________________________  Nome: {{ testemunha2Nome }}  RG: {{ testemunha2Rg }}  CPF/MF: {{ testemunha2Cpf }}$blk$,
    'Papel embaixo de cada assinatura (sócio/administrador e outorga conjugal, pelo regime de bens), visto do advogado com nome e OAB, e testemunhas nomeadas, como nos contratos registrados da MMS.'
  );

  -- ----------------------------------------------------------------- 4 --------
  -- Participações: capital e parágrafo do objeto trocam de bloco, e o parágrafo de
  -- integralização de imóveis sai (o capital dela é dinheiro do quadro societário).
  update public.tmpl_documento_bloco db
     set bloco_id = b_capital_moeda
   where db.documento_id = doc_part
     and db.bloco_id = (select id from public.tmpl_bloco where nome = 'Capital Social - Agro');

  update public.tmpl_documento_bloco db
     set bloco_id = b_objeto_holding
   where db.documento_id = doc_part
     and db.bloco_id = (select id from public.tmpl_bloco where nome = 'Parágrafo — Objeto social');

  delete from public.tmpl_documento_bloco
   where documento_id = doc_part
     and bloco_id = (select id from public.tmpl_bloco where nome = 'Parágrafo — Integralização de imóveis (por sócio)');

  -- ----------------------------------------------------------------- 5 --------
  -- Instalação da Reunião (e seus 3 parágrafos) passa a vir antes das Competências,
  -- como nos dois contratos registrados. Usa a ordem atual como referência: a
  -- Competências assume a posição do último parágrafo da Instalação, e o bloco da
  -- Instalação e os seus parágrafos sobem uma casa.
  select id into b_competencias from public.tmpl_bloco where nome = 'Cláusula — Competências da Reunião de Sócios';
  select id into b_instalacao from public.tmpl_bloco where nome = 'Cláusula — Instalação da Reunião de Sócios';

  for doc in select unnest(array[doc_agro, doc_part]) loop
    select ordem into ord_comp from public.tmpl_documento_bloco
     where documento_id = doc and bloco_id = b_competencias;
    select max(db.ordem) into ord_ultimo
      from public.tmpl_documento_bloco db
      join public.tmpl_bloco b on b.id = db.bloco_id
     where db.documento_id = doc
       and b.nome like 'Parágrafo — Instalação da Reunião de Sócios%';

    if ord_comp is null or ord_ultimo is null or ord_comp > ord_ultimo then
      raise notice 'Ordem da Reunião de Sócios já está correta em %', doc;
    else
      -- Sobe a Instalação e os parágrafos dela uma casa; desce a Competências para
      -- o fim do grupo. `ordem` é inteiro sem unicidade, então dá em dois passos.
      update public.tmpl_documento_bloco db
         set ordem = db.ordem - 1
       where db.documento_id = doc
         and db.ordem > ord_comp and db.ordem <= ord_ultimo;

      update public.tmpl_documento_bloco
         set ordem = ord_ultimo
       where documento_id = doc and bloco_id = b_competencias;
    end if;
  end loop;
end
$mig$;

COMMIT;
