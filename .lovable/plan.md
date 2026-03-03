

# Converter Integrantes e Categorias para dropdown multi-select (Popover+Command)

## Problema

Os campos **Líder Geral**, **Sublíder**, **Membros do Projeto** e **Categorias** ainda são renderizados como tabelas/checkboxes inline sempre visíveis. O padrão esperado é dropdown colapsável com multi-select interno.

## Solução

Substituir as 4 seções por componentes `Popover + Command` (mesmo padrão já planejado anteriormente):

### Campos a converter (todos em `FiscalProjetosCadastro.tsx`):

1. **Líder Geral** (linhas ~1032-1086) — tabela com checkboxes → Popover+Command multi-select com badges emerald
2. **Sublíder** (linhas ~1088-1142) — tabela com checkboxes → Popover+Command multi-select com badges blue
3. **Membros do Projeto** (linhas ~1144-1210) — tabela com checkbox "select all" → Popover+Command multi-select com badges purple e botão "Selecionar todos"
4. **Categorias** (linhas ~1236-1262) — grid de checkboxes → Popover+Command multi-select com badges orange

### Padrão de cada dropdown:

- **Trigger**: `Button variant="outline"` mostrando badges dos selecionados ou placeholder
- **Content**: `Popover` → `Command` → `CommandInput` (busca) + `CommandList` com `CommandItem` clicáveis
- Ícone `Check` nos itens selecionados; toggle sem fechar o dropdown
- Contagem de selecionados no trigger quando muitos

### Arquivo impactado

| Arquivo | Alteração |
|---|---|
| `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | Substituir 4 blocos (Líder, Sublíder, Membros, Categorias) por Popover+Command dropdowns |

