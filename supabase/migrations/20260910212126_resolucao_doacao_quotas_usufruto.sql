-- A doação de quotas deixa de usar a resolução genérica de cessão e passa a ter
-- evento e blocos próprios para o ato gratuito, a reserva de usufruto, os
-- gravames, a renúncia à preferência e o quadro de usufruto e voto.
--
-- Redação modelada na 3ª alteração da MMS Participações. REVISÃO JURÍDICA
-- PENDENTE: estes textos não devem chegar a produção antes do aceite de quem
-- responde pela redação, especialmente quanto à vigência dos gravames.

INSERT INTO public.tmpl_flag (nome, tipo, escopo, descricao, ativo)
VALUES (
  'evento_doacao_quotas',
  'manual',
  'pj',
  'Houve doação de quotas, com ou sem reserva de usufruto e gravames',
  true
)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.tmpl_bloco (id, nome, categoria, descricao, tipo, ativo)
VALUES
  (
    '9009b16c-639f-43b0-96a0-d056c2488f14'::uuid,
    'Resolução: doação de quotas',
    'alteracao-contratual',
    'Formaliza cada doação, sua origem patrimonial e o instrumento particular, quando declarados.',
    'livre',
    true
  ),
  (
    '10445d6c-973e-47cb-b7fc-9d8d100f4d8a'::uuid,
    'Resolução: reserva de usufruto sobre quotas doadas',
    'alteracao-contratual',
    'Disciplina a reserva de usufruto criada nas doações abrangidas pelo ato.',
    'livre',
    true
  ),
  (
    '82259dcd-a840-496a-add7-2e54f0f3f87f'::uuid,
    'Resolução: gravames das quotas doadas',
    'alteracao-contratual',
    'Publica os gravames efetivamente registrados sobre cada conjunto de quotas doadas.',
    'livre',
    true
  ),
  (
    '17bf4288-6490-40e8-8c68-9cf9be3a7507'::uuid,
    'Resolução: anuência e renúncia à preferência na doação',
    'alteracao-contratual',
    'Registra a concordância dos sócios e a renúncia à preferência sobre as doações e os usufrutos.',
    'livre',
    true
  ),
  (
    'c25643d9-f920-4b25-975f-5902a48ddf0e'::uuid,
    'Resolução: quadro de usufruto e voto',
    'alteracao-contratual',
    'Demonstra propriedade plena, nua propriedade, usufruto e voz e voto após o ato.',
    'livre',
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
  redacao.bloco_id,
  1,
  true,
  redacao.conteudo,
  'Redação inicial da doação de quotas com reserva de usufruto; revisão jurídica pendente.'
FROM (
  VALUES
    (
      '9009b16c-639f-43b0-96a0-d056c2488f14'::uuid,
      $txt$*Da doação de quotas.* Formalizam-se as doações e transferências de quotas a título gratuito ajustadas entre as partes, nos seguintes termos:

{{#doacoes sep="\n"}}    {{ doacao.ordemRomana }}) {{#comInstrumento}}Por Instrumento Particular de Doação por Ato Inter Vivos pactuado em {{ doacao.instrumentoDataExtenso }}, {{/comInstrumento}}*{{ doador.nomeMaiusculo }}*, {{ doador.qualificacao }}, doa e transfere a título gratuito {{ doacao.quotas }} ({{ doacao.quotasExtenso }}) quotas, no valor total de R$ {{ doacao.valor }} ({{ doacao.valorExtenso }}), a *{{ donatario.nomeMaiusculo }}*, {{ donatario.qualificacao }}{{#comOrigem}}, sendo {{ doacao.quotasLegitima }} ({{ doacao.quotasLegitimaExtenso }}) quotas da parte legítima e {{ doacao.quotasDisponivel }} ({{ doacao.quotasDisponivelExtenso }}) quotas da parte disponível do patrimônio da parte doadora{{/comOrigem}}.{{/doacoes}}$txt$
    ),
    (
      '10445d6c-973e-47cb-b7fc-9d8d100f4d8a'::uuid,
      $txt$*Da reserva de usufruto.* Sobre as quotas abaixo indicadas reserva-se o usufruto vitalício, permanecendo com as pessoas usufrutuárias todos os direitos de uso e gozo{{#usufrutos sep="; " fim="; e "}}{{ usufruto.ordemRomana }}) sobre {{ usufruto.quotas }} ({{ usufruto.quotasExtenso }}) quotas de titularidade de *{{ nuProprietario.nomeMaiusculo }}*, em favor de *{{ usufruto.usufrutuarioNomes }}*{{#comVoto}}, inclusive com o direito de voto, nos termos do artigo 114 da Lei nº 6.404/76, aplicado supletivamente por força do artigo 1.053, parágrafo único, do Código Civil{{/comVoto}}{{#semVoto}}, sem extensão ao direito de voto{{/semVoto}}{{/usufrutos}}.

Havendo usufrutuários em conjunto, no falecimento de um deles o respectivo quinhão acrescerá ao sobrevivente, nos termos do artigo 1.411 do Código Civil.$txt$
    ),
    (
      '82259dcd-a840-496a-add7-2e54f0f3f87f'::uuid,
      $txt$*Dos gravames.* Em observância aos preceitos do artigo 1.911 do Código Civil e com o intuito de preservar o patrimônio das partes donatárias, ficam gravadas as quotas abaixo descritas: {{#gravamesQuotas sep="; " fim="; e "}}{{ gravame.ordemRomana }}) {{ gravame.quotas }} ({{ gravame.quotasExtenso }}) quotas de titularidade de *{{ nuProprietario.nomeMaiusculo }}* com {{ gravame.nomes }}{{/gravamesQuotas}}. Os gravames permanecerão vigentes enquanto as partes doadoras estiverem vivas ou até que sejam expressamente revogados em conjunto.$txt$
    ),
    (
      '17bf4288-6490-40e8-8c68-9cf9be3a7507'::uuid,
      $txt$*Da anuência e renúncia à preferência.* Os sócios declaram que concordam e não se opõem às doações, transferências de quotas, reservas de usufruto, ingresso e saída de sócios descritos nas cláusulas anteriores, renunciando expressamente, de modo irretratável e irrevogável, a qualquer direito de preferência que porventura possuam em relação às transferências das quotas e dos direitos de usufruto ora formalizados.$txt$
    ),
    (
      'c25643d9-f920-4b25-975f-5902a48ddf0e'::uuid,
      $txt$*Do usufruto e do direito de voto.* Considerando as reservas de usufruto vigentes, a propriedade e o exercício do direito de voto sobre as quotas da sociedade ficam distribuídos da seguinte forma:

{{#quadroUsufruto sep="\n"}}{{ usufruto.ordemRomana }}) *{{ titular.nomeMaiusculo }}*: {{ usufruto.quotas }} quotas, das quais {{ usufruto.plena }} em propriedade plena e {{ usufruto.nua }} em nua propriedade; usufruto com voto sobre {{ usufruto.usufruto }} quotas; voz e voto correspondentes a {{ usufruto.vozEVoto }} quotas ({{ usufruto.pctVozEVoto }}%).{{/quadroUsufruto}}$txt$
    )
) AS redacao(bloco_id, conteudo)
ON CONFLICT (bloco_id, numero_versao) DO UPDATE
SET conteudo = EXCLUDED.conteudo,
    changelog = EXCLUDED.changelog,
    updated_at = now();

INSERT INTO public.tmpl_bloco_flag (bloco_id, flag_id)
SELECT
  blocos.bloco_id,
  flag.id
FROM (
  VALUES
    ('9009b16c-639f-43b0-96a0-d056c2488f14'::uuid),
    ('10445d6c-973e-47cb-b7fc-9d8d100f4d8a'::uuid),
    ('82259dcd-a840-496a-add7-2e54f0f3f87f'::uuid),
    ('17bf4288-6490-40e8-8c68-9cf9be3a7507'::uuid),
    ('c25643d9-f920-4b25-975f-5902a48ddf0e'::uuid)
) AS blocos(bloco_id)
JOIN public.tmpl_flag flag ON flag.nome = 'evento_doacao_quotas'
ON CONFLICT (bloco_id, flag_id) DO NOTHING;

-- Os cinco blocos entram logo depois da cessão, mantendo sua ordem relativa.
DO $$
DECLARE
  documento record;
  bloco uuid;
  anterior uuid;
  ordem_anterior integer;
BEGIN
  FOR documento IN
    SELECT id
    FROM public.tmpl_documento
    WHERE tipo = 'societario'
  LOOP
    anterior := 'ac000001-0000-4000-8000-000000000003'::uuid;
    FOREACH bloco IN ARRAY ARRAY[
      '9009b16c-639f-43b0-96a0-d056c2488f14'::uuid,
      '10445d6c-973e-47cb-b7fc-9d8d100f4d8a'::uuid,
      '82259dcd-a840-496a-add7-2e54f0f3f87f'::uuid,
      '17bf4288-6490-40e8-8c68-9cf9be3a7507'::uuid,
      'c25643d9-f920-4b25-975f-5902a48ddf0e'::uuid
    ]
    LOOP
      IF EXISTS (
        SELECT 1
        FROM public.tmpl_documento_bloco vinculo
        WHERE vinculo.documento_id = documento.id
          AND vinculo.bloco_id = bloco
      ) THEN
        anterior := bloco;
        CONTINUE;
      END IF;

      SELECT vinculo.ordem
      INTO ordem_anterior
      FROM public.tmpl_documento_bloco vinculo
      WHERE vinculo.documento_id = documento.id
        AND vinculo.bloco_id = anterior;

      IF ordem_anterior IS NULL THEN
        CONTINUE;
      END IF;

      UPDATE public.tmpl_documento_bloco
      SET ordem = ordem + 1,
          updated_at = now()
      WHERE documento_id = documento.id
        AND ordem > ordem_anterior;

      INSERT INTO public.tmpl_documento_bloco (
        documento_id,
        bloco_id,
        ordem,
        obrigatorio
      )
      VALUES (documento.id, bloco, ordem_anterior + 1, false)
      ON CONFLICT (documento_id, bloco_id) DO NOTHING;

      anterior := bloco;
    END LOOP;
  END LOOP;
END $$;

-- Remove apenas os três blocos criados pela execução preliminar no sandbox. Os
-- nomes e o changelog impedem que um bloco alheio com um desses IDs seja tocado.
DELETE FROM public.tmpl_documento_bloco vinculo
USING public.tmpl_bloco bloco, public.tmpl_bloco_versao versao
WHERE vinculo.bloco_id = bloco.id
  AND versao.bloco_id = bloco.id
  AND bloco.id IN (
    'ac000001-0000-4000-8000-000000000008'::uuid,
    'ac000001-0000-4000-8000-000000000009'::uuid,
    'ac000001-0000-4000-8000-000000000012'::uuid
  )
  AND bloco.nome IN (
    'Resolução: doação de quotas',
    'Resolução: reserva de usufruto sobre quotas doadas',
    'Resolução: quadro de usufruto e voto'
  )
  AND versao.changelog = 'Redação inicial da doação de quotas com reserva de usufruto; revisão jurídica pendente.';

DELETE FROM public.tmpl_bloco_flag vinculo
USING public.tmpl_bloco bloco, public.tmpl_bloco_versao versao
WHERE vinculo.bloco_id = bloco.id
  AND versao.bloco_id = bloco.id
  AND bloco.id IN (
    'ac000001-0000-4000-8000-000000000008'::uuid,
    'ac000001-0000-4000-8000-000000000009'::uuid,
    'ac000001-0000-4000-8000-000000000012'::uuid
  )
  AND bloco.nome IN (
    'Resolução: doação de quotas',
    'Resolução: reserva de usufruto sobre quotas doadas',
    'Resolução: quadro de usufruto e voto'
  )
  AND versao.changelog = 'Redação inicial da doação de quotas com reserva de usufruto; revisão jurídica pendente.';

DELETE FROM public.tmpl_bloco bloco
USING public.tmpl_bloco_versao versao
WHERE versao.bloco_id = bloco.id
  AND bloco.id IN (
    'ac000001-0000-4000-8000-000000000008'::uuid,
    'ac000001-0000-4000-8000-000000000009'::uuid,
    'ac000001-0000-4000-8000-000000000012'::uuid
  )
  AND bloco.nome IN (
    'Resolução: doação de quotas',
    'Resolução: reserva de usufruto sobre quotas doadas',
    'Resolução: quadro de usufruto e voto'
  )
  AND versao.changelog = 'Redação inicial da doação de quotas com reserva de usufruto; revisão jurídica pendente.';

-- Normaliza também o sandbox que chegou a receber os IDs colidentes: os cinco
-- blocos da doação ficam contíguos depois da cessão, sem alterar a ordem relativa
-- dos demais blocos. Reexecutar produz os mesmos números.
WITH ancora AS (
  SELECT documento_id, ordem
  FROM public.tmpl_documento_bloco
  WHERE bloco_id = 'ac000001-0000-4000-8000-000000000003'::uuid
), ordenados AS (
  SELECT
    vinculo.id,
    row_number() OVER (
      PARTITION BY vinculo.documento_id
      ORDER BY
        CASE vinculo.bloco_id
          WHEN '9009b16c-639f-43b0-96a0-d056c2488f14'::uuid THEN ancora.ordem + 0.1
          WHEN '10445d6c-973e-47cb-b7fc-9d8d100f4d8a'::uuid THEN ancora.ordem + 0.2
          WHEN '82259dcd-a840-496a-add7-2e54f0f3f87f'::uuid THEN ancora.ordem + 0.3
          WHEN '17bf4288-6490-40e8-8c68-9cf9be3a7507'::uuid THEN ancora.ordem + 0.4
          WHEN 'c25643d9-f920-4b25-975f-5902a48ddf0e'::uuid THEN ancora.ordem + 0.5
          ELSE vinculo.ordem
        END,
        vinculo.id
    ) AS ordem
  FROM public.tmpl_documento_bloco vinculo
  JOIN ancora ON ancora.documento_id = vinculo.documento_id
)
UPDATE public.tmpl_documento_bloco vinculo
SET ordem = ordenados.ordem,
    updated_at = now()
FROM ordenados
WHERE ordenados.id = vinculo.id
  AND vinculo.ordem IS DISTINCT FROM ordenados.ordem;

-- Reparo da primeira execução no sandbox: os dois UUIDs sequenciais abaixo já
-- pertenciam às resoluções de retirada e desimpedimento. A guarda pelo changelog
-- torna isto um no-op em qualquer banco que nunca recebeu a versão colidente.
UPDATE public.tmpl_bloco_versao
SET conteudo = 'Em virtude das cessões e transferências descritas nas cláusulas anteriores, {{ retirada.porTerCedido }} a totalidade de suas quotas, {{ retirada.titulo }} {{#retirantes sep=", " fim=" e "}}*{{ retirante.nomeMaiusculo }}*{{/retirantes}} {{ retirada.verbo }} da sociedade.',
    changelog = 'Restaura a resolução de retirada após colisão de UUID no sandbox.',
    updated_at = now()
WHERE bloco_id = 'ac000001-0000-4000-8000-000000000010'::uuid
  AND changelog = 'Redação inicial da doação de quotas com reserva de usufruto; revisão jurídica pendente.';

UPDATE public.tmpl_bloco_versao
SET conteudo = 'Os administradores nomeados neste ato declaram, sob as penas da lei, que não estão impedidos de exercer a administração da sociedade, por lei especial ou em virtude de condenação criminal, nem se encontram sob os efeitos de pena que vede, ainda que temporariamente, o acesso a cargos públicos, por crime falimentar, de prevaricação, peita ou suborno, concussão, peculato, contra a economia popular, contra o sistema financeiro nacional, contra as normas de defesa da concorrência, contra as relações de consumo, a fé pública ou a propriedade, nos termos do artigo 1.011, § 1º, do Código Civil.',
    changelog = 'Restaura a resolução de desimpedimento após colisão de UUID no sandbox.',
    updated_at = now()
WHERE bloco_id = 'ac000001-0000-4000-8000-000000000011'::uuid
  AND changelog = 'Redação inicial da doação de quotas com reserva de usufruto; revisão jurídica pendente.';

DELETE FROM public.tmpl_bloco_flag vinculo
USING public.tmpl_flag flag
WHERE vinculo.flag_id = flag.id
  AND flag.nome = 'evento_doacao_quotas'
  AND vinculo.bloco_id IN (
    'ac000001-0000-4000-8000-000000000010'::uuid,
    'ac000001-0000-4000-8000-000000000011'::uuid
  );

-- A cessão fica exclusivamente onerosa. A versão anterior permanece disponível
-- para documentos já congelados.
DO $$
DECLARE
  bloco uuid := 'ac000001-0000-4000-8000-000000000003'::uuid;
  marcador text := 'Separa a doação da resolução de cessão onerosa.';
  proxima_versao integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.tmpl_bloco_versao
    WHERE bloco_id = bloco
      AND changelog = marcador
  ) THEN
    SELECT coalesce(max(numero_versao), 0) + 1
    INTO proxima_versao
    FROM public.tmpl_bloco_versao
    WHERE bloco_id = bloco;

    UPDATE public.tmpl_bloco_versao
    SET atual = false
    WHERE bloco_id = bloco
      AND atual;

    INSERT INTO public.tmpl_bloco_versao (
      bloco_id,
      numero_versao,
      atual,
      conteudo,
      changelog
    )
    VALUES (
      bloco,
      proxima_versao,
      true,
      $txt$Formaliza-se a cessão e transferência onerosa de quotas ajustada entre as partes, em caráter irrevogável e irretratável, com mútua, plena, geral e irrevogável quitação.
{{#cessoes sep="\n"}}    {{ cessao.ordemRomana }}) *{{ cedente.nomeMaiusculo }}*, {{ cedente.inscrito }} no CPF/CNPJ sob o nº {{ cedente.cpfCnpj }}, cede e transfere {{ cessao.quotas }} ({{ cessao.quotasExtenso }}) quotas, no valor total de R$ {{ cessao.valor }} ({{ cessao.valorExtenso }}), a *{{ cessionario.nomeMaiusculo }}*, {{ cessionario.inscrito }} no CPF/CNPJ sob o nº {{ cessionario.cpfCnpj }}.{{/cessoes}}

Em razão da cessão, modificam-se as disposições contidas na {{ refs.capital_social }} do contrato social, que passa a vigorar com a seguinte redação:

    “O capital social é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, assim distribuído: {{#socios sep="; " fim="; e "}}{{ socio.ordemRomana }}) *{{ socio.nomeMaiusculo }}*, {{ socio.inscrito }} no CPF/CNPJ sob o nº {{ socio.cpfCnpj }}, titular de {{ socio.quotas }} ({{ socio.quotasExtenso }}) quotas, no valor total de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}){{/socios}}.”$txt$,
      marcador
    );
  END IF;
END $$;
