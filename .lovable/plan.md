

## Plano: Forçar negrito nos cabeçalhos das tabelas

### Diagnóstico
O código já tem `font-bold` nas classes, mas visualmente o negrito não aparece. Isso pode ser um problema de especificidade CSS onde o Tailwind gera `font-medium` depois de `font-bold` no CSS final, fazendo com que `font-medium` vença pelo cascade. O `twMerge` no `cn()` deveria resolver, mas quando ambos vêm da mesma definição de classe (base + override), pode haver conflito.

### Correção

Usar `font-bold` com o modificador `!important` do Tailwind (`!font-bold`) nos dois arquivos para garantir que nenhuma outra regra CSS o sobrescreva.

**1. `DynamicTableHeader.tsx`** — Trocar `font-bold` por `!font-bold` em todos os `TableHead`:
- Sticky headers (L31)
- Expanded year headers (L43)
- Collapsed year headers (L50)
- Total header (L58)
- Bottom row headers (L63)

**2. `ApuracaoDataTable.tsx`** — Trocar `font-bold` por `!font-bold` nos headers da linha de totais:
- Total cell (L183)
- Sticky total cells implicitamente via classe

**3. `table.tsx`** — Trocar `font-bold` por `!font-bold` no componente base `TableHead` (L49) para afetar todas as tabelas globalmente.

| Arquivo | Alteração |
|---------|-----------|
| `src/components/ui/table.tsx` | `font-bold` → `!font-bold` no `TableHead` |
| `src/components/equipe/dev/pis-cofins/DynamicTableHeader.tsx` | `font-bold` → `!font-bold` em todos os `TableHead` |

