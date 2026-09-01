Origem: WP e apresentacao do Grupo Bahia Potrich, anonimizados.
Nomes trocados por ficticios e todo valor em reais multiplicado por 0.7134.
O fator unico preserva as validacoes: soma de bloco, percentuais, presuncao de
20% e aliquota de 27,5% continuam fechando.

# Transferencia da Atividade Rural

## O que este caso prova

- **A ordem muda entre a planilha e o slide.** Na planilha, `Compensacao de
  prejuizo` esta na linha 118 e `Presuncao de 20%` na 120. No slide, o limite de
  20% vem primeiro (L12) e a compensacao depois (L14). Importar na ordem da
  planilha produz um slide errado.
- **Rotulo trocado.** `Resultado do exercicio` na planilha vira `Receita com a
  venda dos bens da atividade rural` no slide, e `Presuncao de 20%` vira `Limite
  de 20% sobre a receita bruta total`.
- **Linha do slide que nao existe na planilha.** `Despesas de custeio e
  investimento total`, L9, sai sempre como traco. Nao ha origem para ela.
- **Linhas de titulo sem dado.** L4 e L7 sao cabecalhos internos da tabela.
- **Valor de texto.** `Opcao pela forma de apuracao` traz `Presumido`, nao numero.
- **A corrente aritmetica:** presuncao e 20% do resultado, e o imposto e 27,5% da
  presuncao. As duas continuam valendo depois da anonimizacao.

## Quebra se

- A importacao preservar a ordem da planilha no slide.
- O tratamento de tipo assumir numero em toda celula.
- A linha sem origem for omitida em vez de sair como traco.
