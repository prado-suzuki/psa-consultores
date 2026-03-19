

## Plano: Extrair 3 tabs inline para arquivos separados

### Objetivo
Mover `ProdutoSegmentoTab`, `ServicosTab` e `CentroCustoTab` de `CadastroCategorias.tsx` para arquivos próprios. Zero alteração de comportamento ou visual.

### Arquivos

| Arquivo | Ação |
|---|---|
| `src/components/equipe/ProdutoSegmentoTab.tsx` | **Criar** — copiar função `ProdutoSegmentoTab` sem alterações |
| `src/components/equipe/ServicosTab.tsx` | **Criar** — copiar função `ServicosTab` sem alterações |
| `src/components/equipe/CentroCustoTab.tsx` | **Criar** — copiar função `CentroCustoTab` sem alterações |
| `src/components/equipe/CadastroCategorias.tsx` | **Editar** — remover as 3 funções inline, adicionar 3 imports |

### Detalhes

**Cada novo arquivo** recebe:
- Os imports necessários (useState, componentes UI, hooks de `useCategorias`, tipos, ícones)
- A função da tab como `export default`
- Nenhuma modificação no corpo da função

**CadastroCategorias.tsx** fica apenas com:
- 4 imports de tabs (`ProdutoSegmentoTab`, `ServicosTab`, `CentroCustoTab`, `ProdutoServicoTab`)
- Imports de `Card`, `Tabs` e componentes de layout
- Estrutura de `Tabs` com 4 `TabsTrigger` + 4 `TabsContent`
- Sem nenhum `useState`, `useQuery`, `Dialog`, `AlertDialog` ou lógica de CRUD

### Garantias
- Hooks permanecem em `useCategorias.ts`
- Zero alteração de comportamento, visual ou lógica
- Mesmo padrão já usado por `ProdutoServicoTab.tsx`

