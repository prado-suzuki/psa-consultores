-- 20260826143800_frente_e_redacao_resolucoes.sql
--
-- As resoluções precisam registrar o efeito contratual do evento, apontar a
-- cláusula atingida pela numeração real do consolidado e reproduzir ali a nova
-- redação. As versões anteriores ficam preservadas para os documentos selados.
--
-- O aumento compara o capital vivo com o capital congelado no snapshot do
-- documento registrado substituído. A cessão e a renúncia ao direito de
-- preferência ficam em cláusulas distintas, como nos instrumentos reais.
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.

-- As duas redações de cada cláusula são mutuamente exclusivas. Compartilhar a
-- âncora faz a referência resolver tanto na constituição quanto no consolidado;
-- na alteração, somente o gêmeo no presente participa da composição.
UPDATE public.tmpl_bloco
   SET ancora = 'sede_social',
       updated_at = now()
 WHERE id = ANY (ARRAY[
   'e8b3a472-6965-40e1-a548-90968566d367'::uuid,
   'fc000001-0000-4000-8000-000000000002'::uuid
 ])
   AND ancora IS DISTINCT FROM 'sede_social';

UPDATE public.tmpl_bloco
   SET ancora = 'capital_social',
       updated_at = now()
 WHERE id = ANY (ARRAY[
   '579e688d-9e52-4f57-af95-68548c4c1135'::uuid,
   'fc000001-0000-4000-8000-000000000005'::uuid
 ])
   AND ancora IS DISTINCT FROM 'capital_social';

UPDATE public.tmpl_bloco
   SET ancora = 'administracao_social',
       updated_at = now()
 WHERE id = ANY (ARRAY[
   '4f869b8e-ccaf-40e2-9f04-fba0c47181b2'::uuid,
   'fc000001-0000-4000-8000-000000000006'::uuid
 ])
   AND ancora IS DISTINCT FROM 'administracao_social';

-- A preferência não integra a mesma decisão que formaliza a cessão. O bloco
-- próprio mantém a condição do evento e entra imediatamente depois da cessão.
INSERT INTO public.tmpl_bloco (id, nome, categoria, descricao, tipo, ativo)
VALUES (
  'ac000003-0000-4000-8000-000000000001'::uuid,
  'Resolução: renúncia ao direito de preferência',
  'alteracao-contratual',
  'Registra separadamente a renúncia ao direito de preferência quando há cessão de quotas.',
  'clausula',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tmpl_bloco_versao (
  bloco_id,
  numero_versao,
  atual,
  conteudo,
  changelog
)
SELECT
  'ac000003-0000-4000-8000-000000000001'::uuid,
  1,
  true,
  'Os demais sócios, cientes da cessão de quotas formalizada neste instrumento, renunciam expressamente ao direito de preferência previsto no contrato social.',
  'A renúncia ao direito de preferência deixa de integrar a resolução que formaliza a cessão.'
WHERE NOT EXISTS (
  SELECT 1
    FROM public.tmpl_bloco_versao
   WHERE bloco_id = 'ac000003-0000-4000-8000-000000000001'::uuid
);

INSERT INTO public.tmpl_bloco_flag (bloco_id, flag_id)
SELECT 'ac000003-0000-4000-8000-000000000001'::uuid, f.id
  FROM public.tmpl_flag AS f
 WHERE f.nome = 'evento_cessao_quotas'
ON CONFLICT (bloco_id, flag_id) DO NOTHING;

DO $$
DECLARE
  v_documento record;
  v_ordem_cessao integer;
BEGIN
  FOR v_documento IN
    SELECT id
      FROM public.tmpl_documento
     WHERE tipo = 'societario'
  LOOP
    IF NOT EXISTS (
      SELECT 1
        FROM public.tmpl_documento_bloco
       WHERE documento_id = v_documento.id
         AND bloco_id = 'ac000003-0000-4000-8000-000000000001'::uuid
    ) THEN
      SELECT ordem
        INTO v_ordem_cessao
        FROM public.tmpl_documento_bloco
       WHERE documento_id = v_documento.id
         AND bloco_id = 'ac000001-0000-4000-8000-000000000003'::uuid;

      IF v_ordem_cessao IS NOT NULL THEN
        UPDATE public.tmpl_documento_bloco
           SET ordem = ordem + 1,
               updated_at = now()
         WHERE documento_id = v_documento.id
           AND ordem > v_ordem_cessao;

        INSERT INTO public.tmpl_documento_bloco (
          documento_id,
          bloco_id,
          ordem,
          obrigatorio
        )
        VALUES (
          v_documento.id,
          'ac000003-0000-4000-8000-000000000001'::uuid,
          v_ordem_cessao + 1,
          false
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- Cada conteúdo abaixo substitui somente a versão vigente do respectivo bloco.
-- A guarda pelo changelog torna a operação reaplicável sem empilhar versões.
DO $$
DECLARE
  r record;
  v_proxima integer;
  v_marcador text := 'Frente E: resolução contratual com referência e redação transcrita.';
BEGIN
  FOR r IN
    SELECT *
      FROM (VALUES
        (
          'ac000001-0000-4000-8000-000000000001'::uuid,
          $txt$Altera-se o endereço da sede da sociedade, modificando-se, consequentemente, as disposições contidas na {{ refs.sede_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “A sociedade tem sede estabelecida na {{ sociedade.sedeEndereco }}, no município de {{ sociedade.sedeMunicipio }}, no Estado de {{ sociedade.sedeUf }}, CEP {{ sociedade.sedeCep }}.”$txt$
        ),
        (
          'ac000001-0000-4000-8000-000000000002'::uuid,
          $txt$Aumenta-se o capital social em R$ {{ sociedade.capitalDelta }} ({{ sociedade.capitalDeltaExtenso }}), de modo que o capital social anterior de R$ {{ sociedade.capitalAnterior }} ({{ sociedade.capitalAnteriorExtenso }}) passa a ser de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), modificando-se, consequentemente, as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, totalmente subscrito e integralizado, assim distribuído entre os sócios: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}), pertencentes a *{{ socio.nomeMaiusculo }}*{{/socios}}.”$txt$
        ),
        (
          'ac000001-0000-4000-8000-000000000003'::uuid,
          $txt$Formaliza-se a cessão e transferência de quotas ajustada entre as partes, em caráter irrevogável e irretratável, com mútua, plena, geral e irrevogável quitação. Em razão da cessão, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, assim distribuído: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) *{{ socio.nomeMaiusculo }}*, {{ socio.inscrito }} no CPF/CNPJ sob o nº {{ socio.cpfCnpj }}, titular de {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}){{/socios}}.”$txt$
        ),
        (
          'ac000001-0000-4000-8000-000000000004'::uuid,
          $txt$Integralizam-se as quotas subscritas mediante a transferência definitiva à sociedade dos bens abaixo individualizados, pelos valores atribuídos:

{{#integralizacoes sep="\n\n"}}{{ socio.ordemRomana }}) {{ socio.peloSocio }} *{{ socio.nomeMaiusculo }}*, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}):
{{#imoveis sep="\n"}}    {{ imovel.alinea }}) {{familia nome="Descrição de imóvel"}}, pelo valor de R$ {{ imovel.valor }} ({{ imovel.valorExtenso }}).{{/imoveis}}{{/integralizacoes}}

Em consequência, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, totalmente subscrito e integralizado, assim distribuído entre os sócios: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}), pertencentes a *{{ socio.nomeMaiusculo }}*{{/socios}}.”$txt$
        ),
        (
          'ac000001-0000-4000-8000-000000000005'::uuid,
          $txt$Altera-se a administração da sociedade, modificando-se, consequentemente, as disposições contidas na {{ refs.administracao_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “A sociedade é administrada isoladamente por {{#administradores sep="; " fim="; e "}}{{ administrador.nome }}, {{ administrador.brasileiro }}, {{ administrador.casado }}, {{ administrador.profissao }}, {{ administrador.portador }} da Cédula de Identidade RG nº {{ administrador.rg }} - {{ administrador.orgaoExpedidor }}, {{ administrador.inscrito }} no CPF/MF sob o nº {{ administrador.cpfCnpj }}, {{ administrador.residente }} no endereço {{ administrador.endereco }}{{/administradores}}, a quem compete representar a sociedade ativa e passivamente, em juízo ou fora dele, inclusive perante o sistema financeiro nacional, entidades oficiais, repartições públicas, autarquias e sociedades de economia mista, repartições federais, estaduais e municipais, observando sempre os eventuais limites e condições impostos pelo presente contrato social, podendo, para tanto:
        a) Celebrar instrumentos e negócios jurídicos relacionados a operações financeiras, empréstimos, financiamentos e respectivos instrumentos de constituição de garantias;
        b) Comprar, adquirir, emprestar e permutar bens móveis de toda e qualquer natureza, incluindo fertilizantes, defensivos, sementes, mudas, insumos, peças, implementos, equipamentos, máquinas e suplementos;
        c) Celebrar contratos de leasing, aluguel e contratar serviços de terceiros;
        d) Alienar bens móveis da sociedade e produtos decorrentes da exploração das atividades econômicas exercidas pela sociedade;
        e) Realizar investimentos, construções, edificações e benfeitorias, contratando, comprando e adquirindo bens em nome da sociedade;
        f) Celebrar contratos, instrumentos jurídicos e negócios de qualquer natureza não elencados anteriormente e que obriguem ou onerem a sociedade e seu patrimônio;
        g) Abrir, encerrar e movimentar contas bancárias, assinar cheques, recibos e depósitos bancários;
        h) Autorizar a sociedade a iniciar e firmar acordos em processos judiciais;
        i) Convocar reunião de sócios, ressalvadas as demais hipóteses previstas neste contrato social e em lei;
        j) Elaborar o balanço patrimonial e as demonstrações financeiras e contábeis a serem submetidas à reunião de sócios para aprovação;
        k) Encaminhar à reunião de sócios proposta de compra, alienação ou oneração de bens imóveis a favor da sociedade ou de propriedade dela;
        l) Aprovar o uso de qualquer marca, nome ou símbolo que represente o nome, denominação social, razão social ou nome fantasia da sociedade por terceiros.”$txt$
        ),
        (
          'ac000001-0000-4000-8000-000000000006'::uuid,
          $txt$Altera-se a composição do quadro societário. Em consequência, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, assim distribuído: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) *{{ socio.nomeMaiusculo }}*, {{ socio.inscrito }} no CPF/CNPJ sob o nº {{ socio.cpfCnpj }}, titular de {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, representativas de {{ socio.percentual }} do capital social{{/socios}}.”$txt$
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
