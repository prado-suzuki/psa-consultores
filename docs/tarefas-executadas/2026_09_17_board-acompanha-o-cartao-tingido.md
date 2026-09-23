# O Board acompanha: o cartão dele desce para tingido

**Decisão da Patrícia em 17/09/2026**, depois de comparar o tema do Board com o
contrato geral:

> "O board acompanha então."

E, no mesmo fôlego, o recorte que esta tarefa precisa respeitar:

> "Só os gráficos do board que eu gosto deles, acho moderno e clean."

As duas coisas cabem juntas, e a medição abaixo é o que prova: **o que ela gosta nos
gráficos não é a superfície branca.** É a forma (raio 16px, sombra rasa, barra com topo
de 6px), a paleta categórica — que já é derivada dos tokens do sistema (`--tag-a`,
`--tag-b`, `--tag-c`, `--area-5`) — e a rampa de tinta de quatro degraus. Nada disso se
mexe quando a superfície tinge. O que se mexe são **três degraus**, e um deles é da
grade do gráfico.

---

## Por que o Board ficou para trás

Em 12/09/2026 o cartão do produto desceu de `--card` para `bg-superficie-cartao`
(`hsl(var(--muted) / 0.35)`). A mudança foi no `<Card>`, e **o Board não passa por
lá**: ele pinta com CSS escrito à mão no `index.css` — `.v3-card`, `.v4-card`, `.kpi`,
`.mc` — que lê `--bd-surface`, e `--bd-surface` é `hsl(var(--card))`.

Resultado: cartão do Board branco, cartão do resto tingido. **Mesma coisa com dois
tratamentos, e ninguém escolheu isso.**

O alcance não é só `/equipe/board`. **19 arquivos** consomem as classes, incluindo
`/gerencial/desempenho` e `/gerencial/performance`. Mexer em `--bd-surface` mexe nas
três frentes de uma vez.

## O que está medido, 17/09/2026

Dos **48** tokens `--bd-*`, **23** já leem token do contrato e **25** são cravados.
A conta abaixo é sobre o que acontece com os cravados quando `--bd-surface` deixa de
ser `hsl(var(--card))` e passa a ser `hsl(var(--muted) / 0.35)` sobre `--bd-page`.

### A rampa de tinta aguenta — esta é a boa notícia

| tinta | Base | Tax | OSG | piso |
|---|---|---|---|---|
| `--bd-ink` | 17,15 → 15,79 | 17,01 → 15,73 | 16,63 → 15,51 | 4,5 |
| `--bd-ink2` | 9,26 → 8,52 | 9,18 → 8,49 | 8,98 → 8,37 | 4,5 |
| `--bd-ink3` | 5,67 → 5,22 | 5,62 → 5,20 | 5,50 → 5,13 | 4,5 |
| `--bd-ink4` | 5,18 → 4,77 | 5,14 → 4,75 | 5,02 → 4,68 | 4,5 |
| `--bd-accent-d` | 6,72 → 6,18 | 6,74 → 6,23 | 6,68 → 6,23 | 4,5 |
| `--bd-risk-d` | 7,69 → 7,08 | 7,62 → 7,05 | 7,45 → 6,95 | 4,5 |
| `--bd-warn-d` | 5,13 → 4,73 | 5,09 → 4,71 | **4,98 → 4,64** | 4,5 |

**Nenhum reprova.** O pior caso é o `--bd-warn-d` na OSG, a **4,64:1** contra um piso de
4,5 — folga de 0,14. Ou seja: a medição de 21/08, que foi feita contra o branco, não
precisa ser refeita do zero. Ela sobrevive.

Isso derruba o argumento que segurava a frente ("descer a superfície move todos os
degraus juntos"). Move, mas **os que carregam texto continuam passando**. Quem não
passa é outra coisa.

### Os três que quebram

**1. A zebra INVERTE de sinal.** `--bd-surface2` (`168 20% 98%`) é hoje levemente mais
escuro que a superfície branca — listra que *desce*. Sobre o tingido ele fica mais
**claro** que a superfície: listra que *sobe*.

| área | hoje | tingido |
|---|---|---|
| Base | 1,036:1, mais escuro | 1,040:1, **mais claro** |
| Tax | 1,260:1, mais escuro | 1,165:1, mais escuro |
| OSG | 1,227:1, mais escuro | 1,144:1, mais escuro |

> **Correção de 17/09/2026, medindo para executar.** A primeira versão desta tabela
> trazia 1,031 (Tax) e 1,008 (OSG), e estava errada: ela mediu o valor do `:root`
> (`168 20% 98%`) contra o cartão de cada área, e **a Tax e a OSG não usam esse valor**.
> O `index.css` tem um bloco `:root.tax-theme, :root.osg-theme` que sobrescreve
> `--bd-surface2` e `--bd-line2` para `hsl(var(--muted))`. Com o valor certo, **o sinal
> inverte só na casa** — a Tax e a OSG continuam com listra que desce, perdendo ~8%. É
> uma área quebrada, não três, e isso encolhe o passo 2.

O número da casa quase não muda — e é exatamente por isso que é perigoso. Uma catraca que
medisse só a razão daria verde. **O que inverte é a direção**, e é o terceiro caso do
mesmo defeito de classe nesta frente: degrau construído sobre uma superfície se move junto
com ela, e nada falha.

**2. A divisória quase some — na casa.** `--bd-line2` (`168 16% 94%`) perde cerca de 65%
do degrau: 1,125 → 1,044. Na Tax e na OSG ele é `hsl(var(--muted))`, o mesmo valor da
zebra, e perde ~8%: 1,260 → 1,165 e 1,227 → 1,144.

**E aqui aparece o TETO, que é o que decide o passo 2.** Recompor os números da Tax e da
OSG por alfa de `--muted` sobre a superfície tingida é **impossível**: a 100%, sem
transparência, ele para em 1,154 / 1,165 / 1,144 — abaixo dos 1,260 e 1,227 de hoje. São
os mesmos três números que a caixa de tabela encontrou em 16/09 (`1,154` · `1,165` ·
`1,144`), porque é a mesma construção: `--muted` sobre um fundo que já é 35% de `--muted`.
Fim de escala, não calibração. Quem alcança os alvos é `--border` opaco (1,122 / 1,248 /
1,225, dentro de 1% dos de hoje) — mas aí `--bd-line2` fica **igual** a `--bd-line`, e os
dois degraus de divisória viram um só.

**3. E este é o dos gráficos:** `GRID_STYLE.stroke` é `var(--bd-line2)`
([`src/lib/board-chart-defaults.ts:56`](../../src/lib/board-chart-defaults.ts)). A
grade tracejada dos gráficos **é** o token do item 2. Descer a superfície sem tocar nele
apaga a grade — e a grade é metade do "clean" que ela gosta.

### O que os gráficos NÃO perdem

Vale escrever, porque delimita o risco:

- **Paleta categórica:** `--bd-blue`, `--bd-purple`, `--bd-cyan`, `--bd-green` já são
  `--tag-b`, `--tag-c`, `--area-5` e `--tag-a`. Derivadas, medidas, intactas.
- **Forma:** `BAR_RADIUS [6,6,0,0]`, raio 16/12/9, as duas sombras. Não dependem da
  superfície.
- **Eixo:** `AXIS_STYLE` já está em `--bd-ink3`, que passa (5,13:1 no pior caso).
- **Tooltip:** `TOOLTIP_STYLE.background` é `--bd-surface` — mas tooltip **flutua sobre
  conteúdo**, e pelo inventário de 12/09 isso é motivo declarado para ficar branco. Ele
  não acompanha; vira `--bd-control` (ver abaixo — **não** `--bd-chrome`, que é
  `#FFFFFF` cravado e não segue a área).

### Os SETE que não acompanham, e por que a lista não era de um

**Achado de 17/09/2026, executando o passo 1: alfa não empilha de graça.** A tarefa
previa só o tooltip. Medindo cada consumidor de `--bd-surface`, sete deles não se apoiam
na página — pintam sobre outra superfície, ou precisam tapar o que está atrás — e com uma
cor translúcida os sete escurecem em silêncio. Dois eram regressão de verdade:

- **A pastilha ligada do segmentado** (`.v3-seg.on`, `.v4-seg-btn.on`) fica sobre o
  trilho de acento, que já está sobre o cartão. Ela ia de **1,150:1 mais clara** que o
  trilho para **1,003:1 mais escura** na casa (1,005 na Tax, 1,006 na OSG) — o controle
  parava de dizer qual opção está ligada. É o mesmo defeito de classe da zebra, num
  lugar que a tarefa não tinha olhado.
- **A célula grudada** da matriz de `clientes-os/shared.ts` é `position: sticky`, e fundo
  translúcido deixa passar a coluna que rola por baixo.

Os outros cinco: os quatro blocos de `SelectTrigger` (`BoardFilterBar`, `BoardClusterBar`
×3, `BoardRecorteBar`), o campo `.v3-fi`, o botão de recolher do `BoardLayout`, o tooltip
do gráfico, o tooltip do mapa e o risco entre as UFs em `BoardMapaClientes` — este último
separa dois *fills* pintados, e some por cima deles.

**O recorte não é novo: é o mesmo que o produto já tinha declarado em 12/09.** O `--card`
não desceu de valor naquele dia justamente porque pinta `SelectTrigger`, `Input` e a
pastilha do segmentado. Daí os dois tokens novos, ao lado do `--bd-surface`:

| token | o que é | quem usa |
|---|---|---|
| `--bd-control` | `hsl(var(--card))` — o branco que o `--bd-surface` era, **seguindo a área** | campo, pastilha, `SelectTrigger`, botão de cromo, os dois tooltips, o risco do mapa |
| `--bd-surface-op` | a MESMA tinta, composta sobre a página, opaca | célula `sticky` da matriz |

O único cravado de gráfico que se mexe é `--bd-accent-l` (série de comparação,
`175 45% 72%`, opaco): 1,609 → 1,481 contra o fundo. Já era fraco no branco; fica mais
fraco. Não é regressão nova, é uma dívida que a tinta expõe — e há registro de que ela
já mordeu antes (o rótulo "2025" a 1,48:1, na nota do `LEGEND_STYLE`).

---

## O que fazer

1. ✅ **FEITO em 17/09/2026 — trocar a fonte de `--bd-surface`** para a mesma tinta do
   `<Card>`, e só ela. Os outros 22 derivados não se tocam. Saiu junto o passo 3, que
   cresceu de um lugar para sete: ver "Os SETE que não acompanham", acima. Catraca no
   mesmo commit (`superficieDoBoard.test.ts`, quatro asserções), com o defeito
   reintroduzido nas quatro antes de commitar.
2. ✅ **FEITO em 17/09/2026, ela escolheu A — recompor a zebra e a divisória.** A medição encolheu
   o passo e mudou a pergunta: **quebra uma área, não três** (o bloco
   `:root.tax-theme, :root.osg-theme` já leva os dois tokens para `hsl(var(--muted))`,
   e lá o sinal não inverte). E o método previsto — "achar o alfa que devolve o
   número" — **não fecha na Tax nem na OSG**: bate no teto de escala do `--muted`, o
   mesmo de 16/09. As saídas medidas:
   - **A, a escolhida** — os dois últimos cravados de superfície do Board saem, e as três áreas usam
     `hsl(var(--muted))`, aceitando o teto. A casa GANHA zebra (1,036 → 1,154, e para
     de ser a única área com listra invisível); a Tax e a OSG perdem ~8% (1,260 → 1,165,
     1,227 → 1,144), que é o custo que ela já aceitou para o hover da tabela em 16/09.
     O sinal deixa de inverter. Custo: na casa, zebra e divisória passam a ter o mesmo
     valor — o que já é verdade na Tax e na OSG hoje.
   - **B** — reproduzir os seis números de hoje, com alfa por área. Fecha, mas exige
     `--border` opaco na Tax e na OSG, e aí `--bd-line2` fica idêntico ao `--bd-line`:
     dois degraus de divisória viram um.
   - A grade do gráfico vem de carona no `--bd-line2` nas duas — não precisa de token
     novo.
3. ✅ Saiu no commit do passo 1 (ver acima).
4. ✅ **A asserção do SINAL** saiu junto com o passo 2, porque era ela que precisava da
   decisão. São cinco asserções na catraca, todas recalculando do fonte. A do sinal foi
   vista reprovando das duas formas que importam: com o cravado de volta no `:root`, e
   com um desvio mais claro reinscrito no bloco de área.
   - **Um efeito colateral bom, e não previsto:** a grade tracejada do gráfico é
     `--bd-line2`, e o medo era que ela sumisse. Na casa ela **ganha** degrau
     (1,125 → 1,154); na Tax e na OSG cai de 1,260/1,227 para 1,165/1,144 e continua
     visível. A grade não some em área nenhuma.
5. ✅ **Validado por ela em 17/09/2026** — a listra, a divisória e a grade do gráfico
   passaram. E foi aqui que apareceu o achado abaixo, que nenhuma medição de arquivo
   pegaria.

## ⚠️ O cartão do Board não lê `--bd-surface`. A premissa desta tarefa está errada

**Achado dirigindo o navegador, 17/09/2026.** Medindo o DOM em `/equipe/board/performance`,
o `.v4-card` volta `background-color: rgba(0, 0, 0, 0)` — raio 0, sombra nenhuma.

A causa é o `BoardLayout.tsx:263`, que põe `bd-leitura` no shell **sem condição**, e a
regra do `index.css`:

```css
.bd-leitura .v4-card, .board-card, .board-kpi, .v4-cyb,
section.rounded-xl, .rounded-2xl.border, .rounded-xl.border {
  background: transparent !important;  border: 0 !important;  box-shadow: none !important;
```

Cruzando classe por classe: as que pintam `--bd-surface` são `v4-card`, `board-card`,
`board-kpi`, `stat-item`, `v3-fbar`, `kpi`, `mc`, `v3-card`, `v4-mc` e `v4-toolbar`. O
`bd-leitura` apaga as cinco primeiras. **Das cinco que sobram, nenhuma é usada em tela
viva:** `v4-mc` só existe no `DesempenhoVisaoGeral`, que é rota desativada, e `kpi` só num
export.

Ou seja: **o cartão do Board nunca foi branco por causa do `--bd-surface`.** Ele é
transparente por causa do modo leitura, e o que aparece é a página. O passo 1 moveu um
token que nenhuma das 10 rotas vivas lê.

Dois erros de método valem o registro, porque são o mesmo erro duas vezes — **conferir o
arquivo não é conferir a tela**:

- a medição que abriu a tarefa leu o `index.css` e não viu um `!important` de outro bloco;
- a lista de rotas saiu de um `grep path="` no `App.tsx` e trouxe **oito rotas que estão
  dentro de um `{/* ... */}`** (a aba Desempenho inteira, desativada em 17/08). Rota
  comentada casa com a busca igual a rota viva. Tirar os comentários antes de listar
  derrubou a contagem para 10.

**A decisão que fica aberta, e é dela:** ou o `bd-leitura` sai do `BoardLayout` — e aí o
Board volta a ter cartão de verdade, tingido como o resto, que é o que ela pediu —, ou o
"Board acompanha" sai do escopo e a tarefa 12 é só a metade da zebra e da divisória.

**Uma reversão já saiu**, porque era o único ponto em que o passo 1 piorou a tela: a célula
grudada da matriz de `clientes-os` voltou ao branco do controle. Tingida, ela era a única
coisa pintada de uma tela sem cartão.

## Tamanho e raio de revert

Três commits, não quatro. O passo 1 sozinho já muda o Board inteiro nas três rotas —
então ele **não** vai junto com o passo 2, e sim antes, para o revert isolar "a tinta
desceu" de "os degraus foram recompostos". O passo 3 foi para dentro do 1 porque não é
frente separada: decidir que uma caixa é cartão e decidir que a outra é controle é a
mesma decisão, e separá-las deixaria a pastilha do segmentado apagada no commit do meio.

## O que esta tarefa não faz

Os `bg-white` crus. São **60 em 43 arquivos** no recorte de caixa arredondada (139 em 78
no total das pastas de tela), e um deles é do próprio Board —
`dashboard-uso-envio/GerencialFiltros.tsx:45`. É frente independente, com catraca
própria, e não bloqueia esta.

Também não mexe nos `--bd-warn` / `--bd-risk` escritos em hexadecimal (`#D4820A`,
`#D03040`). São cor crua que nenhuma catraca vê, porque a de cor crua lê classe em
`.tsx` e isso é CSS — mas é outra conversa, e converter no meio desta mistura duas
medições.
