Origem: WP e apresentacao do Grupo Bahia Potrich, anonimizados.
Nomes trocados por ficticios e todo valor em reais multiplicado por 0.7134.
O fator unico preserva as validacoes: soma de bloco, percentuais, presuncao de
20% e aliquota de 27,5% continuam fechando.

# Comentarios

Aba `Cenario 01 (PFxPJ)`, bloco de comentarios. Os textos sao os do modelo,
encurtados; nao ha dado de cliente neles.

## O que este caso prova

- **Um marcador `[a]` na coluna A abre um item**, a coluna B da mesma linha traz o
  tributo, e as linhas seguintes sem marcador sao o texto dele.
- **Uma linha de texto por registro, e nao um texto concatenado.** No slide cada
  uma e um marcador de lista, e a ordem importa: e por isso que existe `ordem`,
  reiniciando em 1 a cada tributo.
- **O percentual de parceria agricola ocupa um marcador e NAO e comentario.** E
  premissa, com valor na coluna C, e serve outro slide. Se entrasse, o slide
  ganharia uma caixa de texto vazia com um numero perdido dentro.
- **Marcador sem rotulo sai fora.** O `[d]` da linha 20 existe no modelo sempre, e
  o estudo preenche os que usa.
- **O dois-pontos do rotulo nao vai para o banco.** `IRPF:` na planilha vira
  `IRPF` no campo tributo.

## Quebra se

- A leitura juntar as linhas de um tributo num texto so.
- O percentual de parceria virar comentario.
- Um marcador vazio gerar registro.
