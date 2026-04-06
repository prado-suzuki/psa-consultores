

## Refinamentos de edição inline — TabC170.tsx

### Arquivo alterado: 1
`src/components/equipe/dev/correcoes-sped/TabC170.tsx`

---

### 1. Aumentar largura da coluna "Conta"

- **TableHead** (linha 423): `min-w-[110px] max-w-[110px]` → `min-w-[150px] max-w-[150px]`
- **TableCell** (linha 514): `min-w-[110px] max-w-[110px]` → `min-w-[150px] max-w-[150px]`

### 2. Expandir assinatura de `renderEditableCell`

Linha 320-324 — adicionar parâmetro `options` com tipagem inline:

```tsx
const renderEditableCell = (
  item: C170Item,
  field: EditableC170Field,
  className: string,
  options?: { isCurrency?: boolean; isPercentage?: boolean },
) => {
```

### 3. Prefixo "R$" e limite de porcentagem no Input

Linhas 350-357 — substituir o retorno do `<Input>` por:

```tsx
const input = (
  <Input
    type="text"
    value={draft[field]}
    onChange={(event) => {
      let val = event.target.value;
      if (options?.isPercentage) {
        const num = Number(val.replace(',', '.'));
        if (!isNaN(num) && num > 100) val = '100';
      }
      handleDraftChange(field, val);
    }}
    className={`${className} bg-background border-primary/20 focus-visible:ring-primary/40 ${options?.isCurrency ? 'pl-7' : ''}`}
  />
);

if (options?.isCurrency) {
  return (
    <div className="relative flex items-center w-full">
      <span className="absolute left-2 text-xs font-medium text-muted-foreground pointer-events-none">R$</span>
      {input}
    </div>
  );
}

return input;
```

### 4. Atualizar chamadas no TableBody

| Campo | Linha | Alteração |
|-------|-------|-----------|
| VL_ITEM | 455 | Adicionar `{ isCurrency: true }` como 4º arg |
| ALIQ_PIS | 500 | Adicionar `{ isPercentage: true }` |
| VL_PIS | 503 | Adicionar `{ isCurrency: true }` |
| ALIQ_COFINS | 509 | Adicionar `{ isPercentage: true }` |
| VL_COFINS | 512 | Adicionar `{ isCurrency: true }` |

Exemplo:
```tsx
{renderEditableCell(item, 'VL_ITEM', 'h-8 text-xs text-right font-mono', { isCurrency: true })}
{renderEditableCell(item, 'ALIQ_PIS', 'h-8 text-xs text-right font-mono', { isPercentage: true })}
```

---

### Resumo

| Item | Descrição |
|------|-----------|
| Coluna Conta | `min/max-w` de 110→150px |
| Assinatura | `options?: { isCurrency, isPercentage }` |
| Prefixo R$ | Wrapper relativo + `<span>` absoluto + `pl-7` no Input |
| Limite % | Clamp a 100 no `onChange` antes do `handleDraftChange` |
| Chamadas | 5 chamadas atualizadas com flags corretas |

**Total: 1 arquivo, ~25 linhas alteradas/adicionadas.**

