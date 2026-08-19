# Paleta por área: papéis de status e tons de tag

Cada área tem a **sua** paleta, e as paletas **conversam** entre si: mesma estrutura,
mesma temperatura, mesma rampa — muda a família de cor. Nenhuma área é neon, nenhuma
área empresta a identidade de outra.

> **"Conversar" já foi confundido com "ser igual".** Uma versão anterior tratava os quatro
> quentes (`ajuste`, `espera`, `neutro`, `alerta`) como vocabulário comum: valores
> praticamente idênticos nas três paletas — o `alerta` da Tax a 1° do da OSG, com **zero**
> ponto de luminosidade de diferença. Na tela isso não é "conversa", é a mesma paleta duas
> vezes: a legenda do Gantt da Tax e a da OSG viravam a mesma imagem e a usuária deixava de
> reconhecer a área pela cor. O que as paletas compartilham são os **papéis** e o
> **registro** (faixa de luminosidade, teto de saturação, contraste) — não os valores.

O componente **nunca** nomeia uma cor. Ele nomeia um **papel** (`bg-status-andamento`), e
quem resolve o valor é o tema da área aplicado no `<html>`. É isso que faz o módulo de
projetos e tarefas ser replicável: ao montá-lo numa área nova, ele chega sem cor própria e
veste a paleta de quem o hospeda.

## Os oito papéis

| Papel | Onde aparece | Ideia |
|---|---|---|
| `neutro` | Backlog, Planejado, prioridade Baixa, contador de tarefas em aberto | não começou / sem carga |
| `fila` | A Fazer, prioridade Média | entrou na fila |
| `andamento` | Em Progresso, projeto Ativo | está andando |
| `revisao` | Revisão, todo o fluxo de revisão do modal | passou para outra pessoa |
| `espera` | Pendente Cliente, projeto Pausado | travado por alguém de fora |
| `ajuste` | Em Ajuste, Cancelado, devolver para ajuste, prioridade Urgente | deu problema |
| `feito` | Concluído, aprovar revisão, contador de concluídas | acabou |
| `alerta` | pílula "sem horas" | pendência que exige ação agora |

Mais quatro tons categóricos — `tag-a` … `tag-d`. São **quatro** de propósito: oito matizes
davam à tag mais destaque que ao status da tarefa.

Eles servem a **dois** empregos, e é a soma dos dois contratos que fixa os valores:

1. o chip da tag de texto livre, sorteado por hash (`bg-tag-x/15 text-tag-x`) — daqui vem a
   exigência de 4,5:1 do tom sobre 15% dele mesmo, que é o que prende os quatro à faixa
   escura e, de tabela, limita o croma;
2. a **paleta categórica dos gráficos** (a constante `SERIES`, em
   `src/components/equipe/board/clientes-os/shared.ts`) — daqui vêm as exigências de marca de
   gráfico: croma OKLCH ≥ 0,10, luminosidade OKLCH em 0,43–0,77 e ΔE OKLab ≥ 15 na visão
   normal e ≥ 8 sob protanopia/deutanopia, para **todos** os pares. Quem mede é o
   `scripts/validate_palette.js` da skill `dataviz`, rodado contra a superfície **daquele**
   tema (o card do Board é branco; o da OSG é areia).

Foi o segundo contrato que desenhou a constelação atual. Sob deutanopia o dourado e o carmim
são a **mesma** cor (ΔE 0,4), e azul e roxo de luminosidade parecida também: dentro da faixa
de luminosidade que o chip permite sobram quatro classes, e os quatro tons são exatamente uma
de cada —

| Token | Classe | Base | Tax | OSG |
|---|---|---|---|---|
| `--tag-a` | verde da área, escuro | sábio 112 | teal 175 (a marca) | musgo 149 |
| `--tag-d` | quente da área, claro | vinho 339 | tijolo 7 | carmim 356 |
| `--tag-b` | frio da área, escuro | ardósia 211 | azul 223 | azul 218 |
| `--tag-c` | uva da área, clara | uva 289 | ameixa 298 | uva 306 |

A ordem das linhas é a de `SERIES`, e ela alterna quente/frio e claro/escuro de propósito: as
**âncoras da área vêm primeiro**, então um gráfico de duas ou três séries sai na cara da área,
e o frio e a uva — que não são cor de marca de ninguém — só aparecem na terceira e na quarta.

Duas consequências que valem registrar. O **dourado saiu** do conjunto categórico (ele
continua sendo o papel `alerta`, onde a cor significa estado e ninguém a compara com outra
série) e o **barro/taupe também** — um quase-neutro fica abaixo do piso de croma e lê como
cinza numa barra. E o teal `#0d9488` da Tax é o **único** tom do sistema abaixo do piso de
croma (0,083 contra 0,10): nesta faixa de luminosidade o arco 164–197 não tem croma para dar,
e clarear para ganhar croma derruba o contraste do chip abaixo de AA. Ficou o teal — a
identidade da área não se troca por 0,017 de croma —, e nos gráficos ele sempre vem com
rótulo direto ao lado.

Cada papel é um par: `--status-<papel>-soft` (fundo da pílula) e `--status-<papel>` (texto
sobre esse fundo, ponto, barra, e fundo de badge com texto branco). No Tailwind saem como
`bg-status-<papel>-soft`, `text-status-<papel>`, `bg-status-<papel>`.

## Três regras de leitura

1. **Dois papéis quaisquer se separam por matiz OU por luminosidade.** Não existe rampa de
   matiz único: os quatro verdes (`fila`, `andamento`, `revisao`, `feito`) ficam espaçados
   ao longo do arco verde da área, e os quatro quentes (`ajuste`, `espera`, `neutro`,
   `alerta`) ao longo do arco vermelho → amarelo **da área**. Onde dois vizinhos do mesmo
   arco ficam perto demais em matiz, quem separa é a luminosidade — com folga, não com 5
   pontos.

   > **A lição que custou uma refação.** A primeira versão desta paleta era uma rampa de
   > matiz único: `fila`/`andamento`/`revisao` no mesmo teal, variando só a luminosidade
   > (27% → 21% → 15%). Na pílula funciona, porque a cor vem acompanhada da palavra
   > "Revisão" e serve só de reforço. Na **bolinha de 8px** da legenda do Gantt
   > (`TaskGantt.tsx`, que usa `bgSolid`) a cor é a única informação, e os três degraus
   > liam como a mesma bolinha verde-escura. O mesmo acontecia com `neutro` e `espera`,
   > dois marrons escuros a 6° e 6 pontos um do outro. **Diferença de luminosidade só
   > sobrevive em elemento pequeno sem rótulo quando é grande; matiz é o canal que
   > sobrevive.** O teste hoje reprova esse desenho — ver "O que o teste trava".

2. **O mesmo papel, em duas áreas, também se separa por matiz OU por luminosidade.** A
   regra 1 olha uma paleta por vez e não impede duas áreas de serem cópia uma da outra —
   foi assim que os quatro quentes acabaram idênticos entre Tax e OSG. Aqui o piso é menor
   (12° **ou** 6 pontos, contra 20°/8 da regra 1), e a diferença de piso é deliberada:
   dentro de uma paleta as oito bolinhas aparecem juntas na mesma legenda e a comparação é
   lado a lado; entre áreas ninguém vê as duas legendas na mesma tela, e o que precisa
   mudar é o **caráter** da paleta. Piso não é meta: as três paletas em uso passam com
   metade da distância sobrando (18° onde quem resolve é a matiz, 9 pontos onde é a
   luminosidade). Constante: `SEPARACAO_ENTRE_AREAS`, em `src/lib/paletaDeArea.ts`.

   Na prática isso significa usar os **três** canais, não só a matiz. Os arcos verdes das
   áreas nem se tocam (Tax 163–197, OSG 127–160, base 89–122), e nos quentes — onde o arco
   útil é estreito e não cabe girar — quem separa é a luminosidade: o `ajuste` da Tax é um
   tijolo escuro (13%) contra o carmim claro da OSG (40%).

3. **Quente é exceção.** Entra só onde há gente envolvida (`espera`) ou erro (`ajuste`), e
   o amarelo do `alerta` é o único amarelo — reservado para o que exige ação. Amarelo
   distribuído por toda a tela é o que dá cara de template.

## Onde cada paleta mora

| Bloco em `src/index.css` | Quem aplica | Identidade | Arco verde | Quentes |
|---|---|---|---|---|
| `:root` | ninguém — é a base | marfim + verde sábio; fallback de área sem paleta | 89–122 (sábio/oliva) | vinho 343, barro 32, palha 48–54 |
| `.tax-theme` | `FiscalLayout` | teal `#0d9488` da marca | 163–197 (teal) | tijolo 7–12, ocre 30–36 (escala `--tax-*`) |
| `.osg-theme` | `OsgLayout` | verde musgo, dourado marca-texto, carmim | 127–160 (musgo) | carmim 356, taupe 18–19, dourado 41 |

A OSG é a **âncora** do sistema, não a variável: a identidade dela (`--osg-moss`,
`--osg-highlighter`, `--osg-red`, escala `--osg-*`) existia antes de haver sistema de
papéis, e a paleta de status dela é construída sobre esses tokens, com o mínimo de desvio —
`andamento` é o musgo número por número, `ajuste` é o carmim só o quanto o contraste da
pílula exigiu escurecer. Quando duas áreas disputam a mesma região de cor, **quem se move é
a outra**.

A classe vai no `<html>` (`document.documentElement`), não num `<div>`: menus, selects e
modais são renderizados em portal, fora da árvore da página, e ficariam sem tema.

O `:root` é **base**, não a paleta da Tax. Área que ainda não declarou a sua (Board,
Marketing, portal do cliente) cai na base — num lugar coerente, em vez de vestir a
identidade de outra área.

### O Digital fica na base, por decisão

Os três blocos de `/equipe/digital` — **Digital Rotina** (o dia a dia da equipe), **Digital
Mapa** (cadastro de projetos e processos de mapeamento) e **Acessos** — usam a paleta base.
Não é omissão: é o padrão do sistema exposto numa área real, e é dele que uma área nova
parte antes de ajustar a própria identidade.

`.rotina-theme`, aplicado pelo `EquipeLayout`, **não é paleta de área**: troca só o anel de
foco dos campos. Se um dia o Digital quiser identidade própria, o caminho é declarar a
paleta inteira ali, como a Tax e a OSG fazem — meia declaração é pior que nenhuma, porque
mistura duas identidades na mesma tela.

## O mesmo módulo em áreas diferentes

Um módulo (tarefas, chamados, projetos) **não carrega paleta**. Ele nomeia papéis; quem
resolve o tom é a classe de tema no `<html>`, posta pelo layout da área que o hospeda. Logo
o mesmo módulo montado dentro do `FiscalLayout` sai teal, e dentro do `OsgLayout` sai musgo,
sem uma linha de condicional — é o que já acontece com projetos e tarefas, que roda nas duas
áreas a partir do mesmo componente.

Para isso valer, duas condições:

1. **O componente nunca nomeia matiz** — nada de `bg-emerald-100`, nem de token de área
   (`bg-tax-100`, `text-osg-700`) dentro de código compartilhado. Só papéis e tokens
   semânticos (`primary`, `muted`, `border`, `destructive`).
2. **O layout da área aplica a classe de tema no `<html>`.** Sem isso o módulo cai na base
   mesmo estando dentro da área.

A auditoria que garante a condição 1:

```bash
grep -rnE "(bg|text|border|ring|fill|stroke|from|to|via)-(slate|zinc|neutral|stone|red|orange|amber|yellow|green|emerald|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}" <pasta-do-modulo>
grep -rnE "(bg|text|border)-(tax|osg)-[a-z0-9]+" <pasta-do-modulo>
```

Duas armadilhas que já morderam aqui:

- **Opacidade tem que ser passo da escala do Tailwind** (múltiplos de 5). `bg-tag-a/12` é
  descartado na build, sem erro: a classe simplesmente não existe e o elemento sai sem fundo.
- **Substituição em massa colide por prefixo.** Trocar `bg-teal-50` antes de `bg-teal-500`
  transforma `bg-teal-500/10` em `bg-primary/50/10`, que também não existe. Depois de uma
  varredura, procure por alpha duplicado (`/\d+/\d+`) e por `hover:` idêntico ao estado
  normal.

## Como adicionar a paleta de uma área nova

1. Copie o bloco `.tax-theme` inteiro do `index.css`, renomeie para `.<area>-theme`.
2. **Gire o arco verde inteiro** (`fila`, `andamento`, `revisao`, `feito`) e `tag-a` para a
   matiz da área, preservando os espaçamentos entre eles — é o espaçamento, não o valor
   absoluto, que faz os quatro se distinguirem. Ancore no tom da marca: na Tax o
   `andamento` é o próprio teal `175`, na OSG é o musgo `149`.
3. **Gire os quentes também.** Eles **não** são mais vocabulário comum, e é aqui que a
   versão anterior errou: `espera`, `ajuste`, `alerta` e `neutro` eram os mesmos valores em
   todas as áreas, e por isso a legenda do Gantt da Tax e a da OSG viravam a mesma imagem.
   Cada área declara os quentes dela — a Tax fala tijolo e ocre afinados com `--tax-*`, a
   OSG fala carmim, taupe e dourado afinados com `--osg-*`, a base fala vinho, barro e
   palha.
4. **Meça a distância para as áreas que já existem**, papel a papel, não só dentro da sua
   paleta. O arco quente útil é estreito (~55° de vinho a palha) e não cabe girar quatro
   papéis em três áreas só na matiz: quando a matiz acabar, **desloque a luminosidade**. É
   legítimo — e desejado — que o mesmo papel seja escuro numa área e claro em outra. Se a
   sua área disputa a região de cor de uma existente, **quem se move é a sua**: a OSG é a
   âncora, e a Tax já cedeu o carmim e o dourado para ela.
5. Declare **todos** os papéis e tons, mesmo os iguais aos da base. Uma paleta tem que ser
   legível de uma vez, num bloco só — e o teste exige.
6. No layout da área, aplique a classe no `<html>` com `useEffect`, como
   `FiscalLayout`/`OsgLayout` fazem (adiciona ao montar, remove ao desmontar).
7. Acrescente o seletor em `TEMAS`, em `src/lib/paletaDeArea.ts`. É esse array que faz a
   área nova entrar tanto na checagem interna quanto na de distância entre áreas.
8. Rode `bunx vitest run src/lib/paletaDeArea.test.ts`.
9. Rode o validador de paleta categórica nos quatro `--tag-*` da área nova, **na ordem de
   `SERIES`** e contra a superfície do card daquela área: `node scripts/validate_palette.js
   "<hex,hex,hex,hex>" --mode light --surface "<hex do card>"` (o script vem com a skill
   `dataviz`). Ele é a única checagem que enxerga daltonismo — o teste do repo não olha isso.
   Use `--pairs all`: em rosca e em legenda os quatro aparecem juntos, não só em vizinhos.

> **Cuidado com o teto de luminosidade.** A faixa declarada vai até 40%, mas quem manda de
> verdade é o contraste: um tom cheio precisa de 4,5:1 com o branco em cima **e** 4,5:1 com
> o `soft` da mesma matiz — e amarelo, ciano e verde-limão atingem esse teto muito antes de
> 40%. O dourado da OSG (`41 73% 71%`) só cabe como `alerta` a 31% de luminosidade; o teal
> `#0d9488` (29%) só cabe como `andamento` a 25%. Ancore na **matiz** da marca, não na
> luminosidade dela.

## O que o teste trava

`src/lib/paletaDeArea.test.ts` roda contra o `index.css` de verdade e reprova:

- **papel ou tom faltando** — sem isso a área herdaria o valor da base em silêncio, e a
  tela ficaria com duas identidades misturadas;
- **contraste abaixo de AA** (4,5:1), tanto do texto sobre a pílula quanto do branco sobre
  o tom cheio;
- **fora da faixa** — `soft` com luminosidade em 76–96%, tom cheio em 12–40%, saturação até
  85%. O teto de saturação é o que barra neon;
- **dois papéis que viram a mesma bolinha** — para **cada par** de tons cheios, exige-se
  20° de matiz **ou** 8 pontos de luminosidade (`SEPARACAO`, em `src/lib/paletaDeArea.ts`).
  O caminho da matiz só vale se as duas cores tiverem saturação ≥ 20%: matiz não se enxerga
  sem croma, e dois cinzas a 180° continuam sendo o mesmo cinza. A mensagem de falha diz o
  par e o tema. As três paletas cumprem com folga — o menor separador por matiz em uso é
  22°, o menor por luminosidade é 9 pontos;
- **duas áreas que viram a mesma paleta** — para **cada papel**, em **cada par de temas**,
  exige-se 12° de matiz **ou** 6 pontos de luminosidade (`SEPARACAO_ENTRE_AREAS`). É o
  guard que faltava: até ele existir, uma área podia declarar os oito papéis, passar em
  contraste, faixa e separação interna, e ainda assim ser cópia da vizinha — e era o caso,
  com 16 dos 24 pares colidindo. A mensagem de falha diz o papel, os dois temas e as duas
  distâncias medidas. As três paletas cumprem com metade da distância sobrando: 18° onde
  quem resolve é a matiz, 9 pontos onde é a luminosidade;
- **`soft` que foge do próprio tom cheio** — mais de 12° de matiz entre os dois faz a
  pílula parecer dois papéis empilhados;
- **`feito` e `ajuste` a menos de 60° de matiz** — o par que mais dói confundir numa lista.
  Aqui a checagem é de matiz, não de contraste: os dois são tons escuros e dariam ~1:1 de
  razão mesmo sendo verde e tijolo.

## Fora do módulo de tarefas

O dashboard **Clientes e OS** (`src/pages/equipe/board/BoardDashboardClientesOs.tsx` e
`src/components/equipe/board/clientes-os/`) já foi convertido: ele roda no Board, na Tax e na
OSG a partir do mesmo componente, e a cor entra por papel — `--primary` na série única,
`--tag-*` na paleta categórica, papéis de status no que é estado, `--muted-foreground` e
`--border` no eixo e na grade.

Estas telas continuam com cor de estoque, fora do sistema de papéis — ainda não foram
convertidas: chamados (`src/lib/equipeChamados.ts`), notificações internas
(`src/lib/notificacoesInternas.ts`), sprints e os demais dashboards gerenciais (os
hexadecimais de gráfico ainda vivem em `src/lib/board-chart-defaults.ts`,
`src/constants/brandColors.ts`, `src/pages/equipe/mapa/**`, `dashboard-roi/Charts.tsx` e
`sprint/SprintHoursDashboard.tsx`). Enquanto seguirem
assim, elas mostram a mesma cor em qualquer área que as hospede; convertê-las para papéis é
o que as torna sensíveis à área, como já são projetos e tarefas.

O token `--info` (azul) segue existindo para uso semântico pontual; nenhuma área o declara
na paleta dela.
