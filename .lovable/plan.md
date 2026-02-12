
# Correção da Lógica de Cálculo Selic por PER Individual

## Problema Identificado

Na linha 335-336 de `ControlePerdcomp.tsx`, o código aplica o **mesmo fator Selic** (última taxa do range) para **todos os PERs elegíveis**:

```typescript
const ultimaTaxa = selicTaxas[selicTaxas.length - 1];
const { valorCorrigido, fator } = applySelicCorrection(per.vlr_credito, ultimaTaxa.vlr_acumulado_dec);
```

**Por que está errado**: 
- A API Selic retorna um array de taxas diárias do período
- Cada PER tem sua própria `data_fim = dt_solicitada + 360 dias`
- Cada PER deve usar o fator correspondente à **sua própria data_fim**, não a data_fim do PER com maior data
- Isso causa valores nulos/incorretos quando um PER está fora da carência mas sua data_fim não é coberta pelo range buscado

## Solução Proposta

### 1. Criar Hook `useSelicDataPerPer`

Novo arquivo: `src/hooks/useSelicDataPerPer.ts`

Um hook que busca dados Selic para cada PER **individualmente**, evitando chamadas desnecessárias:

```typescript
export function useSelicDataPerPer(pers: Array<{ numero_processo_per: string; dt_solicitada: string }>) {
  const { fetchWithAuth } = useApiAuth();
  
  // Filtra apenas PERs elegíveis (fora da carência)
  const eligiblePers = pers.filter(p => !isWithinGracePeriod(p.dt_solicitada));
  
  return useQuery({
    queryKey: ['selic-per-individual', eligiblePers.map(p => p.numero_processo_per).join(',')],
    queryFn: async () => {
      const map = {};
      const hoje = format(new Date(), 'yyyy-MM-dd');
      
      for (const per of eligiblePers) {
        const dataFim = getSelicEndDate(per.dt_solicitada);
        const url = getApiUrl(`/api/v1/selic?data_inicio=${hoje}&data_fim=${dataFim}`);
        const response = await fetchWithAuth(url);
        
        if (response.ok) {
          const data = await response.json();
          const taxas = data.taxas || [];
          if (taxas.length > 0) {
            // Usa última taxa do range específico deste PER
            map[per.numero_processo_per] = taxas[taxas.length - 1];
          }
        }
      }
      return map;
    },
    enabled: eligiblePers.length > 0,
    staleTime: 24 * 60 * 60 * 1000,
    gcTime: 48 * 60 * 60 * 1000,
  });
}
```

### 2. Atualizar `ControlePerdcomp.tsx`

**Remover**:
- A query `selicDateRange` (linhas 300-313)
- A query `useSelicData` com range único (linhas 316-319)

**Adicionar**:
- Import do novo hook `useSelicDataPerPer`
- Nova query que busca Selic individual por PER:

```typescript
const { data: selicPerMap = {} } = useSelicDataPerPer(
  filteredPerData.filter(p => p.dt_solicitada)
);
```

**Atualizar** o memoized `selicCorrectionMap` (linhas 322-340):

```typescript
const selicCorrectionMap = useMemo(() => {
  const map: Record<string, { valorCorrigido: number; fator: number }> = {};
  
  for (const per of filteredPerData) {
    if (!per.dt_solicitada) continue;
    
    if (isWithinGracePeriod(per.dt_solicitada)) {
      map[per.numero_processo_per] = { valorCorrigido: 0, fator: 0 };
      continue;
    }
    
    // Busca taxa específica deste PER (não a última do range geral)
    const taxa = selicPerMap[per.numero_processo_per];
    if (!taxa) {
      // Se não encontrou taxa, deixa como undefined (renderiza -)
      continue;
    }
    
    const { valorCorrigido, fator } = applySelicCorrection(per.vlr_credito, taxa.vlr_acumulado_dec);
    map[per.numero_processo_per] = { valorCorrigido, fator };
  }
  
  return map;
}, [selicPerMap, filteredPerData]);
```

### 3. Ajustar Renderização da Coluna Vlr. Corrigido

Na tabela (linhas ~760), adicionar indicador visual durante loading:

```typescript
<TableCell className="text-right text-xs">
  {!searched ? (
    '-'
  ) : selicLoading ? (
    <Loader2 className="h-3 w-3 animate-spin mx-auto" />
  ) : selicCorrectionMap[item.numero_processo_per] ? (
    formatCurrency(selicCorrectionMap[item.numero_processo_per].valorCorrigido)
  ) : (
    '-'
  )}
</TableCell>
```

## Impacto

**Antes**: Um PER com data_fim = 01/03/2025 recebia a taxa de 01/03/2025, mas se outro PER com data_fim = 30/06/2025 existisse, usava-se taxa de 30/06/2025 para ambos.

**Depois**: Cada PER recebe a taxa **específica** da sua data_fim, garantindo cálculo correto.

## Sequência de Implementação

1. Criar `useSelicDataPerPer.ts`
2. Remover lógica antiga de `selicDateRange` em `ControlePerdcomp.tsx`
3. Integrar nova query e atualizar `selicCorrectionMap`
4. Testar com PERs de diferentes anos (2024, 2023, etc.)

