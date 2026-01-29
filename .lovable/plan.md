

## Plano: Corrigir Larguras dos Filtros no DIFAL Inteligente

### Problema Identificado

O layout do card de filtros no **AuditoriaFiscal.tsx** está com proporções diferentes da referência **ConsultaEFD.tsx**:

| Campo | ConsultaEFD (ref) | AuditoriaFiscal (atual) |
|-------|-------------------|-------------------------|
| Cliente | `md:col-span-3` | `md:col-span-3` ✓ |
| Contribuinte | `md:col-span-5` | `md:col-span-3` ✗ |
| Data Início | `md:col-span-2` | `md:col-span-3` ✗ |
| Data Fim | `md:col-span-2` | `md:col-span-3` ✗ |

O resultado visual é que o "Cliente" aparece muito estreito comparado ao esperado, e as datas ocupam espaço desnecessário.

---

### Alteração Necessária

#### Arquivo: `src/pages/equipe/dev/AuditoriaFiscal.tsx`

Ajustar as classes `col-span` dos filtros para corresponder à referência:

```text
Linha 713: md:col-span-3 → md:col-span-3 (Cliente - mantém)
Linha 742: md:col-span-3 → md:col-span-5 (Contribuinte - aumentar)
Linha 770: md:col-span-3 → md:col-span-2 (Data Início - reduzir)
Linha 806: md:col-span-3 → md:col-span-2 (Data Fim - reduzir)
```

---

### Código Antes vs Depois

**Antes:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-4">
  <div className="md:col-span-3">  {/* Cliente */}
  <div className="md:col-span-3">  {/* Contribuinte */}
  <div className="md:col-span-3">  {/* Data Início */}
  <div className="md:col-span-3">  {/* Data Fim */}
</div>
```

**Depois:**
```tsx
<div className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-4">
  <div className="md:col-span-3">  {/* Cliente - mantém */}
  <div className="md:col-span-5">  {/* Contribuinte - mais largo */}
  <div className="md:col-span-2">  {/* Data Início - mais compacto */}
  <div className="md:col-span-2">  {/* Data Fim - mais compacto */}
</div>
```

---

### Resultado Esperado

O DIFAL Inteligente terá o mesmo layout proporcional do ConsultaEFD:
- **Cliente**: 25% da largura (3/12)
- **Contribuinte**: ~42% da largura (5/12) - nome mais visível
- **Data Início**: ~17% da largura (2/12) - compacto para datas
- **Data Fim**: ~17% da largura (2/12) - compacto para datas

