

## Plano: Redesign visual do módulo Board conforme HTML v2 de referência

### Escopo

Atualizar CSS tokens, criar componentes reutilizáveis e reescrever o JSX de 3 páginas (Dashboard, Performance, Desempenho Visão Geral). Toda lógica de dados, hooks, queries e rotas permanecem intocados.

---

### 1. Font — `index.html`

Adicionar `Instrument Sans` + `Instrument Serif`:
```html
<link href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
```

---

### 2. CSS Tokens e Classes — `src/index.css`

**Substituir** o bloco "Board v3" existente (linhas ~329-504) por um bloco unificado "Board v4" com os novos tokens do HTML de referência:

```text
--ink:#0D1117  --ink2:#3D4A5C  --ink3:#7A8899  --ink4:#B0BBC8
--page:#F4F6FA --surface:#FFFFFF --surface2:#F8FAFC
--line:#E4E9F0 --line2:#EEF2F6
--accent:#4B63F7
--go:#0EA271  --go-t:rgba(14,162,113,.1)
--warn:#D4820A --warn-t:rgba(212,130,10,.1)
--risk:#D03040 --risk-t:rgba(208,48,64,.1)
--blue:#3478F5 --blue-t:rgba(52,120,245,.09)
--purple:#6B46E8 --purple-t:rgba(107,70,232,.09)
--cyan:#0A9BB5 --cyan-t:rgba(10,155,181,.09)
```

Adicionar todas as classes do HTML de referência: `.stat-strip`, `.stat-item`, `.si-bar`, `.stat-num`, `.stat-label`, `.stat-dots`, `.sdot`, `.pill`, `.stat-bar`, `.pb`, `.ai-box`, `.ai-lbl`, `.ai-text`, `.ai-bullets`, `.ai-b`, `.card`, `.chip-*`, `.chip-ppr-*`, `.mrow`, `.srow`, `.mc`, `.mc-warn`, `.cyb`, `.alert-*`, `.pg-head`, `.pg-title`, `.pg-sub`, `.stitle`, `.slabel`, `.fbar`, `.segs`, `.seg`, `.fi`, `.hm`, `.hmc`, `.dc-*`, `.phr-*`, `.sv-*`.

Adicionar animações: `fadeUp`, `fadeIn`, `grow`, `barUp`, `lineIn`, `areaIn` e classes `.fu`, `.fu1`-`.fu8`.

**Manter** os blocos de Board v2 (sidebar tokens) e as classes legadas (`v3-card`, `kpi`, `.ch`, `.cyb`, etc.) para não quebrar sub-páginas não modificadas.

---

### 3. Hook `useBoardReveal` — novo

**Arquivo:** `src/hooks/useBoardReveal.ts`

Retorna ref que aplica classe `.fu` com delay escalonado a todos `[data-reveal]` no container.

---

### 4. Componente `CountUp` — novo

**Arquivo:** `src/components/board/CountUp.tsx`

Animação numérica de 0 → valor usando `requestAnimationFrame` com easing cúbico. Props: `value`, `prefix`, `suffix`, `animate`, `duration`.

---

### 5. Componente `BoardStatStrip` — novo

**Arquivo:** `src/components/board/BoardStatStrip.tsx`

Grid unificado (1 bloco branco com `.stat-strip`). Cada coluna (`.stat-item`): barra 3px no topo (`.si-bar`), número com `CountUp` (`.stat-num`), label uppercase (`.stat-label`), dots opcionais (`.stat-dots`), pill (`.pill`), subtexto, barra de progresso (`.stat-bar`). Props: `items: StatItem[]`, `cols: 4|5`.

---

### 6. Componente `BoardAIBox` — novo

**Arquivo:** `src/components/board/BoardAIBox.tsx`

Container com classe `.ai-box`. Label `.ai-lbl` com ícone SVG. Texto `.ai-text`. Bullets `.ai-bullets > .ai-b`. Aceita `edgeFn` + `payload` para invocar Edge Function, ou aceita `data` diretamente. Skeleton durante loading. Fallback textual se erro.

---

### 7. Componente `BoardChip` — novo

**Arquivo:** `src/components/board/BoardChip.tsx`

Mapeia variantes (`risk`, `warn`, `go`, `blue`, `purple`, `tax`, `osg`, `dev`, `ppr-s/a/p/b`, `gy`) para classes `.chip-*` do CSS.

---

### 8. Chart defaults — novo

**Arquivo:** `src/lib/board-chart-defaults.ts`

Exporta `CHART_COLORS` (tax=#3478F5, osg=#0EA271, dev=#6B46E8), `AXIS_STYLE` (Instrument Sans 9px, #B0BBC8), `GRID_STYLE` (dash "3 3", #EEF2F6), `TOOLTIP_STYLE`.

---

### 9. Página Dashboard — `src/pages/equipe/board/BoardDashboard.tsx`

Reescrever **apenas o JSX** (manter hooks, queries, lógica, useMemo idênticos):

1. **Header** — `.pg-head > .pg-title` "Visao Executiva" + `.pg-sub` data/ciclo + `.pg-chips` (chips risk/warn/go)
2. **BoardFilterBar** — mantido como está
3. **BoardStatStrip cols-5** — 5 colunas: Projetos Ativos (dots), Economia/Ano (pill ROI), Pontualidade (pill + barValue), Metas (subText + barValue), Membros (subText + barValue)
4. **BoardAIBox** — Síntese Estratégica (reusa `handleGenerateSintese`)
5. **Grid 2 colunas** — `.card` esquerdo: BarChart (Recharts, cores chart-defaults), `.card` direito: AreaChart ROI
6. **Grid 2 colunas inferior** — `.card` Projetos Críticos (`.mrow` com chip área + barra + % + chip decisão), `.card` Performance Equipe (`.srow` com rank + avatar + nome + barra + % + chip PPR)

---

### 10. Página Performance — `src/pages/gerencial/performance/PerformanceDashboard.tsx`

Reescrever **apenas o JSX** (manter toda a lógica existente):

1. **Header** `.pg-head` + **Filter Bar** `.fbar` (segmented + select + timestamp + Atualizar)
2. **BoardStatStrip cols-5** — Projetos/Pontualidade/Tempo Médio/ROI/Metas
3. **Grid 2 colunas** — BarChart (3 meses) + Contribuição Individual (`.srow`)
4. **Grid 3 colunas** — Saúde por Área (Tax/OSG/Dev com barra bicolor + tempo médio + variação) + Carga da Equipe (lista com avatar + barra + alertas carga alta/baixa) + BoardAIBox (Análise Cruzada com projeção 30 dias)

Remover tabela de projetos existente (substituída pelo bloco Saúde por Área + Carga).

---

### 11. Página Desempenho Visão Geral — `src/pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx`

Reescrever **apenas o JSX** (manter toda a lógica existente):

1. **Header** `.pg-head` com select de ciclo
2. **Cycle Bar** `.cyb` — fundo escuro, nome, subtítulo, barra, rodapé 3 métricas
3. **BoardStatStrip cols-4** — Total Metas/Média Progresso/Feedbacks/1:1s
4. **Grid 2 colunas** — BoardAIBox (análise ciclo) + `.card` Alertas (`.alert-r/a/b`)
5. **Label + Grid 3 colunas** — Member cards `.mc` com avatar, nome, cargo, chip PPR, barra progresso, stats 3 colunas (metas/feedbacks/1:1s). Border amarela `.mc-warn` quando parcial/abaixo

---

### 12. BoardLayout tipografia — `src/components/equipe/board/BoardLayout.tsx`

Aplicar `fontFamily: "'Instrument Sans', sans-serif"` no `<main>` wrapper do conteúdo (sem alterar sidebar).

---

### Resumo de arquivos

| Arquivo | Ação |
|---------|------|
| `index.html` | Adicionar font Instrument Sans + Serif |
| `src/index.css` | Adicionar tokens v4 + classes HTML ref (preservar legado) |
| `src/hooks/useBoardReveal.ts` | Novo |
| `src/components/board/CountUp.tsx` | Novo |
| `src/components/board/BoardStatStrip.tsx` | Novo |
| `src/components/board/BoardAIBox.tsx` | Novo |
| `src/components/board/BoardChip.tsx` | Novo |
| `src/lib/board-chart-defaults.ts` | Novo |
| `src/pages/equipe/board/BoardDashboard.tsx` | Reescrever JSX |
| `src/pages/gerencial/performance/PerformanceDashboard.tsx` | Reescrever JSX |
| `src/pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` | Reescrever JSX |
| `src/components/equipe/board/BoardLayout.tsx` | Adicionar font-family no main |

Nenhuma rota, hook de dados, sub-página de Desempenho ou módulo externo será alterado.

