

# Correcao Critica: Calculo Selic por Subtracao + Chamada Unica

## Problema

Todos os PERs exibem fator Selic de ~1% porque o hook pega o ultimo registro do array (mes vigente), que e sempre fixado em 1%. A API retorna `vlr_acumulado_dec` como acumulado reverso - meses mais antigos tem valores maiores, e o calculo correto e por **subtracao** entre o mes inicio e o mes fim.

Alem disso, o hook faz N chamadas de API (uma por PER), causando problemas de performance.

## Solucao

### 1. `src/hooks/useSelicDataPerPer.ts` - Refatorar completamente

**De:** N chamadas de API, cada uma pegando o ultimo registro
**Para:** 1 unica chamada de API cobrindo o periodo mais antigo ate hoje, depois calculo local por subtracao

```text
Fluxo novo:
1. Encontrar a data mais antiga entre todos os PERs elegiveis (menor getSelicEndDate)
2. Fazer UMA chamada: /api/v1/selic?data_inicio={mais_antiga}&data_fim={hoje}
3. Para cada PER, encontrar no array o registro do mes correspondente ao fim da carencia
4. Fator = vlr_acumulado_dec(mes_carencia) - vlr_acumulado_dec(mes_atual)
5. Retornar mapa com SelicTaxa modificada contendo o fator correto
```

Logica de calculo:
```typescript
// Array de taxas ordenado pela API (mais antigo primeiro)
// firstTaxa = registro do mes correspondente ao fim da carencia do PER
// lastTaxa = ultimo registro (mes vigente, sempre ~1%)
// fator = firstTaxa.vlr_acumulado_dec - lastTaxa.vlr_acumulado_dec
```

Para localizar o registro correto de cada PER no array, comparar o campo `data` (YYYY-MM) com o mes do fim da carencia.

### 2. `src/lib/selicCalculator.ts` - Sem mudancas na formula

A funcao `applySelicCorrection` continua usando `valor * (1 + fator)`. O que muda e o fator que chega nela (agora calculado por subtracao, nao mais o vlr_acumulado_dec direto).

As funcoes `isWithinGracePeriod` e `getSelicEndDate` permanecem iguais.

### 3. `src/pages/equipe/dev/ControlePerdcomp.tsx` - Sem mudancas

O componente consumidor nao precisa mudar. Ele ja usa `selicPerMap[per.numero_processo_per]` e chama `applySelicCorrection(per.vlr_credito, taxa.vlr_acumulado_dec)`. Como o hook retornara o fator correto no campo `vlr_acumulado_dec` da taxa, tudo funciona transparentemente.

## Resultado Esperado

| Antes | Depois |
|-------|--------|
| Todos os PERs: fator ~1% | Cada PER com fator proporcional a antiguidade |
| N chamadas de API | 1 unica chamada |
| Erro de memoria com muitos PERs | Performance estavel |

Logs esperados:
```text
[Selic] 1 chamada cobrindo 2023-05-15 ate 2026-02-12 (45 PERs)
[Selic] PER-001: 0.1234 - 0.0100 = 0.1134 (11.34%)
[Selic] PER-002: 0.0856 - 0.0100 = 0.0756 (7.56%)
```

## Detalhes Tecnicos

- O hook retorna `Record<string, SelicTaxa>` como antes - a interface nao muda
- O campo `vlr_acumulado_dec` no objeto retornado sera sobrescrito com o fator calculado por subtracao
- A queryKey muda para `['selic-per-batch', cacheKey]` para invalidar o cache antigo
- Se um PER nao encontrar registro no array para seu mes de carencia, sera ignorado (sem fator)

