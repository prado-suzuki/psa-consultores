

## Correções: Conta visível, formatação de draft e prioridade de descrição

### Arquivos alterados: 2
- `src/components/equipe/dev/correcoes-sped/TabC170.tsx`
- `src/components/equipe/dev/correcoes-sped/TabA170.tsx`

---

### 1. Coluna "Conta" — garantir visibilidade

A coluna Conta existe no código (C170 linha 423/514, A170 linha 445/486), mas pode estar oculta atrás da coluna sticky de Ações. Correção:

- Adicionar `pr-[100px]` (padding-right) na `<TableCell>` da Conta (última célula antes de Ações) para criar espaço entre o conteúdo e a coluna sticky sobreposta.
- Alternativamente, adicionar `border-r` sutil na célula Conta para separar visualmente da coluna sticky.

**C170** — linha 514: adicionar classe `pr-[100px]`.
**A170** — linha 486: adicionar classe `pr-[100px]`.

---

### 2. Formatação brasileira no `toDraft`

Campos monetários e de alíquota devem exibir vírgula como separador decimal ao entrar em edição.

**C170** — linhas 62-72, alterar:
```
VL_ITEM: item.VL_ITEM != null ? Number(item.VL_ITEM).toFixed(2).replace('.', ',') : '0,00',
CST_PIS: item.CST_PIS != null ? String(item.CST_PIS) : '',
ALIQ_PIS: item.ALIQ_PIS != null ? Number(item.ALIQ_PIS).toFixed(2).replace('.', ',') : '0,00',
VL_PIS: item.VL_PIS != null ? Number(item.VL_PIS).toFixed(2).replace('.', ',') : '0,00',
CST_COFINS: item.CST_COFINS != null ? String(item.CST_COFINS) : '',
ALIQ_COFINS: item.ALIQ_COFINS != null ? Number(item.ALIQ_COFINS).toFixed(2).replace('.', ',') : '0,00',
VL_COFINS: item.VL_COFINS != null ? Number(item.VL_COFINS).toFixed(2).replace('.', ',') : '0,00',
```

**A170** — linhas 69-83, mesma lógica para todos os campos numéricos (VL_ITEM, VL_BC_PIS, ALIQ_PIS, VL_PIS, VL_BC_COFINS, ALIQ_COFINS, VL_COFINS). CST_PIS e CST_COFINS como `String()` sem formatação decimal.

---

### 3. Prioridade da descrição editada

**C170** — linha 332: trocar `{item.DESCR_ITEM_0200 || item.DESCR_COMPL || '\u2014'}` para `{item.DESCR_COMPL || item.DESCR_ITEM_0200 || '\u2014'}`. Mesma inversão no `title` da linha 331.

**A170** — já está correto (linha 362 prioriza `item.DESCR_COMPL`). Sem alteração.

---

### Resumo
| Correção | C170 | A170 |
|----------|------|------|
| Conta visível (padding) | Linha 514 | Linha 486 |
| toDraft formatado | Linhas 62-72 | Linhas 69-83 |
| Descrição prioriza edição | Linha 331-332 | Já correto |

**Total: 2 arquivos, ~20 linhas alteradas. Zero lógica de negócio removida.**

