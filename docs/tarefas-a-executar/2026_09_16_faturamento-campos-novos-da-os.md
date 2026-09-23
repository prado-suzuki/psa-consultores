# TAREFA: os campos novos da OS para o faturamento

> Aberta em 16/09/2026, a partir da validação da tela `/equipe/adm-fin/dashboard` pelo
> financeiro (Letícia Brites, 15/09/2026). Análise escrita, com os números de produção, em
> [`docs/planos/faturamento-pedido-do-financeiro.md`](../planos/faturamento-pedido-do-financeiro.md).
>
> **Tem migration — quatro frentes.** E **está bloqueada**: duas delas mudam de forma conforme
> a resposta da Letícia. Migration antes das respostas é retrabalho garantido.

## O que já está no ar, e não é escopo desta tarefa

Entregue em 15/09 **sem migration**, porque o dado já existia no banco e só faltava a tela:
serviço contratado, produtos com horas, observação da OS, datas de emissão/início/fim,
contribuinte com CPF/CNPJ e inscrição estadual, endereço de cobrança, contato do representante
(nome, cargo, e-mail, telefone), valores do contrato e o rateio por centro de custo.

Um ponto dela **já existia e só precisava de resposta**: o rateio não tem limite de linhas, e o
sistema já exige que a soma feche 100% para salvar. Ficam de fora dessa conta **3 OS cujo
rateio não fecha 100%**, anteriores à regra — limpeza de dado, não desenvolvimento.

## As quatro frentes que esta tarefa carrega

| # | Frente | O que existe hoje | Depende da resposta |
|---|---|---|---|
| 1 | Parcela com **vencimento e competência** | `numero_parcelas` e `valor_entrada`, e nada mais: **16 das 155 OS** são parceladas e o sistema não sabe quando cada uma vence nem se já foi faturada | Pergunta 1 |
| 2 | **Texto que vai na NF** | só `ordem_servico.observacoes`, um por contrato, **10 OS preenchidas** | Pergunta 2 |
| 3 | **N contribuintes por OS**, com regra de divisão | **um** `contribuinte_id` por OS. O cadastro já modela o grupo: 96 clientes têm mais de um contribuinte, **30 já têm duas ou mais pessoas físicas** | Perguntas 3 e 4 |
| 4 | **Reembolso por tipo** | duas colunas fixas, `valor_reembolso_km` e `valor_reembolso_refeicao`, com **13 OS** preenchidas | Pergunta 5 |

## O bloqueio: as 7 respostas

As perguntas foram enviadas à Letícia em 15/09/2026 e estão desenhadas, uma a uma e com as
opções lado a lado, em
[`docs/planos/perguntas-faturamento-leticia.html`](../planos/perguntas-faturamento-leticia.html)
(abre em `http://localhost:8080/docs/planos/perguntas-faturamento-leticia.html`). Ela responde
por letra.

**O anexo do quadro é o PDF**, gerado dessa mesma página em A4 deitada, uma pergunta por
página: `G:\Drives compartilhados\PSA Digital\03_Clientes_Internos\PSA_Adm\Faturamento\Faturamento_Perguntas_Financeiro_2026-09-16.pdf`.
Quem mudar as perguntas mexe no HTML e gera o PDF de novo — o HTML é a fonte.

| Pergunta | O que a resposta decide |
|---|---|
| 1. A nota mensal vence sempre no mesmo dia? | se a parcela guarda **uma data ou duas**, e se existe dia fixo no contrato |
| 2. O texto da NF muda de um mês para o outro? | se o campo é **da OS** ou **da parcela** |
| 3. Dois CPF/CNPJ: percentual, valor fixo ou uma nota por serviço? | a **forma da coluna de divisão**, e como a parcela se calcula |
| 4. A Maria já é cadastro do cliente? | se é **uma frente** (escolher mais de um da lista) ou **duas** (contribuinte deixa de ser de um cliente só) |
| 5. Reembolso: combinado no contrato ou lançado por despesa? | se vive **na OS** ou vira **tela de lançamento por período** |
| 6. Para qual e-mail a nota vai? | se o **contribuinte** ganha e-mail, ou se fica no representante |
| 7. O que entregar primeiro? | a **ordem** entre T3 e T5 abaixo |

## Dois cuidados de desenho, antes de qualquer código

**Os dois rateios não são o mesmo, e confundi-los quebra o que já funciona.** O
`distribuicao_receita` de hoje divide a receita entre as **empresas do grupo PSA**, por centro
de custo: é interno e não aparece em nota nenhuma. O que a Letícia pediu divide **a nota** entre
CPFs/CNPJs **do cliente**. A mesma OS pode ter as duas divisões ao mesmo tempo. **Tabelas
separadas.**

**Reembolso é tabela, não coluna.** Água e pedágio como colunas novas significam mais uma
migration e mais uma mudança em toda tela que lê valores no próximo pedido (hotel, passagem,
estacionamento). Tabela de tipos sob curadoria, como já são os centros de custo e os produtos.

**A `os_parcela` é a mesma tabela da tarefa do ERP da Centro Oeste.** Quem desenhar a parcela lê
[`docs/planos/integracao-contrato-erp-centro-oeste.md`](../planos/integracao-contrato-erp-centro-oeste.md)
antes: lá o parcelamento são **doze bits de mês**, não um número de parcelas, e **95 das 100 OS
parceladas encaixam** em competência (ano e mês). Desenhar a parcela sem competência quebra a
integração antes de ela começar.

## Passo a passo

### T1 — Colher as 7 respostas da Letícia ⛔ BLOQUEIA TUDO

Mandar a página das perguntas e registrar as respostas **neste arquivo**, por letra. Sem elas,
nenhuma das subtarefas abaixo começa. Se vier resposta parcial, T2 e T5 podem andar com as
perguntas 1, 2 e 5 respondidas; T3 e T4 precisam da 3 e da 4.

**Aceite:** as 7 respostas escritas aqui, com a data.

### T2 — Desenhar a `os_parcela` no papel, com a tarefa do ERP aberta ao lado

Colunas candidatas: OS, **competência (ano e mês)**, vencimento, valor, contribuinte, situação
(a faturar / faturada), e o texto da NF **se a resposta 2 for "muda a cada nota"**. Confirmar
contra o de-para do ERP antes de escrever migration.

**Aceite:** o desenho da tabela escrito aqui e conferido contra
`integracao-contrato-erp-centro-oeste.md`. Sem código.

### T3 — Parcela: migration + tela ⚠️ MIGRAÇÃO

A tabela, a policy no molde das outras tabelas filhas da OS, e o backfill das **16 OS
parceladas** que hoje só têm `numero_parcelas`. Na tela, o quadro de parcelas da OS aberta no
dashboard da Adm & Fin, no formato do
[`prototipo-faturamento.html`](../planos/prototipo-faturamento.html).

**Aplicar no sandbox.** Produção é passo humano pelo chat do Lovable.

### T4 — O texto da NF ⚠️ MIGRAÇÃO (só se a resposta 2 for "muda a cada nota")

Se for sempre o mesmo texto, **não há migration**: é a `observacoes` que já existe, e a tarefa
vira só rótulo de tela. Se muda, é coluna da parcela, e entra junto da T3.

### T5 — N contribuintes por OS ⚠️ MIGRAÇÃO

Tabela de contribuintes da OS com a regra de divisão que a resposta 3 escolher, **separada do
`distribuicao_receita`**. Backfill: o `contribuinte_id` de hoje vira a primeira linha, com 100%.
Se a resposta 4 for "a Maria é de fora", **abrir tarefa própria** para o cadastro de
contribuinte deixar de ser de um cliente só — não fazer as duas no mesmo commit.

### T6 — Reembolso por tipo ⚠️ MIGRAÇÃO

Tabela de tipos sob curadoria (km, refeição, pedágio, água, e o que a resposta 5 trouxer) e o
valor por OS. Backfill das **13 OS** que têm km ou refeição preenchidos. As duas colunas antigas
só caem depois que a tela nova estiver lendo a tabela.

Se a resposta 5 for "lançado quando a despesa acontece", isto vira **outra tarefa**: lançamento
por data com comprovante é tela nova, e o valor da parcela passa a depender dela.

### T7 — E-mail da nota (resposta 6)

Se for o e-mail da empresa, `contribuinte` ganha a coluna ⚠️ MIGRAÇÃO. Se for pessoa do
financeiro do cliente, já existe: são os **73 representantes com e-mail**, e o trabalho é só de
tela.

### T8 — Produção

Nenhuma das migrations sobe sozinha: o passo é humano, pelo chat do Lovable, e conferido por
`SELECT` depois. Atualizar a linha desta tarefa no README da sprint e em
[`docs/INDICE-PLANOS.md`](../INDICE-PLANOS.md) **no mesmo commit** do código.

## Aceite da tarefa

- As 7 respostas registradas aqui.
- A Letícia abre uma OS parcelada no dashboard e vê competência, vencimento e situação de cada
  parcela.
- Uma OS com dois contribuintes mostra as duas notas e a divisão entre elas.
- Um reembolso de pedágio entra sem migration nova.
- As migrations aplicadas no sandbox, e a lista do que falta em produção escrita aqui.

## Fica de fora

- **A emissão da nota.** Continua saindo pelo ERP da Centro Oeste; o controle é que é nosso.
- **A aba Faturamento do cadastro de cliente**, que é só leitura por decisão da sprint 13.
- **O rateio por centro de custo**, que já funciona e não tem limite.
