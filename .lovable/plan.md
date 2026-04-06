

## Correção da coluna "Conta" vs sticky "Ações" — TabC170.tsx

### Arquivo alterado: 1
`src/components/equipe/dev/correcoes-sped/TabC170.tsx`

---

### 1. Remover hack `pr-[100px]` da célula Conta (linha 514)
- Remover `pr-[100px]` da classe da `<TableCell>` que renderiza `COD_CTA`.

### 2. Forçar largura fixa na coluna Conta
- **TableHead** (linha 423): adicionar `min-w-[110px] max-w-[110px]` às classes existentes.
- **TableCell** (linha 514): adicionar `min-w-[110px] max-w-[110px]` às classes existentes.

### 3. Borda e sombra na coluna sticky Ações
- **TableHead** (linha 424): adicionar `border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]`.
- **TableCell** (linha 518): adicionar `border-l border-slate-200 dark:border-slate-700 shadow-[-4px_0_10px_rgba(0,0,0,0.02)]`.

---

### Resumo
| Local | Alteração |
|-------|-----------|
| Linha 423 (TableHead Conta) | `+min-w-[110px] max-w-[110px]` |
| Linha 514 (TableCell Conta) | `-pr-[100px]`, `+min-w-[110px] max-w-[110px]` |
| Linha 424 (TableHead Ações) | `+border-l shadow` |
| Linha 518 (TableCell Ações) | `+border-l shadow` |

**Total: 1 arquivo, 4 linhas editadas.**

