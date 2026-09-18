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
| Solicitação → Editar, Remover, Incluir (linha do documento) | mecanismo | `title` no botão de ícone | `ButtonTooltip`, que dá `aria-label` **e** balão | São botões só de ícone: hoje não têm nome acessível nenhum |
| Checklist → Imprimir | mecanismo | `title` no `<Button>` | `ButtonTooltip` | Mesmo caso |

**Como implementar:** degrau 0 e degrau 4 · `ButtonTooltip` de `@/components/ui/button-tooltip`
nos botões de ícone (dá o nome acessível e o balão de uma vez) e `<Tooltip>` nos botões com texto
visível. **Origem:** tela.

---

## 2. Solicitação de documentos — textos

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Ação "Atualizar documentos da OS" | Balão | "Verifica se novos produtos foram incluídos na OS e adiciona os documentos necessários à solicitação. **Não remove nada, e documento dispensado não volta.**" (151 caracteres) | Balão: "Verifica se novos produtos foram incluídos na OS e adiciona os documentos necessários à solicitação." · A segunda frase vai para a confirmação que o botão já abre | Passa do teto de 140 e traz **duas ideias**. A segunda é a que evita chamado — quem dispensou um documento e clica aqui não o recupera —, e informação necessária para decidir não pode depender de hover (§4, regra 7) |
| Ação "Passar para o checklist" | Balão | "Passa a classificar automaticamente o que o cliente enviar: cada documento aparece ligado à pessoa ou ao imóvel a que pertence. **Não há como voltar.**" (147 caracteres) | Balão: até a palavra "pertence." · "Não há como voltar" vai para o diálogo de confirmação | Mesmo caso: teto estourado e duas ideias, sendo a segunda irreversível — o lugar dela é a confirmação, onde a pessoa decide |
| Cabeçalho da lista de documentos | Texto de apoio | (não existe) | "Cada alteração é salva automaticamente e vale apenas para esta solicitação. O catálogo de documentos não será alterado." | Pedido da coordenação em 10/09/2026 e ainda não implementado. É a única informação da tela que impede o medo de "estragar o padrão" ao editar a descrição de um documento — e a reunião de 09/09 mostrou que esse medo existe: a frase precisou ser dita **duas vezes** no treinamento |
| Ação "Adicionar documento" | Balão | "Adiciona um documento a…" | "Adicione manualmente um documento à solicitação atual." | Redação definida pela coordenação em 10/09/2026 |
| Ação "Finalizar solicitação" | Balão | "Abre a confirmação de encerramento e a escolha de quem é avisado. Finalizar é definitivo: não há como reabrir." | Manter o texto; só trocar o mecanismo (item 1) | Está dentro do teto, tem uma ideia por frase e a segunda é consequência da ação, não instrução separada |

**Origem:** coordenação (10/09) nas linhas 3 e 4; tela nas demais.

---

## 3. Checklist de documentos

A revisão da coordenação de 11/09 foi implementada quase inteira — ver a seção 4. O que a
leitura da tela ainda encontra:

| Local | Campo | Texto atual | Ajustar para | Motivo do ajuste |
|---|---|---|---|---|
| Botão "Notificar pendências" | Balão, estado sem pendência | "Não há documento pendente nem recusado: nada a notificar ao cliente." | Manter o texto; trocar o mecanismo (item 1) | O texto está certo: explica **por que** o botão está desligado, que é o melhor uso de balão em controle inativo |
| Botão "Comprovante" | Balão | "Gera um único PDF com a relação dos N arquivos… **Não envia nada ao cliente.**" | Manter; trocar o mecanismo | A segunda frase existe porque a tela inteira ao redor envia coisas ao cliente. É desambiguação, não excesso |

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

## Regra de consistência para próximos ajustes

O balão explica o que é complementar; o que a pessoa precisa para **decidir** fica visível na
tela — e quando a ação é irreversível, fica na confirmação. Duas ideias num texto são dois
textos, e quase sempre dois recursos diferentes. Nenhum controle novo nasce com `title`: botão de
ícone usa `aria-label` mais balão, e explicação usa `<Tooltip>`.
