# Serviços da OSG

No portal, **serviço é a tarefa-pai** do projeto. Este documento é o catálogo de
serviços dos produtos da OSG, já cadastrado: **40 serviços em 7 produtos**.

Onde ver e editar: **Cadastro de Categorias → Produtos × Serviços**.
A lista completa, produto por produto, está em `servicos-osg.xlsx`, ao lado deste arquivo.

## O catálogo

| # | Produto | Serviços | Numeração |
|---|---|---|---|
| 1 | Diagnóstico Societário, Sucessório e Governança | 5 | `1.01` – `1.05` |
| 2 | Estruturação Societária | 16 | `2.01` – `2.16` |
| 3 | Organização Societária | 5 | `3.01` – `3.05` |
| 4 | Planejamento Sucessório | 3 | `4.01` – `4.03` |
| 5 | Governança | 6 | `5.01` – `5.06` |
| 6 | Mediação de Conflitos | 1 | `6.01` |
| 7 | Constituição de Fundos de Investimento | 4 + 1 | `7.01` – `7.04`, mais o `2.01` |

O número do produto é a ordem de execução da OSG: diagnóstico, estruturação,
reorganização, sucessório, governança, mediação, fundos.

## Regras para não quebrar o catálogo

| Regra | O que ela obriga |
|---|---|
| Nome de serviço é **único no sistema todo** | Serviço usado por dois produtos é **um registro só**, vinculado duas vezes. Nunca cadastre o mesmo texto de novo — vincule o que existe. |
| **Não existe campo de ordem** | A sequência vem do número no começo do nome, porque as telas listam por nome. |
| O número usa **zero à esquerda** (`2.01`, não `2.1`) | Sem o zero, `2.10` aparece antes de `2.2` e o fluxo sai fora de ordem. |
| Serviço novo precisa de **cluster OSG** | Sem cluster, ele cai no grupo "sem cluster" e não aparece junto dos outros da área. |
| Cada serviço só é vinculado **uma vez por produto** | O banco recusa a repetição, então clicar duas vezes não duplica. |

## Dois pontos de atenção

| Item | Situação |
|---|---|
| `2.01.Diagnóstico Patrimonial` | É o mesmo serviço na Estruturação Societária e na Constituição de Fundos. Editar o nome muda nos dois. Na tela de Fundos ele aparece primeiro, antes dos `7.xx`. |
| `01-CHA — Canal de Chamados` | Não tem serviço, e é assim de propósito: a tarefa dele nasce sozinha quando o cliente registra o chamado. |

## Pendências

| Pendência | Dono |
|---|---|
| `01-CHA` precisa ser marcado como canal de chamados para o chamado delegado virar tarefa — hoje nada é gerado | Alexandre |
| Definir se um projeto tem **um** serviço ou **vários**: é isso que decide se as tarefas-pai nascem sozinhas na abertura do projeto | Patricia / Eduardo |
| `Mediação de Conflitos` ficou com um serviço só; o escopo do produto sugere mais | Patricia |
| `Estruturação Societária` e `Organização Societária` seguem como dois produtos, com nomes que descrevem o mesmo trabalho | Patricia |
