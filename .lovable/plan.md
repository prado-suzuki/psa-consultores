

# Reorganizar filtros em duas linhas com botao "Novo PER" no topo

## Layout proposto

**Linha 1 (sempre visivel):** Cliente | Contribuinte | Botao Buscar | Botao Limpar | Botao **Novo PER**

**Linha 2 (sempre visivel):** Situacao | Exercicio | N do Processo

## Mudancas tecnicas

**Arquivo:** `src/pages/equipe/dev/ControlePerdcomp.tsx`

1. **Remover CardHeader "Filtros"** para deixar o card mais compacto
2. **Dividir o grid unico de 7 colunas em dois grids separados:**
   - Linha 1: grid de 5 colunas -- Cliente (col-span-2), Contribuinte (col-span-2), e um grupo com Buscar + Limpar + Novo PER (col-span-1, flex horizontal)
   - Linha 2: grid de 3 colunas -- Situacao, Exercicio, N do Processo (sempre visiveis, sem condicao)
3. **Mover o botao "Novo"** do CardHeader de Resultados (linhas 843-848) para a linha 1 de filtros, com icone Plus e estilo primario
4. **Remover o botao "Novo" e a condicao `searched`** do card de Resultados
5. **Ambas as linhas ficam sempre visiveis**, sem depender de nenhum estado

