

# Filtro de Situacao e Ordenacao Dinamica na Tabela PERDCOMP

## Resumo

Duas melhorias no Controle PERDCOMP:
1. Novo filtro de "Situacao" no card de filtros, listando as situacoes distintas encontradas nos dados carregados
2. Ordenacao dinamica em todas as colunas da tabela - clique no cabecalho alterna entre crescente/decrescente, com indicador visual (seta)

## Alteracoes em `src/pages/equipe/dev/ControlePerdcomp.tsx`

### 1. Filtro de Situacao

- Adicionar state `situacaoFilter` (string, inicialmente vazio)
- Extrair lista de situacoes unicas a partir de `perSituacoesMap` via `useMemo`
- Adicionar um novo `Select` no grid de filtros (entre "Exercicio" e "N. Processo") com as opcoes dinamicas
- Na funcao de filtragem `filteredPerData`, adicionar verificacao: se `situacaoFilter` estiver preenchido, comparar com `perSituacoesMap[item.numero_processo_per]?.situacao`
- Limpar o filtro no `handleClear`

### 2. Ordenacao Dinamica da Tabela

- Adicionar state `sortColumn` (string | null) e `sortDirection` ('asc' | 'desc')
- Definir tipo para colunas ordenaveis com mapeamento para funcao de acesso ao valor (ex: `numero_processo_per`, `situacao`, `dt_solicitada`, `exercicio`, `vlr_credito`, `vlr_compensado`, `saldo`, `vlr_corrigido`)
- Ao clicar no cabecalho:
  - Se ja esta ordenando pela mesma coluna, alterna a direcao
  - Senao, define a nova coluna com direcao ascendente
- Aplicar `sort()` no array filtrado antes da paginacao
- Adicionar icone `ArrowUpDown` (lucide) no cabecalho, trocando para `ArrowUp`/`ArrowDown` quando ativo
- Estilizar cabecalhos ordenaveis com `cursor-pointer` e `hover:bg-muted/50`

### Secao Tecnica

**Novos states:**
```text
situacaoFilter: string
sortColumn: string | null
sortDirection: 'asc' | 'desc'
```

**Fluxo de ordenacao:**
- `sortedData = useMemo` que recebe `filteredPerData` e aplica sort baseado em `sortColumn` e `sortDirection`
- A paginacao usa `sortedData` ao inves de `filteredPerData`
- Os totais continuam usando `filteredPerData` (sem depender da ordem)

**Colunas ordenaveis e seus acessores:**
- N. Processo -> `item.numero_processo_per` (string)
- Situacao -> `perSituacoesMap[key]?.situacao` (string)
- Dt. Solicitada -> `item.dt_solicitada` (date string)
- Exercicio -> `item.exercicio` (number)
- Trimestre -> `item.tri_exercicio` (number)
- Vlr. Credito -> `item.vlr_credito` (number)
- Vlr. Compensado -> `dcompTotalMap[key]` (number)
- Saldo -> calculado (number)
- Vlr. Corrigido -> `selicCorrectionMap[key]?.valorCorrigido` (number)

**Grid de filtros:**
- Alterar de `md:grid-cols-6` para `md:grid-cols-7` para acomodar o novo filtro
- Ou manter 6 colunas ajustando o span dos botoes

**Imports adicionais:**
- `ArrowUp`, `ArrowDown`, `ArrowUpDown` de `lucide-react`

