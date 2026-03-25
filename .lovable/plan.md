

## Plano: Otimizar carregamento dos cards do Dashboard

### Diagnostico

O problema esta no **waterfall interno** do `usePerformanceData.projectsQuery`:
1. Busca `tax_projects` (1 request)
2. Espera resposta, depois busca `fiscal_tasks` em chunks de 50 IDs (N requests sequenciais)
3. Espera resposta, depois busca `tax_project_members` em chunks de 50 IDs (N requests sequenciais)

Isso cria uma cascata de 3+ requests sequenciais. Com muitos projetos, pode facilmente levar 3-5 segundos.

Alem disso, o Dashboard dispara **~10 queries simultaneas** no mount (prefs, ciclo, projetos, tickets, membros, metas, periodTasks, heatmap, last3months, roi, improvements, tasksByArea), sobrecarregando o navegador.

Outro problema: o `isLoading` so monitora `projectsQuery`, mas os cards de ROI e Metas dependem de queries separadas que podem demorar mais — resultando em cards que mostram "0" antes de atualizar com o valor real.

### Correcoes

**1. Eliminar waterfall em `usePerformanceData.projectsQuery`**
- Buscar projetos, tasks e members em **3 queries paralelas** (`Promise.all`) em vez de sequenciais
- Para tasks e members, buscar TODOS de uma vez (sem filtro por project_id) e fazer o join no client-side — elimina a necessidade de chunking

**2. Skeleton individual por card**
- Em vez de um unico `isLoading` que bloqueia todos os 5 cards, cada card verifica seu proprio estado de loading
- Card "Projetos" depende de `projectsQuery`
- Card "ROI" depende da query `improvements`
- Card "Pontualidade" depende de `projectsQuery`
- Card "Metas" depende de `overview` (que depende de `cicloAtivo`)
- Card "Membros" depende de `membersQuery`

**3. `staleTime` para queries estáveis**
- Queries que nao mudam frequentemente (prefs, ciclo, membros, profiles) recebem `staleTime: 5 * 60 * 1000` para evitar refetch desnecessario ao navegar entre paginas

### Arquivos

| Acao | Arquivo |
|------|---------|
| Editar | `src/hooks/usePerformanceData.ts` — paralelizar queries internas, adicionar staleTime |
| Editar | `src/pages/equipe/board/BoardDashboard.tsx` — skeleton individual por card |

### O que NAO muda
- Nenhuma rota, tabela, RLS ou componente externo
- Logica de calculo de status, filtros, graficos
- Demais paginas do Board

