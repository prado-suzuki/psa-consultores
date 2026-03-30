

## Plano: Tooltip informativo no filtro "Tipo de análise"

### Alteração (arquivo único: `ApuracaoPisCofins.tsx`)

Na label "Tipo de análise" (~L327-329), adicionar um ícone `Info` do Lucide com um `Tooltip` ao lado do texto, explicando:
- **Cliente (EFD)**: Traz os dados do EFD Contribuições do cliente
- **Prado (Balancete)**: Traz informações do Balancete do cliente

```tsx
<label className="text-xs uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1">
  Tipo de análise
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="h-3.5 w-3.5 cursor-help text-muted-foreground/70" />
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs text-xs">
      <p><strong>Cliente:</strong> Traz os dados do EFD Contribuições do cliente.</p>
      <p><strong>Prado:</strong> Traz informações do Balancete do cliente.</p>
    </TooltipContent>
  </Tooltip>
</label>
```

Garantir que os imports `Tooltip, TooltipTrigger, TooltipContent` e `Info` estejam presentes. Envolver com `TooltipProvider` se necessário (provavelmente já existe no layout).

| Arquivo | Alteração |
|---------|-----------|
| `ApuracaoPisCofins.tsx` | Tooltip com ícone Info ao lado da label |

