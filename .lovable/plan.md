
# Correcao do Calculo Acumulado da Selic

## Problema

O hook `useSelicDataPerPer` pega apenas a **ultima entrada** do array de taxas retornado pela API (`taxas[taxas.length - 1]`), e usa o campo `vlr_acumulado_dec` dessa unica entrada. Esse valor representa a taxa de apenas aquele mes (~1%), nao o fator acumulado do periodo inteiro.

Para um PER com carencia terminando em outubro 2025, o periodo de correcao vai de outubro 2025 ate fevereiro 2026 (~4 meses). Com Selic de ~1% ao mes, o fator acumulado deveria ser ~3-4%, nao 1%.

## Correcao

### 1. `src/hooks/useSelicDataPerPer.ts` - Calcular fator acumulado

Em vez de retornar apenas a ultima taxa, calcular o produto acumulado de todas as taxas do periodo:

```typescript
// Atual (errado): pega so a ultima taxa
if (taxas.length > 0) {
  return {
    key: per.numero_processo_per,
    taxa: taxas[taxas.length - 1],
  };
}

// Corrigido: calcula o fator acumulado multiplicando todas as taxas
if (taxas.length > 0) {
  const fatorAcumulado = taxas.reduce(
    (acc, t) => acc * (1 + t.vlr_acumulado_dec),
    1
  );
  // Retorna uma SelicTaxa sintetica com o fator acumulado real
  const lastTaxa = taxas[taxas.length - 1];
  return {
    key: per.numero_processo_per,
    taxa: {
      ...lastTaxa,
      vlr_acumulado_dec: fatorAcumulado - 1, // ex: 0.0340 para ~3.4%
    },
  };
}
```

O `fatorAcumulado - 1` garante que o campo `vlr_acumulado_dec` represente a variacao percentual total (ex: 0.034 = 3.4%).

### 2. `src/lib/selicCalculator.ts` - Ajustar formula

A funcao `applySelicCorrection` precisa somar 1 ao fator para obter o valor corrigido total:

```typescript
// Atual:
valorCorrigido: valor * vlrAcumuladoDec,
// Corrigido:
valorCorrigido: valor * (1 + vlrAcumuladoDec),
```

Como o fator agora sera o percentual acumulado real (ex: 0.034), o calculo fica:
- R$ 59.705,73 * (1 + 0.034) = R$ 61.735,72

### 3. Adicionar log de debug temporario

Incluir log mostrando o fator acumulado calculado para validacao:

```typescript
console.log(`[Selic] ${per.numero_processo_per}: ${taxas.length} meses, fator acumulado: ${(fatorAcumulado - 1) * 100}%`);
```

## Resultado Esperado

- PER com carencia terminando em outubro 2025: fator ~3-4% (4 meses de Selic)
- PER com carencia terminando em janeiro 2026: fator ~1% (1 mes de Selic)
- Valores corrigidos proporcionais ao periodo fora da carencia
