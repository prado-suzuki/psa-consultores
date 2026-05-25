## Objetivo
Adicionar tooltip na coluna **Trib. ANTES** da tabela "Top NCMs por faturamento" (AbaPorProduto) mostrando a composição estimada em **ICMS**, **IPI**, **PIS** e **COFINS** por NCM.

## Abordagem
Como `/por_produto` não retorna a composição por NCM, vou ratear proporcionalmente a `ComposicaoTributosAntes` global (já vinda de `/resumo`) com base na participação do `tributoAntes` de cada NCM no `tributoAntes` total.

## Implementação

1. **`AbaPorProduto.tsx`**
   - Chamar `useCalculadoraResumo(idContribuinte, filtros)` em paralelo a `useCalculadoraPorProduto` para obter `composicaoAntes` e o `tributoAntes` total.
   - Calcular fatores de rateio uma vez via `useMemo`:
     - `fatorICMS = (vICMS + vICMSST) / tributoAntesTotal`
     - `fatorIPI  = vIPI / tributoAntesTotal`
     - `fatorPIS  = (vPIS + vPIS_ST) / tributoAntesTotal`
     - `fatorCOFINS = (vCOFINS + vCOFINS_ST) / tributoAntesTotal`
   - Envolver o `<TableCell>` do `tributoAntes` num `<Tooltip>` (já importado de `@/components/ui/tooltip`), com underline decoration-dotted e `cursor-help`.
   - Conteúdo da tooltip: 4 linhas (ICMS, IPI, PIS, COFINS) com valor (`fmtBRL(p.tributoAntes * fator)`) e % de participação, além do total. Nota curta: "Composição estimada por rateio proporcional sobre o total do período".
   - Se `tributoAntesTotal === 0` ou `composicaoAntes` não disponível, não renderizar tooltip (fallback ao valor simples).

2. Sem mudanças no backend, hooks, tipos ou outras abas.

## Arquivos
- `src/components/equipe/dev/calculadora-ibs-cbs/AbaPorProduto.tsx` (única edição)