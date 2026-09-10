-- OS TRÊS ECOS DO ÔNUS NO CONTRATO CONSOLIDADO.
--
-- O gravame e o usufruto não são texto da peça que os criou: são estado da
-- sociedade, e reaparecem em três pontos fixos de TODA consolidação seguinte,
-- inclusive nas alterações que nada têm a ver com doação. É o que o corpus de
-- 105 instrumentos de 23 sociedades mostra, com a mesma nota atravessando sete
-- alterações de uma mesma empresa.
--
-- Os três blocos abaixo leem as coleções de ESTADO (`gravamesVigentes` e
-- `quadroUsufruto`), que o estado proposto mantém vivas sempre, e não as do ato
-- (`gravamesQuotas`, `usufrutos`), que só existem na peça que formaliza a
-- doação. Sociedade sem ônus não publica nenhum dos três: a lista vazia derruba
-- o bloco por 'lista-vazia', como na cláusula de retirada.
--
-- Nenhum deles leva flag: o consolidado não é deliberação, é o contrato inteiro.
--
-- REVISÃO JURÍDICA PENDENTE, como a redação da fatia 2: estes textos não devem
-- chegar a produção antes do aceite de quem responde pela redação.

INSERT INTO public.tmpl_bloco (id, nome, categoria, descricao, tipo, ativo)
VALUES
  (
    '85ea3059-4820-4bec-98be-263bbee5cbcf'::uuid,
    'Parágrafo — Quotas gravadas',
    'contrato-social',
    'Publica, no capítulo do capital, os gravames que hoje recaem sobre quotas da sociedade.',
    'paragrafo',
    true
  ),
  (
    '0e90d56d-6bf2-4951-a020-3e8bae66bcc5'::uuid,
    'Cláusula — Usufruto e direito de voto',
    'contrato-social',
    'A cláusula autônoma de nua-propriedade: quem tem a quota, quem a vota, e em que proporção.',
    'clausula',
    true
  ),
  (
    '8b74aaa2-8646-44b7-9d35-c4d53b2e01e7'::uuid,
    'Parágrafo — Alienação de quotas gravadas',
    'contrato-social',
    'Ressalva, no capítulo de alienação, que a quota gravada não se transfere pelo rito comum.',
    'paragrafo',
    true
  )
ON CONFLICT (id) DO NOTHING;

-- A redação nasce uma vez. Reexecutar não sobrescreve texto que a revisão
-- jurídica tenha ajustado depois.
INSERT INTO public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
SELECT redacao.bloco_id, 1, true, redacao.conteudo,
       'Redação inicial dos ecos do ônus na consolidação; revisão jurídica pendente.'
FROM (
  VALUES
    (
      '85ea3059-4820-4bec-98be-263bbee5cbcf'::uuid,
      $txt$As quotas adiante indicadas encontram-se gravadas, nos termos dos instrumentos que as constituíram, permanecendo os gravames enquanto não forem expressamente revogados ou extintos: {{#gravamesVigentes sep="; " fim="; e "}}{{ gravame.quotas }} ({{ gravame.quotasExtenso }}) quotas de titularidade de *{{ nuProprietario.nomeMaiusculo }}*, com {{ gravame.nomes }}{{/gravamesVigentes}}.$txt$
    ),
    (
      '0e90d56d-6bf2-4951-a020-3e8bae66bcc5'::uuid,
      $txt$Sobre as quotas sujeitas a usufruto, a propriedade e o exercício do direito de voto ficam distribuídos na forma do quadro abaixo, cabendo à pessoa usufrutuária o voto das quotas em que figura, nos termos do artigo 114 da Lei nº 6.404/76, aplicado supletivamente por força do artigo 1.053, parágrafo único, do Código Civil:

| SÓCIOS | PROPRIEDADE PLENA | NUA PROPRIEDADE | USUFRUTO COM VOTO | % DE VOZ E VOTO |
| :--- | ---: | ---: | ---: | ---: |
{{#quadroUsufruto}}| {{ titular.nome }} | {{ usufruto.plena }} | {{ usufruto.nua }} | {{ usufruto.usufruto }} | {{ usufruto.pctVozEVoto }} |{{/quadroUsufruto}}

As colunas de nua propriedade e de usufruto descrevem as mesmas quotas sob direitos distintos. Havendo pessoas usufrutuárias em conjunto, no falecimento de uma delas o respectivo quinhão acrescerá à sobrevivente, nos termos do artigo 1.411 do Código Civil.$txt$
    ),
    (
      '8b74aaa2-8646-44b7-9d35-c4d53b2e01e7'::uuid,
      $txt$Enquanto vigorar o gravame de inalienabilidade, as quotas por ele atingidas não poderão ser alienadas, cedidas ou de qualquer forma oneradas, ainda que observado o procedimento desta cláusula, dependendo a transferência de prévia revogação ou extinção do gravame por quem o instituiu, ou de autorização judicial, na forma da lei. A restrição alcança {{#gravamesVigentes sep="; " fim="; e "}}{{ gravame.quotas }} ({{ gravame.quotasExtenso }}) quotas de titularidade de *{{ nuProprietario.nomeMaiusculo }}*{{/gravamesVigentes}}.$txt$
    )
) AS redacao(bloco_id, conteudo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.tmpl_bloco_versao v WHERE v.bloco_id = redacao.bloco_id
);

-- POSIÇÃO. O parágrafo dos gravames e a cláusula de usufruto entram no FIM do
-- capítulo do capital, depois do último parágrafo dele; a ressalva da alienação,
-- no fim da corrida de parágrafos da cláusula de preferência. Entrar no fim de
-- cada corrida é deliberado: inserir no meio renumeraria parágrafos que o texto
-- de outras cláusulas cita pelo número.
DO $$
DECLARE
  documento record;
  passo record;
  ordem_ancora integer;
BEGIN
  FOR documento IN
    SELECT id FROM public.tmpl_documento WHERE tipo = 'societario'
  LOOP
    FOR passo IN
      SELECT * FROM (VALUES
        ('92e8c1b0-0c1c-434d-9a79-7ae27ba30f22'::uuid, '85ea3059-4820-4bec-98be-263bbee5cbcf'::uuid),
        ('85ea3059-4820-4bec-98be-263bbee5cbcf'::uuid, '0e90d56d-6bf2-4951-a020-3e8bae66bcc5'::uuid),
        ('ed997350-8ad6-49b2-bd2d-8037c9c994d2'::uuid, '8b74aaa2-8646-44b7-9d35-c4d53b2e01e7'::uuid)
      ) AS p(ancora, bloco)
    LOOP
      IF EXISTS (
        SELECT 1 FROM public.tmpl_documento_bloco vinculo
        WHERE vinculo.documento_id = documento.id AND vinculo.bloco_id = passo.bloco
      ) THEN
        CONTINUE;
      END IF;

      SELECT vinculo.ordem INTO ordem_ancora
      FROM public.tmpl_documento_bloco vinculo
      WHERE vinculo.documento_id = documento.id AND vinculo.bloco_id = passo.ancora;

      IF ordem_ancora IS NULL THEN
        CONTINUE;
      END IF;

      UPDATE public.tmpl_documento_bloco
      SET ordem = ordem + 1, updated_at = now()
      WHERE documento_id = documento.id AND ordem > ordem_ancora;

      INSERT INTO public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
      VALUES (documento.id, passo.bloco, ordem_ancora + 1, true)
      ON CONFLICT (documento_id, bloco_id) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- `obrigatorio` num bloco SEM flag não é preferência: é a única coisa que o faz
-- compor (ver comporBlocos, em composition.ts, que só admite bloco com todas as
-- flags ativas OU marcado obrigatório). Estes três não têm flag de propósito, e
-- quem decide se entram é o descarte por lista vazia. Falso aqui é bloco morto,
-- não bloco opcional, e é por isso que a correção reexecuta sem perguntar.
UPDATE public.tmpl_documento_bloco
SET obrigatorio = true,
    updated_at = now()
WHERE bloco_id IN (
    '85ea3059-4820-4bec-98be-263bbee5cbcf'::uuid,
    '0e90d56d-6bf2-4951-a020-3e8bae66bcc5'::uuid,
    '8b74aaa2-8646-44b7-9d35-c4d53b2e01e7'::uuid
  )
  AND obrigatorio IS DISTINCT FROM true;
