# Cor: o que falta, e por que cada coisa parou onde parou

Estado em **10/09/2026**, com a lista de retomada remedida no fim do dia. O corpo do documento é a rodada de 19 commits de 01/09; em 03/09
vieram cinco rodadas em cima dele — os rótulos de chamado, o estado de documento, a palavra
única dos três pares, a âncora vermelha da OSG e a pasta `equipe/audit` —, e o §5 ganhou três
catracas. Em 10/09 entrou a quarta e ela é de outra natureza: a primeira que não pergunta
contraste, e sim se uma superfície bate com a vizinha (§5 e §6).

> **A alavanca que funciona, medida cinco vezes seguidas:** procurar o **mapa de domínio**
> antes de escrever classe. Das cinco rodadas, cinco acharam reuso que não tinha acontecido —
> a última achou a segunda cópia de um mapa que a rodada anterior tinha acabado de consertar,
> em outra pasta. Varredura por família de cor, no mesmo período, não rendeu nenhuma vez.

Este documento é o ponto de retomada. Ele não repete o contrato — o contrato é
[`paleta-por-area.md`](paleta-por-area.md), e continua sendo a fonte. Aqui está só **o que
falta**, com o motivo de cada parada, para ninguém reabrir uma decisão já tomada nem repetir
uma medição já feita.

> **Os números envelhecem; os comandos não.** Toda contagem abaixo vem com o comando que a
> produziu. Rode o comando antes de confiar no número.

---

## O que fechou nesta rodada

| frente | de → para |
|---|---|
| papel `alerta` | token 101 → 251, cor crua 344 → 121 |
| cor crua **slate** | 1529 → **0** |
| papéis `feito`/`ajuste`/`espera` | três escadas convertidas, cinco mapas de domínio consolidados |
| rótulo `pending` | onze telas decidiam a palavra sozinhas → uma, no mapa |

Ficaram quatro guardas novas: as catracas [`filaDoAlerta`](../../src/lib/filaDoAlerta.test.ts) e [`filaDoSlate`](../../src/lib/filaDoSlate.test.ts),
a variante `warning` no `ui/alert` e no `ui/badge`, e a seção do contrato que lista os cinco
mapas de status.

---

## 1. Os papéis que faltam

`feito`, `ajuste` e `espera` andaram, mas não fecharam. O que sobra vive quase todo em
**escada de status** — o âmbar, o verde e o vermelho são degraus do mesmo mapa, e converter um
degrau só troca escada crua por escada meio crua, que é pior.

```bash
# cor crua por família, em componentes e páginas
for c in red emerald green rose amber yellow orange; do
  printf "%-8s %s\n" "$c" "$(grep -rhoE "\b([a-z-]+:)*(bg|text|border|divide|ring|fill|stroke|decoration)-$c-[0-9]{2,3}\b" \
    src/components src/pages --include=*.tsx --include=*.ts | wc -l)"
done
```

**Como atacar, e é a lição que custou a rodada:** a unidade não é a cor, é o **mapa**.
Procure o mapa de domínio antes de escrever classe — em 01/09 três dos casos mais pesados não
eram conversão, eram **reuso que não aconteceu**: o `ClienteDashboard` tinha uma cópia inteira
do `chamadoStatusColors`, o mapeamento tinha o mesmo trio em quatro lugares, e o sprint em três.

A lista dos cinco mapas está na seção "Status tem mapa, não classe" do
[`paleta-por-area.md`](paleta-por-area.md).

**A pasta `equipe/audit` fechou em 03/09/2026**, e ela é a prova da regra acima: o
`AuditProdutividadeTable` pintava Criações/Edições/Exclusões com **o mesmo trio**
esmeralda/azul/vermelho do `ACTION_LABELS` do `HistoricoFlutuante`, sobre a mesma
`audit_logs.action` — duas cópias do mesmo mapa, achadas porque a rodada anterior tinha
convertido a primeira. O `AuditLogTable` tinha a terceira cópia do diff `oldValue → newValue`.
O que a rodada decidiu, e vale como precedente:

- **selo veste papel; contagem não.** As três colunas numéricas perderam a cor — vermelho em
  "Exclusões" afirmava problema sobre atividade normal, e as outras colunas da mesma tabela
  (`registros`, `itensDistintos`, `diasAtivos`) nunca tiveram tom nenhum;
- **número só ganha cor quando a condição é verdadeira.** "Atrasadas" pintava a coluna inteira
  em vermelho estático, então "0 atrasadas" aparecia em vermelho. Agora só marca acima de zero,
  como o estouro de horas ao lado já fazia;
- **ausência de dado não é falha.** `sem_registro` foi para `neutro`, não `ajuste`: o texto de
  ajuda da própria coluna diz que aquilo é sobre registro no sistema, não sobre o trabalho da
  pessoa.

**A tela `/equipe/dev` fechou em 10/09/2026**, e ela mudou uma coisa no método: a unidade
passou a ser a **TELA**, não a família nem o mapa. A conferência foi por rota — "esta página
tem todas as cores vindas do tema?" — e achou 28 classes cruas mais duas sombras em
`rgba(5,150,105,…)` numa página que o `bunx eslint` dava por limpa. As três frentes, e o que
cada uma ensina:

- **o cartão do Drive era emerald puro** — verde no meio de uma tela teal, sem seguir tema
  nenhum. Virou âncora (`primary`), e âmbar (`alerta`) foi considerado e **recusado**: o
  cartão está sempre lá, e cor é sinal de ESTADO. Alerta permanente esvazia o alerta;
- **a letra de 10px foi para `--bd-accent-d`, não `--primary`**, e aqui o contrato pagou por
  si: medido no fundo real da pílula, `accent-d` dá **5,13:1** e `primary` daria **4,24:1**,
  que reprova em AA. Era o cartão inteiro dependendo de a regra "acento cheio não pinta letra
  pequena" ser obedecida ao pé da letra;
- **`bg-white` × `bg-card` não move um pixel nesta tela**, e é justamente por isso que os 17
  atravessaram: no `.base-theme` o `--card` é `0 0% 100%`. A divergência só aparece na OSG
  (`170 18% 99.6%`), ou seja, no dia em que o componente for reusado.

Mais duas cópias, achadas pela mesma alavanca de sempre: o botão **Sair** do `DevLayout`
estava em `red-50`/`red-600` enquanto o do `OsgLayout` já estava em `destructive` — a
terceira cópia segue no `FixosLayout`; e o **"Revisão pendente"** do sino estava em roxo cru,
sobre o mesmo dado que seis arquivos do `task-modal` já pintam com o papel `revisao`.

A guarda é [`corCruaNaTelaDoDev.test.ts`](../../src/lib/corCruaNaTelaDoDev.test.ts), e ela
tem forma nova: guarda uma **tela** (lista de arquivos, todas as famílias) em vez de uma
família no repositório inteiro. As duas formas convivem porque pegam defeitos diferentes —
família crescendo em silêncio, contra tela zerada e repintada depois por quem só olhou aquele
arquivo. Quando outra tela do Dev fechar, ela entra na lista daquele teste.

**As seis rotas de hub fecharam no mesmo dia, e o número que importa não é de arquivos.**
Escolhidas por medição, não pela primeira que se abriu: as páginas de hub já estavam todas em
zero, e o que faltava era a casca. Dois componentes — `DevHubPage` e `DevPageHeader` —
fecharam **seis rotas**, e o `DevPageHeader` é montado por 14 páginas. É a mesma alavanca do mapa
de domínio, um andar acima: procurar o componente COMPARTILHADO antes de abrir tela por tela.

Duas coisas saíram disso, e nenhuma era o que se foi buscar:

- **o hex do `DevPageHeader` era o token.** A caixa "Visão Geral" tinha `#E6F2F1` cravado, num
  componente cujo próprio docstring diz que ele existe para dar "o verde-água do módulo".
  Medido: aquele hex composto a 80% sobre branco dá `235,245,244`, e o `--accent-soft` da base
  dá `234,246,244` — **delta de 1 / 1,4 / 0,2 por canal**. Era o token, escrito à unha, sem
  acompanhar tema;
- **o link "aqui" reprovava AA, nas 14 páginas que montam a caixa.** `text-emerald-600` sobre aquele fundo dá
  **3,38:1**, contra os 4,5:1 que o AA pede para texto normal. Agora é `text-accent-d`, e dá
  **6,09:1**. Ninguém tinha medido porque o par não está no contrato de
  `paletaDeArea.test.ts` — é o mesmo padrão das três falhas de 28–29/08: token fora da lista
  do contrato usa `var()` corretamente, passa por certo na revisão, e só aparece quando
  alguém mede.

**`accent-d` e `accent-soft` ganharam classe no `tailwind.config.ts`**, ao lado de
`tool-icon-bg`, que já era desta forma. Eles entraram no contrato em 31/08 e até aqui não
tinham NOME: quem precisava deles escrevia `text-[var(--bd-accent-d)]` — a forma arbitrária e
ambígua do Tailwind 3 —, e quem não sabia disso escrevia hex. As classes leem `--accent-d` e
`--accent-soft` direto, e não os `--bd-*` que os embrulham, porque os `--bd-*` já vêm com
`hsl()` fechado e **não aceitam alfa**; conferido no bundle, as novas emitem com
`--tw-*-opacity`. A forma arbitrária ainda sobra nas telas de `uso-envio`, que não fecharam.

Na mesma passada, a **terceira e última cópia do botão Sair** (`FixosLayout`) foi para
`destructive`. As três agora dizem a mesma coisa, então não sobra uma para a próxima rodada
reencontrar como se fosse achado novo — que é exatamente o que aconteceu em 03/09, cinco vezes
em cinco.

### Correções SPED: fechada em parte, e a parte que falta é sua

Escolhida por medição entre as candidatas (101 ocorrências, a de maior volume com menor
risco). A distribuição já dizia o que era: **21 emerald, 16 âmbar, 3 red** espalhados por seis
abas não é decoração, é um mapa copiado. Confirmado com `uniq -c`: a receita
"botão de contorno que se enche de cor no hover" existia **sete vezes** — uma em cada aba,
byte a byte idêntica, mais uma `const` privada dentro do `CorrecoesActionButtons`. Sete cópias
não são sete decisões; são uma decisão e seis lugares onde ela envelhece separado. É por isso
que a cor delas atravessou as rodadas anteriores: quem procurou por família achou
`emerald-600` em seis arquivos e leu como seis casos.

Virou [`classesDeBotao.ts`](../../src/components/equipe/dev/correcoes-sped/classesDeBotao.ts),
com as duas receitas. Confirmar veste a **âncora** (`primary`, e `accent-d` no `active:`, que é
o degrau escuro do contrato); destruir veste `destructive`. O `active:` do destrutivo usa alfa
`/90` em vez de um degrau mais escuro porque o contrato **não tem** um `destructive-d`, e a
regra é consertar com valor que existe — é a mesma forma que o `task-modal` já usa.

A sombra da coluna fixa (`rgba(0,0,0,0.02)`, seis cópias) passou a `hsl(0 0% 0% / 0.02)`.
Preto não tem matiz, então nunca troca identidade — é o mesmo argumento escrito no véu do
`HeroBanner` —, e o que muda é só a notação sair da forma que nenhuma regra enxerga. Conferido
no bundle: `-4px 0 10px hsl(0 0% 0% / .02)`, mesmo pixel.

**O âmbar ficou, e está em fila com o motivo escrito** (`FILA_A_DECIDIR`, no teste). São dois
sinais diferentes, e é por serem diferentes que nenhum dos dois converte por varredura:

| sinal | onde | por que parou |
|---|---|---|
| "este valor foi alterado" | `isChanged` / `valueDivergent` / `amberClass`, nas 6 abas | não é nenhum dos oito papéis de forma óbvia. Não é `espera` (nada está parado) nem `alerta` (nada é urgente), e `ajuste` pintaria de VERMELHO o que hoje é âmbar — afirmando problema sobre uma edição normal, o mesmo erro que a rodada da pasta `audit` desfez na coluna "Exclusões" |
| selo "Consolidado" | `tipo_relacao === 'CONSOLIDADO'` | não é status, é CATEGORIA — e o irmão dele no mesmo ternário usa `success`, que é semântico. Ou os dois viram `--tag-*`, ou os dois ficam. Converter um só muda a inconsistência de lugar |

A catraca entrou **parcial**, e isso é a forma nova desta rodada: o que fechou (`white`,
`black`, hex, emerald, red = zero) ganha guarda hoje, e o que falta fica escrito com o motivo
em vez de virar dívida invisível. A asserção compara contra a fila, então ela cai **nos dois
sentidos** — se alguém repintar, e também quando a decisão sair e os números descerem, com a
mensagem dizendo o que fazer.

**A decisão saiu no mesmo dia, e a tela fechou inteira.** As duas escolhas dela:

- **valor alterado → `alerta`.** Escolhido com a medição na frente: `espera` tem a matiz mais
  parecida com o âmbar (12° de um lado contra 12° do outro), mas significa "parado por alguém
  de fora", e uma célula editada não está parada. `alerta` significa "olhe isto". O
  `classeDeAlterado` também deixou de se chamar `amberClass` — a casa nomeia papel, não matiz,
  e uma variável com nome de cor volta a mentir na primeira conversão;
- **o par de selos → `tag-a`/`tag-b`.** "Consolidado" e "XML vinculado" são categoria de
  `tipo_relacao`, não estado. O irmão usava `success`, um semântico fazendo papel de categoria.

**O terceiro achado de contraste da sessão, e o pior:** `text-amber-600` dá **3,19:1** no
branco — reprovando o AA — em doze valores **em negrito**, nas seis abas. `status-alerta` dá
7,46:1. O selo subiu de 4,84 para 6,30. Nenhum tinha sido medido, e a razão é a de sempre:
cor crua não entra em contrato nenhum, então não há teste que a olhe.

### A caixa de abertura do Dev virou faixa escura

A usuária olhou as telas depois da conversão e **recusou** duas superfícies: o fundo da página e
o fundo da caixa "Visão Geral" — a que esta mesma rodada tinha acabado de tirar do hex e pôr no
token. Ela pediu uma opção disruptiva, e a medição deu razão a ela de um jeito que não era
questão de gosto.

**O invariante, e é ele que decide: caixa clara não separa de página clara.** A caixa em
`--accent-soft` (94%) foi medida contra **três** alturas de página no mesmo dia, porque a pilha
de superfícies estava sendo mexida em paralelo pela outra sessão — 92%, 96% e 93%. Deu
**1,06 · 1,02 · 1,04**. Ela atravessou de mais escura que a página a mais clara que a página
**sem nunca ficar visível**. Não existe altura de página que resolva.

A escada medida, com a página no `--canvas` de agora (93%):

| caixa | separa da página | letra dentro |
|---|---|---|
| 94% `accent-soft` | **1,04** | 6,09 |
| branca (`card` 100%) | 1,15 | 6,74 |
| faixa da marca (`primary` 25%) | 4,82 | branco **5,56** |
| **faixa profunda (`surface-escura-2` 14%)** | **10,86** | branco **12,52** |

Decisão dela: **faixa profunda**. A faixa da marca foi recusada com o número na frente — o
branco sobre `--primary` é a mesma falha de 5,5 que já tem três comentários no `index.css`, e o
aviso é um parágrafo, não um rótulo. Nada foi inventado: o 14% é o `--surface-escura-2` do meio
do gradiente dos cartões de categoria da página inicial do Dev, e o link usa `accent-soft` — o
valor que **era o fundo** desta caixa virou a letra dela.

**A quarta cópia.** O `BaseLegalCard` do ICMS Saídas tinha um comentário dizendo "igual ao
DevPageHeader" e um `Alert` refeito à mão em emerald cru. O conteúdo não cabe no componente (ele
recebe uma descrição e anexa a frase do manual; lá são vários parágrafos de texto legal), mas a
superfície e o papel são os mesmos — os dois são o primeiro elemento, antes de qualquer cartão.
Então a faixa saiu para [`classesDoAviso.ts`](../../src/components/equipe/dev/classesDoAviso.ts)
e os dois importam de lá. Sem isso, sobraria exatamente uma mancha verde-clara na área: pior que
não ter mudado nada.

**Uma contagem errada que atravessou a tarde, e vale como aviso.** Durante toda esta frente
falou-se em "vinte telas" montando a caixa "Visão Geral" — em conversa, em dois commits e neste
documento. **São 14 páginas.** O 20 saiu de `grep -rl DevPageHeader`, que conta o próprio
componente, quatro arquivos de teste e um comentário do `BaseLegalCard` que só cita o nome. O
comando certo é `grep -rl '<DevPageHeader'`, com o `<`, e sem os testes. É a regra do topo deste
documento cobrando o preço dela: o número foi escrito sem o comando ao lado, e por isso ninguém
o conferiu. Está anotado dentro da catraca, com o comando, para não voltar.

**⚠️ A armadilha do `ui/alert`, que quase foi embarcada.** A string base do componente tem
`[&>svg]:text-foreground`, que gera seletor de especificidade **0,1,1** (classe + elemento). Uma
classe de cor posta no próprio `<svg>` é 0,1,0 e **perde** — o ícone sairia em `--foreground`,
escuro, sobre a faixa escura, sem erro de build e sem aviso de lint. A cor do ícone tem que ir
como `[&>svg]:...` no `className` do próprio `Alert`, e aí o `tailwind-merge` do `cn()` descarta
a da base. Está escrito no `classesDoAviso.ts` e conferido no bundle.

**O fundo da página não foi consertado aqui.** A outra sessão atacou a mesma causa e foi mais
longe no commit `bda64793`: tirou o fundo de página dos **oito** layouts e passou a pintar uma
vez no `body`, com catraca em `fundoDePagina.test.ts`. Cinco dos oito pintavam com a superfície
rebaixada justamente porque a decisão estava repetida em oito arquivos. A edição que esta rodada
ia fazer — trocar `bg-muted` por `bg-canvas` no `DevLayout` — arrumaria a tela e deixaria o nono
layout nascer errado igual. Foi abandonada de propósito.

Uma nota de método: **a catraca do `alerta` acusou**, e estava certa. As seis abas estavam
inventariadas em `FILA_DO_ALERTA`, no grupo `outro-papel`, com os números **exatos** que esta
rodada mediu por conta própria — 3, 7, 1, 1, 2, 2. Duas medições independentes batendo é a
melhor evidência que este trabalho produziu de que o inventário serve. A conversão zerou o
grupo, e o teste falhou até o inventário ser atualizado — que é o comportamento correto, e é
por isso que se atualiza a fila em vez de silenciar a asserção.

## 2. As escadas que exigem decisão, não conversão

Estas ficaram paradas de propósito. Cada uma precisa de uma escolha sua antes de virar código.

| onde | a escolha |
|---|---|
| `projectPresentation.tsx`, `getStatusBadge` | `blocked` é `espera` ("travado por alguém de fora") ou `ajuste` ("deu problema")? Hoje é vermelho, e o `archived` do lado já está em papel |
| `PerDetailModal.tsx` | ~20 estados de PER/DCOMP que não mapeiam nos oito papéis. Precisa decidir o vocabulário antes da cor |
| as 12 paletas categóricas | `pageCategoryStyles`, `roleOptions`, `AgendaTab` e outras têm 5 a 7 categorias. O contrato tem **quatro** `--tag-*`, e são quatro de propósito. Não há token para a quinta |
| `AuditPendenciasTable`, `CORES_MOTIVO` | Os seis motivos são **gradiente de gravidade**, não estados — e o contrato diz que escala não veste papel. Ou nasce uma escala institucional para severidade, ou fica em cor crua. Foi a única coisa que ficou de pé na rodada da pasta `audit`, e o motivo está escrito no próprio arquivo |

## 3. `projects.status` — fechado em 10/09/2026, e o diagnóstico estava errado

**Corrigido, e este bloco é a retificação do que estava escrito aqui.** A versão anterior
dizia três coisas; uma estava certa, duas não.

**O que era verdade:** a coluna `projects.status` guarda `Melhorias` (10) e `Diagnóstico` (7),
e havia mapas de código esperando outro vocabulário.

**O que estava errado, primeiro:** *"o cliente vê os 17 projetos como Em Planejamento, com 0%
de progresso"*. Não vê. `client_visible_projects` está **vazia** — zero vínculos, zero
clientes. A tela do cliente nunca chegou a listar um projeto. O defeito era real e **dormente**,
e a diferença importa: ele estava classificado como "o único que o usuário final vê", o que o
pôs no topo de uma fila de prioridade por um motivo que não existia.

**O que estava errado, segundo:** *"existem três mapas e nenhum casa"*. São **dois**. O
terceiro, `statusProjetoLabel` em `lib/dashboardClientesOs/aggregations.ts`, recebe
`RawOrgProject` — ele lê `org_projects`, e ali `active` / `completed` / `on_hold` / `planned`
é o vocabulário CERTO da tabela certa. Quase virou conserto de uma coisa que não estava
quebrada.

**E o diagnóstico de fundo mudou.** A pergunta registrada aqui era "qual é o ciclo de vida
real do projeto?". A resposta é que não é ciclo de vida nenhum. Existem duas tabelas:

| | `projects` | `org_projects` |
|---|---|---|
| linhas | 17 | 140 |
| `status` | `Melhorias`, `Diagnóstico` — **categoria** | `active`, `completed`, `planned`, `on_hold` — **ciclo de vida** |
| tarefas | **zero** | **954** |
| quem lê | `/equipe/projetos` e o portal do cliente | "Projetos e tarefas" da Tax e da OSG |

`/equipe/projetos` é **a carteira do Digital** — o que a área executa para as outras. O dado
confirma: `projects.area` traz Tax (8), OSG (7), Área Digital (1) e um sem área. Os
"Diagnóstico" são as frentes de consultoria societária, os "Melhorias" são as automações.
Confirmado com a dona da tela em 10/09.

**O que foi feito:** os quatro pontos que usavam ciclo de vida contra essa coluna passaram a
ler `@/lib/categoriaDoProjeto`, com catraca em `categoriaDoProjeto.test.ts`. A barra de
progresso do portal **saiu**: mesmo com a chave certa, "está ativo" não é "está pela metade",
e progresso de verdade precisaria de tarefas que esses 17 projetos não têm.

**O que fica aberto, e é decisão de produto:** hoje a categoria não carrega informação que a
`area` já não carregue — a correlação é perfeita, `Diagnóstico` é OSG nas 7 e `Melhorias` é o
resto nas 10. Pode ser coincidência de carteira pequena (nada impede uma frente de Diagnóstico
na Tax amanhã) ou redundância de verdade. A dona da tela quer melhorá-la; a decisão é dela.

## 4. Outro rótulo divergente, além do `pending` que foi corrigido

**Os mapas de chamado fecharam em 03/09/2026** — `statusLabels` em seis arquivos,
`priorityLabels` em quatro e `activityStatusLabels` em dois viraram o campo `label` da config
que já dava a cor, e as opções de `Select` viraram as listas `CHAMADO_*_OPCOES`. Com eles foi o
defeito visível: a pílula de prioridade vazia no portal do cliente, que era a chave `media`
faltando na cópia local. A catraca é `src/lib/chamadoStatusColors.test.ts`, e o desenho está
na seção "O rótulo sai da mesma config que a cor" do [`paleta-por-area.md`](paleta-por-area.md).

**Os três pares fecharam em 03/09/2026, por decisão dela: uma forma só, masculina.**
`in_progress` é "Em Andamento", `completed`/`done` é "Concluído", `cancelled` é "Cancelado" —
e os rótulos passaram a sair do mapa do domínio em vez de literal na tela. Quinze cópias
saíram: os três `getStatusLabel` idênticos (dashboard, kanban e rotinas da equipe), quatro
listas de `<SelectItem>` escritas à mão, os `statusLabels` do calendário e do painel de horas
de sprint, o `STATUS_PRESENTATION` do daily e as opções do filtro de tarefa. Ficaram
`ENTREGAVEL_STATUS_OPCOES` e `entregavelStatusLabel` como os pontos únicos, e a catraca é
[`rotulosDeStatus.test.ts`](../../src/lib/rotulosDeStatus.test.ts).

Três divergências de COR vieram de carona, porque estavam nas mesmas cópias: o daily pintava
`in_progress` com o papel `alerta` em vez de `andamento` (a mesma tarefa mudava de cor entre o
daily e o Gantt), e os KPIs do dashboard da equipe e do `AdminPerformance` pintavam os três
estados com azul, amarelo, verde e esmeralda do estoque do Tailwind. Duas entradas saíram da
fila do `filaDoAlerta` por isso.

⚠️ **O que NÃO foi uniformizado, e é decisão em aberto — não esquecimento.** A regra vale
onde a MESMA chave tinha duas palavras. Ela não vale para:

- **prosa**, onde o gênero concorda com o substantivo da frase ("tarefas concluídas",
  "Entregas Concluídas");
- **domínio com vocabulário feminino inteiro e coerente**, que não tem par para resolver:
  sprint (`Ativa`/`Concluída`/`Planejada`), melhoria (`Concluída`/`Cancelada`), meta
  (`ativa`/`pausada`/`concluida`/`cancelada`) e situação de OS (`concluida`/`cancelada`, que é
  o valor gravado no banco). Uniformizar só o `completed` desses deixaria
  **"Ativa / Concluído / Planejada"**, que é pior que os dois lados. Se forem para o
  masculino, vão INTEIROS — e aí a de meta e de OS é migração de dado, não rótulo.

O motivo original do par segue valendo como registro: "Concluída" concorda com *tarefa* e
*sprint*, "Concluído" com *chamado* e *projeto*, e o `auditFieldFormatter` atende os quatro
domínios de uma vez — foi ele que ficou com o masculino.

## 5. Onde a dívida pode crescer sem ninguém ver

| classe de defeito | proteção hoje |
|---|---|
| cor crua âmbar/amarela | catraca `src/lib/filaDoAlerta.test.ts` — igualdade exata, por arquivo, com o motivo |
| `teal-500/600/700` | aviso de ESLint (`no-restricted-syntax`) |
| tom que a escala não tem | `escala/cor-inexistente` e `escala/cor-de-estoque` |
| cor crua **slate** | catraca `src/lib/filaDoSlate.test.ts` — nasce **vazia**, e qualquer classe slate nova derruba |
| âncora `osg-red` pintando status | catraca `src/lib/filaDoOsgRed.test.ts` — nasce **vazia**; não é cor de estoque, é token nosso no lugar errado |
| cinza (`gray`) | catraca `src/lib/filaDoGray.test.ts` desde 10/09/2026 — inventário por motivo, e o recorte interno tem asserção própria. Era o buraco maior (580) porque o nome está no `tailwind.config.ts` e a `cor-de-estoque` só dispara em tom que a escala não define |
| **verde, vermelho, azul, roxo, laranja** | **nenhuma** |
| rótulo divergente de **chamado** | catraca `src/lib/chamadoStatusColors.test.ts` — nasce **vazia**, varre pelo conjunto de chaves |
| rótulo divergente de status | catraca `src/lib/rotulosDeStatus.test.ts` — pega "Em Progresso" em JSX e trava a palavra dos três mapas |
| **`--muted` divergindo do `--canvas` da área** | catraca `problemasDeRebaixamento` em `paletaDeArea.test.ts` — não olha o valor, **recalcula** com `rebaixar(--canvas)` e compara sem tolerância |

As linhas em negrito são o buraco que sobrou. A do `gray` entrou em 10/09/2026 e é a maior de
todas — ela ficou fora desta tabela por um ano porque o nome está no `tailwind.config.ts`, o
que dá a impressão de que a `cor-de-estoque` cobre. Cobre só o tom faltante, não o uso.

**Por que o slate precisou de catraca própria, e por que as outras famílias também vão
precisar:** a regra `escala/cor-de-estoque` só dispara em nome que o projeto **também** define
no `tailwind.config.ts` (`teal`, `lime`, `gray`) — aí o tom faltante cai no estoque sem avisar.
`slate` não está lá, nunca esteve, então `bg-slate-50` sempre foi classe válida e nenhuma regra
teve o que dizer. Foi assim que ele cresceu até 1529 sem ninguém ver. `red`, `emerald`, `blue`
e as demais estão na mesma situação.

O molde para a próxima está pronto e é barato: `src/lib/medirCorCrua.ts` tem o scanner, e a
catraca em si são vinte linhas. Duas formas, conforme o caso:

- **família já zerada** → igualdade contra objeto vazio, como a `filaDoSlate`. É a mais fácil
  de manter, e a única que não envelhece;
- **família com fila** → inventário agrupado pelo **motivo** de cada sobra, como a
  `filaDoAlerta`. É o motivo que faz a lista servir para a conversão seguinte em vez de só
  contar.

> Ao extrair o scanner, a varredura ficou mais larga que a original e **achou um caso que
> quatro lotes tinham deixado passar**: um `from-amber-500` de gradiente. A lista de
> propriedades da auditoria não incluía `from`/`to`/`decoration`. Se você escrever uma
> auditoria à mão, use `PROPRIEDADES_DE_COR` de `medirCorCrua.ts` em vez de listar de cabeça.

## 6. Fase 3b e fase 4 — as duas que dependem de decisão antiga

Nenhuma das duas é nova, e as duas estão paradas na mesma pergunta:

- **fase 3b** — cor de gráfico que sai para PNG pelo `html-to-image`. Depende da **decisão 4**,
  que segue sem resposta. Detalhe em [`fase-3a-cor-crua-na-mao.md`](fase-3a-cor-crua-na-mao.md);
- **fase 4** — escolher qual **papel** cada lugar merece, por área e por tela. A fase 3a tirou o
  valor da mão de propósito **sem** escolher papel: é por isso que o Mapa está cheio de
  `hsl(var(--slate-N))`, que é a escala institucional e não cor crua. Não confunda os dois ao
  auditar.

Também seguem abertas as decisões registradas em
[`comparacoes-de-cor/LEIA.md`](comparacoes-de-cor/LEIA.md): porta de entrada e superfície de
estado.

**"O resto dos tokens escritos à mão" encolheu em 10/09/2026, e o que sobrou tem nome.** O
`--muted` das três áreas deixou de ser valor escolhido: `rebaixar(--canvas)` o gera — mesma
matiz, saturação +4, luminosidade −4 — e a catraca do §5 reprova quem escrever à mão. A
fórmula não foi inventada; é a única relação que as três já cumpriam exata.

O que **continua** à mão, e por quê:

| token | por quê |
|---|---|
| `--canvas` | é o par do `--muted`: uma escolha livre por área, como a âncora. **Tem que continuar livre** — a OSG é âncora musgo (149) com superfície areia (32), o que prova que superfície não se deriva de âncora |
| `--background` / `--card` / `--popover` | a 99% de luminosidade a matiz não renderiza, então não há relação a extrair — a base põe `card` em branco puro e as duas áreas põem um fio de cast; as duas leituras são defensáveis |
| `--border` / `--input` | **precisa de decisão sua.** Contra o canvas da própria área a saturação é −2 na base, +6 na Tax e −4 na OSG: não existe uma escada ali, existem três. Alinhar custa pixel, ao contrário da matiz |

> **A matiz da pilha da Tax fechou junto**, em 10/09: `background`/`card`/`popover` e
> `border`/`input` estavam em 170 enquanto `canvas` e `muted` já tinham ido para 192. Custou
> zero pixel (a 99,6% dá `(254,254,254)` dos dois lados; a border troca um canal), e valeu
> porque o arquivo ensinava duas matizes para a mesma área — foi assim que o `--muted` dela
> passou dez dias verde.

## 7. Dívidas menores, com endereço

- **`${cor}NN`** — concatenar alfa no fim do hex produz CSS inválido e o fundo some sem erro.
  Cada ocorrência trava a conversão do arquivo dela. Quase todas na calculadora IBS/CBS.
  `grep -rnE '\$\{[A-Za-z_.]+\}[0-9a-fA-F]{2}' src --include=*.tsx --include=*.ts`
- **`#0d9488`** — o teal residual da Rotina. Parte em comentário do `index.css`, que é prosa.
  Ver [`fase-3a-cor-crua-na-mao.md`](fase-3a-cor-crua-na-mao.md).
- **`osg-red` — fechado em 03/09/2026.** Saiu do checklist quando o estado de documento
  virou mapa, e depois das cinco telas que sobraram. Aplicada uma a uma a regra do comentário
  de `estadoDocumentoColors` — *se o vermelho ali significa estado, é papel; se é decoração da
  área, fica* —, **nenhuma das sete ocorrências era decoração**: três eram mensagem de erro,
  uma era o hover da lixeira, uma era o número de recusados (o próprio comentário do arquivo
  já dizia "documento devolvido"), e a última era o `ACTION_LABELS` do `HistoricoFlutuante` —
  um mapa com três línguas dentro, `emerald-100` e `blue-100` do estoque ao lado da âncora, e
  que por isso andou inteiro. Erro e ação destrutiva foram para `destructive`; estado, para o
  papel. A catraca é [`filaDoOsgRed.test.ts`](../../src/lib/filaDoOsgRed.test.ts) e nasce vazia.
  O que **não** virou papel foi o diff `oldValue → newValue` do histórico: valor antigo não
  "deu problema" e valor novo não está "feito", então ali o antigo recua em
  `muted-foreground` e o novo é `foreground` — cor nenhuma afirmando o que o dado não diz. Se
  fosse `ajuste`, o vermelho passaria a significar duas coisas no mesmo painel, porque o
  `deleted` do mapa logo acima é `ajuste`.
- **WCAG 1.4.11 — fechado em 10/09/2026.** Ficou aberto enquanto um valor só fazia três
  trabalhos (contorno de cartão, linha de tabela, borda de campo): escurecê-lo para 3:1
  levaria junto toda linha de tabela. Separado por trabalho, `--border-control` fecha 3,01 a
  3,05:1 nos três temas e no `.dark` — onde ele **clareia**, porque lá o cartão é escuro. A
  catraca cobra a razão, não o valor. Falta a fase 2 da opção D, que é fazer os controles
  consumirem o token. Ver `paleta-por-area.md`, que também corrige um "por volta de 72%"
  errado que ficou dez dias no contrato e chegou a induzir uma medição.
- **`getProcessStageInfo` × `getStageBadge`** — etapa desconhecida vira "Descoberta" num e
  aparece crua no outro. As duas leituras convivem, com o conflito escrito no comentário da
  função, até alguém decidir qual é a certa.

---

## Se você for retomar por um só item

**A ordem mudou em 10/09/2026, e mudou porque alguém rodou o comando.** A lista anterior
mandava começar por `red` e `emerald`, "as maiores sem guarda", com 207 e 135 medidos em
03/09. Remedido hoje: `red` são **176** e `emerald` **72** — e a maior de todas, que nunca
esteve nesta lista, é o **`gray`, com 580**. A lista estava errada desde que foi escrita; o
número que faltava não era velho, era ausente.

> **Remeça antes de escolher.** Este bloco envelhece como todos os outros:
> ```
> # por família, nas pastas de tela, ignorando teste — o recorte é o de medirCorCrua.ts
> PROPS='bg|text|border|divide|ring|fill|stroke|from|to|via|outline|decoration|accent|caret|placeholder|shadow'
> grep -rhoE "([a-z-]+:)*($PROPS)-(gray|red|teal|blue|green|amber|emerald)-[0-9]{2,3}" >   src/components src/pages --include='*.tsx' --include='*.ts' >   | sed -E 's/.*-(gray|red|teal|blue|green|amber|emerald)-[0-9]+//' | sort | uniq -c | sort -rn
> ```

Medido em 10/09/2026, ordenado:

| família | ocorrências | arquivos | tem guarda? |
|---|---|---|---|
| **`gray`** | **580** | 61 | só parcial — a `cor-de-estoque` só dispara em tom que a escala do projeto NÃO tem |
| `red` | 176 | 58 | nenhuma |
| `teal` | 112 | 36 | aviso de ESLint |
| `blue` | 108 | 41 | nenhuma |
| `green` / `amber` | 81 / 81 | 28 / 31 | `amber` tem a `filaDoAlerta` |
| `emerald` | 72 | 29 | nenhuma |

Nesta ordem, do que rende ao que exige decisão:

1. ~~**`gray`**~~ — **fechado em 10/09/2026.** Eram 580; sobram 149, e nenhuma em tela
   interna fora do bloco de código. A conversão confirmou a aposta: era por MAPA e não por
   inventário — 12 arquivos concentravam 313, e o maior achado veio de procurar o mapa do
   domínio, não de varrer classe. A pílula de status da sprint estava escrita à mão em dois
   lugares e **as duas cópias já tinham divergido**: o verde queria dizer "ativa" numa tela e
   "concluída" na outra.

   Três coisas que a passada ensinou, e que valem para a próxima família:

   · **texto primário se TIRA, não se troca.** Dos 509 `<Label>` do produto, 400 já não tinham
     cor nenhuma e herdavam. Os 66 `gray-700` estavam sozinhos contra a maioria;
   · **o cinza escondia decisões já tomadas.** Quatro mapas tinham uma entrada de "nenhum" em
     cinza cru, e a resposta estava em `comparacoes-de-cor/cinza-de-desligado.html` desde
     20/08 — "acompanha o tema, com `--status-neutro`". A conversão não decidiu nada ali,
     só entregou;
   · **o site público é outro produto.** Decisão dela: a landing pinta a própria paleta, com
     seções escuras de propósito, e ali o `gray-400` claro sobre escuro está CERTO. As 149 que
     sobram são quase todas dela, mais quatro componentes órfãos que ninguém importa.

2. **Os papéis que faltam** (§1) — por mapa, nunca por classe. Mesma alavanca do item acima.
3. **`red` e `emerald`** (§5) — aí sim inventário por motivo, na forma da `filaDoAlerta`, porque
   não têm concentração. O molde está em `medirCorCrua.ts`, e a `chamadoStatusColors.test.ts`
   mostra a variante que varre por conjunto de chaves em vez de por classe.

   **O inventário foi feito em 11/09/2026 e está renderizado**, não convertido:
   [`comparacoes-de-cor/vermelho-e-verde-o-que-cada-um-diz.html`](comparacoes-de-cor/vermelho-e-verde-o-que-cada-um-diz.html).
   As 248 ocorrências caíram em **14 motivos**, sem sobra. Dois deles (ação destrutiva e erro, **81
   ocorrências**) já têm precedente — é o mesmo `destructive` do `osg-red` — e quatro param em
   decisão dela. Dois achados que a varredura por família não daria:

   · **o lote está mal recortado.** 16 dos 78 arquivos carregam `green` (77) ou `rose` (22) cru na
     MESMA escada. Converter só `red`/`emerald` troca escada crua por escada com token de um lado e
     cor de estoque do outro — o defeito que o motivo `escada-de-status` existe para evitar;
   · **27 das 176 vermelhas não destroem nada**: 19 são o botão "Limpar filtros" e 8 são o X de
     fechar modal — quatro cópias byte a byte de `hover:text-red-500 hover:bg-red-50`, e como o
     vermelho só aparece no hover, ninguém viu. No cartão de erro, `text-red-500` sobre `red-50` dá
     **3,44:1** e reprova AA justamente na linha que diz o que houve.
4. ~~**`projects.status`** (§3)~~ — **fechado em 10/09/2026.** E ele saiu desta lista com uma
   correção junto: não era "o único item que o CLIENTE vê". A tabela de vínculo está vazia,
   então nenhum cliente via nada. Ver o §3, que agora é a retificação do próprio §3.

O `osg-red` saiu desta lista: fechou em 03/09 e virou catraca (§7).
