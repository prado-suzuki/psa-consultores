Origem: WP e apresentacao do Grupo Bahia Potrich, anonimizados.
Nomes trocados por ficticios e todo valor em reais multiplicado por 0.7134.
O fator unico preserva as validacoes: soma de bloco, percentuais, presuncao de
20% e aliquota de 27,5% continuam fechando.

# Cabecalho do estudo

## O que este caso prova

- **Rotulo e valor na mesma celula.** `B4` traz `Data-base: 2026 a 2028` inteiro e
  `B7` traz `Preparado por: Monica Prado`. O corte e no dois-pontos, e nao numa
  celula vizinha.
- **Os anos do estudo saem da data-base**, que e o unico lugar do modelo onde o
  periodo esta escrito.
- **Duas abas, um registro.** O crescimento anual e o ano-base vem da
  `DRE Projetada`, que nao e lida como aba: as abas de cenario puxam a receita de
  la por formula e ja chegam com o numero calculado.

## Quebra se

- A leitura procurar o valor na celula ao lado do rotulo.
- O ano-base for confundido com o primeiro ano do estudo. Sao 2025 e 2026.
