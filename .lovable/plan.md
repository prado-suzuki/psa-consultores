

## Módulo Performance — /gerencial/performance/

### Resumo
Painel executivo consolidado que consome dados existentes (projetos, tarefas, chamados, equipe, metas, ROI) em uma única página com scroll vertical, filtros globais e gráficos Recharts. Acesso exclusivo Admin + Líder.

---

### 1. Migration SQL

Tabela simples de preferências do painel:

```sql
CREATE TABLE performance_preferencias (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id uuid UNIQUE,
  periodo_padrao text CHECK (periodo_padrao IN ('7d','30d','90d','ciclo')) DEFAULT '30d',
  area_padrao text DEFAULT 'todas',
  widgets_ocultos text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE performance_preferencias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuario acessa proprias prefs" ON performance_preferencias FOR ALL USING (auth.uid() = usuario_id);
CREATE TRIGGER update_performance_preferencias_updated_at BEFORE UPDATE ON performance_preferencias FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

---

### 2. Navegação e acesso

**`GestaoLayout.tsx`** — adicionar item `{ icon: BarChart3, label: 'Performance', path: '/gerencial/performance' }` no `navItems`, visível apenas para `isAdmin || isLider` (ao lado do item Desempenho existente).

**`App.tsx`** — 1 rota nova: `/gerencial/performance` protegida por `DesempenhoAccessGate` (reutiliza o gate existente que valida `isAdmin || isLider`).

**`protectedPages.ts`** — 1 entrada nova com category `gestao`.

---

### 3. Hook — `usePerformanceData.ts`

Hook agregador que recebe `periodo` e `area` como parâmetros e executa queries paralelas para:

- `tax_projects` + `fiscal_tasks` (projetos ativos, status, tarefas no período)
- `tickets` (chamados abertos/resolvidos)
- `estrutura_equipe_membros` + `profiles` (membros ativos)
- `project_processes` + `process_improvements` (dados de ROI — se existirem)
- `ciclos_avaliacao` + `metas` (ciclo ativo + metas — se existirem)
- `performance_preferencias` (preferências do usuário)

Retorna dados estruturados por bloco. Cada sub-query é independente (falha de um bloco não afeta os outros).

Também exporta `useSavePerformancePrefs()` mutation para persistir preferências.

---

### 4. Página — `PerformanceDashboard.tsx`

Arquivo único em `src/pages/gerencial/performance/PerformanceDashboard.tsx`. Usa `GestaoLayout` como wrapper (mantém sidebar do Gerencial, não cria layout próprio).

Layout vertical contínuo sem sub-navegação:

**Barra de controles global** (sticky abaixo do header):
- Toggle de período: 7d / 30d / 90d / Ciclo atual
- Dropdown de área: Todas / Tax / OSG / Dev
- Botão "Atualizar" com timestamp da última atualização
- Persiste seleção via `useSavePerformancePrefs`

**Bloco 1 — Overview (KPI cards)**: 6 cards horizontais com scroll em mobile. Dados: projetos ativos, tarefas do período, chamados, membros ativos, ROI acumulado, metas do ciclo. Cada card com número principal, sub-indicadores e linha de cor no topo.

**Bloco 2 — Projetos**: Toggle tabela/cards. Tabela com colunas expandíveis (drill-down inline com mini donut Recharts, membros, log de atividade, tarefas atrasadas). Cards em grid 3/2/1 colunas responsivo. Filtro por busca, status e classificação automática (em dia / em risco / atrasado baseado nas regras de % tarefas atrasadas).

**Bloco 3 — Comparativo por Área**: 3 cards lado a lado (Tax/OSG/Dev) com projetos, tarefas concluídas, tempo médio e carga da equipe. Gráfico de barras agrupadas (Recharts) com evolução mensal dos últimos 3 meses.

**Bloco 4 — Contribuição Individual**: Tabela de membros com tarefas concluídas, pontualidade, projetos ativos, última atividade, metas PPR e tendência. Heatmap de atividade estilo GitHub (90 dias) abaixo da tabela, filtrável por membro ao clicar na tabela.

**Bloco 5 — Impacto das Automações**: 3 cards de resumo (economia, ROI médio, automações ativas) + tabela de automações + gráfico de área acumulada Recharts. Estado vazio se sem dados de ROI.

**Bloco 6 — Metas do Ciclo**: Header com nome do ciclo + barra temporal. 4 cards de distribuição (no prazo/em risco/atrasadas/concluídas). Donut por dimensão. Tabela de projeções PPR por membro (clicável → navega para evolução). 5 próximos prazos críticos. Estado vazio com link para `/gerencial/desempenho/ciclos` se sem ciclo ativo.

**Estados especiais**: Skeletons progressivos por bloco, estados vazios individuais com mensagem e link de ação, carregamento independente por seção.

---

### 5. Componentes auxiliares (em `src/components/performance/`)

| Componente | Responsabilidade |
|------------|-----------------|
| `PerformanceKPICards.tsx` | 6 cards do Bloco 1 |
| `ProjectsBlock.tsx` | Bloco 2 completo (tabela + cards + drill-down) |
| `AreaComparisonBlock.tsx` | Bloco 3 (cards de área + gráfico barras) |
| `TeamContributionBlock.tsx` | Bloco 4 (tabela membros + heatmap) |
| `AutomationImpactBlock.tsx` | Bloco 5 (ROI cards + tabela + gráfico área) |
| `CycleGoalsBlock.tsx` | Bloco 6 (metas ciclo + donut + PPR) |
| `ActivityHeatmap.tsx` | Heatmap estilo GitHub reutilizável |

---

### Arquivos afetados

| Ação | Arquivo |
|------|---------|
| Novo | Migration SQL (1 tabela) |
| Novo | `src/hooks/usePerformanceData.ts` |
| Novo | `src/pages/gerencial/performance/PerformanceDashboard.tsx` |
| Novo | `src/components/performance/PerformanceKPICards.tsx` |
| Novo | `src/components/performance/ProjectsBlock.tsx` |
| Novo | `src/components/performance/AreaComparisonBlock.tsx` |
| Novo | `src/components/performance/TeamContributionBlock.tsx` |
| Novo | `src/components/performance/AutomationImpactBlock.tsx` |
| Novo | `src/components/performance/CycleGoalsBlock.tsx` |
| Novo | `src/components/performance/ActivityHeatmap.tsx` |
| Editar | `src/App.tsx` (1 rota) |
| Editar | `src/components/gestao/GestaoLayout.tsx` (1 item sidebar) |
| Editar | `src/config/protectedPages.ts` (1 entrada) |

### O que NÃO muda
- Nenhuma aba, rota ou componente existente
- Nenhuma tabela existente
- Módulo Desempenho permanece intacto e independente

