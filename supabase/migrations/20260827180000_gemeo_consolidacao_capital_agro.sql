-- 20260827180000_gemeo_consolidacao_capital_agro.sql
--
-- O gêmeo de consolidação do bloco de capital do modelo (Agro): a pendência que
-- a migration 20260827093000 deixou anotada e não tratou.
--
-- O bloco `Capital Social - Agro` está no futuro ("o capital social da empresa
-- SERÁ de") e afirma que a integralização acontece "neste ato". É redação de
-- constituição. Na consolidação de uma alteração contratual o instrumento
-- descreve o estado que passou a vigorar, e o tempo tem de ser o presente — é o
-- que o par do (Participações) faz desde a Frente C (20260826143600).
--
-- Gêmeos, e não substituição: as duas redações continuam vigentes ao mesmo tempo.
-- As flags mutuamente exclusivas `e_constituicao` / `e_alteracao` (Frente A,
-- 20260826142819) escolhem uma delas sem mexer no motor nem nos snapshots já
-- validados.
--
-- O gêmeo TAMBÉM leva a âncora `capital_social`: as quatro resoluções semeadas
-- citam `{{ refs.capital_social }}`, e âncora que ninguém publica derruba o
-- documento inteiro (`render.ts` trata placeholder não resolvido como erro de
-- composição). O par do (Participações) compartilha a âncora pela mesma razão.
--
-- ACERVO, e por que a migration é segura: pôr `e_constituicao` no bloco original
-- o torna condicional, e documento já validado renderiza de `snapshot_flags`
-- congelado. No sandbox, 15 dos 19 documentos gerados têm snapshot SEM nenhuma
-- das duas flags (foram selados antes de 26/08/2026), sendo 6 do modelo (Agro) e
-- alguns registrados. A compatibilidade está no código, não aqui: ausência das
-- duas é lida como constituição (`comFlagDaPecaRetroativa`, em
-- src/lib/templates/flags.ts). Sem aquela leitura, esta migration apagaria a
-- cláusula de capital daquelas peças.
--
-- FICA PENDENTE, e não é o que esta migration trata: na consolidação, a lista
-- {{#integralizacoes}} enumera as integralizações que a peça está contando, não
-- o histórico inteiro do capital. Com o status do bem virando 'Integralizado' no
-- registro (D5), a segunda alteração de uma mesma empresa listará só os aportes
-- novos. Decidir se a consolidação do (Agro) deve descrever todos os bens ou só
-- os desta peça é redação, e pede o consultor.
--
-- Nada aqui aplica em produção. Sandbox pelo CLI, produção pelo chat do Lovable.
--
-- Idempotente: `ON CONFLICT DO NOTHING` nos três inserts, e a presença do gêmeo
-- no modelo é a guarda do deslocamento de ordem.

-- ---------------------------------------------------------------------------
-- 1. O gêmeo
-- ---------------------------------------------------------------------------
INSERT INTO public.tmpl_bloco (id, nome, categoria, descricao, tipo, ancora, ativo)
VALUES (
  'fc000002-0000-4000-8000-000000000001'::uuid,
  'Capital Social - Agro (consolidação)',
  'contrato-social',
  'Redação no presente usada exclusivamente no contrato social consolidado de uma alteração, no modelo (Agro).',
  'clausula',
  'capital_social',
  true
)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Versão inicial do gêmeo
-- ---------------------------------------------------------------------------
-- Cópia literal da versão 3 do original, com duas mudanças e só elas: "será de"
-- vira "é de", e cai o "neste ato" que datava a integralização no instrumento
-- que se está escrevendo. O resto (as alíneas por sócio, o {{ ref }} que aponta a
-- própria cláusula, o fecho que abre a lista de bens) permanece idêntico, porque
-- é o que o registro publica.
--
-- A guarda permite reaplicar sem empilhar outra versão e preserva o histórico
-- caso o catálogo já tenha seguido adiante.
INSERT INTO public.tmpl_bloco_versao (bloco_id, numero_versao, conteudo, changelog, atual)
SELECT
  'fc000002-0000-4000-8000-000000000001'::uuid,
  1,
  $txt$  O capital social da empresa é de R$ {{ sociedade.capitalValor }} ({{ sociedade.capitalExtenso }}), dividido em {{ sociedade.totalQuotas }} ({{ sociedade.totalQuotasExtenso }}) quotas, no valor nominal de R$ {{ sociedade.quotaValorNominal }} ({{ sociedade.quotaValorNominalExtenso }}) cada uma, sendo: {{#integralizacoes sep="; " fim="; e "}}{{ socio.ordemRomana }}) o valor de R$ {{ socio.vlrTotal }} ({{ socio.vlrTotalExtenso }}) subscrito e integralizado {{ socio.peloSocio }} *{{ socio.nomeMaiusculo }}*, por meio dos bens imóveis e valor em moeda corrente nacional arrolados no {{ ref }} desta cláusula{{/integralizacoes}}, estando o capital social da empresa totalmente subscrito e integralizado pelos sócios, da seguinte forma:$txt$,
  'Gêmeo no presente para a consolidação, sem afirmar que a integralização ocorre neste ato.',
  true
WHERE NOT EXISTS (
  SELECT 1
    FROM public.tmpl_bloco_versao
   WHERE bloco_id = 'fc000002-0000-4000-8000-000000000001'::uuid
);

-- ---------------------------------------------------------------------------
-- 3. As flags mutuamente exclusivas
-- ---------------------------------------------------------------------------
-- Adicionadas, não substituídas: o original não tem flag nenhuma hoje, e o
-- gêmeo nasce só com a sua.
INSERT INTO public.tmpl_bloco_flag (bloco_id, flag_id)
SELECT p.bloco_id, f.id
  FROM (VALUES
    ('0e65aae6-bffe-41a6-be5c-f39498acf100'::uuid, 'e_constituicao'),
    ('fc000002-0000-4000-8000-000000000001'::uuid, 'e_alteracao')
  ) AS p(bloco_id, flag_nome)
  JOIN public.tmpl_flag AS f ON f.nome = p.flag_nome
ON CONFLICT (bloco_id, flag_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 4. O gêmeo imediatamente depois do original, em todo modelo que o usa
-- ---------------------------------------------------------------------------
-- Só onde o original está: o (Participações) não usa este bloco, e a consulta da
-- ordem corrente torna a operação independente de deslocamentos anteriores.
-- `obrigatorio = false` reflete que a entrada depende da flag, embora o
-- compositor já dê precedência a ela.
DO $$
DECLARE
  m record;
  v_ordem integer;
BEGIN
  FOR m IN
    SELECT DISTINCT documento_id
      FROM public.tmpl_documento_bloco
     WHERE bloco_id = '0e65aae6-bffe-41a6-be5c-f39498acf100'::uuid
  LOOP
    SELECT ordem
      INTO v_ordem
      FROM public.tmpl_documento_bloco
     WHERE documento_id = m.documento_id
       AND bloco_id = '0e65aae6-bffe-41a6-be5c-f39498acf100'::uuid;

    IF v_ordem IS NOT NULL AND NOT EXISTS (
      SELECT 1
        FROM public.tmpl_documento_bloco
       WHERE documento_id = m.documento_id
         AND bloco_id = 'fc000002-0000-4000-8000-000000000001'::uuid
    ) THEN
      UPDATE public.tmpl_documento_bloco
         SET ordem = ordem + 1,
             updated_at = now()
       WHERE documento_id = m.documento_id
         AND ordem > v_ordem;

      INSERT INTO public.tmpl_documento_bloco (documento_id, bloco_id, ordem, obrigatorio)
      VALUES (m.documento_id, 'fc000002-0000-4000-8000-000000000001'::uuid, v_ordem + 1, false);
    END IF;

    v_ordem := NULL;
  END LOOP;
END $$;
