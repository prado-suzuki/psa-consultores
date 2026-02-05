
# Plano: Sistema Completo de Gestao de Tarefas para Area Fiscal

## Resumo

Este plano cria um sistema completo de gestao de tarefas para a area Tax (Fiscal), removendo as abas "Minhas Demandas" e "Pacotes de Trabalho", mantendo "Clientes" e adicionando uma nova sub-aba "Tarefas" com multiplas visualizacoes (Calendario, Tabela, Kanban, Hoje, Futuras).

## Alteracoes de Navegacao

### Remover Rotas e Componentes
- Remover rota `/equipe/tex/demandas/inbox` (FiscalDemandasInbox)
- Remover rota `/equipe/tex/demandas/pacotes` (FiscalDemandasPacotes)
- Manter rota `/equipe/tex/demandas/clientes` (FiscalDemandasClientes)
- Adicionar rota `/equipe/tex/demandas/tarefas` (FiscalDemandasTarefas)

### Atualizar Menu Lateral (FiscalSidebar)
Alterar itens do submenu "Demandas":
```text
Demandas
  ├── Tarefas (nova)
  └── Clientes (manter)
```

## Banco de Dados

### Nova Tabela: fiscal_tasks
Criar tabela separada para nao conflitar com tabela `tasks` existente usada para sprints:

| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | Chave primaria |
| title | text | Titulo obrigatorio |
| description | text | Descricao opcional |
| status | enum | backlog, todo, in_progress, review, done |
| priority | enum | low, medium, high, urgent |
| assigned_to | uuid | Usuario atribuido |
| assigned_to_name | text | Nome do responsavel |
| created_by | uuid | Quem criou |
| due_date | date | Data de vencimento |
| due_time | time | Hora de vencimento |
| is_recurring | boolean | Se e recorrente |
| recurrence_type | enum | daily, weekly, monthly, yearly |
| category | enum | task, fixed_event |
| tags | text[] | Array de tags |
| department | enum | commercial, financial, administrative, operations |
| parent_task_id | uuid | Para subtarefas |
| created_at | timestamptz | Criado em |
| updated_at | timestamptz | Atualizado em |

### Nova Tabela: fiscal_task_comments
| Campo | Tipo | Descricao |
|-------|------|-----------|
| id | uuid | Chave primaria |
| task_id | uuid | Referencia a fiscal_tasks |
| user_id | uuid | Usuario que comentou |
| user_name | text | Nome do usuario |
| comment | text | Conteudo do comentario |
| is_system | boolean | Se e mensagem automatica |
| created_at | timestamptz | Criado em |

### Politicas RLS
- SELECT: usuarios autenticados com role team_member ou admin
- INSERT: usuarios autenticados com role team_member ou admin
- UPDATE: usuarios autenticados com role team_member ou admin
- DELETE: apenas o criador ou admin

## Estrutura de Arquivos

```text
src/
├── pages/equipe/fiscal/
│   ├── FiscalDemandasTarefas.tsx (nova pagina principal)
│   ├── FiscalDemandasClientes.tsx (manter)
│   └── FiscalDemandasInbox.tsx (remover)
│   └── FiscalDemandasPacotes.tsx (remover)
├── hooks/
│   └── useFiscalTasks.ts (novo hook CRUD)
├── components/equipe/fiscal/tasks/
│   ├── TaskFilters.tsx (filtros globais)
│   ├── TaskKPICards.tsx (cards de contagem por status)
│   ├── TaskCard.tsx (card de tarefa)
│   ├── TaskTable.tsx (visualizacao tabela)
│   ├── TaskKanban.tsx (visualizacao kanban)
│   ├── TaskCalendar.tsx (visualizacao calendario)
│   ├── TaskTodayView.tsx (visualizacao hoje)
│   ├── TaskFutureView.tsx (visualizacao futuras)
│   ├── TaskModal.tsx (modal criar/editar)
│   └── ReassignModal.tsx (modal reatribuicao)
```

## Visualizacoes Detalhadas

### 1. Calendario (View Padrao)
- Grade mensal com dias
- Cada dia mostra indicadores coloridos (badges) das tarefas
- Cores baseadas na prioridade (vermelho=urgente, amarelo=alta, azul=media, cinza=baixa)
- Eventos fixos destacados em roxo
- Clicar em um dia abre painel lateral com cards detalhados

### 2. Tabela
- Colunas: Titulo, Status, Prioridade, Responsavel, Data, Departamento
- Dropdowns inline para alterar status/prioridade
- Suporte a subtarefas com indentacao e expandir/colapsar
- Ordenacao por qualquer coluna

### 3. Kanban
- 5 colunas: Backlog, A Fazer, Em Progresso, Revisao, Concluido
- Drag-and-drop entre colunas
- Contador de tarefas por coluna
- Cards compactos com titulo, prioridade, avatar do responsavel

### 4. Hoje
- Lista simplificada com checkboxes
- Apenas tarefas do dia atual
- Ordenadas por prioridade (urgente primeiro)
- Resumo de pendentes/concluidas

### 5. Futuras
- Tarefas agrupadas por semana (proximas 12 semanas)
- Paineis colapsaveis por semana
- Opcao de agrupar por mes (proximos 6 meses)

## Filtros Globais

```text
+-----------------------------------------------------------+
| [Buscar...]  [Responsavel v]  [Filtros Avancados]         |
+-----------------------------------------------------------+
| [Status: Em Progresso x] [Prioridade: Alta x]             |
+-----------------------------------------------------------+
```

- Campo de busca por texto (titulo, descricao)
- Dropdown de responsavel: Todas, Minhas, ou usuario especifico
- Popover de filtros avancados: Status, Prioridade, Departamento, Periodo
- Badges removiveis mostrando filtros ativos

## KPI Cards

5 cards horizontais mostrando contagem por status:
```text
| Backlog | A Fazer | Em Progresso | Revisao | Concluido |
|   12    |    8    |      5       |    3    |    27     |
```

## Modal de Criacao/Edicao

Formulario com campos:
- Titulo (obrigatorio)
- Descricao (editor de texto)
- Status (select)
- Prioridade (select)
- Responsavel (select com avatares)
- Data de vencimento (datepicker)
- Hora (timepicker, opcional)
- Departamento (select)
- Categoria: Tarefa ou Evento Fixo (switch)
- Recorrente (switch + tipo de recorrencia)
- Tags (input com chips)
- Tarefa pai (select, para subtarefas)

## Modal de Reatribuicao

- Lista de usuarios com avatares
- Campo de comentario obrigatorio (motivo da reatribuicao)
- Gera comentario automatico no historico

## Secao Tecnica

### SQL de Criacao

```sql
-- Enums (se nao existirem)
DO $$ BEGIN
  CREATE TYPE fiscal_task_status AS ENUM ('backlog', 'todo', 'in_progress', 'review', 'done');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_task_priority AS ENUM ('low', 'medium', 'high', 'urgent');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_task_category AS ENUM ('task', 'fixed_event');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_recurrence_type AS ENUM ('daily', 'weekly', 'monthly', 'yearly');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE fiscal_task_department AS ENUM ('commercial', 'financial', 'administrative', 'operations');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabela principal
CREATE TABLE public.fiscal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  status fiscal_task_status NOT NULL DEFAULT 'todo',
  priority fiscal_task_priority NOT NULL DEFAULT 'medium',
  assigned_to uuid REFERENCES public.profiles(id),
  assigned_to_name text,
  created_by uuid REFERENCES public.profiles(id),
  due_date date,
  due_time time,
  is_recurring boolean DEFAULT false,
  recurrence_type fiscal_recurrence_type,
  category fiscal_task_category NOT NULL DEFAULT 'task',
  tags text[] DEFAULT '{}',
  department fiscal_task_department,
  parent_task_id uuid REFERENCES public.fiscal_tasks(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Tabela de comentarios
CREATE TABLE public.fiscal_task_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.fiscal_tasks(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.profiles(id),
  user_name text,
  comment text NOT NULL,
  is_system boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE public.fiscal_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fiscal_task_comments ENABLE ROW LEVEL SECURITY;

-- Politicas para fiscal_tasks
CREATE POLICY "Team members can view fiscal tasks" ON public.fiscal_tasks
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create fiscal tasks" ON public.fiscal_tasks
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update fiscal tasks" ON public.fiscal_tasks
FOR UPDATE TO authenticated
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Creators and admins can delete fiscal tasks" ON public.fiscal_tasks
FOR DELETE TO authenticated
USING (created_by = auth.uid() OR has_role(auth.uid(), 'admin'));

-- Politicas para fiscal_task_comments
CREATE POLICY "Team members can view fiscal task comments" ON public.fiscal_task_comments
FOR SELECT TO authenticated
USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create fiscal task comments" ON public.fiscal_task_comments
FOR INSERT TO authenticated
WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

-- Trigger para atualizar updated_at
CREATE TRIGGER update_fiscal_tasks_updated_at
  BEFORE UPDATE ON public.fiscal_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

### Hook useFiscalTasks

```typescript
// Operacoes principais
- useFiscalTasks(filters) - listar com filtros
- useCreateFiscalTask() - criar tarefa
- useUpdateFiscalTask() - atualizar tarefa
- useDeleteFiscalTask() - excluir tarefa
- useReassignFiscalTask() - reatribuir com comentario
- useFiscalTaskComments(taskId) - listar comentarios
- useCreateFiscalTaskComment() - criar comentario
```

### Drag-and-Drop no Kanban
Usar biblioteca nativa HTML5 Drag and Drop ou @dnd-kit para:
- Arrastar cards entre colunas
- Atualizar status automaticamente ao soltar
- Feedback visual durante arraste

### Componentes UI Utilizados
- Card, Badge, Button, Dialog, Sheet
- Select, Tabs, Table, Calendar
- Popover, ScrollArea, Collapsible
- Avatar, Tooltip, Checkbox, Switch
- DatePicker (react-day-picker)

## Arquivos a Modificar

1. `src/App.tsx` - Remover rotas inbox/pacotes, adicionar rota tarefas
2. `src/components/equipe/fiscal/FiscalSidebar.tsx` - Atualizar menu

## Arquivos a Criar

1. `src/pages/equipe/fiscal/FiscalDemandasTarefas.tsx`
2. `src/hooks/useFiscalTasks.ts`
3. `src/components/equipe/fiscal/tasks/TaskFilters.tsx`
4. `src/components/equipe/fiscal/tasks/TaskKPICards.tsx`
5. `src/components/equipe/fiscal/tasks/TaskCard.tsx`
6. `src/components/equipe/fiscal/tasks/TaskTable.tsx`
7. `src/components/equipe/fiscal/tasks/TaskKanban.tsx`
8. `src/components/equipe/fiscal/tasks/TaskCalendar.tsx`
9. `src/components/equipe/fiscal/tasks/TaskTodayView.tsx`
10. `src/components/equipe/fiscal/tasks/TaskFutureView.tsx`
11. `src/components/equipe/fiscal/tasks/TaskModal.tsx`
12. `src/components/equipe/fiscal/tasks/ReassignModal.tsx`

## Arquivos a Remover

1. `src/pages/equipe/fiscal/FiscalDemandasInbox.tsx`
2. `src/pages/equipe/fiscal/FiscalDemandasPacotes.tsx`
3. `src/components/equipe/fiscal/MinhasDemandas.tsx`
4. `src/components/equipe/fiscal/FiscalWorkPackages.tsx`

## Dependencias

Pacotes ja disponiveis no projeto:
- @tanstack/react-query
- @supabase/supabase-js
- date-fns
- lucide-react
- react-hook-form + zod
- Componentes shadcn/ui
