# A caixa de tabela: branca ou tingida, e o padrão muda junto

**Pergunta da Patrícia em 16/09/2026**, ao ler que a tabela do Adm & Fin tinha sido
inscrita como **exceção** no inventário da catraca:

> "Então não é padrão ser branco? Tem que me avisar quando não for o padrão, porque
> aí tem que mudar o padrão."

Ela está certa, e é isso que esta tarefa fecha. Hoje o padrão é **tingido**, a tela do
Adm & Fin é a **única** tabela branca do sistema, e ela é branca porque a própria
Patrícia mandou em 15/09 ("tá tudo verde, o padrão não é sem fundo"). Um caso isolado
que contraria o padrão não é exceção — é evidência de que o padrão está errado.

**A decisão já estava desenhada e nunca teve resposta.** Ver
[`geral/comparacoes-de-cor/o-branco-que-sobrou.html`](../../geral/comparacoes-de-cor/o-branco-que-sobrou.html),
de 12/09/2026:

- **Seção 6** monta as duas saídas lado a lado e marca uma delas: *"C só nas caixinhas ·
  filtros e KPI tingidos; a caixa da tabela fica branca, porque tabela se lê pelas
  linhas"* — **recomendada**.
- **Seção 8** diz o que fazer com ela: *"A caixa de tabela fica branca (seção 6): **ou
  uma variante do `Card`, ou ela deixa de ser `Card`**."*

Ou seja: a recomendação existe há quatro dias, diz que tabela fica branca, e diz que o
conserto é **mudar o padrão** — não abrir exceção. Foi a parte da opção C que não foi
executada porque dependia dela.

---

## O que está medido no repositório, 16/09/2026

| medida | número | de onde sai |
|---|---|---|
| `<Card>` no sistema | **384** usos em **177** arquivos | `grep -rc "<Card\b" src --include=*.tsx` |
| Arquivos com `<Card>` **e** `<Table>` | **49** | os dois greps cruzados |
| Blocos `<Table>` nesses arquivos | **53** | `grep -c "<Table\b"` nos 49 |
| Arquivos com `<Table>`, com ou sem `Card` | **70** | `grep -rl "<Table\b"` |
| Caixas de tabela **brancas** hoje | **1** | `TabelasDaOs.tsx`, e é a que gerou a pergunta |

O `<Card>` pinta `bg-superficie-cartao` na classe base
([`ui/card.tsx:23`](../../../src/components/ui/card.tsx)), então **as outras 52 são
tingidas sem ninguém ter escolhido isso para tabela** — herdaram a regra geral. A
assimetria não é de desenho, é de alcance: a opção C alcançou o componente e parou
onde começava a decisão em aberto.

**Os dois outros `bg-card` em arquivo com tabela não contam**: `T02CfopTab.tsx:127` e
`FamiliaSaidaTab.tsx:177` são `<pre>` de bloco de código, com `rounded` pequeno, que a
catraca deixa de fora de propósito (raio pequeno = etiqueta, não objeto).

## Por que a tabela do Adm & Fin ficou branca

Ela vive dentro da casca `ListaMestreDetalhe`, que já é `bg-superficie-cartao`. Tabela
sem fundo próprio **herda o tingido da casca** e soma com ele — e o `--muted` da casa
puxa para o verde. Foi o que a Patrícia viu em 15/09. O motivo está escrito no próprio
[`TabelasDaOs.tsx:43-50`](../../../src/components/equipe/adm-fin/TabelasDaOs.tsx).

Esse é o argumento da seção 6 aparecendo na prática, e num caso que nem estava na
amostra dela: **tabela se lê pelas linhas**, e tinta atrás das linhas trabalha contra a
zebra e contra o realce de hover, que são feitos do mesmo `--muted`.

---

## D1 · A decisão · 🔵 ABERTA

**Tabela dentro de cartão fica branca ou tingida?**

| opção | o que acontece | custo | efeito colateral |
|---|---|---|---|
| **A. Branca** (é a recomendada em 12/09) | variante do `<Card>` — ou a caixa de tabela deixa de ser `<Card>` — e as 52 tingidas viram brancas. A exceção do Adm & Fin **sai** do inventário: deixa de ser exceção e vira a regra | 1 componente + 49 arquivos a revisar | a zebra (`bg-muted/25`) e o hover de linha (`bg-superficie-realce`) voltam a ter o contraste que foram calibrados para ter contra branco |
| **B. Tingida** | o padrão fica como está, e o Adm & Fin é que está errado: volta a `<Card>` e perde o branco | 1 arquivo | reabre o "tá tudo verde" de 15/09, que foi decidido olhando |
| **C. Depende da casca** | branca só quando a tabela está dentro de outra superfície tingida (o caso do Adm & Fin); tingida quando é a caixa mais externa | regra a mais para carregar | é a regra que ninguém lembra na tela nova — e foi exatamente assim que nasceu a assimetria de hoje |

**Ela decide olhando** (ver `relatorio-diz-o-que-ela-decide`). A página de 12/09 já tem a
comparação, mas está montada com a **Consulta ECD** e com os valores daquela data. A
**T1** remonta com as telas de hoje, incluindo a do Adm & Fin.

---

## Subtarefas

### T1 · A página de comparação, remontada com as telas de hoje

Reaproveitar a seção 6 de `o-branco-que-sobrou.html`. Três painéis por tela, na mesma
ordem da página original (hoje · tudo tingido · tabela branca), com **três** telas:

1. **Adm & Fin — OS de faturamento.** É o caso que levantou a pergunta, e o único em que
   a tabela está dentro de outra superfície tingida. Sem ela a opção C não tem como ser
   julgada.
2. **Uma tela da família de lista**, em que a caixa da tabela é a caixa mais externa.
   Consulta ECD é a da página original e serve de continuidade.
3. **Uma tela com tabela e KPI juntos**, para mostrar o que acontece quando as duas
   caixas ficam lado a lado com tratamentos diferentes.

Os valores têm de sair do `src/index.css` **da data da remontagem**, não copiados da
página de 12/09 — a página original avisa que não se atualiza sozinha, e o cartão já
desceu de valor desde então.

Incluir a **zebra e o hover de linha** nos painéis. É onde a diferença aparece, e a
página de 12/09 não os tinha: a seção 8 registra "o que eu conferiria depois, na tela"
e cita exatamente isso.

### T2 · O caminho de código, conforme a resposta

**Se A (branca):** a caixa de tabela ganha superfície própria. Duas saídas, e a escolha
é de implementação, não dela:

- variante do `<Card>` (ex.: `<Card variant="tabela">`), que mantém raio, borda e sombra
  e só troca o fundo;
- ou a caixa de tabela deixa de ser `<Card>` e passa a ser um componente próprio.

Os 49 arquivos precisam de passada, e a asserção de igualdade exata do
`cartaoTingido.test.ts` cobra cada um. A entrada
`'src/components/equipe/adm-fin/TabelasDaOs.tsx'` **sai** do grupo `dentro-do-cartao`.

**Se B (tingida):** reverter `55aba66b` na parte do `Quadro` e tirar a mesma entrada do
inventário. Um arquivo.

**Se C:** a regra vira código ou não existe. Regra que mora só em documento não sobrevive
à próxima tela — é o que esta tarefa está consertando.

### T3 · A catraca acompanha a decisão

Qualquer que seja a resposta, o `cartaoTingido.test.ts` tem de passar a **cobrar** a
regra nova, não só inventariar quem fugiu dela. Hoje ele pergunta "esta caixa branca
está na lista?"; se a tabela virar branca por padrão, a pergunta certa passa a ser
"esta caixa de tabela está tingida?" — a catraca inverte de lado para esse recorte.

Sem isso a próxima tabela nasce tingida de novo, porque `<Card>` continua sendo o que
parece certo escrever.

---

## O que NÃO entra aqui

- **O Board.** Tem sistema de CSS próprio (`--bd-surface` = `hsl(var(--card))`) e ficou
  branco na passada de 12/09. É frente própria, registrada em
  [`geral/cor-o-que-falta.md`](../../geral/cor-o-que-falta.md).
- **Os 142 `bg-white` crus** em caixa arredondada, que nenhuma catraca vê. Achado da
  mesma frente, também em `cor-o-que-falta.md`, e não depende desta decisão.

---

## Banco

**Não.** Nem migração, nem RPC, nem policy. É superfície de tela.

---

## Estado

| item | estado |
|---|---|
| D1 · branca, tingida ou depende da casca | 🔵 **ABERTA** — bloqueia T2 e T3 |
| T1 · página de comparação remontada | 🔵 aberta, e é o que destrava D1 |
| T2 · caminho de código | ⛔ bloqueada em D1 |
| T3 · catraca acompanha | ⛔ bloqueada em D1 |

**O que está no ar hoje, e por que não é urgente:** a exceção do Adm & Fin foi inscrita
em `e28fdb0e` para destravar a CI, que estava vermelha há 22h. Nenhuma tela mudou de
aparência. A dívida é a assimetria — 52 tingidas contra 1 branca, sem regra escrita —, e
ela envelhece a cada tela nova com tabela.
