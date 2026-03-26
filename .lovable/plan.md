

## Plano: Tabela comparativa EFD vs XML em CorrecoesSped.tsx

### Alteracoes na tabela (L228-290)

**Header — remover Chave NFe, adicionar 3 colunas XML:**

```text
ANTES (L229-243):
  <TableRow>
    <TableHead ...>Chave NFe</TableHead>
    <TableHead ...>Descrição EFD</TableHead>
    <TableHead ...>NCM</TableHead>
    <TableHead ...>Valor EFD</TableHead>
    ... (CST PIS, % PIS, VL PIS, CST COF, % COF, VL COF, Conta, Auditoria)
  </TableRow>

DEPOIS:
  <TableRow>
    <TableHead className="text-[11px] min-w-[200px]">Descrição (EFD)</TableHead>
    <TableHead className="text-[11px] min-w-[100px]">NCM (EFD)</TableHead>
    <TableHead className="text-[11px] text-right min-w-[110px]">Valor (EFD)</TableHead>
    {/* --- Separador visual: colunas XML --- */}
    <TableHead className="text-[11px] min-w-[200px] border-l border-dashed border-border bg-blue-50/50 dark:bg-blue-900/10">Descrição (XML)</TableHead>
    <TableHead className="text-[11px] min-w-[100px] bg-blue-50/50 dark:bg-blue-900/10">NCM (XML)</TableHead>
    <TableHead className="text-[11px] text-right min-w-[110px] bg-blue-50/50 dark:bg-blue-900/10">Valor (XML)</TableHead>
    ... (CST PIS, % PIS, VL PIS, CST COF, % COF, VL COF, Conta, Auditoria — sem mudanca)
  </TableRow>
```

**Body — remover celula Chave NFe, adicionar 3 celulas XML:**

```text
ANTES (L248-253): celula com formatChaveNfe(item.chv_nfe) — REMOVER

ADICIONAR apos celula Valor EFD (L269-271):
  const xml = item.tipo_relacao === '1:1' && item.nfe_itens[0] ? item.nfe_itens[0] : null;

  {/* Descricao XML */}
  <TableCell className="text-xs py-1.5 max-w-[200px] truncate border-l border-dashed border-border bg-blue-50/20 dark:bg-blue-900/5" title={xml?.xProd}>
    {xml ? xml.xProd : <span className="text-xs text-muted-foreground italic">—</span>}
  </TableCell>
  {/* NCM XML */}
  <TableCell className="py-1.5 bg-blue-50/20 dark:bg-blue-900/5">
    {xml ? <code className="text-xs font-mono">{xml.ncm}</code> : <span className="text-xs text-muted-foreground italic">—</span>}
  </TableCell>
  {/* Valor XML */}
  <TableCell className="text-xs text-right py-1.5 font-mono tabular-nums bg-blue-50/20 dark:bg-blue-900/5">
    {xml ? formatCurrency(xml.vProd) : <span className="text-xs text-muted-foreground italic">—</span>}
  </TableCell>
```

### Sugestoes adicionais

1. **Indicador de divergencia NCM**: quando `xml && item.cod_ncm && item.cod_ncm !== xml.ncm`, colorir a celula NCM (XML) com `text-red-600` e adicionar um pequeno icone `AlertCircle` inline — destaque visual imediato de inconsistencia sem precisar abrir o modal.

2. **Indicador de divergencia Valor**: quando `xml && Math.abs(item.vl_item - xml.vProd) > 0.01`, aplicar `text-amber-600` no valor XML para sinalizar diferenca de valores.

3. **Renomear headers EFD**: mudar "Descricao EFD" e "NCM" para "Descricao (EFD)" e "NCM (EFD)" para simetria com as colunas XML.

### Resumo

| Acao | Local |
|------|-------|
| Remover | TableHead + TableCell "Chave NFe" |
| Renomear | Headers EFD para incluir "(EFD)" |
| Adicionar | 3 TableHead XML com bg-blue + border-l dashed |
| Adicionar | 3 TableCell XML com logica 1:1 e mesma faixa visual |
| Adicionar | Destaque vermelho em NCM divergente, ambar em valor divergente |

Apenas `src/pages/equipe/dev/CorrecoesSped.tsx` sera editado.

