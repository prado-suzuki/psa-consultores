# Modelos de WhatsApp — avisos ao cliente

Os modelos que a Meta precisa aprovar para o ciclo de coleta de documentos, e a
variável que alimenta cada marcador. O conteúdo é o dos
[textos de e-mail](avisos-cliente.md); aqui muda o formato, a categoria e a
submissão.

Tarefas **ALE-11** (os três primeiros) e **GES-04** (o quarto). Idioma `pt_BR`, categoria
**utility** e tipo **Padrão** nos quatro — nenhum é promocional. Assinatura
`PSA Prado Suzuki` no componente Rodapé.

Contexto da conta, identificadores e a decisão pela API oficial estão em
[`whatsapp-meta-onboarding.md`](whatsapp-meta-onboarding.md). O cenário preenchido de
cada modelo e as amostras de variável para copiar no formulário estão em
[`avisos-cliente-validacao.md`](avisos-cliente-validacao.md).

> **São QUATRO modelos desde 25/08/2026, e os quatro estão APPROVED.** Os três da ALE-11
> foram reescritos por Patrícia Melo, ressubmetidos em 17/08 e aprovados em **18/08**. O
> quarto, `solicitacao_vencida_v1`, é da **GES-04** — submetido em 24/08 e aprovado em
> **25/08**. Ele não substitui ninguém: é aviso novo, para a solicitação que venceu sem
> nenhum documento recebido.
>
> **Cinco modelos ficam órfãos, todos APPROVED.** Os quatro antigos mais o
> `situacao_documentos_v1`, que durou dias — o aviso 2 passou para `_v2`. Não precisam ser
> apagados: basta o mapa `MODELOS` do Code node parar de referenciá-los. Apagar modelo
> aprovado não devolve nada e fecha a porta de voltar atrás.
>
> ⚠️ **Nome de modelo aprovado é imutável, e editar o corpo o torna inutilizável até a
> reaprovação.** É por isso que a troca é por modelo novo com sufixo de versão, e não
> por edição. A próxima revisão de texto é `_v3`.
>
> ⚠️ **O `solicitacao_vencida_v1` é o único sem caminho de volta.** Os outros três têm o
> órfão equivalente no mapa, sob a chave `atual`. Este não tem: se a Meta o pausar, a rota
> para, porque não existe modelo antigo cobrindo o mesmo texto.

| # | Modelo na Meta | `event_type` | `notificacao_tipo` no banco | Marc. | Botão | Dispara |
|---|---|---|---|---|---|---|
| 1 | `solicitacao_enviada_v2` | `solicitacao_enviada` | idem | 4 | Enviar documentos | clique em Enviar solicitação |
| 2 | `situacao_documentos_v2` | `situacao_documentos` | `cobranca_pendencia` ¹ | 4 | Consultar documentação | **botão do analista no checklist** |
| 3 | `documentacao_conferida_v1` | `documento_aprovado` | idem | 3 | Consultar documentação | encerramento da solicitação |
| 4 | `solicitacao_vencida_v1` | `solicitacao_vencida` | idem ² | 3 | Enviar documentos | **cron diário** — prazo vencido e nada recebido |

| Órfão, APPROVED | Substituído por |
|---|---|
| `solicitacao_enviada` | `solicitacao_enviada_v2` |
| `cobranca_pendencia` | `situacao_documentos_v2` |
| `documento_recusado` | `situacao_documentos_v2` |
| `situacao_documentos_v1` | `situacao_documentos_v2` |
| `documento_aprovado` | `documentacao_conferida_v1` |

¹ **A identidade nome-do-modelo = valor-do-enum se rompeu nos três.** O doc previa que
ela quebraria "no primeiro `_v2`"; quebrou em toda a linha, por fusão e por versão. Os
valores gravados no banco continuam os do enum (acrescentar valor a `notificacao_tipo` é
migração, e ela não entregaria nada além do nome). O mapa `TEMPLATE` do Code node é o
**único lugar** onde se lê qual modelo está no ar para qual aviso — era exatamente para
isso que ele existia.

² **No aviso 4 os três nomes voltam a coincidir, e é deliberado.** `solicitacao_vencida` é
valor de enum, `event_type` da API e prefixo do modelo. Aqui a migração se pagou, ao
contrário do aviso 2: sem valor próprio de enum, este aviso dividiria chave de
idempotência com o `cobranca_pendencia` do aviso 2 — mesmo cliente, mesmo dia — e um dos
dois desapareceria sem erro e sem log.

Canal `whatsapp` no enum `notificacao_canal`.

**Botão dos quatro:** Chamada para ação · Acessar o site · URL **estática**
`https://psaconsultores.com.br/cliente`, fixa e sem sufixo dinâmico. Não há link profundo
por solicitação — a coleta é renderizada dentro de
`src/pages/cliente/ClienteDashboard.tsx`. Usar o domínio institucional e não o
`PUBLISHED_URL` (`psa-consultores.lovable.app`) é deliberado: o revisor da Meta olha se a
URL tem relação com o negócio, e a URL é **imutável depois de aprovada**.

**Período de validade: 12 horas** nos quatro (43200s, conferido pela API em 25/08/2026), o
maior valor que o painel oferece. Sem isso vale o padrão de **10 minutos** — mensagem não
entregue nesse prazo é descartada, não cobrada e o cliente nunca a vê. Para aviso
assíncrono, que o cliente lê quando puder, 10 minutos perde entrega em silêncio.

⚠️ **12h é o teto do PAINEL, não da Meta.** A documentação diz que utilidade tem padrão de
**30 dias**, e a subida para lá se faz por API (`POST /<TEMPLATE_ID>` com
`message_send_ttl_seconds=-1`). Ficou para depois, decidido em 24/08 — o custo aceito é
que mensagem não entregue em 12h é descartada em silêncio, e o aviso 4 é o que mais sofre
com isso, porque existe justamente para alcançar quem está inerte há 30 dias. O raciocínio
inteiro está em
[`../sprints/sprint-12/VALIDACAO_aviso-sem-documento.md`](../sprints/sprint-12/VALIDACAO_aviso-sem-documento.md).

## ⚠️ Trocar o nome no mapa `TEMPLATE` não basta

Os parâmetros mudaram de quantidade, de conteúdo e de posição. Quem trocar só o nome
manda mensagem com frase sem sentido, e frase sem sentido **não** faz o envio falhar —
sai assim para o cliente.

| Modelo novo | O que muda em relação ao órfão |
|---|---|
| `solicitacao_enviada_v2` | **ganha o `{{4}}`**, prazo de envio, que o antigo não tinha. E o `{{2}}` perde o possessivo: era `aos seus projetos de`, virou `aos projetos de` |
| `situacao_documentos_v2` | o `{{3}}` passa da forma `com` para a forma **`de`**, e o `{{2}}` muda de redação — era `faltam 6 documentos e 2 precisam ser reenviados`, virou `constam 6 documentos pendentes e 2 documentos que necessitam de reenvio` |
| `documentacao_conferida_v1` | **`{{2}}` e `{{3}}` trocaram de posição.** No órfão, `{{2}}` era a contagem **com artigo** (`os 52 documentos`) e `{{3}}` o objeto; agora `{{2}}` é o objeto e `{{3}}` a contagem **sem artigo** (`52 documentos`) |

**A forma `com` do objeto morreu.** Ficam duas formas, e a divisão é outra: **`a`** no
modelo 1 (`aos projetos de`) e **`de`** nos modelos 2 e 3 (`dos projetos de`).

## O que o formato da Meta impõe

Constatado na submissão, não só na documentação:

- Corpo de até 1.024 caracteres, e **não pode começar nem terminar em marcador**.
  Terminar com marcador seguido de ponto **não basta** — a Meta exige texto real depois
  do último parâmetro.
- **Parâmetro não aceita quebra de linha**, tabulação nem mais de quatro espaços
  seguidos — logo nenhum marcador carrega lista de várias linhas.
- **Quebra de linha no corpo é literal.** Cada parágrafo é UMA linha, por longa que
  seja. Quebra no meio de uma frase parte a frase na tela do cliente, e o corpo não
  pode ser editado depois de aprovado.
- O modelo é fixo: **não há parágrafo condicional**. Um corpo aprovado sai sempre
  igual, com todos os parâmetros preenchidos.
- **Parâmetro vazio impede o envio** (131008 / 132000). Toda variável tem de ter valor
  garantido. Cada marcador a mais é mais uma forma de a mensagem não sair.
- Rótulo de botão: até 40 caracteres, e **fixo na aprovação** — mudar o rótulo é
  ressubmeter e esperar a fila.
- **Cabeçalho é para título, não para saudação.** Renderiza em negrito e destacado, e tem
  numeração de marcador própria, separada da do corpo. A saudação vai no corpo, e nos
  quatro modelos o cabeçalho fica **vazio**.
- **Corpo e rodapé aceitam formatação:** `*negrito*`, `_itálico_`, `~tachado~`.
- **O classificador de categoria roda no formulário, antes de submeter.** Se ele discordar
  da categoria escolhida, avisa que o modelo será rejeitado e oferece a troca. Dá para
  editar o texto e ver o aviso sumir sem gastar fila.
- `Sr(a).` é **texto fixo** do modelo. Só flexão de **número** vai para dentro da
  variável — gênero fica em parênteses, decidido em 12/08/2026.

## A regra da flexão

Decidido em 12/08/2026: **o n8n entrega o valor já flexionado**, e o corpo fica com o
texto fixo. Isso evita `documento(s)`, `Falta(m)` e `precisa(m)` espalhados pela
mensagem, que o WhatsApp deixa mais feio que o e-mail.

| Valor | 1 | Vários |
|---|---|---|
| Contagem com substantivo | `1 documento` | `52 documentos` |
| Objeto, forma `a` (modelo 1) | `ao projeto de X` | `aos projetos de X e Y` |
| Objeto, forma `de` (modelos 2 e 3) | `do projeto de X` | `dos projetos de X e Y` |
| Frase da situação (modelo 2) | `consta 1 documento pendente` | `constam 6 documentos pendentes` |

Separador da lista: **vírgula**, com `e` antes do último. Avaliamos ponto e vírgula
porque metade do catálogo OSG tem vírgula no próprio nome — `Diagnóstico Societário,
Sucessório e Governança` — e uma lista por vírgula fica indistinguível de um produto
composto. Ficou vírgula mesmo: são **2 OS multiproduto na base inteira**, o "e" seguido de
"e" é corrente em português, e o separador vive no valor da variável, então trocar depois
não passa pela Meta.

**Risco latente: `São {{3}}` quebra no singular.** Os modelos 1 e 3 têm o verbo no
plural como texto fixo antes da contagem, então uma solicitação de um documento só
produz `São 1 documento`. O verbo não pode entrar no marcador — ele vem antes dele — e o
corpo é imutável, então a correção é um `_v3`. Hoje não acontece: nenhuma das 11
solicitações tem exatamente 1 item ativo (o mínimo é 0, em rascunho, e o máximo 67).
Fica registrado para não ser descoberto por um cliente.

---

## 1. `solicitacao_enviada_v2`

```
Olá, Sr(a). {{1}}.

A relação de documentos necessários {{2}} está disponível no portal do cliente.

São *{{3}}*, com a orientação correspondente a cada item.

O prazo para envio é {{4}}.

O acompanhamento da documentação está disponível no portal do cliente.
```

**Rodapé** `PSA Prado Suzuki` · **Botão** URL fixa, rótulo `Enviar documentos` ·
**Negrito** só na contagem

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo` |
| `{{2}}` | objeto na forma `a`, com preposição e artigo flexionados | `aos projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{3}}` | contagem de `solicitacao_item` com `status = 'ativo'`, com o substantivo | `52 documentos` |
| `{{4}}` | prazo de envio: `enviada_em` mais 30 dias | `03/09/2026` |

**A última linha existe por causa da regra do marcador final.** Sem ela o corpo
terminaria em `{{4}}` e seria reprovado — ponto depois do marcador não resolve. A frase
é a mesma que já está no e-mail deste aviso, e é o motivo de o portal ser citado duas
vezes aqui e uma vez nos outros dois.

⚠️ **Confira a prévia antes de enviar para análise.** O `{{2}}` é o objeto e o `{{3}}` a
contagem. Trocar os dois passa pela validação da Meta e produz "documentos necessários
52 documentos".

---

## 2. `situacao_documentos_v2`

**Substitui `cobranca_pendencia` e `documento_recusado`.** Fusão de 17/08/2026.

⚠️ **O `_v1` também está APPROVED e ficou órfão, com corpo idêntico byte a byte** — medido
em 25/08/2026, incluindo a quebra solta no meio da última frase. A duplicata não corrigiu
nada; corrigir a quebra exige um `_v3`.

```
Olá, Sr(a). {{1}}.

No momento, {{2}} na documentação {{3}}.

Prazo para envio: *{{4}}*

A relação completa, as orientações de envio e os motivos para reenvio estão disponíveis no portal do cliente.
```

**Rodapé** `PSA Prado Suzuki` · **Botão** URL fixa, rótulo `Consultar documentação` ·
**Negrito** só no prazo

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo` |
| `{{2}}` | **a frase da situação**: junta pendente e a reenviar, tudo flexionado | `constam 6 documentos pendentes e 2 documentos que necessitam de reenvio` |
| `{{3}}` | objeto na forma `de` | `dos projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{4}}` | prazo de envio, o mesmo do modelo 1 — não se recalcula a cada aviso | `03/09/2026` |

### Por que a fusão couber em 4 marcadores, e não em 6

**O `{{2}}` carrega a frase inteira, e é o que resolve o problema estrutural.** Modelo de
WhatsApp **não tem parágrafo condicional**: um marcador dedicado aos recusados ficaria
vazio quando não houvesse recusa, e **parâmetro vazio impede o envio**.

Como o `{{2}}` é montado pelo n8n, ele assume três formas e nunca fica vazio — o aviso
só é disparado quando há ao menos uma das duas coisas:

| Situação | `{{2}}` |
|---|---|
| só pendente | `constam 6 documentos pendentes` · `consta 1 documento pendente` |
| só a reenviar | `constam 2 documentos que necessitam de reenvio` · `consta 1 documento que necessita de reenvio` |
| os dois | `constam 6 documentos pendentes e 2 documentos que necessitam de reenvio` |

**O verbo concorda com a primeira metade**, que é quem abre a frase. Está coberto por
teste, porque é o tipo de detalhe que se perde numa refatoração e ninguém percebe até um
cliente ler.

**O detalhe fica no portal, e agora isso é verdade.** O modelo antigo de recusa já dizia
"o motivo de cada um está no portal do cliente", e quando foi escrito **não era verdade**:
não havia tela de recusa. Passou a ser em 17/08 — `ChecklistDocumentosCliente.tsx` mostra
o motivo em vermelho embaixo do arquivo recusado, alimentado por
`documento_arquivo.revisao_motivo`. Por isso o WhatsApp pode ser enxuto: a lista item a
item vive no e-mail, que é montado por nós e aceita tamanho variável.

**O prazo vai em linha rotulada, e não em pedido.** A cobrança repete, e "envie até
03/09" deixa de ser verdade no dia 4 — `Prazo para envio: 03/09/2026` é verdade sempre.

**Negrito só no prazo:** numa cobrança é a data que o cliente age em cima, e a situação
está dentro de uma frase longa, onde o destaque se dilui.

### Risco na submissão

**O classificador de categoria é o risco real, e já mordeu uma vez.** O
`documento_aprovado` foi reprovado *antes* da submissão, com "a categoria não corresponde"
e recomendação de **Marketing**; o que destravou foi cortar `Agradecemos a agilidade no
envio.` A regra aprendida: **agradecimento e projeção de etapa futura empurram utility
para marketing.**

Este texto foi escrito com isso em mãos: nenhuma cortesia, nenhuma projeção, e situação
concreta com prazo. Mas tem dois assuntos num corpo só, o que dá mais superfície para o
classificador reclamar.

---

## 3. `documentacao_conferida_v1`

**Substitui `documento_aprovado`.**

```
Olá, Sr(a). {{1}}.

A documentação {{2}} está completa e conferida.

São {{3}}, *sem pendências no momento*.

A próxima etapa é a execução do projeto. Novas informações serão comunicadas conforme o andamento das atividades.
```

**Rodapé** `PSA Prado Suzuki` · **Botão** URL fixa, rótulo `Consultar documentação` ·
**Negrito** em `sem pendências no momento`

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo` |
| `{{2}}` | objeto na forma `de` | `dos projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{3}}` | documentos aceitos no pedido, acumulado, com o substantivo e **sem artigo** | `52 documentos` |

**Negrito em texto fixo, não em variável** — é o único dos três. Aqui não há ação
pedida: o que o cliente procura é o desfecho, e o desfecho é "sem pendências". Nos
outros o destaque é um número ou uma data que muda; aqui é uma afirmação sempre igual.

**O agradecimento não entra.** O órfão foi reprovado pelo classificador por causa dele,
e a frase da casa vive só no e-mail, que não passa por classificador nenhum.

**É o aviso de fechamento, não de lote.** Sai no encerramento da solicitação. O corpo
afirma completude e nomeia a etapa seguinte, então **só sai quando não houver documento
pendente**, seja por recebimento, seja por dispensa.

A etapa é **texto fixo — "a execução do projeto"** —, e não marcador: o cliente pode
ter um projeto por produto contratado, e não existe campo que diga em que ponto cada
um está.

---

## 4. `solicitacao_vencida_v1`

**Aviso novo, não substitui ninguém.** Tarefa GES-04. Sai quando a solicitação venceu e
**nada** chegou do cliente; se algo chegou e faltou o resto, quem fala é o modelo 2.

```
Olá, Sr(a). {{1}}.

Até o momento, *não consta o recebimento de nenhum documento* referente {{2}}.

Prazo para envio: {{3}}.

A relação completa dos documentos e as orientações de envio estão disponíveis no portal do cliente.
```

**Rodapé** `PSA Prado Suzuki` · **Botão** URL fixa, rótulo `Enviar documentos` ·
**Negrito** na frase do recebimento

225 caracteres de modelo, 309 preenchido. Quatro parágrafos.

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo` |
| `{{2}}` | objeto na forma **`a`** | `aos projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{3}}` | prazo de envio, **com o estado quando vencido** | `03/09/2026 (vencido)` |

⚠️ **A forma `a`, como o modelo 1, e não a forma `de` dos modelos 2 e 3.** O texto fixo é
`referente {{2}}`, então `dos projetos de X` produziria *"referente dos projetos de X"* —
frase quebrada que **sai assim para o cliente**, porque parâmetro com valor não falha o
envio.

**O vencimento vive dentro do valor do `{{3}}`, não no corpo.** Modelo não tem parágrafo
condicional, e o corpo é imutável depois de aprovado; a palavra `vencido` é montada na
hora e muda sem passar pela Meta. `vencido` e não `encerrado`: encerrado sugere porta
fechada, e o aviso existe para pedir o envio.

**A frase do recebimento é texto fixo, e não marcador.** O aviso só dispara quando o
número é zero, logo a frase é constante — e cada marcador a menos é uma forma menos de a
mensagem não sair por parâmetro vazio. É também o que deixa o negrito cair num trecho
curto em vez de virar mancha.

**É o único aviso do ciclo sem lista**, porque nada chegou. Por isso o corpo do WhatsApp e
o do e-mail dizem a mesma frase — nos outros três o e-mail carrega listas que não cabem em
parâmetro.

## De onde saem nome, telefone e responsável

`destinatarios_cliente(cliente_id)` devolve `nome`, `email` e `telefone` — a mesma
função da EDU-1 que o e-mail usa. O nome é o do **representante com acesso ao portal**
(`representante` com `user_id` não nulo), e não `cliente.nome`, que é o nome do grupo.
O envio é gravado por `registrar_envio(...)` com o canal `whatsapp` e o destino em
`notificacao_envio.destinatario_telefone`.

O objeto sai de `solicitacao.ordem_servico_id` → `os_produtos_contratados` →
`produto_segmento.nome`.

Decidido em 10/08/2026: **um aviso por lote de conferência, não por documento.** É por
isso que o modelo 3 leva quantidade, e não o nome do documento — singular significaria
uma mensagem paga por documento. Em 17/08 ficou definido o que fecha um lote no modelo
2: o clique do analista.

## Estado de cada modelo

**Retrato de 25/08/2026, lido pela Graph API (`GET /{WABA}/message_templates`) e não pelo
painel: são NOVE modelos na conta, e os nove estão APPROVED.** Quatro no ar, cinco órfãos.

| Modelo | No ar? | Aprovado em |
|---|---|---|
| `solicitacao_enviada_v2` | ✅ aviso 1 | 18/08 |
| `situacao_documentos_v2` | ✅ aviso 2 | 18/08 |
| `documentacao_conferida_v1` | ✅ aviso 3 | 18/08 |
| `solicitacao_vencida_v1` | ✅ aviso 4 | **25/08** — qualidade ainda `UNKNOWN` |
| `situacao_documentos_v1` | órfão | 18/08 — durou dias |
| `solicitacao_enviada` | órfão | antes de 17/08 |
| `cobranca_pendencia` | órfão | antes de 17/08 |
| `documento_aprovado` | órfão | antes de 17/08 |
| `documento_recusado` | órfão | antes de 17/08 |

**Envio real medido:** o `solicitacao_enviada` órfão, em produção em 14/08 — entregue em
8s e lido em 3min, com o status vindo pelo webhook até a nossa tabela. Em agosto saíram 21
mensagens de template (todas de teste), das quais **10 cobradas** e 11 dentro de janela de
atendimento aberta, logo gratuitas.

⚠️ **O bloqueio do canal não é a fila da Meta: é publicar o app — e continua de pé.**
Medido em 25/08/2026 pela API: `AutomacaoPSA` está em `app_status: dev_mode`,
`is_live: false`. Nesse modo a mensagem só alcança quem tem papel no app ou quem abriu
conversa nas últimas 24h — é por isso que os nossos testes passam, e é por isso que eles
**não** provam alcance a cliente.

Dos três itens que travavam em 17/08, **dois saíram**: política de privacidade, Termos e
Exclusão de Dados agora apontam para `psaconsultores.com.br`. Falta um: o e-mail de
contato é um Gmail pessoal e está **não verificado** (`contact_email_verified: false`).

**Com o objeto carregando a preposição e o artigo, `ordem_servico_id` nulo produz frase
quebrada, não capenga** — "a relação de documentos necessários ." Parâmetro vazio já
impede o envio de qualquer forma, e a borda recusa antes com `sem_os`. Fica registrado
como pré-condição dura: **sem OS, não envia.**

## Custo por mensagem

A Meta cobra **por mensagem entregue** desde julho de 2025, e a categoria define o
preço. Utility é a mais barata das pagas. Desde 01/07/2026 as contas brasileiras novas
já nascem faturadas em reais pela entidade local da Meta, e a migração das antigas é
obrigatória até 30/06/2027 — a referência é o rate card em BRL, não conversão de
dólar.

| Item | Valor |
|---|---|
| Utilidade no Brasil, tarifa da Meta | **R$ 0,0350** por mensagem entregue |
| Revenda por BSP | de R$ 0,04 a R$ 0,09 anunciados no mercado; a diferença é markup e **não se aplica** saindo da Cloud API direto do n8n |
| Janela de atendimento gratuita | utilidade dentro de janela aberta não é cobrada, mas a janela abre quando o cliente manda mensagem no WhatsApp, não quando envia documento no portal |

Tarifa conferida em 11/08/2026 na calculadora oficial, em
`whatsappbusiness.com/pt-br/products/platform-pricing`, com país **Brasil**, moeda
**Real brasileiro (BRL)** e categoria **Utilidade**. Reconferida em 25/08/2026 contra o que
a Meta de fato cobrou, e bate exatamente: **R$ 0,0350 por mensagem cobrada.**

**Medido em 25/08/2026** por `GET /{WABA}?fields=pricing_analytics`, que devolve volume e
custo por dia, por categoria e por tipo de cobrança:

| Agosto/2026 | Mensagens | Custo |
|---|---|---|
| Cobradas (`REGULAR`) | 10 | **R$ 0,35** |
| Gratuitas (`FREE_CUSTOMER_SERVICE`) | 11 | R$ 0 |

**As 11 gratuitas saíram dentro de janela de atendimento aberta**, porque quem testava
respondia no celular. **Não conte com isso em produção:** o cliente que passou 30 dias sem
mandar documento é, por definição, quem não respondeu — janela fechada, mensagem cobrada.
Orçar a R$ 0,035 cheios.

**O teto real do canal é o cadastro, não o preço.** Medido em produção em 25/08: 8 dos 39
destinatários com acesso ao portal têm telefone. Um ciclo de cobrança do aviso 4 custa no
máximo 8 mensagens — R$ 0,28.

⚠️ **Fatura, linha de crédito e forma de pagamento NÃO saem por API.** A Meta exige que o
negócio dono do app seja Business Solution Provider; o nó do Business responde
"Missing Permission". O que se lê é o custo por mensagem acima, e valor de fatura fechada
só no gerenciador de pagamentos.

**Uma mensagem por representante, não por cliente.** `destinatarios_cliente` devolve
uma linha por representante com acesso ao portal — hoje 23 clientes e 38
destinatários, média de 1,65. Um cliente com quatro representantes custa quatro
mensagens por evento.

## Submissão

Pelo Gerenciador de WhatsApp, em Modelos de mensagens → Gerenciar modelos → Criar modelo.
Cada modelo pede nome, idioma, categoria, tipo, corpo e **um exemplo de cada marcador**,
sem quebra de linha e sem espaço múltiplo. As amostras na ordem, para copiar, estão em
[`avisos-cliente-validacao.md`](avisos-cliente-validacao.md).

Não usar a **Biblioteca de modelos**: são 157 modelos pré-aprovados em inglês, de
cenários de e-commerce e agendamento. Nenhum cobre coleta de documentos de projeto de
consultoria.

O `situacao_documentos_v2` é o de maior risco em produção, e não pela redação: é o
único que sai por decisão da casa e não por ato do cliente, e a reclassificação de
utility para marketing acontece **depois** da aprovação, olhando o uso real — muda custo
e política sem avisar. A janela de um aviso por dia **por canal** está na borda, com o
dia calculado em `America/Cuiaba`.

A verificação do negócio (ALE-10) **saiu aprovada em 12/08/2026** — então vale o ramo
cheio do critério de aceite, não o de contingência.

## Dependências para o disparo

| Dependência | Dono |
|---|---|
| **Publicar o app.** Falta só o e-mail de contato verificado — hoje é Gmail pessoal, `contact_email_verified: false`. **Sem isso a mensagem não alcança cliente**, com modelo aprovado ou não | Alexandre |
| **`representante.telefone` preenchido em 8 de 39**, contra e-mail em 39 de 39 (medido em produção em 25/08/2026) — sem telefone o modelo aprovado não alcança o cliente. É a maior limitação do canal, e nem modelo aprovado nem número verificado a mudam | cadastro; nenhuma tarefa desta sprint preenche |
| `solicitacao.ordem_servico_id` nulo em **6 de 10** — sem OS o objeto vai vazio e a borda recusa com `sem_os` | Eduardo, no gerador; ou exigência de OS na tela de envio |
| Subir a validade de 12h para 30 dias por API, nos nove modelos | fora do escopo da GES-04; algumas sprints à frente |
| **Não há alerta quando um modelo sai de `APPROVED`.** Se a Meta pausar, o canal para em silêncio — e a rota do aviso 4 não tem modelo de reserva | proposto, sem tarefa |

**O que saiu desta tabela em 17/08/2026:**

- **O canal está ligado**: workflow próprio, ativo, com rota e segredo próprios
  (`N8N_OSG_WA_WEBHOOK_URL`). O `wamid` da resposta volta para o `confirmar_envio`, e o
  webhook de status da Meta preenche `entregue` e `lido`.
- **O n8n monta os valores flexionados, com as duas formas do objeto.**
- **O ato de recusar existe** (`revisar_documento_pendencia`, com tela e motivo visível
  ao cliente), e com ele a coluna do motivo.
- **A varredura foi cancelada** — o disparo do modelo 2 virou botão manual.
- **O gatilho do modelo 3 existe:** o encerramento da solicitação.

**O que saiu desta tabela em 18 e 25/08/2026:**

- **Os três modelos novos foram aprovados** em 18/08, e o aviso 2 já trocou de novo, para
  `situacao_documentos_v2`.
- **Os ramos no Code node estão no ar**, incluindo o marcador a mais do modelo 1 e a
  inversão do modelo 3.
- **O quarto modelo existe e foi testado**: `solicitacao_vencida_v1`, aprovado em 25/08 e
  disparado ponta a ponta no sandbox no mesmo dia.
- **Dois dos três itens de publicação do app saíram** — restou o e-mail de contato.
- **A tarifa foi conferida contra a cobrança real**, não só contra a calculadora.

## O que os e-mails da ALE-12 herdam desta tarefa

Aplicado em [`avisos-cliente.md`](avisos-cliente.md) em 17/08/2026: assinatura
`PSA Prado Suzuki` nos três, rótulos de botão iguais aos dos modelos, e as duas formas
do objeto.

O que **não** atravessa, e é deliberado: o e-mail resolve a flexão de número na
renderização em vez de congelar o verbo no plural, mantém o agradecimento no aviso 3, e
carrega as listas item a item, que não cabem em parâmetro de WhatsApp.
