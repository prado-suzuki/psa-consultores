

## Plano: Remover tabela "Saldo a Pagar Consolidado" da aba Apuração

### Arquivo: `src/pages/equipe/dev/ApuracaoPisCofins.tsx`

**Linhas 646-699**: Remover o bloco `<section>` inteiro que contém o título "Saldo a Pagar Consolidado" e a tabela com 3 linhas (PIS Due, COFINS Due, Total a Recolher). Manter o container da aba (`<div className="space-y-8">`) vazio por enquanto — as tabelas detalhadas de apuração (COFINS/PIS breakdown) serão adicionadas em iteração futura se necessário.

1 arquivo, ~55 linhas removidas.

