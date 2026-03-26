

## Plano: Mover ação do modal para coluna NCM (XML) e remover coluna Auditoria

### Alterações em `src/pages/equipe/dev/CorrecoesSped.tsx`

**1. Remover coluna Auditoria**

- L242: deletar `<TableHead ...>Auditoria</TableHead>`
- L292-299: deletar o `<TableCell>` inteiro com o botão + relacaoBadge

**2. Remover função `relacaoBadge`** (L22-32) — único uso era na célula removida.

**3. Ajustar lógica do `const xml`** (L247)

Hoje só extrai XML para `1:1`. Manter essa variável para dados, mas a célula NCM (XML) agora também trata CONSOLIDADO:

```tsx
const xml = item.tipo_relacao === '1:1' && item.nfe_itens[0] ? item.nfe_itens[0] : null;
```
Sem mudança nesta linha.

**4. Refatorar TableCell NCM (XML)** (L274-281)

De:
```tsx
<TableCell className="py-1.5 bg-blue-50/20 dark:bg-blue-900/5">
  {xml ? (
    <code className={`text-xs font-mono ${ncmDivergent ? 'text-red-600' : ''}`}>
      {ncmDivergent && <AlertCircle ... />}
      {xml.ncm}
    </code>
  ) : <span ...>—</span>}
</TableCell>
```

Para:
```tsx
<TableCell className="py-1.5 bg-blue-50/20 dark:bg-blue-900/5">
  {xml ? (
    <button
      onClick={() => setSelectedItem(item)}
      className="cursor-pointer hover:underline text-left"
    >
      <code className={`text-xs font-mono ${ncmDivergent ? 'text-red-600' : ''}`}>
        {ncmDivergent && <AlertCircle className="h-3 w-3 inline mr-0.5 -mt-0.5" />}
        {xml.ncm}
      </code>
    </button>
  ) : item.tipo_relacao === 'CONSOLIDADO' ? (
    <button
      onClick={() => setSelectedItem(item)}
      className="cursor-pointer hover:opacity-80"
    >
      <Badge className="text-[10px] bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100">
        Consolidado
      </Badge>
    </button>
  ) : (
    <span className="text-xs text-muted-foreground italic">—</span>
  )}
</TableCell>
```

**5. Colunas Descrição (XML) e Valor (XML)** — sem mudança. Já renderizam `—` quando `xml` é null (cobre CONSOLIDADO e SEM_NFE).

### Resumo

| Ação | Linhas |
|------|--------|
| Deletar | `relacaoBadge` (L22-32) |
| Deletar | TableHead "Auditoria" (L242) |
| Deletar | TableCell Auditoria (L292-299) |
| Refatorar | TableCell NCM (XML) (L274-281) — 3 estados: 1:1 clicável, CONSOLIDADO badge clicável, SEM_NFE traço |

Apenas `src/pages/equipe/dev/CorrecoesSped.tsx` será editado.

