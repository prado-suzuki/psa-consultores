

## Plano: Refatorar 3 paginas do Board para Design System v3 com dados reais

Substituir o conteudo visual das paginas Dashboard, Performance e Desempenho/Visao Geral para corresponder exatamente ao HTML de referencia v3, mantendo os hooks de dados existentes e sem alterar nenhuma outra pagina ou rota.

---

### Fase 1 — CSS: Adicionar classes v3 faltantes ao `index.css`

Adicionar ~120 linhas de classes que existem no HTML de referencia mas nao no CSS atual. As classes `board-*` existentes (v2) permanecem para compatibilidade com outras paginas. Novas classes v3 usam nomes curtos do HTML:

- **Tipografia**: `.pgt`, `.pgs`, `.sct`, `.scl` — titulos/subtitulos de pagina e secao
- **KPI v3**: `.kpi`, `.ktb`, `.ki`, `.kv`, `.kl`, `.ksubs`, `.ksub`, `.dot`, `.tr`, `.tr-u`, `.tr-d`, `.tr-n` — cards com topbar colorida e trend badges
- **Chips**: `.ch`, `.c-tax`, `.c-osg`, `.c-dev`, `.c-ok`, `.c-w`, `.c-er`, `.c-in`, `.c-ppr-s/a/p/b` — chips coloridos por area e classificacao
- **Progress**: `.pb`, `.pb6`, `.pb4`, `.pb3`, `.pbf`, `.pg`, `.pa`, `.pr`, `.pi`, `.pp` — barras de progresso com cores semanticas
- **AI Box**: `.ai`, `.ai-lbl`, `.ai-txt`, `.ai-bul`, `.ai-b` — caixa de analise IA
- **Alertas**: `.al`, `.al-r`, `.al-a`, `.al-b`, `.al-t`, `.al-d`, `.al-act` — cards de alerta com borda colorida
- **Tabela**: `.tw`, `table/thead/tbody` v3 styles — tabela nativa estilizada
- **Score/Ranking**: `.sr`, `.srk`, `.srb`, `.srn`, `.srv` — linhas de ranking com posicao, barra e valor
- **Member cards**: `.mc`, `.mc.warn`, `.mch`, `.mc-n`, `.mc-r`, `.mcs`, `.mcs-v`, `.mcs-l` — cards de membro
- **Filtros**: `.fi`, `.fi-s`, `.segs`, `.seg`, `.seg.on`, `.fbar` — controles nativos estilizados
- **Cycle bar**: `.cyb`, `.cyb-n`, `.cyb-m`, `.cyb-pb`, `.cyb-pbf`, `.cyb-bt` — barra de progresso do ciclo
- **Strategic numbers**: `.snum`, `.snum-label`, `.snum-sub` — numeros grandes 42px
- **Sparkline**: `.spark`, `.spb` — mini barras de tendencia
- **Heatmap**: `.hm`, `.hmc`, `.hmc.h1/h2/h3/h4` — celulas de mapa de calor
- **Metric row**: `.mr`, `.mr-t`, `.mr-m`, `.mr-p` — linhas de metrica
- **Avatars**: `.av`, `.av-xs/sm/md/lg/xl`, `.av-pm/ba/gf/ac/hs/mc` — avatares com gradientes por pessoa
- **Grids**: `.g2`, `.g3`, `.g4`, `.g5`, `.mb12`, `.mb16` — helpers de layout
- **Cards**: `.card`, `.card-p0` — card base v3

Todas essas classes replicam exatamente o CSS do HTML de referencia (linhas 8-390).

---

### Fase 2 — Dashboard Estrategico (`BoardDashboard.tsx`)

Reescrever o componente mantendo os hooks existentes (`usePerformanceData`, `useCicloAtivo`, `useDesempenhoOverview`, `useDecisoesData`).

**Mudancas visuais:**
- Header: usar `.pgt` e `.pgs` em vez de classes inline. Chips de status com `.ch .c-er`, `.ch .c-w`, `.ch .c-ok`
- KPIs: trocar de 5 cards `.board-kpi` para 5 cards `.card` com `.snum` (42px Syne), `.snum-label`, `.snum-sub` e `.spark`/`.spb` para sparklines. Cores: Projetos=#5B6EF0, Economia=#13A87A, Pontualidade=#7A50EE, Metas=#E8920A, Membros=#0A1020
- AI Box: trocar de `.board-ai-box` para `.ai` com `.ai-lbl`, `.ai-txt`, `.ai-bul`, `.ai-b`
- Charts: manter Recharts BarChart e AreaChart mas ajustar cores para v3 (#3680F6 Tax, #13A87A OSG, #7A50EE Dev) e dimensoes (height=160)
- Projetos Criticos: trocar para `.mr` rows com `.ch` de area, `.pb .pb6` de progresso, `.mr-p` de percentual e `.ch .c-er/.c-w` de decisao
- Performance Ranking: trocar para `.sr` rows com `.srk`, avatar `.av .av-sm`, `.srb`, `.srn`, `.pb .pb6`, `.srv` e `.ch .c-ppr-*`

**Dados:** Nenhuma mudanca nos hooks — apenas no template JSX.

---

### Fase 3 — Performance (`PerformanceDashboard.tsx`)

Reescrever completamente, integrando toda a logica dos sub-componentes inline (eliminar imports de `PerformanceKPICards`, `ProjectsBlock`, `AreaComparisonBlock`, `TeamContributionBlock`, `AutomationImpactBlock`, `CycleGoalsBlock`). Os arquivos dos sub-componentes permanecem no disco para nao quebrar outros imports, mas o dashboard nao os usa mais.

**Layout v3:**
1. **Filter bar**: `.card` com `.segs`/`.seg` para periodo, divider vertical, label "AREA" com `<select class="fi">`, timestamp e botao "Atualizar" com `.btn .btn-g`
2. **5 KPIs**: Grid 5 colunas com `.kpi`, `.ktb`, `.ki`, `.kv`, `.kl`, `.ksubs`, `.ksub`, `.dot`, `.tr`
3. **Grid g2 charts**: BarChart (3 meses Tax/OSG/Dev) com `.card`/`.sct` + AreaChart ROI vs Meta com ReferenceLine dourada
4. **Tabela de Projetos**: `.card` com `.sct` + `.fi`/`.segs` inline, `<table>` nativa com `.tw`, `.pb .pb6`, `.ch .c-tax/osg/dev`, avatar `.av .av-xs`, `.ch .c-ok/.c-w/.c-er`
5. **Contribuicao Individual**: `.card` com `.sct` + `.fi`/`.segs`, `.sr` rows com ranking, avatar, barra, valor, chip PPR. Heatmap abaixo com `.hm`/`.hmc` classes

**Dados:** Usa `usePerformanceData` existente. Calculos de metrica (pontualidade, tempo medio, etc.) inline no componente.

---

### Fase 4 — Desempenho/Visao Geral (`DesempenhoVisaoGeral.tsx`)

Reescrever o componente mantendo todos os hooks existentes (`useCiclosAvaliacao`, `useCicloAtivo`, `useDesempenhoOverview`, `useMetas`, `useFeedbacks`, `useReunioes`, `useAllOpenItensAcao`).

**Layout v3:**
1. **Header**: `.pgt` + `.pgs` com fases do ciclo. `<select class="fi">` para ciclo alinhado a direita
2. **Cycle bar**: `.cyb` com gradiente escuro, `.cyb-n` nome, `.cyb-m` info, `.cyb-pb`/`.cyb-pbf` barra, `.cyb-bt` rodape com 3 spans
3. **4 KPIs**: Grid `.g4` com `.kpi`, `.ktb`, `.kv` (20px), `.kl`, `.ksubs`, `.dot`, `.tr` — Total Metas (indigo), Media Progresso (ambar), Feedbacks (roxo), 1:1s (ciano)
4. **Grid g2**: AI box (`.ai`) com analise do ciclo + Alertas card (`.card`) com `.al .al-r/.al-a/.al-b` rows
5. **Member cards**: `.scl` label + `.g3` grid com `.mc` cards — avatar `.av .av-lg`, `.mc-n`, `.mc-r`, `.ch .c-ppr-*`, `.pb .pb6`, `.mcs`/`.mcs-v`/`.mcs-l` para metricas inline. Cards com `.mc.warn` quando classificacao < atende

**AI box:** Chamar edge function `gerar-sintese-executiva` existente. Fallback: texto estatico baseado em dados calculados (% decorrido, media, membros em risco).

**Dados:** Mantidos como estao. O `pprPorMembro` e os `alertas` ja sao calculados — apenas o template muda.

---

### Fase 5 — Heatmap (`ActivityHeatmap.tsx`)

Refatorar para usar classes v3 `.hm`/`.hmc`/`.hmc.h1/h2/h3/h4` em vez de cores inline verdes. Grid 13x7 (13 semanas). Cores em tons de indigo (rgba(91,110,240,.2/.45/.68/.92)) conforme HTML.

---

### Arquivos modificados

| Acao | Arquivo |
|------|---------|
| Editar | `src/index.css` — adicionar ~120 linhas de classes v3 |
| Reescrever | `src/pages/equipe/board/BoardDashboard.tsx` |
| Reescrever | `src/pages/gerencial/performance/PerformanceDashboard.tsx` |
| Reescrever | `src/pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` |
| Editar | `src/components/performance/ActivityHeatmap.tsx` — usar classes v3 |

### O que NAO muda
- Nenhuma rota
- Nenhum hook de dados
- Sub-componentes em `src/components/performance/` permanecem no disco (outros imports podem depender deles)
- Todas as demais paginas do sistema
- Sidebar, layout, navegacao

