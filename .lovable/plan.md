
# Adicionar Logging de Debug no Hook useSelicDataPerPer

## Problema

O hook `useSelicDataPerPer` usa `Promise.allSettled` que captura erros silenciosamente. Quando `fetchWithAuth` falha (sessao expirada, API retornando erro, timeout), o erro e descartado e o mapa retorna vazio - causando todos os "-" na coluna Vlr. Corrigido sem nenhum log para diagnostico.

## Correção

Adicionar `console.error` e `console.log` no hook para que possamos ver exatamente o que esta acontecendo em cada chamada de API.

### Arquivo: `src/hooks/useSelicDataPerPer.ts`

**Mudancas:**

1. Adicionar log quando o hook identifica PERs elegiveis (confirma que o hook esta rodando)
2. Adicionar log para cada URL chamada
3. Adicionar `console.error` quando a response nao e OK (mostrando status e body)
4. Adicionar `console.error` para promises rejeitadas no `Promise.allSettled`
5. Log final mostrando quantos PERs tiveram taxa encontrada

```typescript
queryFn: async () => {
  const map: Record<string, SelicTaxa> = {};
  const hoje = format(new Date(), 'yyyy-MM-dd');

  console.log(`[Selic] Buscando taxas para ${eligiblePers.length} PERs elegiveis`);

  const results = await Promise.allSettled(
    eligiblePers.map(async (per) => {
      const dataFim = getSelicEndDate(per.dt_solicitada);
      const url = getApiUrl(
        `/api/v1/selic?data_inicio=${dataFim}&data_fim=${hoje}`
      );
      console.log(`[Selic] ${per.numero_processo_per}: ${dataFim} -> ${hoje}`);
      
      const response = await fetchWithAuth(url);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        console.error(`[Selic] Erro ${response.status} para ${per.numero_processo_per}: ${errorText}`);
        return null;
      }

      const data = await response.json();
      const taxas: SelicTaxa[] = data.taxas || [];
      if (taxas.length > 0) {
        return {
          key: per.numero_processo_per,
          taxa: taxas[taxas.length - 1],
        };
      }
      console.warn(`[Selic] Nenhuma taxa retornada para ${per.numero_processo_per}`);
      return null;
    })
  );

  for (const result of results) {
    if (result.status === 'fulfilled' && result.value) {
      map[result.value.key] = result.value.taxa;
    } else if (result.status === 'rejected') {
      console.error('[Selic] Promise rejeitada:', result.reason);
    }
  }

  console.log(`[Selic] Resultado: ${Object.keys(map).length}/${eligiblePers.length} PERs com taxa`);
  return map;
},
```

## Resultado Esperado

Apos a mudanca, ao clicar "Buscar", o console do navegador mostrara exatamente:
- Quantos PERs sao elegiveis
- Qual URL cada PER esta chamando
- Se houve erro 4xx/5xx na API (com detalhes)
- Se a sessao expirou (promise rejeitada)
- Quantos PERs tiveram taxa retornada com sucesso

Com esses logs poderemos identificar a causa raiz exata do problema.
