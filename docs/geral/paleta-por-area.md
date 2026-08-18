# Paleta por área: papéis de status e tons de tag

Cada área tem a **sua** paleta, e as paletas **conversam** entre si: mesma estrutura,
mesma temperatura, mesma rampa — muda a família de matiz. Nenhuma área é neon, nenhuma
área empresta a identidade de outra.

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

Mais quatro tons categóricos — `tag-a` … `tag-d` — para tags de texto livre, sorteadas por
hash. São **quatro** de propósito: oito matizes davam à tag mais destaque que ao status da
tarefa.

Cada papel é um par: `--status-<papel>-soft` (fundo da pílula) e `--status-<papel>` (texto
sobre esse fundo, ponto, barra, e fundo de badge com texto branco). No Tailwind saem como
`bg-status-<papel>-soft`, `text-status-<papel>`, `bg-status-<papel>`.

## Duas regras de leitura

1. **Dois papéis quaisquer se separam por matiz OU por luminosidade.** Não existe rampa de
   matiz único: os quatro verdes (`fila`, `andamento`, `revisao`, `feito`) ficam espaçados
   ao longo do arco verde da área, e os quatro quentes (`ajuste`, `espera`, `neutro`,
   `alerta`) ao longo do arco carmim → dourado. Onde dois vizinhos do mesmo arco ficam
   perto demais em matiz, quem separa é a luminosidade — com folga, não com 5 pontos.

   > **A lição que custou uma refação.** A primeira versão desta paleta era uma rampa de
   > matiz único: `fila`/`andamento`/`revisao` no mesmo teal, variando só a luminosidade
   > (27% → 21% → 15%). Na pílula funciona, porque a cor vem acompanhada da palavra
   > "Revisão" e serve só de reforço. Na **bolinha de 8px** da legenda do Gantt
   > (`TaskGantt.tsx`, que usa `bgSolid`) a cor é a única informação, e os três degraus
   > liam como a mesma bolinha verde-escura. O mesmo acontecia com `neutro` e `espera`,
   > dois marrons escuros a 6° e 6 pontos um do outro. **Diferença de luminosidade só
   > sobrevive em elemento pequeno sem rótulo quando é grande; matiz é o canal que
   > sobrevive.** O teste hoje reprova esse desenho — ver "O que o teste trava".

2. **Quente é exceção.** Entra só onde há gente envolvida (`espera`) ou erro (`ajuste`), e
   o ocre do `alerta` é o único amarelo — reservado para o que exige ação. Amarelo
   distribuído por toda a tela é o que dá cara de template.

## Onde cada paleta mora

| Bloco em `src/index.css` | Quem aplica | Identidade |
|---|---|---|
| `:root` | ninguém — é a base | marfim + verde sábio; fallback de área sem paleta |
| `.tax-theme` | `FiscalLayout` | teal `#0d9488` da marca |
| `.osg-theme` | `OsgLayout` | verde musgo, dourado marca-texto, carmim |

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
   `andamento` é o próprio teal `175`, na OSG é o musgo `149`. Os quentes (`espera`,
   `ajuste`, `alerta`, `neutro`) são o vocabulário comum que faz as paletas conversarem;
   mexa neles só para trocar o tijolo pelo vermelho da área, como a OSG faz com o carmim.
3. Declare **todos** os papéis e tons, mesmo os iguais aos da base. Uma paleta tem que ser
   legível de uma vez, num bloco só — e o teste exige.
4. No layout da área, aplique a classe no `<html>` com `useEffect`, como
   `FiscalLayout`/`OsgLayout` fazem (adiciona ao montar, remove ao desmontar).
5. Acrescente o seletor em `TEMAS`, em `src/lib/paletaDeArea.ts`.
6. Rode `bunx vitest run src/lib/paletaDeArea.test.ts`.

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
  24°, o menor por luminosidade é 10 pontos;
- **`soft` que foge do próprio tom cheio** — mais de 12° de matiz entre os dois faz a
  pílula parecer dois papéis empilhados;
- **`feito` e `ajuste` a menos de 60° de matiz** — o par que mais dói confundir numa lista.
  Aqui a checagem é de matiz, não de contraste: os dois são tons escuros e dariam ~1:1 de
  razão mesmo sendo verde e tijolo.

## Fora do módulo de tarefas

Estas telas continuam com cor de estoque, fora do sistema de papéis — ainda não foram
convertidas: chamados (`src/lib/equipeChamados.ts`), notificações internas
(`src/lib/notificacoesInternas.ts`), sprints e os dashboards gerenciais. Enquanto seguirem
assim, elas mostram a mesma cor em qualquer área que as hospede; convertê-las para papéis é
o que as torna sensíveis à área, como já são projetos e tarefas.

O token `--info` (azul) segue existindo para uso semântico pontual; nenhuma área o declara
na paleta dela.
