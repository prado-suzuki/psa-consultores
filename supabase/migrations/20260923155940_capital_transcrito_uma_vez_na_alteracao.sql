-- A nova redação da cláusula de capital saía transcrita em toda resolução que
-- mexe em quotas: aumento, integralização e novo quadro repetiam a mesma
-- Cláusula Quinta três vezes na mesma peça. Cada bloco foi escrito para valer
-- sozinho, e juntos se repetem.
--
-- A transcrição fica numa resolução só, a última de capital presente
-- (`redacaoDoCapital`, em mapeadores.ts): o novo quadro, senão a integralização,
-- senão a cessão, senão o aumento. As demais narram o ato sem repeti-la.
--
-- Só dados. Nova versão sobre a vigente, e apenas quando a vigente é o texto
-- que esta migration conhece; reaplicar não empilha nada.

do $$
declare
  r record;
  v_versao_id uuid;
  v_proxima integer;
begin
  for r in
    select *
      from (values
        (
          'ac000001-0000-4000-8000-000000000002'::uuid,
          $txt${{#sociedade.houveAumentoCapital}}Aumenta-se o capital social em R$ {{ sociedade.capitalDelta }} ({{ sociedade.capitalDeltaExtenso }}), de modo que o capital social anterior de R$ {{ sociedade.capitalAnterior }} ({{ sociedade.capitalAnteriorExtenso }}) passará a ser de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), modificando-se, consequentemente, as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, totalmente subscrito e integralizado, assim distribuído entre os sócios: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}), pertencentes a *{{ socio.nomeMaiusculo }}*{{/socios}}.”{{/sociedade.houveAumentoCapital}}$txt$,
          $txt${{#sociedade.houveAumentoCapital}}Aumenta-se o capital social em R$ {{ sociedade.capitalDelta }} ({{ sociedade.capitalDeltaExtenso }}), de modo que o capital social anterior de R$ {{ sociedade.capitalAnterior }} ({{ sociedade.capitalAnteriorExtenso }}) passará a ser de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}){{#redacaoCapital.noAumento}}, modificando-se, consequentemente, as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, totalmente subscrito e integralizado, assim distribuído entre os sócios: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}), pertencentes a *{{ socio.nomeMaiusculo }}*{{/socios}}.”{{/redacaoCapital.noAumento}}{{#redacaoCapital.foraDoAumento}}.{{/redacaoCapital.foraDoAumento}}{{/sociedade.houveAumentoCapital}}$txt$
        ),
        (
          'ac000001-0000-4000-8000-000000000003'::uuid,
          $txt$Formaliza-se a cessão e transferência onerosa de quotas ajustada entre as partes, em caráter irrevogável e irretratável, com mútua, plena, geral e irrevogável quitação.
{{#cessoes sep="\n"}}    {{ cessao.ordemRomana }}) *{{ cedente.nomeMaiusculo }}*, {{ cedente.inscrito }} no CPF/CNPJ sob o nº {{ cedente.cpfCnpj }}, cede e transfere {{ cessao.quotas }} ({{ cessao.quotasExtenso }}) quotas, no valor total de R$ {{ cessao.valor }} ({{ cessao.valorExtenso }}), a *{{ cessionario.nomeMaiusculo }}*, {{ cessionario.inscrito }} no CPF/CNPJ sob o nº {{ cessionario.cpfCnpj }}.{{/cessoes}}

Em razão da cessão, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, assim distribuído: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) *{{ socio.nomeMaiusculo }}*, {{ socio.inscrito }} no CPF/CNPJ sob o nº {{ socio.cpfCnpj }}, titular de {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}){{/socios}}.”$txt$,
          $txt$Formaliza-se a cessão e transferência onerosa de quotas ajustada entre as partes, em caráter irrevogável e irretratável, com mútua, plena, geral e irrevogável quitação.
{{#cessoes sep="\n"}}    {{ cessao.ordemRomana }}) *{{ cedente.nomeMaiusculo }}*, {{ cedente.inscrito }} no CPF/CNPJ sob o nº {{ cedente.cpfCnpj }}, cede e transfere {{ cessao.quotas }} ({{ cessao.quotasExtenso }}) quotas, no valor total de R$ {{ cessao.valor }} ({{ cessao.valorExtenso }}), a *{{ cessionario.nomeMaiusculo }}*, {{ cessionario.inscrito }} no CPF/CNPJ sob o nº {{ cessionario.cpfCnpj }}.{{/cessoes}}{{#redacaoCapital.naCessao}}

Em razão da cessão, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, assim distribuído: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) *{{ socio.nomeMaiusculo }}*, {{ socio.inscrito }} no CPF/CNPJ sob o nº {{ socio.cpfCnpj }}, titular de {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}){{/socios}}.”{{/redacaoCapital.naCessao}}$txt$
        ),
        (
          'ac000001-0000-4000-8000-000000000004'::uuid,
          $txt$Integralizam-se as quotas subscritas, nos termos e pelos valores abaixo:

{{#integralizacoes sep="\n\n"}}{{ socio.ordemRomana }}) {{ socio.peloSocio }} *{{ socio.nomeMaiusculo }}*, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}):
{{#aportes sep="\n"}}    {{ aporte.alinea }}) {{#seImovel}}{{familia nome="Descrição de imóvel"}}, pelo valor de R$ {{ aporte.valor }} ({{ aporte.valorExtenso }}){{/seImovel}}{{#seMoeda}}em moeda corrente nacional, no valor de R$ {{ aporte.valor }} ({{ aporte.valorExtenso }}){{/seMoeda}}{{#seQuotas}}mediante a transferência das {{ origem.quotas }} ({{ origem.quotasExtenso }}) quotas que possuía na sociedade *{{ origem.razaoSocial }}*, inscrita no CNPJ sob o nº {{ origem.cnpj }}, com sede na {{ origem.sede }}, registrada na Junta Comercial do Estado de {{ origem.juntaUf }} sob o NIRE nº {{ origem.nire }}, cuja alteração contratual tramita em conjunto com o presente instrumento, no valor total de R$ {{ origem.valor }} ({{ origem.valorExtenso }}){{/seQuotas}}.{{/aportes}}{{/integralizacoes}}

Em consequência, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, totalmente subscrito e integralizado, assim distribuído entre os sócios: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}), pertencentes a *{{ socio.nomeMaiusculo }}*{{/socios}}.”$txt$,
          $txt$Integralizam-se as quotas subscritas, nos termos e pelos valores abaixo:

{{#integralizacoes sep="\n\n"}}{{ socio.ordemRomana }}) {{ socio.peloSocio }} *{{ socio.nomeMaiusculo }}*, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}):
{{#aportes sep="\n"}}    {{ aporte.alinea }}) {{#seImovel}}{{familia nome="Descrição de imóvel"}}, pelo valor de R$ {{ aporte.valor }} ({{ aporte.valorExtenso }}){{/seImovel}}{{#seMoeda}}em moeda corrente nacional, no valor de R$ {{ aporte.valor }} ({{ aporte.valorExtenso }}){{/seMoeda}}{{#seQuotas}}mediante a transferência das {{ origem.quotas }} ({{ origem.quotasExtenso }}) quotas que possuía na sociedade *{{ origem.razaoSocial }}*, inscrita no CNPJ sob o nº {{ origem.cnpj }}, com sede na {{ origem.sede }}, registrada na Junta Comercial do Estado de {{ origem.juntaUf }} sob o NIRE nº {{ origem.nire }}, cuja alteração contratual tramita em conjunto com o presente instrumento, no valor total de R$ {{ origem.valor }} ({{ origem.valorExtenso }}){{/seQuotas}}.{{/aportes}}{{/integralizacoes}}{{#redacaoCapital.naIntegralizacao}}

Em consequência, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, totalmente subscrito e integralizado, assim distribuído entre os sócios: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}), pertencentes a *{{ socio.nomeMaiusculo }}*{{/socios}}.”{{/redacaoCapital.naIntegralizacao}}$txt$
        )
      ) as t(bloco_id, antigo, novo)
  loop
    select id into v_versao_id
      from public.tmpl_bloco_versao
     where bloco_id = r.bloco_id
       and atual
       and conteudo = r.antigo;

    if v_versao_id is null then
      continue;
    end if;

    select coalesce(max(numero_versao), 0) + 1 into v_proxima
      from public.tmpl_bloco_versao
     where bloco_id = r.bloco_id;

    update public.tmpl_bloco_versao set atual = false where id = v_versao_id;

    insert into public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
    values (r.bloco_id, v_proxima, true, r.novo, 'A nova redação da cláusula de capital passa a ser transcrita só na última resolução de capital presente.');
  end loop;
end $$;
