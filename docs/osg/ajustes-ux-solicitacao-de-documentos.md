# Ajustes de UX — Solicitação de documentos e Cadastro por Documento

**Aprovado pela Patrícia em 21/09/2026. Falta executar.** Origem: teste de uso dela na
mesma data, percorrendo o módulo como quem entrou na OSG naquele dia, mais o levantamento
do analista que trouxe a distinção entre **finalizada** e **cancelada** (§0).

| # | Tela | Arquivo raiz |
|---|---|---|
| 1 | `/equipe/osg/work/onboarding` | `src/pages/equipe/osg/Onboarding.tsx` |
| 2 | `/equipe/osg/work/onboarding/cadastro` | `src/pages/equipe/osg/CadastroPorDocumento.tsx` |

Proposta visual, 8 artboards: https://claude.ai/artifact/J3Mh8NDjEPMGZMwinKcEbB —
artefato privado; precisa ser compartilhado pelo menu *Share* antes de ir para o time.
Os dois casos de encerrada estão desenhados.

Cada item tem **problema · ajuste · onde mexer · aceite**. O aceite é observável: descreve
o que se vê na tela, não o que se escreveu no código. Diagnóstico, evidência e
justificativa de padrão estão no apêndice.

---

## 0. A correção de premissa: `encerrada` são duas coisas

O plano anterior tratava todo `encerrada` como "finalizada". Não é. `moverStatus` **aceita
encerrar a partir de `rascunho`**, e rascunho nunca chegou ao cliente — o próprio código já
sabe disso e usa `enviada_em` como guarda em três lugares (apêndice A). O que não sabe é a
interface: hoje ela diz, para um rascunho descartado, que "o cliente continua vendo os
arquivos que enviou". **Isso é falso, e é a razão de esta seção existir.**

> **Finalizada** = a solicitação chegou ao cliente e terminou (`enviada_em` preenchido).
> **Cancelada** = rascunho encerrado sem nunca ter sido enviado (`enviada_em` nulo).

É **estado derivado, não valor novo de enum**. O banco continua com `encerrada`; quem
separa os dois é uma função pura na camada de domínio. Nada de migration.

---

## Decisões fixadas

Não são discussão aberta. Quem executar segue estas dez linhas:

1. O selo de status usa **`src/lib/solicitacaoStatusColors.ts`**, no mesmo formato dos
   seis mapas que já existem em `src/lib/*StatusColors.ts`.
2. O mapeamento é **`rascunho → fila` · `enviada → espera` · `em_checklist → andamento` ·
   `finalizada → neutro` · `cancelada → neutro`**.
3. **Não existe tooltip no botão "Enviar solicitação" desabilitado.**
4. **Não existe tooltip explicando o título "Arquivos recebidos do cliente".**
5. **Permanece o tooltip do contador**, porque explica consequência.
6. **"Aberta" não é nome de status.** A palavra continua apenas na frase que a faixa já
   diz hoje — "aberta desde DD/MM".
7. **Nenhuma alteração atinge notificação, e-mail, modelo de WhatsApp, borda, banco ou
   migration.** É tudo front.
8. O rótulo do estado inicial é **"Rascunho"** (§5).
9. **`encerrada` é finalizada ou cancelada, conforme `enviada_em`** (§0). O estado é
   derivado por `estadoDaSolicitacao()`, função pura em `src/lib/solicitacao.ts`, com
   teste. O papel visual é `neutro` nos dois casos; o que muda é rótulo e conteúdo.
10. O componente novo chama-se **`SolicitacaoEncerrada.tsx`** — nome técnico, cobre os
    dois casos. A interface continua dizendo as palavras humanas, "Cancelada" ou
    "Finalizada".

E a regra geral, que já é padrão escrito da casa (`docs/geral/paleta-por-area.md`):
**verde é ação; estado sai dos papéis `--status-*`.** A âncora da área pinta cabeçalho,
botão e primeira série de gráfico — nunca papel de status.

---

## 1. Solicitação de documentos

### 1.1 Lista em zero — e são dois cenários, não um

**Problema.** Dois problemas empilhados.

*Os verdes.* Com a lista em zero e uma OS da OSG, a tela pode mostrar **até três** botões
verdes ao mesmo tempo: dois disparam a mesma mutação com rótulos diferentes ("Gerar lista
a partir da OS" no topo, "Gerar os N documentos da OS" no centro), e o terceiro, "Enviar
solicitação", está desabilitado mas continua verde. São dois quando ainda não existe linha
de solicitação, e três quando já existe um rascunho vazio.

*Os dois cenários confundidos.* "Solicitação vazia" hoje cobre duas situações diferentes —
**não existe solicitação nenhuma** para este cliente, e **existe um rascunho que ficou em
zero** (nunca gerou, ou dispensou tudo). A segunda tem histórico, a primeira não, e a tela
diz a mesma frase nas duas.

**Ajuste.**

- O botão de gerar **some do topo** enquanto a lista está vazia. Fica só o CTA central.
- "Enviar solicitação" desabilitado passa a tom neutro (`variant="outline"`).
- Abaixo do CTA central, uma linha com a origem da lista:
  `OS 2026-114 · Planejamento Sucessório, Holding Rural`.
- **Os dois cenários passam a ter título próprio:**
  - sem solicitação → *"Nenhuma solicitação para este cliente"*
  - rascunho em zero → *"Este rascunho está sem documentos"*

  O corpo e o CTA são os mesmos nos dois; o que muda é a primeira linha, que é a que
  responde "estou começando ou continuando?".

**Onde mexer.** `SolicitacaoAcoes.tsx` — o bloco `{temOrigemNaOs && (…)}` passa a exigir
`!listaVazia`, e o rótulo deixa de ser ternário: só existe "Atualizar documentos da OS".
`SolicitacaoVazia.tsx` recebe a linha da OS e passa a distinguir os dois títulos por já
existir ou não `solicitacao`.

**Aceite.**

- Abrindo um cliente com OS e lista vazia, **há exatamente um botão verde na tela**, e ele
  está no centro.
- Nenhum rótulo da tela diz "Gerar lista a partir da OS".
- "Enviar solicitação" aparece em cinza-neutro, e **passar o mouse nele não abre nada**.
- A linha abaixo do CTA nomeia a OS e os produtos de onde a lista vai sair.
- Em um cliente que nunca teve solicitação, o título diz "Nenhuma solicitação para este
  cliente". Em um rascunho que ficou em zero, diz "Este rascunho está sem documentos".

### 1.2 Cliente sem OS da OSG — a mensagem manda clicar no que não existe

**Problema.** Quando existe solicitação mas o cliente não tem OS da OSG, o corpo cai no
espaço de trabalho com a frase *"A solicitação está vazia. Gere a lista a partir da OS
pelo botão no topo, ou inclua documentos um a um."* Sem OS não há de onde gerar — e, com o
ajuste da §1.1, **o botão do topo também deixou de existir**. A frase manda fazer duas
coisas impossíveis.

**Ajuste.** A mensagem passa a dizer o que de fato resolve: *"Este cliente não tem OS da
OSG. A lista sai dos produtos contratados, então não há o que gerar — inclua os documentos
um a um, ou ajuste a OS no cadastro do cliente."*

**Onde mexer.** `OnboardingWorkspace.tsx`, no bloco `{itens.length === 0 && (…)}`.

**Aceite.**

- Num cliente sem OS da OSG, nenhuma mensagem da tela cita "o botão no topo".
- A mensagem nomeia as duas saídas que realmente existem: incluir um a um, ou ajustar a OS
  no cadastro.

### 1.3 Rascunho com a lista gerada — encerrar é **cancelar**

**Problema.** Dois problemas.

*Peso.* "Finalizar solicitação" tem o mesmo peso visual que "Atualizar documentos da OS" —
as duas em contorno —, embora uma seja rotina e a outra definitiva.

*Palavra errada.* Em rascunho, o botão diz "Finalizar solicitação" e o modal diz "Finalizar
esta solicitação?" com o texto *"a tela do cliente passa a modo leitura: os arquivos
continuam visíveis, mas ele não envia mais nenhum documento"*. **Nada disso aconteceu:** o
cliente nunca viu esta solicitação. Não se finaliza uma relação que não começou — descarta-se
um rascunho.

**Ajuste.**

- Em **rascunho**, o botão do topo é **"Cancelar solicitação"**, fantasma.
  Em **enviada** e **em checklist**, continua **"Finalizar"**, fantasma.
- O modal de cancelamento fala a língua do que está acontecendo:
  - título: **"Cancelar esta solicitação?"**
  - descrição: **"Confira o que acontece antes de confirmar."**
  - corpo: **"O cancelamento é definitivo, não há como reabrir. Esta solicitação nunca foi
    enviada, então o cliente não chegou a vê-la e nenhum aviso sai."** Seguido da contagem,
    flexionada (§1.6).
  - rodapé: **"Voltar"** como ação que não confirma, e **"Cancelar solicitação"** como a
    que confirma.
- O bloco de escolha de destinatários **não aparece** — já é o comportamento de hoje,
  guardado por `jaEnviada`, e continua.
- **"Cancelar solicitação" não recebe tooltip.** "Finalizar" mantém o dele, curto:
  *"Finalizar é definitivo: não há como reabrir."*

**Onde mexer.** `SolicitacaoAcoes.tsx` (rótulo e variante por status);
`ModalFinalizarSolicitacao.tsx` (dois conjuntos de texto, escolhidos por `jaEnviada`, e o
rótulo do rodapé). O comentário do arquivo registra que o texto atual foi aprovado pela
coordenação — **esta mudança é a aprovação nova**, de 21/09/2026, e o comentário deve
passar a dizer isso.

**Aceite.**

- Num rascunho, nenhum controle da tela usa a palavra "Finalizar".
- Numa solicitação enviada ou em checklist, nenhum controle usa "Cancelar solicitação".
- O modal aberto a partir de um rascunho **não afirma nada sobre o que o cliente vê**, e
  diz explicitamente que nenhum aviso sai.
- No rodapé desse modal não há dois botões com a palavra "Cancelar": são "Voltar" e
  "Cancelar solicitação".
- Com a lista gerada, **o único verde é "Enviar solicitação"**.
- O balão de "Finalizar" tem uma frase só; o de "Cancelar solicitação" não existe.

### 1.4 Enviada e Em checklist

**Problema.** As três faixas de estado moram dentro de `Onboarding.tsx`, que está em 420
linhas com teto de 600.

**Ajuste.** Os textos das faixas **não mudam** — são redação da Patrícia de 10/09/2026 e
continuam em vigor. As três saem para `FaixaDeEstado.tsx`, que recebe o estado derivado e
as datas. Os dois estados ganham o selo da §1.7.

**Onde mexer.** Novo `src/components/equipe/osg/onboarding/FaixaDeEstado.tsx`;
`Onboarding.tsx` passa a chamá-lo.

**Aceite.**

- As frases das três faixas continuam **palavra por palavra** as de hoje.
- `Onboarding.tsx` fica menor do que estava, e nenhum arquivo novo passa de 600 linhas.

### 1.5 Encerrada — finalizada **ou** cancelada

**Problema.** Dois, e o segundo é o grave.

*Superfície.* A solicitação encerrada renderiza o mesmo espaço de trabalho do rascunho —
card branco por gaveta, ícone verde, seta de expandir. O `somenteLeitura` esconde as ações
de linha, mas não muda a superfície, e o único sinal de travamento é uma frase numa faixa
da mesma cor dos avisos genéricos.

*Conteúdo falso.* A faixa afirma que "o cliente continua vendo os arquivos que enviou".
Num rascunho cancelado **não houve envio, não houve arquivo e não houve cliente vendo nada**.

**Ajuste.** Um componente, dois conteúdos. O tratamento visual é o mesmo nos dois —
histórico, papel `neutro`, recolhido por padrão.

*Comum aos dois:* faixa no papel `neutro` com o cadeado num tile próprio; resumo em texto;
**um botão só**, em contorno neutro; e, ao abrir, lista **sem accordion** — seções de
leitura separadas por filete, com título, contagem e documentos em texto corrido, sob o
cabeçalho "somente consulta".

*Finalizada:* a faixa é a de hoje, palavra por palavra. O resumo diz **"N documentos
solicitados"** e o botão, **"Ver documentos solicitados"**.

*Cancelada:* a faixa passa a ser **"Esta solicitação foi cancelada em DD/MM/AAAA. Ela
nunca foi enviada, então o cliente não chegou a vê-la. Para pedir documentos, abra uma
nova solicitação pelo botão no topo."** O resumo diz **"N documentos estavam na lista"** e
o botão, **"Ver a lista"** — porque nada foi *solicitado*: no vocabulário do ciclo,
"solicitação de documentos é o pedido que a casa faz", e este pedido nunca saiu.

*Encerrada sem nenhum documento:* a frase de hoje ("Esta solicitação foi finalizada sem
nenhum documento…") ganha a variante cancelada e passa a morar no componente novo.

*O ícone é diferente nos dois, e não é enfeite.* A finalizada mantém o **cadeado**; a
cancelada usa o de **arquivar**. Motivo: nestas duas telas o cadeado é o ícone da *ação*
Finalizar — está no botão (`SolicitacaoAcoes.tsx`), no confirmar do modal
(`ModalFinalizarSolicitacao.tsx`) e na faixa de encerramento. Pôr o mesmo desenho no selo
e na faixa de uma cancelada faria ela dizer "finalizada" por associação, que é exatamente
a confusão que esta distinção existe para matar. `Archive` já significa "arquivar" na casa
(`ProcedimentoSheet.tsx`, `ScenarioList.tsx`), que é o registro certo para um rascunho
descartado.

**Onde mexer.** Novo `SolicitacaoEncerrada.tsx`; `Onboarding.tsx` deixa de renderizar
`OnboardingWorkspace` quando encerrada; funções puras novas em `src/lib/solicitacao.ts` —
`estadoDaSolicitacao(solicitacao)` e `resumoPorGrupo(itens)` —, **as duas com teste**. O
`somenteLeitura` de `OnboardingWorkspace` continua existindo e não vira código morto: ele
ainda cobre a aba aberta numa solicitação encerrada por outra pessoa enquanto isso.

**Aceite.**

- Ao abrir um cliente com solicitação encerrada, **não há nenhum card branco, nenhuma seta
  de expandir e nenhum ícone verde no corpo da página** — nos dois casos.
- Numa **cancelada**, nenhuma frase da tela afirma que o cliente viu, recebeu ou enviou
  alguma coisa, e nenhuma usa a palavra "finalizada".
- Numa **cancelada**, o resumo não usa o termo "documentos solicitados".
- Numa **finalizada**, a faixa é a frase de hoje, inalterada.
- O número de documentos e a quebra por gaveta são legíveis **sem nenhum clique**, nos dois.
- Existe **um** botão no corpo.
- Depois de clicar, a lista aparece em cinza, sem controle algum: nada nela responde a
  hover e nada é clicável.
- O único verde da tela é "Abrir nova solicitação", no topo.
- Numa finalizada, a contagem bate com a do checklist do mesmo cliente.

### 1.6 Flexão de número

**Problema.** Quatro textos da frente resolvem plural com parênteses: `documento(s)
incluído(s)`, `documento(s) da OS seguem dispensados`, `arquivo(s) dele ainda estão sem
tipo`, `São N documento(s) ainda ativos`.

**Ajuste.** Flexionar na renderização, verbo incluído — é a regra que
`docs/geral/avisos-cliente.md` já fixa para os textos ao cliente, e não há motivo para a
tela interna divergir: `São 52 documentos` / `É 1 documento`.

**Onde mexer.** `Onboarding.tsx` (duas ocorrências), `ModalFinalizarSolicitacao.tsx`,
`DialogoPassarParaChecklist.tsx`.

**Aceite.**

- Nenhum texto visível das duas telas contém `(s)`.
- Com um único documento, a frase lê "É 1 documento ainda ativo" — verbo, artigo e
  substantivo no singular.

### 1.7 Selo de estado no cabeçalho

**Problema.** Ao abrir o cliente, o estado não aparece no cabeçalho: é preciso localizar e
ler a faixa para identificá-lo — e ela sai de vista assim que a página rola.

**Ajuste.** Um selo ao lado do título, sempre visível. Cor e rótulo saem do mapa, nunca de
literal em JSX. **A chave é o estado derivado, não o enum** — é o que permite os dois
rótulos de `encerrada`:

| estado derivado | condição | rótulo | papel |
|---|---|---|---|
| rascunho | `status = 'rascunho'` | `Rascunho` | `fila` |
| enviada | `status = 'enviada'` | `Enviada em DD/MM` | `espera` |
| em checklist | `status = 'em_checklist'` | `Em checklist` | `andamento` |
| finalizada | `status = 'encerrada'` **e** `enviada_em` preenchido | `Finalizada em DD/MM` | `neutro` |
| cancelada | `status = 'encerrada'` **e** `enviada_em` nulo | `Cancelada em DD/MM` | `neutro` |

Tooltip do selo de finalizada: **"Finalizada por «nome» em DD/MM/AAAA, às HHhMM."** O de
cancelada segue a mesma forma, com o verbo trocado.

**Onde mexer.** Novo `src/lib/solicitacaoStatusColors.ts`, chaveado pelo estado derivado,
no molde de `estadoDocumentoColors.ts` (mesmo domínio, mesmo helper `papel(nome)`).
`TituloDaPagina` ganha `selo?: ReactNode`, opcional; `OsgLayout` repassa. As duas props são
aditivas — nenhuma das outras seis áreas muda.

**Aceite.**

- Ao abrir uma solicitação **enviada**, o selo usa o papel `espera`; **finalizada** e
  **cancelada**, o papel `neutro`.
- Uma solicitação encerrada **que nunca foi enviada** exibe "Cancelada em DD/MM" — nunca
  "Finalizada".
- **Nenhum verde de âncora (`--osg-moss`, `--primary`) é usado como status** em lugar
  nenhum das duas telas.
- Nenhuma classe `bg-*-100`/`text-*-700` de estoque do Tailwind pinta o selo.
- A palavra "Aberta" não aparece como rótulo de status em nenhuma tela — só dentro da
  frase "aberta desde DD/MM" da faixa.
- O cabeçalho continua cabendo na altura de hoje, com `tituloDaPagina.test.ts` passando.

---

## 2. Cadastro por Documento

**Problema.** A tela usa a metáfora interna da equipe como rótulo: "Balde do cliente" e
"N arquivos sem dono". Quem convive entende; quem chegou hoje, não.

**Ajuste.** Renomear, em `BaldePanel.tsx`:

| atual | novo |
|---|---|
| Balde do cliente | **Arquivos recebidos do cliente** |
| Carregando o balde… | **Carregando os arquivos…** |
| N arquivos sem dono | **N arquivos a classificar** |
| Nenhum arquivo sem dono com esse filtro. | **Nenhum arquivo a classificar com esse filtro.** |
| O balde está vazio: todo arquivo recebido já tem dono. | **Tudo classificado: todo arquivo recebido já está vinculado.** |

Mais **um** tooltip, no contador: *"Enquanto não forem classificados, o checklist do
cliente segue cobrando o que ele já entregou."*

**Onde mexer.** `BaldePanel.tsx`, incluindo o `aria-label` da `<section>`. Três casos de
`ClassificarDocumentos.test.tsx` casam a string exata e entram no mesmo commit.
Identificadores internos — `BaldePanel`, `classificarBalde.ts`, `filtrarBalde`,
`semDonoTotal` — **não mudam**.

**Aceite.**

- A palavra "balde" não aparece em nenhum texto visível nem em `aria-label` da tela.
- O título da coluna **não tem tooltip**.
- O contador tem tooltip, e ele fala do checklist do cliente.
- A suíte passa sem que nenhum teste tenha sido apagado.

---

## 3. Ordem de execução

| # | Fatia | Esforço |
|---|---|---|
| 1 | §2 — renomear no `BaldePanel` + 1 tooltip + 3 testes | baixo |
| 2 | §1.6 — flexão de número nos quatro textos | baixo |
| 3 | §1.1 e §1.2 — CTA único, dois títulos de vazio, mensagem do sem-OS | baixo |
| 4 | §1.3 — "Cancelar solicitação" no rascunho, textos do modal, "Voltar" | médio |
| 5 | §1.7 — `estadoDaSolicitacao()` + `solicitacaoStatusColors.ts` + selo | médio |
| 6 | §1.4 — extrair `FaixaDeEstado.tsx` | baixo |
| 7 | §1.5 — `SolicitacaoEncerrada.tsx` + `resumoPorGrupo` com teste | médio-alto |

A fatia 5 entrega `estadoDaSolicitacao()`, de que as fatias 6 e 7 dependem — as três, nessa
ordem, ou a função sai antes, sozinha. As demais são independentes. **Nenhuma toca banco.**

---

## 4. Fora do escopo, por decisão

- **Histórico de solicitações anteriores.** Responder "já pedimos documentos para este
  cliente antes?" é valioso e ficou para uma história própria: não é copy, introduz consulta
  ao histórico, regra para escolher a solicitação anterior, estado de apresentação novo e
  mudança na montagem das faixas. E precisa de refinamento antes de virar tarefa: uma faixa
  dizendo "este cliente teve 3 solicitações anteriores" abre na hora a pergunta "posso ver?"
  — se não houver navegação, a informação cria uma frustração nova. **A decisão a tomar
  junto é se será apenas informativa ou se dará acesso ao histórico.**
- **Selo na barra de cliente.** Redundante com o do título, e a barra vive no `OsgLayout`,
  compartilhada por todas as telas do OSG Work: precisaria de slot novo no `OsgWorkContext`.
- **Comportamento global do botão desabilitado.** Fica como está (apêndice C).
- **Selo no dropdown de clientes.** `SelecaoDeCliente` serve 22 telas.

## 5. O rótulo do estado inicial — fechado

**Fica "Rascunho", decisão da Patrícia em 21/09/2026.** É curto, é palavra conhecida, casa
com o enum e descreve corretamente algo que ainda não foi enviado.

As duas alternativas consideradas e por que caíram: **"Não enviada"** soa a alerta e
negação, quando o estado é normal e esperado; **"Em montagem"** pressupõe atividade em
curso, que muitas vezes não existe — a solicitação pode estar parada há semanas. Não
havendo termo já consolidado no time, não se cria vocabulário novo.

Registrado aqui para não voltar à mesa. O enum continua `rascunho`, e a relação entre nome
de tela e nome de banco segue o caso já anotado em `SolicitacaoAcoes.tsx`: a tela diz
"Finalizar" enquanto o banco diz `encerrada`.

## 6. Pendência visual — resolvida

A variante cancelada está desenhada desde 21/09/2026: artboard **"Proposta · cancelada
(nunca enviada)"**, ao lado do da finalizada recolhida. Mesmo tratamento neutro, conteúdo
trocado — "Cancelada em DD/MM", "18 documentos estavam na lista", botão "Ver a lista" — e,
para deixar o contraste explícito a quem pegar a tarefa, o artboard mostra em vermelho a
frase que a tela de hoje diria naquele lugar e por que ela é falsa.

**O canvas serve como referência visual completa.** Não há tela do plano sem desenho.

Uma coisa não está desenhada por decisão: o **modal de cancelamento**. Os textos dele estão
na §1.3, palavra por palavra, e desenhar um diálogo de confirmação que só difere do atual
no texto não acrescentaria informação — o critério de aceite da §1.3 já é verificável de
olho.

---
---

# Apêndice técnico

Não é necessário para executar. Serve para quem quiser saber por que cada linha acima é o
que é, e para não repetir a conferência.

## A. O que o código faz hoje

**Encerrar aceita sair de rascunho, e o código já sabe.** O comentário de
`ModalFinalizarSolicitacao.tsx` diz: *"O bloco de escolha só aparece se a solicitação
chegou ao cliente: encerrar aceita sair de `rascunho`, e rascunho nunca foi enviado. Ali
não é escolha, é não existir a quem avisar. A guarda vive em três lugares (aqui, no
`enviadaEm` do `encerrarSolicitacao`, e na borda)."* O `useDomainSolicitacao.ts` repete:
*"`moverStatus` aceita encerrar a partir de rascunho"*. **A distinção existe na regra de
negócio desde sempre; o que não existia era na interface.**

**E a interface mente.** O parágrafo de confirmação do modal é renderizado **fora** do
`jaEnviada` — sai igual nos dois casos, afirmando que "a tela do cliente passa a modo
leitura: os arquivos continuam visíveis". A faixa de encerramento em `Onboarding.tsx` faz o
mesmo: "o cliente continua vendo os arquivos que enviou". Num rascunho cancelado, as duas
frases descrevem algo que não aconteceu.

**Três verdes no estado vazio.** `Onboarding.tsx` renderiza `SolicitacaoVazia` no corpo e
`SolicitacaoAcoes` no topo, que com `listaVazia === true` monta o mesmo botão como
`variant="default"` e outro texto. As duas chamam `gerar()`. Com linha de rascunho já
criada entra o terceiro, "Enviar solicitação", desabilitado por `itensAtivos === 0`.

**A superfície da encerrada.** `Onboarding.tsx` passa `somenteLeitura={encerrada}` ao
`OnboardingWorkspace`, que esconde ações de linha e opcionais em `DocumentGroups` — e só.

**Nomenclatura.** `BaldePanel.tsx` traz "Balde do cliente" no `aria-label` e no `<h3>`,
"Carregando o balde…", "N arquivo(s) sem dono", "Nenhum arquivo sem dono com esse filtro."
e "O balde está vazio: todo arquivo recebido já tem dono."

## B. Os padrões que decidiram cada coisa

Conferido em 21/09/2026, antes de fechar a redação. Onde este documento divergiu, foi ele
que mudou — **nenhum documento de padrão precisou de correção**.

| padrão | fonte | o que decidiu |
|---|---|---|
| cor de botão | `src/components/ui/button.variants.ts`, `.osg-theme` em `src/index.css` | seis variantes; desabilitado a 50% da própria variante; `default` é `--primary`, que em `.osg-theme` é `--osg-moss` |
| âncora ≠ status | `docs/geral/paleta-por-area.md` | o selo **não pode** ser verde da área |
| status tem mapa | `paleta-por-area.md` + os seis mapas em `src/lib/*StatusColors.ts` | o selo nasce de um sétimo mapa, com os papéis `--status-*` |
| texto na tela | `docs/geral/texto-explicativo-na-tela.md`, em vigor desde 17/09/2026 | derrubou três tooltips |
| vocabulário do ciclo | `docs/geral/avisos-cliente.md`, redação em vigor | `Enviada` e não `Aberta`; "documentos solicitados" só quando houve pedido; flexão de número sem parênteses |

**Por que os papéis são esses.** `espera` é definido em `estadoDocumentoColors.ts` como
"parado esperando alguém de fora" — é exatamente uma solicitação enviada. `andamento` é "a
equipe está com ele na mão", que é a fase de checklist. `fila` é o que ainda não saiu.
Encerrada ficou em `neutro` e **não** em `feito` por decisão da Patrícia em 21/09: o
objetivo é comunicar histórico e consulta, não "sucesso concluído" — e vale ainda mais para
a cancelada, que não é sucesso de nada.

**Por que três tooltips caíram.** A árvore de decisão do padrão de texto tem sete regras, e
a 7ª é "informação necessária para preencher, decidir ou interpretar não depende de hover".
O motivo de um botão travado é informação para decidir, e a ficha do tooltip (degrau 4)
lista "depende do estado" em *quando não usar*; a tela já tem a mensagem no estado vazio, o
que resolve no degrau 2. O tooltip do título do balde cai no degrau 1: se melhorar o rótulo
resolve, não se acrescenta nada.

**E por que "Cancelar solicitação" também não tem, enquanto "Finalizar" tem.** A diferença
não é gosto, é o rótulo. "Cancelar" já carrega descarte na própria palavra, e o modal diz o
resto — repetir por hover cai na regra 4, "não explique o óbvio". "Finalizar" é a palavra
que **não** revela ser irreversível só de ler: a dica curta ali acrescenta o que o rótulo
esconde. Se a coordenação preferir simetria, tirar o de "Finalizar" também é coerente; o que
não é coerente é ter um em "Cancelar".

**Por que "Aberta" saiu.** No `avisos-cliente.md`, *"Solicitação em aberto"* é o aviso 4
(`solicitacao_vencida`): enviada, prazo vencido e **nada recebido**. Usar "Aberta" como
rótulo do status `enviada` faria tela e e-mail chamarem coisas diferentes pela mesma
palavra, contra a regra 6 do padrão de texto.

**Por que a cancelada não diz "documentos solicitados".** Mesma fonte: *"`solicitação de
documentos` é o pedido que a casa faz"*. Num rascunho cancelado o pedido nunca saiu, então
nada foi solicitado — dizer que foi inverteria o dono da ação, que é o defeito contra o qual
a regra de vocabulário fixo existe.

**O que foi conferido do lado das notificações, e bateu.** A contagem que a §1.5 usa é a
mesma que o `avisos-cliente.md` declara para "total de documentos solicitados" — itens de
`solicitacao_item` com `status = 'ativo'`. Os disparos continuam onde estão: aviso 1 no
clique em Enviar, aviso 3 no encerramento, e este **já** é guardado por `enviadaEm` nos três
pontos — cancelar um rascunho nunca disparou aviso, e continua não disparando.

## C. Achado transversal, registrado e não executado

**Nenhum tooltip da casa dispara em botão desabilitado.** A classe base de `buttonVariants`
(`src/components/ui/button.variants.ts`) traz `disabled:pointer-events-none` junto com
`disabled:opacity-50`; o `TooltipTrigger asChild` do `ButtonTooltip` fica sem evento de
ponteiro e o balão nunca abre — sem erro e sem log, em qualquer tela.

As mesmas duas classes explicam o "verde a 50%" que originou este documento: não é caso
particular desta tela, é o desabilitado padrão da casa em cima da variante `default`.

**Decisão da Patrícia em 21/09/2026: não mexer.** Como o motivo de um botão travado não
deve depender de tooltip, e o estado vazio já explica o que precisa acontecer, o
comportamento global do componente fica como está. Fica o registro para quando alguém
precisar dele por outro motivo.
