

# Correção Selic: Aplicar apenas sobre o período excedente aos 360 dias

## Problema atual

A implementação atual em `selicCalculator.ts` busca a taxa Selic acumulada (`vlr_acumulado_dec`) usando a `dt_solicitada` como referência. Isso significa que o fator acumulado cobre **todo o período** desde a data solicitada até hoje. O correto é que a correção seja calculada apenas sobre o **período que excede os 360 dias** (a partir do 361o dia).

## Solução

Em vez de buscar a taxa Selic pela `dt_solicitada`, devemos buscar pela **data que é 360 dias após a `dt_solicitada`**. Assim, o fator acumulado retornado pela API cobrirá apenas o período excedente.

### Exemplo prático

- `dt_solicitada` = 2024-01-15
- 360 dias depois = 2025-01-10
- Se hoje = 2026-02-10, a correção será calculada com o fator acumulado a partir de 2025-01-10 (apenas o excedente)

## Detalhes técnicos

### 1. Arquivo: `src/lib/selicCalculator.ts` - função `applySelicCorrection`

- Calcular `data361` = `dataInicio` + 360 dias
- Se `data361` for no futuro (depois de hoje), retornar valores zerados (ainda não completou 360 dias)
- Caso contrário, usar `findTaxaByDate(taxas, data361)` em vez de `findTaxaByDate(taxas, dataInicio)` para obter o fator acumulado somente do período excedente

```ts
export function applySelicCorrection(
  valor: number,
  taxas: SelicTaxa[],
  dataInicio: string,
  _dataFim: string
): { valorCorrigido: number; fator: number; valorAcumulado: number } {
  // Calcula a data do 361o dia
  const dtInicio = new Date(dataInicio + 'T00:00:00');
  const data361 = new Date(dtInicio);
  data361.setDate(data361.getDate() + 360);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // Se ainda não completou 360 dias, sem correção
  if (data361 > hoje) {
    return { valorCorrigido: 0, fator: 0, valorAcumulado: 0 };
  }

  // Busca a taxa Selic acumulada a partir do 361o dia (período excedente)
  const data361Str = data361.toISOString().split('T')[0];
  const taxa = findTaxaByDate(taxas, data361Str);
  if (!taxa) {
    return { valorCorrigido: 0, fator: 0, valorAcumulado: 0 };
  }

  return {
    valorCorrigido: valor * taxa.vlr_acumulado_dec,
    fator: taxa.vlr_acumulado_dec,
    valorAcumulado: taxa.valor_acumulado,
  };
}
```

### 2. Arquivo: `src/pages/equipe/dev/ControlePerdcomp.tsx` - ajuste no range da API Selic

Atualmente o range de busca das taxas Selic começa 2 meses antes da `dt_solicitada` mais antiga. Como agora usamos a data 360 dias depois, precisamos garantir que o range cubra essas datas. Na prática, o range atual (da dt_solicitada mais antiga até hoje) já cobre, pois a data+360 dias estará dentro desse intervalo. Nenhuma alteração necessária aqui.

### Resumo

- Apenas 1 arquivo precisa ser alterado: `src/lib/selicCalculator.ts`
- A lógica centralizada garante que tabela principal e cálculos em lote herdem o comportamento automaticamente
