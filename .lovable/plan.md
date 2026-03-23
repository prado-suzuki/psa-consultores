

## Plano: Corrigir scroll e ajustar campos CST

### Problemas identificados

1. **Scroll do mouse não funciona** na lista suspensa — o `Dialog` (Radix) captura eventos `wheel` e impede o scroll dentro do `PopoverContent`
2. **Campo CST PIS/COFINS** exibe código e descrição na trigger — deve mostrar apenas o número
3. **Descrição CST** deve permitir digitação livre além da seleção da lista

### Arquivo: `src/components/equipe/dev/pis-cofins/RegraFormSheet.tsx`

**1. Corrigir scroll do mouse**
- Adicionar `onWheelCapture={(e) => e.stopPropagation()}` no `PopoverContent` do `CstCombobox` para impedir que o Dialog consuma o evento de scroll

**2. Campo CST PIS/COFINS — exibir apenas código**
- No trigger do combobox em `mode="code"`, o `displayValue` já é o código. Na lista de itens, manter código + descrição para facilitar a busca — isso já está correto. Nenhuma mudança necessária no display do trigger.

**3. Descrição CST — permitir edição livre**
- Transformar o campo "Descrição CST" de Combobox para um componente híbrido: `Input` com dropdown de sugestões
- Usar um `Popover` que abre ao focar/digitar no `Input`
- O `Input` aceita texto livre e filtra a lista conforme digitação
- Ao selecionar um item da lista, preenche o input e sincroniza o código CST
- Se o usuário digitar um valor que não está na lista, o valor livre é aceito normalmente

### Alteração em 1 arquivo, sem mudança de schema.

