-- 20260826143500_frente_b_moldura_alteracao_contratual.sql

-- 1. O cabeçalho comum passa a identificar também a sociedade já registrada
DO $$
DECLARE
  v_bloco uuid := 'a63d92fd-2acf-4c72-8c7b-5d645e4c3595';
  v_proxima integer;
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM public.tmpl_bloco_versao
     WHERE bloco_id = v_bloco
       AND atual
       AND conteudo LIKE '%{{#sociedade.cnpj}}%'
       AND conteudo LIKE '%{{#sociedade.nire}}%'
  ) THEN
    SELECT coalesce(max(numero_versao), 0) + 1
      INTO v_proxima
      FROM public.tmpl_bloco_versao
     WHERE bloco_id = v_bloco;

    UPDATE public.tmpl_bloco_versao
       SET atual = false
     WHERE bloco_id = v_bloco
       AND atual;

    INSERT INTO public.tmpl_bloco_versao (
      bloco_id,
      numero_versao,
      atual,
      conteudo,
      changelog
    )
    VALUES (
      v_bloco,
      v_proxima,
      true,
      E'{{ sociedade.tituloInstrumento }}\n\n*{{ sociedade.razaoSocial }}*\n{{#sociedade.cnpj}}CNPJ nº {{ sociedade.cnpj }}\n{{/sociedade.cnpj}}{{#sociedade.nire}}NIRE nº {{ sociedade.nire }}\n{{/sociedade.nire}}',
      'CNPJ e NIRE passam a identificar a sociedade nas alterações, sem criar campos vazios na constituição.'
    );
  END IF;
END $$;

-- 2. A moldura exclusiva da alteração contratual
INSERT INTO public.tmpl_bloco (id, nome, categoria, descricao, tipo, ativo)
VALUES
  (
    'ac000002-0000-4000-8000-000000000001'::uuid,
    'Preâmbulo — qualificação e abertura da alteração',
    'alteracao-contratual',
    'Qualifica os sócios e anuncia que a peça altera e consolida o contrato social.',
    'livre',
    true
  ),
  (
    'ac000002-0000-4000-8000-000000000002'::uuid,
    'Seção — DAS ALTERAÇÕES CONTRATUAIS',
    'alteracao-contratual',
    'Separa visualmente as resoluções do preâmbulo e do contrato consolidado.',
    'livre',
    true
  ),
  (
    'ac000002-0000-4000-8000-000000000003'::uuid,
    'Cláusula — Ratificação dos atos anteriores',
    'alteracao-contratual',
    'Preserva expressamente as disposições anteriores que a alteração não alcançou.',
    'clausula',
    true
  ),
  (
    'ac000002-0000-4000-8000-000000000004'::uuid,
    'Cláusula — Consolidação do contrato social',
    'alteracao-contratual',
    'Anuncia a redação consolidada antes de o contrato social ser reproduzido.',
    'clausula',
    true
  ),
  (
    'ac000002-0000-4000-8000-000000000005'::uuid,
    'Cabeçalho e qualificação da consolidação',
    'alteracao-contratual',
    'Reabre a sociedade e o quadro societário no início do contrato consolidado.',
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
SELECT moldura.bloco_id, 1, true, moldura.conteudo, moldura.changelog
  FROM (VALUES
    (
      'ac000002-0000-4000-8000-000000000001'::uuid,
      E'{{#socios sep=";\\n\\n" fim="; e\\n\\n"}}{{ socio.qualificacao }}{{/socios}}.\n\n  Únicos sócios da sociedade limitada *{{ sociedade.razaoSocial }}*, inscrita no CNPJ sob o nº {{ sociedade.cnpj }}, registrada na Junta Comercial do Estado de {{ sociedade.juntaUfExtenso }} sob o NIRE nº {{ sociedade.nire }}, com sede estabelecida {{ sociedade.sede }}, resolvem neste ato, alterar e consolidar o seu contrato social, de acordo com as cláusulas e condições seguintes:',
      'A alteração ganha fecho próprio após a qualificação, em lugar do fecho constitutivo.'
    ),
    (
      'ac000002-0000-4000-8000-000000000002'::uuid,
      'DAS ALTERAÇÕES CONTRATUAIS',
      'As resoluções passam a formar uma seção reconhecível do instrumento.'
    ),
    (
      'ac000002-0000-4000-8000-000000000003'::uuid,
      'As demais cláusulas e condições estabelecidas nos atos anteriores, não alcançadas pela presente alteração permanecem em vigor, sendo integralmente ratificadas por este instrumento.',
      'O instrumento preserva expressamente tudo o que a alteração não modificou.'
    ),
    (
      'ac000002-0000-4000-8000-000000000004'::uuid,
      'Face às alterações ocorridas, os sócios resolvem consolidar o contrato social, que passa a vigorar com a seguinte redação:',
      'A transição para o contrato consolidado deixa de ocorrer sem anúncio.'
    ),
    (
      'ac000002-0000-4000-8000-000000000005'::uuid,
      E'*{{ sociedade.razaoSocial }}*\n{{#sociedade.cnpj}}CNPJ nº {{ sociedade.cnpj }}\n{{/sociedade.cnpj}}{{#sociedade.nire}}NIRE nº {{ sociedade.nire }}\n{{/sociedade.nire}}\n{{#socios sep=";\\n\\n" fim="; e\\n\\n"}}{{ socio.qualificacao }}{{/socios}}.\n\n  Únicos sócios da sociedade limitada *{{ sociedade.razaoSocial }}*, resolvem consolidar o seu contrato social, de acordo com as cláusulas e condições seguintes:',
      'O consolidado reabre com a identificação da sociedade e dos sócios para funcionar como contrato completo.'
    )
  ) AS moldura(bloco_id, conteudo, changelog)
 WHERE NOT EXISTS (
   SELECT 1
     FROM public.tmpl_bloco_versao bv
    WHERE bv.bloco_id = moldura.bloco_id
 );

-- 3. Os dois caminhos do preâmbulo são mutuamente exclusivos
INSERT INTO public.tmpl_bloco_flag (bloco_id, flag_id)
SELECT vinculo.bloco_id, f.id
  FROM (VALUES
    ('855cef65-8907-43ae-b555-fb63ee93a87b'::uuid, 'e_constituicao'),
    ('ac000002-0000-4000-8000-000000000001'::uuid, 'e_alteracao'),
    ('ac000002-0000-4000-8000-000000000002'::uuid, 'e_alteracao'),
    ('ac000002-0000-4000-8000-000000000003'::uuid, 'e_alteracao'),
    ('ac000002-0000-4000-8000-000000000004'::uuid, 'e_alteracao'),
    ('ac000002-0000-4000-8000-000000000005'::uuid, 'e_alteracao')
  ) AS vinculo(bloco_id, flag_nome)
  JOIN public.tmpl_flag f ON f.nome = vinculo.flag_nome
ON CONFLICT (bloco_id, flag_id) DO NOTHING;

-- 4. Posição da moldura nos modelos societários
DO $$
DECLARE
  v_documento record;
  v_secao uuid := 'ac000002-0000-4000-8000-000000000002'::uuid;
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
         AND bloco_id = v_secao
    ) THEN
      UPDATE public.tmpl_documento_bloco
         SET ordem = ordem + 1,
             updated_at = now()
       WHERE documento_id = v_documento.id
         AND bloco_id IN (
           'ac000001-0000-4000-8000-000000000001'::uuid,
           'ac000001-0000-4000-8000-000000000002'::uuid,
           'ac000001-0000-4000-8000-000000000003'::uuid,
           'ac000001-0000-4000-8000-000000000004'::uuid,
           'ac000001-0000-4000-8000-000000000005'::uuid,
           'ac000001-0000-4000-8000-000000000006'::uuid
         );

      INSERT INTO public.tmpl_documento_bloco (
        documento_id,
        bloco_id,
        ordem,
        obrigatorio
      )
      VALUES
        (v_documento.id, 'ac000002-0000-4000-8000-000000000001'::uuid, 2, false),
        (v_documento.id, 'ac000002-0000-4000-8000-000000000002'::uuid, 3, false),
        (v_documento.id, 'ac000002-0000-4000-8000-000000000003'::uuid, 10, false),
        (v_documento.id, 'ac000002-0000-4000-8000-000000000004'::uuid, 11, false),
        (v_documento.id, 'ac000002-0000-4000-8000-000000000005'::uuid, 12, false)
      ON CONFLICT (documento_id, bloco_id) DO NOTHING;
    END IF;
  END LOOP;
END $$;