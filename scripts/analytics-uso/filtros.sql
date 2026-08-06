-- Payload do endpoint  GET /api/v1/analytics/uso/filtros
-- Fontes: VW_ANL_USO_API + VW_ANL_GERAL_ARQUIVOS   |   Sem params
--
-- Unico endpoint que cruza as duas views, e o unico que NAO recebe periodo:
-- as opcoes precisam ser calculadas sem filtro aplicado, senao elas somem
-- conforme o usuario filtra. Mesma razao pela qual a Calculadora IBS/CBS
-- mantem /filtros separado e o chama uma unica vez na montagem da pagina.
WITH api AS (
  SELECT * FROM `psa-digital-prod.psa_analytics.VW_ANL_USO_API`
),
arq AS (
  SELECT * FROM `psa-digital-prod.psa_analytics.VW_ANL_GERAL_ARQUIVOS`
  WHERE data_ingestao IS NOT NULL
)

SELECT TO_JSON_STRING(STRUCT(
  STRUCT(
    (SELECT CAST(MIN(data_evento)   AS STRING) FROM api) AS apiMin,
    (SELECT CAST(MAX(data_evento)   AS STRING) FROM api) AS apiMax,
    (SELECT CAST(MIN(data_ingestao) AS STRING) FROM arq) AS arquivosMin,
    (SELECT CAST(MAX(data_ingestao) AS STRING) FROM arq) AS arquivosMax
  ) AS periodo,

  ARRAY(SELECT DISTINCT agrupado_ferramentas FROM api
        WHERE agrupado_ferramentas IS NOT NULL ORDER BY agrupado_ferramentas) AS ferramentas,

  ARRAY(SELECT DISTINCT normalized_path FROM api
        WHERE normalized_path IS NOT NULL ORDER BY normalized_path)           AS endpoints,

  ARRAY(SELECT DISTINCT method FROM api
        WHERE method IS NOT NULL ORDER BY method)                             AS metodos,

  ARRAY(SELECT DISTINCT tipo_operacao FROM api
        WHERE tipo_operacao IS NOT NULL ORDER BY tipo_operacao)               AS tiposOperacao,

  ARRAY(SELECT DISTINCT status_code FROM api
        WHERE status_code IS NOT NULL ORDER BY status_code)                   AS statusCodes,

  ARRAY(
    SELECT AS STRUCT
      nome_responsavel                                                        AS usuario,
      ANY_VALUE(user_email)                                                   AS email,
      LOGICAL_OR(user_email IS NULL
                 OR nome_responsavel IN ('Automacao', 'Automação Psa'))       AS automacao
    FROM api
    GROUP BY nome_responsavel
    ORDER BY nome_responsavel
  ) AS usuariosApi,

  ARRAY(
    SELECT AS STRUCT
      adicionado_por                                                          AS usuario,
      LOGICAL_OR(adicionado_por = 'Automacao')                                AS automacao
    FROM arq
    GROUP BY adicionado_por
    ORDER BY adicionado_por
  ) AS usuariosArquivos,

  ARRAY(SELECT DISTINCT tipo_arquivo FROM arq
        WHERE tipo_arquivo IS NOT NULL ORDER BY tipo_arquivo)                 AS tiposArquivo,

  ARRAY(
    SELECT DISTINCT causa FROM (
      SELECT CASE
        WHEN mensagem_erro LIKE '%ja existe%'             THEN 'Duplicidade (documento ja existe)'
        WHEN mensagem_erro LIKE 'Namespace invalido%'     THEN 'Namespace XML invalido'
        WHEN mensagem_erro LIKE '%contribuinte invalido%' THEN 'Contribuinte invalido'
        WHEN mensagem_erro LIKE '%permiss%'               THEN 'Permissao negada'
        WHEN mensagem_erro LIKE '%timeout%'               THEN 'Timeout'
        ELSE 'Outro'
      END AS causa
      FROM arq WHERE status_processamento = 'ERRO'
    )
    ORDER BY causa
  ) AS causasErro,

  ARRAY(
    SELECT DISTINCT cliente FROM (
      SELECT nome_cliente AS cliente FROM api WHERE nome_cliente IS NOT NULL
      UNION ALL
      SELECT nome_cliente AS cliente FROM arq WHERE nome_cliente IS NOT NULL
    )
    ORDER BY cliente
  ) AS clientes,

  ARRAY(
    SELECT DISTINCT cluster_id FROM (
      SELECT cluster_id FROM api WHERE cluster_id IS NOT NULL
      UNION ALL
      SELECT cluster_id FROM arq WHERE cluster_id IS NOT NULL
    )
    ORDER BY cluster_id
  ) AS clusters
)) AS payload
