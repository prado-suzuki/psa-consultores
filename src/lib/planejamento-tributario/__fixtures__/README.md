# Fixtures da PT-01

31/08/2026. Acompanham o `PT-01-mapa-do-wp.md`.

Três casos, cada um numa pasta com três arquivos:

| Arquivo | O que é |
|---|---|
| `entrada.xlsx` | o recorte da planilha, com as abas e os endereços de célula reais do modelo |
| `esperado.json` | o que a leitura deve produzir, e como o slide deve sair formatado |
| `README.md` | o que aquele caso prova, e o que quebra se falhar |

| Caso | Cobre |
|---|---|
| `resumo-pfxpj-x-pjxpj` | a tabela do slide de Resumo da Tributação, três cenários lado a lado |
| `transferencia-rural` | o bloco de apuração do IRPF e o slide de Transferência da Atividade Rural |
| `dre` | a DRE projetada e a tabela do slide de Premissas |

## Por que a entrada é xlsx de verdade

Ler a planilha é parte do que a PT-02 vai fazer: string embutida, célula vazia
contra célula com zero, número contra texto. Uma entrada já mastigada em CSV não
testaria nada disso.

## Como a anonimização funciona

Origem: o WP e a apresentação do Grupo Bahia Potrich, que é o par completo mais
próximo do modelo novo. Os nomes viraram fictícios e **todo valor em reais foi
multiplicado por 0,7134**.

O fator único é o ponto. Ele preserva todas as validações do mapa: a soma de cada
bloco continua fechando, o percentual de redução fica idêntico, a presunção
continua sendo 20% do resultado e o imposto continua sendo 27,5% da presunção. Se
os números fossem mexidos um a um, as validações quebrariam e a fixture não
serviria para nada.

Para gerar outro caso, use a mesma técnica: recorte o bloco, troque os nomes,
escolha um fator e aplique em tudo.

## O elo entre dois casos

O imposto de 2026 na fixture de transferência (**1.014.178,02**) é o mesmo valor
que aparece como IRPF do Cenário 02 na fixture de resumo. É a mesma corrente do WP
real, onde `Cenário 02!D88` alimenta `Resumo!F18`. Se um dos dois casos mudar sem
o outro, os números deixam de bater e isso é sinal de erro.

## Conferência automática

As três fixtures passaram por 28 conferências: leitura do xlsx, soma de bloco,
total geral, percentual de redução, cadeia de presunção e imposto, ordem invertida
no slide de transferência, traço em célula sem dado, e a linha pai levando o total
dos custos.

## Uma pendência

A fixture da DRE coloca `(-) Máquinas/Equip. (aquisições)` dentro de Custos, e não
como linha separada de Investimentos. É o que faz o lucro do exercício sair
negativo. Depende da confirmação 2 em `perguntas-para-a-monica.md`. Se a resposta
for outra, essa fixture precisa ser refeita.
