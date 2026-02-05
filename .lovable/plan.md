

# Plano: Corrigir Sidebar Tax e Adicionar Gestao de Projetos com Vinculos

## Resumo dos Problemas Identificados

### 1. Sidebar Tax Fixo (nao colapsa)
O `FiscalSidebar.tsx` atual usa um layout estático com `w-64` fixo e não implementa a lógica de colapso/expansão. Diferente do componente `ui/sidebar.tsx` que tem `SidebarProvider` e `SidebarTrigger` para controlar estados.

### 2. Nome "Tex" deve ser "Tax"
Em `FiscalSidebar.tsx` linha 102, está escrito "Tex" ao invés de "Tax".

### 3. Falta aba de Projetos na área Tax
Não existe uma seção de "Projetos" no menu lateral e nem páginas correspondentes.

### 4. Tarefas não têm vínculo com projetos, clientes ou serviços
A tabela `fiscal_tasks` não possui campos para `project_id`, `client_id` ou `service_id`.

---

## Alteracoes Necessarias

### Parte 1: Corrigir Sidebar - Adicionar Colapso/Expansao

Refatorar `FiscalSidebar.tsx` para usar o sistema de sidebar colapsável do Shadcn:

```text
+----------------------------------------------------------+
|  [<]  Tax                              (quando expandido)|
|       Gestão de Projetos                                 |
+----------------------------------------------------------+
|  Dashboard                                               |
|                                                          |
|  v Projetos                                              |
|    - Cadastro                                            |
|                                                          |
|  v Demandas                                              |
|    - Tarefas                                             |
|    - Clientes                                            |
|                                                          |
+----------------------------------------------------------+
|  [Trocar área]                                           |
|  [Sair]                                                  |
+----------------------------------------------------------+
```

### Parte 2: Renomear "Tex" para "Tax"

Atualizar referências de "Tex" para "Tax" no título do sidebar.

### Parte 3: Adicionar aba "Projetos" com Cadastro

Criar nova seção no menu antes de "Demandas":

- Projetos (grupo)
  - Cadastro (subitem)

Criar página `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` para gerenciar projetos da área fiscal.

### Parte 4: Vincular Projetos, Clientes e Servicos as Tarefas

Adicionar campos no banco de dados:

```sql
ALTER TABLE public.fiscal_tasks 
ADD COLUMN project_id uuid REFERENCES public.projects(id),
ADD COLUMN client_id uuid REFERENCES public.cliente(id),
ADD COLUMN service_id uuid REFERENCES public.servico(id_servico);
```

Atualizar `TaskModal.tsx` para incluir selects de Projeto, Cliente e Serviço.

---

## Secao Tecnica

### Migracao de Banco de Dados

```sql
-- Adicionar campos de vinculo em fiscal_tasks
ALTER TABLE public.fiscal_tasks 
ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.cliente(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS service_id uuid REFERENCES public.servico(id_servico) ON DELETE SET NULL;

-- Adicionar indices para performance
CREATE INDEX IF NOT EXISTS idx_fiscal_tasks_project_id ON public.fiscal_tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_tasks_client_id ON public.fiscal_tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_fiscal_tasks_service_id ON public.fiscal_tasks(service_id);
```

### Arquivos a Modificar/Criar

#### 1. src/components/equipe/fiscal/FiscalSidebar.tsx

Refatorar completamente para suportar colapso:

```typescript
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  ClipboardList,
  ListTodo,
  Building,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  Calculator,
  FolderKanban,
  ArrowLeft,
  LogOut
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible';
import logoPsa from '@/assets/logo-psa.png';

const menuItems = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: '/equipe/tex/dashboard'
  },
  {
    id: 'projetos',
    label: 'Projetos',
    icon: FolderKanban,
    children: [
      {
        id: 'cadastro-projetos',
        label: 'Cadastro',
        icon: FolderKanban,
        path: '/equipe/tex/projetos/cadastro'
      }
    ]
  },
  {
    id: 'demandas',
    label: 'Demandas',
    icon: ClipboardList,
    children: [
      {
        id: 'tarefas',
        label: 'Tarefas',
        icon: ListTodo,
        path: '/equipe/tex/demandas/tarefas'
      },
      {
        id: 'clientes',
        label: 'Clientes',
        icon: Building,
        path: '/equipe/tex/demandas/clientes'
      }
    ]
  }
];

export const FiscalSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut } = useAuth();
  const [openMenus, setOpenMenus] = useState<string[]>(['demandas', 'projetos']);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // ... resto da logica com suporte a collapse
  
  return (
    <div className={cn(
      "bg-white border-r border-slate-200 flex flex-col h-screen flex-shrink-0 transition-all duration-200",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Header com botao de colapso */}
      <div className="h-14 border-b border-slate-200 flex items-center justify-between px-4">
        {!isCollapsed && (
          <div className="flex items-center">
            <div className="h-9 w-9 rounded-lg bg-emerald-500/10 flex items-center justify-center mr-3">
              <Calculator className="h-5 w-5 text-emerald-600" />
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 text-sm">Tax</h1>
              <p className="text-xs text-slate-500">Gestão de Projetos</p>
            </div>
          </div>
        )}
        <Button 
          variant="ghost" 
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="h-8 w-8"
        >
          <ChevronLeft className={cn(
            "h-4 w-4 transition-transform",
            isCollapsed && "rotate-180"
          )} />
        </Button>
      </div>
      
      {/* Menu - esconder labels quando colapsado */}
      {/* ... */}
    </div>
  );
};
```

#### 2. src/components/equipe/fiscal/FiscalLayout.tsx

Nenhuma alteração necessária - já suporta o sidebar como componente filho.

#### 3. Criar src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx

Nova página para cadastro de projetos:

```typescript
import { useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { FiscalLayout } from '@/components/equipe/fiscal/FiscalLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
// ... imports de componentes

const FiscalProjetosCadastro = () => {
  // Buscar projetos filtrados por client_id fiscal
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['fiscal-projects'],
    queryFn: async () => {
      // Primeiro buscar o ID do cliente Fiscal
      const { data: fiscalClient } = await supabase
        .from('catalog_clients')
        .select('id')
        .ilike('name', '%fiscal%')
        .single();

      if (!fiscalClient) return [];

      const { data } = await supabase
        .from('projects')
        .select('*')
        .eq('client_id', fiscalClient.id)
        .order('name');
      
      return data || [];
    }
  });

  // Modal de criacao/edicao
  // Tabela com projetos
  // ...
};

export default FiscalProjetosCadastro;
```

#### 4. src/App.tsx

Adicionar rota para nova página:

```typescript
import FiscalProjetosCadastro from "./pages/equipe/fiscal/FiscalProjetosCadastro";

// Na secao de rotas Tax:
<Route path="/equipe/tex/projetos/cadastro" element={
  <TeamRoute>
    <PageAccessGate pagePath="/equipe/tex/dashboard">
      <FiscalProjetosCadastro />
    </PageAccessGate>
  </TeamRoute>
} />
```

#### 5. src/hooks/useFiscalTasks.ts

Atualizar interfaces e queries para incluir vinculos:

```typescript
export interface FiscalTask {
  // ... campos existentes
  project_id: string | null;
  client_id: string | null;
  service_id: string | null;
  // Joins
  project?: { id: string; name: string } | null;
  client?: { id: string; nome: string } | null;
  service?: { id_servico: string; descricao: string } | null;
}

export interface CreateFiscalTaskInput {
  // ... campos existentes
  project_id?: string;
  client_id?: string;
  service_id?: string;
}

// Atualizar query para incluir joins
const { data, error } = await supabase
  .from('fiscal_tasks')
  .select(`
    *,
    project:projects(id, name),
    client:cliente(id, nome),
    service:servico(id_servico, descricao)
  `)
  .order('created_at', { ascending: false });
```

#### 6. src/components/equipe/fiscal/tasks/TaskModal.tsx

Adicionar campos de vinculo:

```typescript
// Adicionar campos no schema
const taskSchema = z.object({
  // ... campos existentes
  project_id: z.string().optional(),
  client_id: z.string().optional(),
  service_id: z.string().optional(),
});

// Buscar dados para os selects
const { data: projects = [] } = useQuery({
  queryKey: ['fiscal-projects-for-tasks'],
  queryFn: async () => {
    const { data: fiscalClient } = await supabase
      .from('catalog_clients')
      .select('id')
      .ilike('name', '%fiscal%')
      .single();
    
    if (!fiscalClient) return [];

    const { data } = await supabase
      .from('projects')
      .select('id, name')
      .eq('client_id', fiscalClient.id)
      .order('name');
    return data || [];
  }
});

const { data: clients = [] } = useQuery({
  queryKey: ['clients-for-tasks'],
  queryFn: async () => {
    const { data } = await supabase
      .from('cliente')
      .select('id, nome')
      .eq('ativo', true)
      .order('nome');
    return data || [];
  }
});

const { data: services = [] } = useQuery({
  queryKey: ['services-for-tasks'],
  queryFn: async () => {
    const { data } = await supabase
      .from('servico')
      .select('id_servico, descricao');
    return data || [];
  }
});

// Adicionar selects no formulario
<div className="grid grid-cols-3 gap-4">
  <FormField
    control={form.control}
    name="project_id"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Projeto</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="">Nenhum</SelectItem>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormItem>
    )}
  />
  
  <FormField
    control={form.control}
    name="client_id"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Cliente</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="">Nenhum</SelectItem>
            {clients.map(c => (
              <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormItem>
    )}
  />
  
  <FormField
    control={form.control}
    name="service_id"
    render={({ field }) => (
      <FormItem>
        <FormLabel>Servico</FormLabel>
        <Select onValueChange={field.onChange} value={field.value}>
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectItem value="">Nenhum</SelectItem>
            {services.map(s => (
              <SelectItem key={s.id_servico} value={s.id_servico}>
                {s.descricao}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormItem>
    )}
  />
</div>
```

---

## Resumo das Alteracoes

| Componente | Alteracao |
|------------|-----------|
| Banco de dados | Adicionar `project_id`, `client_id`, `service_id` em `fiscal_tasks` |
| `FiscalSidebar.tsx` | Adicionar botao de colapso/expansao, renomear para "Tax", adicionar seção Projetos |
| `FiscalProjetosCadastro.tsx` | Criar nova página para cadastro de projetos da área Tax |
| `App.tsx` | Adicionar rota `/equipe/tex/projetos/cadastro` |
| `useFiscalTasks.ts` | Atualizar interface e queries para incluir vinculos |
| `TaskModal.tsx` | Adicionar selects de Projeto, Cliente e Servico |

---

## Fluxo de Uso Apos Implementacao

```text
1. Usuario acessa area Tax
   ↓
2. Menu lateral mostra Dashboard, Projetos > Cadastro, Demandas > Tarefas/Clientes
   ↓
3. Usuario pode colapsar/expandir sidebar clicando no botao [<]
   ↓
4. Em Projetos > Cadastro, usuario cria projetos especificos da area fiscal
   ↓
5. Em Demandas > Tarefas, ao criar/editar tarefa:
   - Pode vincular a um Projeto da area
   - Pode vincular a um Cliente
   - Pode vincular a um Servico (produtos existentes)
   ↓
6. Vinculos aparecem nas listas e filtros de tarefas
```

