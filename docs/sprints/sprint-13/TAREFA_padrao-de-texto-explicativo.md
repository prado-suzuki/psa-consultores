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
> **Status: 🔵 ABERTO.** Medições de 17/09/2026, na `develop`, por varredura de JSX nos 1.043
> `.tsx` versionados. A etapa 1 (levantamento) **já está feita e está neste arquivo**.

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

## A árvore de decisão

A ordem decidida, do mais barato ao mais caro. **Só desce um degrau quem não resolveu no
anterior.** É a parte mais importante do documento, porque é ela que impede tooltip para tudo.

| | Pergunta | Recurso |
|---|---|---|
| **0** | O controle **tem nome visível**? | Se não (botão de ícone), o texto é o **nome**, não explicação — e as regras de tooltip abaixo não valem para ele |
| **1** | O label pode ficar mais claro? | **Ajuste o label** e não acrescente nada |
| **2** | A informação precisa ficar visível o tempo todo? | **Texto de apoio**, sob o campo |
| **3** | É complementar, só ajuda em caso de dúvida? | **Tooltip** atrás de (i) |
| **4** | Depende do estado, da etapa ou da situação? | **Mensagem contextual**, onde a situação acontece |
| **5** | É só o formato esperado no campo? | **Placeholder** — nunca no lugar do label nem de instrução essencial |

**O degrau 0 não estava na proposta e a medição obriga.** Sem ele, a regra "não repita o label"
manda apagar os 54 `title` de `<button>` e os "Editar OS"/"Remover contribuinte" — que não
repetem label nenhum, porque **não existe label**: são o nome do controle. Custa uma linha no
documento e evita que a primeira aplicação do padrão quebre acessibilidade.

**O degrau 4 já aparece misturado no 3, e o exemplo está medido.**
`DevFilterFormPattern.tsx:204` tem, num tooltip só: *"Contribuinte é a inscrição estadual
associada ao cliente."* (definição, degrau 3) **+** *"Selecione um cliente primeiro para listar
os contribuintes disponíveis."* (depende do estado "nenhum cliente escolhido", degrau 4). A
árvore separa os dois, e é isso que ela tem de fazer no documento.

## Duas coisas que o documento precisa responder, e não são de escrita

**D1 — Qual mecanismo é "tooltip".** Se o documento disser "use tooltip" sem dizer qual, os 86
arquivos com `title=` continuam como estão e o padrão nasce valendo para 117 casos de 268.
Proposta em uma linha: **tooltip é `<Tooltip>`; `title=` fica só em `<iframe>` (8), que é título
de quadro; nome de botão de ícone é `aria-label` + `<Tooltip>`.**

**D2 — Onde mora o texto de apoio.** O degrau 2 é o mais recomendado antes do tooltip e **hoje
não existe no código**: `FormDescription` tem 0 usos, e os 588 `<p>` com `text-xs
text-muted-foreground` são uma mistura de apoio, legenda e nota. Sem isso resolvido, a primeira
pessoa que aplicar a árvore inventa a marcação. Duas saídas: adotar o `FormDescription` do
shadcn (já está em `ui/form.tsx`), ou documentar a classe padrão. **É escolha de quem escreve o
documento, e cabe nele em uma linha.**

## Execução

**Etapa 1 — Levantamento · ✅ feita, está acima.** Os números e os candidatos saíram de varredura
de JSX (expressão, não linha), no molde do `medirCorCrua.ts`. Quem executar lê, não remede.

**Etapa 2 — Fechar a árvore (30–40 min).** Confirmar os seis degraus, o degrau 0 e o D1/D2
acima. É aqui que a tarefa é ganha ou perdida.

**Etapa 3 — O padrão por recurso (45–60 min).** Para cada um dos cinco, sempre os mesmos campos,
na mesma ordem: **quando usar · quando não usar · estrutura · tamanho · tom · terminologia ·
exemplo adequado · exemplo inadequado.** Uma linha por campo. Tabela, não prosa.

**Etapa 4 — Regras transversais (20 min).** No máximo **sete**, e nenhuma que o exemplo já
ensine. As candidatas medidas: começar pela informação que faz decidir ou agir · voz ativa ·
não repetir o label · não explicar o óbvio · uma orientação por texto · a mesma palavra para o
mesmo conceito · reaproveitar a terminologia do catálogo da sprint 12 onde houver equivalência.

**Etapa 5 — Antes → depois, com casos reais (30–45 min).** Cinco a oito pares, todos do
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

**Etapa 6 — Checklist de revisão (20 min).** O que a tarefa pede, mais os dois itens que a
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

**Tempo:** 2 h a 2 h 30 de trabalho focado, com a etapa 1 já pronta.

## O entregável, em seis seções

1. **Princípio geral** — antes de acrescentar explicação, tornar o próprio controle mais claro.
2. **Árvore de decisão** — os seis degraus, em tabela, numa tela.
3. **Padrão por recurso** — cinco blocos, os mesmos oito campos em cada.
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
