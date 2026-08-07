# Hand-off — Dashboard "Controle de uso e envio" (Looker → nativo)

Para: GPT Codex · De: sessão Claude Code · Data: 2026-08-06 · Branch: `develop`

---

## 1. A tarefa

Migrar o relatório **"Dashboard de Controle de uso e envio (interno)"** do Looker
Studio para versão nativa React no portal PSA. Decisão da equipe: **dois**
dashboards a partir do original — um **técnico** (equipe Digital) e um
**gerencial** (gestores de área).

**Estado:** técnico e gerencial estão construídos e funcionando com fixtures,
inclusive cross-filter global por pessoa. Faltam os dois endpoints no Cloud Run.

---

## 2. Stack (verificada)

React 18.3 · **Tailwind 3.4** (não v4) · Vite 5.4 · Recharts 2.15 · shadcn/ui
(`components.json`) · TanStack Query 5 · vitest · bun.

Backend: `../psa-backend-api` (FastAPI, local). Frontend em localhost aponta para
`http://localhost:8000` (`src/config/api.ts`); o README do backend manda subir em
8080 — **suba em 8000**.

---

## 3. Arquitetura escolhida e por quê

O dado só existe no BigQuery (não no Supabase), então segue o padrão da
**Calculadora IBS/CBS**, não o do dashboard Clientes-e-OS:

|            | Clientes/OS (não usar) | Calculadora IBS/CBS (o padrão daqui) |
| ---------- | ---------------------- | ------------------------------------ |
| Fonte      | Supabase               | `psa_analytics.VW_*` no BigQuery     |
| Agregação  | TypeScript puro        | **SQL no service Python**            |
| Transporte | `supabase.from()`      | `GET /api/v1/...` no Cloud Run       |

Regra confirmada lendo `calculadora_ibs_cbs_service.py`: cada endpoint executa
uma query BigQuery e devolve um payload agregado com CTEs +
`TO_JSON_STRING(STRUCT(...))`.

**Corte final aprovado: 2 endpoints, por FONTE** — menor implementação possível
no backend. O catálogo de filtros nasce das consultas-base sem recorte, e a visão
gerencial combina no front apenas os blocos já agregados pelos dois SQLs:

| Endpoint                                | View                    | Params                                          |
| --------------------------------------- | ----------------------- | ----------------------------------------------- |
| `GET /api/v1/analytics/uso/api-consumo` | `VW_ANL_USO_API`        | `inicio`, `fim`, `usuario?`, `cluster_id?`      |
| `GET /api/v1/analytics/uso/arquivos`    | `VW_ANL_GERAL_ARQUIVOS` | `inicio`, `fim`, `usuario?`, `cluster_id?`      |

`api-consumo` também aceita `ferramenta?`; esse eixo não existe em arquivos.
Os fixtures formatados somam menos de 100 KB. **Não precisa materializar nem
pré-agregar nada.**

---

## 4. Arquivos criados (todos novos, nada commitado)

```
scripts/analytics-uso/{uso-api,arquivos}.sql           ← ENTREGAR AO BACKEND
scripts/dump-analytics-fixtures.ts                     ← gera os fixtures
src/lib/analytics-uso/types.ts                         ← contrato TS
src/lib/analytics-uso/client.ts                        ← ÚNICO ponto que muda depois
src/lib/analytics-uso/composicao.ts                    ← catálogo + união gerencial leve
src/lib/analytics-uso/__fixtures__/*.json              ← respostas reais congeladas
src/hooks/useAnalyticsUso.ts                           ← 2 useQuery remotos + derivados
src/pages/equipe/dev/DashboardUsoEnvio.tsx             ← página, 3 abas
src/components/equipe/dev/dashboard-uso-envio/
    AbaSaudeApi.tsx  AbaUsoApi.tsx  AbaArquivos.tsx
    primitivos.tsx (componentes)  formatadores.ts (paleta/formatos/hooks)
.claude/skills/metricas-dashboard/                     ← skill de metodologia
```

Editados: `src/App.tsx` (import + rota), `src/constants/devHubDefinitions.ts`
(card no hub), `src/constants/devNavLabels.ts` (label), `.env`.

**Rota:** `/equipe/dev/gerenciar-dados/uso-envio` — ao lado do iframe do Looker,
na área Digital. `PageAccessGate` não bloqueia: `usePageAccess` libera rota não
cadastrada em `page_permissions`.

---

## 5. Como rodar

```bash
echo 'VITE_ANALYTICS_USO_FIXTURES=1' >> .env   # já está no .env
bun dev                                        # reinicie se mudar .env
# http://localhost:8080/equipe/dev/gerenciar-dados/uso-envio
```

Regerar fixtures (precisa de `gcloud`/`bq` autenticado em `psa-digital-prod`):

```bash
bun scripts/dump-analytics-fixtures.ts --inicio=2026-01-01 --fim=2026-08-06
```

**Armadilha resolvida — não regrida:** `bq` é Python; com stdout redirecionado no
Windows ele encoda na codepage do console e troca acento por U+FFFD
(`Execu\xef\xbf\xbd\xef\xbf\xbdo`). O script força `PYTHONIOENCODING=utf-8` +
`PYTHONUTF8=1` no env do processo e decodifica o buffer explicitamente. Não use
`encoding: "utf8"` no `execFileSync` (e `encoding: "buffer"` quebra no Bun).

Validação: `bunx tsc -p tsconfig.app.json --noEmit` e `bunx eslint <arquivos>`.
Ambos limpos hoje. Não rode `bun run build` a cada mudança (ver CLAUDE.md).

---

## 6. A troca fixture → endpoint (o passo final)

`src/lib/analytics-uso/client.ts` é o único arquivo a mexer na troca de transporte.
As duas funções já têm os dois caminhos:

```ts
export async function fetchUsoApi(fetchWithAuth, filtros) {
  if (USANDO_FIXTURES) return (await import('./__fixtures__/uso-api.json')).default;
  const r = await fetchWithAuth(getApiUrl(`${BASE}/api-consumo?${toSearchParams(filtros)}`));
  if (!r.ok) throw await parseError(r, 'Uso da API');
  return r.json();
}
```

Some a env var → o `fetchWithAuth` assume. **Nenhum gráfico é tocado.** Os
fixtures viram fixtures de vitest (teste de contrato: saída do endpoint == shape
do JSON).

Para o backend: entregar os 2 `.sql` de `scripts/analytics-uso/` + os JSONs
como contrato. Cada SQL datada já usa `@inicio`/`@fim`/`@usuario`/`@cluster_id`
como named params e devolve 1 linha × 1 coluna `payload`. Falta o backend criar
`src/api/v1/endpoints/analytics_uso.py` + `analytics_uso_service.py`
(herdando `BaseQueryService`). O endpoint deve converter `usuario` e
`cluster_id` ausentes em strings vazias para conservar a semântica das SQLs.
`api-consumo` também converte `ferramenta` ausente em string vazia.

---

## 7. Identidade visual

Fonte: **Manual de Marca PSA**
(`G:\Drives compartilhados\PSA Prado Suzuki - Marketing - logos e icones\Modelos e Manuais\Manual de Marca - PSA.pdf`).
Hex oficiais estão em `formatadores.ts`.

- p. 12 paleta: TEAL 500 `#14B8A6` / 600 `#0D9488` / 700 `#0F766E` · LIME 400
  `#A3E635` / 500 `#84CC16` / 600 `#65A30D` · GRAY 50→950
- p. 10 tipografia: **Work Sans** (já é `font-sans` no `tailwind.config.ts`)
- p. 13 elemento de apoio: chevron lime-em-cima / teal-embaixo — implementado em
  SVG na `FaixaResumo`

**⚠️ Divergência aberta, decisão pendente:** os tokens de `src/index.css` **não
batem com o manual** — `--teal-500` resolve para `#0D877C` e `--lime-500` para
`#6CAF0E`; as seis variações estão deslocadas para mais escuro. O dashboard usa os
hex do manual; o resto do portal usa os tokens. **Alguém precisa decidir qual é a
verdade** e alinhar. Está documentado no topo de `formatadores.ts`.

Cores de alerta não existem no manual (a marca é só verde/cinza): escolhi
`#BE123C` (risco) e `#B45309` (atenção), escuros o bastante para não vibrar contra
o teal. Erro **nunca** sai no verde da marca.

---

## 8. Correções aplicadas vs. o Looker — NÃO REGRIDA

O dashboard original tem defeitos graves; a migração foi feita **corrigindo**, por
decisão do usuário. Detalhe completo dos 14 casos em
`.claude/skills/metricas-dashboard/references/casos-psa.md`.

Os que mais importam:

1. **`filtro_null_id` é no-op** (17 gráficos): filtra `adicionado_por` nulo, mas a
   view faz `COALESCE(..., 'Automacao')` — removia 0 de 222.653 linhas. Aqui a
   automação é flag + toggle na UI, default desligado nas tabelas por usuário.
2. **`USO_API_null_cliente` derruba 80,8% do tráfego** (11 gráficos): só 2.175 de
   13.044 chamadas têm UUID de contribuinte no path. Isso subestimava usuário em
   até 23×, zerava Controle Balancetes (1.088) e PERDCOMP (639), e mostrava p95 de
   3.784 ms quando o real é **11.443 ms**. Aqui **não se aplica esse filtro**.
3. **Regex de categoria de erro quebrada**: a view procura `'%hash%ja existe%'`,
   a mensagem real é `Documento com chave de acesso <chave> ja existe`. 99% caía
   em "Outro". Reclassificado no `.sql`: duplicidade 2.140 (60,6%), namespace XML
   1.333 (37,7%), outro 44, contribuinte inválido 15.
4. **Ranking de erro por pessoa era falso**: 2.390 "erros" de um usuário = 1.333
   bug de pipeline (CT-e no fluxo de NF-e, 27/abr–17/jun) + 1.042 reenvio +
   **15 reais**. A tabela agora abre por causa.
5. **Séries temporais ordenadas por volume** → agora cronológicas.
6. **Fonte trocada**: "Chamadas por mês" plotava a view de arquivos. Pico real é
   abril (4.757), não janeiro.
7. **`caminho_drive` não é pasta** (termina no arquivo): 158 "pastas" → **21**.
8. **88,5% das linhas sem `data_ingestao`** (197.055 de 222.653) — agora é aviso
   na tela, não omissão.
9. **Mês parcial vs. fechado**: 6 dias de agosto contra 31 de julho. Sem seletor
   de data enquanto for fixture — filtro que não filtra é pior que nenhum.

---

## 9. Dashboard GERENCIAL (implementado)

Rota: `/equipe/board/uso-envio`. Reutiliza os dois payloads, combina somente seus
agregados gerenciais e aplica `cluster_id`, derivado da estrutura de equipes. Líder com uma unidade recebe
escopo fixo; líderes com mais de uma alternam apenas entre as suas; somente o
administrador tem a opção de visão total.

O desenho é para o líder acompanhar a própria equipe: pessoas usando, novos no
uso, recorrência, ações por pessoa, ferramentas utilizadas, documentos enviados,
evolução da adoção, adoção por ferramenta, atividade nominal e evolução da
ingestão. Comparação entre unidades, taxa de erro e saúde da API permanecem fora
do gerencial e pertencem ao dashboard técnico.

As linhas de pessoas são alfabéticas, não um ranking de produtividade, e acionam
o cross-filter global. A fonte só contém atividade observada; pessoas sem nenhum
evento no período não aparecem.

---

## 10. Skill de metodologia

`.claude/skills/metricas-dashboard/` — criada nesta sessão porque não existe nada
equivalente pronto (as skills públicas de "KPI design" cobrem métrica de negócio
genérica e ignoram observabilidade). Leia antes de definir qualquer indicador
novo. SKILL.md + 4 referências (técnicas/produto/design/casos-PSA).

Outras skills do repo: `bigquery`, `sql-style`, `looker-studio-bq-rls`,
`record-feature-gif`.

---

## 11. Regras do repositório

- `AGENTS.md` é fonte única de verdade — leia antes de alterar.
- **Banco é somente leitura**: nunca aplique migração/DDL; no máximo `SELECT`.
- Commits **sem** trailer `Co-Authored-By: Claude`.
- Não dar push na `main` sem pedir.
- Lint só nos arquivos alterados durante o dev; build completo só na validação
  final.

## 12. Pendências

- [ ] Backend criar os 2 endpoints a partir dos `.sql`
- [ ] Trocar fixture por `fetchWithAuth` em `client.ts` + teste de contrato
- [ ] Seletor de data (só faz sentido com endpoint)
- [ ] Decidir a divergência paleta manual × `index.css`
- [x] Construir o dashboard gerencial
- [ ] Chamado técnico: `sync/perdcomp` com 224 erros em 344 chamadas (65,1%);
      latência de maio (média 8.080 ms, p95 28.353 ms) e junho (4.316/16.176)
- [ ] Nada foi commitado — revisar `git status` antes de fechar
