

## Melhoria UX da Edição Inline — Ações à direita + Destaque de linha

### Arquivos alterados: 2

---

### 1. `TabC170.tsx`

**Super cabeçalhos (linha 386-390):** Ajustar colSpans — "Dados EFD" passa de `colSpan={4}` para `colSpan={3}` (remove Ações do grupo). Adicionar novo `<TableHead colSpan={1}>` vazio à direita de "Impostos" para a coluna Ações.

**Cabeçalho secundário (linhas 391-406):** Remover `<TableHead>Ações</TableHead>` da posição atual (linha 395, entre Valor e Descrição XML). Adicionar `<TableHead className="text-[11px] text-center min-w-[100px] sticky right-0 bg-background">Ações</TableHead>` como última coluna, após "Conta".

**TableBody (linhas 416-541):**
- Mover a `<TableCell>` de Ações (linhas 438-480) para depois da última célula (COD_CTA, linha 539). Adicionar `sticky right-0 bg-background` para fixar a coluna durante scroll horizontal.
- No `<TableRow>` (linha 417), adicionar condicional: `className={editingId === item.uuid ? "bg-accent/30" : "group"}`.

**`renderEditableCell` (função existente):** Nos inputs, trocar a className do `<Input>` para incluir `bg-background border-primary/20 focus-visible:ring-primary/40`.

### 2. `TabA170.tsx`

**Super cabeçalhos (linhas 417-419):** "Dados EFD" passa de `colSpan={6}` para `colSpan={5}`. Adicionar `<TableHead colSpan={1}>` vazio após "Impostos".

**Cabeçalho secundário (linhas 421-436):** Remover `<TableHead>Ações</TableHead>` (linha 427). Adicionar como última coluna após "VL COF" (linha 435).

**TableBody (linhas 438-537):**
- Mover a `<TableCell>` de Ações (linhas 470-511) para depois de VL_COFINS (linha 534).
- No `<TableRow>` (linha 443): `className={editingId === item.uuid ? "bg-accent/30" : "group"}`.

**`renderEditableCell`:** Mesma alteração de estilo do Input: `bg-background border-primary/20 focus-visible:ring-primary/40`.

---

### Resumo
- Coluna Ações → última coluna (sticky right) em ambas as tabelas
- Linha em edição → `bg-accent/30`
- Inputs de edição → `bg-background border-primary/20 focus-visible:ring-primary/40`
- Zero alteração de lógica de estado ou salvamento

**Total: 2 arquivos, ~30 linhas reposicionadas/editadas.**

