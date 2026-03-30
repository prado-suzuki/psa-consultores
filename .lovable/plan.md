

## Plano: Conter markdown dentro do card no modal SOP

### Problema
O conteúdo markdown renderizado tem `max-w-none` e o grid de duas colunas não limita o overflow. O texto longo (tabelas, código, etc.) ultrapassa os limites da coluna e invade o lado oposto.

### Correção (`SOPViewerModal.tsx`)

1. **Linha 99**: No div do prose, trocar `max-w-none` por `overflow-hidden` para conter o conteúdo dentro da coluna.

2. **Linhas do grid (coluna wrapper)**: Adicionar `min-w-0 overflow-hidden` em cada coluna do grid (`<div className="space-y-2">`) para que o CSS contenha o conteúdo filho.

| Arquivo | Alteração |
|---------|-----------|
| `SOPViewerModal.tsx` | Adicionar `min-w-0 overflow-hidden` nas colunas do grid + trocar `max-w-none` por `overflow-hidden` no wrapper do prose |

