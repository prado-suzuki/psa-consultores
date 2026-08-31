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

INSERT INTO public.tmpl_bloco_flag (bloco_id, flag_id)
SELECT p.bloco_id, f.id
  FROM (VALUES
    ('0e65aae6-bffe-41a6-be5c-f39498acf100'::uuid, 'e_constituicao'),
    ('fc000002-0000-4000-8000-000000000001'::uuid, 'e_alteracao')
  ) AS p(bloco_id, flag_nome)
  JOIN public.tmpl_flag AS f ON f.nome = p.flag_nome
ON CONFLICT (bloco_id, flag_id) DO NOTHING;

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