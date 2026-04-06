

## Correções de layout, estado e destaque visual nas tabelas editáveis

### Arquivos alterados: 2
- `src/components/equipe/dev/correcoes-sped/TabC170.tsx`
- `src/components/equipe/dev/correcoes-sped/TabA170.tsx`

---

### 1. Largura fixa e layout vertical na coluna Ações

**Ambos os arquivos:**

- No `<TableHead>` de Ações, adicionar `w-[90px] min-w-[90px] max-w-[90px]`.
- Na `<TableCell>` de Ações, trocar o container de `flex items-center justify-center gap-1` para `flex flex-col items-center justify-center gap-1`. O Badge "Corrigido" ficará abaixo dos botões em vez de ao lado, evitando que alargue a coluna.

**C170** — linha 406 (TableHead) e linha 500-541 (TableCell).
**A170** — linha 436 (TableHead) e linha 496-537 (TableCell).

### 2. Destaque visual dos campos editados (amber)

**Ambos os arquivos — `renderEditableCell`:**

Quando `editingId !== item.uuid` (modo visualização), após determinar o valor a exibir, verificar se `item._originalSnapshot` existe e se `item[field]` difere de `item._originalSnapshot[field]` (usando `!Object.is()`). Se diferir, envolver o valor retornado com classe `text-amber-600 font-bold dark:text-amber-500`.

Implementação: adicionar uma variável `isChanged` no início do branch de visualização e aplicar condicionalmente via wrapper `<span>`.

**C170** — linhas 309-329.
**A170** — linhas 329-362.

### 3. Inputs numéricos: `type="text"` em vez de `type="number"`

**Ambos os arquivos — chamadas de `renderEditableCell` no TableBody:**

Remover `type: 'number'` e `step: '...'` de todas as chamadas de campos numéricos (VL_ITEM, CST_PIS, ALIQ_PIS, VL_PIS, CST_COFINS, ALIQ_COFINS, VL_COFINS, VL_BC_PIS, VL_BC_COFINS). Isso evita que o input nativo de number rejeite vírgulas ou formate valores inesperadamente. A validação numérica já é feita no `handleSave` com `Number(rawValue.replace(',', '.'))`.

**C170** — linhas 437, 479, 482, 485, 488, 491, 494.
**A170** — linhas 452, 472, 475, 478, 481, 484, 487, 490, 493.

### 4. Proteção do estado local contra refetch do React Query

**Ambos os arquivos — `useEffect` que faz `setRows(data ?? [])`:**

Alterar a lógica para só sobrescrever `rows` quando não há edição em andamento (`editingId === null`) E não há linhas corrigidas localmente. Adicionar um `useRef<Set<string>>` chamado `locallyEditedIds` que é populado no `handleSave` com sucesso e limpo quando `data` muda com novos UUIDs (indicando nova query real).

Lógica simplificada:
```
const locallyEditedIds = useRef<Set<string>>(new Set());

useEffect(() => {
  if (!data) return;
  if (editingId) return; // não sobrescrever durante edição

  if (locallyEditedIds.current.size === 0) {
    setRows(data);
    return;
  }

  // Merge: manter rows locais para IDs editados, usar data para o resto
  setRows(data.map(d => {
    if (locallyEditedIds.current.has(d.uuid)) {
      const local = rows.find(r => r.uuid === d.uuid);
      return local ?? d;
    }
    return d;
  }));
}, [data]);
```

No `handleSave`, após sucesso: `locallyEditedIds.current.add(item.uuid)`.

**C170** — linhas 136-138.
**A170** — linhas 145-147.

---

### Resumo
| Item | Descrição |
|------|-----------|
| Coluna Ações | `w-[90px]` fixo + layout `flex-col` para Badge abaixo dos botões |
| Campos editados | Amber bold quando valor difere do `_originalSnapshot` |
| Inputs numéricos | `type="text"` em todas as chamadas para evitar conflito com vírgulas |
| Estado local | `useRef<Set>` de IDs editados + merge inteligente no `useEffect` |

**Total: 2 arquivos, ~40 linhas alteradas/adicionadas. Zero lógica de negócio removida.**

