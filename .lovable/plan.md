

# Reverter Calculo Manual - Usar Taxa Acumulada da API Diretamente

## Problema

A API Selic ja retorna o campo `vlr_acumulado_dec` com a taxa acumulada pronta para o periodo especificado (data_inicio ate data_fim), conforme o manual do PER/DCOMP Web. O `reduce` adicionado na ultima correcao esta **compondo taxas ja acumuladas**, gerando um fator incorreto (muito alto).

O unico calculo que o frontend faz e determinar o periodo de carencia (dt_solicitada + 360 dias). A API cuida do resto.

## Correcao

### Arquivo: `src/hooks/useSelicDataPerPer.ts`

Remover o `reduce` e voltar a usar diretamente a ultima taxa retornada pela API:

**De (linhas 56-69):**
```typescript
if (taxas.length > 0) {
  const fatorAcumulado = taxas.reduce(
    (acc, t) => acc * (1 + t.vlr_acumulado_dec),
    1
  );
  const lastTaxa = taxas[taxas.length - 1];
  console.log(`[Selic] ${per.numero_processo_per}: ${taxas.length} meses, fator acumulado: ${((fatorAcumulado - 1) * 100).toFixed(4)}%`);
  return {
    key: per.numero_processo_per,
    taxa: {
      ...lastTaxa,
      vlr_acumulado_dec: fatorAcumulado - 1,
    },
  };
}
```

**Para:**
```typescript
if (taxas.length > 0) {
  const lastTaxa = taxas[taxas.length - 1];
  console.log(`[Selic] ${per.numero_processo_per}: ${taxas.length} meses, taxa acumulada API: ${(lastTaxa.vlr_acumulado_dec * 100).toFixed(4)}%`);
  return {
    key: per.numero_processo_per,
    taxa: lastTaxa,
  };
}
```

### Arquivo: `src/lib/selicCalculator.ts`

Manter a correcao `valor * (1 + vlrAcumuladoDec)` pois a API retorna a taxa como decimal (ex: 0.034 = 3.4%), e o valor corrigido e `valor_original * (1 + taxa)`.

## Resultado Esperado

- A taxa exibida sera exatamente a retornada pela API (ex: ~3.4% para 4 meses)
- Sem calculo manual de composicao
- Valor corrigido = valor original * (1 + taxa da API)
