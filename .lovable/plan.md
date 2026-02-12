
# Corrigir Hook useSelicDataPerPer: Usar data_atualizacao para Competência Tributária

## Problema

O hook atual está indexando as taxas Selic pelo campo `data` (linhas 72-74), mas deveria usar `data_atualizacao`, que representa a competência tributária (mês deslocado 2 meses para trás).

Resultado atual: Todos os 20 PERs são ignorados com "sem registro para mês 2025-10" porque:
- O código procura por `taxasByMonth['2025-10']` usando `data`
- O registro correto tem `data = '2025-12'` e `data_atualizacao = '2025-10'`

## Solução

Alterar a indexação na linha 72 para usar `data_atualizacao` em vez de `data`:

**Linha 72 (antes):**
```typescript
const month = t.data.substring(0, 7); // YYYY-MM
```

**Linha 72 (depois):**
```typescript
const month = t.data_atualizacao.substring(0, 7); // YYYY-MM (competência tributária)
```

## Impacto

- **Uma linha alterada** no arquivo `src/hooks/useSelicDataPerPer.ts`
- A lógica de busca passa a usar o campo correto (competência tributária)
- Todos os PERs com data de fim de carência dentro do período da API serão encontrados corretamente
- Logs de debug agora mostrarão sucesso: `[Selic] PER-001 (competência 2025-10): encontrado via data_atualizacao`

## Detalhes Técnicos

- O campo `data_atualizacao` está presente na interface `SelicTaxa` (linha 11 de `useSelicData.ts`)
- A estrutura do resto do algoritmo permanece inalterada
- O cálculo de fator por subtração continua sendo `firstTaxa.vlr_acumulado_dec - lastTaxa.vlr_acumulado_dec`
- Resultado esperado: 20/20 PERs com taxa, fator de ~4.43% para competência 10/2025

