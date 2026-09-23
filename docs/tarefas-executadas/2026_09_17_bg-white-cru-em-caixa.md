# O `bg-white` cru: a caixa que nenhuma catraca vê

Frente achada em 12/09/2026, **medindo outra coisa** — o degrau sobre o cartão. Aberta
como tarefa em 17/09, depois que o número do índice foi remedido e estava errado.

`bg-white` é o branco literal do Tailwind, não um token. Isso significa duas coisas, e
nenhuma delas é escolha de design:

- **não acompanha tema** — no escuro continua branco;
- **não pega a temperatura da área** — a OSG é areia (`32 28% 98.5%`), a Tax é
  cinza-azulado (`192 18% 99.6%`), e `bg-white` é branco puro e frio no meio das duas.

**E nenhuma das duas catracas enxerga.** A `cartaoTingido` procura `bg-card`; a regra de
ESLint `ui/token-nao-sobrescrito` só dispara quando alguém sobrescreve componente do
`ui/`. Uma `div` solta com `bg-white` passa pelas duas.

## O número do índice estava errado

O índice dizia **142 em 79 arquivos**. Era o total bruto da época, não o recorte de
caixa. Remedido em 17/09 com o scanner da própria `cartaoTingido` — que lê a **expressão
de classe**, não a linha, e por isso pega o `cn()` que declara `rounded-2xl` numa linha e
`bg-white` três abaixo:

| medida | número |
|---|---|
| `bg-white` no total das pastas de tela | **139** em **78** arquivos |
| desses, em **caixa arredondada** (o recorte que importa) | **60** em **43** arquivos |

A diferença entre 139 e 60 não é dívida escondida: é texto branco sobre fundo escuro,
ícone, borda, e `rounded-full`/`rounded-sm`, que a definição de "objeto" deixa de fora de
propósito (pílula e chip não são superfície).

**A dívida real é 60, não 142.** Menos da metade.

## Inventário por motivo

O motivo é o que faz a lista servir para a conversão, e não só contar. Fecha em 60.

### Ficam brancos — 13

| motivo | quantos | onde |
|---|---|---|
| **Site público.** A landing pinta a própria paleta; mesma decisão que encerrou o `gray` em 10/09 | 8 | `ContactSection`, `Hero`, `LocationsSection`, `MetricsBar`, `OfficesSection`, `ResultsSection`, `NovidadesShowcase`, `Novidades` |
| **Véu sobre fundo escuro.** `bg-white/15` sobre escuro é branco com alfa, que é a leitura certa — não é superfície | 2 | `HeroBanner:80`, `DeliverableDialogs:64` |
| **Conteúdo de documento, não superfície do produto.** `iframe` de PDF: a página do PDF *é* branca | 2 | `ClassificarLevaDialog:178`, `DocumentoVisualizador:74` |
| **Flutua sobre conteúdo** — motivo já inventariado em 12/09. Tooltip de gráfico | 1 | `AbaPorProduto:280` |

### Convertem — 47

**A. A pílula do controle segmentado — 4.** `bg-white` aqui é o estado *ativo* sobre um
trilho `bg-muted`/`bg-osg-50`. O papel é legítimo (a pílula tem de ser mais clara que o
trilho); o token é que está errado — vira `bg-card`.

`ChecklistDocumentosCliente:258`, `ChecklistPendentes:279`, `AddProcedimentoModal:112`,
`BibliotecaModelos:253`.

**B. Caixa de conteúdo — 43.** É a dívida de verdade: `div` arredondada com borda e
sombra fazendo o trabalho de `<Card>` sem ser um. Destino é `bg-superficie-cartao` ou o
próprio `<Card>`, caso a caso.

Concentração: **Análise Inteligente 6** (seis `div` idênticas em sequência, `bg-white/70
p-3 rounded-md border`), **Checklist de Pendentes 4**, **Checklist de Documentos do
Cliente 3**, `ProcedimentoCard` 2, `DashboardEmbedView` 2, `onboardingKit` 2,
`PainelConferencia` 2.

## O argumento visual está na OSG

**12 das 43** caixas de conteúdo estão em tela da OSG — `ChecklistPendentes` (4),
`PainelConferencia` (2), `onboardingKit` (2), `ClassificarLevaDialog`, `DocumentGroups`,
`OnboardingEmptyState`, `BotaoModelo` — e a OSG é a área onde isso se vê a olho nu.

É o mesmo achado que fechou o `acentoArea.tsx` em 11/09: **a OSG tem superfície QUENTE
com âncora verde**, e ali um neutro frio não some, denuncia. Naquele caso foi
`bg-accent/5` dando `#F1F3F0` (cinza frio) sobre `#EBE3DB` (areia). Branco puro sobre
areia é a mesma coisa, mais forte — é o extremo frio da escala.

Vale o registro de método: essas 12 têm `border-osg-200/70`, `shadow-[…hsl(var(--osg-700)/0.28)]`
e `text-osg-700` na mesma classe do `bg-white`. **Metade da caixa acompanha a área e a
outra metade não**, na mesma string.

## Achado que não é de cor, e não decido sozinho

`cliente/ChecklistDocumentosCliente.tsx` e `equipe/osg/checklists/ChecklistPendentes.tsx`
são **a mesma tela escrita duas vezes**. Não é semelhança vaga — é a mesma estrutura,
linha a linha:

| peça | cliente | OSG |
|---|---|---|
| faixa de filtros | `space-y-3 rounded-2xl border border-border/70 bg-white/70 p-3 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.28)]` | `space-y-3 rounded-2xl border border-osg-200/70 bg-white/70 p-3 shadow-[0_8px_24px_-20px_hsl(var(--osg-700)/0.28)]` |
| pílula ativa | `rounded-md px-3 py-1.5 text-xs font-semibold` + `bg-white text-foreground shadow-sm` | idêntica + `bg-white text-osg-700 shadow-sm` |
| cartão | `min-h-48 … rounded-2xl … hover:-translate-y-1 hover:border-primary/40` | `min-h-48 … rounded-2xl … hover:-translate-y-1 hover:border-osg-moss/40` |
| lista vazia | `rounded-2xl border border-dashed border-border/80 bg-white/70 px-6 py-16` | `rounded-2xl border border-dashed border-osg-300/70 bg-white/60 px-6 py-16` |

O que muda entre as duas é **só o token da área, cravado dentro do componente** em vez de
resolvido pelo `<html>`. É ao pé da letra o contrário da regra: componente nomeia o
papel, a área resolve o tom.

**Esta tarefa não unifica as duas.** Unificar é decisão dela, é mudança de comportamento
e não de cor, e mistura duas medições — o mesmo erro que a conversão dos 25 `bg-muted/50`
evitou em 12/09. Fica registrado com o número dos dois lados: **7 das 60** ocorrências
estão nessa duplicação, e ela é a razão de 2 dos 3 arquivos mais concentrados da lista.

## ✅ CONCLUÍDO em 17/09/2026

Os 47 converteram, em dois lotes, e a fila caiu de **60 para 13** no recorte de caixa
(139 → 92 no total das pastas de tela). Os 13 são exatamente os que este inventário
manda ficar.

**Lote 1 — 20 casos, sem decisão dela.** Controle, conteúdo dentro de cartão e caixa
sobre painel rebaixado. `bg-white` → `bg-card`, pixel idêntico na casa. **A catraca do
cartão pegou sozinha:** os 20 `bg-card` novos caem no inventário dela, que exige o motivo
de cada caixa clara — reprovou antes da classificação e passou depois, o que é a prova
nos dois sentidos sem precisar fabricar o defeito.

**Lote 2 — 27 casos, decididos olhando**
[`o-branco-literal-das-27.html`](../geral/comparacoes-de-cor/o-branco-literal-das-27.html),
que montou cada papel nas duas áreas, branco contra tingido. **Ela escolheu claro nos
quatro papéis**, com estas palavras: o cabeçalho de resumo, "gosto como tá hoje"; a lista
vazia, "prefiro como tá hoje"; a barra de filtros, "claro com token tá ok"; e o cartão de
conteúdo, escolhido entre três candidatos desenhados. A caixa de tabela (2) seguiu a
decisão B de 16/09 sem decisão nova.

**O achado que mudou o lote 2, e não estava previsto:** na OSG, `--card` e `--background`
são o **mesmo valor** (`32 28% 98.5%`). Uma caixa que vire `bg-card` ali fica a
**1,000:1** contra a página — some, e quem a segura é a borda. O `bg-white` literal, que
era `#FFFFFF` de verdade, estava a **1,031:1**. Ou seja, **a conversão perdeu separação
na OSG**, de propósito: é o mesmo custo que a caixa de tabela aceitou em 16/09, pago em
troca de a caixa acompanhar tema e área. Tingir era a única saída que separava de fato
(1,072:1), e foi recusada olhando.

**Catraca `filaDoBranco.test.ts`**, com três asserções: o inventário dos 13 por motivo
(igualdade exata, cai nos dois sentidos), a de arquivo em dois grupos, e o **total fora
do recorte de caixa** — essa última existe porque confundir os dois recortes foi
exatamente o erro que fez o índice prometer 142. Provada reintroduzindo o defeito antes
do commit: reprova com ele, passa sem ele.

**Achado de método:** a varredura por expressão de classe vivia dentro da
`cartaoTingido`, e esta foi a segunda catraca a precisar dela. Subiu para o
`medirCorCrua.ts` como `medirEmCaixaArredondada`, que é a razão de aquele módulo existir
— o próprio arquivo avisava que uma terceira cópia do mesmo caminhar seria o defeito que
estas catracas passam o dia consertando em outros lugares.

## O plano, como foi escrito

1. **Converter os 47**, na ordem da concentração (Análise Inteligente primeiro: 6 numa
   sequência só, e é o recorte mais barato de validar olhando).
2. **Catraca `filaDoBranco.test.ts`**, no molde das outras cinco: inventário agrupado por
   motivo, com igualdade **exata** — reprova se aparecer branco novo e reprova também
   quando um grupo for convertido e os números descerem, dizendo o que fazer na mensagem.
   Mais a asserção do recorte: nenhuma caixa arredondada em tela interna com branco
   literal.
3. A catraca lê a **expressão de classe**, não a linha. Sem isso ela não vê o
   `primitivos.tsx:387` nem o `EFDBlockTree.tsx:60`, que declaram a classe dentro de
   `cn()` multilinha.

## Tamanho e raio de revert

Conversão por inventário, no molde do `gray` / `teal` / `red`+`emerald` / `blue`. Sem
decisão dela no meio: **branco literal não é um papel, é ausência de escolha**. Um commit
por grupo do inventário, e a catraca no último.

## O que esta tarefa não faz

Os `--bd-warn` / `--bd-risk` do Board, escritos em hexadecimal no `index.css`. Também são
cor crua que nenhuma catraca vê — pelo motivo oposto: a de cor crua lê classe em `.tsx`, e
aquilo é CSS. Vai junto da [tarefa 12](2026_09_17_board-acompanha-o-cartao-tingido.md) ou
depois dela.

E o `GerencialFiltros.tsx:45`, que é do Board, **converte aqui** e não lá: é `div` com
classe Tailwind, não CSS do `index.css`. As duas frentes se cruzam nesse arquivo e em
nenhum outro.
