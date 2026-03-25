

## Plano: Filtros consistentes, persistentes e responsivos no modulo Board

Adicionar `BoardFilterBar` reutilizavel, hook `useBoardFilters` com persistencia em sessionStorage, e integrar filtros funcionais em todas as 10 paginas do Board. Nenhuma rota, hook de dados ou logica existente sera removida.

---

### Fase 1 — Infraestrutura (2 arquivos novos)

**`src/hooks/useBoardFilters.ts`**
- Recebe `pageKey` e `defaultValues: Record<string, string | string[]>`
- Inicializa estado a partir de `sessionStorage.getItem('board-filters-{pageKey}')` ou defaults
- `setFilter(key, value)`, `resetFilters()`, `activeCount` (filtros != default)
- `useEffect` para persistir em sessionStorage a cada mudanca
- Exporta `filters`, `setFilter`, `resetFilters`, `activeCount`

**`src/components/board/BoardFilterBar.tsx`**
- Props: `FilterConfig[]`, `activeFilters`, `onFilterChange`, `onReset`, `rightSlot`, `resultCount?`, `totalCount?`
- Renderiza filtros em linha com `flex-wrap gap-8px` dentro de card branco v3
- Tipos: `select` (native `<select class="fi">`), `multiselect` (popover com checkboxes), `search` (input com debounce 300ms), `daterange` (dois inputs date), `segmented` (`.v3-segs`/`.v3-seg`)
- Badge "N filtros ativos" em indigo quando `activeCount > 0`
- Botao "Limpar filtros" condicional
- Texto "Exibindo N de M itens" quando `resultCount < totalCount`
- Estado vazio: icone FilterX + "Nenhum resultado" + botao limpar
- **Mobile (<768px)**: Colapsa em botao "Filtros (N)" que abre Drawer com filtros empilhados verticalmente, botoes "Aplicar" e "Limpar" fixos no rodape
- Acessibilidade: `aria-label` em selects, `aria-live="polite"` no badge de contagem

---

### Fase 2 — Dashboard Estrategico

Adicionar `useBoardFilters('dashboard', { periodo: '30d', area: 'todas' })`.
- **Periodo** (segmented): Filtra `usePerformanceData(periodo, area)` — ja aceita esses params
- **Area** (select): Filtra projetos criticos e ranking de equipe via `useMemo`
- Graficos nao filtram por area (apenas periodo)

---

### Fase 3 — Performance

Substituir os estados `periodo`/`area`/`searchTerm`/`statusFilter` por `useBoardFilters('performance', ...)`.
- **Filtros globais**: Periodo (segmented) + Area (select) — ja passados ao `usePerformanceData`
- **Filtros da tabela de projetos**: Search (debounce 300ms), Status (multiselect), Area local, Responsavel (select extraido dos dados), Ordenacao (select)
- **Filtros de contribuicao**: Area local, Metrica (segmented: Tarefas/Pontualidade/Projetos)
- Todos filtram via `useMemo` sobre os dados ja carregados — sem queries adicionais

---

### Fase 4 — Desempenho Visao Geral

Substituir `selectedCicloId` por `useBoardFilters('desempenho-geral', { ciclo: '', area: 'todas', alertas: 'todos' })`.
- **Ciclo** (select): Ja existe, integrar no BoardFilterBar
- **Area** (select): Filtra `pprPorMembro` via `useMemo`
- **Status de alerta** (segmented): Todos / Com alertas — filtra member cards

---

### Fase 5 — Desempenho Metas

Substituir filtros existentes (`nivelFilter`, `dimensaoFilter`, etc.) por `useBoardFilters('desempenho-metas', ...)`.
- **Ciclo**, **Nivel** (multiselect), **Dimensao** (multiselect com chips coloridos), **Responsavel**, **Status**, **Progresso** (select faixas)
- Filtros ja existem parcialmente — migrar para BoardFilterBar e adicionar Progresso

---

### Fase 6 — Desempenho Decisoes

Adicionar `useBoardFilters('desempenho-decisoes', { ciclo: '', tipo: [], area: 'todas', status: 'pendentes' })`.
- **Tipo recomendacao** (multiselect com chips coloridos)
- **Area** (select)
- **Status** (segmented): Todas/Pendentes/Confirmadas/Ignoradas
- Filtrar cards via `useMemo`

---

### Fase 7 — Desempenho Relatorios

Integrar controles existentes (`selectedMembro`, `selectedCiclo`, `selectedTipo`) com `useBoardFilters('desempenho-relatorios', ...)`.
- Tornar coerente com BoardFilterBar visual
- Botao "Gerar com IA" habilitado apenas quando membro selecionado
- "Exportar PDF" visivel apenas apos geracao

---

### Fase 8 — Desempenho Evolucao

Adicionar `useBoardFilters('desempenho-evolucao', { membro: '', ciclos: [], foco: 'geral' })`.
- **Membro** (select obrigatorio com avatar)
- **Ciclos exibidos** (multiselect)
- **Foco** (segmented): Geral/Metas/Feedbacks/1:1s — colapsa blocos nao focados
- Empty state quando nenhum membro selecionado

---

### Fase 9 — Desempenho Feedbacks

Adicionar `useBoardFilters('desempenho-feedbacks', { ciclo: '', tipo: [], de: '', para: '', anonimo: 'todos' })`.
- **Ciclo**, **Tipo** (multiselect chips), **De** (select avatar), **Para** (select avatar), **Anonimo** (segmented)
- Filtrar feedbacks via `useMemo`
- Na aba "Por membro": filtros de Tipo e Periodo se aplicam simultaneamente

---

### Fase 10 — Desempenho 1:1s

Adicionar `useBoardFilters('desempenho-1a1', { ciclo: '', membro: '', cadencia: 'todos', itens: 'qualquer', agrupamento: 'membro', statusItem: ['aberto','vencido'] })`.
- **Membro** (select): Filtra cards e abre historico automaticamente
- **Status cadencia** (segmented): Em dia/Atencao/Critico
- **Itens de acao** (segmented): Com/Sem abertos
- **Agrupamento** do painel de itens (segmented): Por membro/Por prazo
- **Status item** (multiselect)

---

### Fase 11 — Minha Evolucao

Adicionar `useBoardFilters('minha-evolucao', { ciclo: '', dimensao: [], statusMeta: 'todas' })`.
- **Ciclo** (select): Ja existe, migrar
- **Dimensao** (multiselect): Filtra lista de metas
- **Status** (segmented): Todas/Em andamento/Concluidas/Em risco

---

### Fase 12 — CSS

Adicionar ao `index.css`:
- `.v3-fbar` — wrapper da filter bar
- `.v3-fi-badge` — badge de filtros ativos
- `.v3-fi-count` — texto de contagem de resultados
- `.v3-fi-empty` — estado vazio por filtro
- `.v3-fi-drawer` — drawer mobile
- Media query `@media (max-width: 767px)` para colapso dos filtros

---

### Arquivos

| Acao | Arquivo |
|------|---------|
| Criar | `src/hooks/useBoardFilters.ts` |
| Criar | `src/components/board/BoardFilterBar.tsx` |
| Editar | `src/pages/equipe/board/BoardDashboard.tsx` |
| Editar | `src/pages/gerencial/performance/PerformanceDashboard.tsx` |
| Editar | `src/pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` |
| Editar | `src/pages/gerencial/desempenho/DesempenhoMetas.tsx` |
| Editar | `src/pages/gerencial/desempenho/DesempenhoDecisoes.tsx` |
| Editar | `src/pages/gerencial/desempenho/DesempenhoRelatorios.tsx` |
| Editar | `src/pages/gerencial/desempenho/DesempenhoEvolucao.tsx` |
| Editar | `src/pages/gerencial/desempenho/DesempenhoFeedbacks.tsx` |
| Editar | `src/pages/gerencial/desempenho/DesempenhoReunioes1a1.tsx` |
| Editar | `src/pages/gerencial/desempenho/MinhaEvolucao.tsx` |
| Editar | `src/index.css` |

### O que NAO muda
- Nenhuma rota ou navegacao
- Nenhum hook de dados existente (usePerformanceData, useMetas, etc.)
- Nenhuma tabela Supabase
- Sidebar, layout, componentes UI reutilizaveis

