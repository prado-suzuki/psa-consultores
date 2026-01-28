
# Ajustes de Layout no Modal DIFAL

## Alteracoes

### 1. Proporcao das Colunas (30% / 70%)

**Arquivo**: `src/components/equipe/dev/DifalAuditModal.tsx`

**Linha 186** (coluna esquerda):
```typescript
// De:
<div className="w-1/2 border-r ...">

// Para:
<div className="w-[30%] border-r ...">
```

**Linha 267** (coluna direita):
```typescript
// De:
<div className="w-1/2 p-6 ...">

// Para:
<div className="w-[70%] p-6 ...">
```

### 2. Titulo da Secao de Tributacao

**Linha 236**:
```typescript
// De:
<span className="text-xs text-slate-500 uppercase font-medium">
  Tributação de Entrada
</span>

// Para:
<span className="text-xs text-slate-500 uppercase font-medium">
  Tributação
</span>
```

---

## Resultado Visual

```text
┌────────────────────────────────────────────────────────────────────────────┐
│ ⚖️ Classificar Item                                                   [X] │
├───────────────────────┬────────────────────────────────────────────────────┤
│                       │                                                    │
│   DADOS DO PRODUTO    │         REGRAS DISPONIVEIS                         │
│   (30%)               │         (70%)                                      │
│                       │                                                    │
│   Produto: ...        │   ┌──────────────────────────────────────────┐     │
│   Código: ...         │   │ [ICMS-ST] 18%                       ✓   │     │
│   NCM: ...            │   └──────────────────────────────────────────┘     │
│   CFOP: ...           │   ┌──────────────────────────────────────────┐     │
│   Valor: R$...        │   │ [ICMS-ST] 12%                           │     │
│   UF: SP → MT         │   └──────────────────────────────────────────┘     │
│                       │   ┌──────────────────────────────────────────┐     │
│   TRIBUTACAO          │   │ [ICMS-ST] 7%                            │     │
│   CST: 00 | 18%       │   └──────────────────────────────────────────┘     │
│                       │                                                    │
│   Chave NFe: ...      │                                                    │
│                       │                                                    │
├───────────────────────┴────────────────────────────────────────────────────┤
│                                          [Cancelar]  [Salvar Decisao]      │
└────────────────────────────────────────────────────────────────────────────┘
```
