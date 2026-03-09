

## Plan: Add SOP manual links to page headers

### What changes

**Single file:** `src/components/equipe/dev/DevLayout.tsx`

Add an optional `sopUrl` prop to `DevLayout`. When provided, render it inline next to the subtitle text with a separator, green link text, and an external link icon.

**Line 263** changes from:
```tsx
{subtitle && <p className="text-sm text-slate-500">{subtitle}</p>}
```
to:
```tsx
{subtitle && (
  <p className="text-sm text-slate-500">
    {subtitle}
    {sopUrl && (
      <>
        <span className="mx-2">|</span>
        <a href={sopUrl} target="_blank" rel="noopener noreferrer"
           className="text-teal-600 hover:text-teal-700 hover:underline inline-flex items-center gap-1">
          Acessar SOP desta ferramenta
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </>
    )}
  </p>
)}
```

Then pass `sopUrl` from the three pages:

| File | `sopUrl` value |
|------|---------------|
| `ConsultaXMLs.tsx` | `https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/consulta-xmls/` |
| `AuditoriaFiscal.tsx` | `https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/difal-inteligente/` |
| `ConsultaEFD.tsx` | `https://alexandresilva-psa.github.io/Manuais_Ferramentas_PSA/manuais/efd-contribuicoes/` |

### Summary of touched files
1. `DevLayout.tsx` — add `sopUrl?` prop + render logic + `ExternalLink` import
2. `ConsultaXMLs.tsx` — add `sopUrl` prop to `<DevLayout>`
3. `AuditoriaFiscal.tsx` — add `sopUrl` prop to `<DevLayout>`
4. `ConsultaEFD.tsx` — add `sopUrl` prop to `<DevLayout>`

No database or backend changes needed.

