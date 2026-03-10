

## Plano: Adicionar `cluster_id` em `produto_segmento` e filtro por empresa na aba OS

### Etapa 1 — Migration

```sql
ALTER TABLE public.produto_segmento
ADD COLUMN cluster_id uuid REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;
```

### Etapa 2 — Data update (insert tool)

```sql
UPDATE public.produto_segmento SET cluster_id = 'b21b0b89-f6fb-4f61-bfbe-cd93372f7ee3'
WHERE codigo IN ('PTR', 'ACF', 'RRT', 'RTJ', 'DTB', 'EDP', 'RSC', 'REA', 'ADJ');
```

Demais produtos ficam com `NULL`.

### Etapa 3 — Frontend (`NewClientModal.tsx`)

**3a. Buscar clusters para o Select:**
- Nova query `estrutura_clusters` buscando `id, name` ordenado por `name`

**3b. Adicionar Select "Empresa/Cluster" na aba OS:**
- Posicionar **acima** do bloco "Serviços Contratados" (tanto no formulário de draft quanto no de edição inline)
- Opções: clusters carregados + fallback "Todos"
- Estado: novo campo no `draftContract` e `editingContractData` → algo como `cluster_filter` (apenas UI, não persiste no banco)

**3c. Filtrar `catalogServices` pelo cluster selecionado:**
- Quando um cluster é selecionado, filtrar `catalogServices` por `cluster_id === selectedCluster`
- Se nenhum selecionado, mostrar todos (comportamento atual)
- Aplicar filtro nos 3 locais que renderizam o Select de serviços:
  1. Formulário de nova OS (~linha 3786)
  2. Edição inline de OS existente (~linha 3403)
  3. Exibição de badges de serviços (sem alteração — badges mostram o que foi salvo)

**3d. NÃO limpar serviços ao trocar cluster:**
- O filtro afeta apenas as opções disponíveis no dropdown, não remove seleções existentes

### O que NÃO será feito
- Nenhuma alteração de RLS
- Nenhuma alteração em outras tabelas
- O campo `cluster_filter` é apenas estado de UI — não é salvo no banco

