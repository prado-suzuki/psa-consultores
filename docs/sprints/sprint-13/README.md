# Tarefas da sprint 13

Índice das tarefas delegáveis desta sprint. Uma linha por tarefa; o detalhe (contexto,
subtarefas Tn, aceite, referências de código) vive no arquivo `TAREFA_*.md` correspondente.

## Permissões do cadastro de cliente

Todas nascem da [auditoria das 32 operações do módulo](../sprint-12/TAREFA_registrar-por-cargo.md),
feita em 02/09/2026 depois de a Layara (papel `lider`) não conseguir cadastrar um cliente.

**A regra decidida pela Patricia em 02/09:**

> **Gravar** (registrar, alterar e excluir) exige apenas papel `sublider` ou acima.
> **Ler** continua recortado pelo cluster do cliente.
> **Guardar linha excluída** só em `cliente` e `contribuinte`; todo o resto apaga de vez.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [1 Alterar por cargo](TAREFA_alterar-por-cargo.md) | `UPDATE` no cadastro exige só papel `sublider` ou acima, nas quatro tabelas que ainda pedem cluster. **Também autoriza a exclusão lógica** de cliente e contribuinte, que é um UPDATE. | Sim, **1 ⚠️ MIGRAÇÃO**: 4 policies de UPDATE | 🔴 **Pendente em produção**: as quatro ainda pedem cluster |
| [2 Apagar cliente e contribuinte por cargo](TAREFA_excluir-por-cargo.md) | As duas permissões de `DELETE` das tabelas que continuam com exclusão lógica. **Conserta o desfazer** do salvamento, que apaga zero linhas e deixou 9 clientes órfãos em 01/09. Calado ele já não é: a tela avisa desde 02/09. | Sim, **1 ⚠️ MIGRAÇÃO**: 2 policies de DELETE | 🔴 **Pendente em produção**: as duas ainda pedem cluster |
| [3 Soft delete de cliente e contribuinte](TAREFA_soft-delete-cliente-e-contribuinte.md) | Os **dois que continuam** guardando linha excluída. Hoje excluir contribuinte recusa todo não-admin: a linha some da vista no meio da própria gravação. **Depende da 1.** | Sim, **1 ⚠️ MIGRAÇÃO** + front | 🔴 **Pendente em produção**: `soft_delete_cliente` e `soft_delete_contribuinte` não existem lá |
| [4 Representante e rateio passam a apagar de vez](TAREFA_representante-e-rateio-hard-delete.md) | Conversão de soft para hard delete nas **duas tabelas sem dependentes**. Duas fases: a 1 muda o comportamento e é reversível; a 2 apaga as 198 linhas já marcadas e derruba a coluna, e não tem volta. | Sim, **2 ⚠️ MIGRAÇÕES** (a 2ª opcional) + front | 🔴 **Pendente em produção**: `excluido` ainda está nas duas, com **198** linhas marcadas (9 representantes + 189 rateios) |
| [5 Ordem de serviço passa a apagar de vez](TAREFA_os-hard-delete.md) | Duas travas: **projeto vinculado** e **solicitação de documentos** impedem a exclusão, cada uma com sua frase. Sem elas, apaga tudo em cascata: rateio e produtos vão junto. Leva a limpeza dos **26 rateios fantasma (1800%) e 40 produtos presos**. | Sim, **4 ⚠️ MIGRAÇÕES** + front | 🔴 **Pendente em produção**: `ordem_servico` sem trigger nenhum, e os órfãos continuam lá |
| ~~[Rateio e produtos saem junto com a OS](TAREFA_exclusao-em-cascata-da-os.md)~~ | ⛔ **APOSENTADA (02/09).** Fazia por trigger o que a exclusão física faz sozinha. A limpeza dos órfãos migrou para a tarefa 5. | Não | ⛔ Não executar |

**Estado conferido no banco de produção, por SELECT, em 02/09/2026.** Medido, não deduzido do
repositório. Nenhuma das cinco foi aplicada: o lote de ~28 migrações que o Lovable aplicou
naquele dia levou a GES-01A, ITCD, feed de comentários e o ledger do `db:sync`, e **não tocou
nenhuma policy do cadastro**. Números do dia: 26 rateios ativos em OS excluída, 40 produtos
presos, 198 linhas marcadas como excluídas em representante e rateio.

> **Os 9 órfãos da tarefa 2, conferidos em produção em 04/09:** os nove existem, todos
> `excluido = true`, `ativo = true`, cluster OSG, zero contribuintes, criados em 01/09 entre 18h39
> e 20h59. Alguém já os marcou como excluídos, e é por isso que "cliente ativo sem cluster" não os
> achava. O décimo, "Bombonatto Indústria de Alimentos S/A (Frigobom)" de 02/09, é o cadastro que
> deu certo. A decisão "apagar ou marcar" já está tomada na prática: marcados.

### Ordem sugerida

`1 → 3` (a 3 depende da 1) · `2`, `4` e `5` são independentes entre si e podem ir em qualquer
ponto. A `5` é a mais pesada e a que mais mexe em dado histórico.

### O que já saiu, na sprint 12

- [Registrar por cargo](../sprint-12/TAREFA_registrar-por-cargo.md): ✅ aplicada em
  02/09/2026 (migração `20260902192547`, commit `3d4c03d5`), e **confirmada em produção por
  SELECT**: as quatro policies de INSERT pedem só cargo, sem cluster. **Ainda sem validação real:** o
  cadastro que funcionou em 02/09 levou os clusters "TAX, OSG", ou seja, passou pelo cluster da
  própria Layara. Falta cadastrar marcando **só** um cluster que não é dela.
- [Mensagens de recusa](../sprint-12/TAREFA_mensagens-de-recusa.md): catálogo de textos
  fechado e implementado, com teste. Falta a conferência na tela (T6 da tarefa).
- **GES-01A, os avisos de prazo**: o enum, as duas funções e o cron **subiram a produção em
  02/09**, no lote do Lovable, e o cron está **ligado**. Foi com o texto de trabalho: a
  redação nova é a [tarefa 6](TAREFA_redacao-dos-avisos-de-prazo.md), abaixo.

### O que entrou em 03/09

Dois commits no salvamento do cadastro de cliente, e nenhuma policy: as cinco tarefas de
permissão continuam pendentes em produção do jeito que a tabela acima diz.

- `3a582bdb` conserta a verificação de nome duplicado em três frentes. Ela comparava com
  clientes do outro ambiente, engolia o erro da consulta e respondia "não há homônimo" com a
  mesma cara de quem conferiu de verdade, e não segurava o botão: dois cliques seguidos rodavam
  duas verificações e dois cadastros do mesmo cliente. A trava passou a ser `ref`, e sobe antes
  do primeiro `await`.
- `b1fcbb85` faz a rejeição do salvamento chegar à tela. O `executeSave` era chamado solto
  dentro de um handler síncrono, então falha anterior ao `try` interno virava unhandled
  rejection: o botão voltava ao normal sozinho e a pessoa achava que tinha salvado.
- Os dois trouxeram os primeiros arquivos de teste do salvamento, 10 testes, cada correção
  conferida por mutação.

O clique dobrado é vizinho do defeito da tarefa 2: um fabricava cliente repetido, o outro deixa
cliente órfão. O desfazer continua sem pegar.

## Avisos no Google Chat

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [7 Coleta de documentos e menções no Google Chat](TAREFA_coleta-e-mencao-no-google-chat.md) | As duas frentes do sino que ficaram de fora do canal do Chat **e que já têm evento gravado**: aviso de coleta (`solicitacao_enviada`, texto da Patricia já gravado em `notificacao`, reusado tal e qual) e menção em comentário (`org_comment_mentions`, com `lido_em` próprio). **Chamado fica fora por decisão dela em 14/09** — já tem o espaço "PSA Chamados"; **revisão-pendente fica fora** porque o sino a deriva do estado e não existe evento para espelhar. Volume medido: ~1 mensagem por semana. Três decisões abertas (D1 a D3), sendo a mais pesada se menção — que é endereçada a UMA pessoa — deve mesmo ir para espaço coletivo | Sim, **3 ⚠️ MIGRAÇÕES**: a leitura ganha `org_project`, a função irmã `mencoes_para_o_chat`, e um valor de enum para menção em `notificacao_tipo` — este **bloqueante**, porque sem ele a linha de envio não grava e não há dedup nem rastro | 🔵 ABERTO |

## Aviso de usuário cadastrado

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [10 A cópia de usuário cadastrado sai do nome do Ricardo, e ganha espaço no Chat](TAREFA_copia-do-usuario-cadastrado.md) | Pedido dela em 16/09, ao receber `[PSA - COPIA COORDENACAO]`. O e-mail abre com "Olá, Ricardo!" e diz "vinculado à sua área": vai virar texto sem nome próprio, para o grupo `coordenacao@psaconsultores.com.br` (**D1 decidido por ela em 16/09**, entre quatro opções medidas; criar o grupo é a T0), e ganha um espaço no Chat. Medido em produção: **6 cadastros em 30 dias**, e **6 dos 13 de 90 dias são `client` sem área nenhuma**, ou seja, a frase da área mente em quase metade dos casos. O e-mail não nasce no banco nem em edge function: sai do front, de **três** pontos, para o webhook do n8n, e a saudação mora dentro do fluxo de lá. Dois bugs junto: o webhook é o **mesmo** no sandbox e em produção (usuário de teste manda e-mail com senha e cópia à coordenação), e a senha temporária viaja no payload, a um clique do nó do Chat | **Não.** Nem migração, nem RPC. O que muda é o payload do POST e o fluxo do n8n | 🔵 ABERTO |

## A caixa de tabela: branca ou tingida

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [11 A caixa de tabela: branca ou tingida, e o padrão muda junto](TAREFA_caixa-de-tabela-branca-ou-tingida.md) | Pergunta dela em 16/09, ao ler que a tabela do Adm & Fin virou **exceção** no inventário da catraca: "então não é padrão ser branco? Tem que me avisar quando não for o padrão, porque aí tem que mudar o padrão". Medido: **53 caixas de tabela em 49 arquivos, e só 1 branca** — a do Adm & Fin, que ficou branca porque ela mandou em 15/09 ("tá tudo verde"). As outras 52 são tingidas **sem ninguém ter escolhido isso para tabela**: herdaram a classe base do `<Card>`. A decisão já estava desenhada e nunca teve resposta — a seção 6 de [`o-branco-que-sobrou.html`](../../geral/comparacoes-de-cor/o-branco-que-sobrou.html) marca "tabela branca, porque tabela se lê pelas linhas" como **recomendada** desde 12/09, e a seção 8 diz que o conserto é variante do `<Card>`, **não exceção**. **A T1 saiu em 16/09 e o achado dela mudou a pergunta: o hover de linha tem TETO.** A zebra perdida sobre o cartão se recupera subindo o alfa de 25% para 38%; o hover não, porque é feito de `--muted` e o cartão já é 35% dele — mesmo a **100%, sem transparência**, chega a 1,154:1 contra os 1,175:1 que tem sobre o branco. Não é calibração, é fim de escala, e vale nas três áreas. Como o hover é o único dos dois que serve para **agir**, ele decide. O custo do branco também está medido: `--card` e `--background` têm o mesmo valor, então caixa branca sobre a página fica a **1,000:1** e só a borda a segura — mas onde há casca tingida atrás (o Adm & Fin) o custo some e o branco ganha nos dois eixos. Faltam o caminho de código conforme a resposta e inverter a catraca de lado nesse recorte, senão a próxima tabela nasce tingida de novo | **Não.** Superfície de tela; nem migração, nem RPC, nem policy | ✅ **FEITO (16/09).** Ela escolheu **B, tabela branca** diante da [comparação](../../geral/comparacoes-de-cor/a-caixa-da-tabela.html), e as três subtarefas saíram no mesmo dia: a variante `tabela` no `<Card>`, os **45 cartões em 42 arquivos** (não 53 em 49 — a contagem do plano somava tabela que estava fora de cartão) e a catraca `caixaDeTabela.test.ts`, que cobra o contrário da `cartaoTingido`. Quatro commits, um por raio de revert; o visual reverte sozinho em `f66e5476`. **Falta só a conferência na tela, e é dela:** com a caixa branca sobre a página a 1,000:1, quem segura a caixa é a borda |

## O Board acompanha o cartão tingido

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [12 O Board acompanha: o cartão dele desce para tingido](TAREFA_board-acompanha-o-cartao-tingido.md) | Decisão dela em 17/09 ("o board acompanha então"), com a ressalva "só os gráficos do board que eu gosto deles, acho moderno e clean". O Board ficou branco em 12/09 **por omissão, não por escolha**: a tinta entrou no `<Card>` e ele não passa por lá — pinta com CSS à mão no `index.css` (`.v3-card`, `.v4-card`, `.kpi`, `.mc`) lendo `--bd-surface`, que é `hsl(var(--card))`. Alcance maior que o nome: **19 arquivos**, incluindo `/gerencial/desempenho` e `/gerencial/performance`. Dos **48** tokens `--bd-*`, 23 já derivam do contrato e **25 são cravados**. **A medição desfez o argumento que segurava a frente:** descer a superfície não reprova nenhum degrau de TEXTO — pior caso `--bd-warn-d` na OSG, **4,98 → 4,64:1** contra piso de 4,5 —, então a medição de 21/08 sobrevive e não precisa ser refeita. Quebram **três**: a **zebra inverte de SINAL** (`--bd-surface2` passa de mais escuro para mais claro que a superfície nas três áreas, com a razão quase inalterada — catraca que medisse só a razão daria verde nas três), a divisória `--bd-line2` perde ~70% do degrau, e **a grade tracejada do gráfico é esse mesmo token** (`GRID_STYLE.stroke`), ou seja, o descuido apaga metade do que ela gosta. O que os gráficos **não** perdem está inventariado: paleta categórica já derivada dos `--tag-*`, forma (`BAR_RADIUS`, raio 16/12/9), eixo em `--bd-ink3` e tooltip, que fica branco por flutuar sobre conteúdo. Quatro commits por raio de revert, com a tinta isolada dos degraus, e catraca `superficieDoBoard.test.ts` que cobra o **sinal**, não só a razão | **Não.** Superfície de tela; nem migração, nem RPC, nem policy | 🔵 ABERTO |

## Ordem de serviço editável de qualquer tela

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [8 A OS passa a ser editável de qualquer tela](TAREFA_os-editavel-de-qualquer-tela.md) | `ordem_servico` é gravada **num lugar só**, dentro do `useSaveClientTransaction` (1344 linhas), e não como hook de entidade: editar uma OS de outra tela hoje só duplicando a escrita. Extrai `useUpsertOrdemServico` e cria o `OrdemServicoModal` no molde do `PessoaModal`, que já é montado por **cinco** telas da OSG Work com uma escrita só. Cinco subtarefas, começando por teste de caracterização. **Rateio e produtos contratados entram no hook** (decidido em 16/09): ~233 linhas a extrair, e as duas amarras a travar antes são o `filhosDeOsAlterados` (ligado em 6 pontos, lido pelo "nada mudou" do cliente inteiro) e a reconciliação do rateio, que existe por um defeito de 100%→200%→300%. Raio medido: **1** arquivo escreve as três tabelas, 16 só leem, **1** componente monta o transaction. Nasceu do Controle de Projetos: OS sem data recusa a criação do projeto e obriga a ir ao cadastro do cliente e voltar. **O gatilho não é o volume** (2 de 84 OS da OSG sem data), **é a segunda tela pedindo a mesma coisa** | **Não.** Refatoração de código; schema e policies intactos, e a permissão continua sendo a RLS mais o `podeEditarCadastroCliente` | 🔵 ABERTO |

## Faturamento: os campos novos da OS

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [9 Os campos novos da OS para o faturamento](TAREFA_faturamento-campos-novos-da-os.md) | As **quatro frentes** que sobraram da validação do financeiro em 15/09, depois de a tela já ter entregue tudo que existia no banco: parcela com **competência e vencimento** (16 das 155 OS são parceladas e ninguém sabe quando vencem), **texto que vai na NF**, **N contribuintes por OS** com regra de divisão (30 clientes já têm duas ou mais pessoas físicas cadastradas) e **reembolso por tipo** em tabela, no lugar das duas colunas fixas. Dois cuidados escritos na tarefa: o rateio por centro de custo **não** é a divisão da nota entre CNPJs do cliente (tabelas separadas), e a `os_parcela` é a **mesma tabela** da tarefa do ERP da Centro Oeste, onde o parcelamento são doze bits de mês — quem desenhar uma desenha a outra | Sim, **3 a 4 ⚠️ MIGRAÇÕES**, e duas delas mudam de forma conforme a resposta | ⛔ **Bloqueada nas 7 respostas da Letícia**, enviadas em 15/09. Perguntas desenhadas em [`planos/perguntas-faturamento-leticia.html`](../../planos/perguntas-faturamento-leticia.html) |

## Avisos de prazo de tarefa

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| **[6 A redação dos avisos de prazo vai para produção](TAREFA_redacao-dos-avisos-de-prazo.md)** 🔴 | A GES-01A subiu a produção em 02/09 **com o texto de trabalho**, e o cron está **ativo**: toda manhã às 7h a equipe recebe `Tarefa atrasada:` com corpo `Prazo em …`, no futuro. Leva a redação fechada pela Patricia, os acentos, e o gestor passa a receber só o atraso. | Sim, **1 ⚠️ MIGRAÇÃO** (`20260902210245`), só duas funções, nada de schema. **Não aplicada** | 🔴 **Urgente pelo cron**: escrita, aguarda o passo humano no Lovable |

## Como usar esta pasta

- **Uma tarefa = um arquivo** `TAREFA_<slug>.md` nesta pasta.
- Planos de design/arquitetura mais longos continuam em `docs/planos/`, e a tarefa linka para
  eles em vez de duplicar.
- Cada tarefa traz subtarefas numeradas (`T1`, `T2`, …) e bugs achados no caminho (`B1`, `B2`,
  …), com marcação explícita de **⚠️ MIGRAÇÃO** ou **⚠️ MUDANÇA DE RPC** quando depende do
  Lovable.
- Ao concluir uma subtarefa, marcar `✅ CONCLUÍDO (data)` dentro do arquivo da tarefa e
  atualizar a coluna Status desta tabela.
