

## Plano: Reposicionar Performance e Desempenho para /equipe/board + Corrigir bugs + Limpeza

### 1. Mover rotas no App.tsx

Remover as 7 rotas `/gerencial/*` (linhas 200-208) e registrá-las sob `/equipe/board/*`:

```
/equipe/board/performance → DesempenhoAccessGate + PerformanceDashboard
/equipe/board/desempenho → DesempenhoAccessGate + DesempenhoVisaoGeral
/equipe/board/desempenho/ciclos → DesempenhoAccessGate + DesempenhoCiclos
/equipe/board/desempenho/metas → DesempenhoAccessGate + DesempenhoMetas
/equipe/board/desempenho/feedbacks → DesempenhoAccessGate + DesempenhoFeedbacks
/equipe/board/desempenho/1a1 → DesempenhoAccessGate + DesempenhoReunioes1a1
/equipe/board/desempenho/evolucao → DesempenhoAccessGate + DesempenhoEvolucao
```

Manter `TeamRoute` como wrapper pai para consistência com as demais rotas `/equipe/*`.

### 2. Adicionar itens no sidebar do BoardLayout.tsx

Importar `BarChart3`, `Target` e `useAuth`. Adicionar nav items condicionais (apenas para `isAdmin || isLider`):
- Performance → `/equipe/board/performance` (BarChart3)
- Desempenho → `/equipe/board/desempenho` (Target)
- Dashboard (existente) → `/equipe/board/dashboard` (LayoutDashboard)

Adicionar lógica `isActive` com `useLocation`.

### 3. Remover itens do GestaoLayout.tsx

Remover as duas entradas condicionais de Desempenho e Performance do array `navItems` (linha 47-48). Remover imports de `Target` e `BarChart3` se não usados por outros itens.

### 4. Atualizar PerformanceDashboard.tsx

Trocar `GestaoLayout` por `BoardLayout` como wrapper. Ajustar props (`title`, `subtitle`).

### 5. Atualizar DesempenhoLayout.tsx

Atualizar todos os 6 paths no array `navItems` de `/gerencial/desempenho/*` para `/equipe/board/desempenho/*`. Atualizar o botão "Trocar área" para navegar a `/equipe/board/dashboard`.

### 6. Atualizar protectedPages.ts

Trocar os 7 `page_path` de `/gerencial/*` para `/equipe/board/*`. Mudar category de `'gestao'` para `'board'`.

### 7. Atualizar referências internas

- `CycleGoalsBlock.tsx`: `/gerencial/desempenho/ciclos` → `/equipe/board/desempenho/ciclos` e `/gerencial/desempenho/evolucao` → `/equipe/board/desempenho/evolucao`
- `DesempenhoVisaoGeral.tsx`: `/gerencial/desempenho/metas` → `/equipe/board/desempenho/metas` e `/gerencial/desempenho/evolucao` → `/equipe/board/desempenho/evolucao`

### 8. Corrigir bug — ActivityHeatmap dados incompletos

Em `usePerformanceData.ts`, adicionar query `heatmapTasksQuery` com janela fixa de 90 dias (independente do filtro `periodo`). Expor no retorno. Em `PerformanceDashboard.tsx`, passar `heatmapTasks` ao `TeamContributionBlock` separadamente.

### 9. Corrigir bug — handleRefresh

Substituir o bloco `handleRefresh` por:
```ts
queryClient.invalidateQueries({
  predicate: (query) =>
    typeof query.queryKey[0] === 'string' &&
    (query.queryKey[0] as string).startsWith('perf')
});
```
Renomear `performance-prefs` para `perf-prefs` para consistência.

### 10. Corrigir bug — Gráfico 3 meses truncado

Em `usePerformanceData.ts`, adicionar query `last3MonthsTasksQuery` cobrindo sempre os últimos 3 meses completos. Expor no retorno. Em `PerformanceDashboard.tsx`, passar ao `AreaComparisonBlock`.

### 11. Limpeza de código legado

- **Deletar** `src/hooks/useTaxAreas.ts` (sem imports ativos)
- **AuditLogTable.tsx** (linhas 83-96): Remover a query `tax_areas` e usar apenas `estrutura_areas`
- **usePerformanceData.ts**: Remover `as any` casts em `performance_preferencias` — usar tipo gerado
- **ProjectsBlock.tsx**: Corrigir fragments sem key para `React.Fragment key={...}`

### 12. Features faltantes do Performance

- **ProjectsBlock.tsx**: Adicionar colunas "Área" (chip colorido) e "Responsável" (iniciais + nome) na tabela
- **TeamContributionBlock.tsx**: Adicionar dropdown filtro por área + botões segmentados de métrica
- **AutomationImpactBlock.tsx**: Adicionar `AreaChart` Recharts abaixo da tabela com ROI acumulado mês a mês, gradiente verde, linha de referência "Meta projetada"

---

### Arquivos modificados

| Arquivo | Ação |
|---------|------|
| `src/App.tsx` | Mover rotas de /gerencial/* para /equipe/board/* |
| `src/components/equipe/board/BoardLayout.tsx` | Adicionar nav items Performance + Desempenho |
| `src/components/gestao/GestaoLayout.tsx` | Remover itens Performance + Desempenho |
| `src/pages/gerencial/performance/PerformanceDashboard.tsx` | Usar BoardLayout |
| `src/components/desempenho/DesempenhoLayout.tsx` | Atualizar paths |
| `src/config/protectedPages.ts` | Atualizar paths |
| `src/components/performance/CycleGoalsBlock.tsx` | Atualizar links |
| `src/pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` | Atualizar links |
| `src/hooks/usePerformanceData.ts` | Adicionar queries independentes + fix refresh + remover as any |
| `src/components/performance/TeamContributionBlock.tsx` | Filtros de área/métrica |
| `src/components/performance/ProjectsBlock.tsx` | Colunas Área + Responsável + fix fragments |
| `src/components/performance/AutomationImpactBlock.tsx` | AreaChart ROI acumulado |
| `src/hooks/useTaxAreas.ts` | Deletar |
| `src/components/equipe/audit/AuditLogTable.tsx` | Remover query tax_areas |

### O que NAO muda
- Nenhuma tabela, migration ou RLS
- GestaoLayout mantém seus 4 itens originais (Novidades, Chamados, Contatos, Acessos)
- Todas as rotas existentes do sistema permanecem intactas
- DesempenhoAccessGate continua protegendo tudo (admin + lider only)

