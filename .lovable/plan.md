

## Plano: Corrigir opacidade das colunas congeladas (sticky)

### Problema
As colunas sticky usam `bg-card` e os headers sticky usam `bg-muted/50` — ambas permitem que o conteúdo rolado apareça por baixo como "fantasma", dificultando a leitura.

### Correção

**Arquivo: `ApuracaoDataTable.tsx`**
- Linha 81: trocar `bg-card` por `bg-background` nas células sticky do body (função `stickyCell`)
- Linha 174: trocar `bg-muted/50` por `bg-muted` na linha de totais sticky

**Arquivo: `DynamicTableHeader.tsx`**
- Headers sticky: trocar `bg-muted/50` por `bg-muted` (opacidade total) nas `TableHead` sticky
- Manter as cores diferenciadas dos anos expandidos/colapsados

Todas as mudanças garantem que as colunas congeladas tenham fundo 100% opaco, bloqueando completamente a visualização do conteúdo que passa por baixo.

| Arquivo | Alteração |
|---------|-----------|
| `ApuracaoDataTable.tsx` | `bg-card` → `bg-background`, `bg-muted/50` → `bg-muted` nas sticky cells |
| `DynamicTableHeader.tsx` | `bg-muted/50` → `bg-muted` nos headers sticky |

