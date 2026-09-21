# SOLICITAÇÃO DE DOCUMENTOS E CHECKLIST — AJUSTES DE CONTEÚDO E NAVEGAÇÃO

**Lista executável para implementação • Responsável: Alexandre**

**Objetivo:** ajustar o mecanismo e os textos das duas rotas do módulo Documentos para que cada
controle diga o que faz e qual será o resultado da ação, e para que a informação necessária para
decidir não dependa de passar o mouse.

**Escopo:** `/equipe/osg/work/onboarding` (Solicitação de documentos) e
`/equipe/osg/work/checklists` (Checklist de documentos). A rota Documentos do Cliente foi
auditada à parte, em
[`AUDITORIA_TIP-02_documentos-do-cliente.md`](AUDITORIA_TIP-02_documentos-do-cliente.md).

**Origem dos achados:** revisão da coordenação de 10 e 11/09/2026 (itens em aberto), treinamento
de 09/09, canal da OSG entre 09 e 18/09, e leitura das telas pela árvore de decisão de
[`geral/texto-explicativo-na-tela.md`](../../geral/texto-explicativo-na-tela.md). Cada linha traz
a origem.

---

## 1. Mecanismo — os balões que somem no toque

**O maior item, e não é de redação.** Doze controles das duas rotas explicam o que fazem por
`title` na tag — o balão nativo do navegador. Ele não aparece no toque, espera cerca de um
segundo, não tem tema e é lido de forma inconsistente por leitor de tela. O padrão em vigor
(§4) diz: explicação nova é `<Tooltip>`, nome de botão de ícone é `aria-label`, `title` fica em
`<iframe>`.

Não foram pegos pela conversão de 17/09 porque ali `title` viajava como **prop de componente**
(`<Button title=…>`), e a varredura procurava a tag nativa. O efeito na tela é o mesmo.

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Solicitação → ações do topo (4 botões) | mecanismo | `title` no `<Button>` | `ButtonTooltip` / `<Tooltip>`, mantendo o texto | O balão do navegador não aparece no toque e não tem tema. É o mecanismo que o padrão retirou de circulação |
| Checklist → Notificar pendências, Comprovante, Trazer para o checklist | mecanismo | `title` no `<Button>` | idem | Mesmo caso |
| Solicitação → **Editar** e **Remover** (linha do documento) | mecanismo | `title` no botão só de ícone — "Editar nesta solicitação", "Remover desta solicitação" | `ButtonTooltip`, que dá `aria-label` **e** balão. Os textos ficam como estão | São botões só de ícone e **hoje não têm nome acessível nenhum**. Os textos estão certos: curtos, no infinitivo e dentro do teto |
| Solicitação → **Incluir** (documento opcional) | mecanismo | `title` "Incluir nesta solicitação" | `<Tooltip>` com o mesmo texto | Este tem rótulo visível ("Incluir"), então não precisa de `aria-label` — é explicação, não nome |
| Checklist → Imprimir | mecanismo | `title` no `<Button>` | `ButtonTooltip` | Mesmo caso |

**Como implementar:** degrau 0 e degrau 4 · `ButtonTooltip` de `@/components/ui/button-tooltip`
nos botões de ícone (dá o nome acessível e o balão de uma vez) e `<Tooltip>` nos botões com texto
visível. **Origem:** tela.

### E um balão que sobra

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Rail de produtos → cada produto | Balão e nome acessível | `ButtonTooltip` repetindo o nome do produto, e `aria-label` com o mesmo nome sobre um botão que **já mostra** esse nome | Remover os dois. O botão fica com o texto visível e nada mais | Degrau 5: o balão repete palavra por palavra o que está escrito na tela, e o nome não trunca — quebra em duas linhas. O `aria-label` sobre texto visível é redundância que o próprio padrão desaconselha (§2) |

---

## 2. Solicitação de documentos — textos

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Ação "Atualizar documentos da OS" | Balão | "Verifica se novos produtos foram incluídos na OS e adiciona os documentos necessários à solicitação. **Não remove nada, e documento dispensado não volta.**" (151 caracteres) | Balão: "Verifica se novos produtos foram incluídos na OS e adiciona os documentos necessários à solicitação." · A segunda frase vai para a confirmação que o botão já abre | Passa do teto de 140 e traz **duas ideias**. A segunda é a que evita chamado — quem dispensou um documento e clica aqui não o recupera —, e informação necessária para decidir não pode depender de hover (§4, regra 7) |
| Ação "Passar para o checklist" | Balão | "Passa a classificar automaticamente o que o cliente enviar: cada documento aparece ligado à pessoa ou ao imóvel a que pertence. **Não há como voltar.**" (147 caracteres) | Cortar a última frase. Fica: "…a que pertence." (127 caracteres) | **Conferido em 18/09: a frase é duplicata.** O diálogo que este botão abre já termina com "Não há como voltar atrás." Não é realocação, é repetição — e é ela que estoura o teto |
| Abaixo de "Documentos solicitados" | Texto de apoio | "Cada alteração é **salva na hora** e vale apenas para esta solicitação — o catálogo de documentos não muda. **O cliente só vê a lista depois que ela for enviada.**" | "Cada alteração é salva automaticamente e vale apenas para esta solicitação. O catálogo de documentos não será alterado." · A última frase passa a aparecer **só em rascunho** | Redação definida pela coordenação em 10/09/2026. E a última frase **mente depois do envio**: ela continua na tela quando o cliente já está vendo a lista. A coordenação apontou isso em 11/09. A informação em si importa — a reunião de 09/09 mostrou que o medo de "estragar o catálogo" existe, e a frase precisou ser dita **duas vezes** no treinamento |
| Rail de produtos | Mensagem contextual | (não existe) | "Só aparecem aqui os produtos que já têm projeto criado. Abra o projeto dos demais para que os documentos deles entrem na solicitação." | Dúvida levantada no canal em 09/09/2026: *"por que ele não vem todos os produtos selecionados lá em cima, só vem planejamento tributário"*. A tela mostra "Produtos contratados" incompleto e não diz por quê. **Depende de dado que o componente ainda não recebe** — ver a nota de execução |
| Ação "Finalizar solicitação" | Balão | "Abre a confirmação de encerramento e a escolha de quem é avisado. Finalizar é definitivo: não há como reabrir." | Manter o texto; só trocar o mecanismo (item 1) | Está dentro do teto, tem uma ideia por frase e a segunda é consequência da ação, não instrução separada |

**Origem:** coordenação (10/09) nas linhas 3 e 4; tela nas demais.

---

## 3. Checklist de documentos

A revisão da coordenação de 11/09 foi implementada quase inteira — ver a seção 4. O que a
leitura da tela ainda encontra:

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Botão "Notificar pendências" | Balão, estado sem pendência | "Não há documento pendente nem recusado: nada a notificar ao cliente." | Manter o texto; trocar o mecanismo (item 1) | O texto está certo: explica **por que** o botão está desligado, que é o melhor uso de balão em controle inativo |
| Botão "Comprovante" | Balão | "Gera um único PDF com a relação dos N arquivos recebidos nesta solicitação, com data e quem enviou cada um. Não envia nada ao cliente." (135 caracteres) | Manter o texto; trocar o mecanismo | Conferido em 18/09: **dentro do teto**. A segunda frase existe porque a tela inteira ao redor envia coisas ao cliente, e a primeira responde a uma dúvida da coordenação de 11/09 sobre o botão ser singular. É desambiguação, não excesso |

**Origem:** tela.

---

## 4. Já implementado — não reabrir

Levantado contra o código em 18/09/2026. Está aqui para a próxima revisão não repetir o pedido.

| Item da revisão de 10–11/09 | Estado |
|---|---|
| "A solicitação permanecerá aberta até ser finalizada" (nas **duas** faixas) | ✅ |
| Card lateral → "Lista de documentos solicitados" | ✅ |
| "Todos os documentos solicitados, incluindo os adicionados manualmente" | ✅ |
| Botão → "Atualizar documentos da OS" | ✅ |
| Nota "Um mesmo documento pode ser solicitado para mais de um produto…" | ✅ — e é a resposta à dúvida levantada no canal em 10/09 |
| Título do modal → "Enviar solicitação de documentos" | ✅ |
| Subtítulo do modal → "Confira os documentos, o destinatário e os canais de envio…" | ✅ |
| "O que o cliente vai ver" → "Documentos da solicitação" | ✅ |
| Botão → "Notificar pendências" | ✅ |
| Subtítulo do Checklist → "Acompanhe os documentos solicitados, recebidos e pendentes de cada cliente." | ✅ |
| Alerta da fase de classificação, em linguagem de usuário | ✅ |
| Tooltip do filtro "Fora da solicitação" | ✅ — resolvido melhor: o rótulo virou **"Não solicitados"**, com balão nomeando as duas origens. A coordenação havia lido "Fora da solicitação" como o contrário do que era |
| "Lista de solicitação cons…" cortando | ✅ — o nome passou a quebrar em duas linhas em vez de truncar |
| "Pendentes" com dois nomes na mesma tela | ✅ |

**Três divergências conscientes da especificação**, todas validadas com a coordenação e com o
motivo escrito no código:

- **"Solicitação de documentos"**, e não "Solicitação Inicial" — o termo já estava fechado no
  glossário do fluxo.
- **Subtítulo sem a palavra "iniciais"** — era eco do nome que a especificação propunha, e o nome
  não mudou.
- **"Checklist de documentos"** no singular — a segunda aba saiu em 10/09, auditada, e sobrou um
  checklist. A rota segue no plural porque é endereço, não rótulo.
- **O balão do "Adicionar documento"** diz "Adiciona um documento a esta solicitação, escolhido do
  catálogo ou criado à mão", e não "Adicione manualmente um documento à solicitação atual" como a
  revisão de 10/09 propôs. O motivo está escrito no código: o modal oferece **duas** entradas, e
  "manualmente" nomeia a exceção, escondendo o caminho comum. Conferido em 18/09 — não é pendência.

**Duas funcionalidades pedidas não existem** e ficam fora desta lista: **Copiar link** e
**Reenviar notificação**. Viram tarefa própria, não ajuste de texto.

---

## 5. Fora do escopo desta lista

- O aviso do sino de documento recebido não abre nada. Está certo que abrisse, mas o cliente
  selecionado vive em memória, sem parâmetro de URL, e fazer o link funcionar mudaria como as 16
  telas do OSG Work escolhem cliente. **Tarefa própria, com decisão de desenho.**
- A mensagem "não possui destinatário cadastrado", na Solicitação, diz o que aconteceu e não diz
  o que fazer. A chave que resolve já foi renomeada para "Acesso à plataforma" em 16/09; falta a
  mensagem apontar para lá. **É do cadastro do cliente, não destas rotas.**

---

## 6. Execução — passo a passo

Estado do código em **18/09/2026**. Os números de linha envelhecem; a string é a âncora. Nenhum
texto abaixo precisa ser decidido: todos já estão escritos.

### Bloco A — mecanismo (12 controles)

Em cada um: **envolver o `<Button>` com `<ButtonTooltip text={…}>` e apagar o `title`**, movendo o
texto do `title` para o `text` do balão. Onde o botão é **só de ícone**, acrescentar também
`aria-label` com o mesmo texto curto indicado.

| Arquivo | Linha | Texto que vai para o balão | `aria-label` |
|---|---|---|---|
| `onboarding/SolicitacaoAcoes.tsx` | ~103 | "Cria a lista de documentos a partir dos produtos contratados na OS." / (ver bloco B para o outro estado) | — (tem rótulo) |
| `onboarding/SolicitacaoAcoes.tsx` | ~123 | "Abre a escolha de destinatários e canais. O envio acontece uma vez: depois dele, cobrar o que faltar é pelo checklist." | — |
| `onboarding/SolicitacaoAcoes.tsx` | ~136 | ver bloco B | — |
| `onboarding/SolicitacaoAcoes.tsx` | ~154 | "Abre a confirmação de encerramento e a escolha de quem é avisado. Finalizar é definitivo: não há como reabrir." | — |
| `onboarding/DocumentGroups.tsx` | ~150 | "Editar nesta solicitação" | **"Editar nesta solicitação"** |
| `onboarding/DocumentGroups.tsx` | ~159 | "Remover desta solicitação" | **"Remover desta solicitação"** |
| `onboarding/DocumentGroups.tsx` | ~204 | "Incluir nesta solicitação" | — (tem rótulo "Incluir") |
| `onboarding/OnboardingWorkspace.tsx` | ~265 | "Adiciona um documento a esta solicitação, escolhido do catálogo ou criado à mão." | — |
| `checklists/BotaoAvisarCliente.tsx` | ~56 | manter a expressão condicional que já existe, inteira | — |
| `checklists/BotaoComprovante.tsx` | ~92 | manter o template literal que já existe, inteiro | — |
| `checklists/BotaoTrazerParaChecklist.tsx` | ~63 | ver bloco B (é o mesmo texto do `SolicitacaoAcoes` ~136) | — |
| `pages/equipe/osg/ChecklistsDocumentos.tsx` | ~48 | "Abre a janela de impressão do navegador com o checklist desta tela." | — |

**Mais um, de sinal trocado** — `onboarding/ProdutoRail.tsx` ~79-80: **apagar** o
`<ButtonTooltip>` e o `aria-label={produto.name}`, deixando só o `<button>` com o nome visível.

> ⚠️ **`ButtonTooltip` exige `TooltipProvider` no ambiente de teste.** O provider existe na raiz do
> app (`App.tsx`), mas os testes montam o componente isolado. Cinco suítes já falham por isso desde
> a conversão de 17/09. Se um teste destas rotas quebrar com *"`Tooltip` must be used within
> `TooltipProvider`"*, **envolva o `render` do teste com `<TooltipProvider>`** — não reverta a
> conversão.

### Bloco B — os dois cortes

1. `onboarding/SolicitacaoAcoes.tsx` ~105: apagar a segunda frase do balão de "Atualizar
   documentos da OS". Fica exatamente: `'Verifica se novos produtos foram incluídos na OS e
   adiciona os documentos necessários à solicitação.'`
2. `onboarding/SolicitacaoAcoes.tsx` ~136 **e** `checklists/BotaoTrazerParaChecklist.tsx` ~63:
   apagar `'Não há como voltar.'`. Fica: `'Passa a classificar automaticamente o que o cliente
   enviar: cada documento aparece ligado à pessoa ou ao imóvel a que pertence.'`
   **Não mover para lugar nenhum** — `DialogoPassarParaChecklist.tsx` já termina com "Não há como
   voltar atrás."

### Bloco C — a realocação

`onboarding/SolicitacaoAcoes.tsx`, no `AlertDialogDescription` de "Atualizar uma solicitação já
enviada?" (~166). Hoje termina com *"Nada do que já está pedido é alterado."* Acrescentar, como
frase final:

> **Documento dispensado não volta.**

É a informação que saiu do balão no bloco B, e é a que evita chamado.

### Bloco D — os dois textos de apoio

1. `onboarding/OnboardingWorkspace.tsx` ~273-280. Trocar o texto por, **literal**:
   > Cada alteração é salva automaticamente e vale apenas para esta solicitação. O catálogo de
   > documentos não será alterado.

   E a frase *"O cliente só vê a lista depois que ela for enviada."* passa a ser renderizada
   **apenas quando o status é rascunho**. O componente já recebe `somenteLeitura`; o estado do
   envio vem de `solicitacao.status` em `Onboarding.tsx` — se não estiver disponível aqui, passe
   como prop, sem inventar outra condição.

2. `onboarding/ProdutoRail.tsx`, abaixo da lista de produtos. A redação definida para este caso é:
   > Só aparecem aqui os produtos que já têm projeto criado. Abra o projeto dos demais para que os
   > documentos deles entrem na solicitação.

   > ⚠️ **Não implementar ainda; requer decisão de escopo.** A investigação do código em
   > 18/09 mostrou que o rail atual **não** é recortado por projeto criado: `useOnboarding` não
   > consulta `org_projects`, e `montarOrdensDaArea` mostra só produtos do cluster da área. Logo,
   > `produtos.length < total de produtos da OS` hoje significa “há produto de outra área”, não
   > “falta projeto”. Renderizar a frase acima por essa comparação mentiria.
   >
   > Para esta frase ser verdadeira, a regra de exibição do rail precisa mudar: consultar
   > `org_projects` por `ordem_servico_id` e `produto_segmento_id`, calcular os produtos da OS sem
   > projeto correspondente e decidir se o rail passa a ocultá-los. Isso altera o comportamento
   > consolidado e explicitamente documentado em `src/lib/ordensDaArea.ts` (ele mostra produtos da
   > área, não produtos com projeto); não é ajuste de texto. **Registrar como pendência desta
   > lista e abrir decisão/tarefa própria.** Os blocos A a D continuam executáveis sem este item.

### Bloco E — a catraca

`src/lib/textoDeAjuda.test.ts`. A asserção de `title=` só olha **tag nativa**; os doze controles
acima passam `title` como **prop de componente** e não eram medidos. Acrescentar uma asserção irmã
que procure `title=` em `<Button …>` **somente nos sete arquivos desta lista** e congele esse
recorte em **zero** após a conversão:

```text
src/components/equipe/osg/onboarding/SolicitacaoAcoes.tsx
src/components/equipe/osg/onboarding/DocumentGroups.tsx
src/components/equipe/osg/onboarding/OnboardingWorkspace.tsx
src/components/equipe/osg/checklists/BotaoAvisarCliente.tsx
src/components/equipe/osg/checklists/BotaoComprovante.tsx
src/components/equipe/osg/checklists/BotaoTrazerParaChecklist.tsx
src/pages/equipe/osg/ChecklistsDocumentos.tsx
```

Os sete arquivos concentram os doze controles. O `<Button>` de `@/components/ui/button` repassa a
prop ao `<button>` do DOM. **Não varrer todo o
repositório nem congelar o total global em zero:** há vários `<Button title>` legados fora desta
TIP-02, por exemplo em Controle de Matrículas e Órgãos de Governança. Convertê-los é outra frente;
zerar a conta global aqui confundiria uma dívida existente com regressão desta tarefa.

Use a mesma mensagem de falha das outras catracas: o que sobe é regressão e o que desce é dívida
paga. Sem este bloco, os doze voltam pela mesma porta por onde saíram.

### Validação, ao fim

```
bunx tsc --build --noEmit
bunx eslint <arquivos tocados>
bunx vitest run src/lib src/components/equipe/osg/onboarding src/components/equipe/osg/checklists
```

As 32 falhas de `documentos/classificar/` e a de `title=` em `GradeDoProtocolo.tsx` são
**anteriores** e de outra frente — não tente consertá-las aqui.

---

## Regra de consistência para próximos ajustes

O balão explica o que é complementar; o que a pessoa precisa para **decidir** fica visível na
tela — e quando a ação é irreversível, fica na confirmação. Duas ideias num texto são dois
textos, e quase sempre dois recursos diferentes. Nenhum controle novo nasce com `title`: botão de
ícone usa `aria-label` mais balão, e explicação usa `<Tooltip>`.
