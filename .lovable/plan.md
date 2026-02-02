
# Plano: Corrigir Cards de Estatísticas que Não Aparecem

## Diagnóstico do Problema

O problema ocorre porque:

1. Quando `handleSearch` é executado, ele define `statusFilter = "pending"` imediatamente
2. A query de busca de itens dispara com o parâmetro `&valid=false` (filtrando só pendentes)
3. O `useEffect` que popula `globalStats` só executa quando `statusFilter === "all"`
4. Como o filtro já está em "pending", `globalStats` permanece `null`
5. Os cards dependem de `globalStats` para exibir os valores, então ficam com `0`
6. A condição `(totalItems > 0 || qtdValidados > 0 || qtdPendentes > 0)` retorna `false`
7. Os cards não são renderizados

## Solução

Modificar a lógica para que as estatísticas globais sejam sempre atualizadas, independente do filtro de status atual. A API já retorna `qtd_validados` e `qtd_pendentes` em cada resposta, então podemos usar esses valores para atualizar as estatísticas globais.

### Alteração no useEffect (linhas 287-296)

**Antes:**
```typescript
useEffect(() => {
  if (statusFilter === "all" && apiGroupedData && searchTriggered) {
    setGlobalStats({
      total: apiGroupedData.total,
      validados: apiGroupedData.qtdValidados,
      pendentes: apiGroupedData.qtdPendentes,
    });
  }
}, [statusFilter, apiGroupedData, searchTriggered]);
```

**Depois:**
```typescript
useEffect(() => {
  if (apiGroupedData && searchTriggered) {
    // Calcular total a partir de validados + pendentes 
    // (a API retorna os valores absolutos mesmo com filtro)
    const totalCalculado = (apiGroupedData.qtdValidados || 0) + (apiGroupedData.qtdPendentes || 0);
    
    // Atualizar estatísticas globais - a API retorna os valores absolutos
    // independente do filtro aplicado (qtd_validados e qtd_pendentes são globais)
    setGlobalStats({
      total: totalCalculado,
      validados: apiGroupedData.qtdValidados,
      pendentes: apiGroupedData.qtdPendentes,
    });
  }
}, [apiGroupedData, searchTriggered]);
```

A API retorna os valores globais de `qtd_validados` e `qtd_pendentes` em todas as chamadas, não apenas quando o filtro é "all". Portanto, podemos usar esses valores sempre que a query retornar dados.

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/equipe/dev/AuditoriaFiscal.tsx` | Remover condição `statusFilter === "all"` do useEffect que atualiza `globalStats` |

## Resultado Esperado

Após a alteração:
1. Usuário clica em "Buscar Itens"
2. Sistema define `statusFilter = "pending"` e dispara a busca
3. API retorna itens filtrados + estatísticas globais (`qtd_validados`, `qtd_pendentes`)
4. `useEffect` atualiza `globalStats` com as estatísticas da resposta
5. Cards aparecem com os valores corretos: Pendentes | Validados | Total de Itens
6. Card "Pendentes" fica pré-selecionado (destacado)
