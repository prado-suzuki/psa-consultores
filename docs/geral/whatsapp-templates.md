# Modelos de WhatsApp — avisos ao cliente

Os quatro modelos que a Meta precisa aprovar para o ciclo de coleta de documentos, e
a variável que alimenta cada marcador. O conteúdo é o dos
[textos de e-mail](avisos-cliente.md); aqui muda o formato, a categoria e a
submissão.

Tarefa **ALE-11**. Idioma `pt_BR` e categoria **utility** nos quatro — nenhum é
promocional. Redação revisada pela Patrícia Melo em 11/08/2026.

| # | Modelo | `notificacao_tipo` | Marc. | Botão | Dispara |
|---|---|---|---|---|---|
| 1 | `solicitacao_enviada` | idem | 3 | Enviar meus documentos | clique em Enviar solicitação |
| 2 | `cobranca_pendencia` | idem | 5 | Enviar meus documentos | varredura diária |
| 3 | `documento_aprovado` | idem | 3 | Ver meus documentos | envio completo ou solicitação encerrada |
| 4 | `documento_recusado` | idem | 2 | Reenviar meus documentos | conferência de um lote |

O nome do modelo na Meta é o próprio valor de `notificacao_tipo`, para o fluxo derivar
o modelo do tipo da notificação sem tabela de tradução. Canal `whatsapp` no enum
`notificacao_canal`.

O botão dos quatro aponta para `PUBLISHED_URL` + caminho do portal, **fixo e sem
sufixo dinâmico**: não há link profundo por solicitação — a coleta é renderizada
dentro de `src/pages/cliente/ClienteDashboard.tsx`.

## O que o formato da Meta impõe

- Corpo de até 1.024 caracteres, e **não pode começar nem terminar em marcador**.
- **Parâmetro não aceita quebra de linha**, tabulação nem mais de quatro espaços
  seguidos — logo nenhum marcador carrega lista de várias linhas.
- O modelo é fixo: **não há parágrafo condicional**. Um corpo aprovado sai sempre
  igual, com todos os parâmetros preenchidos.
- **Parâmetro vazio impede o envio.** Toda variável tem de ter valor garantido.
- Rótulo de botão: até 25 caracteres, e **fixo na aprovação** — mudar o rótulo é
  ressubmeter e esperar a fila.
- `Sr(a).` e o objeto em linha corrida são **texto fixo** do modelo; só os valores
  variáveis são marcador.

---

## 1. `solicitacao_enviada`

```
Olá, Sr(a). {{1}}.

Já está disponível no portal do cliente a relação de documentos necessários ao seu
projeto de {{2}}: são {{3}} documentos, cada um com a orientação de envio.

PSA Consultores
```

**Botão** URL fixo, rótulo `Enviar meus documentos`.

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo Silva` |
| `{{2}}` | objeto: produtos contratados na OS da solicitação, sem repetição, vírgula entre eles e `e` antes do último | `Diagnóstico Societário, Sucessório e Governança` |
| `{{3}}` | contagem de `solicitacao_item` com `status = 'ativo'` | `52` |

O objeto entra depois de **"projeto de"** porque a preposição `de` serve aos dois
gêneros: `ao Diagnóstico` e `à Constituição` quebrariam a cada produto.

---

## 2. `cobranca_pendencia`

```
Olá, Sr(a). {{1}}.

Falta(m) {{2}} dos {{3}} documentos solicitados no portal do cliente para seguirmos com
o seu projeto de {{4}}. A relação dos pendentes, com a orientação de envio de cada um,
está lá.

Prazo de envio: {{5}}

PSA Consultores
```

**Botão** URL fixo, rótulo `Enviar meus documentos`.

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo Silva` |
| `{{2}}` | documentos pendentes no checklist da solicitação | `6` |
| `{{3}}` | contagem de `solicitacao_item` com `status = 'ativo'` | `52` |
| `{{4}}` | objeto, o mesmo do modelo 1 | `Diagnóstico Societário, Sucessório e Governança` |
| `{{5}}` | prazo de envio: `enviada_em` mais 30 dias. Depois de vencido, o mesmo marcador leva o aviso entre parênteses | `03/09/2026` · `03/09/2026 (vencido)` |

**O prazo vai em linha rotulada, e não em pedido.** A cobrança repete, e "envie até
03/09" deixa de ser verdade no dia 4 — `Prazo de envio: 03/09/2026` é verdade sempre.
O vencimento entra no próprio valor do marcador, então muda sem passar pela Meta.

O checklist é **calculado**: cada `solicitacao_item` com `status = 'ativo'` é
expandido pela `granularidade` (`cliente`, `pessoa_pf`, `pessoa_pj`,
`matricula_rural`, `matricula_urbana`) sobre as entidades do cliente; sai o que já tem
arquivo vinculado ao mesmo `documento_tipo_id` e à mesma entidade, e sai o que está em
`solicitacao_item_nao_aplicavel`.

---

## 3. `documento_aprovado`

```
Olá, Sr(a). {{1}}.

Recebemos e conferimos o(s) {{2}} documento(s) do seu projeto de {{3}}. Não há
pendências.
A próxima etapa é a execução do projeto, e entraremos em contato ao concluí-la.

Agradecemos a agilidade no envio.

PSA Consultores
```

**Botão** URL fixo, rótulo `Ver meus documentos`.

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo Silva` |
| `{{2}}` | documentos aceitos no pedido, acumulado | `52` |
| `{{3}}` | objeto, o mesmo do modelo 1 | `Diagnóstico Societário, Sucessório e Governança` |

**É o aviso de fechamento, não de lote.** Sai quando o cliente enviou tudo ou quando a
solicitação é encerrada. O nome do modelo é `documento_aprovado` por causa do valor do
enum, mas o gatilho é a conclusão da conferência do pedido. O corpo afirma completude
e nomeia a etapa seguinte, então **só sai quando não houver documento pendente**, seja
por recebimento, seja por dispensa.

A etapa é **texto fixo — "a execução do projeto"** —, e não marcador: o cliente pode
ter um projeto por produto contratado, e não existe campo que diga em que ponto cada
um está.

---

## 4. `documento_recusado`

```
Olá, Sr(a). {{1}}.

Na conferência dos documentos, {{2}} precisa(m) ser reenviado(s). O motivo de cada um
está
no portal do cliente, com a orientação de envio.

PSA Consultores
```

**Botão** URL fixo, rótulo `Reenviar meus documentos`.

| Marcador | Variável | Exemplo |
|---|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` | `Carlos Eduardo Silva` |
| `{{2}}` | documentos não aceitos na conferência do lote | `2` |

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

Pelo Gerenciador de WhatsApp, no Business Manager. Cada modelo pede nome, idioma,
categoria, corpo e **um exemplo de cada marcador**, sem quebra de linha e sem espaço
múltiplo.

O `cobranca_pendencia` é o de maior risco, e não pela redação: é o único que sai sem
ação do cliente, e a reclassificação de utility para marketing acontece **depois** da
aprovação, olhando o uso real — muda custo e política sem avisar. A regra de não
repetir no mesmo dia vem na ALE-1 (19/08), pelo ajudante `jaEnviadoHoje`, que no
WhatsApp precisa comparar `destinatario_telefone`.

A submissão depende da verificação do negócio na Meta (ALE-10). Até ela sair, vale o
ramo do critério de aceite que pede os quatro modelos **prontos para submissão, com a
estimativa de custo por mensagem feita** — que é o estado deste arquivo.

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
| `solicitacao.ordem_servico_id` nulo em **6 de 10** — `gerar_solicitacao_os` só grava a OS ao criar o cabeçalho, e sem ela o objeto vai vazio e o modelo não dispara | Eduardo, no gerador; ou exigência de OS na tela de envio |
| `representante.telefone` preenchido em **7 de 38**, contra e-mail em 38 de 38 — sem telefone o modelo aprovado não alcança o cliente | cadastro; nenhuma tarefa desta sprint preenche |
| Coluna do motivo da recusa: sem coluna, sem tarefa e sem item de backlog | próxima sprint, junto do ato de recusar |
| Gatilho do modelo 3: o dado existe (checklist zerado ou `solicitacao.encerrada_em`), mas nenhuma tarefa liga o disparo | próxima sprint |
| Checklist da solicitação, gerado ou declarado — o `useGerarChecklistCliente` já gera por entidade, e a EDU-9 registra "não haverá cálculo de faltante". A chave por solicitação já está fixada, e o marcador não muda nos dois casos | EDU-6 e EDU-9 |
