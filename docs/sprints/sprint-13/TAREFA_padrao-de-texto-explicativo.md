# TAREFA 14 — O padrão único das explicações contextuais

> **Antes das próximas rotas.** O que se decide aqui é como a ferramenta explica a si mesma:
> label, texto de apoio, tooltip, mensagem contextual e placeholder.
>
> **O risco desta tarefa tem nome** (dela, 17/09): virar documentação de UX Writing bonita e
> pouco aplicável. O critério de sucesso é outro — **alguém abre o documento durante a
> implementação e resolve em dois minutos.** Por isso a execução começa comparando exemplos
> reais, não escrevendo regra, e o entregável cabe em seis seções curtas.
>
> **Só documento.** Nenhuma migração, nenhuma RPC, nenhuma policy. A catraca de teste é
> **fase 2**, e a conversão em massa do que está fora do padrão é tarefa própria, depois.
>
> **Entregável:** `docs/geral/texto-explicativo-na-tela.md`, 📘 REF no índice — texto em vigor,
> não plano.
>
> **Status: 🟡 PARCIAL (17/09/2026).** As três decisões foram fechadas por ela e o padrão está
> escrito: **[`geral/texto-explicativo-na-tela.md`](../../geral/texto-explicativo-na-tela.md)**.
> Faltam a conferência dela numa rota real, a catraca (fase 2) e a conversão da dívida (tarefa
> própria). Medições de 17/09/2026, na `develop`, por varredura de JSX nos 1.043 `.tsx`.
>
> **As três decisões, como ela as fechou:**
>
> 1. **O degrau 0 entra**, com a formulação dela: *o controle tem nome claro?* Se tem texto
>    visível, esse texto é o rótulo; se é só ícone, precisa de **nome acessível**, e aí o tooltip
>    **pode repetir** esse nome — os dois cumprem funções diferentes. A regra "não repita o
>    rótulo" não vale nesse degrau.
> 2. **`title=` deixa de ser mecanismo permitido** para explicação nova: explicação é `<Tooltip>`,
>    botão de ícone é `aria-label` (mais `<Tooltip>` quando ajudar a descoberta visual), `title`
>    fica em `<iframe>`. Os **143** legados são **dívida inventariada**, não conversão agora — o
>    documento existe para impedir o **144º**. Isso separa *decidir o padrão* de *pagar a dívida*.
> 3. **Texto de apoio entra como papel oficial**, persistente e colado ao controle:
>    `FormDescription` quando o campo está na composição de formulário, e o **mesmo papel** fora
>    dela — a ausência de `FormDescription` não é motivo para voltar ao tooltip. **O guideline
>    manda no papel, não no componente JSX.**
>
> **O que isso obrigou no texto final,** e foi decisão dela: o documento nomeia **dois papéis
> distintos** — *rótulo exposto de controle* ("Editar OS", "Minimizar") e *explicação contextual*
> — porque teto, pontuação e regra de repetição valem só para o segundo. Chamar os dois de
> "tooltip" faz alguém aplicar a regra ao papel errado daqui a três meses.

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

Nenhum documento do repositório trata de tooltip, texto de apoio ou microcopy. Este é o primeiro.

## O que o levantamento achou

**A1 — São dois mecanismos, e o maior é o que ninguém escolheu.** O `title=` nativo (151) supera
o `<Tooltip>` (117). Ele não aparece no toque, espera cerca de um segundo, não tem tema e é lido
de forma inconsistente por leitor de tela. **A explicação mais usada do sistema é a que menos
aparece.** Os 8 de `<iframe>` são outro papel e ficam fora: a dívida é **143**.

**A2 — Metade do que se chama tooltip é rótulo, não explicação.** A mediana do texto literal em
`<TooltipContent>` é **1 caractere** (o resto é interpolação), e os literais curtos são "Editar
OS", "Remover contribuinte", "Editar contribuinte" — o **único nome que aquele botão tem**. Do
outro lado, **39 dos 117** estão atrás de um ícone (i) e são explicação de fato. Os 54 `title=`
em `<button>` fazem o mesmo papel de nome, pelo mecanismo pior ("Serviu", "Dispensar",
"Minimizar", "Responder").

**A3 — O tamanho já estourou, e o maior caso não é tooltip.** **15** passam de 80 caracteres,
**3** de 140, e o maior tem **521** e começa com "Como ler esta tabela" — nota de leitura da tela
escondida atrás de hover.

**A4 — O placeholder tem padrão não escrito.** `Selecione…` **130** × `Selecionar…` **23**;
`Ex:` **57** × `ex:` **18**; `Todos` **25** × `Todas` **10**; `Buscar…` **57** (forma já decidida
em 11/09). E 244 começam com verbo, 75 com exemplo, **328 com nenhum dos dois**.

**A5 — A pontuação é sorteada:** 23 tooltips terminam com ponto final, 94 não. Nas reticências,
`...` e `…` convivem no mesmo tipo de campo.

**A6 — Metade do vocabulário já foi decidida, e não é lida fora de onde nasceu.** O tooltip de
`ContribuintesTab.tsx:425` diz *"Excluir contribuinte já cadastrado exige o papel Sublíder ou
superior"*; o catálogo de recusa da sprint 12, para a **mesma** informação, diz *"É necessário
ter o papel de Sublíder ou superior para realizar esta ação."* Duas redações do mesmo fato, a
dois arquivos de distância. O padrão herda o catálogo (`src/lib/rlsMessages.ts`) e a palavra
única de status — não reabre nenhum dos dois.

## A árvore de decisão, como ficou

Fechada por ela em 17/09. Do mais barato ao mais caro; só desce um degrau quem não resolveu no
anterior. É a parte que impede tooltip para tudo.

| | Pergunta | O que fazer |
|---|---|---|
| **0** | O controle tem nome claro? | **Não:** dê nome. Se for só ícone, **nome acessível** e, quando ajudar a descoberta visual, `<Tooltip>` com o mesmo texto |
| **1** | O próprio rótulo pode resolver a dúvida? | **Melhore o rótulo** e não acrescente nada |
| **2** | O que a pessoa procura pode ficar visível na tela? | **Mostre o valor**, em vez de explicar onde achá-lo |
| **3** | A orientação precisa estar disponível durante a ação? | **Texto de apoio** permanente, abaixo do controle |
| **4** | É complementar, curta e não necessária para concluir? | **Tooltip** |
| **5** | Nada disso agrega? | **Não escreva nada** |

**Placeholder e mensagem contextual saíram da árvore e ganharam regra própria** no documento.
A árvore responde "a pessoa não entendeu este controle"; placeholder é forma do campo e nunca
resolve dúvida, e mensagem contextual não nasce de dúvida, nasce de um estado do sistema.

**O degrau 0 não estava na proposta inicial e a medição obrigou.** Sem ele, "não repita o
rótulo" manda apagar os 54 `title` de `<button>` e os "Editar OS"/"Remover contribuinte" — que
não repetem rótulo nenhum, porque **não existe rótulo**: são o nome do controle.

**O exemplo que prova a árvore** é `DevFilterFormPattern.tsx:204`, com duas coisas num balão só:
*"Contribuinte é a inscrição estadual associada ao cliente."* (definição, degrau 4) **+**
*"Selecione um cliente primeiro…"* (depende do estado, mensagem contextual). Redação não conserta
isso — o texto nasceu fazendo trabalho de dois recursos.

## As duas que não eram de escrita — decididas

**D1 — Qual mecanismo é "tooltip". ✅ Decidido.** Explicação nova é `<Tooltip>`; botão de ícone é
`aria-label` (mais `<Tooltip>` quando ajudar); `title=` fica em `<iframe>` (8). **`title=` deixa
de ser mecanismo permitido para explicação nova**, e os 143 legados são dívida inventariada. Sem
essa linha o padrão nasceria valendo para 117 casos de 268.

**D2 — Onde mora o texto de apoio. ✅ Decidido.** Entra como papel oficial, persistente, colado ao
controle. `FormDescription` (existe em `ui/form.tsx` e já liga o texto ao campo por
`aria-describedby`) quando o campo está na composição de formulário; fora dela, o **mesmo papel**,
com `id` e `aria-describedby` na mão. **Manda o papel, não o componente** — a ausência de
`FormDescription` não é motivo para voltar ao tooltip.

> **O número que decidiu a redação da D2:** `FormItem` é usado em **10 arquivos**, contra **645**
> `<Label>` soltos. Se o padrão dissesse só "use `FormDescription`", ele valeria para 10 telas e
> deixaria as outras sem marcação — que é como o texto de apoio virou tooltip em primeiro lugar.

## Execução

> **Etapas 1 a 6 ✅ CONCLUÍDAS em 17/09/2026.** O padrão está em
> [`geral/texto-explicativo-na-tela.md`](../../geral/texto-explicativo-na-tela.md), nas seis
> seções combinadas. Resta a etapa 7 (conferência dela), a fase 2 (catraca) e a conversão da
> dívida, que é tarefa própria. O registro abaixo fica como o método — é ele que se repete na
> próxima frente de texto.

**Etapa 1 — Levantamento · ✅ feita, está acima.** Os números e os candidatos saíram de varredura
de JSX (expressão, não linha), no molde do `medirCorCrua.ts`. Quem executar lê, não remede.

**Etapa 2 — Fechar a árvore · ✅.** Os seis degraus, o degrau 0 e o D1/D2 acima. Era aqui que a
tarefa era ganha ou perdida, e foi o que a etapa 1 permitiu decidir com caso na mão.

**Etapa 3 — O padrão por recurso · ✅ (seis blocos, não cinco: os dois papéis de §2 do documento
são distintos).** Para cada um, sempre os mesmos campos,
na mesma ordem: **quando usar · quando não usar · estrutura · tamanho · tom · terminologia ·
exemplo adequado · exemplo inadequado.** Uma linha por campo. Tabela, não prosa.

**Etapa 4 — Regras transversais · ✅.** No máximo **sete**, e nenhuma que o exemplo já
ensine. As candidatas medidas: começar pela informação que faz decidir ou agir · voz ativa ·
não repetir o label · não explicar o óbvio · uma orientação por texto · a mesma palavra para o
mesmo conceito · reaproveitar a terminologia do catálogo da sprint 12 onde houver equivalência.

**Etapa 5 — Antes → depois, com casos reais · ✅.** Cinco a oito pares, todos do
repositório, com arquivo e linha. **Os candidatos já estão selecionados:**

| Caso | Onde | Por quê |
|---|---|---|
| "Use os campos abaixo para filtrar a consulta das notas fiscais." | `ConsultaXmlFilters.tsx:36` | explica o óbvio — o depois é **sem tooltip** |
| "Contribuinte é a inscrição estadual… Selecione um cliente primeiro…" | `DevFilterFormPattern.tsx:204` | duas ideias, e uma delas é do degrau 4 |
| "Mostra se a linha já possui correção aplicada **e** se a tabela está em modo de edição." | `TabA170.tsx:602` | duas ideias num texto só |
| "Excluir contribuinte já cadastrado exige o papel Sublíder ou superior" | `ContribuintesTab.tsx:425` | mesma informação do catálogo, redação própria (A6) |
| "Como ler esta tabela…" (521 caracteres) | `AbaPorAnexo.tsx:127` | nota de leitura presa num hover |
| `title="Não foi possível medir -- a consulta falhou."` | `BoardPreenchimentoSistema.tsx:66` e `:98` | **mensagem de erro** num tooltip do navegador: some no toque, e o travessão está escrito `--` |
| `title="Serviu"` / `"Não serviu"` / `"Dispensar"` | `AgenteConversa.tsx:91,101` · `AgenteNotificacaoPopup.tsx:150` | nome de botão de ícone pelo mecanismo errado (degrau 0) |
| `placeholder="Selecionar equipe"` · `"Selecionar cargo"` · `"Selecionar gestor..."` | `CreateProcessModal.tsx:326,443` · `EstruturaManager.tsx:393` | a forma minoritária (23) contra a canônica `Selecione…` (130), e `...` no lugar de `…` |
| "Fecha esta versão (fica preservada como está) e abre uma nova a partir dela…" (158) | `DocumentoCentroRail.tsx:246` | **bom conteúdo, tamanho errado** — mostra que cortar não é piorar |

E o exemplo do que **já está certo**, que o documento precisa ter para não parecer só correção:
`ControleDeProjetosTabela.tsx:70` — *"Produto contratado nesta OS sem projeto criado. Clique para
abrir um."* (uma ideia, ação no fim) e `CorrecoesSped.tsx:619`, que explica de onde o dado vem.

**Etapa 6 — Checklist de revisão · ✅ (nove itens).** O que a tarefa pede, mais os dois itens que a
medição acrescenta:

- dois textos equivalentes sairiam parecidos?
- está claro quando **não** usar tooltip?
- o documento distingue texto de apoio de tooltip?
- o placeholder está só como exemplo/formato, nunca como label?
- a terminologia bate com o catálogo da sprint 12?
- há exemplo adequado **e** inadequado em cada recurso?
- alguém de produto ou de desenvolvimento aplica sem perguntar?
- **o documento diz qual marcação usar**, não só qual recurso? (D1/D2)
- **um botão de ícone continua tendo nome** depois de aplicada a regra? (degrau 0)

**Etapa 7 — A conferência dela · 🔵 pendente.** Numa rota real, não no documento: um caso de cada
papel (nome de botão de ícone, explicação, texto de apoio, mensagem contextual, placeholder). O
teste de fogo do documento não é lê-lo — é alguém abri-lo durante uma implementação e sair com a
decisão em dois minutos.

**Tempo:** 2 h a 2 h 30 de trabalho focado, com a etapa 1 já pronta. Foi o que custou.

## O entregável, em seis seções · ✅ [`geral/texto-explicativo-na-tela.md`](../../geral/texto-explicativo-na-tela.md)

1. **Princípio geral** — antes de acrescentar explicação, tornar o próprio controle mais claro.
2. **Árvore de decisão** — os seis degraus, em tabela, numa tela.
3. **Padrão por recurso** — **seis** blocos, os mesmos oito campos em cada.
4. **Voz e terminologia** — no máximo sete regras, mais o que nunca aparece no texto (nome de
   tabela, coluna, RPC, UUID, código de erro, inglês do Postgres) e o link para o catálogo.
5. **Antes → depois** — cinco a oito casos reais, com arquivo e linha.
6. **Checklist de revisão** — para usar nas próximas rotas.

**Teto: uma tela e meia.** Padrão que não se lê inteiro não se aplica, e o risco nomeado na
abertura é exatamente esse.

## Fase 2 — a catraca `textoDeAjuda.test.ts`

Fora das 2 h 30, e proposta, não decidida. No molde do `rotulosDeStatus.test.ts` e do
`filaDoBranco.test.ts`: inventário por motivo mais asserção — (a) nenhum `title=` em tag nativa
fora do inventário; (b) nenhum `<TooltipContent>` literal acima do teto; (c) nenhum placeholder
de escolha ou de busca fora das formas canônicas. Vista reprovando **antes** do conserto e
passando depois; verde de primeira não prova nada.

**Por que ela não é opcional para sempre:** todo padrão só de documento nesta casa voltou a
divergir — foi assim com a palavra de status, com o cartão tingido e com o branco literal, e nos
três casos quem segurou foi o teste, não o texto. Mas ela vem **depois** do padrão: catraca
escrita antes trava o estado de hoje.

## O que fica de fora, e é decisão, não esquecimento

- **A conversão dos 143 `title=`** e dos tooltips acima do teto. Tarefa própria, por inventário.
- **A tradução de erro do banco** — fechada na sprint 12, com teste. O padrão cita e não reabre.
- **A palavra de status** — fechada em 03/09, com catraca. Idem.
- **Os 337 textos de lista vazia.** Ficam específicos por decisão de 11/09 ("Nenhum cliente
  encontrado." nomeia o que não foi achado, e isso é informação).
- **Acessibilidade além do tooltip.** Os 323 `aria-label` não são desta tarefa, exceto onde o
  degrau 0 os criar.

## Pronto quando

Existe `docs/geral/texto-explicativo-na-tela.md`, lido inteiro numa tela e meia, com árvore de
decisão, exemplo real dos dois lados e checklist; e a próxima rota escrita por outra pessoa sai
com a mesma estrutura, o mesmo tamanho, o mesmo vocabulário e o mesmo tom **sem ninguém
perguntar** — que é a única forma de saber se o documento foi usado ou só arquivado.
