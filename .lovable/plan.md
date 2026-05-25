## Mudança
Na tooltip da coluna **Trib. ANTES** em `AbaPorProduto.tsx`, unificar PIS e COFINS em uma única linha "PIS/COFINS (próprio + ST)" somando os valores e percentuais.

## Implementação
- `src/components/equipe/dev/calculadora-ibs-cbs/AbaPorProduto.tsx`
  - No `fatoresComposicao`: substituir `fatorPIS` e `fatorCOFINS` por `fatorPisCofins = (vPIS + vPIS_ST + vCOFINS + vCOFINS_ST) / tributoAntesTotal`.
  - Na tabela da tooltip: remover as duas linhas PIS e COFINS, adicionar uma linha "PIS/COFINS (próprio + ST)" com `% combinado` e `fmtBRL(p.tributoAntes * fatorPisCofins)`.
  - Manter ICMS, IPI, Total e a nota de rateio inalterados.