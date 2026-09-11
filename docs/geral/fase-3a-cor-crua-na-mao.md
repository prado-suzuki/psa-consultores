# Fase 3a — a cor crua sai da mão (Mapa e Board)

**Executada em 31/08/2026**, em cinco commits. Este documento existe porque ela só estava
escrita nas mensagens desses commits: quem quisesse saber o que a fase 3a fez, o que ela
deixou de fora **de propósito**, e por que a 3b não pode ser feita por varredura, tinha que
ler `git log`. Não é plano em aberto — é registro do que foi feito e da fila que sobrou.

Os cinco commits, na ordem:

| commit | o que saiu da mão |
|---|---|
| `83cb57b3` | a escala slate dos dois CSS do Mapa (`cadastro.css`, `cascata.css`) |
| `465811bd` | os três teals do `cadastro.css` que eram token de verdade |
| `32a6aebc` | o teal da Rotina nos três CSS do Mapa → `--primary` do Board |
| `03011c03` | o teal da Rotina no cromo `.tsx` do Mapa, e o alfa em hex junto |
| `61d2cbfe` | a escala slate em quatro componentes do Mapa |

## O que a fase 3a é, e o que ela não é

**Ela tira o valor da mão. Ela não escolhe papel.**

O `cadastro.css` e o `cascata.css` eram os dois maiores depósitos de cor crua do repositório,
e estavam meio convertidos: `var(--on-surface)` num lugar e hex cravado na linha de baixo. A
3a apontou toda a escala slate deles para `--slate-100` … `--slate-900`, inclusive as formas
`rgba`, que viraram `hsl(var(--slate-N) / alfa)`.

O alvo foi o token da **escala**, não o nome semântico do Mapa, e a razão é medida:
`--mapa-on-surface` é `213 56% 12%` (`#0d1c2e`) e o hex cravado era `#0f172a` — trocar por
`var(--on-surface)` mudaria a cor. **Escolher qual papel cada lugar merece é a fase 4**, que
vai por área e por tela, na mão.

A troca de slate **não** é bit a bit: os tokens do `index.css` estão em HSL arredondado para
porcentagem inteira, então seis dos nove não reproduzem o hex do Tailwind exatamente. A
diferença máxima é de 1 em 255 por canal — abaixo da quantização de qualquer tela. O que muda
de verdade é a direção: o Mapa deixa de seguir a escala do Tailwind e passa a seguir a do
sistema.

## O achado que mudou o enunciado da fase

O enunciado inicial supunha que `#0d9488` fosse um token disfarçado — o mesmo teal, escrito à
mão. **Não é.** Medido contra a escala inteira:

| | valor | distância até `#0d9488` |
|---|---|---|
| `--teal-500` | `#0d877c` | 13/255 — o vizinho mais próximo |
| `--teal-600` (a marca, `--primary`) | `#0a756c` | 31/255 |

A escala teal do `index.css` foi **retunada** para longe da do Tailwind; só `--teal-100` e
`--teal-200` sobreviveram nos valores originais. Então trocar `#0d9488` por `hsl(var(--primary))`
**escurece**, e escurece de propósito: `#0d9488` é `175 84% 32%` e dá 3,74:1, que não passa; o
`--primary` é `175 84% 25%`.

A história por trás disso é o que justifica a troca: o `#0d9488` era a cor da **Rotina**, e
estava sendo usada como base do sistema inteiro. Depois veio o `#0a756c`, aplicado no **Board**,
e as cores do Board substituíram as da Rotina. Todo `#0d9488` cravado é **resíduo da Rotina** —
não é escolha a preservar.

No Mapa o alvo foi `--primary` e não `--teal-600` porque o próprio `mapa.css` já declara
`--accent-color: hsl(var(--primary))`: ali o teal é acento, e acento segue a área.

Um detalhe que só aparece ao converter gradiente: o botão pill foi convertido **inteiro**, não
stop a stop. Com só o stop do meio trocado, o último (`#0f766e`) ficava a 1/255 dele e o
gradiente morria na metade. A rampa hoje é `--teal-500` → `--teal-600` → `--teal-700`
(`#0d877c` → `#0a756c` → `#075f58`), que desce de verdade.

## A armadilha que impede `sed` cego

Existe no repositório o padrão de **concatenar dois dígitos de alfa no fim do hex**:

```tsx
style={{ background: `${cor}20`, color: cor }}
```

Com token no lugar do hex isso produz `hsl(var(--primary))20` — CSS inválido. O fundo
**desaparece sem erro**. Nenhum lint pega, nenhum teste pega, e a tela fica sem o fundo.

A saída usada nos dois casos do Mapa (`ProcessoDetalheModal` com `1f`, `ProjetoDetalhe` com
`14`) foi `color-mix(in srgb, currentColor N%, transparent)`, que funciona com qualquer valor
de cor e não precisa do hex. `color-mix` já era usado no `index.css` e no `BoardStatStrip`.

O script que fez a conversão em massa tem uma guarda: **ele se recusa a tocar arquivo com alfa
concatenado no fim do hex.** É por isso que os arquivos abaixo continuam crus.

**Medido em 01/09/2026: sobram 13 ocorrências, em 10 arquivos** — todas fora do Mapa, e cada
uma trava a conversão do arquivo dela. Para a fila de hoje, meça em vez de confiar nesta linha:

> **Remedido em 11/09/2026: eram 18, em 11 arquivos — e CINCO não travavam nada, porque já
> tinham quebrado. As cinco foram consertadas** em `232b9864`, com `comAlfa()` em
> `src/lib/corComAlfa.ts` e catraca própria (`filaDoAlfaColado.test.ts`), e sobram **13** na fila,
> inventariadas por motivo.
>
> **A linha acima dizia 13, a primeira remedição disse 14, e as duas contaram menos** — porque o
> recorte da busca listava os caracteres aceitos dentro das chaves. Faltava `[`/`]` (mais duas em
> `UfDrillDown`) e depois faltava **espaço e sinal**, e foi aí que apareceram as duas de
> `DesempenhoReunioes1a1` (`${sentimentColors[r.sentimento - 1]}20`) — justamente as duas últimas
> quebradas. O comando abaixo é a forma que vale: **qualquer coisa dentro das chaves**, com os dois
> dígitos hex encostados na **crase**, que é o que separa alfa colado de interpolação legítima
> terminando em dois dígitos.
>
> Em `ui/ai-prompt-box.tsx:118`, `DesempenhoMetas.tsx:237` e `:241`, e
> `DesempenhoReunioes1a1.tsx:182` e `:227` o valor que chegava **já era `var(--token)`**, não hex.
> Lido no DOM: o fundo do modo ativo do compositor do agente **não existia** (ficava com menos
> preenchimento que um modo inativo sob o mouse), a trilha das barras da régua do PPR **não existia**
> (a barra perdia a referência de proporção) e os cinco botões do seletor de sentimento da reunião
> 1a1 ficavam sem fundo — este último é **controle**, e o único sinal de seleção que sobrava era o
> anel, que também não funcionava (estava escrito `ringColor`, que não é propriedade CSS; o anel do
> Tailwind lê `--tw-ring-color`).
>
> **Duas correções de método.** O **sufixo é HEX, não porcentagem**: `26` é 15%, mas `15` é **8,2%** e
> `30` é **18,8%** — a tabela inteira está no docstring de `corComAlfa.ts`. E declaração com `var()`
> inválida **não é ignorada, vira `unset`** — em `background` isso é transparente, mas em
> `border-color` é `currentColor`, e aí a borda fica **100% opaca** em vez dos 18,8% pedidos. Quem
> procurar só "fundo que sumiu" perde metade dos casos.
>
> As três telas estão renderizadas, antes e depois, em
> [`comparacoes-de-cor/cor-que-viaja-como-dado.html`](comparacoes-de-cor/cor-que-viaja-como-dado.html).

```bash
# qualquer coisa dentro das chaves, hex encostado na crase
grep -rnoE '\$\{[^}]*\}[0-9a-fA-F]{2}`' src --include=*.tsx --include=*.ts
```

## O que ficou de fora, e não é esquecimento

**A separação 3a/3b não é por arquivo — é por USO.** O `DashboardRoiPage` tem os dois.

Fica para a **3b**: os pontos que alimentam **gráfico** — `dashboard-roi/Charts.tsx`,
`dashboard-roi/Primitives.tsx`, o eixo do `SetorEvolucaoPage` e os `cor:` do `DashboardRoiPage`
— mais o `DiagramViewer`, que é mermaid.

O motivo é um só: são **paleta categórica** (navy, vermelho, âmbar, teal claro) e saem para PNG
pelo `html-to-image`. Token que resolve por `var()` no `<html>` e imagem exportada não são o
mesmo problema. Essa é a **decisão 4, que segue sem resposta** — e enquanto ela não for
respondida, converter esses pontos é adivinhar.

## A fila que sobrou

Medida em 01/09/2026 — os comandos estão aqui porque o número envelhece e o comando não.

```bash
# teal residual da Rotina (6 dos 61 estão em COMENTÁRIO no index.css: são prosa, não dívida)
grep -roiE "#0d9488" src | wc -l          # 61

# cor crua do Tailwind em componentes e páginas
grep -rnoE "(bg|text|border|ring|fill|stroke|from|to|via)-(slate|zinc|neutral|stone|red|orange|amber|yellow|green|emerald|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}" \
  src/components src/pages --include=*.tsx --include=*.ts | wc -l

# a primitiva que nenhum tema sobrescreve
grep -rnoE 'teal-(500|600|700)' src/components src/pages | wc -l
```

O `#0d9488` residual está concentrado em **duas famílias**, e as duas são 3b ou fase 4, não 3a:
a calculadora IBS/CBS (que é onde vive quase todo o alfa concatenado) e o Mapa/ROI (que é
gráfico).

> **Esta linha estava errada sobre a calculadora, e foi medida em 11/09/2026.** A 3b é sobre cor que
> **sai para PNG** pelo `html-to-image` — e `html-to-image` é importado em **um** arquivo do produto,
> `src/lib/roiVisualExport.ts`, com **um** consumidor, `DashboardRoiPage`. A calculadora IBS/CBS não
> passa por ali: ela exporta **CSV**. As 9 ocorrências de alfa concatenado dela **nunca dependeram da
> decisão 4** — ficaram paradas atrás de uma pergunta que não era sobre elas.
>
> O recorte que **sobra** de verdade, e ele é mecânica e não decisão: os **chips, badges e quadrados de
> ícone** da calculadora convertem hoje, porque são CSS e `var()` resolve; as **séries do Recharts**
> não, porque recebem a cor em **atributo** (`<Cell fill={…}>`), onde `var()` não resolve. Isso é frente
> própria, medível, e não espera a decisão 4. Fora delas sobram casos avulsos — `OsgWorkIcon`, `OsgProjectsIcon`,
`DailySprintProgressCard`, `constants/brandColors.ts`, `utils/pdf/theme.ts`.

## O que a fase 3a NÃO resolve, e por que a fase seguinte é por papel

A 3a trocou valor por token onde o token já era óbvio (escala slate, teal da marca). O que
sobra não tem token óbvio: `bg-amber-50` num painel de aviso não é "um âmbar do sistema", é um
**papel** — `alerta` — que alguém tem que reconhecer olhando a tela. Por isso a frente seguinte
anda **um papel por vez**, e pela alavanca que funcionou no `destrutivo`: **variante no `ui/`,
não varredura**.

Duas coisas medidas que a fase seguinte precisa saber de saída:

- **O `.dark` não declara nenhum `--status-*`.** Painel que use `bg-status-alerta-soft` cai no
  valor do tema claro quando o escuro entrar. O alvo de painel é o semântico com alfa —
  `border-warning/40 bg-warning/10`, texto em `foreground` —, que é o padrão que a casa já usa
  e a recomendação registrada em `comparacoes-de-cor/superficie-de-estado.html`.
- **Nem todo âmbar é `alerta`.** Uma pílula `bg-amber-100 text-amber-700` escrita "Em Pausa" é
  o papel `espera`; "Em Andamento" é `andamento`; "Líder" não é status nenhum. Varredura por
  classe converte os três para a mesma coisa e apaga a distinção. É o mesmo achado do
  `superficie-de-estado.html`: os 22 avisos não eram um caso, eram sete.

## Relacionados

- [`paleta-por-area.md`](paleta-por-area.md) — o contrato em vigor: papéis, tons, quem resolve
  o quê.
- [`comparacoes-de-cor/LEIA.md`](comparacoes-de-cor/LEIA.md) — as decisões tomadas olhando, e
  as três que seguem em aberto.
