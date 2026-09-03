# Cor: o que falta, e por que cada coisa parou onde parou

Estado em **03/09/2026**. O corpo do documento é a rodada de 19 commits de 01/09; em 03/09
vieram quatro rodadas em cima dele — os rótulos de chamado, o estado de documento, a palavra
única dos três pares e a âncora vermelha da OSG —, e o §5 ganhou três catracas.

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

## 2. As escadas que exigem decisão, não conversão

Estas ficaram paradas de propósito. Cada uma precisa de uma escolha sua antes de virar código.

| onde | a escolha |
|---|---|
| `projectPresentation.tsx`, `getStatusBadge` | `blocked` é `espera` ("travado por alguém de fora") ou `ajuste` ("deu problema")? Hoje é vermelho, e o `archived` do lado já está em papel |
| `PerDetailModal.tsx` | ~20 estados de PER/DCOMP que não mapeiam nos oito papéis. Precisa decidir o vocabulário antes da cor |
| as 12 paletas categóricas | `pageCategoryStyles`, `roleOptions`, `AgendaTab` e outras têm 5 a 7 categorias. O contrato tem **quatro** `--tag-*`, e são quatro de propósito. Não há token para a quinta |

## 3. `projects.status` — não é dívida de cor, é defeito de produto

**O achado mais sério da rodada, e o único que o usuário final vê.**

Medido em produção pelo MCP do Lovable em 01/09: a coluna `projects.status` guarda
`"Melhorias"` (10 linhas) e `"Diagnóstico"` (7). Mais nada.

E existem **três** mapas em código para essa mesma coluna, com três vocabulários, e nenhum
deles casa com o dado:

| arquivo | o que espera |
|---|---|
| `pages/cliente/ClienteDashboard.tsx` | `planning / active / on_hold / completed` |
| `components/equipe/projetos/ProjectFilters.tsx` | `active / completed / blocked / archived` |
| `lib/dashboardClientesOs/aggregations.ts` | seis chaves, outro conjunto ainda |

O que isso produz hoje, na tela:

- o **cliente** vê os 17 projetos como "Em Planejamento", com **0% de progresso** — o mapa cai
  no fallback e o `getProjectProgress` cai no `default: return 0`;
- o **filtro da equipe** oferece Ativo / Concluído / Bloqueado / Arquivado, e os quatro
  retornam **zero linhas**.

⚠️ **Não conserte isso mexendo em mapa.** A pergunta é qual é o ciclo de vida real do projeto:
"Melhorias" e "Diagnóstico" são o vocabulário certo (e aí os mapas mudam de chave, e alguém
diz que progresso cada etapa representa), ou os dados é que estão fora do padrão (e aí é
migração)? É decisão de produto, e vem antes de qualquer linha de código.

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
| **verde, vermelho, azul, roxo, laranja** | **nenhuma** |
| rótulo divergente de **chamado** | catraca `src/lib/chamadoStatusColors.test.ts` — nasce **vazia**, varre pelo conjunto de chaves |
| rótulo divergente de status | catraca `src/lib/rotulosDeStatus.test.ts` — pega "Em Progresso" em JSX e trava a palavra dos três mapas |

A linha em negrito é o buraco que sobrou: cor crua nas famílias que não têm guarda nenhuma.

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

Também seguem abertas as três decisões registradas em
[`comparacoes-de-cor/LEIA.md`](comparacoes-de-cor/LEIA.md): porta de entrada, superfície de
estado, e o resto dos tokens escritos à mão.

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
- **WCAG 1.4.11** — borda de controle a 1,26:1 contra os 3:1 exigidos, nos três temas. Chegar
  lá escurece todo input do produto; é decisão de design, registrada no contrato.
- **`getProcessStageInfo` × `getStageBadge`** — etapa desconhecida vira "Descoberta" num e
  aparece crua no outro. As duas leituras convivem, com o conflito escrito no comentário da
  função, até alguém decidir qual é a certa.

---

## Se você for retomar por um só item

Nesta ordem, do mecânico ao que exige decisão:

1. **A catraca de mais uma família** (§5) — `red` e `emerald` são as maiores sem guarda, e
   nenhuma tem concentração: em 03/09 eram 207 e 135 ocorrências espalhadas por ~100 arquivos,
   com o maior arquivo em 9. Ou seja, **não** é conversão por mapa como as três rodadas
   anteriores; é inventário por motivo, na forma da `filaDoAlerta`. O molde está em
   `medirCorCrua.ts`, e a `chamadoStatusColors.test.ts` mostra a variante que varre por
   conjunto de chaves em vez de por classe.
2. **Os papéis que faltam** (§1) — por mapa, nunca por classe. É o que rendeu nas quatro
   rodadas de 03/09: procurar o mapa do domínio antes de escrever classe achou, das quatro
   vezes, reuso que não tinha acontecido — na última, um `ACTION_LABELS` de três entradas
   com três vocabulários de cor dentro.
3. **`projects.status`** (§3) — precisa da decisão de produto antes de tudo.

O `osg-red` saiu desta lista: fechou em 03/09 e virou catraca (§7).
