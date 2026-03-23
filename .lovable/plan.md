

## Plano: Corrigir exibição do CST e filtro da Descrição

### Arquivo: `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx`

**Problema 1 — CST PIS/COFINS mostrando descrição**
O `CstCombobox` no `mode="code"` exibe `displayValue = value`, que deveria ser só o código. O problema pode estar no cmdk: o `CommandItem` sem prop `value` explícita usa o textContent (código + descrição) e pode sobrescrever o valor. Correção: adicionar `value={opt.code}` explícito em cada `CommandItem` do CstCombobox.

**Problema 2 — Descrição CST mostrando apenas 2 itens**
O filtro na linha 331-334 usa `field.value` (texto completo da descrição atual) como query de busca. Se o campo já tem "Operação Tributável com Alíquota Básica", só aparecem itens que contenham essa string inteira. Correção: não filtrar quando o popover acabou de abrir; filtrar apenas pelo texto digitado incrementalmente. Usar um estado `descSearch` separado que é resetado ao abrir o popover e atualizado conforme o usuário digita.

### Mudanças concretas

1. **CstCombobox** — adicionar `value={opt.code}` no `CommandItem` para evitar que cmdk use o textContent como valor interno

2. **Campo Descrição CST** — trocar a lógica de filtro:
   - Novo estado `descSearch` (string) resetado para `''` ao abrir
   - O `Input` atualiza tanto `field.value` quanto `descSearch`
   - O filtro usa `descSearch` em vez de `field.value`
   - Resultado: ao abrir, todos os 30 itens aparecem; conforme digita, filtra normalmente

1 arquivo, alteração pontual em ~15 linhas.

