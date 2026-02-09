

# Reordenar Coluna "Ressarcido" e Atualizar Calculo do Saldo

## Objetivo

1. Mover a coluna "Ressarcido" para logo apos "PER Compensado"
2. Valor Ressarcido = saldo do PER na data de pagamento (vlr_credito - totalCompensado), somente quando dt_pagamento existe
3. Saldo Disponivel = vlr_credito - (totalCompensado + valorRessarcido)

---

## Nova Ordem das Colunas

| # | Coluna | Mudanca |
|---|--------|---------|
| 1-9 | (sem mudanca) | Nr Processo ate PER Compensado |
| 10 | **Ressarcido** | Movido para ca (era 11) |
| 11 | **Saldo Disponivel** | Movido para ca (era 10), formula alterada |
| 12-13 | Data Pagamento, Editar | Sem mudanca |

---

## Alteracoes no Arquivo `src/pages/equipe/dev/ControlePerdcomp.tsx`

### 1. Reordenar Headers (linhas 334-336)

De:
```
PER Compensado -> Saldo Disponivel -> Ressarcido
```
Para:
```
PER Compensado -> Ressarcido -> Saldo Disponivel
```

### 2. Atualizar Logica de Calculo (linha 351)

De:
```typescript
const saldo = item.vlr_credito - totalCompensado;
```
Para:
```typescript
const valorRessarcido = situacaoInfo?.dt_pagamento 
  ? (item.vlr_credito - totalCompensado) 
  : 0;
const saldo = item.vlr_credito - (totalCompensado + valorRessarcido);
```

Nota: Quando ha `dt_pagamento`, o ressarcido = saldo do PER naquele momento (vlr_credito - compensado). O saldo disponivel entao zera (vlr_credito - compensado - ressarcido = 0).

### 3. Reordenar Celulas no Body (linhas 367-379)

Apos PER Compensado, colocar primeiro Ressarcido, depois Saldo Disponivel:

```tsx
{/* PER Compensado */}
<TableCell className="text-right">{formatCurrency(totalCompensado)}</TableCell>

{/* Ressarcido (movido para ca) */}
<TableCell className="text-right">
  {valorRessarcido > 0 ? formatCurrency(valorRessarcido) : '-'}
</TableCell>

{/* Saldo Disponivel (nova formula) */}
<TableCell className="text-right">
  <span className={cn("font-medium", ...)}>
    {formatCurrency(saldo)}
  </span>
</TableCell>
```

