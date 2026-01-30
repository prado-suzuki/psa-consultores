
# Plano: Projetos em Andamento Vinculados ao Cliente

## Visão Geral

Criar a estrutura de banco de dados e lógica de frontend para que cada cliente autenticado veja apenas os projetos e documentos que foram atribuídos especificamente a ele pela equipe interna.

## Análise da Estrutura Atual

### Situação Encontrada
- A tabela `projects` existe mas é usada internamente, vinculada a `catalog_clients` (cadastro interno de clientes)
- A tabela `tickets` vincula ao `user_id` do usuário autenticado
- **Não existe** vinculação entre usuários autenticados (clientes do portal) e projetos/documentos visíveis para eles

### Solução Proposta
Criar duas novas tabelas de junção que permitem à equipe interna atribuir projetos e documentos a clientes específicos do portal.

## Mudanças no Banco de Dados

### 1. Tabela `client_visible_projects`
Vincula projetos que devem ser visíveis para clientes específicos no portal.

```sql
CREATE TABLE public.client_visible_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  visible_since timestamptz DEFAULT now(),
  notes text,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  UNIQUE(user_id, project_id)
);

ALTER TABLE public.client_visible_projects ENABLE ROW LEVEL SECURITY;

-- Cliente vê apenas projetos atribuídos a ele
CREATE POLICY "Clientes veem seus projetos"
  ON public.client_visible_projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Equipe pode gerenciar atribuições
CREATE POLICY "Equipe gerencia atribuições"
  ON public.client_visible_projects FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));
```

### 2. Tabela `client_documents`
Documentos e dashboards disponíveis para cada cliente.

```sql
CREATE TABLE public.client_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('dashboard', 'documento')),
  name text NOT NULL,
  description text,
  url text, -- Para dashboards (links externos)
  file_path text, -- Para documentos no storage
  file_name text,
  file_size bigint,
  created_at timestamptz DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.client_documents ENABLE ROW LEVEL SECURITY;

-- Cliente vê apenas seus documentos
CREATE POLICY "Clientes veem seus documentos"
  ON public.client_documents FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Equipe pode gerenciar documentos
CREATE POLICY "Equipe gerencia documentos"
  ON public.client_documents FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'team_member') OR public.has_role(auth.uid(), 'admin'));
```

## Mudanças no Frontend

### Arquivo: `src/pages/cliente/ClienteDashboard.tsx`

1. **Remover dados mock** e substituir por queries ao Supabase
2. **Buscar projetos visíveis** via `client_visible_projects` com join em `projects`
3. **Buscar documentos** via `client_documents`
4. **Adicionar estados de loading** para cada tab
5. **Manter mensagem de "nenhum item"** quando não houver dados atribuídos

### Estrutura de Dados Real

```text
┌─────────────────────────────────────────────────────────────────┐
│  projects (tabela interna existente)                            │
│  ├─ id, name, description, status, client_id, etc.             │
└─────────────────────────────────────────────────────────────────┘
                           ▲
                           │ project_id
┌─────────────────────────────────────────────────────────────────┐
│  client_visible_projects (NOVA)                                 │
│  ├─ user_id → auth.users (cliente do portal)                   │
│  ├─ project_id → projects (projeto interno)                    │
│  └─ visible_since, notes, created_by                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  client_documents (NOVA)                                        │
│  ├─ user_id → auth.users (cliente do portal)                   │
│  ├─ document_type ('dashboard' | 'documento')                  │
│  ├─ name, description                                          │
│  ├─ url (para dashboards externos)                             │
│  └─ file_path, file_name (para documentos no storage)          │
└─────────────────────────────────────────────────────────────────┘
```

### Lógica de Query no Dashboard

```typescript
// Buscar projetos visíveis para o cliente
const { data: visibleProjects } = useQuery({
  queryKey: ['client-projects', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('client_visible_projects')
      .select(`
        id,
        visible_since,
        notes,
        projects (
          id,
          name,
          description,
          status,
          start_date,
          end_date
        )
      `)
      .eq('user_id', user.id);
    return data;
  }
});

// Buscar documentos do cliente
const { data: clientDocuments } = useQuery({
  queryKey: ['client-documents', user?.id],
  queryFn: async () => {
    const { data, error } = await supabase
      .from('client_documents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    return data;
  }
});
```

## Considerações de Segurança

1. **RLS ativado** em ambas as tabelas novas
2. **Clientes só veem seus dados** via `auth.uid() = user_id`
3. **Equipe pode gerenciar** via função `has_role()` existente
4. **Cascade delete** configurado para limpeza automática

## Fluxo de Uso

1. Equipe interna cria/gerencia projetos na área `/equipe`
2. Equipe atribui projeto a um cliente via `client_visible_projects`
3. Equipe cadastra documentos/dashboards para o cliente via `client_documents`
4. Cliente acessa `/cliente` e vê apenas o que foi atribuído a ele

## Etapas de Implementação

1. Criar migration com as duas novas tabelas e RLS policies
2. Atualizar `ClienteDashboard.tsx`:
   - Remover interfaces e dados mock
   - Adicionar queries com `@tanstack/react-query`
   - Implementar loading states
   - Mapear dados reais para os componentes
3. Manter estrutura visual existente (tabs, cards, tabela)
4. Tratar casos de lista vazia com mensagens informativas

## Próximos Passos (Fora deste Escopo)

- Interface para a equipe atribuir projetos a clientes
- Upload de documentos via Supabase Storage
- Cálculo de progresso automático baseado em tarefas do projeto
