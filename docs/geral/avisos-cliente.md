# Avisos ao cliente — textos de e-mail

Os quatro textos que o cliente recebe por e-mail no ciclo de coleta de documentos, e
os campos que cada um usa. Versionados aqui para não viverem só dentro do fluxo n8n,
como acontece com os e-mails de chamado.

Tarefa **ALE-12**. Redação revisada pela Patrícia Melo em 11/08/2026. Os modelos de
WhatsApp são outro artefato, da **ALE-11**
([`whatsapp-templates.md`](whatsapp-templates.md)): mesmo conteúdo, corpo e numeração
próprios.

| # | Aviso | `notificacao_tipo` | Dispara | Detalhe | Marc. |
|---|---|---|---|---|---|
| 1 | Solicitação enviada | `solicitacao_enviada` | clique em Enviar solicitação | agregado | 9 |
| 2 | Cobrança de documento pendente | `cobranca_pendencia` | varredura diária | item a item | 8 (7 no corpo, 1 na faixa) |
| 3 | Documentação conferida e aceita | `documento_aprovado` | envio completo ou solicitação encerrada | agregado | 5 |
| 4 | Reenvio necessário | `documento_recusado` | conferência de um lote | item a item | 7 |

Canal `email` no enum `notificacao_canal`. Os demais valores de `notificacao_tipo`
são aviso interno no sino e não têm texto aqui; os e-mails de chamado são outro canal
([`notificacoes-chamados.md`](notificacoes-chamados.md)).

## Como estes textos são escritos

- Tratamento formal: `Prezado(a) Sr(a). {{1}},` na abertura, `Atenciosamente` no
  fechamento, com o nome do responsável antes da assinatura da casa.
- Primeira pessoa do plural, e **a casa é agente, na voz ativa**: `solicitamos`,
  `recebemos`, `conferimos`. Nunca `registramos`, que sugere que outro fez o pedido.
- **Vocabulário fixo, sem sinônimo**: `solicitação de documentos` é o pedido que a
  casa faz; `envio` é a ação do cliente; as contagens são `documentos solicitados`,
  `documentos pendentes`, `documentos aceitos`, `documentos a reenviar`. Trocar por
  sinônimo inverte o dono da ação.
- **A unidade é documento, nunca "item"**: item é campo de declaração. E documento não
  se **ajusta** — ele é recusado por ser de outra pessoa, de outro imóvel, por estar
  ilegível ou vencido, e a ação do cliente é **reenviar**.
- **O que a casa entrega é projeto**, nunca "trabalho" nem "processo". O objeto entra
  depois de `projeto de`, porque a preposição `de` serve aos dois gêneros.
- Seco e transacional: sem chamada para ação genérica, link encurtado ou emoji.
- **Nada que sugira interrupção técnica.** "O envio pode continuar de onde parou"
  transfere para a casa a causa de uma pendência que é do cliente.
- A direção do documento fica no verbo — `solicitamos`, `recebemos`, `conferimos`.
- **O portal se cita uma vez por texto**, no fecho, onde o endereço aparece.
- Nenhum pede resposta nem indica canal de retorno: o único destino é o portal.
- Rótulo de botão na primeira pessoa do destinatário, nunca do remetente.
- Marcadores numerados na ordem de leitura; o assunto pode ter marcador, ao contrário
  do WhatsApp. A numeração não atravessa para os modelos de WhatsApp, que renumeram.

---

## 1. Solicitação enviada

**Assunto:** `Relação de documentos disponível no portal – {{2}}`

```
Prezado(a) Sr(a). {{1}},

Já está disponível no portal do cliente a relação de documentos necessários ao seu
projeto de {{2}}, com a orientação de envio de cada documento.

São {{3}} documentos, assim distribuídos:

Pessoas físicas: {{4}}
Pessoas jurídicas: {{5}}
Bens e imóveis: {{6}}
Demais documentos: {{7}}

Pedimos, por gentileza, o envio até {{8}}.

Atenciosamente,
{{9}}
PSA Consultores
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | objeto: produtos contratados na OS da solicitação, sem repetição, vírgula entre eles e `e` antes do último |
| `{{3}}` | total de documentos solicitados |
| `{{4}}`–`{{7}}` | quantidade em cada tema, na ordem `pf`, `pj`, `bens_imoveis`, `outros`. **Tema com zero documentos: omitir a linha inteira**, em vez de imprimir `0` |
| `{{8}}` | prazo de envio, `dd/mm/aaaa` |
| `{{9}}` | nome do responsável pela solicitação |

---

## 2. Cobrança de documento pendente

**Assunto:** `Documentos pendentes – {{2}}`

**Faixa de status:** `Em aberto | Prazo vencido · Prazo {{7}} · Pendentes {{5}} de {{3}}`

```
Prezado(a) Sr(a). {{1}},

Dos {{3}} documentos solicitados em {{4}}, {{5}} segue(m) pendente(s):

{{6}}

A orientação de envio de cada documento está no portal do cliente. Pedimos, por
gentileza, o envio dos documentos em aberto.

Atenciosamente,
{{8}}
PSA Consultores
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | objeto, o mesmo do aviso 1 |
| `{{3}}` | total de documentos solicitados |
| `{{4}}` | data de envio da solicitação, `dd/mm/aaaa` |
| `{{5}}` | quantidade pendente |
| `{{6}}` | o que falta, **uma linha por documento**, com a quantidade entre parênteses e os donos separados por vírgula, `e` antes do último: `Certidão de casamento (2) — Maria Silva e João Silva`. Sem o agrupamento o e-mail passa de 300 linhas |
| `{{7}}` | prazo de envio, **só na faixa de status**, o mesmo do aviso 1 — não se recalcula a cada cobrança |
| `{{8}}` | nome do responsável pela solicitação |

**O prazo não entra no corpo, e o motivo é que a cobrança repete.** "Envie até
03/09" deixa de ser verdade no dia 4; `Prazo: 03/09/2026` é verdade sempre. O
vencimento vira valor do chip de status — `Em aberto` antes, `Prazo vencido` depois —,
que é dado e muda sem tocar no texto.

---

## 3. Documentação conferida e aceita

**Assunto:** `Documentação conferida: {{2}}`

**Faixa de status:** `Concluída · Solicitado em {{4}} · Aceitos {{3}} de {{3}}`

```
Prezado(a) Sr(a). {{1}},

Recebemos e conferimos o(s) {{3}} documento(s) solicitado(s) em {{4}}. Não há
pendências.

A relação conferida está disponível no portal do cliente. A próxima etapa é a
execução do projeto, e entraremos em contato ao concluí-la.

Agradecemos a agilidade no envio.

Atenciosamente,
{{5}}
PSA Consultores
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | objeto, o mesmo do aviso 1 |
| `{{3}}` | documentos aceitos no pedido, acumulado |
| `{{4}}` | data de envio da solicitação, `dd/mm/aaaa` |
| `{{5}}` | nome do responsável pela solicitação |

**É o aviso de fechamento, não de lote.** Sai quando o cliente enviou tudo ou quando a
solicitação é encerrada, e por isso não traz contagem de pendente nem a lista dos
aceitos, que não pedem ação. O texto **afirma completude e nomeia a etapa seguinte**, e
isso condiciona o disparo: só sai quando não houver documento pendente, seja por
recebimento, seja por dispensa. A etapa é texto fixo — o cliente pode ter um projeto
por produto contratado, e não existe campo que diga em que ponto cada um está.

---

## 4. Reenvio necessário

**Assunto:** `Documentos a reenviar – {{2}}`

**Faixa de status:** `Reenvio pendente · Solicitado em {{4}} · A reenviar {{3}}`

```
Prezado(a) Sr(a). {{1}},

Na conferência dos documentos recebidos, {{3}} precisa(m) ser reenviado(s):

{{5}}

O reenvio pode ser feito no portal do cliente. Pedimos, por gentileza, o envio até
{{6}}.

Atenciosamente,
{{7}}
PSA Consultores
```

Quando houver documento dispensado no mesmo lote, este parágrafo entra antes do
reenvio, e é omitido quando não houver:

```
Informamos ainda que {{8}} não será necessário, pois o bem está fora do escopo do
trabalho. Não é preciso nenhuma providência quanto a esse documento.
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | objeto, o mesmo do aviso 1 |
| `{{3}}` | documentos não aceitos na conferência do lote |
| `{{4}}` | data de envio da solicitação, `dd/mm/aaaa` |
| `{{5}}` | um par `nome do documento: motivo da recusa` por linha. Sem agrupamento, ao contrário do aviso 2: o motivo é de cada arquivo conferido |
| `{{6}}` | prazo de reenvio: data da conferência mais 30 dias — é outro prazo, não o do aviso 1 |
| `{{7}}` | nome do responsável pela solicitação |
| `{{8}}` | documento dispensado, de `solicitacao_item_nao_aplicavel` |

Decidido em 10/08/2026: **um aviso por lote de conferência, não por documento** —
vale também para o modelo de WhatsApp.

## Botões, na versão HTML

No HTML o marcador do portal deixa de ser URL visível e passa a ser o destino do
botão.

| Aviso | Botão |
|---|---|
| 1 | Enviar meus documentos → |
| 2 | Enviar meus documentos → |
| 3 | Ver meus documentos → |
| 4 | Reenviar meus documentos → |

## De onde vem cada campo

| Conteúdo | Origem |
|---|---|
| nome do destinatário | `destinatarios_cliente(cliente_id).nome` — o **representante com acesso ao portal** (`user_id` não nulo), e não `cliente.nome`, que é o nome do grupo |
| e-mail do destinatário | `destinatarios_cliente(cliente_id).email`, preenchido em 38 de 38 destinatários |
| quantos destinatários por cliente | uma linha por representante com acesso: hoje 23 clientes e 38 destinatários, média de 1,65 |
| objeto | `solicitacao.ordem_servico_id` → `os_produtos_contratados` → `produto_segmento.nome` |
| data de envio | `solicitacao.enviada_em` |
| prazo de envio | **decidido em 11/08/2026: 30 dias por regra**, contados de `solicitacao.enviada_em` e calculados no fluxo. Não há coluna de prazo, e o mesmo valor vale para todo cliente e produto |
| prazo de reenvio | data da conferência mais 30 dias |
| nome do responsável | `solicitacao.created_by` → nome em `profiles` |
| total de documentos solicitados | contagem de `solicitacao_item` com `status = 'ativo'` |
| quantidade por tema | a mesma contagem por `solicitacao_item.grupo` |
| quantidade pendente e o que falta | checklist da solicitação: `solicitacao_item` expandido pela `granularidade` sobre as entidades do cliente, menos o que tem arquivo vinculado ao mesmo `documento_tipo_id` e à mesma entidade, menos `solicitacao_item_nao_aplicavel` |
| documentos aceitos, contagem | o mesmo checklist, no fechamento |
| nome do documento | `documento_tipo.documento` pelo `documento_arquivo.documento_tipo_id`; na falta, `nome_original` |
| motivo da recusa | não existe: sem coluna, sem tarefa nesta sprint e sem item de backlog |
| documento dispensado | `solicitacao_item_nao_aplicavel` mais `documento_tipo.documento` |
| endereço do portal | `PUBLISHED_URL` + caminho do portal. Não há link profundo por solicitação: a coleta é renderizada dentro de `src/pages/cliente/ClienteDashboard.tsx` |
| papel do destinatário | `notificacao_envio.destinatario_papel` (`cliente \| responsavel \| gestor`) |

## Fora do escopo, declarado no card

| Item | Onde |
|---|---|
| Implementar o ato de aceitar e recusar documento | próxima sprint. `documento_arquivo.status` tem só `pendente` e `ativo`, e o upload já grava `ativo` |
| Periodicidade da varredura do aviso 2 | próxima sprint; a regra de não repetir no mesmo dia vem na ALE-1 (19/08) |
| Ligar o canal no fluxo de automação | próxima sprint |

## Dependências para o disparo

| Dependência | Dono |
|---|---|
| `solicitacao.ordem_servico_id` nulo em **6 de 10** — `gerar_solicitacao_os` só grava a OS ao criar o cabeçalho, e sem ela o objeto vai vazio | Eduardo, no gerador; ou exigência de OS na tela de envio |
| Coluna do motivo da recusa (aviso 4): sem coluna, sem tarefa e sem item de backlog. Não confundir com o motivo da falta, que a EDU-6 descartou em 09/08 | próxima sprint, junto do ato de recusar |
| Gatilho do aviso 3: o dado existe (checklist zerado ou `solicitacao.encerrada_em`), mas nenhuma tarefa liga o disparo | próxima sprint |
| Checklist da solicitação, gerado ou declarado — o `useGerarChecklistCliente` já gera por entidade, e a EDU-9 registra "não haverá cálculo de faltante". A chave por solicitação já está fixada, e os textos não mudam nos dois casos | EDU-6 e EDU-9 |
| Prazo por exceção: os 30 dias são regra, sem coluna, então não há como abrir exceção por cliente ou produto | evolução futura |

**Estado em 17/08/2026 — o que saiu desta tabela.** Duas linhas foram resolvidas:

- **O canal está ligado no fluxo**, nos dois sentidos: um workflow por canal, ativo,
  recebendo o mesmo corpo. A borda decide os destinatários de cada um — e-mail em 38
  de 38 destinatários com acesso ao portal, telefone em 8 de 38.
- **O gatilho do aviso 3 existe:** é o encerramento da solicitação, ligado no
  `encerrarSolicitacao`, com `enviada_em` como condição — encerrar um rascunho não
  dispara nada, porque um rascunho nunca chegou ao cliente. Não precisou de migração:
  `notificacao_tipo` já tinha `documento_aprovado`.

Os avisos **2 e 4 seguem sem disparo**, pelos motivos das linhas acima: o 2 depende da
fonte do pendente e da varredura periódica; o 4 depende do ato de aceitar e recusar
documento, que não existe em tela. Vale registrar por que o 4 é o mais preso dos dois:
o modelo de WhatsApp dele diz *"o motivo de cada um está no portal do cliente"* — sem a
tela, o aviso mandaria o cliente procurar algo que não está lá.
