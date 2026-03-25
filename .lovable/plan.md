
Diagnóstico confirmado: o travamento dos primeiros cards do Dashboard não está no visual; está no fluxo de dados.

### O que identifiquei
1. **Os 5 cards do topo ficam bloqueados por um único loading**
   - Em `src/pages/equipe/board/BoardDashboard.tsx`, toda a faixa de KPIs depende de `projectsQuery.isLoading`.
   - Enquanto essa query não termina, os cards inteiros ficam em skeleton, mesmo que outros dados da página já tenham chegado.

2. **O Dashboard está usando um hook “grande demais”**
   - `src/hooks/usePerformanceData.ts` foi pensado para a página de Performance, mas o Dashboard usa só uma parte dele.
   - Mesmo assim, ao abrir `/equipe/board/dashboard`, ele dispara várias queries desnecessárias: prefs, ciclo, tickets, metas, periodTasks, heatmap, last3Months, ROI etc.

3. **Há refetch em cascata por chave instável**
   - `periodTo` é calculado com `new Date().toISOString()` dentro do hook.
   - Isso muda a cada render e altera a `queryKey` de `periodTasksQuery`, gerando novas requisições seguidas.
   - Confirmei no tráfego 3 chamadas quase idênticas para `fiscal_tasks` no mesmo segundo, mudando só milissegundos no `lte`.

4. **A query principal ainda faz processamento caro no cliente**
   - `projectsQuery` busca projetos, tarefas e membros e depois faz vários `filter/find` em loops aninhados.
   - Mesmo com poucos dados hoje, isso causa trabalho desnecessário e piora conforme a base crescer.

5. **Existe inconsistência de schema/filtro de projeto ativo**
   - O hook usa `.eq('is_active', true)` em `tax_projects`, mas a base consultada mostra inconsistência com esse campo.
   - Isso precisa ser validado/corrigido porque pode provocar retry silencioso do React Query e aumentar a sensação de travamento.

### Plano de correção
1. **Separar o Dashboard em um hook próprio**
   - Criar um hook dedicado apenas para `/equipe/board/dashboard`, trazendo só:
     - resumo de projetos
     - resumo de membros
     - ROI
     - tarefas por área
     - decisões/visão executiva
   - Assim o Dashboard deixa de carregar toda a infraestrutura da página Performance.

2. **Estabilizar período e query keys**
   - Memorizar `periodFrom/periodTo` por filtro selecionado.
   - Remover `new Date().toISOString()` de query keys reativas.
   - Garantir que a troca de filtro gere 1 refetch real, não vários.

3. **Reduzir processamento no cliente**
   - Montar mapas por `project_id` e `assigned_to` em vez de usar `filter/find` repetidos dentro de loops.
   - Se necessário, mover parte da agregação para queries mais objetivas.

4. **Desacoplar o loading dos cards**
   - Cada card passa a ter loading próprio.
   - Exemplo:
     - Projetos/Pontualidade dependem de projetos
     - ROI depende de melhorias
     - Metas depende do overview
     - Membros depende de members
   - Isso evita que um único gargalo congele toda a primeira linha.

5. **Corrigir a fonte de “projetos ativos”**
   - Validar o campo correto na base (`status = 'active'` ou equivalente) e alinhar o hook com o schema real.
   - Eliminar retries por filtro inválido.

### Arquivos a ajustar
- `src/hooks/usePerformanceData.ts`
- `src/pages/equipe/board/BoardDashboard.tsx`
- `src/hooks/useCiclosAvaliacao.ts` ou novo hook dedicado ao Dashboard
- opcional: novo `src/hooks/useBoardDashboardData.ts`

### Resultado esperado
- os cards do topo deixam de “ficar travados”
- menos chamadas repetidas ao backend
- renderização progressiva dos KPIs
- dashboard mais rápido agora e mais estável com crescimento de dados
