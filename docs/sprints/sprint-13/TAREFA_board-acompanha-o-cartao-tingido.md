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
| Base | 1,040:1, mais escuro | 1,045:1, **mais claro** |
| Tax | 1,031:1, mais escuro | 1,049:1, **mais claro** |
| OSG | 1,008:1, mais escuro | 1,064:1, **mais claro** |

O número quase não muda — e é exatamente por isso que é perigoso. Uma catraca que
medisse só a razão daria verde nas três. **O que inverte é a direção**, e é o terceiro
caso do mesmo defeito de classe nesta frente: degrau construído sobre uma superfície se
move junto com ela, e nada falha.

**2. A divisória quase some.** `--bd-line2` (`168 16% 94%`) perde cerca de 70% do
degrau: 1,129 → 1,039 (Base), 1,120 → 1,035 (Tax), 1,095 → 1,021 (OSG).

**3. E este é o dos gráficos:** `GRID_STYLE.stroke` é `var(--bd-line2)`
([`src/lib/board-chart-defaults.ts:56`](../../../src/lib/board-chart-defaults.ts)). A
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
  não acompanha; vira `--bd-chrome`.

O único cravado de gráfico que se mexe é `--bd-accent-l` (série de comparação,
`175 45% 72%`, opaco): 1,609 → 1,481 contra o fundo. Já era fraco no branco; fica mais
fraco. Não é regressão nova, é uma dívida que a tinta expõe — e há registro de que ela
já mordeu antes (o rótulo "2025" a 1,48:1, na nota do `LEGEND_STYLE`).

---

## O que fazer

1. **Trocar a fonte de `--bd-surface`** para a mesma tinta do `<Card>`, e só ela. Os
   outros 22 derivados não se tocam.
2. **Recompor os três degraus quebrados**, pelo mesmo método que o
   `bg-superficie-realce` usou em 12/09 — achar o alfa que devolve o número, não
   escolher um tom novo no olho:
   - `--bd-surface2`: precisa voltar a ser **mais escuro** que a superfície. Deixar de
     ser opaco e virar alfa sobre a superfície resolve os dois problemas de uma vez (o
     sinal e o acompanhamento de área).
   - `--bd-line2`: mesmo tratamento, mirando os 1,12 de hoje.
   - a grade do gráfico vem de carona no `--bd-line2` — não precisa de token novo.
3. **Tooltip e chrome ficam brancos**, por motivo inventariado (flutua sobre conteúdo).
4. **Catraca `superficieDoBoard.test.ts`**, e ela tem de cobrar o que a do cartão não
   cobra: **o SINAL do degrau**, não só a razão. Recalculando do `index.css`, como a
   `cartaoTingido` faz — não com número copiado para dentro do teste.
5. **Validar olhando**, nas três áreas, com um gráfico na tela. É o passo que decide se
   "moderno e clean" sobreviveu, e nenhum número responde por ele.

## Tamanho e raio de revert

Quatro commits, na ordem acima. O passo 1 sozinho já muda o Board inteiro nas três
rotas — então ele **não** vai junto com o passo 2 no mesmo commit, e sim antes, para o
revert isolar "a tinta desceu" de "os degraus foram recompostos".

## O que esta tarefa não faz

Os `bg-white` crus. São **60 em 43 arquivos** no recorte de caixa arredondada (139 em 78
no total das pastas de tela), e um deles é do próprio Board —
`dashboard-uso-envio/GerencialFiltros.tsx:45`. É frente independente, com catraca
própria, e não bloqueia esta.

Também não mexe nos `--bd-warn` / `--bd-risk` escritos em hexadecimal (`#D4820A`,
`#D03040`). São cor crua que nenhuma catraca vê, porque a de cor crua lê classe em
`.tsx` e isso é CSS — mas é outra conversa, e converter no meio desta mistura duas
medições.
