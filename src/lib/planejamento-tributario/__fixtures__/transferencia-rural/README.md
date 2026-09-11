Origem: WP e apresentacao do Grupo Bahia Potrich, anonimizados.
Nomes trocados por ficticios e todo valor em reais multiplicado por 0.7134.
O fator unico preserva as validacoes: soma de bloco, percentuais, presuncao de
20% e aliquota de 27,5% continuam fechando.

# Transferencia da Atividade Rural

Aba `Cenario 02 (Venda de Ativos)` do modelo. Numeros do WP do Grupo Bahia
Potrich: total de bens pela coluna de Valor Total, que e a que o slide usa, e
cronograma de dividas pela linha de TOTAL, sete anos de 2026 a 2032.

A corrente aritmetica e recalculada pelas formulas do MODELO, nao copiada do
Bahia Potrich. Os dois discordam e o modelo mais recente vence: no Bahia Potrich
o imposto sai da presuncao, no modelo sai do resultado tributavel.

## O que este caso prova

- **A aba de Venda de Ativos e a origem deste slide**, e nao a apuracao de dentro
  das abas de cenario. Aquela e o IRPF da operacao normal; esta e o da venda.
- **Sete anos, nao tres.** A apuracao acompanha o cronograma da divida, que vai
  ate 2032, enquanto o estudo tem tres anos. Ler so tres perde metade do slide.
- **Nao ha linha de contribuinte.** A venda e do produtor e nao se reparte, entao
  as colunas vem fixas do mapa em vez de descobertas pelo cabecalho.
- **Celula vazia nao e zero.** No primeiro ano o saldo de prejuizo anterior nao
  existe, e a leitura tem de pular a linha em vez de gravar zero.
- **Um bloco sem ano.** Bens, dividas e a diferenca moram numa coluna so, e
  entram com o primeiro ano da apuracao para o slide poder mostra-los junto.
- **A ordem muda entre a planilha e o slide.** Na planilha a compensacao vem
  antes da presuncao; no slide o limite de 20% vem primeiro.
- **Rotulo trocado.** `Resultado do exercicio` vira `Receita com a venda dos bens
  da atividade rural`, e `Presuncao de 20%` vira `Limite de 20% sobre a receita
  bruta total`.
- **A corrente:** a presuncao e 20% do resultado do exercicio, e o imposto e
  27,5% do resultado tributavel. As duas continuam valendo apos a anonimizacao.

## Quebra se

- A leitura assumir tres anos, ou tentar descobrir contribuinte nesta aba.
- Celula vazia virar zero.
- A validacao da presuncao usar a base das abas de cenario, que e a receita.
