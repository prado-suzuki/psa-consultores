

## Plano: Trocar zona XML de azul para verde (variação do teal principal)

A cor principal do projeto é teal (`#0d9488` / Tailwind `teal-600`). Para diferenciar a zona XML sem repetir exatamente o mesmo tom, usarei **emerald** — um verde ligeiramente mais quente/claro que o teal.

### Arquivo: `src/pages/equipe/dev/CorrecoesSped.tsx`

Substituição global de classes de cor (find & replace):

| De (azul) | Para (emerald) |
|-----------|---------------|
| `text-blue-600/70` | `text-emerald-600/70` |
| `text-blue-400/70` | `text-emerald-400/70` |
| `border-blue-200` | `border-emerald-200` |
| `border-blue-800` | `border-emerald-800` |
| `bg-blue-50/60` | `bg-emerald-50/60` |
| `bg-blue-950/20` | `bg-emerald-950/20` |
| `bg-blue-50/20` | `bg-emerald-50/20` |
| `bg-blue-950/5` | `bg-emerald-950/5` |
| `hover:bg-blue-50` | `hover:bg-emerald-50` |
| `hover:bg-blue-950/30` | `hover:bg-emerald-950/30` |

Afeta ~31 ocorrências em:
- L218 (header grupo XML)
- L225-227 (headers das 3 colunas XML)
- L265, L269 (célula Descrição XML + badge)
- L287 (célula NCM XML)
- L299 (célula Valor XML)

Nenhuma outra alteração. Apenas troca de paleta de cores.

