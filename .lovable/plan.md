

# Plano de implementação — 7 correções e novos cadastros

## 1. Nova sub-aba "Centro de Custo" em Cadastro Categorias

**Arquivo:** `src/components/equipe/CadastroCategorias.tsx`

Criar nova função `CentroCustoTab` com CRUD na tabela `centros_custo` (nova). Layout idêntico a `CategoriasTab` — nome + código.

**Migração SQL:** Criar tabela `centros_custo`:
```sql
CREATE TABLE public.centros_custo (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo text NOT NULL UNIQUE,
  nome text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.centros_custo ENABLE ROW LEVEL SECURITY;
-- RLS: admin e lider podem gerenciar
```

Adicionar sub-aba "Centros de Custo" ao lado de "Serviços Prestados" no `TabsList`.

## 2. Nova sub-aba "Empresa / Faturamento" em Cadastro Categorias

**Arquivo:** `src/components/equipe/CadastroCategorias.tsx`

Criar `EmpresaFaturamentoTab` com CRUD na tabela `empresas_faturamento` (nova). Campos: nome, CNPJ, centro_custo_id (FK para `centros_custo`). Ao selecionar empresa, o CC é preenchido automaticamente.

**Migração SQL:**
```sql
CREATE TABLE public.empresas_faturamento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  cnpj text,
  centro_custo_id uuid REFERENCES public.centros_custo(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.empresas_faturamento ENABLE ROW LEVEL SECURITY;
```

## 3. Correlação Cluster = Empresa na Estrutura Organizacional

**Arquivo:** `src/components/equipe/estrutura/EstruturaManager.tsx`

Atualmente um cluster tem `name` e `cost_center` (texto livre). Alterações:
- Adicionar `empresa_id` na tabela `estrutura_clusters` (FK para `empresas_faturamento`)
- Adicionar `cost_center_id` na tabela `estrutura_areas` (FK para `centros_custo`, opcional — pode herdar do cluster/empresa)
- No formulário de cluster, trocar campo de texto "Centro de Custo" por Select de empresas; ao selecionar empresa, o CC é preenchido automaticamente
- No formulário de área, adicionar Select opcional de centro de custo (independente do cluster)

**Migração SQL:**
```sql
ALTER TABLE public.estrutura_clusters ADD COLUMN empresa_id uuid REFERENCES public.empresas_faturamento(id);
ALTER TABLE public.estrutura_areas ADD COLUMN cost_center_id uuid REFERENCES public.centros_custo(id);
```

## 4. Quebra de texto no calendário de Sprint (Anexo 1)

**Arquivo:** `src/components/sprint/SprintCalendar.tsx` (linha 126)

O título usa `truncate` que força uma única linha. Mudar para `line-clamp-2` com `break-words` para permitir quebra automática:
```tsx
// Antes
<span className="text-[10px] leading-tight truncate">{d.title}</span>
// Depois
<span className="text-[10px] leading-tight line-clamp-2 break-words">{d.title}</span>
```

## 5. Área no cadastro de projeto usar `estrutura_areas` (Anexo 2)

**Arquivo:** `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

O dropdown de "Área" (linha 1002-1016) busca de `tax_areas`. Deve buscar de `estrutura_areas` (Cadastro Estrutura), que já contém as áreas organizacionais. Alterações:
- Trocar query `tax_areas` por `estrutura_areas` (linha 121-131)
- Ajustar FK: `tax_projects.area_id` referencia `tax_areas.id`. Será necessária migração para mudar a FK ou manter compatibilidade via campo adicional `estrutura_area_id`
- Opção mais segura: Adicionar `estrutura_area_id` na `tax_projects` e usar esse no dropdown, mantendo `area_id` legado

**Migração SQL:**
```sql
ALTER TABLE public.tax_projects ADD COLUMN estrutura_area_id uuid REFERENCES public.estrutura_areas(id);
```

Atualizar o formulário para usar `estrutura_area_id` e popular o dropdown com dados de `estrutura_areas`.

## 6. Reordenar campos do modal de Tarefa (Anexo 3)

**Arquivo:** `src/components/equipe/fiscal/tasks/TaskModal.tsx`

Ordem atual: Projeto → Cliente → Contribuinte → Categoria → Título → Descrição → Status/Prioridade...

Nova ordem (como projetos — cliente primeiro):
1. **Cliente** + **Projeto** (lado a lado, Cliente à esquerda)
2. **Contribuinte**
3. **Título**
4. **Descrição**
5. **Categoria**
6. Status + Prioridade
7. Horas estimadas
8. Responsável
9. Datas
10. Resto igual

Trocar a posição dos FormFields no JSX (linhas 357-411): mover `client_id` para o primeiro slot, `project_id` para o segundo.

## 7. Kanban cortando informações dos cards (Anexo 4)

**Arquivo:** `src/components/equipe/fiscal/tasks/TaskKanban.tsx`

Problemas identificados:
- Container da coluna usa `overflow-visible` mas o `ScrollArea` interno pode cortar
- Largura fixa `w-80` (320px) pode ser insuficiente
- Cards com `line-clamp-2` no título e `truncate` no projeto/contribuinte cortam texto

Correções:
- Remover `line-clamp-2` do título (linha 149) para mostrar título completo, ou aumentar para `line-clamp-3`
- Remover `truncate` do nome do projeto (linha 153) — usar `break-words` 
- Remover `truncate` do contribuinte (linha 162) — usar `line-clamp-2 break-words`
- Aumentar largura das colunas: `w-80` → `w-[340px]` ou `min-w-80`

---

## Resumo de arquivos impactados

| Arquivo | Alteração |
|---|---|
| **Migração SQL** | 2 tabelas novas (`centros_custo`, `empresas_faturamento`) + 2 ALTER TABLE |
| `src/components/equipe/CadastroCategorias.tsx` | 2 novas sub-abas (Centro de Custo, Empresa) |
| `src/components/equipe/estrutura/EstruturaManager.tsx` | Cluster → Empresa, Área → CC opcional |
| `src/components/sprint/SprintCalendar.tsx` | Quebra de texto no título |
| `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | Área → estrutura_areas |
| `src/components/equipe/fiscal/tasks/TaskModal.tsx` | Reordenar campos |
| `src/components/equipe/fiscal/tasks/TaskKanban.tsx` | Cards sem corte |

