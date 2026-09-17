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

## D1 · A decisão · ✅ **DECIDIDA em 16/09/2026: opção B, tabela BRANCA**

> "pode fazer a opção B, tabela branca" — Patrícia, 16/09/2026, diante da
> comparação montada.

**Executada no mesmo dia**, em quatro commits (ver "O que foi feito", no fim).

📄 A comparação que sustentou:
[`geral/comparacoes-de-cor/a-caixa-da-tabela.html`](../../geral/comparacoes-de-cor/a-caixa-da-tabela.html)
— abrir no navegador. Valores do `src/index.css` de 16/09/2026.

### O achado da T1, que mudou a pergunta: o hover tem TETO

A página original supunha que "tabela se lê pelas linhas" era argumento de gosto.
Medido, é aritmética.

A zebra que a tabela perde sobre o cartão tingido **dá para recuperar**: basta subir o
alfa de 25% para 38% e ela volta aos mesmos 1,054:1 que tem sobre o branco.

**O hover não dá.** Ele é feito de `--muted`, e a superfície do cartão já é 35% de
`--muted`. Mesmo a **100%, sem transparência nenhuma**, o hover sobre o cartão chega a
**1,154:1** — contra os **1,175:1** que tem sobre o branco. Não é questão de calibrar:
acabou a escala. O que vem depois de `--muted` é `--border`, que é linha e não
superfície, e usá-lo como fundo de linha quebraria o contrato de camada.

Vale nas três áreas — Tax 1,165 contra 1,187; OSG 1,144 contra 1,164.

**Por que isso decide:** o hover é o único dos dois que serve para **agir** (saber em qual
linha se vai clicar). A zebra só ajuda a ler. Nenhuma calibração empata um teto.

### O custo do branco, que também está medido

`--card` e `--background` têm o **mesmo valor** nas três áreas. Então caixa de tabela
branca **direto sobre a página** fica a **1,000:1** dela — só a borda a segura. É o defeito
de 12/09 de novo, e é real.

Ele some onde há casca tingida atrás: no Adm & Fin a caixa branca se separa da casca em
1,077:1 **e** as linhas ficam no melhor contraste. Nesse caso o branco ganha nos dois
eixos, sem troca.

### As opções

| opção | o que acontece | zebra | hover | caixa × página |
|---|---|---|---|---|
| **A. Tingida** (hoje) | padrão fica como está, e o Adm & Fin volta a ficar verde | 1,036 | **1,112** | 1,077 |
| **B. Branca** ⭐ | variante do `<Card>`, ou a caixa deixa de ser `<Card>`. A exceção do Adm & Fin sai do inventário e vira regra | 1,054 | **1,175** | 1,000 (só a borda) |
| **C. Tingida com degrau recomposto** | dois tokens novos: zebra a 38% e hover no máximo | 1,054 | **1,154** (teto) | 1,077 |

**Recomendada: B.** O C parece o meio-termo e não é — custa dois tokens novos, entrega um
hover **pior** que o B, e deixa o sistema com dois alfas de zebra para a mesma coisa
conforme a caixa. Complexidade a mais por resultado pior.

---

## Subtarefas

### T1 · A página de comparação, remontada com as telas de hoje · ✅ CONCLUÍDO (16/09/2026)

📄 [`geral/comparacoes-de-cor/a-caixa-da-tabela.html`](../../geral/comparacoes-de-cor/a-caixa-da-tabela.html).
O achado (o teto do hover) está em D1, acima — ele mudou a recomendação de "tabela
branca porque se lê pelas linhas" para "tabela branca porque o hover tem teto", que é
argumento de outra natureza.

O que a página tem, e o que mudou em relação ao que estava planejado aqui:

| seção | o que mostra |
|---|---|
| 1 · Adm & Fin, OS de faturamento | O caso que levantou a pergunta, e o único do sistema em que a tabela está dentro de casca tingida. Dois painéis: como está hoje, e como ficaria se seguisse o padrão |
| 2 · Consulta ECD | A caixa de tabela como caixa mais externa, direto sobre a página. **É aqui que há troca de verdade.** Três painéis: tingida (hoje), branca, e tingida com o degrau recomposto |
| 3 · A lupa | A **mesma linha**, com o cursor em cima, nos três tratamentos, em faixas grandes. É o que decide, e é o que a página de 12/09 não mostrou |
| 4 · Os números | Os três tratamentos no tema base, as três áreas lado a lado, e o tamanho no repositório |
| 5 · A recomendação | Com o argumento, não só a marca |

**A terceira tela planejada (KPI + tabela lado a lado) não entrou**, e foi troca
deliberada: a lupa da seção 3 responde a mesma pergunta com mais precisão. Duas caixas
com tratamentos diferentes lado a lado já aparecem na seção 2, onde os filtros ficam
tingidos e a tabela muda — é o mesmo confronto, dentro de uma tela real.

Valores lidos do `src/index.css` de 16/09/2026, com os alfas compostos em sRGB (a mesma
conta que o navegador faz). As cores de zebra e hover estão escritas **compostas** na
página, opacas, e não como alfa sobre alfa: alfa empilhado no navegador daria um terceiro
número, e o que a página compara são os números do produto.

### T2 · O caminho de código · ✅ CONCLUÍDO (16/09/2026)

Saída escolhida: **variante do `<Card>`**, e não componente próprio. `<Card variant="tabela">`
mantém raio, borda e sombra e só troca o fundo, então nenhum consumidor mudou de forma.

**A contagem do plano estava errada, e a passada a corrigiu.** "53 caixas em 49 arquivos"
saiu de contar `<Table>` nos arquivos que **também** têm `<Card>` — havia tabela fora de
cartão no meio. Casando cada `<Card>` com o `</Card>` dele e perguntando se há `<Table>`
dentro: **45 cartões em 42 arquivos**.

⚠️ **E o recorte é por BLOCO, não por arquivo.** Nos mesmos 42 arquivos existem **95 outros
`<Card>` que não envolvem tabela**, e todos continuam tingidos. Pintar por arquivo teria
repintado 95 cartões que ninguém pediu.

Duas armadilhas de varredura por texto, as duas registradas porque se repõem sozinhas:

1. A primeira passada injetou `variant="tabela"` **dentro de um comentário** do `card.tsx` —
   o JSDoc que eu acabara de escrever cita `<Card>` e `<Table>` em prosa, o que fez o
   arquivo passar no filtro e a prosa casar com o padrão.
2. A segunda tentou mascarar comentários e literais, e **um apóstrofo em texto JSX** abriu
   uma "string" que nunca fecha: o `ControleBalancetes.tsx` foi mascarado inteiro e sumiu
   da passada, calado. Só apareceu porque a contagem caiu de 45 para 44.

E duas no próprio `card.tsx`, a mesma causa: **dois testes leem esse arquivo como TEXTO.**
O ternário (`variant ? "bg-card" : "bg-superficie-cartao"`) desmontou a string literal e
derrubou a asserção da alavanca do `cartaoTingido`; passar a sobrepor consertou aquela, mas
o comentário **entre o `cn(` e o literal** derrubou a derivação de token do
`eslint-rules/token-nao-sobrescrito`, que casa `/\b(?:cn|cva)\(\s*"([^"]+)"/` e exige o
literal colado — o `<Card>` sumiu do mapa da regra de ESLint, calado. A forma final mantém
a string base inteira, literal e colada, com a variante sobrepondo depois.

### T3 · A catraca acompanha a decisão · ✅ CONCLUÍDO (16/09/2026)

Catraca nova: [`src/lib/caixaDeTabela.test.ts`](../../../src/lib/caixaDeTabela.test.ts).
Ela pergunta **"este cartão de tabela está branco?"**, o oposto do que a `cartaoTingido`
pergunta ("esta caixa branca está autorizada?"). As duas convivem porque cobrem regras
opostas sobre o mesmo componente, e o que separa uma da outra é ter `<Table>` dentro.

Três asserções, e a segunda existe porque a primeira sozinha é furada: **apagar a variante
do `<Card>` faria os 45 voltarem a ser tingidos de uma vez**, com o atributo seguindo
escrito e sem efeito, e a primeira continuaria verde. Ela cobra também a **ordem** — `cn`
deixa a última classe vencer, então a variante antes da string base faria a tinta ganhar.
A terceira trava o erro de medição por arquivo.

Provada nos dois sentidos antes do commit: tirando a variante de um cartão ela aponta
`GestaoNovidades.tsx:453`; apagando a variante do componente ela diz que sumiu do `<Card>`.

**Limite conhecido, escrito no cabeçalho:** o casamento é textual e dentro do mesmo
arquivo, então `<Card>` que renderiza uma tabela vinda de componente filho não é visto. A
alternativa seria varredura de tipos, que nenhuma catraca daqui faz.

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
| T1 · página de comparação remontada | ✅ **CONCLUÍDO (16/09/2026)** — [`a-caixa-da-tabela.html`](../../geral/comparacoes-de-cor/a-caixa-da-tabela.html) |
| D1 · tingida (A), branca (B) ou degrau recomposto (C) | ✅ **DECIDIDA (16/09/2026): B, tabela branca** |
| T2 · caminho de código | ✅ **CONCLUÍDO (16/09/2026)** — 45 cartões em 42 arquivos |
| T3 · catraca acompanha | ✅ **CONCLUÍDO (16/09/2026)** — `caixaDeTabela.test.ts` |

## O que foi feito, por raio de revert

| commit | o que é | reverte sozinho? |
|---|---|---|
| `66a7cdaf` | a variante `tabela` no `<Card>`, **sem consumidor** — não muda um pixel | sim |
| `f66e5476` | os 45 cartões ganham a variante — **é o commit que muda pixel** | sim |
| `cd1a7d94` | a catraca `caixaDeTabela` passa a cobrar a regra | sim |
| `9228f385` | o Adm & Fin deixa de escrever `bg-card` à mão e sai do inventário | sim |

Para desfazer a mudança visual sem perder o resto, reverta só o `f66e5476`.

**Validado:** `bun run build` ✓ · `bun run typecheck` 0 erros ✓ · suíte **478 arquivos,
6133 testes, todos passando** ✓.

⚠️ **Falta a conferência na TELA, e é dela.** Com a caixa branca sobre a página a 1,000:1,
a borda passa a ser a única coisa que segura a caixa. A comparação mede o contraste, mas
quem diz se a borda basta é ela, olhando uma tela cheia — e o caso mais exposto é a
família de lista, onde o cartão de tabela se apoia direto na página (Consulta ECD,
Controle de Balancetes, Correções SPED). Onde há superfície tingida atrás, o custo some.

**Nota histórica:** a exceção do Adm & Fin foi inscrita em `e28fdb0e` para destravar a CI,
que estava vermelha há 22h. Foi ao ler essa inscrição que ela fez a pergunta que abriu esta
tarefa. A entrada saiu em `9228f385` — não porque a caixa deixou de ser branca, mas porque
deixou de ser exceção. **A assimetria que era a dívida (45 tingidas por herança contra 1
branca escolhida) está paga, e o que a impede de voltar é a `caixaDeTabela.test.ts`.**
