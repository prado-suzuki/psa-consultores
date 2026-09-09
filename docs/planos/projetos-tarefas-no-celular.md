# Projetos e tarefas no celular — plano por tela, uma validação por fase

**Aberto em 09/09/2026.** Diagnóstico completo, com a régua de larguras desenhada em
escala: <https://claude.ai/code/artifact/b75ad47b-0bfd-49af-aa0f-95c58b7f6149>

Antecedente: a barra lateral virou gaveta no celular em 08/09 (commit `a58bc807`, e
`geral/sidebar-recolhe-em-tela-larga.md` §"Em tela estreita a barra troca de papel"). Isso
devolveu a largura da viewport ao conteúdo. Este plano é o passo seguinte: o conteúdo em si.

## Uma tela, quatro rotas

`/equipe/tax/projetos/cadastro`, `/equipe/tax/projetos/tarefas`,
`/equipe/osg/projetos/cadastro` e `/equipe/osg/projetos/tarefas` montam **o mesmo**
`src/components/equipe/tarefas/PainelTarefas.tsx`. Consertar uma conserta as quatro — e é
por isso que este plano fala em *visão* (aba), não em rota.

## Como este plano roda

Uma fase = um commit = um pedido de validação. **Ao fechar cada fase o agente para e pede
para a Patrícia olhar no celular antes de começar a próxima** — é a instrução dela, de
09/09. Não emendar duas fases num commit: o valor de cada uma é ela poder dizer "essa ficou
boa" ou "essa não" sobre uma coisa só.

## Prioridades

A ordem sai de duas perguntas: *o que ela faz no celular todo dia* e *quanto custa*. Não
sai da gravidade do defeito — o Gantt é o mais quebrado e é o último, porque consultar
cronograma no telefone é o caso menos provável de todos.

| # | Fase | Por que aqui | Arquivo principal | Tamanho |
|---|---|---|---|---|
| 1 | **A porta de entrada** | Duas visões já funcionam e ela não as vê | `PainelTarefas` | P |
| 2 | **A régua de status** | Mata 1 dos 3 scrollbars, e vale nas 7 abas | `TaskKPICards` | P |
| 3 | **Tabela** | Quebra pior que todas, e é o remédio menor | `TaskTable` | P |
| 4 | **Lista** | É a visão de trabalho dela no desktop | `ProjetosTarefasList` | G |
| 5 | **Kanban** | Rende leitura, não operação — ver a ressalva | `TaskKanban` | M |
| 6 | **Calendário** | Uso pontual no celular | `TaskCalendar` | M |
| 7 | **Gantt** | O mais caro e o menos provável no telefone | `GanttChart` | G |

---

## Fase 1 — A porta de entrada

**O achado que manda nesta fase:** "Hoje" e "Futuras" são listas de cartões, sem largura
fixa, com texto que corta em reticências. **Já funcionam no celular hoje, sem uma linha de
código.** E são a sexta e a sétima aba, fora da tela à direita, enquanto o painel abre
sempre na "Lista" (`useState('list')`), que é a que menos cabe.

1. No celular, o painel abre em **"Hoje"**. No desktop segue abrindo na "Lista" — a
   decisão de qual visão serve é da largura, não da preferência.
2. No celular, "Hoje" e "Futuras" vêm **primeiro** na barra de abas, por `order` do CSS.
   Ordem no DOM não muda, então o foco por teclado segue a ordem de sempre.

Nada de esconder as outras cinco: visão que não caiu bem ainda é melhor que visão que
desapareceu sem explicação.

**Validar:** abrir `/equipe/tax/projetos/tarefas` no celular e ver se cai numa tela que dá
para usar de imediato, e se as duas abas boas estão à mão.

---

## Fase 2 — A régua de status

Sete status a `min-w-[120px]`: **840px** pedidos, com `overflow-x-auto` própria. É a
primeira das três rolagens horizontais do print, e ela aparece **em todas as sete abas**.

No celular a régua vira grade de chips em duas linhas, sem rolagem nenhuma. A alternativa
— tirá-la do celular, já que o Kanban repete a mesma contagem em cima de cada coluna — fica
registrada e **não** é o que se propõe: a régua é a única leitura de "como está o mês" que
existe fora do Kanban.

**Validar:** o scrollbar de cima do print tem de ter sumido, em qualquer aba.

---

## Fase 3 — Tabela

Ela quebra por um motivo diferente de todas as outras, e é o que a torna a pior das sete:
as oito colunas pedem **1.260px** em `w-[...]`, mas a `<Table>` **não tem largura mínima**.
`width` num `<th>` sem `table-layout: fixed` é sugestão, não regra — então o navegador
aceita e **comprime** para 45px por coluna. É a quebra letra-por-linha do Feed. Rolar de
lado seria melhor do que o que acontece hoje.

Largura mínima real na tabela, para ela **rolar** em vez de comprimir. É exatamente o que a
tabela de Clientes já faz (`min-w-[1100px]` + o contêiner `overflow-auto` do `ui/table`), e
o `<div>` de fora precisa deixar de ser `overflow-hidden` para a rolagem existir.

Fase pequena de propósito: **não** é aqui que a tabela vira cartão. Primeiro ela para de
esmagar; se depois disso ainda não servir, isso é outra fase, com o desenho decidido junto.

**Validar:** a tabela tem de ficar legível e arrastar de lado, sem palavra quebrada no meio.

---

## Fase 4 — Lista

A grade tem sete colunas travadas em **1.200px**
(`grid-cols-[minmax(320px,1fr)_150px_180px_130px_140px_160px_44px]`). No celular cabe a
primeira — o título. Status, responsável, prazo e progresso ficam todos fora. E a
hierarquia OS → projeto → tarefa → subtarefa usa recuo em pixels, que come largura a cada
nível.

No celular cada tarefa vira **um cartão**: título na primeira linha; status, responsável e
prazo na segunda, como chips. A hierarquia deixa de ser recuo e passa a ser aninhamento
visível (o projeto como cabeçalho do grupo, a subtarefa com um traço à esquerda) — recuo em
px não sobrevive a 358px de tela.

É a fase grande do plano: 597 linhas, e a grade é usada por quatro tipos de linha (grupo de
OS, projeto, tarefa, subtarefa). Vale escrever teste de caracterização antes, como pede o
AGENTS.md §"Teste de caracterização primeiro" — o comportamento no desktop **não** muda.

**Validar:** dá para saber o status e o responsável de uma tarefa sem rolar de lado.

---

## Fase 5 — Kanban

Sete colunas de `w-[340px]` fixos mais as folgas: **2.476px**. Na tela dela cabe uma coluna
e uma tira da seguinte. A altura é `h-[calc(100vh-300px)]`, e num iPhone com a barra do
navegador sobram uns dois cartões visíveis.

No celular: **uma coluna por vez**, escolhida por um seletor de status acima do quadro; as
setas de "anterior/próximo" andam entre os status. A alternativa considerada — colunas a
`78vw`, com a próxima "espiando" — perde para essa, porque um cartão de tarefa a 78vw ainda
é estreito e o gesto de arrastar de lado disputa com a rolagem vertical dos cartões.

**Ressalva que muda o valor desta fase, e a Patrícia precisa saber antes:** arrastar cartão
usa `draggable` + `onDragStart`/`onDrop` do HTML5 (`TaskKanbanCard.tsx`), que **não dispara
em toque** no iOS nem no Android, e o projeto não tem biblioteca de arrastar. Ou seja:
mesmo com o quadro cabendo, **mover cartão arrastando não vai funcionar no celular**, e
isso não é largura — é a API. O caminho que já existe continua valendo: tocar no cartão
abre a tarefa, e o status se muda lá dentro. Fazer o arrastar funcionar no toque é frente
separada (biblioteca de DnD com sensor de ponteiro), e é bem maior que esta fase.

Então esta fase entrega um Kanban que se **lê** no celular, não um que se **opera**
arrastando. Se ler não bastar, o que fecha o caso é o arrastar por toque — e aí a decisão é
sobre a biblioteca, não sobre a largura.

**Validar:** dá para ler a coluna inteira de um status e trocar de status sem rolar de lado.

---

## Fase 6 — Calendário

`grid-cols-7` sem largura mínima: divide o que tem por sete, sempre. Na tela dela dá **51px
por dia** — cabe o número, não cabe nome de tarefa nenhum. E as células têm `min-h-[80px]`,
então a tela fica alta e vazia ao mesmo tempo.

No celular, **uma semana por vez**, com as sete colunas virando sete linhas: cada dia uma
faixa, com as tarefas dele dentro. Mês inteiro em grade de sete colunas não existe em
358px, e fingir que existe é o que produz o 51px.

**Validar:** dá para ver o que vence nesta semana sem abrir tarefa por tarefa.

---

## Fase 7 — Gantt

`LARGURA_DO_NOME = 300` fixo mais a linha do tempo do mês (30 × 44px = 1.320px):
**1.620px**. A coluna do nome sozinha ocupa 84% da tela dela, então nome e barra nunca
aparecem juntos — que é a única coisa que o Gantt existe para mostrar.

No celular o nome sai da coluna e vira **cabeçalho acima** da barra, e a linha do tempo
recebe a largura toda. Mexe no `GanttChart`, que é compartilhado com o Gantt da sprint
(`sprint-detalhes/GanttTab.tsx`) — então a mudança tem de ser por breakpoint, não por
troca de desenho, e o Gantt da sprint precisa ser conferido junto.

**Validar:** dá para ver de quem é a tarefa e onde ela cai no mês na mesma olhada.

---

## Fora de escopo, de propósito

- **Arrastar cartão por toque** (biblioteca de DnD). Ver a ressalva da fase 5.
- **A barra de visões** (`TabsList`) continua rolando de lado. Sete abas não cabem em 358px
  e rolagem de abas é o padrão certo — o problema do print era ser *a segunda de três*, e
  as fases 2 e 5 tiram as outras duas.
- **`TaskModal` em tela pequena.** Já é responsivo (`w-[calc(100vw-1rem)]`, `sm:grid-cols-2`,
  `lg:grid` só no desktop). O `min-h-[32rem]` do painel de comentários dentro de um
  `max-h-[94vh] overflow-hidden` é suspeito e **não foi verificado** — se a fase 1 puser a
  Patrícia usando a tela no telefone, isso aparece rápido e vira fase própria.
- **`useTelaDeTrabalhoLargo()`** nestas páginas. Continua declarado e está certo: no celular
  o hook não recolhe nada (a gaveta já está fora do caminho), e no desktop segue valendo.

## Números

Medidas lidas do código em 09/09/2026, não estimadas. Largura útil de conteúdo num aparelho
de 390px: **358px** (o layout dá `p-4` de cada lado).

| Visão | Pede | De onde vem |
|---|---|---|
| Kanban | 2.476px | 7 × `w-[340px]` + 6 × `gap-4` |
| Gantt (mês) | 1.620px | `LARGURA_DO_NOME` 300 + 30 × 44px |
| Tabela | 1.260px | as 8 colunas somadas — pedidas, nunca respeitadas |
| Lista | 1.200px | `min-w-[1200px]` da grade |
| Régua de status | 840px | 7 × `min-w-[120px]` |
| Calendário | — | `grid-cols-7` sem mínimo |
| Hoje · Futuras | — | cartões, sem largura fixa |
