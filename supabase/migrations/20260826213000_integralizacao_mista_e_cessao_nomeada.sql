-- Duas redações que passam a contar o ATO, e não só o efeito dele.
--
-- Frente 2 de docs/planos/ledger-societario-e-alteracao-derivada.md, itens 4 e 5.
--
-- 1. INTEGRALIZAÇÃO. A cláusula descrevia bens, porque o único aporte que a casa
--    tinha era em imóvel. O instrumento real mistura os três dentro do mesmo
--    sócio, como alíneas: imóvel, moeda corrente e as QUOTAS que o sócio tinha em
--    outra sociedade (é assim que a subida para a controladora se escreve, com a
--    proprietária qualificada por inteiro e a citação de que a alteração dela
--    tramita no mesmo processo). A seção {{#aportes}} entrega as três formas na
--    ordem do livro de movimentos, cada item com a sua condicional.
--
--    Uma observação sobre o desenho: o plano previa um BLOCO NOVO só para a
--    integralização com quotas de outra sociedade. Bloco novo exigiria flag nova,
--    e com a mesma flag `evento_integralizacao` os dois entrariam na composição
--    juntos, escrevendo a integralização duas vezes. Uma flag própria seria mais
--    uma pergunta ao consultor, contra a direção da Frente 4 (derivar, não
--    perguntar). Então é UMA cláusula com três ramos, e a qualificação completa
--    da PJ de origem mora no ramo {{#seQuotas}}.
--
-- 2. CESSÃO. A cláusula publicava só o quadro RESULTANTE: dizia o efeito sem
--    dizer o ato. Quem cedeu, para quem e quantas quotas ficava de fora, e é
--    exatamente isso que o instrumento registrado nomeia. A enumeração vem de
--    {{#cessoes}}, o livro de movimentos; com a lista vazia o parágrafo volta a
--    ler-se exatamente como lia antes, sem sobra de pontuação.
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.
--
-- A guarda pelo changelog torna a operação reaplicável sem empilhar versões, e
-- as versões anteriores ficam preservadas para os documentos já selados.

DO $$
DECLARE
  r record;
  v_proxima integer;
  v_marcador text := 'Ledger societário: alíneas mistas de integralização e cessão nomeada.';
BEGIN
  FOR r IN
    SELECT *
      FROM (VALUES
        (
          'ac000001-0000-4000-8000-000000000004'::uuid,
          $txt$Integralizam-se as quotas subscritas, nos termos e pelos valores abaixo:

{{#integralizacoes sep="\n\n"}}{{ socio.ordemRomana }}) {{ socio.peloSocio }} *{{ socio.nomeMaiusculo }}*, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}):
{{#aportes sep="\n"}}    {{ aporte.alinea }}) {{#seImovel}}{{familia nome="Descrição de imóvel"}}, pelo valor de R$ {{ aporte.valor }} ({{ aporte.valorExtenso }}){{/seImovel}}{{#seMoeda}}em moeda corrente nacional, no valor de R$ {{ aporte.valor }} ({{ aporte.valorExtenso }}){{/seMoeda}}{{#seQuotas}}mediante a transferência das {{ origem.quotas }} ({{ origem.quotasExtenso }}) quotas que possuía na sociedade *{{ origem.razaoSocial }}*, inscrita no CNPJ sob o nº {{ origem.cnpj }}, com sede na {{ origem.sede }}, registrada na Junta Comercial do Estado de {{ origem.juntaUf }} sob o NIRE nº {{ origem.nire }}, cuja alteração contratual tramita em conjunto com o presente instrumento, no valor total de R$ {{ origem.valor }} ({{ origem.valorExtenso }}){{/seQuotas}}.{{/aportes}}{{/integralizacoes}}

Em consequência, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, totalmente subscrito e integralizado, assim distribuído entre os sócios: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}), pertencentes a *{{ socio.nomeMaiusculo }}*{{/socios}}.”$txt$
        ),
        (
          'ac000001-0000-4000-8000-000000000003'::uuid,
          $txt$Formaliza-se a cessão e transferência de quotas ajustada entre as partes, em caráter irrevogável e irretratável, com mútua, plena, geral e irrevogável quitação.
{{#cessoes sep="\n"}}    {{ cessao.ordemRomana }}) *{{ cedente.nomeMaiusculo }}*, {{ cedente.inscrito }} no CPF/CNPJ sob o nº {{ cedente.cpfCnpj }}, {{#seCessao}}cede e transfere{{/seCessao}}{{#seDoacao}}doa e transfere, a título gratuito,{{/seDoacao}} {{ cessao.quotas }} ({{ cessao.quotasExtenso }}) quotas, no valor total de R$ {{ cessao.valor }} ({{ cessao.valorExtenso }}), a *{{ cessionario.nomeMaiusculo }}*, {{ cessionario.inscrito }} no CPF/CNPJ sob o nº {{ cessionario.cpfCnpj }}.{{/cessoes}}

Em razão da cessão, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, assim distribuído: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) *{{ socio.nomeMaiusculo }}*, {{ socio.inscrito }} no CPF/CNPJ sob o nº {{ socio.cpfCnpj }}, titular de {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}){{/socios}}.”$txt$
        )
      ) AS redacao(bloco_id, conteudo)
  LOOP
    IF EXISTS (
      SELECT 1
        FROM public.tmpl_bloco_versao
       WHERE bloco_id = r.bloco_id
         AND changelog = v_marcador
    ) THEN
      CONTINUE;
    END IF;

    SELECT coalesce(max(numero_versao), 0) + 1
      INTO v_proxima
      FROM public.tmpl_bloco_versao
     WHERE bloco_id = r.bloco_id;

    UPDATE public.tmpl_bloco_versao
       SET atual = false
     WHERE bloco_id = r.bloco_id
       AND atual;

    INSERT INTO public.tmpl_bloco_versao (
      bloco_id,
      numero_versao,
      atual,
      conteudo,
      changelog
    )
    VALUES (r.bloco_id, v_proxima, true, r.conteudo, v_marcador);
  END LOOP;
END $$;

-- O nome do bloco de integralização deixa de prometer só bens.
UPDATE public.tmpl_bloco
   SET nome = 'Resolução: integralização de capital',
       descricao = 'Integraliza as quotas subscritas, com as alíneas de cada sócio nas três formas que o instrumento real mistura: imóvel, moeda corrente e quotas de outra sociedade (com a PJ de origem qualificada por inteiro).',
       updated_at = now()
 WHERE id = 'ac000001-0000-4000-8000-000000000004'::uuid;

UPDATE public.tmpl_bloco
   SET descricao = 'Formaliza a cessão de quotas nomeando cedente, cessionário e quantidade (do livro de movimentos), e reproduz a nova redação da cláusula de capital.',
       updated_at = now()
 WHERE id = 'ac000001-0000-4000-8000-000000000003'::uuid;
