# Especificação — endpoints do dashboard "Controle de uso e envio"

**Para:** engenharia de dados · **Validado em:** 07/08/2026 contra `psa-digital-prod`

Duas rotas `GET`, uma query cada, uma linha de resposta cada. **Nenhuma mudança
nas views é necessária.**

| Rota | Fonte | SQL de referência |
| --- | --- | --- |
| `/api/v1/analytics/uso/api-consumo` | `psa_analytics.VW_ANL_USO_API` | `scripts/analytics-uso/uso-api.sql` |
| `/api/v1/analytics/uso/arquivos` | `psa_analytics.VW_ANL_GERAL_ARQUIVOS` | `scripts/analytics-uso/arquivos.sql` |

As duas SQLs estão prontas e foram executadas em produção; os payloads passam na
validação que o front aplica, inclusive nos recortes vazios. **Use como estão ou
escreva as suas** — o que precisa ser satisfeito é o contrato, não o arquivo.

O contrato executável é `src/lib/analytics-uso/schemas.ts` (zod). Este documento
cobre o que não dá para ler nele: o comportamento HTTP (§2), as regras de
agregação (§4) e como validar (§6).

Não cobre a estrutura interna do `psa-backend-api` — layout de pastas,
dependência de auth e classe base de service são convenções do seu repositório.

---

## 1. Escopo e fontes

### Só existem dois endpoints

Ao ler `src/lib/analytics-uso/types.ts` você encontra um tipo
`AnalyticsGerencialResponse`. **Ele não corresponde a nenhuma rota** — é montado
no navegador por `montarGerencialAnalytics()` (`composicao.ts:144`), unindo
agregados que já vêm prontos das duas respostas. O mesmo vale para o catálogo dos
filtros (`montarCatalogoAnalytics()`). Houve um `/filtros` antes; foi removido.

Existem dois dashboards — técnico e gerencial — e ambos comem desses mesmos dois
payloads. O corte é por fonte, não por tela.

### As views

Projeto `psa-digital-prod`, dataset `psa_analytics`. Esquema completo via
`bq show`; abaixo só o que importa para a query.

**`VW_ANL_USO_API`** — 13.050 linhas, 2026-01-12 a 2026-08-07, sem nulos em
`data_evento`. Colunas usadas: `data_evento`, `mes_evento`, `normalized_path`,
`agrupado_ferramentas`, `tipo_operacao`, `method`, `status_code`, `is_erro`,
`duration_ms`, `nome_responsavel`, `user_email`, `cluster_id`.

- `user_email IS NULL` ⇒ conta de automação.
- `cluster_id`: 3 valores + 437 linhas nulas (o grupo "sem vínculo").
- `tipo_operacao` tem exatamente 4 valores e a query mapeia os 4:
  `Consulta de dados` (11.756) → `acoesConsulta`; `Download de arquivo original`
  (130) + `Exportacao para Excel` (366) → `acoesDownload`;
  `Atualizacao de dados no DW` (798) → `acoesSincronizacao`. Um valor novo não
  quebra o payload, mas some dessas três colunas.

**`VW_ANL_GERAL_ARQUIVOS`** — 222.657 linhas, 2026-01-14 a 2026-08-06. Colunas
usadas: `data_ingestao`, `mes_ingestao`, `tipo_arquivo`, `adicionado_por`,
`cluster_id`, `status_processamento`, `nome_arquivo`, `nome_cliente`,
`caminho_drive`, `mensagem_erro`.

- `adicionado_por = 'Automacao'` ⇒ robô.
- `status_processamento`: SUCESSO (219.121) / ERRO (3.536).
- **197.055 das 222.657 linhas (88,5%) não têm `data_ingestao`** e ficam fora de
  qualquer recorte por período. Você vai notar ao comparar o total do payload com
  um `COUNT(*)` na view — a diferença é essa. A query devolve os dois números em
  `totais.registrosSemDataIngestao` / `registrosTotaisNaView` para o dashboard
  declarar a lacuna. Nada a corrigir: é característica da fonte.

**Se você for mexer nas views por outro motivo:** `categoria_erro` está defasada
— o padrão é `LIKE '%hash%ja existe%'` mas a mensagem gravada hoje é
`"Documento com chave de acesso <chave> ja existe"`, sem "hash", então a coluna
joga quase tudo em "Outro". Por isso a query classifica pelo texto (§4.3).
Corrigir na fonte melhora quem lê essa coluna e não afeta as queries daqui.
Nenhuma das 15 views do dataset referencia estas duas; o impacto de qualquer
mudança fica nos consumidores de BI, que não aparecem no `INFORMATION_SCHEMA`.

---

## 2. Contrato HTTP

### Base

Resolvida por hostname em `src/config/api.ts`: `http://localhost:8000` em local,
`psa-backend-api-456879351254...` no preview, `psa-backend-api-1010211821554...`
em produção.

### Query string

| Param | Sempre enviado | Formato | Parâmetro BigQuery |
| --- | --- | --- | --- |
| `inicio` | sim | `YYYY-MM-DD` | `@inicio DATE` |
| `fim` | sim | `YYYY-MM-DD` | `@fim DATE` |
| `usuario` | não | texto exato de `nome_responsavel` / `adicionado_por` | `@usuario STRING` |
| `ferramenta` | não | texto exato de `agrupado_ferramentas` | `@ferramenta STRING` |
| `cluster_id` | não | UUID | `@cluster_id STRING` |

- Param ausente **não vai na URL**. Passe **string vazia** ao BigQuery — as SQLs
  usam `NULLIF(@param,'') IS NULL OR coluna = @param`. `NULL` funciona igual; a
  string `"None"` não.
- **`/arquivos` não aceita `@ferramenta`.** A view não tem esse eixo e
  `arquivos.sql` não declara o parâmetro — passá-lo faz o BigQuery falhar. O
  front não envia; se enviar, descarte antes de montar a query.
- Note o `_` em `cluster_id`; os outros três são minúsculas sem separador.

### Valores reais de `inicio` e `fim`

De `src/lib/analytics-uso/periodo.ts`. São quatro opções na tela: "todo o
período" manda `inicio` fixo em **`2026-01-01`**; as outras mandam o dia 1 do mês
5, 2 ou 0 meses atrás. `fim` é sempre hoje — data civil em **`America/Cuiaba`**,
não UTC.

### Auth

`Authorization: Bearer <JWT Supabase>`, como nas demais rotas. Nenhuma chamada
sai sem sessão (`useAnalyticsUso.ts:63`).

### Retry e cache — leia antes de dimensionar

Duas camadas, e elas não dizem a mesma coisa.

- **Transporte** (`client.ts:119`): timeout **30 s**, sem retry.
- **TanStack Query** (`useAnalyticsUso.ts:39`): **retenta**. 5xx e falha de rede
  → 1 vez. 429 → 1 vez, obedecendo o header `Retry-After`. Demais 4xx,
  `AbortError` e `TimeoutError` → não retenta. Backoff sem `Retry-After`:
  `min(1000·2^n, 4000) ms` + jitter.

**Um 5xx ou 429 vira uma segunda query.** Dimensione contando com isso, e mande
`Retry-After` no 429 — é obedecido literalmente.

Cache: `staleTime` 60 s, `gcTime` 3 min. Dentro de 60 s, trocar de aba não gera
chamada nova.

### A consulta sem filtro roda sempre

`useAnalyticsCatalogo()` dispara **as duas rotas com período completo e sem
filtro nenhum** em toda abertura do dashboard — é assim que os dropdowns de
pessoa, ferramenta e cluster são populados.

Duas consequências: é a chamada mais frequente e mais cara, candidata natural a
cache no servidor; e **os arrays `porFerramenta`, `porUsuario` e
`gerencial.porCluster` não podem ser truncados** (nada de top-N), senão somem
opções do filtro.

### Resposta

`Content-Type: application/json`, corpo = **o objeto**.

Cada `.sql` devolve uma linha, uma coluna `payload`, via
`TO_JSON_STRING(STRUCT(...))`. Desserialize antes de responder — devolver a
string crua faz o front receber JSON escapado e reprovar.

### Erros

`parseError()` (`client.ts:71`) mapeia por faixa: 401/403, 429, ≥500 e demais
4xx, cada uma com sua mensagem. O **corpo do erro não é lido** — detalhe técnico
fica no servidor. O front não distingue entre 500, 502, 503 e 504; escolha o que
fizer sentido para a sua observabilidade.

Dois headers importam:

- **`x-request-id`** — anexado à mensagem de tela ("Código abc123."). Mande
  sempre: é o único elo entre o print do usuário e o log do Cloud Run.
- **`retry-after`** — em segundos ou data HTTP. Vira o atraso real do retry.

---

## 3. Formato da resposta

O contrato campo a campo está em **`src/lib/analytics-uso/schemas.ts`**, e é
executável — o §6 mostra como rodá-lo contra o seu payload. Aqui vai só o que
não se lê rápido nele.

### Regras que valem para tudo

**Todo objeto é `.strict()`**: campo a mais reprova, campo a menos reprova. Não
existe campo opcional.

| Tipo | Regra |
| --- | --- |
| inteiro | finito, **≥ 0** |
| número | finito, **≥ 0**, decimal permitido |
| taxa | finito, **entre 0 e 1** — razão, **não** percentual |
| data | `YYYY-MM-DD` · mês: `YYYY-MM` |

**Os únicos campos que aceitam `null`**, em todo o contrato:
`porEndpoint[].ferramenta`, `porUsuario[].email`, `porUsuario[].clusterId`,
`porPasta[].cliente`, `porUsuario[].ultimoErro`, `gerencial.inicioHistorico`,
`taxaRetencao` (em `gerencial.porMes` e `porClusterMes`) e `clusterId` em
qualquer bloco `porCluster*`. Qualquer outro `null` reprova o payload inteiro.

`clusterId` nulo é o grupo "sem vínculo". A SQL agrupa por uma sentinela
`'__sem_cluster__'` e converte de volta para `NULL` na saída, porque `GROUP BY`
não agrupa nulos de forma utilizável.

`taxaRetencao` nula é legítima: no primeiro mês da série não há base anterior.
Em produção, 1 de 8 meses vem nulo.

### Blocos e ordenação

O front desenha na ordem recebida, sem reordenar.

**`/api-consumo`** — `periodo`, `totais`, e os arrays `porMes` (data ASC),
`porStatus`, `porEndpoint`, `porFerramenta`, `porTipoOperacao`, `porMetodo`,
`porUsuario` (todos por chamadas DESC), mais `gerencial` com `inicioHistorico`,
`porMes`, `porClusterMes`, `porFerramenta`, `porClusterFerramenta`, `porCluster`.

Detalhes que não estão no schema: `porStatus` descarta `status_code` nulo e
`faixa` é `CONCAT(DIV(status_code,100),'xx')`. `automacao` em `porUsuario` é flag
por linha, **não** filtro — o payload traz as contas de automação junto e quem
exclui é o componente. Todos os blocos `gerencial.*` desta rota consideram só
pessoas.

**`/arquivos`** — `periodo`, `totais`, e os arrays `porMes` (data ASC), `porTipo`
(erros DESC), `porCausa` (erros DESC), `porUsuario` (enviados DESC), `porPasta`
(erros DESC), `porCliente` (naoEntraram DESC), mais `gerencial` com `porMes`,
`porClusterMes`, `porCluster`.

`porPasta` e `porCausa` só contêm linhas com `status_processamento = 'ERRO'`.
`porCliente.cliente` nunca é nulo (`IFNULL(nome_cliente,'(sem cliente)')`), mas
`porPasta.cliente` pode ser.

### Automação em `/arquivos`: a regra muda por bloco

É a sutileza mais fácil de errar.

| Bloco | Automação |
| --- | --- |
| `totais` (exceto `automacao*`), `porMes`, `porTipo`, `porCausa`, `porUsuario`, `porPasta`, `porCliente` | **fora** |
| `totais.automacaoEnviados` / `automacaoErros` | **só** automação |
| **`gerencial.porMes`, `porClusterMes`, `porCluster`** | **dentro** |

21.778 dos 22.066 envios são do robô — com ele dentro, os blocos operacionais
descreveriam a carga automática, não a equipe. Já os blocos `gerencial.*` o
incluem e expõem `enviadosAutomacao` ao lado, porque o front subtrai:

```ts
// composicao.ts:133
arquivosEnviadosHumanos: Math.max(0, arquivosMes.enviados - arquivosMes.enviadosAutomacao)
```

Se você "padronizar" os `gerencial.*` para excluir automação, o dashboard
gerencial passa a mostrar zero ou negativo em envios.

`registrosSemDataIngestao` / `registrosTotaisNaView` vêm de uma CTE que **ignora
o período de propósito** — são justamente os registros sem data — mas respeita
`usuario` e `cluster_id`.

---

## 4. Regras de agregação que a query precisa cumprir

Seis decisões semânticas embutidas na SQL de referência. Se reescrever, reproduza
— os números do dashboard dependem delas.

**4.1 Contar todo o tráfego, sem filtrar por `nome_cliente`.** O campo só é
preenchido em 2.175 de 13.044 chamadas (16,7%): o UUID do contribuinte nem sempre
está no path. Filtrar reduz o uso observado a um quinto e faz ferramentas
inteiras sumirem (Controle Balancetes e PERDCOMP nunca aparecem com contribuinte
resolvido). Consequência: `latP95Ms` do período completo é **11.455 ms**, sobre a
população inteira.

**4.2 Contar chamadas no recorte, não usar `chamadas_endpoint`.** Essa coluna é
um `COUNT(*) OVER (PARTITION BY normalized_path)` sobre a view inteira — total
histórico por rota, insensível a `@inicio`/`@fim`. Devolveria o mesmo número para
qualquer intervalo.

**4.3 Derivar `causa` e `impacto` de `mensagem_erro`.** Não use `categoria_erro`
(§1). Classificando pelo texto, 98,3% dos erros caem em duas causas nomeadas:
duplicidade (60,6%) e namespace XML (37,7%). O campo que sustenta o dashboard é
**`impacto`**, que não existe na view:

| Valor | Significado | Verificado no BigQuery |
| --- | --- | --- |
| `reenvio` | o documento já estava na base | 1.783 das 2.142 falhas de duplicidade apontam para chave já presente em `psa_nfe`/`psa_cte` |
| `ausente` | o documento não entrou | dos 1.333 XML de CT-e barrados por namespace, nenhum entrou depois |

Os dois são `status_processamento = 'ERRO'`, mas um é retrabalho e o outro é
perda. Somados num total único, o painel perde a métrica central.

**4.4 `pasta` é o diretório, derivado de `caminho_drive`.** A coluna guarda o
caminho até o arquivo — 3.523 de 3.532 terminam em `.xml`, `.txt` ou `.zip`.
Contar distintos daria 158 "pastas" onde existem 21.

```sql
IFNULL(NULLIF(REGEXP_REPLACE(caminho_drive, r'\s*/\s*[^/]+$', ''), ''), '(sem caminho)')
```

**4.5 Excluir rotas que não são endpoint de negócio:** `/docs`, `/redoc`,
`/openapi.json`, `/auth`. Só produzem 404 — inflam `endpointsAtivos` e dominam o
ranking de taxa de erro.

**4.6 Recorte sem dados devolve zero, nunca nulo.** `SAFE_DIVIDE` com denominador
zero, `AVG` e `APPROX_QUANTILES` sobre conjunto vazio devolvem `NULL`, e o zod
exige número — um `null` aí reprova o payload inteiro. As SQLs de referência
envolvem os 30 pontos de divisão e as latências em `IFNULL(…, 0)`, com os dois
`taxaRetencao` deliberadamente de fora.

Não é cenário raro: **9 das 22 pessoas do filtro têm atividade na API e nenhum
arquivo**, então qualquer uma delas produz recorte vazio em `/arquivos`. Campos a
proteger: `taxaErro`, `taxa5xx`, `latMediaMs`, `latP50Ms`, `latP95Ms`,
`taxaSucesso`, `coberturaUsuarios`, `chamadasPorUsuario`, `participacaoAutomacao`,
`pct`.

---

## 5. Antes de subir

- **Permissão da service account.** As tabelas são fully-qualified, então a query
  roda de qualquer projeto — mas a SA precisa de `roles/bigquery.jobUser` no
  projeto que fatura e leitura em `psa_analytics`. Credencial de desenvolvedor
  costuma ter acesso mais amplo, então isso passa em teste local e falha com 403
  só depois do deploy.
- **4xx, não 500**, para data malformada e `fim < inicio`.

---

## 6. Como validar

O schema do front é executável. A partir da raiz deste repositório, com o payload
num arquivo:

```bash
bun --eval "
  const { analyticsUsoApiSchema } = await import('./src/lib/analytics-uso/schemas.ts');
  const p = JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8'));
  const r = analyticsUsoApiSchema.safeParse(p);
  console.log(r.success ? 'OK' : r.error.issues.map(i => i.path.join('.') + ': ' + i.message));
" caminho/do/payload.json
```

Troque por `analyticsArquivosSchema` para a outra rota. Em caso de falha a saída
é `[ "totais.taxaErro: Expected number, received null", … ]`.

Os fixtures em `src/lib/analytics-uso/__fixtures__/` são respostas reais do mesmo
período (06/08) e servem de golden file. Diferença **estrutural** é regressão;
diferença de número é dado novo.

> **Não teste igualdade exata em `latP50Ms` / `latP95Ms`.** `APPROX_QUANTILES`
> depende do plano de execução, não só dos dados: envolver as expressões em
> `IFNULL` — sem mudar semântica — moveu o `latP95Ms` de **11455 para 11415 ms**
> com os mesmos 13.043 registros. Compare com tolerância.

### Casos de teste

Os cinco primeiros foram executados contra produção com as SQLs deste repositório
e passam.

| # | Requisição | Esperado |
| --- | --- | --- |
| 1 | período completo, sem filtro | payload válido |
| 2 | `inicio=2020-01-01&fim=2020-01-31` | zeros, não nulos |
| 3 | `/arquivos?usuario=Patricia Melo` | zeros, não nulos |
| 4 | `usuario` inexistente | zeros, não nulos |
| 5 | `cluster_id` inexistente | zeros, não nulos |
| 6 | `cluster_id` válido | subconjunto coerente |
| 7 | `/api-consumo?ferramenta=<válida>` | subconjunto coerente |
| 8 | `/arquivos` recebendo `ferramenta` | parâmetro descartado |
| 9 | `fim < inicio` / data malformada | 4xx, não 500 |
| 10 | sem `Authorization` | 401 |

### Regenerar os fixtures

`bun scripts/dump-analytics-fixtures.ts --inicio=2026-01-01 --fim=2026-08-07`
— flags: `--only=` (`uso-api`\|`arquivos`, desliga segmentos), `--segmentos=`
(`todos`\|`nenhum`\|`usuarios`\|`ferramentas`). Requer `gcloud auth login`.

---

## 7. Do lado do front

Quando os endpoints subirem, some `VITE_ANALYTICS_USO_FIXTURES` de
`.env.sandbox` e o `fetchWithAuth` assume. Nenhum componente muda.

Duas coisas passam a funcionar sozinhas, sem alteração de schema: o seletor de
data (hoje o recorte de período acontece no cliente, só sobre a série mensal) e
os blocos sem quebra mensal — `porEndpoint`, `porUsuario`, `porPasta`,
`porFerramenta` — que no modo fixture não respondem ao filtro.

Cross-filter por cliente ou por causa exigiria parâmetro novo. Se for
implementar, avise: é mudança de contrato.

---

## 8. Checklist

- [ ] Duas rotas, uma query cada, `json.loads` na coluna `payload`
- [ ] Param ausente ⇒ `''` (não `NULL`, não `"None"`)
- [ ] `@ferramenta` não é passado para `arquivos.sql`
- [ ] Zeros, não nulos, em taxa e latência — §4.6
- [ ] Assimetria de automação preservada nos `gerencial.*` de `/arquivos` — §3
- [ ] Arrays completos na chamada sem filtro, sem top-N — §2
- [ ] `x-request-id` em toda resposta; `Retry-After` no 429
- [ ] Service account com `bigquery.jobUser` + leitura em `psa_analytics` — §5
- [ ] Payload validado contra `schemas.ts` — §6
