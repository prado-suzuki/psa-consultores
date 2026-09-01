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
   mudar é o **caráter** da paleta. Piso não é meta: as paletas em uso passam com
   metade da distância sobrando (18° onde quem resolve é a matiz, 9 pontos onde é a
   luminosidade). Constante: `SEPARACAO_ENTRE_AREAS`, em `src/lib/paletaDeArea.ts`.

   Na prática isso significa usar os **três** canais, não só a matiz. Os arcos verdes das
   áreas nem se tocam (Tax 163–197, OSG 127–160, base 89–122), e nos quentes — onde o arco
   útil é estreito e não cabe girar — quem separa é a luminosidade: o `ajuste` da Tax é um
   tijolo escuro (13%) contra o carmim claro da OSG (40%).

3. **Quente é exceção.** Entra só onde há gente envolvida (`espera`) ou erro (`ajuste`), e
   um só papel ocupa a faixa amarela — reservado para o que exige ação. Amarelo
   distribuído por toda a tela é o que dá cara de template.

   > **Qual papel é o amarelo mudou, e esta linha já mentiu.** Ela dizia "o amarelo do
   > `alerta`". Hoje o `alerta` é matiz **20** (tijolo/ferrugem, `20 72% 32%` no `:root`) e
   > quem está na faixa amarela é o `espera`, matiz **44**. A troca veio da fusão dos
   > semânticos, quando `--warning` passou a ser `var(--status-alerta)`: o amarelo a 92% de
   > saturação não tinha luminosidade que servisse de texto sem trocar junto o
   > `-foreground` dele. **Confira o `index.css` antes de citar matiz por aqui.**

## Onde cada paleta mora

| Bloco em `src/index.css` | Quem aplica | Identidade | Arco verde | Quentes |
|---|---|---|---|---|
| `:root` | ninguém — é a base | marfim + verde sábio; fallback de área sem paleta | 89–122 (sábio/oliva) | vinho 343, barro 32, palha 48–54 |
| `.base-theme` | `AreaThemeProvider`, em TODA rota | teal institucional; superfícies com cast de teal (matiz 168–180) | 89–122 (sábio/oliva) | vinho 343, barro 32, palha 48–54 |
| `.tax-theme` | `FiscalLayout` | teal `#0d9488` da marca | 163–197 (teal) | tijolo 7–12, ocre 30–36 (escala `--tax-*`) |
| `.osg-theme` | `OsgLayout` | verde musgo, dourado marca-texto, carmim | 127–160 (musgo) | carmim 356, taupe 18–19, dourado 41 |

São **três blocos, e só**. Toda rota veste `.base-theme`; Tax e OSG põem a classe delas por
cima. Já existiram mais: `.rotina-theme` (saiu 29/08/2026), `.board-theme` e
`.sistema-theme` (as duas em 31/08). Os três caíram pelo mesmo motivo — a âncora da área
era a do piso, então o bloco era uma cópia dele.

A OSG é a **âncora** do sistema, não a variável: a identidade dela (`--osg-moss`,
`--osg-highlighter`, `--osg-red`, escala `--osg-*`) existia antes de haver sistema de
papéis, e a paleta de status dela é construída sobre esses tokens, com o mínimo de desvio —
`andamento` é o musgo número por número, `ajuste` é o carmim só o quanto o contraste da
pílula exigiu escurecer. Quando duas áreas disputam a mesma região de cor, **quem se move é
a outra**.

A classe vai no `<html>` (`document.documentElement`), não num `<div>`: menus, selects e
modais são renderizados em portal, fora da árvore da página, e ficariam sem tema.

O `:root` é **base**, não a paleta da Tax. Área que ainda não declarou a sua
(Marketing, portal do cliente) cai na base — num lugar coerente, em vez de vestir a
identidade de outra área.

### O Board VIROU a casa (31/08/2026)

O Board teve bloco próprio por dez dias. Em 21/08 ele saiu da infraestrutura e ganhou
a `.board-theme` — um delta de acento + superfície. Em 31/08 esse delta **virou o piso**:
as superfícies com cast de teal (matiz 168–180) foram MOVIDAS para o `.base-theme` e a
`.board-theme` saiu do `index.css`. Hoje `/equipe/board` resolve `base-theme` sozinho.

Não é o Board perdendo identidade — é a identidade dele deixando de ser exceção. A
âncora do Board sempre foi a da casa: ele é a tela da diretoria, e diretoria olha a
**empresa**, não uma área dela. E área cuja âncora é a do piso não tem delta a declarar.
É a mesma regra que apagou a `.rotina-theme` em 29/08, aplicada no outro sentido: lá a
área desceu para o piso, aqui o piso subiu para a área.

Três coisas empurraram para essa direção:

- o bloco `--bd-*` do design system do Board mora no `:root` do `index.css`, ou seja **já
  valia em toda rota** — só Tax e OSG o sobrescreviam. Nas rotas da casa o chrome do Board
  já saía teal ao lado de controles shadcn marfim: era o desencontro de 21/08 outra vez,
  em 41 telas em vez de 21;
- a `.rotina-theme` tinha acabado de sair por ser uma cópia do piso. Manter a
  `.board-theme` era manter a mesma figura de cabeça para baixo;
- e o `.base-theme`, que é aplicado em TODA rota, passou a ser o único lugar que descreve
  a cor da casa.

**O que repintou:** as 41 rotas que ficavam no piso puro (site institucional, portal do
cliente, Gestão, e as telas de Rotina e Digital dentro de `/equipe`) e as 27 do Dev, que
herda superfície do piso de propósito. As 21 do Board renderizam idêntico. Tax e OSG não
se mexeram: são **congeladas**, declaram o contrato inteiro e não herdam superfície.

Os papéis de status **não** entraram nessa mudança — nem entrariam. O Board nunca
declarou os seus, e o motivo é este documento: não há arco verde livre. O 163–197 é da
Tax, o 127–160 é da OSG e o 89–122 é o do piso; a regra é "quem se move é a área nova", e
não há para onde mover. O arco do piso (sábio) também não disputa espaço com o acento
(teal 175), então as pílulas de tarefa seguem legíveis ao lado dos cartões teal.

Consequência prática que continua valendo: **o Board não entra em `TEMAS`, em
`src/lib/paletaDeArea.ts`** — não declara papéis, logo não há papéis dele para o teste
medir. Quem cobra a consistência é `areaTheme.test.ts`, que exige que todo tema declarado
seja classificado como *congelado* (declara as 46 variáveis do contrato) ou *delta*
(subconjunto, sem inventar variável). Hoje **não sobrou nenhum delta**.

### O Dev perdeu o grafite (31/08/2026)

A `.sistema-theme` vestia as 27 rotas de `/equipe/dev` com um acento grafite quente
(`35 10% 26%`) e um par de superfície escura na mesma matiz. Era delta de **acento**: as
superfícies claras ela herdava do piso, de propósito.

Caiu por dois fatos medidos, e o primeiro já era verdade **antes** da dobra do Board:

- a tela `/equipe/dev/uso-envio` usa os tokens `--bd-*`. Três seguem o `--primary` e
  viravam grafite; dois estão **cravados em teal** no `:root` — `--bd-accent-d` (pinta
  letra, chip cheio e avatar) e `--bd-accent-soft`. Na mesma tabela: link e chip teal,
  hover de linha e anel de foco grafite. É o defeito de 21/08 (Board) e o de 31/08
  (Digital) pela terceira vez. A dobra não criou isso — ela fez alguém olhar;
- a justificativa escrita do tom quente era "o canvas da base é marfim e o texto é marrom,
  um grafite azulado brigaria com os dois". A dobra derrubou os dois fatos.

**A regra "a quem a tela serve" não caiu — ela deixou de pintar.** `sistema` continua sendo
área em `MAPA_DE_ROTAS`, e `areaDaRota('/equipe/dev')` continua respondendo `'sistema'`.

⚠️ **Para quem for dar cor ao Dev de novo:** o acento sozinho **não** resolve. Enquanto
`--bd-accent-d` e `--bd-accent-soft` estiverem cravados em teal no `:root` (só `.tax-theme`
e `.osg-theme` os sobrescrevem), qualquer acento novo reabre o mesmo desencontro. Um delta
para o Dev tem de incluir os `--bd-*` — ou esses dois tokens têm de passar a seguir o
`--primary` antes.

### O Digital e a Rotina ficam na base, por decisão

Os três blocos de `/equipe/digital` — **Digital Rotina** (o dia a dia da equipe), **Digital
Mapa** (cadastro de projetos e processos de mapeamento) e **Acessos** — usam a paleta base,
e as telas de Rotina (`/equipe/kanban`, `/equipe/daily`, `/equipe/sprints`…) também.

Não é omissão. A `.rotina-theme` existiu até 29/08/2026: nasceu trocando só o anel de foco
dos campos, foi congelada com o contrato inteiro, e aí se mediu que cada variável dela era,
uma a uma, a mesma do `.base-theme` — inclusive o `--ring`. Apagar o bloco não moveu um
pixel. A âncora da Rotina é a da casa, e a casa é o que o piso pinta.

Consequência para o teste: `.rotina-theme` **está em `TEMAS`** e cumpre completude, contraste,
faixa e separação interna — cumpre por ser cópia de uma paleta que cumpre. O único par
dispensado é `.rotina-theme × :root` na separação entre áreas, registrado em
`AREAS_CONGELADAS_NA_BASE`; ela continua sendo comparada com a Tax e com a OSG. No dia em que
a Rotina ganhar cor própria, o teste `ainda é cópia da base` reprova e manda tirar a exceção —
é ele que impede a dispensa de virar permanente.

Quando essa decisão vier, o caminho é reescrever os valores deste bloco. Meia declaração é
pior que nenhuma: mistura duas identidades na mesma tela.

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
  par e o tema. As paletas em uso cumprem com folga — o menor separador por matiz em uso é
  22°, o menor por luminosidade é 9 pontos;
- **duas áreas que viram a mesma paleta** — para **cada papel**, em **cada par de temas**,
  exige-se 12° de matiz **ou** 6 pontos de luminosidade (`SEPARACAO_ENTRE_AREAS`). É o
  guard que faltava: até ele existir, uma área podia declarar os oito papéis, passar em
  contraste, faixa e separação interna, e ainda assim ser cópia da vizinha — e era o caso,
  com 16 dos 24 pares colidindo. A mensagem de falha diz o papel, os dois temas e as duas
  distâncias medidas. As paletas em uso cumprem com metade da distância sobrando: 18° onde
  quem resolve é a matiz, 9 pontos onde é a luminosidade;
- **`soft` que foge do próprio tom cheio** — mais de 12° de matiz entre os dois faz a
  pílula parecer dois papéis empilhados;
- **`feito` e `ajuste` a menos de 60° de matiz** — o par que mais dói confundir numa lista.
  Aqui a checagem é de matiz, não de contraste: os dois são tons escuros e dariam ~1:1 de
  razão mesmo sendo verde e tijolo.

### Os papéis semânticos entraram depois

`--destructive`, `--success`, `--warning` e `--info` são **sinal, não paleta de área**, e por
isso ficaram fora do contrato original — que nasceu para os oito papéis de status. Foi essa
lacuna que deixou o `--warning` viver como `text-warning` a **2,13:1** sem nada reprovar: não
era valor errado passando pelo teste, era token que nenhum teste media.

`problemasDosSemanticos` cobra os quatro, nos dois empregos que eles realmente têm na tela:

- **preenchido** — o token pinta o fundo e o `-foreground` escreve por cima (botão, toast,
  pílula). O par tem que fechar AA sozinho: quem olha não escolhe as duas cores;
- **texto** — `text-destructive`, `text-success`, `text-warning`, `text-info` sobre a
  superfície do tema (`--card`, ou `--background` quando a área não declara card). É o
  emprego frágil: o token foi calibrado para *receber* texto branco, não para *ser* o texto.

O que **não** se cobra deles, e de propósito: faixa e teto de saturação (faixa serve para
paletas de área conversarem entre si; sinal não conversa, interrompe — o `--warning` a 92% de
saturação é escolha), separação par a par (vermelho, verde, amarelo e azul já têm matiz por
construção) e separação entre áreas (o vermelho de excluir *pode* ser o mesmo em duas áreas,
e na maioria delas é).

### "Token que nenhum tema declara" é o defeito recorrente deste sistema

O `--warning` a 2,13:1 não foi um valor errado passando pelo teste — foi um token fora do
contrato. **Esse mesmo defeito reapareceu quatro vezes**, e em 31/08/2026 os quatro foram
cobrados de uma vez. O contrato foi de 46 para 50 variáveis.

| token | onde vivia | o que produzia |
|---|---|---|
| `--accent-d` | cravado no `:root`, no bloco `--bd-*` | o degrau escuro que pinta **letra** (link, chip cheio, avatar) era o teal da casa em qualquer tema que não fosse Tax nem OSG |
| `--accent-soft` | idem | o card tingido de KPI, igual |
| `--border` | só no `:root`, `40 12% 91%` bege | borda de controle bege em **toda** rota, inclusive sobre as superfícies frias da casa (matiz 168) e da Tax (170) |
| `--input` | idem | idem |

O caso do `--border` tinha um agravante que só apareceu ao medir: o `--bd-line` do design
system do Board era **frio** na casa (cravado) e **bege** na Tax e na OSG (onde resolvia
`var(--border)`). Mesmo token, duas temperaturas, dependendo da rota.

Agora cada tema declara a linha da família da superfície dele, e o peso é o mesmo nos três
— que é a regra deste documento aplicada a linha em vez de a papel de status:

| tema | `--border` | contraste no card |
|---|---|---|
| `.base-theme` | `168 14% 89%` | 1,26:1 (era 1,21) |
| `.tax-theme` | `170 16% 89%` | 1,24:1 (era 1,20) |
| `.osg-theme` | `32 20% 88%` | 1,26:1 (era 1,18) |

A OSG **não** usa `var(--osg-100)`, e isso foi medido: daria 1,38:1, ou seja a mesma borda
leria mais pesada na OSG do que nas outras áreas. As paletas conversam no **registro** e
mudam de **família**; o peso da linha é registro.

⚠️ **Dívida aberta, com número:** nenhuma das três passa em **WCAG 1.4.11**, que pede 3:1
para borda de controle. 1,26 está longe. Chegar a 3:1 exige luminosidade por volta de 72% no
lugar de 89% — borda visivelmente escura em todo input do produto. É decisão de design em
aberto, e a mudança de 31/08 não a resolve; só tira a divergência de temperatura.

Restam **três** valores cravados no bloco `--bd-*`, e os três estão comentados um a um no
`index.css`: `--bd-surface2` (zebra, `168 20% 98%`), `--bd-line2` (divisória, `168 16% 94%`) e
`--bd-accent-l` (série secundária de gráfico, `175 45% 72%`). O critério para não derivá-los é
o mesmo nos três: o valor da casa **não tem par no contrato**, então derivar mexeria em pixel
— nos dois primeiros escurecendo zebra e divisória, no terceiro trocando opaco por alfa. Isso
é decisão de design, não limpeza, e é por isso que ficam visíveis em vez de entrarem de
carona.

A resolução passa por herança e por `var()`: nenhuma área declara `--card` própria, e os
semânticos da OSG são `var(--osg-moss)` / `var(--osg-highlighter)`. Ler só o literal do bloco
daria "não declarado" justamente na área que mais personalizou os quatro.

**A dívida está fixada item a item em `DIVIDA_SEMANTICA`**, no arquivo de teste — valores já
em produção, cuja correção é decisão de identidade visual e não de teste. A asserção é de
igualdade exata, o que faz da lista uma catraca nos dois sentidos: falha nova derruba o
teste, e item corrigido também derruba, pedindo que saia da lista. A dívida só pode diminuir,
e nunca de fininho.

**Hoje ela está vazia**, e a lista continua existindo para que voltar a encher seja uma
decisão escrita e não um descuido. Ela teve 12 itens: o `--warning` reprovava como texto nos
quatro temas (1,54:1 a 2,13:1), o `--success` reprovava por pouco em três, e o `--destructive`
do `:root` reprovava nos dois empregos. Os 12 saíram **de uma vez**, e não um a um:
`--destructive`, `--warning` e `--success` passaram a ser o `ajuste`, o `alerta` e o `feito`
da área. Como papéis de status eles já nascem calibrados para receber texto claro, então
nenhum dos 12 precisou de um valor novo escolhido à mão.

## O papel `alerta` tem variante no `ui/` — use ela

`<Alert variant="warning">` e `<Badge variant="warning">` existem desde 01/09/2026, e são o
destino de todo aviso novo. Nada de `bg-amber-50` à mão.

| forma | o que usar |
|---|---|
| painel de aviso que já é `<Alert>` | `variant="warning"` |
| painel feito à mão (`<div>`, `<Card>`, `<p>`) | `border-warning/40 bg-warning/10 text-warning` |
| pílula/chip | `<Badge variant="warning">` |
| ícone de atenção solto | `text-warning` |
| fundo cheio (botão, ponto, contador) | `bg-warning text-warning-foreground`, hover em `/90` |

O fundo suave é **alfa sobre o semântico**, e não `bg-status-alerta-soft`: o `.dark` não
declara nenhum `--status-*`, então o painel cairia no valor do tema claro no dia em que o
escuro entrar. O `--warning` o `.dark` declara. É a recomendação registrada em
`comparacoes-de-cor/superficie-de-estado.html`.

### O que NÃO é `alerta`, embora seja âmbar

Foi o achado da conversão, e vale para os papéis que ainda faltam (`sucesso`, e o `feito` e o
`ajuste` onde eles ainda são verde e vermelho crus). **Antes de trocar a classe, olhe o que
está escrito na tela:**

- **Degrau de escada.** `Validado`/`Pendente`, `Concluída`/`Em Avaliação`/`Cancelada`,
  `Alta`/`Média`/`Baixa`. Converter só o degrau âmbar põe token e cor de estoque na mesma
  coluna — troca escada crua por escada meio crua, que é pior. Essas escadas inteiras se
  convertem por papel, no modelo do `taskStatusColors`.
- **Outro papel com a mesma cor.** "Oportunidades" com uma lâmpada é ideia, não aviso.
  "Editando etapa" tem `--edit-shadow-color` próprio. Realce de diff (`isChanged`) é `info`.
- **Escala que não é status.** "Hoje"/"Amanhã" é proximidade; risco alto/médio/baixo é
  gradiente.
- **Decoração.** Ícone de 48px de estado vazio, ao lado de texto em `muted-foreground`. Em
  `text-warning` cheio ele passa a gritar.
- **Rótulo que não é estado.** "Líder", "Admin".

**Essa classificação não vive só nesta prosa.** `src/lib/filaDoAlerta.test.ts` inventaria o
âmbar que sobrou, arquivo a arquivo, **agrupado por motivo**, e afirma igualdade exata — a
mesma catraca da `DIVIDA_SEMANTICA`. Âmbar novo em arquivo limpo derruba o teste; sítio
convertido também derruba, pedindo que a contagem caia. A fila só diminui, e nunca de
fininho. Quem for converter `sucesso`, `feito` ou `ajuste` começa dessa lista em vez de
reclassificar do zero.

Não virou regra de ESLint porque `bg-amber-50` é classe válida do Tailwind: a regra
`escala/cor-de-estoque` só dispara em nome que o projeto **também** define (`teal`, `lime`,
`gray`). Sobrariam `warn` global, que joga os sítios num monte indistinto e perde o motivo,
ou escopo por pasta — medido, e protege o terço errado: as pastas já em zero são as quietas,
e `equipe/dev`, onde está o maior naco da fila, ficaria de fora inteira.

E três armadilhas que a conversão em massa produz sozinha, todas já mordidas aqui:
`hover:` que fica **idêntico** ao estado normal; `text-white` cravado sobre um token (o par é
`-foreground`, que é quem garante o contraste); e tom claro do Tailwind com alfa baixo
(`bg-amber-50/20`) que vira um `/10` do token e **pesa mais** do que pesava.

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

O token `--info` (azul) segue existindo para uso semântico pontual: nenhuma área o declara na
paleta dela, e todas as quatro o resolvem pela herança. Ele entra no contrato dos papéis
semânticos (acima) mesmo passando com folga — travar quem já cumpre é barato.
