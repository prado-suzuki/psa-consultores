Origem: WP e apresentacao do Grupo Bahia Potrich, anonimizados.
Nomes trocados por ficticios e todo valor em reais multiplicado por 0.7134.
O fator unico preserva as validacoes: soma de bloco, percentuais, presuncao de
20% e aliquota de 27,5% continuam fechando.

# Resumo da Tributacao, PFxPJ contra PJxPJ

## O que este caso prova

- **A tabela do slide e o recorte direto da aba `Resumo`**, linha por linha, na
  mesma ordem, incluindo as linhas em branco entre blocos.
- **O total de cada bloco e a soma das linhas dele.** Pessoa Fisica do Cenario
  Atual e IRPF mais CBS mais INSS.
- **O Total geral e Pessoa Fisica mais Lucro Presumido mais Lucro Real.**
- **Conversao de unidade:** a celula `Resumo!D34` guarda a fracao -0,2443 e o
  slide mostra `(24%)`. Percentual negativo sai entre parenteses, sem sinal.
- **Zero sai como traco.** A CBS de 2026 e zero porque o tributo ainda nao
  existe naquele ano, e no slide sai `-`.
- **Bloco zerado continua aparecendo.** Lucro Real no Cenario Atual e todo zero e
  as linhas continuam na tabela.

## Quebra se

- A importacao casar por numero de linha em vez de rotulo.
- O somatorio do bloco for lido da planilha em vez de conferido.
- O percentual for tratado como numero inteiro em vez de fracao.
