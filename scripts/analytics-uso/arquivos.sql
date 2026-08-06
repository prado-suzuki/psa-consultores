-- Payload do endpoint  GET /api/v1/analytics/uso/arquivos
-- Fonte: psa_analytics.VW_ANL_GERAL_ARQUIVOS
-- Params: @inicio DATE, @fim DATE, @usuario STRING, @cluster_id STRING
-- (@ferramenta nao se aplica: a view de arquivos nao tem esse conceito.)
-- Strings vazias significam "todos".
--
-- UMA query devolve o payload inteiro (mesmo padrao de uso-api.sql).
--
-- CORRECOES aplicadas em relacao ao dashboard do Looker Studio:
--   * Causa raiz reclassificada. A view usa
--     `MSG_ERRO LIKE '%hash%ja existe%'`, mas a mensagem real e
--     "Documento com chave de acesso <chave> ja existe" — sem a palavra "hash".
--     Resultado no Looker: 99% dos 3.532 erros caem em "Outro". Reclassificado,
--     98,3% sao duas causas acionaveis (duplicidade 60,6% e namespace XML 37,7%).
--   * porUsuario abre o erro por causa. O ranking do Looker atribui 99,2% dos
--     erros a duas pessoas; na verdade 1.333 dos 2.390 de um deles sao um unico
--     bug de pipeline (XML de CT-e entrando no fluxo de NF-e, 27/abr a 17/jun) e
--     1.042 sao reenvio do mesmo arquivo. Erro atribuivel real: 15.
--   * SUCESSO e ERRO sempre separados. A view faz UNION ALL dos dois e no Looker
--     so 3 dos 36 graficos aplicam o filtro de status — o resto soma envio com erro.
--   * `pasta` = diretorio de verdade. `caminho_drive` guarda o caminho ate o
--     ARQUIVO (3.523 dos 3.532 terminam em .xml/.txt/.zip), entao contar distintos
--     dava 158 "pastas" onde existem 21.
--   * `registrosSemDataIngestao` exposto nos totais: 197.055 das 222.653 linhas
--     da view (88,5%) nao tem data e somem de qualquer recorte por periodo.
--     Melhor mostrar o buraco do que descarta-lo em silencio.
--   * porMes sai ordenado por data, nao por volume.
WITH classificado AS (
  SELECT
    tipo_arquivo,
    data_ingestao,
    mes_ingestao,
    adicionado_por,
    cluster_id,
    IFNULL(cluster_id, '__sem_cluster__')                       AS cluster_key,
    (adicionado_por = 'Automacao')                              AS automacao,
    status_processamento,
    nome_arquivo,
    nome_cliente,
    IFNULL(NULLIF(REGEXP_REPLACE(caminho_drive, r'\s*/\s*[^/]+$', ''), ''),
           '(sem caminho)')                                     AS pasta,
    CASE
      WHEN status_processamento <> 'ERRO'                  THEN NULL
      WHEN mensagem_erro LIKE '%ja existe%'                THEN 'Duplicidade (documento ja existe)'
      WHEN mensagem_erro LIKE 'Namespace invalido%'        THEN 'Namespace XML invalido'
      WHEN mensagem_erro LIKE '%contribuinte invalido%'    THEN 'Contribuinte invalido'
      WHEN mensagem_erro LIKE '%permiss%'                  THEN 'Permissao negada'
      WHEN mensagem_erro LIKE '%timeout%'                  THEN 'Timeout'
      ELSE 'Outro'
    END                                                         AS causa,
    -- A pergunta que importa nao e "falhou?", e "o documento entrou?".
    -- Verificado no BigQuery: das 2.142 falhas de duplicidade, 1.783 apontam
    -- para chave que JA esta em psa_nfe/psa_cte — reenvio, nao perda. Ja dos
    -- 1.333 XML de CT-e barrados por namespace, NENHUM entrou depois.
    CASE
      WHEN status_processamento <> 'ERRO'   THEN NULL
      WHEN mensagem_erro LIKE '%ja existe%' THEN 'reenvio'
      ELSE 'ausente'
    END                                                         AS impacto
  FROM `psa-digital-prod.psa_analytics.VW_ANL_GERAL_ARQUIVOS`
  WHERE data_ingestao BETWEEN @inicio AND @fim
    AND (NULLIF(@usuario, '') IS NULL OR adicionado_por = @usuario)
    AND (NULLIF(@cluster_id, '') IS NULL OR cluster_id = @cluster_id)
),

-- Automacao fora de TODOS os blocos: 21.778 dos 22.066 envios sao do robo, e
-- com ele dentro o dashboard descreve a carga automatica, nao a equipe. O
-- volume dele nao se perde — volta em `totais.automacao*` como contexto.
humanos AS (
  SELECT * FROM classificado WHERE NOT automacao
),

robo AS (
  SELECT
    COUNTIF(status_processamento = 'SUCESSO') AS enviados,
    COUNTIF(status_processamento = 'ERRO')    AS erros
  FROM classificado
  WHERE automacao
),

cobertura AS (
  SELECT
    COUNT(*)                                                    AS registrosTotais,
    COUNTIF(data_ingestao IS NULL)                              AS registrosSemData
  FROM `psa-digital-prod.psa_analytics.VW_ANL_GERAL_ARQUIVOS`
  WHERE (NULLIF(@usuario, '') IS NULL OR adicionado_por = @usuario)
    AND (NULLIF(@cluster_id, '') IS NULL OR cluster_id = @cluster_id)
)

SELECT TO_JSON_STRING(STRUCT(
  STRUCT(CAST(@inicio AS STRING) AS inicio, CAST(@fim AS STRING) AS fim) AS periodo,

  (
    SELECT AS STRUCT
      COUNTIF(status_processamento = 'SUCESSO')                 AS enviados,
      COUNTIF(status_processamento = 'ERRO')                    AS erros,
      COUNTIF(impacto = 'ausente')                              AS naoEntraram,
      COUNTIF(impacto = 'reenvio')                              AS reenvios,
      ROUND(SAFE_DIVIDE(
        COUNTIF(status_processamento = 'ERRO'), COUNT(*)), 4)   AS taxaErro,
      COUNT(DISTINCT IF(impacto = 'ausente', nome_arquivo, NULL))
                                                                AS arquivosAusentesDistintos,
      COUNT(DISTINCT IF(status_processamento = 'ERRO', nome_arquivo, NULL))
                                                                AS arquivosDistintosComErro,
      COUNT(DISTINCT IF(status_processamento = 'ERRO', pasta, NULL))
                                                                AS pastasComErro,
      COUNT(DISTINCT adicionado_por)                            AS usuariosAtivos,
      (SELECT registrosSemData  FROM cobertura)                 AS registrosSemDataIngestao,
      (SELECT registrosTotais   FROM cobertura)                 AS registrosTotaisNaView,
      (SELECT enviados FROM robo)                               AS automacaoEnviados,
      (SELECT erros    FROM robo)                               AS automacaoErros
    FROM humanos
  ) AS totais,

  ARRAY(
    SELECT AS STRUCT
      FORMAT_DATE('%Y-%m', mes_ingestao)                        AS mes,
      COUNTIF(status_processamento = 'SUCESSO')                 AS enviados,
      COUNTIF(impacto = 'ausente')                              AS naoEntraram,
      COUNTIF(impacto = 'reenvio')                              AS reenvios,
      COUNTIF(status_processamento = 'ERRO')                    AS erros,
      ROUND(SAFE_DIVIDE(
        COUNTIF(status_processamento = 'ERRO'), COUNT(*)), 4)   AS taxaErro
    FROM humanos
    GROUP BY mes_ingestao
    ORDER BY mes_ingestao
  ) AS porMes,

  ARRAY(
    SELECT AS STRUCT
      tipo_arquivo                                              AS tipoArquivo,
      COUNTIF(status_processamento = 'SUCESSO')                 AS enviados,
      COUNTIF(status_processamento = 'ERRO')                    AS erros,
      ROUND(SAFE_DIVIDE(
        COUNTIF(status_processamento = 'ERRO'), COUNT(*)), 4)   AS taxaErro
    FROM humanos
    GROUP BY tipo_arquivo
    ORDER BY erros DESC, enviados DESC
  ) AS porTipo,

  ARRAY(
    SELECT AS STRUCT
      causa                                                     AS causa,
      ANY_VALUE(impacto)                                        AS impacto,
      COUNT(*)                                                  AS erros,
      COUNT(DISTINCT nome_arquivo)                              AS arquivosDistintos,
      ROUND(SAFE_DIVIDE(COUNT(*), SUM(COUNT(*)) OVER ()), 4)    AS pct
    FROM humanos
    WHERE status_processamento = 'ERRO'
    GROUP BY causa
    ORDER BY erros DESC
  ) AS porCausa,

  ARRAY(
    SELECT AS STRUCT
      adicionado_por                                            AS usuario,
      ANY_VALUE(cluster_id)                                     AS clusterId,
      LOGICAL_OR(automacao)                                     AS automacao,
      COUNTIF(status_processamento = 'SUCESSO')                 AS enviados,
      COUNTIF(status_processamento = 'ERRO')                    AS erros,
      COUNTIF(impacto = 'ausente')                              AS naoEntraram,
      COUNTIF(causa = 'Duplicidade (documento ja existe)')      AS erroDuplicidade,
      COUNTIF(causa = 'Namespace XML invalido')                 AS erroNamespace,
      COUNTIF(causa = 'Contribuinte invalido')                  AS erroContribuinte,
      COUNTIF(causa = 'Outro')                                  AS erroNaoClassificado,
      COUNT(DISTINCT IF(status_processamento = 'ERRO', nome_arquivo, NULL))
                                                                AS arquivosDistintosComErro,
      CAST(MAX(IF(status_processamento = 'ERRO', data_ingestao, NULL)) AS STRING)
                                                                AS ultimoErro
    FROM humanos
    GROUP BY adicionado_por
    ORDER BY enviados DESC, erros DESC
  ) AS porUsuario,

  ARRAY(
    SELECT AS STRUCT
      pasta                                                     AS pasta,
      ANY_VALUE(nome_cliente)                                   AS cliente,
      COUNT(*)                                                  AS erros,
      COUNT(DISTINCT nome_arquivo)                              AS arquivosDistintos
    FROM humanos
    WHERE status_processamento = 'ERRO'
    GROUP BY pasta
    ORDER BY erros DESC
  ) AS porPasta,

  -- Cliente responde "quem foi afetado" sem exigir leitura de caminho de Drive.
  ARRAY(
    SELECT AS STRUCT
      IFNULL(nome_cliente, '(sem cliente)')                     AS cliente,
      COUNTIF(status_processamento = 'SUCESSO')                 AS enviados,
      COUNTIF(impacto = 'ausente')                              AS naoEntraram,
      COUNTIF(impacto = 'reenvio')                              AS reenvios,
      COUNTIF(status_processamento = 'ERRO')                    AS erros,
      ROUND(SAFE_DIVIDE(
        COUNTIF(status_processamento = 'ERRO'), COUNT(*)), 4)   AS taxaErro,
      COUNT(DISTINCT tipo_arquivo)                              AS tiposArquivo
    FROM humanos
    GROUP BY cliente
    ORDER BY naoEntraram DESC, enviados DESC
  ) AS porCliente,

  STRUCT(
    ARRAY(
      SELECT AS STRUCT
        FORMAT_DATE('%Y-%m', mes_ingestao)                      AS mes,
        COUNTIF(status_processamento = 'SUCESSO')               AS enviados,
        COUNTIF(status_processamento = 'ERRO')                  AS erros,
        ROUND(SAFE_DIVIDE(COUNTIF(status_processamento = 'ERRO'), COUNT(*)), 4)
                                                                AS taxaErro,
        COUNT(DISTINCT IF(NOT automacao, adicionado_por, NULL)) AS usuariosAtivosHumanos,
        COUNTIF(status_processamento = 'SUCESSO' AND automacao) AS enviadosAutomacao,
        ROUND(SAFE_DIVIDE(
          COUNTIF(status_processamento = 'SUCESSO' AND automacao),
          COUNTIF(status_processamento = 'SUCESSO')), 4)        AS participacaoAutomacao,
        COUNTIF(status_processamento = 'ERRO' AND causa = 'Outro')
                                                                AS falhasNaoClassificadas
      FROM classificado
      GROUP BY mes_ingestao
      ORDER BY mes_ingestao
    ) AS porMes,

    ARRAY(
      SELECT AS STRUCT
        FORMAT_DATE('%Y-%m', mes_ingestao)                      AS mes,
        NULLIF(cluster_key, '__sem_cluster__')                  AS clusterId,
        COUNTIF(status_processamento = 'SUCESSO')               AS enviados,
        COUNTIF(status_processamento = 'ERRO')                  AS erros,
        ROUND(SAFE_DIVIDE(COUNTIF(status_processamento = 'ERRO'), COUNT(*)), 4)
                                                                AS taxaErro,
        COUNT(DISTINCT IF(NOT automacao, adicionado_por, NULL)) AS usuariosAtivosHumanos,
        COUNTIF(status_processamento = 'SUCESSO' AND automacao) AS enviadosAutomacao,
        ROUND(SAFE_DIVIDE(
          COUNTIF(status_processamento = 'SUCESSO' AND automacao),
          COUNTIF(status_processamento = 'SUCESSO')), 4)        AS participacaoAutomacao,
        COUNTIF(status_processamento = 'ERRO' AND causa = 'Outro')
                                                                AS falhasNaoClassificadas
      FROM classificado
      GROUP BY mes_ingestao, cluster_key
      ORDER BY mes_ingestao, enviados DESC
    ) AS porClusterMes,

    ARRAY(
      SELECT AS STRUCT
        NULLIF(cluster_key, '__sem_cluster__')                  AS clusterId,
        COUNTIF(status_processamento = 'SUCESSO')               AS enviados,
        COUNTIF(status_processamento = 'ERRO')                  AS erros,
        ROUND(SAFE_DIVIDE(COUNTIF(status_processamento = 'ERRO'), COUNT(*)), 4)
                                                                AS taxaErro,
        COUNT(DISTINCT IF(NOT automacao, adicionado_por, NULL)) AS usuariosAtivosHumanos,
        COUNTIF(status_processamento = 'SUCESSO' AND automacao) AS enviadosAutomacao,
        ROUND(SAFE_DIVIDE(
          COUNTIF(status_processamento = 'SUCESSO' AND automacao),
          COUNTIF(status_processamento = 'SUCESSO')), 4)        AS participacaoAutomacao,
        COUNTIF(status_processamento = 'ERRO' AND causa = 'Outro')
                                                                AS falhasNaoClassificadas
      FROM classificado
      GROUP BY cluster_key
      ORDER BY enviados DESC
    ) AS porCluster
  ) AS gerencial
)) AS payload
