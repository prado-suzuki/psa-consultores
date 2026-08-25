# Aviso 4 — Solicitação sem nenhum documento recebido

**Redação validada pela coordenação em 24/08/2026**, com ajuste dela no primeiro
parágrafo. Molde de
[`docs/geral/avisos-cliente-validacao.md`](../../geral/avisos-cliente-validacao.md), para
entrar naquele arquivo como §4.

**Quando sai:** a solicitação foi enviada, segue aberta, e **nenhum documento chegou**.
Repete a cada período enquanto continuar assim. É o único aviso do ciclo em que não há
lista a mostrar — nada chegou —, então e-mail e WhatsApp dizem a mesma frase.

**Por que não reusa nenhum dos 8 modelos aprovados:** o aviso 2 (`situacao_documentos_v2`)
tem `os motivos para reenvio` em **texto fixo e imutável**, e falar de motivo de reenvio a
quem não enviou nada é falar de algo que não existe.

Exemplo com o mesmo cliente dos outros três: **Carlos Eduardo**, 52 documentos,
solicitados em 04/08/2026, prazo 03/09/2026, projetos de Estruturação Societária e
Planejamento Sucessório.

---

# E-MAIL

**Assunto:** Solicitação de documentos em aberto – Estruturação Societária e Planejamento Sucessório

```
Olá, Sr(a). Carlos Eduardo.

Até o momento, não consta o recebimento de nenhum documento referente aos
projetos de Estruturação Societária e Planejamento Sucessório.

O prazo para envio venceu em 03/09/2026.

A relação completa dos documentos e as orientações de envio estão disponíveis
no portal do cliente.

Atenciosamente,
Ana Paula Ribeiro
PSA Prado Suzuki


                      [ Enviar documentos → ]
```

| Marcador | O que colocar |
|---|---|
| `{{1}}` | nome do representante do cliente |
| `{{2}}` | os projetos **no assunto**, sem preposição |
| `{{3}}` | os projetos **no corpo**, forma `a` — `referente aos projetos de X` |
| `{{4}}` | prazo de envio |
| `{{5}}` | nome do responsável pela solicitação |

**A linha do prazo é condicional aqui, e no WhatsApp não.** O e-mail é montado por nós:
`O prazo para envio é {{4}}.` enquanto o prazo vale, `O prazo para envio venceu em {{4}}.`
depois. No modelo da Meta isso não existe — ver a decisão 1.

---

# WHATSAPP — `solicitacao_sem_documento_v1`

### Corpo

```
Olá, Sr(a). {{1}}.

Até o momento, *não consta o recebimento de nenhum documento* referente {{2}}.

Prazo para envio: {{3}}

A relação completa dos documentos e as orientações de envio estão disponíveis no portal do cliente.
```

**Negrito:** só na frase do recebimento. **Botão:** `Enviar documentos`

308 caracteres preenchido, contra 341, 338 e 300 dos três aprovados. Quatro parágrafos,
não começa nem termina em marcador.

### Variáveis

| Marcador | O que colocar | Exemplo |
|---|---|---|
| `{{1}}` | nome do representante do cliente | `Carlos Eduardo` |
| `{{2}}` | os projetos na **forma `a`**, com preposição e artigo já flexionados | `aos projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{3}}` | prazo de envio, com o estado quando vencido | `03/09/2026 (vencido)` |

⚠️ **A forma do objeto mudou com o ajuste da coordenação: este aviso usa a forma `a`, como
o aviso 1, e não a forma `de` dos avisos 2 e 3.** O texto fixo é `referente {{2}}`, então
`dos projetos de X` produziria *"referente dos projetos de X"* — frase quebrada que **sai
assim para o cliente**, porque parâmetro com valor não falha o envio. O n8n já monta as
duas formas; aqui é a `a`.

Flexão do `{{2}}`: `ao projeto de X` com um produto, `aos projetos de X e Y` com vários.

### Amostras de variáveis — na ordem, para copiar

```
{{1}}   Carlos Eduardo
{{2}}   aos projetos de Estruturação Societária e Planejamento Sucessório
{{3}}   03/09/2026 (vencido)
```

### Como sai

> Olá, Sr(a). Carlos Eduardo.
>
> Até o momento, **não consta o recebimento de nenhum documento** referente aos projetos de Estruturação Societária e Planejamento Sucessório.
>
> Prazo para envio: 03/09/2026 (vencido)
>
> A relação completa dos documentos e as orientações de envio estão disponíveis no portal do cliente.
>
> PSA Prado Suzuki
> `[ Enviar documentos ]`

---

# O ajuste da coordenação, e o que ele ensina

A versão enviada para validação dizia *"não consta nenhum documento recebido **na
documentação dos projetos** de X"*. O parecer:

> Fiz um ajuste na redação do primeiro parágrafo porque a construção "documento recebido na
> documentação dos projetos" ficou redundante e pouco fluida. Alterei para "não consta o
> recebimento de nenhum documento referente aos projetos", que deixa a mensagem mais clara
> e adequada à comunicação com o cliente. Nos próximos templates, vale revisar
> especialmente redundâncias, fluidez e relação entre os termos antes de enviar para
> validação.

Três movimentos, e vale reconhecer cada um porque eles se repetem:

1. **`recebido` → `o recebimento`.** Nominalizou o particípio. O sujeito passa a ser o fato,
   não o documento — e é o mesmo movimento dela no aviso 2, quando trocou *"precisam ser
   reenviados"* por *"que necessitam de reenvio"*.
2. **`na documentação dos projetos` → `referente aos projetos`.** `documento` e
   `documentação` na mesma frase era a redundância. Sair de `documentação` também resolveu a
   regência que eu tinha forçado com `constar em`.
3. **`A relação completa` → `A relação completa dos documentos`.** Consequência do item 2:
   sem `documentação` no primeiro parágrafo, `a relação completa` ficou sem referente. Ela
   devolveu o referente no fecho.

**Regra para o próximo modelo:** antes de mandar para validação, procurar par de palavras da
mesma família na mesma frase (`documento`/`documentação`, `envio`/`enviar`,
`solicitação`/`solicitados`) e conferir se cada termo genérico tem referente explícito.

---

# As decisões por trás do texto

## 1. O prazo, quando já venceu

Este aviso só sai **depois** do prazo, porque o prazo é `envio + 30 dias` e a primeira
cobrança sai no fim desse período. E modelo de WhatsApp **não tem parágrafo condicional**:
a marca de vencimento tem de vir dentro do valor da variável.

O rótulo `Prazo para envio:` é texto fixo e imutável depois da aprovação — é o mesmo do
aviso 2. A palavra `vencido`, não: vive dentro do valor, montado na hora, e **muda sem
passar pela Meta**.

`vencido` e não `encerrado`: encerrado sugere que a porta fechou, e o aviso existe para
pedir que o cliente envie. É também o termo que a casa já tinha fixado — o chip de status
do aviso antigo era `Em aberto` / `Prazo vencido`.

**A data não recalcula a cada aviso.** É sempre `enviada_em + 30 dias`, decisão de
11/08/2026, então na terceira cobrança ela continua dizendo 03/09/2026.

## 2. Por que a frase do recebimento é texto fixo, e não marcador

O aviso **só dispara quando o número é zero** — logo a frase é constante. Sendo fixa, ela
some do marcador, e com ela vão embora a flexão de singular e um marcador inteiro.
Parâmetro vazio impede o envio, então cada marcador a menos é uma falha a menos.

É também o que permite o negrito cair num trecho curto, como no `documentacao_conferida_v1`
(`*sem pendências no momento*`), em vez de virar mancha sobre um bloco longo.

**O negrito não veio no parecer dela** — ela devolveu texto puro, como fez com os três de
17/08. Ficou na frase do recebimento, que é onde ele estava na prévia que ela revisou e não
questionou. Negrito é corpo, logo imutável depois de aprovado.

## 3. A direção do documento tem de ficar explícita

Três tentativas falharam antes de acertar, e a prévia do painel foi quem mostrou as duas
primeiras:

| Tentativa | O problema |
|---|---|
| *"O envio da documentação … ainda não teve início"* | lê como se a **PSA** não tivesse começado; cliente conclui que não há nada a fazer |
| *"nenhum documento foi recebido **na** documentação"* | regência errada — não se recebe documento *na* documentação |
| *"não consta nenhum documento recebido na documentação dos projetos"* | regência resolvida, mas `documento`/`documentação` ficou redundante (o ajuste da coordenação) |

A PSA também entrega documento ao cliente (gerador e downloads), então qualquer frase sem
direção é ambígua — armadilha que a ALE-12 já tinha registrado. `recebimento` resolve:
só pode ser do nosso lado.

## 4. A periodicidade — pergunta de 17/08, ainda em aberto

*"Depois desses 30 dias, o sistema começará a enviar as notificações. Mas de quantos em
quantos dias cobramos isso? 30 também? ou menos?"*

**O texto não nomeia o intervalo, de propósito.** Então 30, 15 ou 45 dias é decisão que
pode mudar depois, sem submeter modelo novo nem esperar fila de aprovação.

---

# Anexo técnico — para a submissão

| Campo do formulário | Valor |
|---|---|
| Nome | `solicitacao_sem_documento_v1` |
| Categoria | **Utilidade** · tipo **Padrão** |
| Idioma | **Português (BR)** — `pt_BR` |
| Cabeçalho | **vazio** |
| Rodapé | `PSA Prado Suzuki` |
| Botões | Chamada para ação › Acessar o site › URL **estática** `https://psaconsultores.com.br/cliente` |
| Rótulo do botão | `Enviar documentos` |
| Período de validade | **12 horas no painel**, e 30 dias por API depois — ver abaixo |

**A validade é o campo mais mal explicado do formulário, e a documentação briga com ele.**
A documentação da Meta (*Configure message time-to-live*) diz que utilidade tem padrão de
**30 dias**, com faixa customizável de **30 segundos a 12 horas** — o painel só permite
**reduzir**. Mas o formulário de criação diz, com estas palavras: *"Se você não definir um
período de validade personalizado, o período de validade padrão de **10 minutos** para
mensagem do WhatsApp será aplicado."*

**Não há como saber qual vale**: nenhum dos nove modelos da conta tem o campo vazio, todos
estão em 43200s. E a assimetria decide o que fazer — em branco vale 30 dias **ou** 10
minutos, e o lado ruim é muito pior que as 12h.

Então: **preencher 12h no painel** (piso sem risco) e **subir para 30 dias por API**, com
valor explícito, que não depende de padrão herdado:
`POST /<TEMPLATE_ID>` com `message_send_ttl_seconds=-1`, que a documentação define como 30
dias para utilidade. Ler de volta pela API para confirmar o que ficou gravado.

Mensagem não entregue no prazo é **descartada em silêncio** — não chega erro, a linha fica
em `enviado` para sempre. Num aviso que só existe para alcançar quem está inerte há 30
dias, 12h é a pior escolha possível.

Se a troca de TTL **não** recolocar o modelo em análise — a documentação prevê a troca e
não menciona isso; a regra de "editar tira do ar" está documentada para o **conteúdo** —,
então os oito aprovados também podem ser corrigidos. Descobrir é barato: corrigir primeiro
um que já esteja em análise, depois **um** aprovado, e conferir o status antes do resto.

**Decidido em 24/08/2026: fica em 12h por ora.** O `solicitacao_vencida_v1` foi submetido
com 43200s, como os outros oito, e a subida para 30 dias sai desta sprint — vira assunto de
algumas sprints à frente, junto da correção dos outros oito. O que fica registrado é o
custo aceito: mensagem não entregue em 12h é descartada em silêncio, e este aviso é
exatamente o que mais sofre com isso.

⚠️ **Confira a prévia parágrafo por parágrafo antes de submeter.** Quebra de linha no corpo
é literal e imutável — o `situacao_documentos_v2`, aprovado e no ar, carrega uma quebra
solta no meio da última frase (`… os motivos para reenvio estão` / `disponíveis no portal
do cliente.`), e isso não tem mais correção.

### De onde sai cada valor

| Marcador | Origem |
|---|---|
| `{{1}}` | `destinatarios_cliente(cliente_id).nome` |
| `{{2}}` | `solicitacao.ordem_servico_id` → `os_produtos_contratados` → `produto_segmento.nome`, **forma `a`** |
| `{{3}}` | `solicitacao.enviada_em` mais 30 dias, com `(vencido)` quando a data já passou |

### Fiação

O `event_type` da borda e o valor de enum são os da GES-04
([`TAREFA_cobrar-solicitacao-sem-documento.md`](TAREFA_cobrar-solicitacao-sem-documento.md)):
`notificacao_tipo` = `solicitacao_sem_documento`, migração `20260824143238` escrita e não
aplicada. O nome do modelo entra no mapa `MODELOS` do nó `Montar Template OSG`, que é o
**único** lugar onde se lê qual modelo está no ar para qual aviso. No e-mail, o ramo novo
vai no nó `Montar Avisos OSG`, e lá a linha do prazo **pode** ser condicional — é a
assimetria de sempre entre os dois canais.
