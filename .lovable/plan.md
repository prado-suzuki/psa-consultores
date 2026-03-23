

## Plano: Alinhar filtros e botões na ApuracaoPisCofins

### Arquivo: `src/pages/equipe/dev/ApuracaoPisCofins.tsx`

**Problema**: Os 3 filtros da Row 1 têm alturas inconsistentes (labels com/sem `flex items-center`). Na Row 2, os botões usam `size="sm"` (h-9) enquanto os date pickers provavelmente são h-10, causando desalinhamento vertical.

### Mudanças

**Row 1 (linhas 172-222)**: Uniformizar todas as labels com a mesma classe (`text-xs uppercase tracking-wider text-muted-foreground font-semibold`), removendo `flex items-center` das que têm e garantindo que o `RequiredMark` seja inline sem alterar a altura. Adicionar `items-end` no grid para alinhar os selects pela base.

**Row 2 (linhas 225-263)**:
- Trocar `size="sm"` por `size="default"` nos dois botões (h-9 → h-10), igualando a altura dos date pickers
- Remover os ícones pequenos (h-3.5 → h-4) para acompanhar a proporção
- Manter `items-end` no flex para alinhamento pela base

1 arquivo, ~10 linhas ajustadas.

