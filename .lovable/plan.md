

# Filtro de Situacao com Dados Pre-Carregados

## Problema

O filtro de "Situacao" atualmente depende do `perSituacoesMap`, que so carrega apos clicar em "Buscar". O usuario quer que as opcoes aparecam antes, independente da busca.

## Solucao

Criar uma query independente que busca todas as situacoes distintas da tabela `per_situacao` ao carregar a pagina, sem depender de cliente/contribuinte selecionado.

## Alteracoes em `src/pages/equipe/dev/ControlePerdcomp.tsx`

### 1. Nova query independente para situacoes

Adicionar uma query separada que carrega ao montar o componente:

```text
queryKey: ['per-situacoes-distintas']
queryFn: SELECT DISTINCT situacao FROM per_situacao WHERE situacao IS NOT NULL ORDER BY situacao
enabled: true (sempre ativa)
```

### 2. Substituir `uniqueSituacoes`

- Remover o `useMemo` atual que deriva de `perSituacoesMap`
- Usar os dados da nova query diretamente no Select de Situacao

### 3. Sem outras alteracoes

- A logica de filtragem continua a mesma (compara com `perSituacoesMap` apos busca)
- A ordenacao e paginacao permanecem inalteradas

### Secao Tecnica

**Nova query:**
```text
const { data: allSituacoes = [] } = useQuery({
  queryKey: ['per-situacoes-distintas'],
  queryFn: async () => {
    const { data } = await supabase
      .from('per_situacao')
      .select('situacao')
      .not('situacao', 'is', null);
    // Extrair valores unicos
    const set = new Set(data?.map(d => d.situacao));
    return Array.from(set).sort();
  },
});
```

**Substituicao no Select:**
- Trocar `uniqueSituacoes.map(...)` por `allSituacoes.map(...)`
- Remover o `useMemo` de `uniqueSituacoes` (linhas 284-291)

**Observacao:** Existem 6 situacoes distintas no banco: "Analisado", "Analise concluida", "Despacho", "Em analise", "PER deferido", "PER Deferido" (duplicata com caixa diferente - manter como esta, pois reflete o dado real).
