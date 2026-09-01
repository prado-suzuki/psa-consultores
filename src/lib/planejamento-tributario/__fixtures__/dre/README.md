Origem: WP e apresentacao do Grupo Bahia Potrich, anonimizados.
Nomes trocados por ficticios e todo valor em reais multiplicado por 0.7134.
O fator unico preserva as validacoes: soma de bloco, percentuais, presuncao de
20% e aliquota de 27,5% continuam fechando.

# DRE projetada

## O que este caso prova

- **A DRE e uma lista fixa de 80 contas e so as preenchidas viram dado.** Este
  cliente preenche 12 contas de receita e 13 de custo; as demais ficam vazias e
  nao entram.
- **Quem escolhe as contas do slide e o consultor, nao o sistema.** Confirmado
  pela Monica e pelo Bernardo em 31/08/2026: a leitura pega a coluna toda e fica
  com o que foi preenchido; qual conta aparece no slide se decide depois. Por isso
  o gabarito nao traz flag de "vai ao slide": a secao `slide` abaixo e a escolha
  feita no estudo de origem, um exemplo, nao uma regra.
- **A corrente aritmetica fecha:** Receita menos Custos menos Despesas
  administrativas mais Resultado financeiro da o Lucro do exercicio.
- **Negativo sai entre parenteses.** O lucro do exercicio e negativo neste
  cliente, porque a aquisicao de maquinas de 20,6 milhoes entra dentro de Custos.
- **A conta de "Outros: especificar" tem rotulo editavel.** No modelo essas
  linhas sao espelhadas de `DRE Projetada`, e o importador deve seguir a formula
  em vez de casar pelo texto.

## Confirmado

A linha `(-) Maquinas/Equip. (aquisicoes)` esta dentro de Custos, e nao como linha
separada de Investimentos, que e como o estudo de origem fazia. A Monica confirmou
em 31/08/2026 que vale o modelo atualizado, ou seja, e assim mesmo. E por isso que
o Lucro do exercicio sai negativo neste cliente.
