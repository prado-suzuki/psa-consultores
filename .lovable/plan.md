

## Análise: Select de Centro de Custo não atualiza na OS

### Problemas identificados

**1. Closure stale no `onValueChange`**

Em todas as ocorrências (linhas ~3917-3920 e ~3536-3545), o `onValueChange` faz:
```js
setDraftContract({ ...draftContract, distribuicao_receita: updated });
```
O `draftContract` capturado no closure pode estar desatualizado. Quando o usuário seleciona um centro de custo, o spread usa o estado antigo, potencialmente descartando a mudança. O correto é usar a forma funcional:
```js
setDraftContract(prev => ({ ...prev, distribuicao_receita: updated }));
```
Esse mesmo problema existe no `onClick` de "Adicionar Centro de Custo" (linha ~3899) e no `onChange` do percentual (linha ~3947).

**2. "CC-0001 - PRADO SUZUKI: 0%" como padrão**

Quando `id_centro_custo` é `""`, o `value` do Select é `"__none__"` — porém, o Radix Select pode exibir o primeiro item visível se o `"__none__"` SelectItem não renderizar corretamente como "selecionado". O comportamento visual é que parece que CC-0001 já está selecionado.

**3. Console warning: missing unique key**

O erro "Each child in a list should have a unique key" vem do `NewClientModal` — provavelmente de algum `.map` sem `key` ou com key duplicado, o que pode causar re-renders inesperados e contribuir para o estado não atualizar.

### Plano de correção

**Arquivo: `src/components/equipe/dev/NewClientModal.tsx`**

1. **Converter todos os `setDraftContract` dentro de callbacks para forma funcional** (`prev => ...`):
   - Linha ~3899 (adicionar centro de custo)
   - Linha ~3919-3920 (onValueChange do Select)
   - Linha ~3947 (onChange do percentual)
   - Linha ~3960 (remover centro de custo)
   - Repetir para o bloco de edição inline (~3537-3545, ~3567-3570)

2. **Garantir que o value do Select nunca fique em estado inconsistente**: se `id_centro_custo` for vazio, exibir o placeholder corretamente. Considerar não usar `"__none__"` como valor e sim `undefined` + `placeholder` no SelectValue.

3. **Corrigir o warning de unique key**: identificar o `.map` sem key adequado (provavelmente na renderização de distribuicao_receita ou outro array) e adicionar keys únicos.

