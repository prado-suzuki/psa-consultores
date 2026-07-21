-- Normaliza os bindings dos contratos societários atuais sem alterar versões
-- históricas já seladas. Abrange tanto blocos do contrato da controlada quanto
-- da controladora, inclusive quando foram criados pela interface e não por seed.

DO $$
DECLARE
  bloco record;
  referencia record;
  conteudo_normalizado text;
  proxima_versao integer;
BEGIN
  FOR bloco IN
    SELECT DISTINCT
        b.id       AS bloco_id,
        v.id       AS versao_id,
        v.conteudo AS conteudo
    FROM public.tmpl_documento         d
    INNER JOIN public.tmpl_documento_bloco db ON  db.documento_id = d.id
    INNER JOIN public.tmpl_bloco       b  ON  b.id = db.bloco_id
    INNER JOIN public.tmpl_bloco_versao v ON  v.bloco_id = b.id
                                           AND v.atual    = true
    WHERE d.tipo = 'societario'
      AND v.conteudo IS NOT NULL
      AND NOT EXISTS (
        SELECT 1
        FROM public.tmpl_documento_bloco db_outro
        INNER JOIN public.tmpl_documento d_outro ON  d_outro.id = db_outro.documento_id
        WHERE db_outro.bloco_id = b.id
          AND d_outro.tipo IS DISTINCT FROM 'societario'
      )
  LOOP
    conteudo_normalizado := regexp_replace(
      bloco.conteudo,
      '(\{\{[[:space:]]*[#/]?[[:space:]]*)(controlada|controladora)\.',
      '\1sociedade.',
      'g'
    );

    conteudo_normalizado := regexp_replace(
      conteudo_normalizado,
      '(\{\{[[:space:]]*[#/][[:space:]]*)(controlada|controladora)([[:space:]]*\}\})',
      '\1sociedade.razaoSocial\3',
      'g'
    );

    -- A cláusula usa o Estado por extenso; o fecho "Cidade/UF" usa a sigla.
    conteudo_normalizado := regexp_replace(
      conteudo_normalizado,
      '\{\{[[:space:]]*(sociedade\.)?foroComarca[[:space:]]*\}\}[[:space:]]*/[[:space:]]*\{\{[[:space:]]*(sociedade\.)?foroUf[[:space:]]*\}\}',
      '{{ sociedade.sedeMunicipio }}/{{ sociedade.sedeUf }}',
      'g'
    );

    FOR referencia IN
      SELECT *
      FROM (VALUES
        ('razaoSocial',                      'sociedade.razaoSocial'),
        ('sedeEndereco',                     'sociedade.sedeEndereco'),
        ('sedeMunicipio',                    'sociedade.sedeMunicipio'),
        ('sedeUf',                           'sociedade.sedeUfExtenso'),
        ('sedeCep',                          'sociedade.sedeCep'),
        ('objetoSocial',                     'sociedade.objeto'),
        ('capitalValor',                     'sociedade.capitalValor'),
        ('capitalExtenso',                   'sociedade.capitalExtenso'),
        ('totalQuotas',                      'sociedade.totalQuotas'),
        ('totalQuotasExtenso',               'sociedade.totalQuotasExtenso'),
        ('regimeCasamento',                  'conjuge.regimeBens'),
        ('foroComarca',                      'sociedade.sedeMunicipio'),
        ('foroUf',                           'sociedade.sedeUfExtenso'),
        ('sociedade\.nome',                 'sociedade.razaoSocial'),
        ('sociedade\.denominacao',          'sociedade.razaoSocial'),
        ('sociedade\.cpfCnpj',              'sociedade.cnpj'),
        ('sociedade\.objetoSocial',         'sociedade.objeto'),
        ('sociedade\.juntaComercialUf',     'sociedade.juntaUf'),
        ('sociedade\.capitalSocial',        'sociedade.capitalValor'),
        ('sociedade\.capitalSocialExtenso', 'sociedade.capitalExtenso'),
        ('sociedade\.foroComarca',          'sociedade.sedeMunicipio'),
        ('sociedade\.foroUf',               'sociedade.sedeUfExtenso')
      ) AS aliases(origem, destino)
    LOOP
      conteudo_normalizado := regexp_replace(
        conteudo_normalizado,
        '(\{\{[[:space:]]*[#/]?[[:space:]]*)' || referencia.origem || '([[:space:]]|\})',
        '\1' || referencia.destino || '\2',
        'g'
      );
    END LOOP;

    IF conteudo_normalizado IS DISTINCT FROM bloco.conteudo THEN
      SELECT coalesce(max(v.numero_versao), 0) + 1
      INTO proxima_versao
      FROM public.tmpl_bloco_versao v
      WHERE v.bloco_id = bloco.bloco_id;

      UPDATE public.tmpl_bloco_versao
      SET atual = false
      WHERE id = bloco.versao_id;

      INSERT INTO public.tmpl_bloco_versao (
        bloco_id,
        numero_versao,
        atual,
        conteudo,
        changelog
      ) VALUES (
        bloco.bloco_id,
        proxima_versao,
        true,
        conteudo_normalizado,
        'Bindings societários normalizados para sociedade.* (controlada e controladora).'
      );
    END IF;
  END LOOP;
END $$;
