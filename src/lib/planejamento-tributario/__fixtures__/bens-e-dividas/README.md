Origem: WP e apresentacao do Grupo Bahia Potrich, anonimizados.
Nomes trocados por ficticios e todo valor em reais multiplicado por 0.7134.
O fator unico preserva as validacoes: soma de bloco, percentuais, presuncao de
20% e aliquota de 27,5% continuam fechando.

# Bens e dividas da atividade rural

Origem: WP do Grupo Bahia Potrich, tres linhas de cada aba, com nomes trocados e
valores multiplicados pelo fator. O valor do bem sai da coluna de Valor Total do
Bahia Potrich, que e a que o slide usa; no modelo existe uma coluna so.

## O que este caso prova

- **Aqui a leitura e por coluna, nao por linha.** As outras abas tem um rotulo por
  linha; estas tem um registro por linha e as colunas nomeadas no cabecalho. E por
  isso que a conferencia de posicao olha o cabecalho: coluna trocada faria o valor
  do bem virar descricao.
- **A leitura para na linha de TOTAL.** O total e conta da planilha e nao e
  registro: gravar seria contar tudo duas vezes. As duas abas trazem a linha, uma
  escrita `TOTAL` e a outra `Total`, e as duas tem de parar a leitura.
- **A data vem como numero de serie do Excel** e sai como data ISO. O `46935` da
  planilha e `2028-07-01`, e a conta e dias desde 30/12/1899, porque o Excel conta
  um 29/02/1900 que nunca existiu.
- **A amortizacao por ano vai em jsonb**, e as colunas de ano sao reconhecidas pelo
  rotulo de quatro digitos, nao por lista fixa: o cronograma da divida nao e a
  data-base do estudo.

## Quebra se

- A linha de total entrar como registro.
- A data virar o numero cru, ou cair um dia por causa do bug de 1900.
- Uma coluna de ano nova exigir mexer no codigo.
