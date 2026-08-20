# ALE-5 — Aviso quando o cliente não tem projeto de chamados

Delegar um chamado passa a **dizer na tela** quando a tarefa não nasceu, e a tarefa que
nasce passa a **aparecer no painel sem recarregar a página**.

## O que passou a acontecer na tela

| Situação, ao delegar um chamado | O que a tela faz |
|---|---|
| Cliente **tem** projeto de canal de chamados | Nada de novo. Toast de "Agente atribuído", como antes. A tarefa criada pelo trigger aparece no painel de Tarefas sem recarregar a página. |
| Cliente **não tem** projeto de canal de chamados | Aviso amarelo no topo da tela, **nomeando o cliente**: o chamado foi delegado e nenhuma tarefa foi criada. A delegação continua valendo — nada é bloqueado. |
| Cliente do chamado está **em branco** | Nenhum aviso. Sem cliente não há projeto a conferir. |
| **Remover** a atribuição (voltar para "Não atribuído") | Nenhum aviso, e o que estava na tela sai. Desatribuir não gera tarefa. |
| A consulta do projeto **falha** (permissão, rede) | Aviso vermelho, dizendo que não foi possível conferir. Nunca aparece como "cliente sem projeto": são coisas diferentes. |

## Onde

Na tabela de Chamados, no seletor "Responsável" — a mesma tela montada em **quatro
lugares**, e o aviso vale nos quatro: `/gestao/chamados`, `/equipe/board/chamados`,
`/equipe/tax/gerencial/chamados` e `/equipe/osg/gerencial/chamados`.

Delegar pelo **detalhe do chamado** ou pela tela **Chamados da Equipe** não mostra o aviso.
Nesses dois caminhos a tarefa continua nascendo e continua aparecendo sem recarregar — só o
aviso não aparece.

## Para conferir de olho

Hoje, em produção, **nenhum produto está marcado como canal de chamados**. Enquanto for
assim, o aviso aparece em **toda** delegação, para qualquer cliente. Isso é o esperado: o
aviso está certo, o cadastro é que falta.

Depois de marcar o produto **`01-CHA — Canal de Chamados`**, o cenário medido em produção é:

| O que conferir | Números de produção |
|---|---|
| Clientes com chamado delegado | **11** |
| Deles, **sem** projeto de canal → o aviso deve aparecer, com o nome do cliente | **7** |
| Deles, **com** projeto de canal → nada deve aparecer | **4** |
| Clientes com **mais de um** projeto de canal | **nenhum** — 9 projetos, 9 clientes distintos |

Confira também, num cliente que **tem** o projeto: delegue o chamado e abra o painel de
Tarefas **sem recarregar a página**. A tarefa "Chamado: …" tem de estar lá.

## Pendências

| Pendência | Dono |
|---|---|
| Marcar `is_canal_chamados` no produto `01-CHA — Canal de Chamados`, em produção. Sem isso o aviso aparece em toda delegação e nenhuma tarefa é criada. | Alexandre |
| Não existe hoje controle na tela de Cadastro de Categorias para pôr essa marca — nenhum arquivo do front lê ou escreve a coluna. Marcar exige pedir a escrita ao Lovable, ou a tarefa que criar o controle. | Alexandre / próxima sprint |
| `GestaoChamados.tsx` está com 786 linhas, acima do teto de 600. Refatorar a tela estava fora do escopo desta tarefa. | próxima sprint |
