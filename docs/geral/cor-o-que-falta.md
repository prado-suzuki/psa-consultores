# Cor: o que falta, e por que cada coisa parou onde parou

Estado em **01/09/2026**, ao fim de uma rodada de 19 commits na `develop`.

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

Ficaram três guardas novas: a catraca [`src/lib/filaDoAlerta.test.ts`](../../src/lib/filaDoAlerta.test.ts),
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

Levantado por auditoria em 01/09, **não corrigido**:

| chave | palavras em uso | onde |
|---|---|---|
| `in_progress` | "Em Progresso" × "Em Andamento" | `taskStatusColors` × `mapeamentoStatusColors` × `auditFieldFormatter` |
| `cancelled` | "Cancelado" × "Cancelada" | `projetosCadastro` × `auditFieldFormatter` |
| `completed` | "Concluído" × "Concluída" | três mapas × `auditFieldFormatter` |

Quase mecânico: as duas palavras de cada par já estão em uso, então é escolher qual vira a
canônica — sem inventar rótulo novo. O caminho é o mesmo do `pending`: o rótulo passa a sair
do mapa, e aí a troca seguinte é uma linha.

**Um defeito visível junto:** `MeusChamados.tsx:278` renderiza `{priorityLabels[ticket.priority]}`
sem fallback, e o mapa local não tem a chave `media` — que existe no banco. A pílula sai
**vazia**. Nas outras duas telas de chamado o fallback mostra `"media"` cru, minúsculo. Some
sozinho ao trocar os mapas locais pelo `chamadoPrioridadeConfig`, que já tem `media`.

## 5. Onde a dívida pode crescer sem ninguém ver

| classe de defeito | proteção hoje |
|---|---|
| cor crua âmbar/amarela | catraca `src/lib/filaDoAlerta.test.ts` — igualdade exata, por arquivo, com o motivo |
| `teal-500/600/700` | aviso de ESLint (`no-restricted-syntax`) |
| tom que a escala não tem | `escala/cor-inexistente` e `escala/cor-de-estoque` |
| **verde, vermelho, azul, roxo, e o slate recém-zerado** | **nenhuma** |
| **rótulo divergente** | **nenhuma** — nem teste, nem lint |

As duas linhas em negrito são o buraco. O `slate` acabou de ir a zero e **nada impede** que
volte: a regra `escala/cor-de-estoque` só dispara em nome que o projeto **também** define no
`tailwind.config.ts` (`teal`, `lime`, `gray`), e `slate` não está lá — foi por isso que ele
cresceu até 1529 sem ninguém ver.

O molde já existe e é barato de copiar: a `filaDoAlerta` guarda o **motivo** de cada sobra, o
que faz a lista servir para a conversão seguinte em vez de só contar. Para o slate a catraca
nasceria vazia, que é o caso mais fácil de manter.

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
- **WCAG 1.4.11** — borda de controle a 1,26:1 contra os 3:1 exigidos, nos três temas. Chegar
  lá escurece todo input do produto; é decisão de design, registrada no contrato.
- **`getProcessStageInfo` × `getStageBadge`** — etapa desconhecida vira "Descoberta" num e
  aparece crua no outro. As duas leituras convivem, com o conflito escrito no comentário da
  função, até alguém decidir qual é a certa.

---

## Se você for retomar por um só item

Nesta ordem, do mecânico ao que exige decisão:

1. **Os mapas de rótulo duplicados** (§4) — os seis `statusLabels` de chamado e os seis de
   prioridade. Os textos já batem; é troca de import, e fecha o badge vazio de quebra.
2. **A catraca do slate** (§5) — nasce vazia, e é o que impede 1529 de voltarem.
3. **`in_progress`, `cancelled`, `completed`** (§4) — uma decisão sua, três pares, e o rótulo
   passa a sair do mapa.
4. **Os papéis que faltam** (§1) — por mapa, nunca por classe.
5. **`projects.status`** (§3) — precisa da decisão de produto antes de tudo.
