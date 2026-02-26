

## Diagnóstico

**Arquivo:** `src/pages/equipe/fiscal/FiscalDashboard.tsx`
- Renderiza a rota `/equipe/tax/dashboard`
- **Imports atuais:** FiscalLayout, Card/CardContent/CardHeader/CardTitle, lucide icons, useQuery, supabase, recharts (BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell)
- **Query atual:** Apenas 1 query em `tax_projects` (id, name, status). `estimatedHours` e `spentHours` são hardcoded como 0.
- **Dados disponíveis confirmados:**
  - `fiscal_tasks`: tem `assigned_to`, `assigned_to_name`, `client_id`, `project_id`, `estimated_hours`, `due_date`, `status`, `parent_task_id`, `title`
  - `tax_projects`: tem `area_id`, `name`, `status`
  - `profiles_safe` (view): `id`, `first_name`, `last_name`
  - `tax_areas`: `id`, `nome`
  - `cliente_dev`: `id`, `nome`

---

## Plano de implementação

### Arquivo a editar: `src/pages/equipe/fiscal/FiscalDashboard.tsx`

Reescrever o componente inteiro mantendo o FiscalLayout wrapper e o estilo visual.

### Novas queries (4 total)

1. **Projetos** (existente, manter): `tax_projects` → id, name, status, area_id
2. **Tarefas** (nova): `fiscal_tasks` com `parent_task_id IS NULL` → todos campos necessários. Join client-side com projetos e clientes.
3. **Clientes** (nova): `cliente_dev` → id, nome (para resolver nomes)
4. **Áreas** (nova): `tax_areas` → id, nome
5. **Membros** (nova): `profiles_safe` → id, first_name, last_name

### Layout

**LINHA 1 — 6 cards KPI** (grid 2→3→6 colunas)
- Total de Projetos (existente)
- Em Andamento (existente)
- Concluídos (existente)
- Pausados (existente)
- **Total de Tarefas** (novo) — count de tarefas top-level
- **Tarefas Atrasadas** (novo) — count onde `due_date < hoje AND status != 'done'`, borda vermelha se > 0

**LINHA 2 — 3 gráficos** (grid 1→3 colunas)
- **Tarefas por Status** — PieChart/donut com cores do `taskStatusColors`
- **Horas Est. por Projeto** — BarChart horizontal, agrupado por project_id
- **Horas Est. por Cliente** — BarChart horizontal, agrupado por client_id

**LINHA 3 — 2 tabelas** (grid 1→2 colunas)
- **Tarefas Atrasadas** — Table com título, projeto, responsável, vencimento, dias atraso
- **Carga por Membro** — Table com membro, tarefas ativas, horas estimadas, tarefas atrasadas

**LINHA 4 — 1 gráfico**
- **Tarefas por Área Fiscal** — BarChart vertical, resolve area via `tax_projects.area_id → tax_areas.nome`

### Imports a adicionar
- `PieChart, Pie, Legend` de recharts
- `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` de ui/table
- `ListChecks, AlertCircle, Users` de lucide-react
- `format, differenceInDays, isBefore, startOfDay` de date-fns

### Processamento de dados (client-side)
Todas as agregações (group by status, project, client, member, area) serão feitas em JavaScript a partir dos arrays retornados, evitando RPC/views extras. O filtro `parent_task_id IS NULL` será aplicado via `.is('parent_task_id', null)` na query.

### Responsividade
- Cards: `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`
- Gráficos L2: `grid-cols-1 lg:grid-cols-3`
- Tabelas L3: `grid-cols-1 lg:grid-cols-2`
- Gráfico L4: full width

### Sem alterações de banco
Todas as tabelas e views já existem. Nenhuma migração necessária.

