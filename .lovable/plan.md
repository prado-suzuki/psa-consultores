

## Plano: Reformular cabeçalho do RegraCard em NcmRegrasModal.tsx

### Arquivo: `src/components/equipe/dev/pis-cofins/NcmRegrasModal.tsx`

### Alteração no CollapsibleTrigger (L48-70)

**De:**
```tsx
<button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
  <div className="flex flex-1 items-center gap-3 min-w-0">
    <span className="text-sm font-medium truncate">{setorNome}</span>
    <Badge variant="outline" className="font-mono text-[11px] shrink-0">
      CST {regra.cst_pis}
    </Badge>
    {regra.permite_credito === 'S' ? (
      <Badge className="bg-emerald-100 text-emerald-700 ...">Crédito</Badge>
    ) : (
      <Badge variant="secondary" className="text-[11px] shrink-0">Sem crédito</Badge>
    )}
  </div>
  <ChevronDown ... />
</button>
```

**Para:**
```tsx
<button className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
  <div className="flex flex-1 items-center gap-3 min-w-0">
    <Badge variant="outline" className="font-mono text-[11px] shrink-0">
      CST {regra.cst_pis}
    </Badge>
    <span className="text-xs text-muted-foreground truncate min-w-0 max-w-[200px]">
      {regra.desc_cst || '—'}
    </span>
    {regra.permite_credito === 'S' ? (
      <Badge className="bg-emerald-100 text-emerald-700 ...">Crédito</Badge>
    ) : (
      <Badge variant="secondary" className="text-[11px] shrink-0">Sem crédito</Badge>
    )}
    {regra.base_legal && (
      <span className="text-[11px] text-muted-foreground/70 truncate min-w-0 max-w-[250px] hidden sm:inline" title={regra.base_legal}>
        {regra.base_legal}
      </span>
    )}
  </div>
  <ChevronDown ... />
</button>
```

### Mudanças:
| Acao | Detalhe |
|------|---------|
| Remover | `setorNome` do cabeçalho |
| Adicionar | `desc_cst` truncado após badge CST |
| Adicionar | `base_legal` truncado no final, com `hidden sm:inline` para responsividade |
| Manter | Badge de crédito inalterado |

### Prop `setorNome` do RegraCard
Remover a prop `setorNome` da interface e da chamada no componente pai (L171), já que não é mais usada no cabeçalho. A área expandida também não usa — o campo "Setor" não aparece no grid interno.

### Limpeza no componente pai (L171)
Remover `setorNome={setorMap[regra.id_segmento ?? '']?.nome ?? 'Sem setor'}` da invocação de `<RegraCard>`.

