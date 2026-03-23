

## Plano: Reorganizar layout dos filtros

### Arquivo: `src/pages/equipe/dev/ApuracaoPisCofins.tsx`

**Linha 1 (3 colunas iguais)**: Cliente, Contribuinte, Tipo de documento (com label "Tipo de documento")

**Linha 2 (alinhamento horizontal)**: Data Início, Data Fim, switch Período Fechado (se BALANCETE), botões Limpar e Consultar alinhados à direita

### Mudanças concretas (linhas 170-262)

1. Primeira row: `grid grid-cols-1 md:grid-cols-3 gap-4` com Cliente, Contribuinte, e Tipo de documento (o Select de EFD/Balancete com label "Tipo de documento")
2. Segunda row: `flex items-end gap-4` com Data Início, Data Fim, switch (condicional), e `ml-auto` nos botões Limpar/Consultar
3. Remover o grid de 4 colunas atual e a div separada do tipo de apuração

1 arquivo alterado, ~40 linhas reescritas na seção de filtros.

