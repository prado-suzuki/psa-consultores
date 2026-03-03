

# Corrigir Líder Geral e Sublíder para dropdown multi-select

## Problema

Os campos "Líder Geral" e "Sublíder" ainda estão renderizados como tabelas inline com checkboxes (sempre visíveis). O plano anterior de usar `Popover + Command` (dropdown colapsável) não foi aplicado.

## Alteração em `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`

### 1. Adicionar imports

Adicionar `ChevronsUpDown, Check` do lucide-react, e importar `Popover, PopoverTrigger, PopoverContent` e `Command, CommandInput, CommandList, CommandItem, CommandEmpty`.

### 2. Substituir tabelas por dropdowns (linhas ~1032-1142)

Trocar as duas tabelas de checkboxes por componentes `Popover + Command`:

- **Trigger**: botão `variant="outline"` mostrando badges dos selecionados ou placeholder
- **Content**: `Command` com `CommandInput` para busca e `CommandList` com items clicáveis
- Clicar em um item alterna seleção (toggle) sem fechar o dropdown
- Ícone `Check` visível nos itens selecionados

Mesmo padrão para ambos os campos (Líder Geral com `lideres`/`leader_ids`, Sublíder com `sublideres`/`sublider_ids`).

## Arquivo impactado

| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | Imports + substituir tabelas por Popover+Command dropdown |

