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
> **Status: 🟡 PARCIAL (17/09/2026).** As três decisões foram fechadas por ela, o padrão está
> escrito — **[`geral/texto-explicativo-na-tela.md`](../../geral/texto-explicativo-na-tela.md)** —,
> a **etapa 7 passou** (três dry-runs de aplicação, com quatro correções que vieram do uso e não
> de releitura) e a **catraca está no ar**, vista reprovando antes de passar. **Falta só a
> conversão da dívida**, que é tarefa própria. Medições de 17/09/2026, na `develop`.
>
> ## O recorte dela, 17/09 — o que este arquivo é, e o que ele não é
>
> **O manual serve à auditoria das rotas, não ao inventário do que existe hoje.** A cadeia é
> `padrão → auditoria das rotas → especificação aprovada → implementação`, e o padrão só cumpre
> o papel dele se permitir, diante de um controle, responder quatro perguntas **sem inventar
> regra na hora**: precisa de texto ou o controle é que precisa melhorar · se precisa, qual
> recurso · como se escreve isso em português · qual é a redação final que vai para a
> especificação. É por isso que a implementação não escreve texto: ela recebe a ficha pronta
> (§6 do manual), e a qualidade do português foi garantida antes, aqui.
>
> **O critério para uma linha entrar no manual é um só:** *isso ajuda quem faz a auditoria a
> escolher o recurso e escrever o texto final?* O que não passa nesse teste **fica neste
> arquivo**, como insumo ou backlog técnico paralelo — foi assim que saíram do manual os
> contadores do levantamento (quantos `title=`, quantos `FormItem`, quantos `<Label>`, a
> varredura dos 1.043 `.tsx`) e o inventário das ocorrências atuais. Eles descobriram os
> problemas, e essa era a função deles; não são o produto.
>
> **O que o manual ganhou nesse mesmo recorte** (commit desta linha) foi a camada que faltava:
> a **§4 "Como escrever"** deixou de ser só sete regras de voz e passou a trazer a tabela do que
> **não entra** ("Para que seja possível…", "favor", "o mesmo", "deverá estar sendo", "clique
> aqui para", "realizar a validação"), a pontuação canônica e o corte de palavra que não muda o
> sentido; e entrou a **§6**, a ficha que a auditoria entrega, com a regra de que texto aprovado
> não se reescreve na implementação. O checklist passou a ter dois blocos, escolha do recurso e
> redação, porque são as duas decisões que a auditoria toma.
>
> **A catraca continua.** Ela não disputa espaço com o leitor — mora em `src/lib/textoDeAjuda.test.ts`,
> não no manual — e é o que impede o padrão de voltar a divergir, como voltou a palavra de status,
> o cartão tingido e o branco literal antes de terem teste. O manual cita o mecanismo (`<Tooltip>`,
> `aria-label`, `title=` só em `<iframe>`) sem os números, que moram aqui.
>
> **As três decisões, como ela as fechou:**
>
> 1. **O degrau 0 entra**, com a formulação dela: *o controle tem nome claro?* Se tem texto
>    visível, esse texto é o rótulo; se é só ícone, precisa de **nome acessível**, e aí o tooltip
>    **pode repetir** esse nome — os dois cumprem funções diferentes. A regra "não repita o
>    rótulo" não vale nesse degrau.
> 2. **`title=` deixa de ser mecanismo permitido** para explicação nova: explicação é `<Tooltip>`,
>    botão de ícone é `aria-label` (mais `<Tooltip>` quando ajudar a descoberta visual), `title`
>    fica em `<iframe>`. Os **215** legados são **dívida inventariada**, não conversão agora — o
>    documento existe para impedir o **216º**. Isso separa *decidir o padrão* de *pagar a dívida*.
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
| `title=` em tag HTML nativa (tooltip do navegador) | **223** | 107 arquivos |
| — quebrado por tag | `button` 126 · `span` 61 · `div` 16 · `iframe` 8 · `p` 6 · outros 6 | |
| `placeholder=` | **739** (647 literais) | 279 arquivos |
| `<FormDescription>` (texto de apoio do shadcn) | **0** | — |
| `<p>` com `text-xs/sm text-muted-foreground` (candidato a texto de apoio) | **588** | 265 arquivos |
| Texto de lista vazia ("Nenhum…", "Nenhuma…") | **337** | 242 arquivos |
| Ícone de ajuda (`HelpCircle`/`Info`) | **65** | 52 arquivos · **39** dentro de `TooltipTrigger` |
| `aria-label` | **323** | — |

Nenhum documento do repositório trata de tooltip, texto de apoio ou microcopy. Este é o primeiro.

## O que o levantamento achou

**A1 — São dois mecanismos, e o maior é o que ninguém escolheu.** O `title=` nativo (223) supera
o `<Tooltip>` (117). Ele não aparece no toque, espera cerca de um segundo, não tem tema e é lido
de forma inconsistente por leitor de tela. **A explicação mais usada do sistema é a que menos
aparece.** Os 8 de `<iframe>` são outro papel e ficam fora: a dívida é **215**.

**A2 — Metade do que se chama tooltip é rótulo, não explicação.** A mediana do texto literal em
`<TooltipContent>` é **1 caractere** (o resto é interpolação), e os literais curtos são "Editar
OS", "Remover contribuinte", "Editar contribuinte" — o **único nome que aquele botão tem**. Do
outro lado, **39 dos 117** estão atrás de um ícone (i) e são explicação de fato. Os 54 `title=`
em `<button>` — **126**, remedidos — fazem o mesmo papel de nome, pelo mecanismo pior ("Serviu", "Dispensar",
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
rótulo" manda apagar os 126 `title` de `<button>` e os "Editar OS"/"Remover contribuinte" — que
não repetem rótulo nenhum, porque **não existe rótulo**: são o nome do controle.

**O exemplo que prova a árvore** é `DevFilterFormPattern.tsx:204`, com duas coisas num balão só:
*"Contribuinte é a inscrição estadual associada ao cliente."* (definição, degrau 4) **+**
*"Selecione um cliente primeiro…"* (depende do estado, mensagem contextual). Redação não conserta
isso — o texto nasceu fazendo trabalho de dois recursos.

## As duas que não eram de escrita — decididas

**D1 — Qual mecanismo é "tooltip". ✅ Decidido.** Explicação nova é `<Tooltip>`; botão de ícone é
`aria-label` (mais `<Tooltip>` quando ajudar); `title=` fica em `<iframe>` (8). **`title=` deixa
de ser mecanismo permitido para explicação nova**, e os 215 legados são dívida inventariada. Sem
essa linha o padrão nasceria valendo para 117 casos de 332.

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

**Etapa 7 — A conferência dela · ✅ PASSOU (17/09).** Feita como **teste de uso**, não como
releitura: três dry-runs — botão de ícone "Baixar XML" (degrau 0, decisão imediata), campo
Contribuinte sem cliente escolhido (mensagem contextual mais placeholder canônico) e campo de
formato não óbvio (placeholder, com a restrição permanente indo para texto de apoio). Nos três a
decisão saiu sem reinterpretar a árvore.

**O veredito confirmou a escolha de tirar placeholder e mensagem contextual dos degraus:** a
árvore passou a responder uma pergunta só — *este controle precisa de ajuda para ser entendido?* —
e os dois recursos, tendo gatilhos diferentes, exigem menos raciocínio separados. O texto que
explica por que estão fora ficou sendo uma das partes úteis do documento, porque define fronteira
semântica e não componente.

**As quatro correções que o uso achou, todas aplicadas** (commit `d08457ee`) — e as três primeiras
são contradições internas que só aparecem quando alguém tenta aplicar a regra:

1. **infinitivo contra imperativo** no rótulo exposto: a estrutura dizia "verbo no infinitivo" e o
   tom dizia "imperativo impessoal". Duas regras para o mesmo texto obrigam a escolher qual vence;
   virou "a ação no infinitivo, direta e neutra";
2. **texto de apoio** mandava começar pela consequência e o próprio exemplo começa pela condição.
   A regra passou a abranger as três (condição, restrição ou consequência), e o exemplo prova a
   regra em vez de contradizê-la;
3. **escopo do `rlsMessages.ts`**: a seção parecia mandar toda frase contextual nova para um
   catálogo criado para **recusa**, o que o transformaria em repositório universal de microcopy.
   Agora está explícito — recusa, permissão e falha saem de lá; as demais seguem a §4 e moram onde
   o estado é tratado;
4. **`Todos`/`Todas`**, fechado antes de automatizar. Conferido no código: não são "Todos" secos,
   são "Todos os clientes", "Todas as OS", e já existem **58 `SelectItem value="all"`** com esse
   rótulo. Então a regra não é proibir — aquele texto é o **rótulo da opção** e tem de casar com o
   `SelectItem`, palavra por palavra. `Selecione…` não se aplica onde não há nada a selecionar, há
   um recorte já valendo.

E uma contradição que as próprias correções criaram: a estrutura do placeholder dizia "quatro
formas canônicas, e nada mais" com a quinta escrita três linhas abaixo.

**Tempo:** 2 h a 2 h 30 de trabalho focado, com a etapa 1 já pronta. Foi o que custou.

## O entregável, em sete seções · ✅ [`geral/texto-explicativo-na-tela.md`](../../geral/texto-explicativo-na-tela.md)

Duas camadas, e a divisão está dita na abertura do próprio manual: **§1 a §3 escolhem o recurso,
§4 escreve o texto.** As três últimas são o que sai disso.

1. **Princípio geral** — antes de acrescentar explicação, tornar o próprio controle mais claro.
2. **Árvore de decisão** — os seis degraus, em tabela, numa tela.
3. **Padrão por recurso** — **seis** blocos, os mesmos oito campos em cada.
4. **Como escrever** — as sete regras, o corte da palavra que não muda o sentido, a tabela do que
   **não entra** (com o par ruim → melhor em cada linha), a pontuação canônica e o vocabulário
   herdado do catálogo. É a camada que a auditoria usa para chegar à redação final.
5. **Antes → depois** — cinco a oito casos reais, com arquivo e linha.
6. **A ficha da auditoria** — rota · controle · problema · intervenção · texto final ·
   comportamento · marcação, e a regra de que a implementação não reescreve texto aprovado.
   "Intervenção: nenhuma" é resultado válido.
7. **Checklist de revisão** — em dois blocos, escolha do recurso e redação.

**Teto: duas telas**, uma por camada. Padrão que não se lê inteiro não se aplica, e o risco
nomeado na abertura é exatamente esse.

## Fase 2 — a catraca `textoDeAjuda.test.ts` · ✅ FEITA (17/09)

Liberada por ela depois da etapa 7 — *"a catraca agora faz sentido porque vai congelar um padrão
que já é utilizável"*. Três asserções, os números congelados no recorte das pastas de tela:

| Asserção | Congelado | O que ela impede |
|---|---|---|
| `title=` em tag nativa | **215** em 107 arquivos | o **216º**. Sobe: use `<Tooltip>`/`aria-label`. Desce: a dívida foi paga, e o número desce no mesmo commit |
| `<TooltipContent>` acima de 140 caracteres **de texto lido** | os **3** conhecidos, por arquivo | nota de leitura nova escondida atrás de hover |
| placeholder de escolha ou busca fora das quatro formas | **226** em 140 arquivos | texto sob medida novo onde o padrão do componente resolve |

**Vista reprovando antes de passar**, com os três defeitos fabricados num arquivo temporário: as
três falharam, e a do `title` imprimiu *"Agora: 144 em 81"* — que é o objetivo do documento dito
pelo teste. Verde de primeira não prova nada.

**Dois achados da execução, e os dois mudaram o teste:**

- **Medir o tooltip bruto superestima 17×.** O conteúdo cru de `<TooltipContent>` acusa **52**
  casos acima do teto, em 35 arquivos; o texto que a pessoa lê são **3**. A diferença é markup —
  um tooltip de dez palavras embrulhado em `<div className="…">` reprovaria pelas classes. Por
  isso essa asserção não é regex: tira as tags e as interpolações antes de medir. Catraca que
  mede o invólucro reprova quem escreveu certo.
- ~~**A regex de linha bastou, e isso foi medido antes de escolher.**~~ **ERRADO, e corrigido em
  17/09** — a comparação que eu disse ter feito usava dois scanners com o mesmo defeito, então os
  dois erravam igual e a igualdade não provava nada. `[^<>]*` para no primeiro `>`, e `>` aparece
  em **toda arrow function** (`onClick={() => …}`) e em toda comparação (`length <= 1`): um
  `title=` escrito depois de um handler era invisível. A catraca media **141 de 215**, deixando
  **74** passarem caladas.
  **Quem achou foi a execução, não a releitura:** o script de conversão, que já usava parser de
  verdade, encontrou **126 botões** onde a contagem prometia 54 — e a primeira reação certa foi
  desconfiar do script. Três provas: `AgentePsaWidget.tsx`, `ArquivoEnviado.tsx` (as duas com
  `title` depois de `onClick={() => …}`) e `AcessosLayout.tsx` (comentário `//` dentro da tag).
  O teste passou a usar o parser, com as tags ambíguas (props contendo `<`) contadas à parte em
  vez de chutadas — hoje é **1**. É o mesmo erro do "142" do índice, cometido aqui.

A leitura do texto do tooltip mora no próprio teste, não no `medirCorCrua.ts` — aquele módulo é
de cor, e esta é a primeira consumidora. Se nascer a segunda, sai para módulo próprio, que foi
como o `medirEmCaixaArredondada` saiu da `cartaoTingido`.

**O que ela não persegue, e está escrito no arquivo:** `title` em `<iframe>` (8, permitidos),
`title` como prop de componente nosso (264 — outro `title`, só o nome em comum), o texto em si
(redação é revisão humana, e está no checklist da §6) e prosa de comentário.

**Por que ela não é opcional para sempre:** todo padrão só de documento nesta casa voltou a
divergir — foi assim com a palavra de status, com o cartão tingido e com o branco literal, e nos
três casos quem segurou foi o teste, não o texto. Mas ela vem **depois** do padrão: catraca
escrita antes trava o estado de hoje.

## Fase 3 — a conversão da dívida · 🟡 falta o placeholder

Ela aprovou as sete conversões em 17/09, diante de
[`geral/comparacoes-de-texto/as-conversoes.html`](../../geral/comparacoes-de-texto/as-conversoes.html)
— a página montou cada caso no contexto e nos dois estados, com o `title` nativo de verdade nos
casos 1, 2 e 6, porque a diferença de mecanismo só aparece interagindo.

| Lote | O quê | Commit | Dívida de `title` |
|---|---|---|---|
| 1 | Os sete casos pontuais (nota de leitura, tooltip do óbvio, duas ideias, erro no `title`, vocabulário, tamanho) | `d1980d59` | 215 |
| 2 | **126 botões de ícone** → `ButtonTooltip` (`aria-label` + balão) | `147bfa1d` | 89 |
| 3 | **85 spans e divs** → `ElementTooltip` | `4488f524` | 8 |
| 4 | Os **8** que o script não deu conta, à mão | `9809b16b` | **0** |

**A dívida do `title` fechou.** Sobram os 8 `<iframe>`, que o padrão mantém, e a catraca passou
a congelar **zero**: daqui para frente `title=` em tag nativa é regressão, não dívida.

### O que falta, e é o maior

**Os 226 placeholders fora das formas canônicas.** É o único lote que **não se automatiza**: cada
caso decide entre `Selecione…`, `Buscar…` e `Ex: …`, e alguns não são placeholder nenhum — viram
texto de apoio (a restrição que vale toda vez) ou somem. A catraca já congela 226, então o
progresso se mede sozinho.

### Três coisas que a execução ensinou, e que não estavam no plano

- **Balão vazio.** Vários `title` eram condicionais (`cond ? texto : undefined`). Sem texto o
  `title` não aparecia; um `<Tooltip>` cru abriria um balão em branco no hover. As duas peças
  devolvem o filho direto quando não há texto — está no `ui/button-tooltip.tsx`.
- **Os "dinâmicos" não eram texto cortado.** Só 29 dos 89 tinham truncagem na própria classe; o
  resto era explicação montada (`{tituloLacuna(l)}`), que é o degrau 4 e não o caso 2. Mesmo
  mecanismo, motivo diferente.
- **Três arquivos foram revertidos, não commitados quebrados.** O script gerou JSX inválido neles
  (tag aninhada de mesmo nome), o typecheck acusou, voltaram ao original e saíram à mão no lote 4.

### ⚠️ Um commit misturado, para resolver antes de seguir

O commit `9809b16b` (lote 4) levou junto **três arquivos de outra frente** — `ListaDeOsFaturamento.tsx`,
`useDomainFaturamentoOs.ts` e `admFinFaturamentoOs.ts` (95 linhas novas, Faturamento) —, porque a
conversão usou `git add -A src` com trabalho de outra sessão no working tree. **Nada se perdeu**, e
o conteúdo está lá; o que está errado é a mensagem. Separar em dois commits é decisão dela, e não
foi feito por conta própria.

## O que fica de fora, e é decisão, não esquecimento

Os três primeiros itens formam o **backlog técnico paralelo**: nascem do levantamento da etapa 1,
não entram no manual e não bloqueiam a auditoria das rotas, que trabalha sobre tela nova.

- **A conversão dos 215 `title=`** e dos tooltips acima do teto. Tarefa própria, por inventário.
- **Os 226 placeholders fora do cânone**, congelados pela catraca. Mesma natureza: dívida medida,
  conversão em lote, sem decisão de padrão envolvida.
- **Ligar ao campo o texto de apoio que já existe:** são **588** `<p>` candidatos contra **23**
  `aria-describedby` no `src` inteiro, ou seja quase nenhum está anunciado. O padrão já diz como
  se escreve e se marca um novo; converter os antigos é varredura, não redação.
- **A tradução de erro do banco** — fechada na sprint 12, com teste. O padrão cita e não reabre.
- **A palavra de status** — fechada em 03/09, com catraca. Idem.
- **Os 337 textos de lista vazia.** Ficam específicos por decisão de 11/09 ("Nenhum cliente
  encontrado." nomeia o que não foi achado, e isso é informação).
- **Acessibilidade além do tooltip.** Os 323 `aria-label` não são desta tarefa, exceto onde o
  degrau 0 os criar.

## Pronto quando

Uma pessoa abre `docs/geral/texto-explicativo-na-tela.md`, olha um controle e chega **sem
interpretação adicional** ao tipo de intervenção e à redação final que vão para a especificação —
e a próxima rota, auditada por outra pessoa, sai com a mesma estrutura, o mesmo tamanho, o mesmo
vocabulário e o mesmo tom **sem ninguém perguntar**. É a única forma de saber se o documento foi
usado ou só arquivado. Se a implementação precisar reescrever o texto recebido, o padrão falhou
antes, aqui.
