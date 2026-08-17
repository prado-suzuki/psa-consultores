# Modelos de WhatsApp — avisos ao cliente

Os quatro modelos que a Meta precisa aprovar para o ciclo de coleta de documentos, e
a variável que alimenta cada marcador. O conteúdo é o dos
[textos de e-mail](avisos-cliente.md); aqui muda o formato, a categoria e a
submissão.

Tarefa **ALE-11**. Idioma `pt_BR`, categoria **utility** e tipo **Padrão** nos quatro —
nenhum é promocional. Redação revisada pela Patrícia Melo em 11/08/2026; corpos
adaptados ao formato da Meta e **submetidos em 12/08/2026**.

Contexto da conta, identificadores e a decisão pela API oficial estão em
[`whatsapp-meta-onboarding.md`](whatsapp-meta-onboarding.md).

| # | Modelo | `notificacao_tipo` | Marc. | Botão | Dispara |
|---|---|---|---|---|---|
| 1 | `solicitacao_enviada` | idem | 3 | Enviar meus documentos | clique em Enviar solicitação |
| 2 | `cobranca_pendencia` | idem | 4 | Enviar meus documentos | varredura diária |
| 3 | `documento_aprovado` | idem | 3 | Ver meus documentos | envio completo ou solicitação encerrada |
| 4 | `documento_recusado` | idem | 2 | Reenviar meus documentos | conferência de um lote |

O nome do modelo na Meta é o próprio valor de `notificacao_tipo`, para o fluxo derivar
o modelo do tipo da notificação sem tabela de tradução. Canal `whatsapp` no enum
`notificacao_canal`.

**Assinatura: `PSA Prado Suzuki`, no componente Rodapé** — não no corpo. A marca migrou
em 12/08/2026, e o rodapé renderiza menor e acinzentado, como assinatura, sem consumir o
limite do corpo.

**Botão dos quatro:** Chamada para ação · Acessar o site · URL **estática**
`https://psaconsultores.com.br/cliente`, fixa e sem sufixo dinâmico. Não há link profundo
por solicitação — a coleta é renderizada dentro de
`src/pages/cliente/ClienteDashboard.tsx`. Usar o domínio institucional e não o
`PUBLISHED_URL` (`psa-consultores.lovable.app`) é deliberado: o revisor da Meta olha se a
URL tem relação com o negócio, e a URL é **imutável depois de aprovada**.

**Período de validade: 12 horas** nos quatro, o maior valor oferecido. Sem isso vale o
padrão de **10 minutos** — mensagem não entregue nesse prazo é descartada, não cobrada e
o cliente nunca a vê. Para aviso assíncrono, que o cliente lê quando puder, 10 minutos
perde entrega em silêncio.

## O que o formato da Meta impõe

Constatado na submissão, não só na documentação:

- Corpo de até 1.024 caracteres, e **não pode começar nem terminar em marcador**.
  Terminar com marcador seguido de ponto **não basta** — a Meta exige texto real depois
  do último parâmetro. Foi o que reprovou a primeira versão do modelo 2.
- **Parâmetro não aceita quebra de linha**, tabulação nem mais de quatro espaços
  seguidos — logo nenhum marcador carrega lista de várias linhas.
- O modelo é fixo: **não há parágrafo condicional**. Um corpo aprovado sai sempre
  igual, com todos os parâmetros preenchidos.
- **Parâmetro vazio impede o envio.** Toda variável tem de ter valor garantido. Cada
  marcador a mais é mais uma forma de a mensagem não sair.
- Rótulo de botão: até 40 caracteres, e **fixo na aprovação** — mudar o rótulo é
  ressubmeter e esperar a fila.
- **Cabeçalho é para título, não para saudação.** Renderiza em negrito e destacado, e tem
  numeração de marcador própria, separada da do corpo. A saudação vai no corpo.
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

O que isso significa por tipo de valor:

| Valor | 1 | Vários |
|---|---|---|
| Contagem | `1 documento` | `52 documentos` |
| Contagem com artigo | `o documento` | `os 52 documentos` |
| Verbo e particípio | `1 precisa ser reenviado` | `6 precisam ser reenviados` |
| Frase de pendência | `Falta 1 dos 52 documentos solicitados` | `Faltam 6 dos 52 documentos solicitados` |

**O objeto precisa de duas formas**, porque a preposição contrai com o artigo e o artigo
varia com o número:

| Contexto | 1 produto | Vários |
|---|---|---|
| modelos 1 e 3 (`de`) | `do seu projeto de X` | `dos seus projetos de X e Y` |
| modelo 2 (`com`) | `o seu projeto de X` | `os seus projetos de X e Y` |

Separador da lista: **vírgula**, com `e` antes do último. Avaliamos ponto e vírgula
porque metade do catálogo OSG tem vírgula no próprio nome — `Diagnóstico Societário,
Sucessório e Governança` — e uma lista por vírgula fica indistinguível de um produto
composto. Ficou vírgula mesmo: são **2 OS multiproduto na base inteira**, o "e" seguido de
"e" é corrente em português, e o separador vive no valor da variável, então trocar depois
não passa pela Meta.

---

## 1. `solicitacao_enviada`

```
Olá, Sr(a). {{1}}.

Já está disponível no portal do cliente a relação de documentos necessários {{2}}: *{{3}}*, cada um com a orientação de envio.
```

**Rodapé** `PSA Prado Suzuki` · **Botão** URL fixa, rótulo `Enviar meus documentos`

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo Silva` |
| `{{2}}` | objeto na forma `de`, com preposição e artigo flexionados | `aos seus projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{3}}` | contagem de `solicitacao_item` com `status = 'ativo'`, com o substantivo | `52 documentos` |

O objeto entra depois de **"necessários"** porque a preposição `a` contrai com o artigo,
e o artigo varia com o número: `ao seu projeto` / `aos seus projetos`.

Saiu do texto original apenas o verbo **`são`**, que é concordância de número — os
dois-pontos cumprem a função, e assim o negrito cai só na contagem, sem pegar verbo.

---

## 2. `cobranca_pendencia`

```
Olá, Sr(a). {{1}}.

{{2}} para seguirmos com {{3}}.

Prazo de envio: *{{4}}*

A relação dos pendentes, com a orientação de envio de cada um, está no portal do cliente.
```

**Rodapé** `PSA Prado Suzuki` · **Botão** URL fixa, rótulo `Enviar meus documentos`

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo Silva` |
| `{{2}}` | frase de pendência: verbo, pendentes e total, tudo flexionado junto | `Faltam 6 dos 52 documentos solicitados` |
| `{{3}}` | objeto na forma `com` | `os seus projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{4}}` | prazo de envio: `enviada_em` mais 30 dias. Depois de vencido, o mesmo marcador leva o aviso entre parênteses | `03/09/2026` |

**A ordem mudou em relação ao e-mail, e o motivo é a regra do marcador final.** Com a
assinatura no rodapé, terminar em `Prazo de envio: {{4}}` reprovaria — e ponto final
depois do marcador não resolve. O prazo subiu e a frase da relação fecha o texto.

**O portal migrou para o fecho.** No e-mail ele aparece no meio e a frase final diz "está
lá". Com o prazo entre as duas, o "lá" ficaria apontando dois parágrafos atrás. O portal
passou a ser citado **uma vez só, no fecho** — que é exatamente o que o guia de estilo da
ALE-12 pede.

**O prazo vai em linha rotulada, e não em pedido.** A cobrança repete, e "envie até
03/09" deixa de ser verdade no dia 4 — `Prazo de envio: 03/09/2026` é verdade sempre.
O vencimento entra no próprio valor do marcador, então muda sem passar pela Meta.

**Negrito só no prazo:** numa cobrança é a data que o cliente age em cima, e a contagem
está dentro de uma frase longa, onde o destaque se dilui.

O checklist é **calculado**: cada `solicitacao_item` com `status = 'ativo'` é
expandido pela `granularidade` (`cliente`, `pessoa_pf`, `pessoa_pj`,
`matricula_rural`, `matricula_urbana`) sobre as entidades do cliente; sai o que já tem
arquivo vinculado ao mesmo `documento_tipo_id` e à mesma entidade, e sai o que está em
`solicitacao_item_nao_aplicavel`.

---

## 3. `documento_aprovado`

```
Olá, Sr(a). {{1}}.

Recebemos e conferimos {{2}} {{3}}. *Não há pendências.*

A próxima etapa é a execução do projeto, e entraremos em contato ao concluí-la.
```

**Rodapé** `PSA Prado Suzuki` · **Botão** URL fixa, rótulo `Ver meus documentos`

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo Silva` |
| `{{2}}` | documentos aceitos no pedido, acumulado, com artigo e substantivo | `os 52 documentos` |
| `{{3}}` | objeto na forma `de` | `dos seus projetos de Estruturação Societária e Planejamento Sucessório` |

**⚠️ Este foi recusado pelo classificador de categoria antes da submissão.** A Meta
acusou "a categoria não corresponde" e recomendou **Marketing**, avisando que o modelo
seria rejeitado. O que destravou foi cortar a última linha do texto original:

> ~~Agradecemos a agilidade no envio.~~

Cortesia sem conteúdo transacional puxa utilidade para marketing. O restante do corpo —
"Recebemos e conferimos… Não há pendências" — é inequivocamente transacional e passou.

**A regra a guardar:** agradecimento e projeção de etapa futura empurram utility para
marketing. O documento previa esse risco no `cobranca_pendencia`, por ele sair sem ação
do cliente; foi o `documento_aprovado` que bateu — e **antes** da submissão, não depois.

**Negrito em texto fixo, não em variável** — é o único dos quatro. Aqui não há ação
pedida: o que o cliente procura é o desfecho, e o desfecho é "não há pendências". Nos
outros o destaque é um número que muda; aqui é uma afirmação sempre igual.

**É o aviso de fechamento, não de lote.** Sai quando o cliente enviou tudo ou quando a
solicitação é encerrada. O nome do modelo é `documento_aprovado` por causa do valor do
enum, mas o gatilho é a conclusão da conferência do pedido. O corpo afirma completude
e nomeia a etapa seguinte, então **só sai quando não houver documento pendente**, seja
por recebimento, seja por dispensa.

A etapa é **texto fixo — "a execução do projeto"** —, e não marcador: o cliente pode
ter um projeto por produto contratado, e não existe campo que diga em que ponto cada
um está. Avaliamos um marcador só para `do projeto` / `dos projetos` e descartamos: são 2
OS multiproduto na base, e cada marcador a mais é mais uma forma de o envio falhar por
valor vazio.

---

## 4. `documento_recusado`

```
Olá, Sr(a). {{1}}.

Na conferência dos documentos, *{{2}}*.

O motivo de cada um está no portal do cliente, com a orientação de envio.
```

**Rodapé** `PSA Prado Suzuki` · **Botão** URL fixa, rótulo `Reenviar meus documentos`

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo Silva` |
| `{{2}}` | documentos não aceitos na conferência do lote, **sem o substantivo**, com verbo e particípio flexionados | `6 precisam ser reenviados` |

**O `{{2}}` não leva `documentos`** — o substantivo já está em "Na conferência dos
documentos". Repetir produz "Na conferência dos documentos, 6 documentos precisam ser
reenviados". E tirar o substantivo do texto fixo em vez do marcador deixaria "Na
conferência," pendurado, sem objeto.

O **motivo**, que o card lista como campo deste modelo, não vira marcador: o aviso é
por lote, são vários motivos, e parâmetro não aceita quebra de linha. Fica no portal e
no e-mail. A coluna não existe e é gap declarado nas pendências — não confundir com o
motivo da falta, que a EDU-6 descartou em 09/08/2026.

## De onde saem nome, telefone e responsável

`destinatarios_cliente(cliente_id)` devolve `nome`, `email` e `telefone` — a mesma
função da EDU-1 que o e-mail usa. O nome é o do **representante com acesso ao portal**
(`representante` com `user_id` não nulo), e não `cliente.nome`, que é o nome do grupo.
O envio é gravado por `registrar_envio(...)` com o canal `whatsapp` e o destino em
`notificacao_envio.destinatario_telefone`.

O objeto sai de `solicitacao.ordem_servico_id` → `os_produtos_contratados` →
`produto_segmento.nome`.

Decidido em 10/08/2026: **um aviso por lote de conferência, não por documento.** É por
isso que os modelos 3 e 4 levam quantidade, e não o nome do documento — singular
significaria uma mensagem paga por documento.

## Estado de cada modelo

| Modelo | Variáveis | Pode disparar |
|---|---|---|
| `solicitacao_enviada` | nome e total existem; o objeto depende de `ordem_servico_id`, nulo em 6 de 10 | assim que o canal for ligado no fluxo |
| `cobranca_pendencia` | idem; o pendente é calculado sobre `solicitacao_item`, `documento_arquivo` e `solicitacao_item_nao_aplicavel` | com a varredura, na próxima sprint |
| `documento_aprovado` | idem | o gatilho existe em dado — checklist zerado ou `solicitacao.encerrada_em` —, mas nenhuma tarefa o liga ao aviso |
| `documento_recusado` | a quantidade depende do ato de recusar, que nenhuma tarefa desta sprint cria | próxima sprint |

Dois dos quatro ficarão **aprovados e sem disparo** até a próxima sprint: o
`documento_aprovado` porque nenhuma tarefa liga o disparo, e o `documento_recusado`
porque o ato de recusar não existe. Submeter antes é deliberado: a fila de aprovação
da Meta é o gargalo, e cada modelo tem fila própria.

**Com o objeto agora carregando a preposição e o artigo, o `ordem_servico_id` nulo deixa
de produzir frase capenga e passa a produzir frase quebrada** — "a relação de documentos
necessários ." Parâmetro vazio já impede o envio de qualquer forma, mas fica registrado
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
**Real brasileiro (BRL)** e categoria **Utilidade**. Reconferir na data da submissão:
muda por mercado e por data.

**Uma mensagem por representante, não por cliente.** `destinatarios_cliente` devolve
uma linha por representante com acesso ao portal — hoje 23 clientes e 38
destinatários, média de 1,65. Um cliente com quatro representantes custa quatro
mensagens por evento.

## Submissão

Pelo Gerenciador de WhatsApp, em Modelos de mensagens → Gerenciar modelos → Criar modelo.
Cada modelo pede nome, idioma, categoria, tipo, corpo e **um exemplo de cada marcador**,
sem quebra de linha e sem espaço múltiplo.

Não usar a **Biblioteca de modelos**: são 157 modelos pré-aprovados em inglês, de
cenários de e-commerce e agendamento. Nenhum cobre coleta de documentos de projeto de
consultoria.

O `cobranca_pendencia` é o de maior risco em produção, e não pela redação: é o único que
sai sem ação do cliente, e a reclassificação de utility para marketing acontece **depois**
da aprovação, olhando o uso real — muda custo e política sem avisar. A regra de não
repetir no mesmo dia vem na ALE-1 (19/08), pelo ajudante `jaEnviadoHoje`, que no
WhatsApp precisa comparar `destinatario_telefone`.

A verificação do negócio (ALE-10) **saiu aprovada em 12/08/2026**, antes da submissão dos
modelos — então vale o ramo cheio do critério de aceite, não o de contingência.

## Fora do escopo, declarado no card

O card lista estes três em `NÃO FAZ PARTE`. Ficam registrados porque os modelos os
descrevem, e é por isso que dois dos quatro serão aprovados e sem disparo.

| Item | Onde |
|---|---|
| Ligar o canal no fluxo de automação | próxima sprint |
| Implementar o ato de aceitar e recusar documento | próxima sprint; é o que solta o modelo 4 |
| Periodicidade da varredura que dispara a cobrança | próxima sprint; a regra de não repetir no mesmo dia vem na ALE-1 (19/08) |

## Dependências para o disparo

| Dependência | Dono |
|---|---|
| **`representante.telefone` preenchido em 7 de 38**, contra e-mail em 38 de 38 — sem telefone o modelo aprovado não alcança o cliente. É a maior limitação do canal | cadastro; nenhuma tarefa desta sprint preenche |
| `solicitacao.ordem_servico_id` nulo em **6 de 10** — `gerar_solicitacao_os` só grava a OS ao criar o cabeçalho, e sem ela o objeto vai vazio e o modelo não dispara | Eduardo, no gerador; ou exigência de OS na tela de envio |
| O n8n precisa montar os valores já flexionados, incluindo as duas formas do objeto | próxima sprint |
| Coluna do motivo da recusa: sem coluna, sem tarefa e sem item de backlog | próxima sprint, junto do ato de recusar |
| Gatilho do modelo 3: o dado existe (checklist zerado ou `solicitacao.encerrada_em`), mas nenhuma tarefa liga o disparo | próxima sprint |
| Checklist da solicitação, gerado ou declarado — o `useGerarChecklistCliente` já gera por entidade, e a EDU-9 registra "não haverá cálculo de faltante". A chave por solicitação já está fixada, e o marcador não muda nos dois casos | EDU-6 e EDU-9 |

**Estado em 17/08/2026 — o que saiu desta tabela.** Três linhas foram resolvidas:

- **O canal está ligado**: workflow próprio, ativo, com rota e segredo próprios
  (`N8N_OSG_WA_WEBHOOK_URL`). O `wamid` da resposta volta para o `confirmar_envio`, e o
  webhook de status da Meta preenche `entregue` e `lido` — medido em produção com
  9s até o segundo tique e 210s até a leitura.
- **O n8n monta os valores flexionados, com as duas formas do objeto.** A forma `a`
  ("aos seus projetos de") serve o modelo 1; a forma `de` ("dos seus projetos de")
  serve o modelo 3. São formas diferentes do mesmo dado, e é por isso que a **ordem
  dos parâmetros difere entre os dois modelos**: no 1, `{{2}}` é o objeto e `{{3}}` a
  contagem; no 3, `{{2}}` é a contagem **com artigo** e `{{3}}` o objeto. Trocar a
  ordem não faz o envio falhar — monta uma frase sem sentido, que é pior.
- **O gatilho do modelo 3 existe:** o encerramento da solicitação.

Segue de pé a linha do **`representante.telefone`**, que é a maior limitação do canal:
medidos 8 de 38 em 14/08/2026. O modelo aprovado, o número verificado e o fluxo ativo
não mudam esse alcance.

## O que os e-mails da ALE-12 herdam desta tarefa

Não é mudança automática — precisa ser aplicada em
[`avisos-cliente.md`](avisos-cliente.md):

- **Assinatura `PSA Prado Suzuki`** nos quatro, no lugar de `PSA Consultores`
- A flexão de número pode continuar em parênteses no e-mail, que aceita melhor
  `documento(s)` que o WhatsApp — mas o objeto tem o mesmo problema de artigo e
  preposição com múltiplos produtos
