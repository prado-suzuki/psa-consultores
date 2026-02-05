
# Plano: Isolamento de Projetos por Area e Ordenacao por Nome

## Resumo

Este plano garante que:
1. Projetos em Digital Rotina sejam ordenados por nome (nao por data)
2. Projetos fiquem isolados por area - cada ambiente usa sua propria base
3. Outras areas que precisem de gestao de projetos criem suas proprias tabelas

## Diagnostico Atual

### Projetos no Banco
Existem 8 projetos ativos (nenhum foi removido):
- **Fiscal (5):** P2, P3, P4, P5, P7
- **Transversal (2):** P6, P8
- **Sem cliente (1):** P9

### Problema de Ordenacao
Em `EquipeProjetos.tsx`, a consulta ordena por `created_at` descendente:
```
.order('created_at', { ascending: false })
```
Isso faz projetos recentes aparecerem primeiro, nao em ordem alfabetica.

### Uso Compartilhado (Problema)
A tabela `projects` e usada em:
- **Digital Rotina** (`EquipeProjetos.tsx`) - lista todos
- **Sprints/Kanban/Daily** - seleciona projetos
- **Area Tax** (`FiscalWorkPackages.tsx`) - ja filtra por client_id "Fiscal"

## Solucao Proposta

### 1. Ordenar por Nome em Digital Rotina
Alterar `EquipeProjetos.tsx`:
```typescript
// Antes
.order('created_at', { ascending: false })

// Depois
.order('name', { ascending: true })
```

### 2. Filtrar Projetos por Area em Digital Rotina
Digital Rotina deve exibir apenas projetos do cliente "Digital" ou sem cliente definido. Adicionar filtro na consulta:

```typescript
// Buscar ID do cliente Digital
const { data: digitalClient } = await supabase
  .from('catalog_clients')
  .select('id')
  .ilike('name', '%digital%')
  .single();

// Filtrar projetos
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .or(`client_id.eq.${digitalClient?.id},client_id.is.null`)
  .order('name', { ascending: true });
```

### 3. Criar Estrutura Isolada para Novas Areas
Para areas que precisarem de gestao de projetos independente, criar tabelas dedicadas:

**Opcao A: Nova tabela por area (recomendado para isolamento total)**
```sql
-- Exemplo para area OSG
CREATE TABLE public.osg_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  status text DEFAULT 'active',
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**Opcao B: Usar coluna `area` na tabela existente**
```sql
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS area text DEFAULT 'digital';

-- Cada area filtra por sua propria area
```

## Secao Tecnica

### Arquivos a Modificar

1. **src/pages/equipe/EquipeProjetos.tsx**
   - Alterar ordenacao para `name` ascendente
   - Adicionar filtro por cliente "Digital" ou null

2. **src/pages/equipe/EquipeDaily.tsx** (opcional)
   - Filtrar projetos por area se necessario

3. **src/pages/equipe/EquipeSprints.tsx** (opcional)
   - Filtrar projetos por area se necessario

### Migracao de Banco (se necessario)

Se optar por adicionar coluna `area`:
```sql
ALTER TABLE public.projects 
ADD COLUMN IF NOT EXISTS area text;

-- Atualizar projetos existentes
UPDATE public.projects 
SET area = 'fiscal' 
WHERE client_id = '2bc6cab1-0d94-4855-a785-e09da0558466';

UPDATE public.projects 
SET area = 'digital' 
WHERE area IS NULL;
```

### Alteracoes em EquipeProjetos.tsx

```typescript
const fetchProjects = async () => {
  try {
    // Buscar cliente Digital do catalogo
    const { data: digitalClient } = await supabase
      .from('catalog_clients')
      .select('id')
      .ilike('name', '%transversal%') // ou criar cliente "Digital"
      .single();

    // Buscar projetos filtrados e ordenados por nome
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .or(digitalClient?.id 
        ? `client_id.eq.${digitalClient.id},client_id.is.null`
        : 'client_id.is.null')
      .order('name', { ascending: true }); // Ordenar por nome
    
    if (error) throw error;
    setProjects(data || []);
  } catch (error) {
    console.error('Error fetching projects:', error);
  } finally {
    setLoading(false);
  }
};
```

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `EquipeProjetos.tsx` | Ordenar por nome, filtrar por area Digital |
| `EquipeDaily.tsx` | Filtrar projetos por area (opcional) |
| `EquipeSprints.tsx` | Filtrar projetos por area (opcional) |
| `EquipeKanban.tsx` | Filtrar projetos por area (opcional) |

## Proximos Passos (Novas Areas)

Quando uma nova area precisar de gestao de projetos propria:
1. Criar tabela dedicada (ex: `osg_projects`, `fixos_projects`)
2. Criar componentes/paginas dedicados para a area
3. Implementar CRUD isolado

Isso garante que cada ambiente opere de forma independente, sem conflito de dados.
