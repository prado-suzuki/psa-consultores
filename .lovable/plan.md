

## Plano: Cabeçalhos em negrito em todas as tabelas

### Problema
O componente base `TableHead` (em `src/components/ui/table.tsx`) aplica `font-medium` por padrão. Mesmo com `font-bold` no `DynamicTableHeader`, pode haver conflito de especificidade no Tailwind onde ambas as classes coexistem.

### Correção

**Arquivo: `src/components/ui/table.tsx`**
- Linha 49: trocar `font-medium` por `font-bold` na classe base do `TableHead`

Isso garante que todos os `<th>` de todas as tabelas da aplicação sejam bold por padrão, sem necessidade de override individual.

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ui/table.tsx` | `font-medium` → `font-bold` no `TableHead` |

