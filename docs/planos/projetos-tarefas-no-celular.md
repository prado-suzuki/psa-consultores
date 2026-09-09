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
| 1 | ✅ **A porta de entrada** | Duas visões já funcionam e ela não as vê | `PainelTarefas` | P |
| 2 | ✅ **A moldura do topo** | Mata 1 dos 3 scrollbars, e vale nas 7 abas | `TaskKPICards`, `TaskFilters` | P |
| 3 | ✅ **Tabela** | Quebra pior que todas, e é o remédio menor | `TaskTable` | P |
| 4 | ✅ **O detalhe da tarefa** | É o fim do caminho de leitura, e quebra lá | `TaskModal` | P |
| 5 | **Lista** | É a visão de trabalho dela no desktop | `ProjetosTarefasList` | G |
| 6 | **Kanban** | Rende leitura, não operação — ver a ressalva | `TaskKanban` | M |
| 7 | **Calendário** | Uso pontual no celular | `TaskCalendar` | M |
| 8 | **Gantt** | O mais caro e o menos provável no telefone | `GanttChart` | G |

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
para ler de imediato, e se as duas abas boas estão à mão.

**Achado na validação, consertado no mesmo dia:** o cabeçalho da "Hoje" (data por extenso
+ "N pendentes" + "N concluídas") passa de 450px e não quebrava, então "concluídas" era
**cortado** na borda — e o `<main>` é `overflow-hidden`, então não havia nem rolagem para
alcançá-lo. `flex-wrap` no cabeçalho e a data um degrau menor abaixo de `sm`.

**Decidido em 09/09: fica na "Hoje".** Foi levantado que a "Hoje" só lista tarefa com
vencimento no dia, e que na tela dela naquele momento havia 41 em "A Fazer" e nenhuma
vencendo — ou seja, o gestor cai em "Nenhuma tarefa para hoje. Aproveite!". As alternativas
oferecidas foram a "Futuras" (vencimento futuro por semana) e, mais adiante, a Tabela do
mês. A escolha dela foi manter a "Hoje" como está. Não reabrir sem pedido: dia sem
vencimento **é** informação para quem só quer olhar.

**✅ FEITO em 09/09/2026.** `telaEstreita()` saiu de dentro do controlador da barra lateral
e virou export de `hooks/use-mobile`, ao lado do `MOBILE_BREAKPOINT` — as duas decisões que
dependem da largura no primeiro quadro (qual estado a barra nasce, em que visão o painel
abre) passam a ler o mesmo número. `max-md:order-first` nas duas abas; a ordem no DOM não
mudou.

---

## Fase 2 — A moldura do topo

Cresceu de "a régua" para "a moldura" no meio da execução: a Patrícia reduziu a janela e
apontou a faixa de ações. São os dois blocos que ficam **acima** das abas e valem para as
sete visões, então validam-se na mesma olhada.

### A régua de status

Sete status a `min-w-[120px]`: **840px** pedidos, com `overflow-x-auto` própria. É a
primeira das três rolagens horizontais do print, e ela aparece **em todas as sete abas**.

No celular a régua vira grade: duas colunas até `sm`, três de `sm` a `md`, e a linha de
sempre a partir de `md`. A sétima célula ocupa a linha inteira — 7 não divide nem por 2 nem
por 3, e "Concluído" sozinho num canto lê como célula faltando.

A alternativa — tirá-la do celular, já que o Kanban repete a mesma contagem em cima de cada
coluna — fica registrada e **não** é o que se fez: a régua é a única leitura de "como está o
mês" que existe fora do Kanban.

### A faixa de busca e ações

Relato dela em 09/09: *"o botao de filtro buscar tarefa criar projeto e nova tarefa nao
estao harmoniosos"*. E não estavam: em ~515px de janela a linha saía como busca +
"Criar Projeto" + "Nova tarefa" na primeira linha, e "Filtros" **órfão** na segunda.

A causa não era o container de fora, era o `flex-wrap` de **dentro** do `TaskFilters`:
quebrando ali, o "Filtros" descia sozinho enquanto a busca continuava espremida na primeira
linha, entre ele e os dois botões. O conserto é o `TaskFilters` tomar a linha inteira
abaixo de `md` (`w-full`), o que empurra as ações para a linha de baixo, onde o `ml-auto`
que já existia as alinha à direita. Resultado: busca + "Filtros" em cima, as duas ações
embaixo.

`md:w-auto md:flex-1`, e **não** `basis-full`: `flex-1` é o atalho de `flex: 1 1 0%`, que
carrega o próprio flex-basis e venceria um `basis-full` por ordem de folha. Largura não
entra nessa disputa.

**Validar:** o scrollbar de cima do print tem de ter sumido em qualquer aba, e a linha de
busca/ações tem de sair em dois blocos limpos, sem botão órfão.

**✅ FEITO em 09/09/2026.** `TaskKPICards.test.tsx` trava as duas coisas que não dão erro de
build: a régua não pode ter `overflow-x-auto` sem prefixo, e a última célula tem de fechar
a linha.

---

## Fase 3 — Tabela

Ela quebra por um motivo diferente de todas as outras, e é o que a torna a pior das sete:
as oito colunas pedem **1.260px** em `w-[...]`, mas a `<Table>` **não tem largura mínima**.
`width` num `<th>` sem `table-layout: fixed` é sugestão, não regra — então o navegador
aceita e **comprime** para 45px por coluna. É a quebra letra-por-linha do Feed. Rolar de
lado seria melhor do que o que acontece hoje.

Largura mínima real na tabela, para ela **rolar** em vez de comprimir. É exatamente o que a
tabela de Clientes já faz (`min-w-[1100px]` + o contêiner `overflow-auto` do `ui/table`).

Fase pequena de propósito: **não** é aqui que a tabela vira cartão. Primeiro ela para de
esmagar; se depois disso ainda não servir, isso é outra fase, com o desenho decidido junto.

**Validar:** a tabela tem de ficar legível e arrastar de lado, sem palavra quebrada no meio.

**✅ FEITO em 09/09/2026.** Uma linha: `min-w-[1260px]` (a soma exata dos oito `w-[...]`)
mais `scrollbar-thin` no contêiner.

Duas correções ao que este plano dizia:

- **o `<div>` de fora podia continuar `overflow-hidden`.** O contêiner que rola é o do
  `ui/table`, filho dele: um pai `overflow-hidden` não impede filho com `overflow-auto` de
  rolar. Melhor assim, inclusive — é o que mantém a barra do mês fora da rolagem, parada,
  em vez de ela sair da tela junto com as colunas;
- **chips de leitura em vez dos dois `Select` foram tentados e desfeitos.** Os seletores de
  status (144px) e prioridade (112px) somam 256px, mas de **1.260** — 8%, que não muda se
  ela rola ou não. Em troca, duplicavam DOM e texto por linha, e como o vitest roda com
  `css: false` os dois elementos "existem" em teste, o que transforma qualquer
  `getByText` de status em "found multiple elements". Não vale.

  **O que sobra do experimento, e vale como fase própria:** um dropdown de 144px numa linha
  que se arrasta de lado é armadilha de toque — puxar para rolar abre o seletor. Vale para a
  Tabela e para a Lista (que tem o mesmo `Select` de status, ver fase 5). Não é largura, é
  gesto, então é outro assunto e outra fase. **Só abrir se a Patrícia apontar**, para não
  virar refatoração especulativa em cima de uma tela que ela usa no desktop.

---

## Fase 4 — O detalhe da tarefa

Não estava no plano de ontem: estava no "fora de escopo" como suspeita **não verificada**.
Verificada em 09/09, e com mecanismo — o crédito é da sessão que mexia nos modais, que
mediu o `tailwind-merge` do `TaskModal` e descreveu a conta. Confirmado aqui de forma
independente, no fonte.

Importa porque é o **fim do caminho de leitura**: o gestor abre a tela, encontra "Hoje" ou
o Kanban, toca num cartão — e é aqui que ele lê o que está acontecendo, incluindo os
comentários. As sete visões podem estar todas boas e a leitura ainda quebrar no último
passo.

**O mecanismo.** No modo de edição o `DialogContent` recebe `h-[min(94vh,54rem)]` — altura
**fixa**, não teto — mais `overflow-hidden`, e o `lg:grid lg:grid-cols-[...]` só vale de
`lg` para cima. Abaixo de `lg` sobra o `grid` de **uma coluna** da primitiva, com duas
linhas: o formulário e o painel de comentários. O painel declara `min-h-[32rem]` (512px),
com `lg:min-h-0` que existe justamente para isso não acontecer no desktop — e nenhum
equivalente abaixo de `lg`.

A conta num telefone de 640px de viewport: altura do modal = `min(601px, 864px)` = 601px,
menos os 512px que os comentários exigem, sobram **~89px** para o formulário inteiro. O
`min-h-0 flex-1 overflow-y-auto` de dentro dele transforma isso numa fresta de 89px que
rola. Não corta — fica inutilizável, que é pior de diagnosticar.

E não é dívida da primitiva de dialog: o `max-h-[94vh]` e o `overflow-hidden` do
`TaskModal` vencem os da primitiva por `tailwind-merge`, então ele nunca sentiu a mudança
dela. É dívida de tela pequena, desta frente.

**O conserto que este plano previa estava errado, e a razão importa.** Ele dizia: tirar a
altura fixa, tirar o piso de 512px, deixar as duas linhas crescerem e o modal rolar de cima
a baixo. Só que o `OrgCommentsPanel` é `h-full` com a lista num `flex-1` que rola por
dentro — ele **preenche** altura, não a produz. Sem altura definida na linha, ele colapsa a
zero, e era exatamente para isso que o `min-h-[32rem]` existia. Tirar o piso sem mais nada
não conserta: troca a fresta do formulário pelo desaparecimento da Atividade.

**O conserto que foi feito:** manter a altura fixa e **repartir** o que ela dá.
`max-lg:grid-rows-[minmax(0,3fr)_minmax(0,2fr)]` no `DialogContent` divide os 601px em ~360
para o formulário e ~240 para a Atividade. As duas linhas recebem altura **definida**, que é
o que o `h-full` das duas precisa, e cada uma rola por dentro. O piso de 512px sai porque a
grade passou a dar a altura. O desktop não muda: de `lg` para cima continua o grid de duas
colunas.

`minmax(0, …)` nas duas linhas, e não `3fr_2fr` seco: sem o mínimo zero, linha de grade não
encolhe abaixo do conteúdo dela e o rateio não acontece.

Conferido que a classe arbitrária **sobrevive ao build** — `@media not all and
(min-width:1024px){…grid-template-rows:minmax(0,3fr) minmax(0,2fr)}`. É a checagem que o
`duration-[120ms]` e o `ease-[…]` ensinaram a fazer: valor arbitrário ambíguo sai do bundle
sem erro nenhum.

**O rateio 3fr/2fr foi reprovado na validação, e a aba entrou no mesmo dia.** Os ~240px de
Atividade são comidos pelo cabeçalho dela e pelo compositor de comentário (barra de
formatação + campo + Publicar, ~140px): sobrava uma faixa que não mostrava lista nenhuma.
Nas palavras dela: *"atividade ficou fixo e o restante rolando"*, e depois *"eu não consigo
ver o que tem em atividade"*.

**O desenho que ficou:** abaixo de `lg`, uma metade por vez, com o modal INTEIRO — seletor
"Tarefa" | "Atividade". Três coisas que isso obrigou:

- **a caixa deixa de ser grade e vira coluna flexível** (`max-lg:flex max-lg:flex-col`).
  Com grade seria preciso declarar de antemão qual linha estica, e isso muda a cada troca de
  aba; em coluna, quem estica diz por si (`flex-1` na metade visível, e a escondida é
  `display:none`, logo nem participa). O desktop segue em `lg:grid` com duas colunas;
- **os dois lados ficam MONTADOS**, e quem sai é escondido por CSS. Desmontar o formulário
  perderia o que estivesse digitado ao trocar de aba — travado em teste;
- **a `ModalTopBar` saiu do corpo que rola** e subiu para dentro do `<form>`, acima do
  seletor. Pedido dela: *"só salvar que tinha que estar pra cima, e tarefa e atividade
  embaixo"* — a moldura do modal (Salvar, fechar) vem primeiro, a navegação do conteúdo
  depois. Ela era `sticky top-0` **dentro** da área de rolagem, e em tela estreita sumia.
  Ficou dentro do `<form>` de propósito: o Salvar é `type="submit"` e depende disso — foi o
  que evitou ter de dar `id` ao formulário e `form=` ao botão.

Isso tirou a prop `actions` do `TaskEditHeader`, que existia só para repassar os botões
para a barra.

**Duas regiões de rolagem seguem existindo**, uma em cada aba, e agora está certo: cada uma
recebe o modal inteiro. Uma região só exigiria o `OrgCommentsPanel` parar de rolar por
dentro, e ele é compartilhado.

Ajuda aqui uma mudança que veio de fora desta frente (commit `106ed744`): o editor de
descrição perdeu o `maxHeight` próprio, que desenhava uma segunda barra de rolagem encostada
na primeira. Numa coluna única que rola inteira, descrição sem teto é exatamente o que se
quer — então essa mudança e esta fase empurram para o mesmo lado.

**Se criar modal novo nesta frente:** `max-h-none`, e um corpo que role por dentro. Há um
teste varrendo o fonte (`src/components/ui/dialog.regua.test.ts`) que cobra isso de quem
declara altura própria sem teto. Ele lê só o className do próprio `DialogContent` e nunca
olha filho, então o `min-h` de um filho não é cobrado por ele — este conserto é desta frente.

**Validar:** abrir uma tarefa pelo celular, ver o Salvar e o fechar no topo com as abas
logo abaixo, e conseguir ler os comentários na aba Atividade.

**✅ FEITO em 09/09/2026.** O contrato ficou travado nos dois lados, em arquivos diferentes:
`TaskModal.test.tsx` cobra o rateio das linhas e a ausência do piso; a asserção nova em
`OrgCommentsPanel.test.tsx` cobra que o painel é `h-full` e rola por dentro — que é a razão
pela qual o rateio precisa existir. O painel é dublado no teste do modal, então a asserção
sobre a classe dele só valeria no arquivo dele.

---

## Fase 5 — Lista

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

Esta fase herdou trabalho de outra frente. O `lista-de-tarefas-texto-e-prazo.md` (feedback
do Welber, 09/09) pôs tooltip nas quatro linhas da grade e fez o título caber em duas
linhas no desktop. Ao virar cartão, **preserve as duas coisas**: no telefone não existe
passar o mouse, então cartão que corta o título perde o texto sem saída nenhuma.

**Validar:** dá para saber o status e o responsável de uma tarefa sem rolar de lado.

---

## Fase 6 — Kanban

Sete colunas de `w-[340px]` fixos mais as folgas: **2.476px**. Na tela dela cabe uma coluna
e uma tira da seguinte. A altura é `h-[calc(100vh-300px)]`, e num iPhone com a barra do
navegador sobram uns dois cartões visíveis.

No celular: **uma coluna por vez**, escolhida por um seletor de status acima do quadro; as
setas de "anterior/próximo" andam entre os status. A alternativa considerada — colunas a
`78vw`, com a próxima "espiando" — perde para essa, porque um cartão de tarefa a 78vw ainda
é estreito e o gesto de arrastar de lado disputa com a rolagem vertical dos cartões.

**Arrastar no toque: decidido em 09/09, não fazer.** O `draggable` +
`onDragStart`/`onDrop` do HTML5 (`TaskKanbanCard.tsx`) **não dispara em toque** no iOS nem
no Android, e o projeto não tem biblioteca de arrastar. Levada a limitação à Patrícia, a
resposta fecha a questão: *"é só p visualizar msm, o gestor quer só olhar mas ele quer ver
pelo celular"* — o celular desta tela é **superfície de leitura**, e é por isso que os
ajustes existem.

Então esta fase entrega um Kanban que se **lê**, e isso é o suficiente. Não abrir frente de
biblioteca de DnD com sensor de ponteiro por conta disso. O caminho de escrita continua
existindo para quem precisar: tocar no cartão abre a tarefa e o status se muda lá dentro.

E a decisão vale para o plano inteiro, não só para esta fase: **em tela estreita, o que
manda é ler**. Onde um controle de edição estiver disputando largura com a informação
(o `Select` de status de 138px na Lista, a coluna de ações, o cursor de arrastar), no
celular a informação ganha e o controle recua.

**Validar:** dá para ler a coluna inteira de um status e trocar de status sem rolar de lado.

---

## Fase 7 — Calendário

`grid-cols-7` sem largura mínima: divide o que tem por sete, sempre. Na tela dela dá **51px
por dia** — cabe o número, não cabe nome de tarefa nenhum. E as células têm `min-h-[80px]`,
então a tela fica alta e vazia ao mesmo tempo.

No celular, **uma semana por vez**, com as sete colunas virando sete linhas: cada dia uma
faixa, com as tarefas dele dentro. Mês inteiro em grade de sete colunas não existe em
358px, e fingir que existe é o que produz o 51px.

**Validar:** dá para ver o que vence nesta semana sem abrir tarefa por tarefa.

---

## Fase 8 — Gantt

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

- **Arrastar cartão por toque** (biblioteca de DnD). Ver a ressalva da fase 6.
- **A barra de visões** (`TabsList`) continua rolando de lado. Sete abas não cabem em 358px
  e rolagem de abas é o padrão certo — o problema do print era ser *a segunda de três*, e
  as fases 2 e 6 tiram as outras duas.
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
