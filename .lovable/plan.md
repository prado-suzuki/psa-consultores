

## Plano: Adicionar `cluster_id` em `produto_segmento`

### Etapa 1 — Migration SQL

```sql
ALTER TABLE public.produto_segmento
  ADD COLUMN cluster_id UUID REFERENCES public.estrutura_clusters(id) ON DELETE SET NULL;

UPDATE public.produto_segmento
SET cluster_id = (SELECT id FROM public.estrutura_clusters WHERE name = 'PSA Consultores' LIMIT 1);
```

### Etapa 2 — Hook `useCategorias.ts`

**Tipo `ProdutoSegmento`** — adicionar `cluster_id: string | null` e `estrutura_clusters: { name: string } | null`.

**`useProdutoSegmentoList`** — alterar select para `'id, codigo, nome, is_active, cluster_id, estrutura_clusters(name)'`.

**`useProdutoSegmentoSave`** — adicionar parâmetro `clusterId: string | null` na função `save`, incluir `cluster_id: clusterId || null` no payload.

### Etapa 3 — Componente `ProdutoSegmentoTab.tsx`

Seguir o padrão exato de `ServicosTab.tsx`:

**Tabela** — adicionar coluna "Cluster" entre "Nome" e "Status", renderizando `Badge` com `item.estrutura_clusters?.name` (ou "—" se vazio). Atualizar `colSpan` de 4 para 5.

**Dialog de criação/edição** — adicionar estado `clusterId`, campo `Select` com opções de `useEstruturaClusters()` (incluindo "Nenhum"), passar `clusterId` no `handleSave`. Preencher `clusterId` no `openEdit`.

### Arquivos afetados

| Arquivo | Alteração |
|---|---|
| Migration SQL | ADD COLUMN + UPDATE 18 registros |
| `src/hooks/useCategorias.ts` | Tipo, select com join, save com cluster_id |
| `src/components/equipe/ProdutoSegmentoTab.tsx` | Coluna cluster na tabela + select no dialog |

