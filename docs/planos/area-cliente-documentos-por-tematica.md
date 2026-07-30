# Área do Cliente — Solicitação de documentos por temática

Plano de redesenho da aba **Documentos** de `/cliente` + briefing para gerar o HTML no Stitch.

Data: 28/07/2026

---

## 1. Diagnóstico: por que a tela de hoje não é intuitiva

A tela atual (`src/components/cliente/MeusDocumentosConteudo.tsx`) abre com **8 cards de entidade**
(5 pessoas físicas, 1 PJ, 1 matrícula, 1 bem) e um contador `0/35 recebidos · 0%`.

Três problemas concretos:

| Problema | Efeito no cliente |
|---|---|
| Agrupa por **entidade**, não por **pedido** | Cinco cards de pessoa visualmente idênticos ("5 A ENVIAR" cada). Nada indica *o que* está sendo pedido nem *por quê*. |
| Não existe pedido | Não há título, descrição, nem "a PSA está pedindo isto". É um inventário, não uma solicitação. |
| Abre em `0/35` | O número desanima e não sugere primeiro passo. O cliente pergunta "por onde começo?" e a tela não responde. |

A temática (o *assunto* do pedido) só aparece como subtítulo cinza minúsculo **dentro do modal**
(`MeusDocumentosConteudo.tsx:321-333`), depois de dois cliques — exatamente o nível em que
deveria estar no topo.

## 2. O achado: a taxonomia já existe no banco

Não é preciso inventar nem cadastrar nada. A coluna **`categoria_docbox`** já está preenchida
nos 63 itens do catálogo padrão (`supabase/migrations/20260707130100_osg_checklist_seed_padrao.sql`)
e é copiada para cada `checklist_cliente_item`. Os valores são **exatamente as 10 temáticas OSG**
do DocBox — nem uma sobra, nem uma falta.

Melhor ainda: a RPC que a tela do cliente consome já devolve o campo
(`get_checklist_solicitado_cliente`, migration `20260723173413`, linha 11), e o tipo TypeScript
já o expõe (`ChecklistSolicitadoItem.categoria_docbox`).

**Conclusão: a inversão da hierarquia é 100% front-end.** Zero migration, zero mudança de RPC.

## 3. A hierarquia proposta (3 níveis)

```
NÍVEL 1  Temática          "Documentos Societários"       ← o pedido (o que o DocBox faz)
         ↓                  9 de 22 recebidos
NÍVEL 2  Entidade          "MMS Participações Ltda"       ← o diferencial da PSA
         ↓                  0 de 6
NÍVEL 3  Documento         "Contrato social e alterações" ← o diferencial da PSA
                            + instrução específica (campo `nota`)
```

Por que a temática vai pro topo: os documentos de uma mesma temática vêm da **mesma fonte, na
mesma ida** — os societários vêm do contador, os pessoais vêm da família, as matrículas vêm do
cartório. É assim que o cliente trabalha, e é por isso que o DocBox agrupa assim.

Por que os níveis 2 e 3 não podem sumir: é aí que a PSA ganha do DocBox. O DocBox pede
"Disponibilizar os atos e documentos societários das empresas que compõem o Grupo" e larga o
cliente. A PSA pede **"Contrato social e alterações"** para **"MMS Participações Ltda"** com a
instrução **"de constituição e todas as alterações posteriores, incluindo S.A."**. Nome do
documento + entidade nominal + instrução: é isso que precisa aparecer, e já está no banco.

## 4. As 10 temáticas OSG

> **Decisão (2026-07-28, DEC-02 resolvida):** o título na tela é o **nome canônico do sistema**,
> igual ao valor de `categoria_docbox` — sem inventar rótulo "mais amigável". Só se remove o
> prefixo `OSG - ` do DocBox, que é código de área interna.
>
> Motivo: o time da OSG diz "Documentos Societários" no DocBox, no memorando, no catálogo
> (`checklistPadrao.ts`) e na conversa. Se a tela do cliente dissesse "Empresas do grupo
> (societário)", **toda ligação teria dois vocabulários** e alguém teria de traduzir. E como o
> cliente de projeto OSG é produtor rural, "DIRPF", "ITR" e "CCIR" **são a língua dele** — não é
> jargão a evitar. Bônus: o mapa `TEMATICAS` fica sem campo de título (só descrição, ícone e
> ordem), então há uma coisa menos para divergir.

`chave` = valor gravado em `categoria_docbox`, que é **também** o título exibido.
`itens` = quantos itens do catálogo padrão caem na temática (o cliente vê só os instanciados).

| # | chave (banco) = título na tela | descrição (DocBox) | entidade | itens |
|---|---|---|---|---|
| 1 | **Documentos Pessoais** | Documentos pessoais dos fundadores, sócios, herdeiros e respectivos cônjuges/companheiros(as). | Pessoa Física | 7 |
| 2 | **DIRPF** | DIRPF dos sócios, fundadores e herdeiros do último ano-calendário, e dos anos anteriores em que bens ou quotas foram integralizados em outras empresas. | Pessoa Física | 2 |
| 3 | **Documentos Sucessórios** | Contratos de doação e testamentos realizados a favor ou pelos fundadores, sócios e/ou herdeiros. | Pessoa Física | 4 |
| 4 | **Documentos Societários** | Atos e documentos societários das empresas que compõem e/ou são relacionadas ao Grupo, ainda que em nome das pessoas físicas, de PJ destas pessoas ou de terceiros. | Pessoa Jurídica / Cooperativa | 22 |
| 5 | **Documentos Fiscais** | CCIR e ITR para imóveis rurais, IPTU para urbanos — levantamento do número de cadastro do imóvel. | Matrícula rural / urbana | 3 |
| 6 | **Documentos dos Bens Imóveis** | Matrículas, contratos de compra e venda e escrituras públicas dos bens imóveis do Grupo. | Matrícula rural / urbana / Bem | 12 |
| 7 | **Documentos da Atividade Rural** | Contratos e documentos relacionados à exploração agrícola e/ou pecuária do Grupo. | Bem | 2 |
| 8 | **Documentos de Locação** | Contratos de locação de imóveis urbanos do Grupo cedidos a terceiros e/ou PF/PJ, devidamente assinados. | Bem | 1 |
| 9 | **Documentos do Planejamento Tributário** | Planilhas e relatórios que embasam o planejamento tributário da atividade rural — receitas e despesas por ano-calendário, segregando áreas próprias e arrendadas. | Bem | 7 |
| 10 | **Documentos de Governança** | Documentos voltados à organização/estruturação do Grupo, eventualmente realizados por outras consultorias. | Pessoa Jurídica | 3 |

**Ordem na tela:** a fixa acima. Ela segue o campo `modulo` do catálogo, que já codifica a fase
do trabalho — Qualificação das Partes (1-4) → Diagnóstico Patrimonial (5-9) → Quadro Societário (10).
O cliente preenche na ordem em que a OSG precisa.

## 5. Telas a gerar no Stitch

### Tela A — Lista de temáticas (a principal)

- Cabeçalho do pedido: "A PSA solicitou estes documentos", nome do projeto, barra de progresso geral.
- Faixa **"Comece por aqui"**: 1 card destacando a temática mais urgente (prazo mais próximo;
  na falta de prazo, a primeira pendente na ordem fixa), com botão direto. Resolve o "por onde começo".
  **Não** escolher "a que tem mais itens" — empurra o cliente para a maior pilha, não para a mais urgente.
- Busca (mantém a de hoje: pessoa, imóvel ou documento).
- Filtros de status: Todos / Pendentes / Enviados.
- **10 linhas-accordion**, uma por temática: ícone, título, descrição em 1-2 linhas,
  selo `X de Y enviados`, barra de progresso, chevron para expandir.
- Temáticas 100% concluídas colapsam para o fim da lista, em verde, sem descrição.

### Tela B — Temática expandida

Dentro da linha aberta, agrupado por entidade:

```
▾ Empresas do grupo (societário)                        0 de 6 enviados
  Atos e documentos societários das empresas do Grupo…

  🏢 MMS PARTICIPAÇÕES LTDA                                     0 de 6
     ○ Contrato social e alterações                    [Enviar]
       De constituição e todas as alterações posteriores, incluindo S.A.
     ○ CNPJ (situação cadastral e regime tributário)   [Enviar]
       Atualizado, indicando o regime tributário adotado.
     ✓ Balanço / Balancete / DRE                       balanco-2025.pdf · 2,1 MB · 24/07
```

- A `nota` de cada item sai do modal e vira **subtexto permanente** — é a instrução que o DocBox não tem.
- Item recebido: check verde, nome do arquivo, tamanho, data, quem enviou (já vem da RPC/`docPorItem`).
- Botão `Enviar` por linha (o fluxo de upload por item já existe: `useUploadDocumentoSolicitado`).
- Quando a temática tem muitas entidades (5 pessoas físicas), cada entidade é um subgrupo colapsável,
  aberto por padrão só se tiver pendência.

### Tela C — Modal de envio de um documento

- Título: nome do documento. Subtítulo: temática › entidade.
- Instrução completa (`nota`) em destaque.
- Dropzone (arrastar ou escolher), tipos aceitos e limite de 50 MB.
- **Sem selo "Confidencial".** O campo existe no catálogo (testamento, contrato de doação) e marca
  documento sensível, mas é a base de uma camada de segurança futura — fica intocado nesta tarefa.

### Estilo

Herdar o que já está no app: fundo branco/`slate-50`, cabeçalho verde-petróleo escuro,
ações e progresso em **teal**, pendente em **âmbar**, concluído em **esmeralda**, cantos `rounded-xl`,
sombra leve, tipografia sem serifa. Cards de 168px de altura mínima. Mobile-first: o cliente
abre isso no celular.

## 6. Prompt pronto para colar no Stitch

> Design a client-facing document request page in Brazilian Portuguese for a
> consulting firm's client portal ("Área do Cliente"). Mobile-first, responsive,
> clean and professional.
>
> **Header:** dark teal-green bar with "Área do Cliente" and the client's e-mail.
> Below it, tabs: Chamados, Projetos, Documentos (active), Dashboards.
>
> **Terminology lock (highest priority):** every label below is the exact wording used in
> the production system. Reproduce each string **verbatim**. Do NOT translate, rephrase,
> abbreviate or replace with a synonym — a renamed label is a bug, not a style choice.
> In particular: never write "tema", "Em revisão", "Histórico", "Foco agora" or "PSA Documents".
>
> **Request block:** title "A PSA solicitou estes documentos", subtitle
> "Organização Societária e Sucessória — Grupo Sebben". A wide progress bar
> showing 11 of 35 received (31%), amber fill. To the right: "11/35 recebidos".
>
> **"Comece por aqui" card:** highlighted card with an amber left border, a
> building icon, the eyebrow "COMECE POR AQUI", title "Documentos Societários",
> text "5 documentos pendentes da MMS Participações Ltda · prazo até 15/08/2026",
> and a teal button "Ver documentos".
>
> **Search + filters:** a search input "Buscar pessoa, imóvel ou documento…"
> and four pill filters: Todos (active), Pendentes, Em análise, Aprovados.
>
> **Accordion list of 10 request themes.** Each row: a rounded icon on a light
> teal background, a bold title, a one-line grey description, a small grey line
> "Solicitado em 16/05/2026 · Prazo até 15/08/2026", a right-aligned badge
> "X de Y enviados", a thin progress bar, and a chevron. Rows:
> **Use these exact titles — do NOT rephrase, shorten or invent synonyms. They are the
> system's canonical names and must match character for character:**
> 1. Documentos Pessoais — "Documentos pessoais dos fundadores, sócios, herdeiros e cônjuges" — 8 de 15
> 2. DIRPF — "DIRPF dos sócios, fundadores e herdeiros" — 3 de 5
> 3. Documentos Sucessórios — "Contratos de doação e testamentos" — 0 de 2
> 4. Documentos Societários — "Atos e documentos societários das empresas do Grupo" — 0 de 6
> 5. Documentos Fiscais — "CCIR e ITR para imóveis rurais, IPTU para urbanos" — 0 de 2
> 6. Documentos dos Bens Imóveis — "Matrículas, contratos e escrituras públicas dos bens imóveis" — 0 de 1
> 7. Documentos da Atividade Rural — "Contratos e documentos da exploração agrícola e pecuária" — 0 de 1
> 8. Documentos de Locação — "Contratos de locação de imóveis urbanos do Grupo" — concluído, green
> 9. Documentos do Planejamento Tributário — "Planilhas de receitas e despesas por ano-calendário" — 0 de 2
> 10. Documentos de Governança — "Documentos de organização e estruturação do Grupo" — 0 de 1
>
> Show ALL TEN rows — do not hide any behind a "see all" button.
>
> **The 4th row is expanded**, showing a nested group: a building icon with
> "MMS PARTICIPAÇÕES LTDA" and "1 de 6" on the right, then a list of document
> rows. Each document row shows a status icon, the document name in medium weight,
> a smaller grey instruction line below it, and an action on the right. Three
> distinct states — pending (empty circle + outlined "Enviar" button with upload
> icon), under review (amber clock icon + amber text "Em análise"), approved
> (green check + green text):
> - pending — "Contrato social e alterações" / "De constituição e todas as alterações posteriores, incluindo S.A."
> - pending — "CNPJ (situação cadastral e regime tributário)" / "Atualizado, indicando o regime tributário adotado"
> - pending — "Declaração de inexistência de Simples Nacional" / "Firmada por representante do Grupo"
> - under review — "Livros societários" / "cnpj-mms.pdf · 1,4 MB · enviado em 27/07/2026" with an amber "Em análise" pill
> - approved — "Balanço / Balancete / DRE" / "balanco-2025.pdf · 2,1 MB · aprovado em 24/07/2026" with a green check
>
> Do NOT add any "obrigatório", "opcional", "prioridade alta/média/baixa" badge —
> that classification is internal and must not appear on the client screen.
>
> **Bottom section:** "Outros documentos enviados" with an outlined button
> "Anexar outros documentos".
>
> Palette: dark teal-green header (#0f3d3a), teal accents (#0d9488), amber for
> pending (#f59e0b), emerald for done (#10b981), slate greys, white cards with
> rounded-xl corners and subtle shadows. No serif fonts.

Depois de gerar a Tela A, peça no Stitch as variações:

- *"Now show the same page with the theme rows collapsed and a completed theme in green at the bottom"* (estado avançado)
- *"Now design the upload modal for a single document"* (Tela C)
- *"Now show the mobile version"*

## 6b. Avaliação do 1º mockup do Stitch (2026-07-28)

**Veredicto:** acertou a camada visual, errou o modelo funcional. Serve como referência de estilo, **não** como layout — ele reproduziu justamente o defeito que a tarefa existe para consertar.

### Rejeitar

| O que o mockup fez | Por que não serve |
|---|---|
| Mostra **94% / "Quase lá!" / "você completou sua parte"** | Desenhou o único estado que não precisa de solução. O estado real do Grupo Sebben é **0/35**, e é justamente o 0% que precisa de projeto. |
| "Temas em Aberto" contém só itens **EM REVISÃO** (já enviados) | Contradição semântica: "em aberto" deveria ser o que falta o cliente mandar. **Não existe um único item pendente na tela** — é o dashboard-do-passado de novo. |
| **Nenhum botão de enviar, nenhuma dropzone** | A tela existe para o cliente enviar documento. Não há como agir. |
| Temas inventados ("Contratos Sociais Consolidados", "Alvarás de Funcionamento", "Certidões Negativas Estaduais") | Não são as 10 temáticas OSG e misturam nível de temática com nível de documento. Perde a taxonomia. |
| Zero nível de entidade e zero instrução por documento | Perde os dois níveis que nos diferenciam do DocBox (entidade nominal + `nota`). |
| "Previsão: 2 dias úteis" / "Previsão: Hoje" | **Campo inventado.** Não temos SLA de análise. |
| Sidebar de navegação + top nav + bottom nav | Navegação triplicada, e a tela hoje é uma **aba** dentro de `ClienteDashboard` — adotar o shell é reestruturar o roteamento de `/cliente`, não mexer na aba. |
| Sem busca, sem filtros | A busca atual (pessoa/imóvel/documento) é funcionalidade real; com 35 itens em 8 entidades ela é essencial. |

### Aproveitar

1. **Hero com narrativa, não só número.** Eyebrow "STATUS DO PROCESSO" + headline grande + parágrafo em linguagem humana. Nosso `0/35 recebidos · 0%` é seco. Adotar a estrutura, mas com a mensagem calibrada por faixa (0% = "vamos começar por aqui", meio = "faltam X", 100% = "sua parte está completa") e **sem** hardcodar o estado quase-pronto.
2. **Duas seções com peso visual diferente:** trabalho aberto em cards grandes, concluídos em linhas finas colapsadas com "Ver todos". Melhor que a nossa ideia de só "mandar as concluídas pro fim".
3. **Sistema tipográfico:** eyebrow (11px, `letter-spacing: .24em`, uppercase) → headline → body. Mais sofisticado que o nosso `text-sm font-semibold` chapado.
4. **O traço de 32px** sob os títulos de seção (`.osg-traco`) — detalhe de marca barato e bonito.
5. **Bottom nav no mobile** em vez de abas no topo. O cliente abre isso no celular; alcance do polegar importa.
6. **Frase de status por item** ("nossa equipe jurídica está validando as cláusulas de sucessão"). O campo é inventado, **mas revela uma lacuna real**: um "Em análise" pelado é pior que uma linha dizendo o que está acontecendo. A coluna `observacao` já existe em `checklist_cliente_item` e já vai carregar o motivo de recusa (T9) — pode carregar também a nota de análise.
7. **Entrada escalonada dos cards** (stagger) — mesmo espírito da barra animada que já temos.

### Sobre a paleta: não é rebrand, é o nosso `.osg-theme`

O Stitch usou os nomes dos nossos próprios tokens — `osg-moss`, `osg-canvas`, `osg-100/200/300`, `osg-card` — que **já existem em `src/index.css`** (linhas 92-98, 159). `Work Sans` também já é fonte do app. Mas:

- **os valores estão errados:** o mockup usa `osg-moss: #286a47`; o nosso é `--osg-moss: 149 66% 22%` = **#125837** (o mockup pôs o valor certo em `primary-container`). **Pegar os hexes do `index.css`, nunca do mockup.**
- **`.osg-theme` hoje é aplicado só pelo `OsgLayout`**, ou seja na área **interna** `/equipe/osg`. O `/cliente` usa o tema teal padrão com canvas `hsl(210 20% 98%)`.

Logo, vestir a Área do Cliente com a paleta OSG é **decisão de marca** (DEC-08), não detalhe de implementação. É defensável — este cliente é cliente da OSG —, mas tem que valer para as quatro abas (Chamados, Projetos, Documentos, Dashboards) ou a área fica visualmente rachada.

### Como re-prompt

O prompt da seção 6 já pedia estados pendentes, aninhamento por entidade, instrução por documento e botão "Enviar", e o Stitch ignorou. Ao repetir, fixar duas âncoras no início do prompt: **"the client has sent NOTHING yet — 0 of 35 documents"** e **"every pending document row MUST have an upload button"**.

## 6c. Avaliação do 2º mockup do Stitch (2026-07-28)

**Veredicto: aprovado como base de layout.** A hierarquia de 3 níveis apareceu inteira, o estado vazio real (0/35) foi respeitado e existe ação em cada linha. É disto que se faz o T3.

### O que acertou

Estado real `0/35` em vez do "quase pronto" · framing de pedido ("A PSA solicitou estes documentos" + nome do projeto) · faixa "Comece por aqui" com FOCO AGORA, borda âmbar e botão · busca preservada · filtros em pílula · accordion de temática com título + descrição + `0 de N` + barra + chevron · **subgrupo por entidade nominal** (MMS PARTICIPAÇÕES LTDA, `0 de 6`) · **linha de documento com nome + instrução + botão Enviar** · "Ver outros 3 documentos desta empresa" (revelação progressiva) · `osg-moss: #125837` **agora com o valor certo** do `index.css` · bottom nav no mobile · eyebrow + `osg-pill`.

### Corrigir antes de virar código

| # | Problema | Correção |
|---|---|---|
| 1 | **Uma temática renderizada como desabilitada** — "Patrimônio Imobiliário" com `opacity-60` e `cursor-not-allowed` | Nada no nosso modelo desabilita temática. Toda temática é acionável. E o nome está inventado: o nosso é **"Imóveis: matrículas e escrituras"**. |
| 2 | **Barra de progresso invisível** — `bg-osg-200` sobre `bg-osg-100` (bege sobre bege) e a 0% não há nada para ver | Manter a nossa faixa de cor animada (laranja → âmbar → lima → esmeralda). Ela comunica "quão cheio" pelo matiz, o que a barra bege não faz. |
| 3 | **Só 5 das 10 temáticas na tela**, resto atrás de "Ver todos os 10 temas" | Mostrar as 10 colapsadas. São linhas finas, e esconder metade esconde o **tamanho do trabalho** — o cliente precisa disso para se planejar. O DocBox mostra tudo. |
| 4 | **Círculo de pendente quase invisível** (`border-osg-100` sobre branco) | Contraste suficiente para ler como estado, não como enfeite. |
| 5 | **E-mail no cabeçalho é da PSA** (`suporte@psa.adv.br`) | O cabeçalho identifica **o cliente logado** (hoje: `automacao@psaconsultores.com.br`), não a PSA. E o domínio é `psaconsultores.com.br`. |

### Ainda não desenhado — pedir na próxima iteração

1. **Os outros estados do documento.** Todas as linhas estão pendentes. Falta: **recebido** (arquivo, tamanho, data, quem enviou — dado que já temos), **em análise** e **aprovado** (T9). O v1 mostrou só enviado, o v2 só pendente; precisa de **uma linha de cada estado na mesma tela** para saber se o desenho aguenta.
2. **Prazo.** Não apareceu em lugar nenhum, apesar de estar no prompt. É o único sinal legítimo de urgência (T8) e sustenta o critério do "Comece por aqui".
3. **O caso difícil: temática com muitas entidades.** "Documentos pessoais da família — 0 de 15" expande em **5 pessoas × 3 documentos**. É o layout mais difícil da tela e o único que o mockup não testou (ele só mostrou 1 entidade). Hoje resolvemos com carrossel + "Ver todos"; pedir explicitamente esse caso.
4. **Seção "Outros documentos enviados"** com o botão "Anexar outros documentos" — existe hoje (`MeusDocumentosConteudo.tsx:496`) e sumiu do mockup. Implementar sem ela é **regressão**.

### ⚠️ O maior problema: nomenclatura inventada

Apontado pela Patrícia. O mockup trocou **praticamente todo** termo por um sinônimo novo — e parte
disso veio do próprio plano, que propunha rótulos "mais amigáveis". Corrigido na seção 4:
**usar o nome que o sistema já usa.**

| No mockup | O sistema usa | Fonte |
|---|---|---|
| "PSA Documents" (v1) | **Área do Cliente** | `ClienteDashboard.tsx:134` |
| "Temas em Aberto" / "10 temas solicitados" / "CHECKLIST EM ABERTO" | **Documentos solicitados** | `MeusDocumentosConteudo.tsx:393` |
| "Foco Agora" | **Comece por aqui** (novo, definido no plano) | seção 5 |
| "Documentos pessoais da família" | **Documentos Pessoais** | `categoria_docbox` |
| "Imposto de Renda (DIRPF)" | **DIRPF** | `categoria_docbox` |
| "Doações e testamentos" | **Documentos Sucessórios** | `categoria_docbox` |
| "Empresas do grupo (societário)" | **Documentos Societários** | `categoria_docbox` |
| "Patrimônio Imobiliário" · "Escrituras e certidões de ônus" | **Documentos dos Bens Imóveis** · "Matrículas, contratos de compra e venda e escrituras públicas dos bens imóveis do Grupo" | `categoria_docbox` + Modelos DocBox |
| filtro "Enviados" | **Recebidos** — o contador da tela já diz "0/35 **recebidos**" | `:395` |
| "EM REVISÃO" (v1) | **Em análise** (valor do enum no T9) | T9 |
| "suporte@psa.adv.br" | e-mail do **cliente logado**; domínio `psaconsultores.com.br` | `ClienteDashboard` |
| *(ausente)* | rótulos de seção de entidade: **Pessoas Físicas · Pessoas Jurídicas · Imóveis Rurais · Imóveis Urbanos · Bens e Direitos** | `ENTIDADE_SECAO`, `:60-67` |

**Termos que o mockup acertou e devem ficar exatamente assim:** "0/35 recebidos" · "Enviar" ·
"Buscar pessoa, imóvel ou documento…" · "Concluído" · "Ver todos" · o nome da entidade em caixa
alta (MMS PARTICIPAÇÕES LTDA) · "Matrícula 9.617 (Lucas do Rio Verde/MT)".

**Vocabulário de estado — usar só estes:**

| Estado | Rótulo na tela | Origem |
|---|---|---|
| pendente | "N a enviar" (selo) · botão **Enviar** | `:159`, `:619` |
| recebido | **Recebido** + arquivo, tamanho, data, "enviado por X" | `:592-599` |
| temática 100% | **Concluído** | `:154` |
| em análise (T9) | **Em análise** | enum `em_analise` |
| aprovado (T9) | **Aprovado** | enum `aprovado` |

Nada de "Em revisão", "Aguardando revisão", "Foco agora", "Histórico" ou "Tema".

### Detalhes para quem implementar

- **Ícones:** o mockup usa Material Symbols; o app usa **lucide-react**. Mapear (`group`→`Users`, `description`→`FileText`, `domain`→`Building2`, `home_work`→`Landmark`, `upload`→`Upload`, `expand_more`→`ChevronDown`). **Não** adicionar uma segunda biblioteca de ícones.
- **Semântica/acessibilidade:** os accordions do mockup são `<div class="cursor-pointer">` sem `aria-expanded` e sem foco por teclado. O card atual é um `<button type="button">` com `focus-visible:ring-2` (`MeusDocumentosConteudo.tsx:142`). **Não regredir isso.**
- `pb-safe` não é classe padrão do Tailwind — não faz nada sem plugin/utility (perde o inset do iOS).
- A classe `animate-osg-card-in` é referenciada mas os keyframes não vieram no v2 (ficaram no v1).
- `<link>` do Material Symbols duplicado; Tailwind via CDN é só de mockup.
- **Boa ideia para roubar:** o **FAB "Falar com Suporte"**. Não estava no plano e conecta dois módulos que já existem — abrir um **chamado** já pré-preenchido com o contexto do documento. Barato e resolve o "não entendi o que vocês querem".

## 6d. Avaliação do 3º mockup do Stitch (2026-07-28) — **layout congelado**

**Veredicto: o layout está pronto. Pare de iterar no Stitch.** O problema agora é conteúdo, e cada
nova geração reinventa conteúdo — foi o que as três rodadas mostraram. Congelar o v3 como
referência visual e **corrigir as strings à mão**.

### Resolvido no v3 — travar assim

- **Ícones lucide** (a biblioteca certa), e-mail real do cliente logado, `11/35 recebidos (31%)` com `tabular-nums`.
- **Barra com gradiente** laranja → âmbar → lima → esmeralda. Pegou a nossa faixa de cor.
- **As 10 temáticas na tela**, nenhuma escondida, nenhuma desabilitada.
- **Acessibilidade correta:** `<button type="button">` com `aria-expanded` e `focus-visible:ring-2`.
- **Os quatro estados de documento na mesma tela** — pendente (círculo + Enviar), em análise (relógio âmbar), aprovado (check esmeralda), recebido. Legível e distinguível.
- **Hierarquia de prazo** cinza → âmbar ("Prazo até") → vermelho ("Prazo expirado"), com o selo do contador virando vermelho. Lê-se instantaneamente.
- **O caso difícil resolvido:** sub-accordion por entidade (João Silva aberto `1 de 4`, Maria Silva colapsado). **Melhor que o nosso carrossel** — resolve as 5 pessoas físicas sem scroll horizontal. Adotar este padrão no T3.
- **"Outros documentos enviados"** de volta, e o FAB "Falar com Suporte".

### ⛔ O problema novo: 6 das 10 temáticas são inventadas

O *terminology lock* não pegou. Piorou em relação ao v2:

| Na tela do v3 | Existe no sistema? |
|---|---|
| 1. "Documentos pessoais da família" | ❌ rótulo antigo do plano → **Documentos Pessoais** |
| 2. "Imposto de Renda (DIRPF)" | ❌ → **DIRPF** |
| 3. "Doações e testamentos" | ❌ → **Documentos Sucessórios** |
| 4. "Empresas do grupo (societário)" | ❌ → **Documentos Societários** |
| 5. "Acordo de sócios e cotistas" | ❌ **não existe** |
| 6. "Imóveis: matrículas e escrituras" | ❌ → **Documentos dos Bens Imóveis** |
| 7. "Imóveis rurais e agronegócio / CAR, ITR e CCIR" | ❌ **não existe** (mistura Documentos Fiscais com Atividade Rural) |
| 8. "Contratos de financiamento / Dívidas e garantias reais" | ❌ **não existe na OSG** — é da família AUD (auditoria) |
| 9. "Seguros e Previdência / VGBL-PGBL" | ❌ **inventado do zero** |
| 10. "Veículos e Aeronaves" | ❌ **inventado do zero** |

**Sumiram da tela:** Documentos Fiscais · Documentos da Atividade Rural · Documentos de Locação ·
Documentos do Planejamento Tributário · Documentos de Governança.

O drift chegou ao nível do documento: "Título de Eleitor" **não está no catálogo**;
"RG ou CNH (frente e verso)" → nosso é **"RG / CNH"**; "Comprovante de residência" →
**"Comprovante de endereço"**; "Certidão de Casamento" → **"Certidão de casamento / união estável"**.

### Outros ajustes

1. **A descrição da temática foi substituída pelo prazo.** No v2 a segunda linha era a descrição ("Documentos pessoais dos fundadores, sócios, herdeiros e cônjuges"); no v3 virou "Prazo até 15/08/2026". Precisa dos **dois**: descrição (o que é a temática) + prazo. A descrição é o que informa; o prazo é o que apressa.
2. **Contadores não fecham.** Cabeçalho diz `11/35`; as temáticas somam `15+5+2+20 = 42`. E as temáticas 5-10 não têm contador nenhum, ao contrário de 1-4.
3. **Um 5º estado que não deve existir:** "Título de Eleitor" com check cinza e **sem rótulo** ("Recebido (Sem status)" no comentário do HTML). Mistura duas eras do modelo: **antes do T9** todo recebido é só "Recebido"; **depois do T9** todo recebido entra em `em_analise` e vira `aprovado`. Nunca os dois na mesma tela.
4. **Ambiguidade real que o mockup revelou:** João Silva marca `1 de 4` com 3 documentos entregues (em análise + aprovado + recebido). O contador conta **enviados** ou **aprovados**? É a **DEC-05** aparecendo no nível da entidade — a decisão vale para a barra global, o selo da temática **e** o da entidade, com a mesma regra nos três.
5. Ainda: "Foco Agora" → **Comece por aqui** · "Checklist em Aberto" → **Documentos solicitados** · filtro "Enviados" → **Recebidos**.
6. **Nomes de pessoa genéricos** ("João Silva"). Os reais são longos — "JOSÉ EDUARDO DE MACEDO SOARES JUNIOR", "CAMILA MALHEIROS DE MACEDO SOARES MIRANDOLA". O layout **não foi testado** com eles; conferir quebra de linha antes de implementar.
7. `pb-safe` continua não sendo classe do Tailwind; `animate-osg-card-in` continua referenciada sem keyframes.

### Como fechar (sem mais uma rodada de Stitch)

Cada geração reinventa o conteúdo porque o modelo trata texto como material de design. Então:

1. Tomar o HTML do v3 como referência de layout — está aprovado.
2. **Substituir à mão** os 10 títulos e descrições pela tabela da seção 4, e os nomes de documento pelo catálogo (`checklistPadrao.ts`).
3. Escolher **uma** era do modelo de estados para o mockup: se T9 estiver na Sprint 10, usar pendente/em análise/aprovado; se for para a 11, usar só pendente/recebido.
4. Refazer os contadores para fechar com o total.

O mockup não vira código de todo jeito — os textos verdadeiros vêm de `categoria_docbox` e do
catálogo em tempo de execução. O que importa é que o **layout** está resolvido.

## 7. O que colocar e o que não colocar no mockup

> Atualizado em 2026-07-28: a equipe aprovou a criação de `prazo` e do fluxo de aprovação, e a
> Patrícia esclareceu que `obrigatorio` é classificação **interna**. Escopo detalhado (T7-T9,
> com SQL e armadilhas) em `docs/sprints/sprint-10/TAREFA_area-cliente_documentos-por-tematica.md`.

| Elemento do DocBox | Situação | No mockup? |
|---|---|---|
| **Prazo ("Prazo até 31/05/2024")** | Coluna nova aprovada (T8) | **Sim** — no cabeçalho da temática e na linha do item; vencido em âmbar/vermelho |
| **"Venceu há 787 dias"** | Derivável do prazo | **Não** — número de dias em vermelho num pedido de 2 anos atrás constrange e não muda o que o cliente faz |
| **"Em análise" / "Aprovado"** | Enum + fluxo aprovados (T9) | **Sim** — relógio "em análise" × check verde "aprovado" por item. A barra de progresso conta **enviados**, não aprovados |
| **Prioridade Alta/Média/Baixa** | `obrigatorio` existe, mas é **interno**: define se aquele produto sempre exige o documento (obrigatório) ou se o funcionário da OSG pede caso a caso (opcional). Serve para **montar** a solicitação. | **Não.** Nenhum selo de obrigatoriedade nem de prioridade. Depois de estar no checklist, o documento está sendo pedido — ponto. Mostrar "opcional" convida o cliente a ignorar item que a OSG incluiu porque precisa. |
| **Solicitado em (data)** | `created_at` existe, falta expor na RPC (T7) | **Sim** — "solicitado em 16/05" no cabeçalho da temática |

**Campos internos que nunca aparecem na tela do cliente:** `obrigatorio`, `obrigatorio_default`,
`modulo` (as fases "Qualificação das Partes" etc. só **ordenam** as temáticas), `origem` e
`confidencial` (marca documento sensível; base de uma camada de segurança futura, fica intocado).

Uma coisa que **não** precisa de banco: as descrições das 10 temáticas não estão em nenhuma tabela.
Como são 10 textos fixos, o mais simples é um mapa constante no front
(`TEMATICAS` em `src/lib/clienteChecklist.ts`), alimentado pela tabela da seção 4.
