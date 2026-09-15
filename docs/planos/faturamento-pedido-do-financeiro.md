# Faturamento: o que a Letícia pediu, e o que o sistema tem hoje

**Origem:** validação da tela `/equipe/adm-fin/dashboard` pelo financeiro (Letícia Brites),
por mensagem, em 15/09/2026. Números de produção medidos no mesmo dia pelo MCP do Lovable.

**A leitura em uma linha:** dos oito pontos que ela levantou, **um já existe e só precisa ser
dito a ela**, **três são tela** (o dado está no banco e a tela não mostra) e **quatro mudam o
banco** — e dois desses quatro (faturar em mais de um CNPJ, e o faturamento mensal por
vencimento) são decisão de desenho, não implementação. **A reunião que ela ofereceu vale a
pena**, e o que levar para ela está no fim.

## O tamanho de cada ponto

| O que ela pediu | O que existe hoje | O que falta |
|---|---|---|
| 1. Dois tipos de faturamento (parcelado × mensal por vencimento) | `ordem_servico.numero_parcelas` e `valor_entrada`. **16 das 155 OS** são parceladas | **Banco + tela.** Não há tipo de faturamento, nem parcela como registro, nem vencimento, nem competência |
| 2. Campo de vencimento (data acordada) | nenhuma data de vencimento. A OS tem emissão, início e fim | **Banco + tela.** Vive na parcela, não na OS — ver ponto 1 |
| 3. Rateio: tem limite? | **não tem limite.** 18 centros de custo cadastrados; o maior rateio em uso hoje tem 4 linhas; a soma 100% já é exigida para salvar | **nada.** Só responder a ela — e olhar as **3 OS cujo rateio não fecha 100%**, anteriores à regra |
| 4. Observação do serviço que vai na NF (nº da OC, do pedido, inscrição estadual) | `ordem_servico.observacoes`, campo genérico, **10 OS preenchidas**, e o dashboard não mostra | **Banco + tela**, se for texto próprio da nota. Ver a pergunta B |
| 5 e 6. Faturar em mais de um CPF/CNPJ, e faturar para Maria/Joana num projeto de João | **um** `contribuinte_id` por OS. Mas o cadastro já modela o grupo: **96 clientes têm mais de um contribuinte**, **30 já têm duas ou mais pessoas físicas**, 45 misturam PF e PJ, e o maior cliente tem 26 | **Banco + tela, e é UMA funcionalidade só** (ver abaixo): N contribuintes na OS com regra de divisão |
| 7. Reembolso de água e pedágio | duas colunas fixas: `valor_reembolso_km` e `valor_reembolso_refeicao`. **13 OS** têm algum reembolso | **Banco + tela.** Tabela de tipos, não mais colunas — ver abaixo |
| 8. Dados de contato (e-mail e telefone) | o contribuinte tem **telefone** e **não tem e-mail**. Quem tem e-mail é o representante do cliente: **73 preenchidos** | **Banco + tela**, dependendo da resposta da pergunta F |

## Dois cuidados de desenho, antes de qualquer código

**Os dois rateios não são o mesmo, e confundi-los quebra o que já funciona.** O rateio que
existe hoje (`distribuicao_receita`) divide a receita entre as **empresas do grupo PSA**, por
centro de custo — é interno e não aparece em nota nenhuma. O que ela pediu no ponto 5 divide
**a nota** entre CPFs/CNPJs **do cliente**. São duas divisões independentes: a mesma OS pode
ser faturada em dois CNPJs do cliente e, ainda assim, ter a receita repartida entre PSA Norte
e Prado Suzuki. Precisam de tabelas separadas.

**Os pontos 5 e 6 são a mesma coisa, menos um caso.** "Faturar para Maria" é, na prática,
escolher **outro contribuinte do mesmo cliente** — e isso o cadastro já representa: 30
clientes têm duas ou mais pessoas físicas como contribuinte, que é exatamente o grupo
familiar. Então a funcionalidade é uma: **N contribuintes por OS**. Duas ressalvas: ela não
se resume a "adicionar mais um", porque o sistema precisa saber **quanto vai em cada nota**
(pergunta C); e fica de fora o caso em que a Maria **não pertence ao grupo daquele cliente**,
que é vínculo de cadastro, não escolha na lista (pergunta D). A resposta da D decide se isso
é uma frente ou duas.

**Reembolso: tabela, não coluna.** Hoje cada tipo de reembolso é uma coluna. Água e pedágio
viram mais duas, e o próximo pedido (hotel, passagem, estacionamento) vira mais uma migration
e mais uma mudança em toda tela que lê valores. Uma tabela de tipos com valor por OS resolve
de uma vez e deixa a lista sob curadoria — como já são os centros de custo e os produtos.

## O que dá para ajustar já na tela, sem mexer no banco

Serve para ela validar de novo com mais coisa na frente:

- **Observação da OS** (`observacoes`) — existe e a tela não mostra;
- **Serviço e produtos contratados** da OS — existem (`servicos_prestados`,
  `os_produtos_contratados`) e a tela não mostra;
- **Datas** de emissão, início e fim — existem e a tela não mostra;
- **Telefone e e-mail do representante** do cliente — existem (73 com e-mail) e a tela não
  mostra.

## As perguntas para a Letícia

São as que não dá para responder olhando o sistema, porque são do processo dela.

**A. Faturamento mensal (o tipo 2).** A nota mensal sai sempre no mesmo dia do mês, ou cada
parcela tem data própria acordada? E o que manda: a competência (mês de referência) ou a data
de vencimento? *Por que importa:* decide se a parcela guarda uma data ou duas, e é o que
permite a tela "o que vence este mês".

**B. A observação da NF.** É um texto por OS, que se repete em toda nota daquele contrato, ou
muda de nota para nota (o número da OC do cliente, por exemplo, costuma mudar a cada pedido)?
*Por que importa:* se muda, o campo é da parcela/nota, não da OS.

**C. Faturar em mais de um CNPJ.** Quando a OS é faturada em dois CNPJs, como se divide: por
percentual, por valor fixo, ou uma nota por serviço? E as notas saem juntas, no mesmo mês, ou
cada CNPJ tem vencimento próprio?

**D. O "faturado para Maria e Joana".** Essas pessoas já são cadastro em algum cliente nosso,
ou são gente que só existe para receber a nota? *Por que importa:* hoje contribuinte é sempre
de um cliente; se elas não pertencem ao cliente do projeto, o cadastro precisa mudar.

**E. Reembolso.** Quais tipos existem de verdade hoje (água, pedágio, km, refeição, e o que
mais)? O valor é combinado no contrato e faturado todo mês, ou lançado quando a despesa
acontece? *Por que importa:* a primeira forma vive na OS; a segunda precisa de lançamento por
período, que é outra tela.

**F. Contato.** O e-mail para onde vai a nota é do contribuinte (a empresa) ou de uma pessoa
do financeiro do cliente? Pode ser mais de um?

**G. O que vem primeiro.** Se só der para entregar uma coisa nas próximas semanas, qual
destrava mais o trabalho dela: as parcelas com vencimento, ou faturar em mais de um CNPJ?

## O que já dá para responder a ela agora

- **Rateio não tem limite.** Pode incluir quantos quiser, e o sistema só deixa salvar quando a
  soma fecha 100% — que é exatamente o que a Patrícia respondeu.

## Onde isso encosta em outra frente

A `os_parcela` já é premissa da tarefa do ERP da Centro Oeste
(`planos/integracao-contrato-erp-centro-oeste.md`), que mediu do outro lado: o parcelamento
lá são doze bits de mês, não um número de parcelas, e **95 das 100 OS parceladas encaixam
nisso**. Quem desenhar a parcela precisa ler aquela tarefa antes — é a mesma tabela.
