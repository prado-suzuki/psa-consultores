# Avisos ao cliente — textos de e-mail

Os quatro textos que o cliente recebe por e-mail no ciclo de coleta de documentos, e
os campos que cada um usa. Versionados aqui para não viverem só dentro do fluxo n8n,
como acontece com os e-mails de chamado.

Tarefa **ALE-12**. Os modelos de WhatsApp são outro artefato, da **ALE-11**
(`whatsapp-templates.md`): mesmo conteúdo, corpo e numeração próprios.

| # | Aviso | `notificacao_tipo` | Dispara | Detalhe | Marc. |
|---|---|---|---|---|---|
| 1 | Solicitação enviada | `solicitacao_enviada` | clique em Enviar solicitação | agregado | 8 |
| 2 | Cobrança de item sem resposta | `cobranca_pendencia` | varredura diária | item a item | 7 |
| 3 | Documentação conferida e aceita | `documento_aprovado` | conferência de um lote | agregado | 4 |
| 4 | Reenvio necessário | `documento_recusado` | conferência de um lote | item a item | 3 |

Canal `email` no enum `notificacao_canal`. Os demais valores de `notificacao_tipo`
são aviso interno no sino e não têm texto aqui; os e-mails de chamado são outro canal
([`notificacoes-chamados.md`](notificacoes-chamados.md)).

## Como estes textos são escritos

- Tratamento formal: `Prezado(a) {{1}},` na abertura, `Atenciosamente` no fechamento.
- Primeira pessoa do plural. A PSA não fala de si na terceira pessoa num e-mail que
  ela assina.
- Seco e transacional, porque vão à Meta como mensagens **utilitárias**: sem chamada
  para ação genérica, link encurtado ou emoji.
- A direção do documento fica explícita no assunto, pela preposição — **"à PSA"**
  quando o cliente envia, **"pela PSA"** ou "conferida" quando a PSA recebeu.
- Nenhum pede resposta nem indica canal de retorno: o único destino é o portal.
- Rótulo de botão na primeira pessoa do destinatário, nunca do remetente.
- Marcadores numerados na ordem de leitura; assunto sem marcador. A numeração não
  atravessa para o WhatsApp, que renumera.
- Cada texto funciona com um item ou com dez, e com número zerado.

---

## 1. Solicitação enviada

**Assunto:** `Documentos a serem enviados à PSA Consultores`

```
Prezado(a) {{1}},

Em {{2}} relacionamos os documentos necessários ao andamento do seu processo, a
serem enviados por meio do portal do cliente. São {{3}} documentos, distribuídos
por tema:

Pessoas Físicas: {{4}}
Pessoas Jurídicas: {{5}}
Bens e Imóveis: {{6}}
Outros documentos: {{7}}

A relação completa, com a orientação correspondente a cada item, está disponível
em:
{{8}}

O envio pode ser feito parcialmente, por tema — não é necessário reuni-los
previamente.

Atenciosamente,
PSA Consultores
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | data de envio da solicitação, `dd/mm/aaaa` |
| `{{3}}` | total de documentos relacionados |
| `{{4}}`–`{{7}}` | quantidade em cada tema, na ordem `pf`, `pj`, `bens_imoveis`, `outros`. **Tema com zero itens: omitir a linha inteira**, em vez de imprimir `0` |
| `{{8}}` | endereço do portal do cliente |

---

## 2. Cobrança de item sem resposta

**Assunto:** `Documentos pendentes de envio à PSA Consultores`

```
Prezado(a) {{1}},

A relação de documentos que solicitamos em {{2}}, há {{3}} dias, ainda não foi
concluída. Dos {{4}} documentos relacionados, {{5}} seguem pendentes:

{{6}}

O envio pode continuar de onde parou, por tema — não é necessário reunir de uma vez
os documentos que faltam. A relação completa está no portal:
{{7}}

Atenciosamente,
PSA Consultores
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | data de envio da solicitação, `dd/mm/aaaa` |
| `{{3}}` | dias corridos desde o envio |
| `{{4}}` | total de documentos relacionados |
| `{{5}}` | quantidade pendente — contagem de linhas de `solicitacao_falta`, que pode ser maior que o número de linhas exibidas em `{{6}}` |
| `{{6}}` | o que falta, **uma linha por documento**, com os donos separados por vírgula: `Certidão de casamento — Maria Silva, João Silva`. A tabela tem uma linha por documento **e** entidade, e sem o agrupamento o e-mail passa de 300 linhas. **Bloco omitido quando não há falta registrada** |
| `{{7}}` | endereço do portal do cliente |

---

## 3. Documentação conferida e aceita

**Assunto:** `Documentação conferida e aceita — PSA Consultores`

```
Prezado(a) {{1}},

Conferimos a documentação que você enviou: {{2}} documentos foram aceitos e não
precisam de nova ação.

A relação ainda não está completa — seguem {{3}} documentos pendentes, que você
acompanha no portal:
{{4}}

Atenciosamente,
PSA Consultores
```

Quando não há mais nada pendente, o segundo parágrafo é substituído por este e o
`{{3}}` não é usado:

```
A relação está completa: recebemos e conferimos todos os documentos solicitados.
Nenhuma ação sua é necessária.
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | quantidade de documentos aceitos nesta conferência |
| `{{3}}` | quantidade que segue pendente — contagem de `solicitacao_falta` |
| `{{4}}` | endereço do portal do cliente |

Decidido em 10/08/2026: **um aviso por lote de conferência, não por documento** —
vale também para o modelo de WhatsApp.

---

## 4. Reenvio necessário

**Assunto:** `Solicitação de reenvio de documentação — PSA Consultores`

```
Prezado(a) {{1}},

Ao conferir a documentação que você enviou, identificamos o que precisa de
ajuste. Para cada item, o motivo:

{{2}}

O reenvio pode ser feito no portal:
{{3}}

Permanecemos à disposição para esclarecer o ajuste necessário.

Atenciosamente,
PSA Consultores
```

| Marcador | Conteúdo |
|---|---|
| `{{1}}` | nome do destinatário |
| `{{2}}` | um par `nome do documento — motivo` por linha. Sem agrupamento, ao contrário do aviso 2: o motivo é de cada arquivo conferido |
| `{{3}}` | endereço do portal do cliente |

## Botões, na versão HTML

No HTML o marcador do portal deixa de ser URL visível e passa a ser o destino do
botão.

| Aviso | Botão |
|---|---|
| 1 | Enviar meus documentos → |
| 2 | Continuar meu envio → |
| 3 | Ver o que ainda preciso enviar → |
| 4 | Reenviar meus documentos → |

## De onde vem cada campo

| Conteúdo | Origem |
|---|---|
| nome do destinatário | `destinatarios_cliente(cliente_id).nome`, de `representante.nome` |
| e-mail do destinatário | `destinatarios_cliente(cliente_id).email` |
| data de envio | `solicitacao.enviada_em` |
| dias corridos desde o envio | `current_date - solicitacao.enviada_em::date` |
| total de documentos relacionados | contagem de `solicitacao_item` com `status = 'ativo'` |
| quantidade por tema | a mesma contagem por `solicitacao_item.grupo` |
| quantidade pendente | contagem de `solicitacao_falta` da solicitação |
| o que falta, item a item | `solicitacao_falta`: `documento_tipo.documento` pelo `documento_tipo_id` ou o campo `documento` escrito à mão, mais o dono (`pessoa_id` / `bem_id` / `matricula_id`; os três nulos = o cliente) |
| documentos aceitos, contagem | conferência de lote |
| nome do documento | `documento_tipo.documento` pelo `documento_arquivo.documento_tipo_id`; na falta, `nome_original` |
| motivo do ajuste | — |
| endereço do portal | `PUBLISHED_URL` + caminho do portal. Não há link profundo por solicitação: a coleta é renderizada dentro de `src/pages/cliente/ClienteDashboard.tsx` |
| papel do destinatário | `notificacao_envio.destinatario_papel` (`cliente \| responsavel \| gestor`) |

## Pendências

Três campos usados acima ainda não existem no banco. Estão escritos aqui de
propósito: os avisos que dependem deles só disparam na próxima sprint, e a fila de
aprovação da Meta é o gargalo, então os textos seguem para submissão antes.

| Campo | Situação |
|---|---|
| quantidade pendente e a lista do que falta (aviso 2) | `solicitacao_falta` chega na migração da EDU-6, em 14/08 desta sprint |
| contagem de aceitos (aviso 3) | depende do ato de aceitar, que não existe: `documento_arquivo.status` tem só `pendente` e `ativo`, e o upload já grava `ativo` |
| motivo do ajuste (aviso 4) | sem coluna em `documento_arquivo`. Vem junto do ato de recusar, na próxima sprint |

Também da próxima sprint: teto de frequência na varredura do aviso 2, que é o único
dos quatro que repete para o mesmo destinatário.
