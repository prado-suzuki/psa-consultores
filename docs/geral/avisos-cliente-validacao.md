# Avisos ao cliente

Redação de Patrícia Melo: os três primeiros avisos reescritos por inteiro em 17/08/2026, e
o quarto revisado em 24/08/2026.

Os exemplos usam o mesmo cliente nos três: **Carlos Eduardo**, 52 documentos,
solicitados em 04/08/2026, prazo 03/09/2026, projetos de Estruturação Societária e
Planejamento Sucessório.

---
---

# PARTE 1 — E-MAIL

---

## 1. Solicitação enviada

**Assunto:** Documentos necessários disponíveis no portal – Estruturação Societária e Planejamento Sucessório

```
Olá, Sr(a). Carlos Eduardo.

A relação de documentos necessários aos projetos de Estruturação Societária e
Planejamento Sucessório está disponível no portal do cliente, com a orientação
correspondente a cada documento.

Ao todo, são 52 documentos:

   Pessoas físicas: 18
   Pessoas jurídicas: 9
   Bens e imóveis: 21
   Demais documentos: 4

O prazo para envio é 03/09/2026.

O acompanhamento da documentação e as respectivas orientações estão disponíveis
no portal do cliente.

Atenciosamente,
[nome do responsável]
PSA Prado Suzuki


                        [ Enviar documentos → ]
```

Tema com zero documentos tem a linha omitida, em vez de aparecer com `0`.

---

## 2. Situação dos documentos

**Assunto:** Status da documentação – Estruturação Societária e Planejamento Sucessório

```
Olá, Sr(a). Carlos Eduardo.

A documentação dos projetos de Estruturação Societária e Planejamento Sucessório
está em processo de conferência.

No momento, constam 6 documentos pendentes:

   Certidão de casamento (2) — Maria Aparecida Silva e João Pedro Silva
   Comprovante de endereço (1) — Carlos Eduardo Silva
   Matrícula atualizada (2) — Fazenda Santa Rita e Sítio Boa Vista
   Contrato social consolidado (1) — Agropecuária Silva Ltda

Também foram identificados 2 documentos que necessitam de reenvio:

   Certidão de casamento — Maria Aparecida Silva: arquivo ilegível
   Contrato social consolidado — Agropecuária Silva Ltda: documento sem uma das páginas

A relação completa, as orientações de envio e os respectivos motivos para reenvio
estão disponíveis no portal do cliente.

O prazo para envio é 03/09/2026.

Atenciosamente,
[nome do responsável]
PSA Prado Suzuki


                     [ Consultar documentação → ]
```

Os dois blocos são independentes: sem documento pendente, o primeiro sai inteiro —
título, contagem e lista; sem reenvio, o segundo.

A lista de pendentes agrupa por documento, com a quantidade entre parênteses e os
donos. A de reenvio não agrupa: cada linha é um arquivo com o seu motivo.

---

## 3. Documentação conferida

**Assunto:** Documentação conferida – Estruturação Societária e Planejamento Sucessório

```
Olá, Sr(a). Carlos Eduardo.

A documentação dos projetos de Estruturação Societária e Planejamento Sucessório
está completa e conferida.

São 52 documentos, sem pendências no momento.

A relação da documentação conferida permanece disponível no portal do cliente.

A próxima etapa é a execução do projeto. Novas informações serão comunicadas
conforme o andamento das atividades.

Agradecemos pela colaboração e pelo envio da documentação.

Atenciosamente,
[nome do responsável]
PSA Prado Suzuki


                     [ Consultar documentação → ]
```

---

## 4. Solicitação em aberto

**Assunto:** Solicitação de documentos em aberto – Estruturação Societária e Planejamento Sucessório

```
Olá, Sr(a). Carlos Eduardo.

Até o momento, não consta o recebimento de nenhum documento referente aos
projetos de Estruturação Societária e Planejamento Sucessório.

O prazo para envio venceu em 03/09/2026.

A relação completa dos documentos e as orientações de envio estão disponíveis
no portal do cliente.

Atenciosamente,
[nome do responsável]
PSA Prado Suzuki


                      [ Enviar documentos → ]
```

**A linha do prazo flexiona:** `O prazo para envio é 03/09/2026.` enquanto o prazo vale,
`venceu em` depois. No WhatsApp isso não existe — lá o estado vai dentro do valor.

---
---

# PARTE 2 — WHATSAPP

## O que vale para os quatro modelos

Campos do formulário de submissão da Meta:

| Campo | Valor |
|---|---|
| Categoria | **Utilidade** |
| Idioma | **Português (BR)** — `pt_BR` |
| Cabeçalho | **deixar vazio.** A saudação vai no corpo |
| Corpo | o texto de cada modelo, abaixo |
| Rodapé | `PSA Prado Suzuki` |
| Botões | **Chamada para ação** › Acessar o site › URL **estática** `https://psaconsultores.com.br/cliente` |
| Período de validade | **12 horas** (o maior oferecido) |

Formatação no corpo: `*texto*` sai em **negrito**. O que marcar está indicado em cada
modelo.

Regras que moldam os textos:

- O corpo **não pode começar nem terminar em marcador**. Ponto depois do marcador não
  basta — a Meta exige texto real depois do último parâmetro.
- **Variável não aceita quebra de linha**, então nenhuma lista de documentos cabe no
  WhatsApp. A relação item a item fica no e-mail e no portal.
- **Não existe parágrafo condicional.** O corpo aprovado sai sempre com a mesma forma e
  todos os parâmetros preenchidos.
- **Parâmetro vazio impede o envio.** Toda variável tem de ter valor garantido.
- O rótulo do botão e a URL são **imutáveis depois da aprovação**.
- ⚠️ **Quebra de linha no corpo é literal.** Cada parágrafo dos blocos abaixo é UMA
  linha, por longa que seja. Se uma quebra entrar no meio de uma frase, o WhatsApp
  parte a frase ali na tela do cliente — e o corpo não pode ser editado depois de
  aprovado. Confira na prévia se algum parágrafo quebrou onde não devia.

---

## 1. `solicitacao_enviada_v2`

### Corpo

```
Olá, Sr(a). {{1}}.

A relação de documentos necessários {{2}} está disponível no portal do cliente.

São *{{3}}*, com a orientação correspondente a cada item.

O prazo para envio é {{4}}.

O acompanhamento da documentação está disponível no portal do cliente.
```

**Negrito:** só na contagem, `*{{3}}*`.

**Botão:** `Enviar documentos`

> A última linha foi acrescentada ao texto original: sem ela o corpo terminaria em
> `{{4}}`, e modelo que termina em marcador é reprovado. A frase é a mesma que já está
> no e-mail deste aviso.

### Variáveis

| Marcador | O que colocar | Exemplo |
|---|---|---|
| `{{1}}` | nome do representante do cliente | `Carlos Eduardo` |
| `{{2}}` | os projetos, **com preposição e artigo já flexionados** | `aos projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{3}}` | total de documentos, **com o substantivo** | `52 documentos` |
| `{{4}}` | prazo de envio | `03/09/2026` |

Flexão do `{{2}}`: `ao projeto de X` com um produto, `aos projetos de X e Y` com vários.

Flexão do `{{3}}`: `1 documento` ou `52 documentos`.

### Amostras de variáveis — na ordem, para copiar

```
{{1}}   Carlos Eduardo
{{2}}   aos projetos de Estruturação Societária e Planejamento Sucessório
{{3}}   52 documentos
{{4}}   03/09/2026
```

⚠️ **Confira a prévia antes de enviar para análise.** O `{{2}}` é o **objeto** e o
`{{3}}` é a **contagem**. Trocar os dois passa pela validação da Meta e produz
"documentos necessários 52 documentos". A prévia certa diz:

> A relação de documentos necessários **aos projetos de** Estruturação Societária e
> Planejamento Sucessório está disponível no portal do cliente.
>
> São **52 documentos**, com a orientação correspondente a cada item.

### Como sai

> Olá, Sr(a). Carlos Eduardo.
>
> A relação de documentos necessários aos projetos de Estruturação Societária e Planejamento Sucessório está disponível no portal do cliente.
>
> São **52 documentos**, com a orientação correspondente a cada item.
>
> O prazo para envio é 03/09/2026.
>
> O acompanhamento da documentação está disponível no portal do cliente.
>
> PSA Prado Suzuki
> `[ Enviar documentos ]`

---

## 2. `situacao_documentos_v2`

Substitui os dois modelos antigos: `cobranca_pendencia` e `documento_recusado`.

⚠️ **O modelo no ar é o `_v2`, e o `_v1` também está APPROVED e ficou órfão.** Medido em
25/08/2026 pela API: os dois corpos são **idênticos byte a byte**, incluindo a quebra solta
no meio da última frase (`… os motivos para reenvio estão` / `disponíveis no portal do
cliente.`). Ou seja, a duplicata não corrigiu a quebra — corrigi-la exige um `_v3`. Quem
está no ar se lê no mapa `MODELOS` do nó `Montar Template OSG`, não aqui.

### Corpo

```
Olá, Sr(a). {{1}}.

No momento, {{2}} na documentação {{3}}.

Prazo para envio: *{{4}}*

A relação completa, as orientações de envio e os motivos para reenvio estão disponíveis no portal do cliente.
```

**Negrito:** só no prazo, `*{{4}}*`.

**Botão:** `Consultar documentação`

### Variáveis

| Marcador | O que colocar | Exemplo |
|---|---|---|
| `{{1}}` | nome do representante do cliente | `Carlos Eduardo` |
| `{{2}}` | a situação, **com verbo e substantivos flexionados** | `constam 6 documentos pendentes e 2 documentos que necessitam de reenvio` |
| `{{3}}` | os projetos, **com preposição e artigo já flexionados** | `dos projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{4}}` | prazo de envio | `03/09/2026` |

Flexão do `{{3}}`: `do projeto de X` com um produto, `dos projetos de X e Y` com vários.

**O `{{2}}` tem três formas**, porque o modelo é fixo e o aviso pode sair com pendente,
com reenvio, ou com os dois:

| Situação | `{{2}}` |
|---|---|
| só pendentes | `constam 6 documentos pendentes` · no singular, `consta 1 documento pendente` |
| só reenvio | `constam 2 documentos que necessitam de reenvio` · no singular, `consta 1 documento que necessita de reenvio` |
| os dois | `constam 6 documentos pendentes e 2 documentos que necessitam de reenvio` |

O aviso nunca é enviado com as duas quantidades em zero — nesse caso não há nada a
comunicar, e quem fala é o aviso 3.

### Amostras de variáveis — na ordem, para copiar

```
{{1}}   Carlos Eduardo
{{2}}   constam 6 documentos pendentes e 2 documentos que necessitam de reenvio
{{3}}   dos projetos de Estruturação Societária e Planejamento Sucessório
{{4}}   03/09/2026
```

### Como sai

> Olá, Sr(a). Carlos Eduardo.
>
> No momento, constam 6 documentos pendentes e 2 documentos que necessitam de reenvio na documentação dos projetos de Estruturação Societária e Planejamento Sucessório.
>
> Prazo para envio: **03/09/2026**
>
> A relação completa, as orientações de envio e os motivos para reenvio estão disponíveis no portal do cliente.
>
> PSA Prado Suzuki
> `[ Consultar documentação ]`

---

## 3. `documentacao_conferida_v1`

Substitui `documento_aprovado`.

### Corpo

```
Olá, Sr(a). {{1}}.

A documentação {{2}} está completa e conferida.

São {{3}}, *sem pendências no momento*.

A próxima etapa é a execução do projeto. Novas informações serão comunicadas conforme o andamento das atividades.
```

**Negrito:** em `*sem pendências no momento*`, que é texto fixo e não variável — aqui o
que o cliente procura é o desfecho, não um número.

**Botão:** `Consultar documentação`

### Variáveis

| Marcador | O que colocar | Exemplo |
|---|---|---|
| `{{1}}` | nome do representante do cliente | `Carlos Eduardo` |
| `{{2}}` | os projetos, **com preposição e artigo já flexionados** | `dos projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{3}}` | total de documentos conferidos, **com o substantivo** | `52 documentos` |

Flexão do `{{2}}`: `do projeto de X` com um produto, `dos projetos de X e Y` com vários.

Flexão do `{{3}}`: `1 documento` ou `52 documentos`.

### Amostras de variáveis — na ordem, para copiar

```
{{1}}   Carlos Eduardo
{{2}}   dos projetos de Estruturação Societária e Planejamento Sucessório
{{3}}   52 documentos
```

### Como sai

> Olá, Sr(a). Carlos Eduardo.
>
> A documentação dos projetos de Estruturação Societária e Planejamento Sucessório está completa e conferida.
>
> São 52 documentos, **sem pendências no momento**.
>
> A próxima etapa é a execução do projeto. Novas informações serão comunicadas conforme o andamento das atividades.
>
> PSA Prado Suzuki
> `[ Consultar documentação ]`

---

## 4. `solicitacao_vencida_v1`

**Aviso novo, não substitui ninguém.** Aprovado em 25/08/2026, id `1388762306030268`.

### Corpo

```
Olá, Sr(a). {{1}}.

Até o momento, *não consta o recebimento de nenhum documento* referente {{2}}.

Prazo para envio: {{3}}.

A relação completa dos documentos e as orientações de envio estão disponíveis no portal do cliente.
```

**Negrito:** só na frase do recebimento. **Botão:** `Enviar documentos`

225 caracteres de modelo, 309 preenchido. Quatro parágrafos.

### Variáveis

| Marcador | O que colocar | Exemplo |
|---|---|---|
| `{{1}}` | nome do representante do cliente | `Carlos Eduardo` |
| `{{2}}` | os projetos na **forma `a`**, com preposição e artigo já flexionados | `aos projetos de Estruturação Societária e Planejamento Sucessório` |
| `{{3}}` | prazo de envio, com o estado quando vencido | `03/09/2026 (vencido)` |

⚠️ **Forma `a`, como o modelo 1, e não a forma `de` dos modelos 2 e 3.** O texto fixo é
`referente {{2}}`, então `dos projetos de X` produziria *"referente dos projetos de X"* —
frase quebrada que **sai assim para o cliente**, porque parâmetro com valor não falha o
envio.

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
> Prazo para envio: 03/09/2026 (vencido).
>
> A relação completa dos documentos e as orientações de envio estão disponíveis no portal do cliente.
>
> PSA Prado Suzuki
> `[ Enviar documentos ]`

O raciocínio da redação, o parecer da coordenação e as três tentativas que falharam antes
estão em
[`../sprints/sprint-12/VALIDACAO_aviso-sem-documento.md`](../sprints/sprint-12/VALIDACAO_aviso-sem-documento.md).

---
---

# Nomes dos modelos

O nome de um modelo aprovado **não pode ser editado**, e mudar o texto exige submeter um
modelo novo. Por isso o sufixo de versão entra desde agora: a próxima revisão de texto é
`_v3`, sem decisão de nomenclatura às pressas.

Lido da Graph API em 25/08/2026: os quatro **APPROVED**, UTILITY, `pt_BR`, validade 43200s.

| Modelo no ar | `notificacao_tipo` | Substitui | Marc. | Aprovado |
|---|---|---|---|---|
| `solicitacao_enviada_v2` | `solicitacao_enviada` | `solicitacao_enviada` | 4 | 18/08/2026 |
| `situacao_documentos_v2` | `cobranca_pendencia` | `cobranca_pendencia` + `documento_recusado` + `situacao_documentos_v1` | 4 | 18/08/2026 |
| `documentacao_conferida_v1` | `documento_aprovado` | `documento_aprovado` | 3 | 18/08/2026 |
| `solicitacao_vencida_v1` | `solicitacao_vencida` | **ninguém** — aviso novo | 3 | 25/08/2026 |

Os órfãos continuam aprovados e **não são apagados**: o fluxo deixa de referenciá-los, e
apagar modelo aprovado não devolve nada e fecha a porta de voltar atrás. São cinco em
25/08/2026 — os quatro antigos mais o `situacao_documentos_v1`.

⚠️ **O `solicitacao_vencida_v1` é o único sem caminho de volta**, porque não substitui
nada. Nos outros três, trocar `emUso` para `atual` devolve o modelo antigo; aqui não há
antigo. Se a Meta pausar este modelo, a rota para.
