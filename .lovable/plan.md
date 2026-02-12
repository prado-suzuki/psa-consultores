

# Usar vlr_acumulado_dec direto (sem subtracao) e valor_acumulado no hover

## O que muda

O usuario esclareceu que a API ja retorna os valores acumulados prontos para uso no registro localizado via `getSelicEndDate` + `data_atualizacao`. Nao e necessario fazer subtracao entre dois registros.

## Alteracoes

### 1. `src/hooks/useSelicDataPerPer.ts`

- **Manter** `getSelicEndDate` para calcular o mes de busca
- **Manter** indexacao por `data_atualizacao`
- **Remover** a logica de subtracao (linhas 76-77, 90)
- **Remover** referencia a `lastTaxa`
- Usar diretamente o `vlr_acumulado_dec` e `valor_acumulado` do registro encontrado, sem modificar

Antes (linha 90):
```typescript
const fator = firstTaxa.vlr_acumulado_dec - lastTaxa.vlr_acumulado_dec;
map[per.numero_processo_per] = { ...firstTaxa, vlr_acumulado_dec: fator };
```

Depois:
```typescript
map[per.numero_processo_per] = firstTaxa; // valor direto da API, sem subtracao
```

### 2. `src/pages/equipe/dev/ControlePerdcomp.tsx`

- Atualizar tipo do `selicCorrectionMap` para incluir `valorAcumulado` (campo `valor_acumulado` da taxa)
- No `useMemo` (linha 309-326), guardar tambem `taxa.valor_acumulado`
- No tooltip (linha 557-559), trocar de `correction.fator.toFixed(6)` para exibir `correction.valorAcumulado` formatado como percentual (ex: "Taxa Selic: 4,43%")

Antes:
```typescript
const map: Record<string, { valorCorrigido: number; fator: number }> = {};
// ...
map[per.numero_processo_per] = { valorCorrigido, fator };
```

Depois:
```typescript
const map: Record<string, { valorCorrigido: number; fator: number; valorAcumulado: number }> = {};
// ...
map[per.numero_processo_per] = { valorCorrigido, fator, valorAcumulado: taxa.valor_acumulado };
```

Tooltip (linha 558):
```typescript
// Antes
<p>Fator Selic: {correction.fator.toFixed(6)}</p>
// Depois
<p>Taxa Selic: {correction.valorAcumulado.toFixed(2)}%</p>
```

### 3. Sem mudancas em `src/lib/selicCalculator.ts`

A funcao `applySelicCorrection` continua recebendo `vlr_acumulado_dec` (agora direto da API) e calculando `valor * (1 + vlr_acumulado_dec)`.

## Resumo

| Item | Antes | Depois |
|------|-------|--------|
| Fator usado | Subtracao entre 2 registros | Direto da API (registro localizado) |
| Hover | Fator decimal (0.044300) | Percentual legivel (4,43%) |
| getSelicEndDate | Mantido | Mantido |
| Indexacao data_atualizacao | Mantida | Mantida |

