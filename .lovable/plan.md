

## Plano: Mover TablePagination para diretório compartilhado + paginação no Mapa NCM

### 1. Mover arquivo

Mover `src/components/equipe/dev/auditoria/TablePagination.tsx` para `src/components/equipe/dev/TablePagination.tsx` (sem alterações no conteúdo).

### 2. Atualizar imports (3 arquivos)

| Arquivo | Import antigo | Import novo |
|---|---|---|
| `BalanceteEfdTab.tsx` | `'./TablePagination'` | `'@/components/equipe/dev/TablePagination'` |
| `EfdcIcmsTab.tsx` | `'./TablePagination'` | `'@/components/equipe/dev/TablePagination'` |
| `EfdcXmlTab.tsx` | `'./TablePagination'` | `'@/components/equipe/dev/TablePagination'` |

### 3. Paginação no `MapaNCMPisCofins.tsx`

- Importar `TablePagination` e `PAGE_SIZE` de `@/components/equipe/dev/TablePagination`
- Adicionar estado `currentPage` (reset para 0 quando `filtered` muda)
- Fatiar `filtered` com `.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)`
- Substituir rodapé de contagem pelo `<TablePagination>`

### 4. Remover arquivo antigo

Deletar `src/components/equipe/dev/auditoria/TablePagination.tsx`.

5 arquivos alterados (1 novo, 3 imports atualizados, 1 deletado).

