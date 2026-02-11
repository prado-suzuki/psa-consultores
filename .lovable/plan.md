

# Refatorar Calculo Selic - Regras PER/DCOMP Web

## Resumo

Reescrever a logica de correcao monetaria Selic para seguir as regras oficiais. A mudanca principal e:

- **Data inicio da API** = data atual (hoje)
- **Data fim da API** = dt_solicitada + 360 dias
- Se a **data fim for maior que hoje**, nao requisita a API e o valor corrigido fica como 0
- Quando a data fim ja passou, usa o `vlr_acumulado_dec` da ultima taxa retornada pela API como fator de correcao

## Alteracoes

### 1. `src/lib/selicCalculator.ts`

- **Remover** `findTaxaByDate` (nao mais usada)
- **Simplificar** `applySelicCorrection`:
  - Nova assinatura: `applySelicCorrection(valor: number, vlrAcumuladoDec: number)`
  - Apenas multiplica valor pelo fator e retorna
  - A verificacao de carencia sera feita no componente (antes de chamar a API)
- **Remover** `calculateBatchCorrection` (logica movida para o componente)

### 2. `src/pages/equipe/dev/ControlePerdcomp.tsx`

**Refatorar `selicDateRange`:**
- Calcular para cada PER: `dataFim = dt_solicitada + 360 dias`
- Filtrar apenas PERs cuja `dataFim <= hoje` (fora da carencia)
- `inicio` = data atual (hoje)
- `fim` = a maior `dataFim` entre os PERs elegiveis
- Se nenhum PER for elegivel, retorna `{ inicio: null, fim: null }` (nao chama API)

**Refatorar `selicCorrectionMap`:**
- Para cada PER, calcular `dataFim = dt_solicitada + 360 dias`
- Se `dataFim > hoje`: sem correcao, valor = 0, fator = 0
- Se `dataFim <= hoje`: buscar a ultima taxa do array `selicTaxas` e usar `vlr_acumulado_dec` como fator

**Totais:**
- Manter a mesma logica, usando o novo `selicCorrectionMap`

## Secao Tecnica

### Fluxo de decisao por PER

```text
Para cada PER:
  dataFim = dt_solicitada + 360 dias

  dataFim > hoje?
    SIM -> valorCorrigido = 0, fator = 0 (carencia, sem API)
    NAO -> fator = ultimaTaxa.vlr_acumulado_dec
           valorCorrigido = vlr_credito * fator
```

### Calculo do intervalo da API

```text
PERs elegiveis = filteredPerData.filter(p => dt_solicitada + 360 <= hoje)

Se nenhum elegivel: nao chama API

Senao:
  inicio = hoje (formato YYYY-MM-DD)
  fim = max(dt_solicitada + 360) entre elegiveis (formato YYYY-MM-DD)
```

### Arquivos impactados
- `src/lib/selicCalculator.ts` - simplificacao
- `src/pages/equipe/dev/ControlePerdcomp.tsx` - logica de datas e carencia

### Sem alteracao em
- Banco de dados
- Hook `useSelicData`
- Interface `SelicTaxa`

