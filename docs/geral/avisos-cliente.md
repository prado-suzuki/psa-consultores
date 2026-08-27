# Avisos ao cliente — textos de e-mail

Os textos que o cliente recebe por e-mail no ciclo de coleta de documentos, e os
campos que cada um usa. Versionados aqui para não viverem só dentro do fluxo n8n, como
acontece com os e-mails de chamado.

Tarefas **ALE-12** (avisos 1 a 3) e **GES-04** (aviso 4). **A redação em vigor é a de
Patrícia Melo**: ela reescreveu os três primeiros por inteiro em **17/08/2026** e revisou
o quarto em **24/08/2026**. O cenário preenchido de cada um e os campos do
formulário da Meta estão em
[`avisos-cliente-validacao.md`](avisos-cliente-validacao.md). Os modelos de WhatsApp
são outro artefato, da **ALE-11**
([`whatsapp-templates.md`](whatsapp-templates.md)): mesmo conteúdo, corpo e numeração
próprios.

> **São QUATRO avisos desde 25/08/2026 — e o aviso 4 de hoje NÃO é o de antes.** Em
> 17/08 os antigos 2 (cobrança de pendente) e 4 (reenvio necessário) foram fundidos,
> caindo para três; o motivo e as consequências estão na abertura da §2. Em 25/08 entrou
> um aviso novo, **Solicitação em aberto** (GES-04), que passou a ocupar o número 4.
>
> ⚠️ **Cuidado ao ler documento ou commit antigo:** "aviso 4" antes de 17/08 significa
> reenvio necessário, e depois de 25/08 significa solicitação vencida sem nenhum
> documento. São textos sem relação. O antigo fica no fim do arquivo como registro.
>
> **Os quatro estão concluídos.** O aviso 4 é o único que ainda não foi para produção:
> faltam as quatro migrações da GES-04 e a borda `notificar`.

**Tipo e versão de cada um**, lidos da Graph API em 25/08/2026 — os quatro modelos de
WhatsApp estão APPROVED, categoria UTILITY, idioma `pt_BR`:

| # | `notificacao_tipo` no banco | `event_type` da borda | Modelo de WhatsApp | Aprovado |
|---|---|---|---|---|
| 1 | `solicitacao_enviada` | `solicitacao_enviada` | `solicitacao_enviada_v2` | 18/08/2026 |
| 2 | `cobranca_pendencia` | `situacao_documentos` | `situacao_documentos_v2` | 18/08/2026 |
| 3 | `documento_aprovado` | `documento_aprovado` | `documentacao_conferida_v1` | 18/08/2026 |
| 4 | `solicitacao_vencida` | `solicitacao_vencida` | `solicitacao_vencida_v1` | 25/08/2026 |

O e-mail não tem modelo aprovado nem versão: ele é montado por nós no nó
`Montar Avisos OSG`. A coluna do modelo está aqui só para cruzar os dois canais do mesmo
aviso sem trocar de arquivo — o detalhe de cada modelo vive em
[`whatsapp-templates.md`](whatsapp-templates.md).

| # | Aviso | `event_type` da borda | `notificacao_tipo` no banco | Dispara | Detalhe | Marc. |
|---|---|---|---|---|---|---|
| 1 | Solicitação enviada | `solicitacao_enviada` | idem | clique em Enviar solicitação | agregado | 10 |
| 2 | **Situação dos documentos** | `situacao_documentos` | `cobranca_pendencia` ¹ | **botão do analista no checklist** | item a item | 9 |
| 3 | Documentação conferida | `documento_aprovado` | idem | encerramento da solicitação | agregado | 5 |
| 4 | **Solicitação em aberto** | `solicitacao_vencida` | idem ² | **cron diário** — prazo vencido e nada recebido | sem lista | 5 |
| ~~—~~ | ~~Reenvio necessário (antigo 4)~~ | — | ~~`documento_recusado`~~ | **fundido no 2** | — | — |

¹ O valor do enum continua `cobranca_pendencia`, e o `event_type` da API é
`situacao_documentos`. A diferença é deliberada: acrescentar valor ao enum
`notificacao_tipo` é migração, e ela custaria crédito sem entregar nada além do nome. O
mapa `TIPO_NO_BANCO`, na função de borda, faz a tradução — o mesmo desacoplamento que o
mapa `TEMPLATE` do n8n faz entre enum e nome de modelo na Meta.

² **No aviso 4 os três nomes coincidem, ao contrário do aviso 2, e aí a migração se
pagou.** Sem valor próprio de enum, este aviso dividiria chave de idempotência com o
`cobranca_pendencia` do aviso 2 — mesmo cliente, mesmo dia — e um dos dois não sairia, sem
erro e sem log. Migração `20260824143238`, aplicada no sandbox em 24/08/2026.

Canal `email` no enum `notificacao_canal`. Os demais valores de `notificacao_tipo`
são aviso interno no sino e não têm texto aqui; os e-mails de chamado são outro canal
([`notificacoes-chamados.md`](notificacoes-chamados.md)).

## Como estes textos são escritos

- **A linha da validação:** informar, contextualizar, indicar o prazo, orientar o
  próximo passo. **Nenhum verbo no imperativo dentro do texto** — o imperativo fica no
  botão.
- Abertura `Olá, Sr(a). {{1}}.`, fechamento `Atenciosamente`, com o nome do
  responsável antes da assinatura da casa, que é **`PSA Prado Suzuki`**.
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
- **A flexão de número é resolvida na renderização, não em parênteses.** Verbo, artigo
  e substantivo concordam com o valor: `São 52 documentos` / `É 1 documento`,
  `constam 6 documentos pendentes` / `consta 1 documento pendente`. `Sr(a).` é a única
  flexão em parênteses, e é de gênero.
- Seco e transacional: sem chamada para ação genérica, link encurtado ou emoji.
- **Nada que sugira interrupção técnica.** "O envio pode continuar de onde parou"
  transfere para a casa a causa de uma pendência que é do cliente.
- **O portal se cita uma vez por texto**, no fecho, onde o endereço aparece. O aviso 1
  é a exceção: cita duas vezes, por simetria com o modelo de WhatsApp, cujo corpo não
  pode terminar em marcador. Não "corrija" só num dos canais.
- Nenhum pede resposta nem indica canal de retorno: o único destino é o portal.
- Rótulo de botão na primeira pessoa do destinatário, nunca do remetente.
- Marcadores numerados na ordem de leitura; o assunto pode ter marcador, ao contrário
  do WhatsApp. A numeração não atravessa para os modelos de WhatsApp, que renumeram.

---

## 1. Solicitação enviada

**Assunto:** `Documentos necessários disponíveis no portal – {{2}}`

```
Olá, Sr(a). {{1}}.

A relação de documentos necessários {{3}} está disponível no portal do cliente,
com a orientação correspondente a cada documento.

Ao todo, são {{4}} documentos:

   Pessoas físicas: {{5}}
   Pessoas jurídicas: {{6}}
   Bens e imóveis: {{7}}
   Demais documentos: {{8}}

O prazo para envio é {{9}}.

O acompanhamento da documentação e as respectivas orientações estão disponíveis
no portal do cliente.

Atenciosamente,
{{10}}
PSA Prado Suzuki
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | objeto **no assunto**: produtos contratados na OS da solicitação, sem repetição, vírgula entre eles e `e` antes do último. Sem preposição |
| `{{3}}` | objeto **no corpo**: o mesmo dado na forma `a`, com preposição e artigo flexionados — `ao projeto de X` / `aos projetos de X e Y` |
| `{{4}}` | total de documentos solicitados |
| `{{5}}`–`{{8}}` | quantidade em cada tema, na ordem `pf`, `pj`, `bens_imoveis`, `outros`. **Tema com zero documentos: omitir a linha inteira**, em vez de imprimir `0` |
| `{{9}}` | prazo de envio, `dd/mm/aaaa` |
| `{{10}}` | nome do responsável pela solicitação |

**O objeto vale por dois marcadores porque o assunto e o corpo pedem formas
diferentes.** No assunto ele é o nome do produto puro; no corpo carrega a preposição
contraída com o artigo, que varia com o número.

---

## 2. Situação dos documentos — o pendente e o recusado juntos

> **Fusão decidida em 17/08/2026** (Bernardo e coordenação). Este aviso substitui os
> dois que existiam separados: a cobrança de pendente (era o 2) e o reenvio necessário
> (era o 4). **Passamos de 4 avisos para 3.** O texto antigo de cada um está preservado
> no histórico do git, e o modelo de WhatsApp em `whatsapp-templates.md §2`.
>
> **Por que.** O fluxo real é um só ato: o analista abre o checklist, confere o que
> chegou, vincula as entidades e recusa o que está errado — na mesma sessão. Dois
> avisos separados sairiam do mesmo ato, um atrás do outro, e o cliente receberia duas
> mensagens sobre a mesma conferência. O texto do aviso 4 já pedia *"um aviso por lote
> de conferência, não por documento"* (10/08) sem definir o que fecha um lote.
>
> **O que fecha o lote:** o clique do analista. Este é o único dos quatro avisos que é
> **manual** — botão na tela do checklist. Os avisos 1, 3 e 4 são automáticos.
>
> **Um por dia, por canal, por decisão do Bernardo.** A tela recusa o segundo clique do
> dia com "este cliente já foi avisado hoje, tente amanhã". Não é economia de mensagem:
> dois analistas avisando o mesmo cliente é sinal de spam, e sinal de spam derruba a
> nota de qualidade do número — o que leva o modelo a `FLAGGED` e depois a `PAUSED`, e
> aí o canal inteiro para.

**Assunto:** `Status da documentação – {{2}}`

```
Olá, Sr(a). {{1}}.

A documentação {{3}} está em processo de conferência.

No momento, constam {{4}} documentos pendentes:

{{5}}

Também foram identificados {{6}} documentos que necessitam de reenvio:

{{7}}

A relação completa, as orientações de envio e os respectivos motivos para reenvio
estão disponíveis no portal do cliente.

O prazo para envio é {{8}}.

Atenciosamente,
{{9}}
PSA Prado Suzuki
```

**Os dois blocos são condicionais, e é o que a fusão exige.** Quando não houver
pendente, o bloco de pendentes sai inteiro — frase, contagem e lista. Idem para o de
reenvio. O aviso nunca é disparado com os dois vazios: aí não há nada a pedir, e quem
fala é o aviso 3. Isso é possível no e-mail porque ele é montado por nós; o modelo de
WhatsApp não aceita parágrafo condicional, e por isso o texto de lá é outro.

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | objeto no assunto, o mesmo do aviso 1 |
| `{{3}}` | objeto no corpo, na forma `de`: `do projeto de X` / `dos projetos de X e Y` |
| `{{4}}` | quantidade pendente |
| `{{5}}` | o que falta, **uma linha por documento**, com a quantidade entre parênteses e os donos separados por vírgula, `e` antes do último: `Certidão de casamento (2) — Maria Silva e João Silva`. Sem o agrupamento o e-mail passa de 300 linhas |
| `{{6}}` | quantidade a reenviar |
| `{{7}}` | um par `documento — dono: motivo` por linha. **Sem agrupamento**, ao contrário do `{{5}}`: o motivo é de cada arquivo conferido, e juntar dois documentos com motivos diferentes perderia a informação |
| `{{8}}` | prazo de envio, o mesmo do aviso 1 — não se recalcula a cada aviso |
| `{{9}}` | nome do responsável pela solicitação |

**A faixa de status saiu na revisão de 17/08.** Ela existia para carregar o chip
`Em aberto` / `Prazo vencido` e o contraste `Resolvidos X de Y`. Com o prazo em linha
própria no corpo e a conferência dita em uma frase, o contraste deixou de ter função —
e com ele saíram três marcadores: conferidos, base e data de envio.

**O prazo entra em linha rotulada, e não em pedido.** A cobrança repete, e "envie até
03/09" deixa de ser verdade no dia 4; `O prazo para envio é 03/09/2026` é verdade
sempre.

**O que conta como pendente e como recusado é a mesma régua da tela.** Sai de
`montarSituacaoDocumentos`, que classifica pelo `estadoDoDocumento` — o módulo que a
tela do consultor e o portal do cliente já compartilham. Uma linha que tem um arquivo
recusado **e** um aprovado está resolvida (o bom vale) e não entra em nenhuma das duas
listas — senão o cliente reenviaria algo já aceito. `nao_aplicavel` e `dispensado`
também ficam fora: não são documento em falta, são ausência de pedido.

---

## 3. Documentação conferida

**Assunto:** `Documentação conferida – {{2}}`

```
Olá, Sr(a). {{1}}.

A documentação {{3}} está completa e conferida.

São {{4}} documentos, sem pendências no momento.

A relação da documentação conferida permanece disponível no portal do cliente.

A próxima etapa é a execução do projeto. Novas informações serão comunicadas
conforme o andamento das atividades.

Agradecemos pela colaboração e pelo envio da documentação.

Atenciosamente,
{{5}}
PSA Prado Suzuki
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | objeto no assunto, o mesmo do aviso 1 |
| `{{3}}` | objeto no corpo, na forma `de` |
| `{{4}}` | documentos aceitos no pedido, acumulado |
| `{{5}}` | nome do responsável pela solicitação |

**O agradecimento fica só no e-mail.** No WhatsApp ele foi cortado: o classificador de
categoria da Meta lê cortesia sem conteúdo transacional como marketing. O e-mail não
passa por classificador nenhum, e aí a linha da casa vale.

**É o aviso de fechamento, não de lote.** Sai no encerramento da solicitação, e por
isso não traz contagem de pendente nem a lista dos aceitos, que não pedem ação. O texto
**afirma completude e nomeia a etapa seguinte**, e isso condiciona o disparo: só sai
quando não houver documento pendente, seja por recebimento, seja por dispensa. A etapa
é texto fixo — o cliente pode ter um projeto por produto contratado, e não existe campo
que diga em que ponto cada um está.

---

## 4. Solicitação em aberto

> **Aviso novo, de 25/08/2026** (tarefa GES-04). Redação validada pela coordenação em
> 24/08. Não substitui ninguém e não tem relação com o antigo aviso 4, logo abaixo.
>
> **Quando sai:** a solicitação foi enviada, segue aberta, o prazo venceu e **nenhum**
> documento chegou. Repete a cada 30 dias enquanto continuar assim.
>
> **É o único aviso automático que não nasce de um ato.** Os avisos 1 e 3 nascem de
> transição gravada no banco, o 2 do clique do analista. Aqui não acontece ato nenhum: o
> que aconteceu foi o tempo passar. Por isso existe um cron, e nos outros não.
>
> **Se algo chegou e faltou o resto, quem fala é o aviso 2.** Este só sai no zero.

**Assunto:** `Solicitação de documentos em aberto – {{2}}`

```
Olá, Sr(a). {{1}}.

Até o momento, não consta o recebimento de nenhum documento referente {{3}}.

O prazo para envio venceu em {{4}}.

A relação completa dos documentos e as orientações de envio estão disponíveis
no portal do cliente.

Atenciosamente,
{{5}}
PSA Prado Suzuki
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | objeto no assunto, o mesmo do aviso 1 |
| `{{3}}` | objeto no corpo, na forma **`a`**: `ao projeto de X` / `aos projetos de X e Y` |
| `{{4}}` | prazo de envio, o mesmo do aviso 1 — não se recalcula a cada cobrança |
| `{{5}}` | nome do responsável pela solicitação |

**A forma `a`, e não a `de` dos avisos 2 e 3.** O texto fixo é `referente {{3}}`, então a
forma `de` produziria *"referente dos projetos de X"*.

**A linha do prazo é condicional aqui, e no WhatsApp não.** O e-mail é montado por nós:
`O prazo para envio é {{4}}.` enquanto o prazo vale, `O prazo para envio venceu em {{4}}.`
depois. O modelo da Meta não tem parágrafo condicional, então lá o estado vai dentro do
valor — `03/09/2026 (vencido)`. O dia é o de `America/Cuiaba`, o mesmo da chave de
idempotência: em UTC, das 20h à meia-noite de Cuiabá já é o dia seguinte, e o texto diria
"venceu" no último dia em que o prazo ainda vale.

**É o único aviso do ciclo sem lista**, porque nada chegou — não há o que listar. Por isso
o corpo do e-mail e o do WhatsApp dizem a mesma frase, o que não acontece em nenhum dos
outros três.

**`vencido` e não `encerrado`.** Encerrado sugere que a porta fechou, e o aviso existe para
pedir o envio. É também o termo que a casa já usava no chip de status: `Prazo vencido`.

**A direção do documento tem de ficar explícita.** A PSA também entrega documento ao
cliente — gerador e downloads —, então "nenhum documento" sem direção é ambíguo.
`recebimento` resolve: só pode ser do nosso lado. Três redações falharam antes disso, e o
registro de cada tentativa está em
[`../sprints/sprint-12/VALIDACAO_aviso-sem-documento.md`](../sprints/sprint-12/VALIDACAO_aviso-sem-documento.md).

---

## ~~Antigo aviso 4. Reenvio necessário~~ — FUNDIDO NO AVISO 2 EM 17/08/2026

> **Este aviso não existe mais como texto próprio.** O conteúdo dele — a lista de
> documentos a reenviar com o motivo de cada um — passou a ser o segundo bloco do
> aviso 2. Ver a abertura da §2 para o motivo.
>
> Fica registrado aqui porque o modelo `documento_recusado` **continua APPROVED na
> Meta** e porque a decisão de 10/08 sobre "um aviso por lote" nasceu neste texto. Não
> apague: quem for mexer no aviso 2 precisa ler o que já foi decidido sobre a lista de
> motivos e sobre o dispensado.

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

Quando houver documento dispensado no mesmo lote, este parágrafo entrava antes do
reenvio, e era omitido quando não houvesse:

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
| `{{5}}` | um par `nome do documento: motivo da recusa` por linha. Sem agrupamento: o motivo é de cada arquivo conferido |
| `{{6}}` | prazo de reenvio: data da conferência mais 30 dias — era outro prazo, não o do aviso 1 |
| `{{7}}` | nome do responsável pela solicitação |
| `{{8}}` | documento dispensado, de `solicitacao_item_nao_aplicavel` |

**Duas coisas deste texto não sobreviveram à fusão, e é bom saber por quê.** O prazo
próprio de reenvio caiu: o aviso 2 usa um prazo só, o da solicitação, porque dois
prazos no mesmo corpo se contradizem quando as duas listas saem juntas. E o parágrafo
do dispensado caiu porque dispensado não é documento em falta — ele sai do checklist
por `nao_aplicavel`, sem precisar de aviso.

Decidido em 10/08/2026: **um aviso por lote de conferência, não por documento** —
vale também para o modelo de WhatsApp. Em 17/08/2026 ficou definido **o que fecha um
lote**, o que faltava: o clique do analista no botão da tela do checklist.

## Botões, na versão HTML

No HTML o marcador do portal deixa de ser URL visível e passa a ser o destino do
botão. Os rótulos são os da revisão de 17/08, e são os mesmos dos modelos de WhatsApp.

| Aviso | Botão |
|---|---|
| 1 | Enviar documentos → |
| 2 | Consultar documentação → |
| 3 | Consultar documentação → |
| 4 | Enviar documentos → |
| ~~antigo 4~~ | ~~Reenviar meus documentos →~~ (fundido no 2) |

O aviso 4 repete o rótulo do 1, e é o certo: nos dois o que se pede é envio, não consulta.

## De onde vem cada campo

| Conteúdo | Origem |
|---|---|
| nome do destinatário | `destinatarios_cliente(cliente_id).nome` — o **representante com acesso ao portal** (`user_id` não nulo), e não `cliente.nome`, que é o nome do grupo |
| e-mail do destinatário | `destinatarios_cliente(cliente_id).email`, preenchido em 38 de 38 destinatários |
| quantos destinatários por cliente | uma linha por representante com acesso: hoje 23 clientes e 38 destinatários, média de 1,65 |
| objeto, nas duas formas | `solicitacao.ordem_servico_id` → `os_produtos_contratados` → `produto_segmento.nome`. A preposição e o artigo são montados no fluxo, não no texto |
| data de envio | `solicitacao.enviada_em` |
| prazo de envio | **decidido em 11/08/2026: 30 dias por regra**, contados de `solicitacao.enviada_em` e calculados no fluxo. Não há coluna de prazo, e o mesmo valor vale para todo cliente e produto |
| nome do responsável | `solicitacao.created_by` → nome em `profiles` |
| total de documentos solicitados | contagem de `solicitacao_item` com `status = 'ativo'` |
| quantidade por tema | a mesma contagem por `solicitacao_item.grupo` |
| quantidade pendente e o que falta | `montarSituacaoDocumentos` sobre o checklist que o analista está vendo, classificando por `estadoDoDocumento`. O checklist é `solicitacao_item` expandido pela `granularidade` sobre as entidades do cliente, menos o que tem arquivo vinculado ao mesmo `documento_tipo_id` e à mesma entidade, menos `solicitacao_item_nao_aplicavel` |
| documentos aceitos, contagem | o mesmo checklist, no fechamento |
| nome do documento | `documento_tipo.documento` pelo `documento_arquivo.documento_tipo_id`; na falta, `nome_original` |
| motivo da recusa | `documento_arquivo.revisao_motivo`, gravado pela RPC `revisar_documento_pendencia` junto com `documento_arquivo.revisao`. Vários motivos na mesma linha do checklist entram distintos, separados por ` · ` |
| documento dispensado | `solicitacao_item_nao_aplicavel` mais `documento_tipo.documento` |
| endereço do portal | `PUBLISHED_URL` + caminho do portal. Não há link profundo por solicitação: a coleta é renderizada dentro de `src/pages/cliente/ClienteDashboard.tsx` |
| papel do destinatário | `notificacao_envio.destinatario_papel` (`cliente \| responsavel \| gestor`) |

## Fora do escopo, declarado no card

| Item | Estado em 17/08/2026 |
|---|---|
| Implementar o ato de aceitar e recusar documento | **feito** — RPC `revisar_documento_pendencia`, com tela e o motivo visível ao cliente |
| Periodicidade da varredura do aviso 2 | **cancelada** — o disparo virou botão manual do analista, e a janela de um por dia por canal ficou na borda |
| Ligar o canal no fluxo de automação | **feito** — um workflow por canal, ativo, recebendo o mesmo corpo |

## Dependências para o disparo

| Dependência | Dono |
|---|---|
| `solicitacao.ordem_servico_id` nulo em **6 de 10** — `gerar_solicitacao_os` só grava a OS ao criar o cabeçalho, e sem ela o objeto vai vazio. A borda recusa antes de montar, com `sem_os` | Eduardo, no gerador; ou exigência de OS na tela de envio |
| Prazo por exceção: os 30 dias são regra, sem coluna, então não há como abrir exceção por cliente ou produto | evolução futura |
| Deploy em **produção**: os quatro avisos estão no sandbox e commitados (`47c02dca`), e produção não recebeu a borda nova nem as quatro migrações da GES-04 | Alexandre, pelo chat do Lovable |
| **`representante.telefone` em 8 de 39** (produção, 25/08/2026) — quem não tem telefone recebe só por e-mail. É a única assimetria real entre os dois canais | cadastro |

**O que saiu desta tabela em 17/08/2026.** Três linhas foram resolvidas:

- **O canal está ligado no fluxo**, nos dois sentidos: um workflow por canal, ativo,
  recebendo o mesmo corpo. A borda decide os destinatários de cada um — e-mail em 38
  de 38 destinatários com acesso ao portal, telefone em 8 de 38.
- **O gatilho do aviso 3 existe:** é o encerramento da solicitação, ligado no
  `encerrarSolicitacao`, com `enviada_em` como condição — encerrar um rascunho não
  dispara nada, porque um rascunho nunca chegou ao cliente. Não precisou de migração:
  `notificacao_tipo` já tinha `documento_aprovado`.
- **A coluna do motivo da recusa existe** (`documento_arquivo.revisao_motivo`), então o
  aviso 2 pode dizer o motivo de cada documento a reenviar em vez de mandar o cliente
  procurar no portal.
