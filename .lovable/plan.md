

## Plano: Ajustes visuais no filtro de contas + remoção da tabela resumo de Apuração

### 1. MultiSelectContas — remover hover verde (`MultiSelectContas.tsx`)

O `CommandItem` do shadcn aplica `hover:bg-accent` (que é verde neste tema). Adicionar classe para forçar hover branco/transparente nos itens do dropdown e no botão trigger.

Na `Button` (L48-52), adicionar `hover:bg-background` para manter fundo branco ao passar o mouse.

### 2. Remover primeira tabela da aba Apuração (`ApuracaoPisCofins.tsx`)

Remover a `<section>` das linhas ~604-663 que contém a tabela com "Valor Devido PIS", "Valor Devido COFINS" e "Total Devido". Manter as seções subsequentes (Apuração do Débito de PIS, COFINS, e Adições/Exclusões).

| Arquivo | Alteração |
|---------|-----------|
| `MultiSelectContas.tsx` | Adicionar `hover:bg-background` no Button trigger |
| `ApuracaoPisCofins.tsx` | Remover seção "Apuração" (L604-663) |

