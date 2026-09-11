-- A INSTITUIÇÃO DE USUFRUTO AVULSA ganha evento e resolução próprios.
--
-- Fatia 4 da frente (docs/osg/doacao-de-quotas-com-usufruto.md). A reserva vem
-- da doação e é automática: o doador transmite a nua propriedade e guarda uso,
-- gozo e voto. A instituição é o contrário e é ato PRÓPRIO: quem tem a
-- propriedade plena entrega o usufruto dela a alguém, nenhuma quota muda de
-- mão, e a guia é do proprietário (na 338021 do Agro Aliança a doadora
-- declarante é a FILHA e o beneficiário é o PAI).
--
-- Por isso não cabe reaproveitar o bloco da reserva: a direção do ato inverte,
-- e a redação que diz "reserva-se o usufruto" diria o contrário do que
-- aconteceu. Evento próprio, coleção própria (`usufrutosInstituidos`), bloco
-- próprio, logo depois dos cinco da doação.
--
-- A tabela de usufruto e voto da sociedade inteira NÃO se repete aqui: ela já
-- sai no consolidado, pela cláusula autônoma da fatia 3, que lê o ônus vigente
-- seja qual for o evento. Cada resolução narra o seu ato; o contrato publica o
-- estado.
--
-- REVISÃO JURÍDICA PENDENTE, como a redação das fatias 2 e 3.

INSERT INTO public.tmpl_flag (nome, tipo, escopo, descricao, ativo)
VALUES (
  'evento_instituicao_usufruto',
  'manual',
  'pj',
  'Instituição de usufruto sobre quotas, sem transferência de titularidade',
  true
)
ON CONFLICT (nome) DO NOTHING;

INSERT INTO public.tmpl_bloco (id, nome, categoria, descricao, tipo, ativo)
VALUES (
  'bbaeb5b3-810d-49a7-822a-917873a4d671'::uuid,
  'Resolução: instituição de usufruto sobre quotas',
  'alteracao-contratual',
  'Formaliza o usufruto instituído por quem tem a propriedade plena, sem que a quota mude de mão.',
  'livre',
  true
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.tmpl_bloco_versao (bloco_id, numero_versao, atual, conteudo, changelog)
SELECT
  'bbaeb5b3-810d-49a7-822a-917873a4d671'::uuid,
  1,
  true,
  $txt$*Da instituição de usufruto.* Os sócios adiante nomeados instituem, sobre as quotas de sua propriedade, o usufruto vitalício em favor das pessoas indicadas, permanecendo eles como nus proprietários e conservando as quotas a mesma titularidade{{#usufrutosInstituidos sep="; " fim="; e "}}{{ usufruto.ordemRomana }}) *{{ nuProprietario.nomeMaiusculo }}*, {{ nuProprietario.qualificacao }}, institui o usufruto de {{ usufruto.quotas }} ({{ usufruto.quotasExtenso }}) quotas de sua titularidade em favor de *{{ usufruto.usufrutuarioNomes }}*{{#comVoto}}, inclusive com o direito de voto, nos termos do artigo 114 da Lei nº 6.404/76, aplicado supletivamente por força do artigo 1.053, parágrafo único, do Código Civil{{/comVoto}}{{#semVoto}}, sem extensão ao direito de voto, cabendo à pessoa usufrutuária apenas o uso e o gozo{{/semVoto}}{{/usufrutosInstituidos}}.

Havendo pessoas usufrutuárias em conjunto, no falecimento de uma delas o respectivo quinhão acrescerá à sobrevivente, nos termos do artigo 1.411 do Código Civil.$txt$,
  'Redação inicial da instituição de usufruto avulsa; revisão jurídica pendente.'
WHERE NOT EXISTS (
  SELECT 1 FROM public.tmpl_bloco_versao v
   WHERE v.bloco_id = 'bbaeb5b3-810d-49a7-822a-917873a4d671'::uuid
);

INSERT INTO public.tmpl_bloco_flag (bloco_id, flag_id)
SELECT 'bbaeb5b3-810d-49a7-822a-917873a4d671'::uuid, f.id
  FROM public.tmpl_flag AS f
 WHERE f.nome = 'evento_instituicao_usufruto'
ON CONFLICT (bloco_id, flag_id) DO NOTHING;

-- Entra logo depois do último bloco da doação (o quadro de usufruto e voto):
-- as duas matérias falam da mesma coisa, e ler uma seguida da outra é o que os
-- instrumentos fazem quando as duas acontecem no mesmo ato.
DO $$
DECLARE
  documento record;
  bloco uuid := 'bbaeb5b3-810d-49a7-822a-917873a4d671'::uuid;
  ancora uuid := 'c25643d9-f920-4b25-975f-5902a48ddf0e'::uuid;
  ordem_ancora integer;
BEGIN
  FOR documento IN
    SELECT id FROM public.tmpl_documento WHERE tipo = 'societario'
  LOOP
    IF EXISTS (
      SELECT 1 FROM public.tmpl_documento_bloco vinculo
      WHERE vinculo.documento_id = documento.id AND vinculo.bloco_id = bloco
    ) THEN
      CONTINUE;
    END IF;

    SELECT vinculo.ordem INTO ordem_ancora
    FROM public.tmpl_documento_bloco vinculo
    WHERE vinculo.documento_id = documento.id AND vinculo.bloco_id = ancora;

    IF ordem_ancora IS NULL THEN
      CONTINUE;
    END IF;

    UPDATE public.tmpl_documento_bloco
    SET ordem = ordem + 1, updated_at = now()
    WHERE documento_id = documento.id AND ordem > ordem_ancora;

    INSERT INTO public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
    VALUES (documento.id, bloco, ordem_ancora + 1, false)
    ON CONFLICT (documento_id, bloco_id) DO NOTHING;
  END LOOP;
END $$;
