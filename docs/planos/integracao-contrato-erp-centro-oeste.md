# Integração: a OS da PSA vira contrato no ERP da Centro Oeste

Tarefa de handoff para o **Bernardo**. Nasce da conversa de **14/09/2026** com a Centro Oeste
Sistemas (João Cantidio) e da medição do banco deles feita no mesmo dia, com acesso de leitura.

**Tudo que está em tabela neste documento foi medido, não suposto.** O banco deles é
`PRADOSUZUKI`, SQL Server, em `psacba.ddns.net:391`. O nosso é a produção do Lovable, lida por
`SELECT` via MCP.

---

## 0. O que está decidido, e o que não é escopo seu

**Decidido:** a PSA grava **só o contrato** no ERP. Nota fiscal, imposto e financeiro continuam
sendo emitidos lá dentro, por eles. Foi o combinado em call e confirmado por e-mail.

**Não é escopo seu, e já tem dono:**

- a rota `/equipe/adm-fin` e o sexto cartão do seletor de área — a Patricia está fazendo;
- a tela de Controle de Faturamento e a tabela `os_parcela` — vêm depois, e dependem de uma
  decisão que este documento levanta no §4.

**É escopo seu:** o serviço que pega uma OS do nosso banco e escreve o contrato no deles, mais
a leitura de volta do que já foi faturado.

---

## 1. O que você entrega

1. Um serviço que, dado o `id` de uma `ordem_servico`, insere **um** contrato em
   `TBL_CONTRATOS_GESTAO` e **uma linha por produto contratado** em
   `TBL_CONTRATOS_GESTAO_VALORES_FIXOS`, os dois na mesma transação.
2. A resolução do cliente: do nosso `contribuinte` para o `CD_ENTIDADE` deles, pelo CPF/CNPJ.
3. A resolução do serviço: dos nossos produtos para o `CD_MATERIAL` deles. **Não é automática**
   (ver §3.2).
4. Uma leitura que, dado um contrato, devolve as competências já faturadas (§5).
5. O registro, do nosso lado, do `CD_CONTRATO` que o insert devolveu.

---

## 2. Onde esse código mora, e por que não é aqui

**A escrita não pode sair do navegador.** O front é React falando com Supabase; não existe
cliente SQL Server no browser, e a credencial do ERP não pode viver no bundle.

Sobram dois lugares, e a escolha é sua com um argumento de partida: **Edge Function do Supabase
é Deno**, e driver maduro de SQL Server em Deno é terreno ruim. O `psa-backend-api` é Node, onde
`mssql`/`tedious` são caminho batido. Se você escolher o contrário, escreva o porquê no PR.

O que **não** muda: do lado do nosso app, o consumo é por hook (`src/hooks/`), como manda o
`AGENTS.md`. Componente não conhece integração, do mesmo jeito que não conhece Supabase.

---

## 3. O de-para, campo a campo

### 3.1 A capa — `TBL_CONTRATOS_GESTAO`

36 colunas, 17 obrigatórias, `CD_CONTRATO` é `IDENTITY`.

| Coluna deles | Obrig. | Sai de | Cobertura em produção |
|---|---|---|---|
| `NR_CONTRATO` varchar(20) | não | `ordem_servico.numero_os` | 155 de 155 |
| `VL_CONTRATO` | sim | `valor_projeto` | 155 de 155 |
| `VL_SALDO` | sim | grava **`0`** | ver armadilha 4 |
| `VL_CONVERTIDO` | sim | igual a `VL_CONTRATO` | — |
| `VL_COTACAO` numeric(18,7) | sim | `1` | **não confirmado** |
| `CD_ENTIDADE` | sim | `contribuinte` pelo CPF/CNPJ | 134 de 155 OS têm contribuinte |
| `CD_SERVICO` | sim | o produto principal da OS | 153 de 155 |
| `DT_INICIO` | sim | `data_inicio` | 129 de 155 |
| `DT_FIM` | sim | `data_fim` | 125 de 155 |
| `CD_USUARIO` · `CD_USUARIOAT` | sim | grava **`0`** | é o que os 3 contratos usam |
| `NR_FORMA_FATURAMENTO` | sim | grava **`0`** | é o que os 3 contratos usam |
| `X_ATIVO` | sim | `1` | — |
| `X_FATURADO` | sim | `0` (quem muda é o ERP) | — |
| `X_RENOVAR_CONTRATO` | sim | `0` | — |
| `DT_CADASTRO` · `DT_ATUALIZACAO` | sim | `getdate()` | — |
| `CD_EMPRESA` · `CD_FILIAL` | não | `cluster_id` | 140 de 155 |
| `DS_OBS` · `DS_OBS_INTERNA` | não | `observacoes` | livre |
| `CD_CARTEIRA` · `CD_FORMA_PAGAMENTO` | não | deixa nulo | é o que eles fazem |

**105 das 155 OS passam hoje** nas três obrigatórias que dependem do nosso cadastro
(contribuinte + `data_inicio` + `data_fim`). As outras 50 precisam ser completadas antes de
subir, e isso é trabalho de cadastro, não seu. **Recuse a OS incompleta com mensagem que diga
qual campo falta** — não invente data.

Sem destino do lado deles: `numero_parcelas`, `valor_entrada`, `valor_reembolso_km`,
`valor_reembolso_refeicao` e o rateio de `distribuicao_receita`. Não force.

### 3.2 As linhas de serviço — `TBL_CONTRATOS_GESTAO_VALORES_FIXOS`

33 colunas, `CD_VALOR_FIXO` é `IDENTITY`. Uma linha por produto: `CD_SERVICO`,
`NR_QUANTIDADE`, `VL_VALOR`, `VL_TOTAL_SERVICO`, `DT_INICIO`, `DT_FIM`, `DT_REAJUSTE`,
`X_ATIVO`, mais os doze bits de mês do §4.

**É esta tabela que resolve a OS com vários produtos.** Medido: 153 das 155 OS têm produto
contratado, 311 vínculos no total, e **82 OS têm mais de um**. Um contrato, N linhas.

**O catálogo não bate, e não há conversão automática.** Eles têm **24** serviços ativos em
`TBL_MATERIAIS` (`X_SERVICO = 1`); nós temos **123** em `servicos_prestados` e **26** em
`produto_segmento`. Precisa de uma tabela de-para no nosso banco, preenchida à mão, e de recusa
explícita quando o produto não tiver correspondência. Criar serviço lá por insert custa **129
colunas obrigatórias sem default** — não é caminho.

O cliente é diferente: eles têm **376** clientes ativos e nós **412** contribuintes com
CPF/CNPJ. A sobreposição não foi medida ainda. Meça antes de decidir se precisa criar alguém
(criar entidade custa **93 obrigatórias sem default**; o certo é o cadastro continuar na tela
do ERP).

---

## 4. O parcelamento deles é por competência, e é aqui que mora a decisão em aberto

Não existe "número de parcelas" no contrato deles. Existem **doze bits**,
`X_PERIODO_JANEIRO` a `X_PERIODO_DEZEMBRO`, dizendo em que meses aquele serviço fatura.

Encaixe medido do nosso `numero_parcelas`:

| Parcelas na OS | OS | Duração média | Encaixa? |
|---|---:|---:|---|
| 1 · pagamento único | 84 | 31 meses | sim, um mês marcado |
| 12 · mensal | 10 | 11,2 meses | sim, doze marcados |
| 24 | 1 | sem período | dois anos, se houver período |
| 10 | 3 | 4,3 meses | **não** — 10 parcelas em 4 meses não é mensal |
| 6 | 1 | 4,6 meses | **não** |
| 4 | 1 | 54,6 meses | **não** |

**95 das 100 OS com parcelamento encaixam. Cinco não.** Para essas, pare e pergunte — não
arredonde.

E os 84 de parcela única têm duração média de 31 meses, o que quer dizer que `data_fim` ali é
fim do serviço, não do pagamento. **Qual mês marcar nesses é decisão de negócio, não sua.**

**Consequência para quem for fazer a `os_parcela`:** ela precisa guardar **competência (ano e
mês)** junto com o vencimento. Sem isso os dois lados não conversam — eles pensam em
competência, nós pensaríamos em parcela numerada. Registre isso no PR para quem pegar a tela.

---

## 5. A leitura de volta existe e está provada em dado real

Duas tabelas:

- `TBL_CONTRATOS_GESTAO_NOTAS` — três colunas, liga `CD_CONTRATO` a `CD_LANCAMENTO_FATURAMENTO`;
- `TBL_CONTRATOS_GESTAO_NOTAS_SERVICOS_FATURADOS` — `DS_ANO`, `DS_MES`, `CD_VALOR_FIXO`,
  `DS_ORIGEM`.

O contrato de teste nº 1 do fornecedor já passou por isso: `X_FATURADO = 1`,
`DT_FATURADO = 14/04/2026`, nota 3, e a competência **2026 / 4, origem `FIXO`**.

É daqui que sai a coluna "faturado" da tela, por consulta. Ninguém digita.

**Uma observação para conferir no primeiro contrato de verdade:** esse contrato faturou a
competência 2026/4 com **os doze bits em zero**, e o contrato nº 2, com os doze marcados, não
faturou nada. Ou os bits não são pré-requisito para faturar, ou aqueles lançamentos foram
manuais. Com três registros de teste não dá para afirmar.

---

## 6. O que depende de terceiro, e trava o seu teste

1. **Permissão de `INSERT`.** O usuário atual é só leitura: `Erro SQL [229] — A permissão
   INSERT foi negada no objeto 'TBL_CONTRATOS_GESTAO'`. Pedido já feito ao João. Precisa de
   INSERT nas duas tabelas de contrato e SELECT no resto.
2. **Base de homologação**, se existir. O primeiro contrato de verdade não deveria nascer em
   produção.

Note que **`CD_USUARIO = 0` funciona**, então não é preciso um usuário de integração no ERP.
Só permissão.

---

## 7. Ordem de execução

1. Medir a sobreposição de CNPJ entre `TBL_ENTIDADES` (376 clientes ativos) e os nossos 412
   contribuintes. É `SELECT` dos dois lados e decide o tamanho do problema de cadastro.
2. Exportar os 24 serviços deles e montar a tabela de-para para os nossos produtos. Migration
   normal, no sandbox, pelo `bun run db:sync --apply`.
3. O serviço de escrita, com o teste do §8 rodando contra o rollback.
4. Gravar o `CD_CONTRATO` devolvido, ao lado da nossa OS.
5. A leitura de volta.

Os passos 1 e 2 são leitura e cadastro: **dá para começar hoje**, sem esperar a permissão.

---

## 8. Como provar antes de gravar

Envolva os dois inserts numa transação e feche com `rollback` enquanto estiver testando. O
script abaixo roda inteiro e não deixa nada:

```sql
exec sp_executesql N'
begin tran
declare @entidade int = (select top 1 CD_ENTIDADE from TBL_ENTIDADES where X_CLIENTE = 1 and X_ATIVO = 1 order by CD_ENTIDADE)
declare @servico  int = (select top 1 CD_MATERIAL from TBL_MATERIAIS where X_SERVICO = 1 and X_ATIVO = 1 order by CD_MATERIAL)
declare @inicio   datetime = ''20260101''
declare @fim      datetime = ''20261231''
declare @valor    decimal(18,2) = 84000.00

insert into TBL_CONTRATOS_GESTAO
  (CD_ENTIDADE, CD_SERVICO, CD_USUARIO, CD_USUARIOAT,
   DT_CADASTRO, DT_ATUALIZACAO, DT_INICIO, DT_FIM,
   X_FATURADO, X_ATIVO, X_RENOVAR_CONTRATO,
   VL_CONTRATO, VL_SALDO, VL_CONVERTIDO, VL_COTACAO,
   NR_FORMA_FATURAMENTO, NR_CONTRATO, CD_EMPRESA, CD_FILIAL)
values
  (@entidade, @servico, 0, 0,
   getdate(), getdate(), @inicio, @fim,
   0, 1, 0,
   @valor, 0, @valor, 1,
   0, ''TESTE-OS-001'', 4, 4)

declare @contrato int = cast(scope_identity() as int)

insert into TBL_CONTRATOS_GESTAO_VALORES_FIXOS
  (CD_CONTRATO, CD_SERVICO, CD_USUARIO, CD_USUARIOAT,
   DT_CADASTRO, DT_ATUALIZACAO, DT_INICIO, DT_FIM, DT_REAJUSTE,
   NR_QUANTIDADE, VL_VALOR, VL_CONVERTIDO, VL_TOTAL_SERVICO, X_ATIVO,
   X_PERIODO_JANEIRO, X_PERIODO_FEVEREIRO, X_PERIODO_MARCO, X_PERIODO_ABRIL,
   X_PERIODO_MAIO, X_PERIODO_JUNHO, X_PERIODO_JULHO, X_PERIODO_AGOSTO,
   X_PERIODO_SETEMBRO, X_PERIODO_OUTUBRO, X_PERIODO_NOVEMBRO, X_PERIODO_DEZEMBRO)
values
  (@contrato, @servico, 0, 0,
   getdate(), getdate(), @inicio, @fim, @inicio,
   1, 7000.00, 7000.00, @valor, 1,
   1,1,1,1,1,1,1,1,1,1,1,1)

select * from TBL_CONTRATOS_GESTAO where CD_CONTRATO = @contrato
rollback
'
```

---

## 9. Armadilhas, todas encontradas na marra em 14/09

1. **O servidor está em português, `dateformat` é `dmy`.** `'2026-01-01'` vira dia 2026 e dá
   `Erro SQL [242]`. Mande data como parâmetro tipado, ou como `'20260101'`. String
   `'yyyy-mm-dd'` funciona em 12 dias do mês e falha nos outros 19.
2. **"OS" do ERP não é a nossa OS.** `TBL_ORDEM_SERVICO` de lá é ordem de oficina e transporte
   (`DS_EQUIPAMENTO`, `DT_GARANTIA`, `NR_QUILOMETRAGEM`, `DS_ARMADOR`, `DS_TIPO_CARGA`). O que
   corresponde à nossa OS é o **contrato**. Não se confunda pelo nome.
3. **As quatro tabelas têm triggers e o corpo não é legível** (`object_definition` devolve
   `null` nas dez; ou estão com `WITH ENCRYPTION`, ou falta `VIEW DEFINITION`). Você não sabe o
   que elas fazem. Mais um motivo para testar com `rollback` e para insistir na homologação.
4. **`VL_SALDO` grava `0`, não o valor do contrato.** Nos três contratos existentes ele é `0`
   inclusive num contrato de R$ 1.000 que nunca foi faturado. Não deduza que é saldo a faturar.
5. **Não renomeie as nossas tabelas para o padrão deles.** `TBL_ENTIDADES` junta cliente e
   fornecedor numa tabela só; aqui `cliente` e `contribuinte` são separados de propósito, e quem
   recebe a nota é decisão da OS. Guarde o código deles ao lado do nosso registro, e pronto.
6. **O `NR_CONTRATO` é a âncora de conciliação.** varchar(20), livre, cabe o nosso `numero_os`.
   Com ele, conciliar não depende de guardar id nenhum.

---

## 10. Estado do módulo de contrato deles, para calibrar expectativa

`TBL_CONTRATOS_GESTAO` tem **3 linhas**, e as três são testes do próprio fornecedor (14/04 e
10/09/2026), com valor R$ 0,00, R$ 1,00 e R$ 1.000,00. `TBL_CONTRATOS` tem **0**. Enquanto isso
`TBL_NOTAS_FATURAMENTO` tem **586** e `TBL_FINANCEIRO_TITULOS_ARECEBER` tem **1.022**.

**Nas 20 notas mais recentes, `CD_CONTRATO` vem nulo nas 20**, junto com `CD_ORDEM_SERVICO`,
`CD_ORCAMENTO` e `CD_PEDIDO`. Hoje a nota é lançada solta.

Isso não invalida a tarefa, mas define o que ela entrega sozinha: **enquanto quem emite a nota
não passar a escolher o contrato na tela do ERP, a leitura de volta do §5 devolve vazio.** Essa
combinação é com a Centro Oeste, e é conversa da Patricia com o João, não sua. Registre no PR
que a leitura está pronta e esperando o processo.
