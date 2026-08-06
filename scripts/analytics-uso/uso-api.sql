-- Payload do endpoint  GET /api/v1/analytics/uso/api-consumo
-- Fonte: psa_analytics.VW_ANL_USO_API
-- Params: @inicio DATE, @fim DATE, @usuario STRING, @cluster_id STRING, @ferramenta STRING
-- Strings vazias significam "todos".
--
-- UMA query devolve o payload inteiro, no padrao do
-- CalculadoraIbsCbsService.get_resumo (CTEs + TO_JSON_STRING(STRUCT(...))):
-- o service inteiro da Calculadora tem exatamente 1 _execute_query por
-- endpoint, por mais blocos visuais que ele alimente.
--
-- CORRECOES aplicadas em relacao ao dashboard do Looker Studio:
--   * NAO aplica "excluir nome_cliente nulo". No Looker esse filtro esta em 11
--     graficos e derruba 80,8% do trafego (so 2.175 de 13.044 chamadas tem UUID
--     de contribuinte no path), o que subestimava o uso em ate 23x por usuario
--     e escondia ferramentas inteiras (Controle Balancetes, PERDCOMP).
--   * p95 calculado sobre todo o trafego: 11.443 ms reais contra 3.784 ms
--     exibidos no Looker.
--   * NAO usa a coluna `chamadas_endpoint` da view: e um
--     COUNT(*) OVER (PARTITION BY normalized_path) sobre a view inteira, que
--     ignora qualquer filtro de periodo. Aqui a contagem vem de GROUP BY.
--   * `automacao` vira flag por linha em vez de filtro. O filtro `filtro_null_id`
--     do Looker ("excluir adicionado_por nulo", em 17 graficos) e um no-op,
--     porque a view ja faz COALESCE(..., 'Automacao') e o campo nunca e nulo.
--   * porMes sai ordenado por data, nao por volume.
WITH origem AS (
  SELECT
    normalized_path,
    agrupado_ferramentas,
    tipo_operacao,
    method,
    status_code,
    is_erro,
    duration_ms,
    data_evento,
    mes_evento,
    nome_responsavel,
    user_email,
    cluster_id,
    IFNULL(cluster_id, '__sem_cluster__') AS cluster_key,
    (user_email IS NULL OR nome_responsavel IN ('Automacao', 'Automação Psa')) AS automacao
  FROM `psa-digital-prod.psa_analytics.VW_ANL_USO_API`
  -- Rotas que nao sao endpoint de API. A view ja descarta '/', '/health',
  -- '/auth_health' e '/favicon.ico', mas deixa passar a pagina de docs do
  -- FastAPI e rotas de frontend batendo no backend por engano. Elas so
  -- produzem 404, o que inflava a contagem de endpoints ativos e colocava
  -- '/docs' (5 chamadas, 100% de erro) no topo do ranking de taxa de erro.
  WHERE normalized_path NOT IN ('/docs', '/redoc', '/openapi.json', '/auth')
),

escopo AS (
  SELECT *
  FROM origem
  WHERE (NULLIF(@usuario, '') IS NULL OR nome_responsavel = @usuario)
    AND (NULLIF(@cluster_id, '') IS NULL OR cluster_id = @cluster_id)
    AND (NULLIF(@ferramenta, '') IS NULL OR agrupado_ferramentas = @ferramenta)
),

base AS (
  SELECT *
  FROM escopo
  WHERE data_evento BETWEEN @inicio AND @fim
),

humanos AS (
  SELECT * FROM base WHERE NOT automacao
),

primeiro_uso_org AS (
  SELECT nome_responsavel AS usuario, MIN(data_evento) AS primeiro_uso
  FROM escopo
  WHERE NOT automacao
  GROUP BY nome_responsavel
),

primeiro_uso_cluster AS (
  SELECT cluster_key, nome_responsavel AS usuario, MIN(data_evento) AS primeiro_uso
  FROM escopo
  WHERE NOT automacao
  GROUP BY cluster_key, nome_responsavel
),

usuarios_mes_org AS (
  SELECT DISTINCT mes_evento, nome_responsavel AS usuario
  FROM humanos
),

usuarios_mes_cluster AS (
  SELECT DISTINCT mes_evento, cluster_key, nome_responsavel AS usuario
  FROM humanos
),

contagem_usuarios_mes_org AS (
  SELECT mes_evento, COUNT(*) AS usuarios
  FROM usuarios_mes_org
  GROUP BY mes_evento
),

contagem_usuarios_mes_cluster AS (
  SELECT mes_evento, cluster_key, COUNT(*) AS usuarios
  FROM usuarios_mes_cluster
  GROUP BY mes_evento, cluster_key
),

retencao_org AS (
  SELECT
    atual.mes_evento,
    COUNT(anterior.usuario) AS usuarios_retidos,
    ANY_VALUE(IFNULL(base_anterior.usuarios, 0)) AS usuarios_base
  FROM usuarios_mes_org atual
  LEFT JOIN usuarios_mes_org anterior
    ON anterior.usuario = atual.usuario
   AND anterior.mes_evento = DATE_SUB(atual.mes_evento, INTERVAL 1 MONTH)
  LEFT JOIN contagem_usuarios_mes_org base_anterior
    ON base_anterior.mes_evento = DATE_SUB(atual.mes_evento, INTERVAL 1 MONTH)
  GROUP BY atual.mes_evento
),

retencao_cluster AS (
  SELECT
    atual.mes_evento,
    atual.cluster_key,
    COUNT(anterior.usuario) AS usuarios_retidos,
    ANY_VALUE(IFNULL(base_anterior.usuarios, 0)) AS usuarios_base
  FROM usuarios_mes_cluster atual
  LEFT JOIN usuarios_mes_cluster anterior
    ON anterior.usuario = atual.usuario
   AND anterior.cluster_key = atual.cluster_key
   AND anterior.mes_evento = DATE_SUB(atual.mes_evento, INTERVAL 1 MONTH)
  LEFT JOIN contagem_usuarios_mes_cluster base_anterior
    ON base_anterior.cluster_key = atual.cluster_key
   AND base_anterior.mes_evento = DATE_SUB(atual.mes_evento, INTERVAL 1 MONTH)
  GROUP BY atual.mes_evento, atual.cluster_key
),

metricas_mes_org AS (
  SELECT
    h.mes_evento,
    COUNT(DISTINCT h.nome_responsavel) AS usuarios_ativos,
    COUNT(DISTINCT IF(DATE_TRUNC(p.primeiro_uso, MONTH) = h.mes_evento,
                      h.nome_responsavel, NULL)) AS usuarios_novos,
    COUNT(*) AS chamadas,
    ROUND(SAFE_DIVIDE(COUNT(*), COUNT(DISTINCT h.nome_responsavel)), 1)
      AS chamadas_por_usuario,
    COUNT(DISTINCT h.agrupado_ferramentas) AS ferramentas_ativas,
    ROUND(SAFE_DIVIDE(COUNTIF(NOT h.is_erro), COUNT(*)), 4) AS taxa_sucesso
  FROM humanos h
  JOIN primeiro_uso_org p ON p.usuario = h.nome_responsavel
  GROUP BY h.mes_evento
),

metricas_mes_cluster AS (
  SELECT
    h.mes_evento,
    h.cluster_key,
    COUNT(DISTINCT h.nome_responsavel) AS usuarios_ativos,
    COUNT(DISTINCT IF(DATE_TRUNC(p.primeiro_uso, MONTH) = h.mes_evento,
                      h.nome_responsavel, NULL)) AS usuarios_novos,
    COUNT(*) AS chamadas,
    ROUND(SAFE_DIVIDE(COUNT(*), COUNT(DISTINCT h.nome_responsavel)), 1)
      AS chamadas_por_usuario,
    COUNT(DISTINCT h.agrupado_ferramentas) AS ferramentas_ativas,
    ROUND(SAFE_DIVIDE(COUNTIF(NOT h.is_erro), COUNT(*)), 4) AS taxa_sucesso
  FROM humanos h
  JOIN primeiro_uso_cluster p
    ON p.cluster_key = h.cluster_key AND p.usuario = h.nome_responsavel
  GROUP BY h.mes_evento, h.cluster_key
),

usuarios_cluster_periodo AS (
  SELECT cluster_key, COUNT(DISTINCT nome_responsavel) AS usuarios
  FROM humanos
  GROUP BY cluster_key
)

SELECT TO_JSON_STRING(STRUCT(
  STRUCT(CAST(@inicio AS STRING) AS inicio, CAST(@fim AS STRING) AS fim) AS periodo,

  (
    SELECT AS STRUCT
      COUNT(*)                                                  AS chamadas,
      COUNTIF(is_erro)                                          AS erros,
      COUNTIF(status_code BETWEEN 500 AND 599)                  AS erros5xx,
      COUNTIF(status_code BETWEEN 400 AND 499)                  AS erros4xx,
      ROUND(SAFE_DIVIDE(COUNTIF(is_erro), COUNT(*)), 4)         AS taxaErro,
      ROUND(SAFE_DIVIDE(COUNTIF(status_code BETWEEN 500 AND 599), COUNT(*)), 4)
                                                                AS taxa5xx,
      ROUND(AVG(duration_ms), 1)                                AS latMediaMs,
      APPROX_QUANTILES(duration_ms, 100)[OFFSET(50)]            AS latP50Ms,
      APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)]            AS latP95Ms,
      COUNT(DISTINCT normalized_path)                           AS endpointsAtivos,
      COUNT(DISTINCT nome_responsavel)                          AS usuariosAtivos,
      COUNT(DISTINCT data_evento)                               AS diasAtivos
    FROM base
  ) AS totais,

  ARRAY(
    SELECT AS STRUCT
      FORMAT_DATE('%Y-%m', mes_evento)                          AS mes,
      COUNT(*)                                                  AS chamadas,
      COUNTIF(is_erro)                                          AS erros,
      ROUND(SAFE_DIVIDE(COUNTIF(is_erro), COUNT(*)), 4)         AS taxaErro,
      ROUND(AVG(duration_ms), 1)                                AS latMediaMs,
      APPROX_QUANTILES(duration_ms, 100)[OFFSET(50)]            AS latP50Ms,
      APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)]            AS latP95Ms
    FROM base
    GROUP BY mes_evento
    ORDER BY mes_evento
  ) AS porMes,

  ARRAY(
    SELECT AS STRUCT
      status_code                                               AS statusCode,
      CONCAT(CAST(DIV(status_code, 100) AS STRING), 'xx')       AS faixa,
      COUNT(*)                                                  AS chamadas
    FROM base
    WHERE status_code IS NOT NULL
    GROUP BY status_code
    ORDER BY chamadas DESC
  ) AS porStatus,

  ARRAY(
    SELECT AS STRUCT
      normalized_path                                           AS endpoint,
      ANY_VALUE(agrupado_ferramentas)                           AS ferramenta,
      COUNT(*)                                                  AS chamadas,
      COUNTIF(is_erro)                                          AS erros,
      -- 5xx e falha nossa; 4xx costuma ser do chamador (rota errada, payload
      -- invalido). Somar os dois num "taxaErro" so esconde qual e qual.
      COUNTIF(status_code BETWEEN 500 AND 599)                  AS erros5xx,
      COUNTIF(status_code BETWEEN 400 AND 499)                  AS erros4xx,
      ROUND(SAFE_DIVIDE(COUNTIF(is_erro), COUNT(*)), 4)         AS taxaErro,
      ROUND(SAFE_DIVIDE(COUNTIF(status_code BETWEEN 500 AND 599), COUNT(*)), 4)
                                                                AS taxa5xx,
      ROUND(AVG(duration_ms), 1)                                AS latMediaMs,
      APPROX_QUANTILES(duration_ms, 100)[OFFSET(50)]            AS latP50Ms,
      APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)]            AS latP95Ms
    FROM base
    GROUP BY normalized_path
    ORDER BY chamadas DESC
  ) AS porEndpoint,

  ARRAY(
    SELECT AS STRUCT
      agrupado_ferramentas                                      AS ferramenta,
      COUNT(*)                                                  AS chamadas,
      COUNTIF(is_erro)                                          AS erros,
      COUNTIF(status_code BETWEEN 500 AND 599)                  AS erros5xx,
      COUNTIF(status_code BETWEEN 400 AND 499)                  AS erros4xx,
      ROUND(SAFE_DIVIDE(COUNTIF(is_erro), COUNT(*)), 4)         AS taxaErro,
      ROUND(SAFE_DIVIDE(COUNTIF(status_code BETWEEN 500 AND 599), COUNT(*)), 4)
                                                                AS taxa5xx,
      ROUND(AVG(duration_ms), 1)                                AS latMediaMs,
      APPROX_QUANTILES(duration_ms, 100)[OFFSET(50)]            AS latP50Ms,
      APPROX_QUANTILES(duration_ms, 100)[OFFSET(95)]            AS latP95Ms,
      COUNT(DISTINCT nome_responsavel)                          AS usuarios
    FROM base
    GROUP BY agrupado_ferramentas
    ORDER BY chamadas DESC
  ) AS porFerramenta,

  ARRAY(
    SELECT AS STRUCT
      tipo_operacao                                             AS tipoOperacao,
      COUNT(*)                                                  AS chamadas,
      COUNTIF(is_erro)                                          AS erros
    FROM base
    GROUP BY tipo_operacao
    ORDER BY chamadas DESC
  ) AS porTipoOperacao,

  ARRAY(
    SELECT AS STRUCT
      method                                                    AS metodo,
      COUNT(*)                                                  AS chamadas,
      COUNTIF(is_erro)                                          AS erros
    FROM base
    GROUP BY method
    ORDER BY chamadas DESC
  ) AS porMetodo,

  ARRAY(
    SELECT AS STRUCT
      nome_responsavel                                          AS usuario,
      ANY_VALUE(user_email)                                     AS email,
      -- Acao aberta por natureza: consultar dado e uma coisa, extrair arquivo e
      -- outra. Sem essa quebra a tabela so dizia "fez N acoes".
      COUNTIF(tipo_operacao = 'Consulta de dados')               AS acoesConsulta,
      COUNTIF(tipo_operacao IN ('Download de arquivo original', 'Exportacao para Excel'))
                                                                AS acoesDownload,
      COUNTIF(tipo_operacao = 'Atualizacao de dados no DW')      AS acoesSincronizacao,
      ANY_VALUE(cluster_id)                                     AS clusterId,
      LOGICAL_OR(automacao)                                     AS automacao,
      COUNT(*)                                                  AS chamadas,
      COUNTIF(is_erro)                                          AS erros,
      ROUND(AVG(duration_ms), 1)                                AS latMediaMs,
      COUNT(DISTINCT data_evento)                               AS diasAtivos,
      COUNT(DISTINCT agrupado_ferramentas)                      AS ferramentasUsadas
    FROM base
    GROUP BY nome_responsavel
    ORDER BY chamadas DESC
  ) AS porUsuario,

  STRUCT(
    (SELECT CAST(MIN(data_evento) AS STRING) FROM escopo WHERE NOT automacao)
      AS inicioHistorico,

    ARRAY(
      SELECT AS STRUCT
        FORMAT_DATE('%Y-%m', m.mes_evento)                     AS mes,
        m.usuarios_ativos                                      AS usuariosAtivos,
        m.usuarios_novos                                       AS usuariosNovos,
        IFNULL(r.usuarios_retidos, 0)                           AS usuariosRetidos,
        IFNULL(r.usuarios_base, 0)                              AS usuariosBaseRetencao,
        ROUND(SAFE_DIVIDE(r.usuarios_retidos, r.usuarios_base), 4)
                                                                AS taxaRetencao,
        m.chamadas                                              AS chamadas,
        m.chamadas_por_usuario                                  AS chamadasPorUsuario,
        m.ferramentas_ativas                                    AS ferramentasAtivas,
        m.taxa_sucesso                                          AS taxaSucesso
      FROM metricas_mes_org m
      LEFT JOIN retencao_org r USING (mes_evento)
      ORDER BY m.mes_evento
    ) AS porMes,

    ARRAY(
      SELECT AS STRUCT
        FORMAT_DATE('%Y-%m', m.mes_evento)                     AS mes,
        NULLIF(m.cluster_key, '__sem_cluster__')                AS clusterId,
        m.usuarios_ativos                                      AS usuariosAtivos,
        m.usuarios_novos                                       AS usuariosNovos,
        IFNULL(r.usuarios_retidos, 0)                           AS usuariosRetidos,
        IFNULL(r.usuarios_base, 0)                              AS usuariosBaseRetencao,
        ROUND(SAFE_DIVIDE(r.usuarios_retidos, r.usuarios_base), 4)
                                                                AS taxaRetencao,
        m.chamadas                                              AS chamadas,
        m.chamadas_por_usuario                                  AS chamadasPorUsuario,
        m.ferramentas_ativas                                    AS ferramentasAtivas,
        m.taxa_sucesso                                          AS taxaSucesso
      FROM metricas_mes_cluster m
      LEFT JOIN retencao_cluster r USING (mes_evento, cluster_key)
      ORDER BY m.mes_evento, m.usuarios_ativos DESC
    ) AS porClusterMes,

    ARRAY(
      SELECT AS STRUCT
        agrupado_ferramentas                                    AS ferramenta,
        COUNT(DISTINCT nome_responsavel)                        AS usuariosAtivos,
        COUNT(*)                                                AS chamadas,
        ROUND(SAFE_DIVIDE(COUNT(DISTINCT nome_responsavel),
              (SELECT COUNT(DISTINCT nome_responsavel) FROM humanos)), 4)
                                                                AS coberturaUsuarios,
        ROUND(SAFE_DIVIDE(COUNTIF(NOT is_erro), COUNT(*)), 4)   AS taxaSucesso
      FROM humanos
      GROUP BY agrupado_ferramentas
      ORDER BY usuariosAtivos DESC, chamadas DESC
    ) AS porFerramenta,

    ARRAY(
      SELECT AS STRUCT
        NULLIF(h.cluster_key, '__sem_cluster__')                AS clusterId,
        h.agrupado_ferramentas                                  AS ferramenta,
        COUNT(DISTINCT h.nome_responsavel)                      AS usuariosAtivos,
        COUNT(*)                                                AS chamadas,
        ROUND(SAFE_DIVIDE(COUNT(DISTINCT h.nome_responsavel),
              ANY_VALUE(u.usuarios)), 4)                        AS coberturaUsuarios,
        ROUND(SAFE_DIVIDE(COUNTIF(NOT h.is_erro), COUNT(*)), 4) AS taxaSucesso
      FROM humanos h
      JOIN usuarios_cluster_periodo u USING (cluster_key)
      GROUP BY h.cluster_key, h.agrupado_ferramentas
      ORDER BY h.cluster_key, usuariosAtivos DESC, chamadas DESC
    ) AS porClusterFerramenta,

    ARRAY(
      SELECT AS STRUCT
        NULLIF(h.cluster_key, '__sem_cluster__')                AS clusterId,
        COUNT(DISTINCT h.nome_responsavel)                      AS usuariosAtivos,
        COUNT(DISTINCT IF(p.primeiro_uso BETWEEN @inicio AND @fim,
                          h.nome_responsavel, NULL))            AS usuariosNovos,
        COUNT(*)                                                AS chamadas,
        ROUND(SAFE_DIVIDE(COUNT(*), COUNT(DISTINCT h.nome_responsavel)), 1)
                                                                AS chamadasPorUsuario,
        COUNT(DISTINCT h.agrupado_ferramentas)                  AS ferramentasAtivas,
        ROUND(SAFE_DIVIDE(COUNTIF(NOT h.is_erro), COUNT(*)), 4) AS taxaSucesso
      FROM humanos h
      JOIN primeiro_uso_cluster p
        ON p.cluster_key = h.cluster_key AND p.usuario = h.nome_responsavel
      GROUP BY h.cluster_key
      ORDER BY usuariosAtivos DESC
    ) AS porCluster
  ) AS gerencial
)) AS payload
