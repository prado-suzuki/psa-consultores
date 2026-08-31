# Design system do Board (v5) — a referência aprovada, na marca PSA

Refatoração visual da área Board de 21/08/2026. **Não muda nenhum número, nenhuma
query e nenhum cálculo** — muda o vocabulário visual da área inteira e a fonte de
onde a cor vem.

## O problema, em uma frase

O Board tinha **três** gerações de design system convivendo (`--board-*` v2,
`--in`/`--gr`/`--t1` v3, `--board-v4-*`), cada uma com o próprio índigo, o próprio
cinza-azulado e o próprio raio. Três paletas parecidas-mas-não-iguais na mesma área
é o que produzia a sensação de tela remendada: o "verde de ok" tinha três valores, o
card do Estratégico não tinha o mesmo raio do card de Desempenho, e o acento
(índigo `#5B6EF0` / `#4B63F7`) não vinha de lugar nenhum da marca.

## As quatro decisões

### 1. Uma fonte de verdade: o bloco `--bd-*`

`src/index.css` ganhou um bloco único — **BOARD v5** — com superfícies, rampa de
tinta, acento, semânticos, raios e sombras. As três gerações antigas continuam
existindo pelo NOME, como apelidos:

```css
--board-v4-accent: var(--bd-accent);   /* v4 → v5 */
--board-indigo:    var(--bd-accent);   /* v2 → v5 */
--in:              var(--bd-accent);   /* v3 → v5 */
```

Por que apelido em vez de renomear em 20 arquivos: renomear é churn sem ganho
visual, e o apelido faz as telas que **não** foram tocadas (Operacional,
Desempenho, Minha Evolução, Relatórios) receberem o visual novo sem uma linha de
diff. Token novo entra no bloco v5, nunca num bloco de compatibilidade.

### 2. O acento é a marca

O Board é a área da **diretoria** — a única tela onde quem olha olha a empresa, e
não uma área dela. Ela veste o teal institucional (`#0D877C`, o mesmo `--primary`),
não uma identidade de área nova.

O argumento decisivo é concreto, não estético: o Board **hospeda módulos
compartilhados**. Capacidade monta o `AreaDashboardContent` (o mesmo do Tax e da
OSG), Clientes monta a lista, e os dois entram com o teal do tema base. Chrome
índigo + conteúdo teal eram duas marcas na mesma tela.

Consequência para as outras áreas: o dashboard "Clientes e OS" roda no Board, na
Tax e na OSG a partir do mesmo componente. Um bloco em `:root.tax-theme,
:root.osg-theme` faz os `--bd-*` de superfície e de acento apontarem para os
tokens semânticos daquele tema, então lá ele continua marfim/teal e areia/musgo.
Substituiu o bloco `:root.osg-theme` anterior, que repetia hexadecimais de areia
à mão.

### 3. Uma cor de acento, e cor de estado só onde há estado

A faixa de KPIs pintava seis cabeçalhos em seis matizes (índigo, ciano, âmbar,
roxo, cinza, verde) numa faixa de 3px no topo de cada cartão. Nada ligava "roxo" a
"valor acumulado": era decoração, e era o maior responsável pela cara de template.

Agora:

- **acento** pinta o que é MEDIDA (projetos, horas, valor, ROI);
- **âmbar / carmim** só aparecem onde existe estado (pontualidade abaixo da meta,
  contrato vencido, lacuna de cadastro);
- **cinza** fica para o que não pode ser medido (custo de projeto, que não tem
  campo no backend);
- os categóricos deixaram de ser hex de web e passaram a ser tons do sistema —
  `--tag-b` (ardósia), `--tag-c` (uva), `--area-5` (petróleo).

### 4. O chrome ficou claro

A barra lateral era azul-noite (`#0C1222`), a única superfície escura do sistema
(Tax e OSG têm barra clara). Passou a ser branca, com o item ativo numa **pílula
cheia** no teal escuro e o chip do usuário no topbar — onde continua visível com a
barra recolhida.

### 5. O Board saiu da infraestrutura (correção de 21/08, à noite)

A primeira versão desta refatoração pintou o chrome do Board de teal e **deixou o
tema semântico como estava** — e estava errado: `/equipe/board` era mapeado como
infraestrutura em `src/lib/areaTheme.ts`, então o `<html>` carregava
`.sistema-theme`, cujo `--primary`/`--accent`/`--ring` é grafite quente
(`35 10% 26%`).

Resultado na tela, e foi a usuária que viu ao abrir: **quatro famílias ao mesmo
tempo**. Cartões, gráficos, tabelas e barra lateral em teal (os `--bd-*`); todo
botão, select, calendário e anel de foco em grafite; superfícies dos módulos
compartilhados (Capacidade, Clientes) em marfim; e as oito subtelas de Desempenho
pintando com hexadecimal de estoque do Tailwind (emerald `#10B981`, amber
`#D97706`, blue `#3B82F6`, violet `#EDE9FE`, slate `#F1F5F9`) mais o índigo/roxo
do design antigo do Board em quatro avatares.

A correção tem três partes:

1. **`/equipe/board` deixou de ser infraestrutura** (`MAPA_DE_ROTAS`: `sistema` →
   `board`). Dev e Acessos *servem* o sistema; o Board é a tela da diretoria, e
   área de negócio veste a marca. O comentário do próprio arquivo já previa que a
   mudança seria uma palavra na tabela.
2. **`.board-theme`**, um delta de acento + superfície, com os MESMOS números do
   bloco `--bd-*` — é o que faz o card do shadcn e o card do Board serem o mesmo
   branco. Herdava do piso os papéis de status e os tons de tag, e o porquê está
   em `docs/geral/paleta-por-area.md`.

   > **Atualização de 31/08/2026:** esse bloco não existe mais. As superfícies
   > dele foram movidas para o `.base-theme` e viraram as da CASA — o Board é a
   > tela da diretoria, e a âncora dele sempre foi a do piso. `/equipe/board`
   > resolve `base-theme` sozinho, e renderiza idêntico ao que este documento
   > descreve. O que mudou foi o alcance: as mesmas superfícies agora valem
   > também nas 41 rotas que ficavam no piso puro e nas 27 do Dev. Ver a seção
   > "O Board VIROU a casa" em `docs/geral/paleta-por-area.md`.
3. **As oito subtelas de Desempenho entraram na família**: ~55 hexadecimais de
   estoque viraram token, e a faixa escura dos cartões de PPR passou de grafite
   para teal profundo (branco em cima: 16,8:1 e 12,5:1, medidos nos valores
   novos).

A lição, para a próxima área: **trocar o design system de uma área sem trocar o
tema semântico dela deixa metade da tela para trás.** O chrome é o que o
refatorador vê; os controles, o que o usuário clica.

## Contraste (o que foi medido)

Todo tom que carrega TEXTO tem um degrau `-d`; o tom cheio fica para área grande
(barra, anel, faixa, ponto, fundo de pílula). Medido sobre `--bd-surface` (#fff),
`--bd-page` e o tint do próprio tom, que é onde cada um vive:

| Token | no branco | na página | no próprio tint |
|---|---|---|---|
| `--bd-ink` | 17,1:1 | 15,8:1 | — |
| `--bd-ink2` | 9,3:1 | 8,6:1 | — |
| `--bd-ink3` | 5,6:1 | 5,2:1 | 5,0:1 (`line2`) |
| `--bd-ink4` | 5,2:1 | 4,8:1 | 4,6:1 (`line2`) |
| `--bd-accent-d` | 6,7:1 | 6,2:1 | 5,7:1 |
| `--bd-warn-d` | 5,1:1 | 4,7:1 | 4,7:1 |
| `--bd-risk-d` | 7,7:1 | 7,1:1 | 6,6:1 |

Dois pontos que valem registro:

- **`--bd-accent` (o teal cheio) dá 4,40:1 no branco** — suficiente para marca de
  gráfico (3:1), insuficiente para texto (4,5:1). Ele NUNCA pinta letra e NUNCA
  recebe letra branca. Quem faz isso é o `-d`. Vale para a pílula ativa do menu,
  para o chip cheio e para o número do KPI.
- **`--bd-risk-d` é novo.** O `--bd-risk` dava 4,32:1 sobre o próprio tint no
  `.pill-down` — passava no branco e falhava onde de fato vivia.
- **O eixo dos gráficos era o pior contraste da área**: rótulo de 9px em `#B0BBC8`,
  1,95:1. Virou 10,5px no `--bd-ink3` (5,6:1).

## Formas novas

| Primitiva | Onde | Regra |
|---|---|---|
| `BoardCard` (`src/components/board/ui/`) | todo bloco do Board | cabeçalho = título + subtítulo + **controle à direita**; ressalva no rodapé. Antes esse cabeçalho era flexbox inline reescrito em oito componentes, com quatro medidas diferentes |
| `BoardRing` (`src/components/board/ui/`) | KPI de proporção | **anel** responde "quanto de um todo", num número só; **barra** responde "quem é maior", em lista. Ranking (concentração, projetos críticos) continua em barra de propósito — cinco anéis não se comparam entre si |
| `.v4-tbl` | tabelas | cabeçalho em caixa alta minúscula, grudado na rolagem, régua só embaixo da linha, hover de linha inteira, sem grade vertical |
| `.v4-toolbar` / `.v4-seg` | filtros | barra de filtros é um card, e o segmentado é pílula com o botão ligado em branco |

O "Preenchimento do sistema" deixou de ser `display: grid` com sete larguras
cravadas numa constante (e o cabeçalho com as MESMAS sete repetidas à mão) e virou
`<table>`: a largura passou a ser problema do navegador, o cabeçalho gruda, e o
leitor de tela anuncia "coluna Sem responsável".

## O que NÃO entrou

- **Ferramentas** (`DashboardUsoEnvioGerencial` e `dashboard-uso-envio/*`): tem
  design próprio (teal + slate + Work Sans, faixa escura de KPI) e testes
  acoplados aos primitivos. Recebeu só o chrome novo em volta.
- **Módulos compartilhados** montados dentro do Board (Capacidade → 
  `AreaDashboardContent`, Clientes → lista): não foram tocados de propósito. Eles
  vestem o tema do hospedeiro, e o hospedeiro agora é teal — o que antes brigava,
  agora casa.
- **Renomear os apelidos v2/v3/v4 para `--bd-*` nos 20 arquivos consumidores.**
  Fica como limpeza separada; hoje o apelido é o que sustenta as telas não
  tocadas.

## Validação

`bunx eslint` nos arquivos alterados (0 erros), `bun run typecheck`, `bun run
build` e `bunx vitest run` (308 arquivos / 3637 testes na medição desta
refatoração; 309 / 3648 depois que o Agente PSA entrou, no mesmo dia) passando.

Uma nota sobre o que aconteceu em paralelo: no mesmo dia, o **Agente PSA** tirou
da grade do Estratégico a faixa "Exige decisão" e o banner "Dados incompletos",
e deletou o `BoardAIBox`. Os dois blocos passaram a viver no painel do agente,
aberto pelo ícone ao lado do título da tela. Isso é uma mudança de CONTEÚDO, não
deste design system — mas explica por que a restilização de `BoardAlertas`
descrita aqui não aparece mais em tela nenhuma (o componente foi deletado; está
no histórico do git).

**Não validado no navegador** — a refatoração foi verificada por build e teste, não
por inspeção visual das 13 telas. Vale abrir `/equipe/board/dashboard`,
`/equipe/board/dashboard-clientes-os`, `/equipe/board/capacidade` e
`/equipe/board/desempenho` antes de considerar entregue.
