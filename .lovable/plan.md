
# Plano: Exibir Processo Retificado no Modal de Detalhes do PER

## Objetivo
Mostrar no `PerDetailModal` qual processo foi retificado quando o PER atual for uma retificadora (ou seja, quando `nr_proc_ret` tiver valor).

---

## Alteração Proposta

### Arquivo: `src/components/equipe/dev/perdcomp/PerDetailModal.tsx`

**Localização:** No header do modal, logo abaixo do subtítulo com contribuinte e exercício.

**Visual:** Adicionar um indicador com ícone de "link" mostrando:

```text
↳ Retifica: 00000.00000.000000.0.0.00-0000
```

### Implementação

1. Adicionar ícone `ArrowRight` ou `Link` nos imports do Lucide
2. No header (após linha 240), adicionar condicionalmente:

```tsx
{per.nr_proc_ret && (
  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
    <ArrowRight className="h-3 w-3" />
    <span>Retifica:</span>
    <span className="font-mono font-medium">{per.nr_proc_ret}</span>
  </p>
)}
```

---

## Layout Final do Header

```text
┌─────────────────────────────────────────────────────────────┐
│  [📄]  00000.00000.000000.0.0.00-0000   [PIS]               │
│        Contribuinte XYZ • 2024/1T                           │
│        ↳ Retifica: 11111.11111.111111.1.1.11-1111           │  ← NOVO
└─────────────────────────────────────────────────────────────┘
```

---

## Detalhes Técnicos

### Import a adicionar
```typescript
import { X, FileText, Plus, Pencil, Trash2, Loader2, History, ArrowRight } from 'lucide-react';
```

### Código a inserir (após linha 240, dentro da div do título)
```tsx
{per.nr_proc_ret && (
  <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 flex items-center gap-1">
    <ArrowRight className="h-3 w-3" />
    <span>Retifica:</span>
    <span className="font-mono font-medium">{per.nr_proc_ret}</span>
  </p>
)}
```

---

## Arquivo a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` | Adicionar indicador visual do processo retificado no header |

---

## Resultado Esperado

Quando o usuário clicar em um PER que é retificadora, verá claramente qual processo original foi retificado, mantendo a rastreabilidade completa dos processos.
