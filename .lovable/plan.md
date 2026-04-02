

## Plan: Adicionar opção "Todas" no filtro de Situação

### Problema

O filtro de Situação usa um Popover com checkboxes individuais. Quando nenhuma está marcada, o texto exibe "Todas", mas não existe uma opção explícita "Todas" no dropdown para desmarcar tudo de uma vez — diferente do filtro de Exercício que tem `SelectItem value="__none__">Todos</SelectItem>`.

### Solução

Adicionar um item "Todas" no topo da lista de checkboxes no Popover. Ao clicar, limpa a seleção (`setSituacaoFilter([])`). Exibe check visual quando `situacaoFilter.length === 0`.

### Alteração em `src/pages/equipe/dev/ControlePerdcomp.tsx`

Antes do `.map(allSituacoes)` (linha 864), inserir:

```tsx
<label className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer text-sm font-medium">
  <Checkbox
    checked={situacaoFilter.length === 0}
    onCheckedChange={() => {
      setSituacaoFilter([]);
      setCurrentPage(1);
    }}
  />
  Todas
</label>
<Separator className="my-1" />
```

E nos checkboxes individuais existentes (linha 871), ao marcar uma opção individual, se todas forem selecionadas, resetar para `[]` (opcional — manter comportamento atual é suficiente).

**1 arquivo, ~8 linhas adicionadas.**

