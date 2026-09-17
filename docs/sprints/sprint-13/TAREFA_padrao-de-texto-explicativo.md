# TAREFA 14 — O padrão único das explicações contextuais

> **Antes das próximas rotas.** O que se decide aqui é como a ferramenta explica a si mesma:
> tooltip, texto de apoio, placeholder, rótulo e mensagem contextual. Hoje cada tela escolhe
> sozinha, e o resultado tem duas vozes, dois mecanismos e nenhum teto de tamanho.
>
> **Só documento e catraca.** Nenhuma migração, nenhuma RPC, nenhuma policy. A conversão em
> massa do que está fora do padrão **não** entra aqui — vira tarefa própria, depois que o
> padrão existir.
>
> **Entregável final:** `docs/geral/texto-explicativo-na-tela.md`, marcado 📘 REF no índice —
> é texto em vigor, não plano. Esta tarefa é o caminho até ele.
>
> **Status: 🔵 ABERTO.** Medições de 17/09/2026, na `develop`, por varredura de JSX nos 1.043
> `.tsx` versionados.

## O estado de hoje, medido

| O que | Quanto | Onde |
|---|---|---|
| `<Tooltip>` do shadcn (`<TooltipContent>`) | **117** | 60 arquivos |
| `title=` em tag HTML nativa (tooltip do navegador) | **151** | 86 arquivos |
| — quebrado por tag | `span` 62 · `button` 54 · `div` 16 · `iframe` 8 · `p` 6 · outros 5 | |
| `placeholder=` | **739** (647 literais) | 279 arquivos |
| `<FormDescription>` (texto de apoio do shadcn) | **0** | — |
| `<p>` com `text-xs/sm text-muted-foreground` (candidato a texto de apoio) | **588** | 265 arquivos |
| Texto de lista vazia ("Nenhum…", "Nenhuma…") | **337** | 242 arquivos |
| Ícone de ajuda (`HelpCircle`/`Info`) | **65** | 52 arquivos · **39** dentro de `TooltipTrigger` |
| `aria-label` | **323** | — |

Nenhum documento do repositório trata de tooltip, texto de apoio ou microcopy — a busca por
"tooltip", "microcopy" e "helper text" em `docs/**/*.md` volta vazia. Este é o primeiro.

## Os cinco achados que mudam a forma da tarefa

**A1 — São dois mecanismos, e o maior é o que ninguém escolheu.**
O `title=` nativo (151) supera o `<Tooltip>` (117). Ele não aparece no toque, espera cerca de um
segundo para abrir, não tem estilo nem tema, e num elemento que já tem texto acessível é lido de
forma inconsistente. Ou seja: **a explicação mais usada do sistema é a que menos aparece.** Antes
de decidir o que escrever, a tarefa decide onde escrever — senão o padrão vale para 117 casos e
ignora 151. Os 8 de `<iframe>` são outro papel (título do quadro, exigido) e ficam fora da conta:
a dívida real é **143**.

**A2 — Metade do que se chama de tooltip é rótulo, não explicação.**
A mediana do texto literal dentro de `<TooltipContent>` é **1 caractere**, porque o conteúdo é
interpolação; entre os literais curtos estão "Editar OS", "Remover contribuinte", "Editar
contribuinte", "Remover representante" — o **nome do botão de ícone**, que sem ele não tem nome
nenhum. Do outro lado, **39 dos 117** estão atrás de um ícone (i)/(?), e esses são explicação de
verdade. Os 54 `title=` em `<button>` são o mesmo papel de rótulo, feito pelo mecanismo pior.

> **Se o padrão não separar os dois papéis, toda regra de tom e tamanho vai bater no caso
> errado:** "não repita o rótulo", aplicado a um botão de ícone, apaga o único nome que ele tem.

**A3 — O tamanho já estourou, e o maior caso não é tooltip.**
**15** tooltips passam de 80 caracteres e **3** passam de 140. O maior tem **521** e começa com
"Como ler esta tabela" — é **nota de leitura da tela**, um quarto papel que hoje não existe e por
isso foi parar atrás de um hover. Um texto que todo mundo precisa ler uma vez não pode depender
de passar o mouse.

**A4 — O placeholder já tem um padrão; ele só não está escrito.**
Nos 647 literais: `Selecione…` **130** contra `Selecionar…` **23**; `Ex:` **57** contra `ex:`
**18**; `Todos` **25** contra `Todas` **10**; `Buscar…` **57**. Nenhuma dessas diferenças
significa coisa alguma — é ausência de forma canônica. E 244 começam com verbo no imperativo, 75
com exemplo, **328 com nenhum dos dois**.

**A5 — A pontuação é sorteada.** Dos 117 tooltips, **23** terminam com ponto final e **94** não.
Mesmo componente, mesma tela, regra nenhuma.

**A6 — Metade do vocabulário já foi decidida, e não é lida fora de onde nasceu.**
O [catálogo de mensagens de recusa](../sprint-12/TAREFA_mensagens-de-recusa.md) (sprint 12, em
`src/lib/rlsMessages.ts`) já fixou: o item é nomeado **pelo nome que aparece na tela**, nunca por
tabela, coluna, RPC, UUID ou código; `É necessário ter…` para condição; `Não foi possível {ação}
{item}.` para falha; fecho fixo por categoria; e a regra de manutenção — **frase nova só entra se
a orientação for diferente das que já existem**. O `rotulosDeStatus.test.ts` fixou a palavra de
status. O padrão novo **herda os dois**; não reabre nenhum dos dois.

## As decisões que são dela

**D1 — O `title=` nativo sai?**
Proposta: sai de todo elemento que a pessoa clica ou percorre com teclado (143 ocorrências),
virando `<Tooltip>` quando é explicação e `aria-label` quando é só nome de botão de ícone; fica em
`<iframe>` (8), que é outro papel. Alternativa: continua permitido onde o alvo não é clicável
(célula truncada, por exemplo) — mais barato, mas mantém dois mecanismos, e aí o padrão precisa
dizer a fronteira em uma frase que a próxima pessoa aplique sozinha.

**D2 — Os quatro papéis, e a escada.**
Proposta de escada, do mais barato ao mais caro — só desce um degrau quem não resolveu no
anterior:

1. **rótulo melhor** (trocar "Tipo" por "Tipo de pessoa" resolve e não custa pixel nenhum);
2. **valor visível na tela** (mostrar o que a pessoa procura, em vez de explicar onde achar);
3. **texto de apoio permanente**, sob o campo — para instrução que vale toda vez;
4. **tooltip atrás de (i)** — para explicação que vale uma vez e não pode ocupar espaço fixo;
5. **nada.**

E o que confirmar: hoje **texto de apoio permanente não existe** (`FormDescription` = 0 usos).
Entra como degrau 3, ou o padrão fica sem ele?

**D3 — Teto por papel, e pontuação.** Proposta: rótulo de ícone ≤ 30 caracteres, sem ponto final,
verbo no infinitivo ("Editar OS"); explicação ≤ 140, frase inteira com ponto; acima de 140 **não é
tooltip**, é nota de leitura da tela e mora visível (os 3 casos de A3).

**D4 — As formas canônicas de placeholder**, uma por tipo de campo: `Selecione…` (escolha),
`Buscar…` (busca — já decidido em 11/09), `Ex: 12.345.678/0001-90` (formato não óbvio), vazio
(texto livre com rótulo claro). Duas perguntas: `Todos`/`Todas` vira uma forma só? E placeholder
pode carregar instrução, ou instrução é sempre degrau 3?

**D5 — A voz.** O catálogo de recusa fala em 2ª pessoa com a pessoa ("Você não tem permissão
para…"), e descrição de dado é impessoal ("Soma de todos os PERs que atendem aos filtros"). A
proposta é manter os dois, com a fronteira escrita: **fala com a pessoa quando há ação a tomar;
descreve o dado quando não há.**

## Subtarefas

**T1 — Inventário por motivo, no molde das filas de cor.**
Classificar as 117 + 143 nos quatro papéis (rótulo de ícone · explicação de dado · instrução de
preenchimento · nota de leitura) e entregar a contagem de cada um mais **a lista dos que não cabem
em nenhum** — são esses que decidem se o padrão tem quatro papéis ou cinco. Varredura por
expressão JSX, no molde do `medirCorCrua.ts`, não por linha.
**Aceite:** os quatro números somam o total, e cada caso não classificado tem uma linha dizendo
por quê.

**T2 — Escrever `docs/geral/texto-explicativo-na-tela.md`.**
Seções, nesta ordem: os quatro papéis · a escada de decisão (D2) · o mecanismo de cada papel (D1)
· tamanho, estrutura e pontuação (D3) · tom de voz (D5) · vocabulário (T4) · exemplos (T5) ·
quando **não** escrever nada.
**Aceite:** cabe em uma tela e meia. Padrão que não se lê inteiro não se aplica.

**T3 — A página de comparação, para ela decidir olhando.**
Os casos de D1 a D4 montados **dentro da tela real**, nos dois estados — o de hoje e o proposto —,
no molde das comparações de cor. Decisão de texto se toma vendo o texto no contexto, não lendo a
regra.
**Aceite:** cada decisão aberta tem duas ou três opções desenhadas lado a lado, para responder por
letra.

**T4 — O vocabulário.**
Uma tabela de termos: como cada item se chama na tela (herdada do catálogo de recusa: "o
contribuinte", "a OS {número}", "o rateio de receita"), as formas canônicas de placeholder (D4) e
a palavra de status (já fechada). Mais a lista do que **nunca** aparece: nome de tabela, coluna,
RPC, UUID, código de erro, inglês do Postgres.
**Aceite:** quem escreve a próxima tela encontra o termo sem perguntar.

**T5 — Exemplos, tirados do repositório.**
Três pares bom/ruim por papel, **com arquivo e linha**, nenhum inventado. Os candidatos já estão
medidos: o tooltip de 521 caracteres, os 54 `title` em `<button>`, o `Selecionar…` contra o
`Selecione…`, e o tooltip que repete o rótulo do próprio botão.
**Aceite:** cada exemplo ruim traz a versão corrigida e o motivo em uma linha.

**T6 — A catraca `textoDeAjuda.test.ts`.**
No molde do `rotulosDeStatus.test.ts` e do `filaDoBranco.test.ts`: inventário por motivo mais
asserção. Três regras, conforme D1/D3/D4: (a) nenhum `title=` em tag nativa fora do inventário;
(b) nenhum `<TooltipContent>` literal acima do teto; (c) nenhum placeholder de escolha ou de busca
fora das formas canônicas.
**Aceite:** vista reprovando **antes** do conserto e passando **depois** — verde de primeira não
prova nada. A mensagem de falha diz qual é a forma certa e onde ela mora, como as outras catracas
da casa.

**T7 — A conferência dela, na tela.**
Numa rota real, não no documento: um tooltip de cada papel, um campo com placeholder canônico e um
caso de nota de leitura.

## Ordem

`T1 → D1–D5 (ela decide, com a T3 na frente) → T2 · T4 · T5 → T6 → T7`

A T1 vem antes das decisões de propósito: sem saber quantos casos há de cada papel, D1 e D3 viram
preferência. E a T6 vem depois do texto, porque catraca escrita antes do padrão trava o estado de
hoje.

## O que fica de fora, e é decisão, não esquecimento

- **A conversão dos 143 `title=`** e dos tooltips acima do teto. Tarefa própria, por inventário,
  depois que o padrão existir. Aqui entra só o que a catraca precisa para nascer.
- **A tradução de erro do banco** — fechada na sprint 12, com teste. O padrão **cita** e não
  reabre.
- **A palavra de status** — fechada em 03/09, com catraca. Idem.
- **Os 337 textos de lista vazia.** Ficam específicos por decisão de 11/09 ("Nenhum cliente
  encontrado." nomeia o que não foi achado, e isso é informação). O padrão registra a regra e não
  uniformiza.
- **Acessibilidade além do tooltip.** Os 323 `aria-label` não são desta tarefa, exceto onde D1 os
  cria ao tirar um `title`.

## Pronto quando

Existe `docs/geral/texto-explicativo-na-tela.md`, lido em uma tela e meia, com exemplo real dos
dois lados; a catraca reprova o caso que o padrão proíbe e passa depois do conserto; e a próxima
rota escrita por outra pessoa sai com a mesma estrutura, o mesmo tamanho, o mesmo vocabulário e o
mesmo tom sem ninguém perguntar.
