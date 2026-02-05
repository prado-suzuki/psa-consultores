
# Plano: Criar Tabela Separada `tax_projects` para Área Tax

## Contexto do Problema

Atualmente, ambas as áreas (Tax e Digital Rotina) utilizam a mesma tabela `projects`, diferenciando apenas pelo campo `source_area`. Isso gera confusão e mistura de dados entre áreas que têm necessidades diferentes.

**Situação Atual:**
- Tabela `projects` usada por Digital E Tax
- Campos específicos de Tax (`responsible_id`, `leader_id`, `external_client_id`, `area`, `objective`, `categories`) foram adicionados à tabela compartilhada
- Digital Rotina busca todos os projetos (sem filtro), Tax filtra por `source_area = 'tax'`

**Objetivo:**
- Criar tabela exclusiva `tax_projects` para a área Tax
- Manter tabela `projects` intacta e exclusiva para Digital Rotina
- Cada área gerencia seus próprios projetos de forma independente

---

## Estrutura da Nova Tabela

### `tax_projects`

| Coluna | Tipo | Descrição |
|--------|------|-----------|
| `id` | uuid | Chave primária |
| `name` | text | Nome do projeto (obrigatório) |
| `description` | text | Descrição detalhada |
| `status` | text | Status: active, completed, on_hold, cancelled |
| `external_client_id` | uuid | FK para tabela `cliente` |
| `responsible_id` | uuid | FK para `profiles` (responsável interno) |
| `leader_id` | uuid | FK para `profiles` (líder responsável) |
| `area` | text | Área: tributário, contábil, previdenciário, societário, consultivo, outro |
| `objective` | text | Objetivo do projeto |
| `categories` | text[] | Array de categorias |
| `start_date` | date | Data de início |
| `end_date` | date | Data de conclusão prevista |
| `created_by` | uuid | FK para `profiles` |
| `created_at` | timestamp | Data de criação |
| `updated_at` | timestamp | Data de atualização |

---

## Alterações no Banco de Dados

### 1. Criar Nova Tabela `tax_projects`

```sql
CREATE TABLE public.tax_projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  external_client_id UUID REFERENCES public.cliente(id),
  responsible_id UUID REFERENCES public.profiles(id),
  leader_id UUID REFERENCES public.profiles(id),
  area TEXT,
  objective TEXT,
  categories TEXT[] DEFAULT '{}',
  start_date DATE,
  end_date DATE,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### 2. Habilitar RLS e Criar Políticas

```sql
ALTER TABLE public.tax_projects ENABLE ROW LEVEL SECURITY;

-- Políticas para team_member e admin
CREATE POLICY "Team members can view tax_projects"
  ON public.tax_projects FOR SELECT
  USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can create tax_projects"
  ON public.tax_projects FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Team members can update tax_projects"
  ON public.tax_projects FOR UPDATE
  USING (has_role(auth.uid(), 'team_member') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tax_projects"
  ON public.tax_projects FOR DELETE
  USING (has_role(auth.uid(), 'admin'));
```

### 3. Trigger para `updated_at`

```sql
CREATE TRIGGER update_tax_projects_updated_at
  BEFORE UPDATE ON public.tax_projects
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## Alterações nos Arquivos

### 1. `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

**Mudanças:**
- Alterar todas as queries de `projects` para `tax_projects`
- Remover filtro `source_area` (não mais necessário)
- Manter todos os campos e funcionalidades existentes

```typescript
// Antes
.from('projects')
.eq('source_area', 'tax')

// Depois  
.from('tax_projects')
```

### 2. `src/pages/equipe/fiscal/FiscalDashboard.tsx`

**Mudanças:**
- Alterar query de `projects` para `tax_projects`
- Remover filtro `source_area`
- Atualizar join com `project_work_packages` se necessário (ou criar `tax_work_packages`)

```typescript
// Antes
.from('projects')
.eq('source_area', 'tax')

// Depois
.from('tax_projects')
```

### 3. `src/components/equipe/fiscal/FiscalWorkPackages.tsx`

**Mudanças:**
- Alterar query de projetos para `tax_projects`
- Atualizar seletor de projetos

### 4. `src/components/equipe/fiscal/tasks/TaskModal.tsx`

**Mudanças:**
- Alterar query de projetos para `tax_projects`

### 5. Limpeza da Tabela `projects`

**Ações:**
- Remover colunas específicas de Tax que foram adicionadas:
  - `responsible_id`
  - `leader_id`
  - `external_client_id`
  - `area`
  - `objective`
  - `categories`
  - `source_area`
- A tabela `projects` volta a ser exclusiva de Digital Rotina

---

## Migração de Dados Existentes

Se existirem projetos em `projects` com `source_area = 'tax'`, eles serão migrados:

```sql
INSERT INTO public.tax_projects (name, description, status, ...)
SELECT name, description, status, ...
FROM public.projects
WHERE source_area = 'tax';
```

Após confirmação, os registros antigos serão removidos:

```sql
DELETE FROM public.projects WHERE source_area = 'tax';
```

---

## Resumo das Alterações

| Componente | Ação |
|------------|------|
| Banco de dados | Criar tabela `tax_projects` com RLS |
| `FiscalProjetosCadastro.tsx` | Usar `tax_projects` |
| `FiscalDashboard.tsx` | Usar `tax_projects` |
| `FiscalWorkPackages.tsx` | Usar `tax_projects` |
| `TaskModal.tsx` | Usar `tax_projects` |
| Tabela `projects` | Remover colunas de Tax, manter exclusiva para Digital |

---

## Resultado Esperado

1. **Tax**: Gerencia projetos na tabela `tax_projects` com campos específicos
2. **Digital Rotina**: Gerencia projetos na tabela `projects` original
3. **Isolamento total**: Cada área tem sua própria estrutura de dados
4. **Sem conflitos**: Alterações em uma área não afetam a outra
