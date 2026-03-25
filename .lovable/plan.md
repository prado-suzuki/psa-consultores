

## Plano: Conectar frontend ao backend real — corrigir dados hardcoded e queries incorretas

Auditoria completa das 10 paginas do Board revelou problemas sistematicos de dados hardcoded, status incorretos nas queries e graficos com dados ficticios. Abaixo, os ajustes por pagina.

---

### Problemas encontrados

**1. Status inconsistente nas queries de fiscal_tasks**
A tabela `fiscal_tasks` usa status `done` (confirmado em `taskStatusColors.ts`), mas `usePerformanceData.ts` filtra por `'concluida'` — resultado: zero tarefas concluidas nos KPIs e graficos de Performance e Dashboard.

**2. Grafico de barras (Dashboard) — so incrementa Tax**
`BoardDashboard.tsx` linha 72-74: o grafico de tarefas por area mapeia `category` para Tax/OSG/Dev, mas a logica so funciona se o campo `category` tiver valores como `tax`, `obrigacao_acessoria`, etc. Na Performance, linhas 88-96, TODAS as tarefas incrementam `Tax++` — nunca OSG ou Dev.

**3. Grafico ROI — dados hardcoded**
`BoardDashboard.tsx` linhas 260-264: AreaChart usa array estatico `[{name: 'Set/25', value: 8000}, ...]`. Deveria calcular a partir de `process_improvements` com datas reais.

**4. Texto "+5pp vs mes anterior" — hardcoded**
Aparece em 3 paginas sem calculo real. Deve comparar pontualidade do periodo atual vs periodo anterior.

**5. "Meta Dez/26: R$60k" — hardcoded**
Linha 277 do Dashboard. Deveria vir de configuracao ou ser removido.

**6. Sparklines — arrays estaticos**
Linhas 171, 181 do Dashboard: arrays `[50, 65, 55, 80, 100]` sao decorativos. Devem refletir tendencia real dos ultimos 5 meses.

**7. Performance barChart — nao distribui por area**
`PerformanceDashboard.tsx` linhas 88-96: todas as tarefas vao para `Tax++`. Precisa cruzar `task.project_id` com `projects` para descobrir a area, igual ao `AreaComparisonBlock` original.

**8. Contribuicao Individual — campo `category` nao existe no select**
`usePerformanceData` seleciona `id, status, due_date, assigned_to, updated_at, project_id` — nao inclui `category`. Dashboard tenta usar `t.category` sem esse campo.

---

### Correcoes por arquivo

**`src/hooks/usePerformanceData.ts`**
- Trocar `t.status === 'concluida'` por `t.status === 'done'` (3 ocorrencias)
- Trocar `t.status !== 'concluida'` por `t.status !== 'done'` (2 ocorrencias)
- Adicionar `category` ao select de `fiscal_tasks` quando usado (ou resolver via project_id → area)

**`src/pages/equipe/board/BoardDashboard.tsx`**
- **Grafico de barras**: Cruzar `task.project_id` com `projects` para determinar area (Tax/OSG/Dev) em vez de usar `t.category`
- **Grafico ROI**: Calcular serie temporal real a partir de `process_improvements.created_at` e `total_savings_monthly` acumulado. Fallback para array vazio se sem dados
- **Sparklines**: Calcular ultimos 5 meses de dados reais (projetos ativos, economia, pontualidade) a partir das queries existentes
- **"+5pp vs mes anterior"**: Calcular diferenca real de pontualidade entre periodo atual e anterior, ou omitir se dados insuficientes
- **"Meta Dez/26: R$60k"**: Remover valor hardcoded ou buscar de `performance_preferencias`
- **"3 de N em risco"**: Linha 98 calcula `metasEmRisco` como ternario fixo `3` — substituir por contagem real

**`src/pages/gerencial/performance/PerformanceDashboard.tsx`**
- **barChart**: Corrigir distribuicao por area cruzando `project_id` com `projects` (mesmo fix do Dashboard)
- **"+5pp vs anterior"**: Calcular real ou omitir
- **KPI Tempo Medio**: Calculo atual usa `differenceInDays(updated_at, due_date)` que pode ser negativo para tarefas antes do prazo — usar `Math.abs` ja esta correto mas a logica de "diferenca entre conclusao e criacao" faria mais sentido

**`src/pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx`**
- **"+5pp vs mes ant."**: Remover ou calcular
- **"Meta: 85% em Jun/26"**: Hardcoded — buscar do ciclo ativo ou remover

---

### Arquivos modificados

| Acao | Arquivo |
|------|---------|
| Editar | `src/hooks/usePerformanceData.ts` — fix status `done` vs `concluida` |
| Editar | `src/pages/equipe/board/BoardDashboard.tsx` — graficos reais, remover hardcoded |
| Editar | `src/pages/gerencial/performance/PerformanceDashboard.tsx` — barChart area fix, trends reais |
| Editar | `src/pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` — remover hardcoded |

### O que NAO muda
- Nenhuma rota, hook de dados (alem do fix de status), tabela ou RLS
- Demais paginas (Metas, Decisoes, Feedbacks, 1:1s, Evolucao, Relatorios, MinhaEvolucao) ja usam queries corretas com as tabelas reais
- Sidebar, layout, filtros

