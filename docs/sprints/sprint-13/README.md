# Tarefas da sprint 13

Índice das tarefas delegáveis desta sprint. Uma linha por tarefa; o detalhe (contexto,
subtarefas Tn, aceite, referências de código) vive no arquivo `TAREFA_*.md` correspondente.

> **Os arquivos de tarefa desta sprint não estão mais nesta pasta.** Desde a triagem de
> 23/09/2026 eles moram em [`docs/tarefas-a-executar/`](../../tarefas-a-executar/README.md)
> se ainda são trabalho, e em [`docs/tarefas-executadas/`](../../tarefas-executadas/README.md)
> se já foram entregues ou cancelados. Os links desta tabela já apontam para lá. Esta pasta
> guarda o **registro da sprint**: este índice, as planilhas de planejamento e os documentos
> de contexto. A regra está no [manual do `docs/`](../../README.md).

## Permissões do cadastro de cliente

Todas nascem da [auditoria das 32 operações do módulo](../../tarefas-executadas/2026_09_02_registrar-no-cadastro-por-cargo.md),
feita em 02/09/2026 depois de a Layara (papel `lider`) não conseguir cadastrar um cliente.

**A regra decidida pela Patricia em 02/09:**

> **Gravar** (registrar, alterar e excluir) exige apenas papel `sublider` ou acima.
> **Ler** continua recortado pelo cluster do cliente.
> **Guardar linha excluída** só em `cliente` e `contribuinte`; todo o resto apaga de vez.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [1 Alterar por cargo](../../tarefas-executadas/2026_09_02_alterar-no-cadastro-por-cargo.md) | `UPDATE` no cadastro exige só papel `sublider` ou acima, nas quatro tabelas que ainda pedem cluster. **Também autoriza a exclusão lógica** de cliente e contribuinte, que é um UPDATE. | Sim, **1 ⚠️ MIGRAÇÃO**: 4 policies de UPDATE | ✅ **EM PRODUÇÃO** (conferido em 23/09/2026 por SELECT): as quatro policies de UPDATE são `has_role_or_higher(…, 'sublider')`, sem cluster |
| [2 Apagar cliente e contribuinte por cargo](../../tarefas-executadas/2026_09_02_excluir-cliente-e-contribuinte-por-cargo.md) | As duas permissões de `DELETE` das tabelas que continuam com exclusão lógica. **Conserta o desfazer** do salvamento, que apaga zero linhas e deixou 9 clientes órfãos em 01/09. Calado ele já não é: a tela avisa desde 02/09. | Sim, **1 ⚠️ MIGRAÇÃO**: 2 policies de DELETE | ✅ **EM PRODUÇÃO** (conferido em 23/09/2026): as duas policies de DELETE são `has_role_or_higher(…, 'sublider')`, sem cluster |
| [3 Soft delete de cliente e contribuinte](../../tarefas-executadas/2026_09_02_soft-delete-de-cliente-e-contribuinte.md) | Os **dois que continuam** guardando linha excluída. Hoje excluir contribuinte recusa todo não-admin: a linha some da vista no meio da própria gravação. **Depende da 1.** | Sim, **1 ⚠️ MIGRAÇÃO** + front | ✅ **EM PRODUÇÃO** (conferido em 23/09/2026): `soft_delete_cliente` e `soft_delete_contribuinte` existem |
| [4 Representante e rateio passam a apagar de vez](../../tarefas-executadas/2026_09_02_representante-e-rateio-apagam-de-vez.md) | Conversão de soft para hard delete nas **duas tabelas sem dependentes**. Duas fases: a 1 muda o comportamento e é reversível; a 2 apaga as 198 linhas já marcadas e derruba a coluna, e não tem volta. | Sim, **2 ⚠️ MIGRAÇÕES** (a 2ª opcional) + front | ✅ **EM PRODUÇÃO** (conferido em 23/09/2026), **inclusive a fase 2**: a coluna `excluido` não existe mais em `representante` nem em `distribuicao_receita` |
| [5 Ordem de serviço passa a apagar de vez](../../tarefas-executadas/2026_09_02_ordem-de-servico-apaga-de-vez.md) | Duas travas: **projeto vinculado** e **solicitação de documentos** impedem a exclusão, cada uma com sua frase. Sem elas, apaga tudo em cascata: rateio e produtos vão junto. Leva a limpeza dos **26 rateios fantasma (1800%) e 40 produtos presos**. | Sim, **4 ⚠️ MIGRAÇÕES** + front | ✅ **EM PRODUÇÃO** (conferido em 23/09/2026): `distribuicao_receita` e `os_produtos_contratados` em `CASCADE`, `solicitacao` em `RESTRICT`, `org_projects` em `NO ACTION`, e a coluna `excluido` saiu |
| ~~[Rateio e produtos saem junto com a OS](../../tarefas-executadas/2026_09_02_exclusao-em-cascata-da-os-CANCELADA.md)~~ | ⛔ **APOSENTADA (02/09).** Fazia por trigger o que a exclusão física faz sozinha. A limpeza dos órfãos migrou para a tarefa 5. | Não | ⛔ Não executar |

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

- [Registrar por cargo](../../tarefas-executadas/2026_09_02_registrar-no-cadastro-por-cargo.md): ✅ aplicada em
  02/09/2026 (migração `20260902192547`, commit `3d4c03d5`), e **confirmada em produção por
  SELECT**: as quatro policies de INSERT pedem só cargo, sem cluster. **Ainda sem validação real:** o
  cadastro que funcionou em 02/09 levou os clusters "TAX, OSG", ou seja, passou pelo cluster da
  própria Layara. Falta cadastrar marcando **só** um cluster que não é dela.
- [Mensagens de recusa](../../tarefas-executadas/2026_09_02_mensagens-de-recusa-do-cadastro.md): catálogo de textos
  fechado e implementado, com teste. Falta a conferência na tela (T6 da tarefa).
- **GES-01A, os avisos de prazo**: o enum, as duas funções e o cron **subiram a produção em
  02/09**, no lote do Lovable, e o cron está **ligado**. Foi com o texto de trabalho: a
  redação nova é a [tarefa 6](../../tarefas-a-executar/2026_09_02_redacao-dos-avisos-de-prazo.md), abaixo.

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
| [7 Coleta de documentos e menções no Google Chat](../../tarefas-a-executar/2026_09_14_coleta-e-mencao-no-google-chat.md) | As duas frentes do sino que ficaram de fora do canal do Chat **e que já têm evento gravado**: aviso de coleta (`solicitacao_enviada`, texto da Patricia já gravado em `notificacao`, reusado tal e qual) e menção em comentário (`org_comment_mentions`, com `lido_em` próprio). **Chamado fica fora por decisão dela em 14/09** — já tem o espaço "PSA Chamados"; **revisão-pendente fica fora** porque o sino a deriva do estado e não existe evento para espelhar. Volume medido: ~1 mensagem por semana. Três decisões abertas (D1 a D3), sendo a mais pesada se menção — que é endereçada a UMA pessoa — deve mesmo ir para espaço coletivo | Sim, **3 ⚠️ MIGRAÇÕES**: a leitura ganha `org_project`, a função irmã `mencoes_para_o_chat`, e um valor de enum para menção em `notificacao_tipo` — este **bloqueante**, porque sem ele a linha de envio não grava e não há dedup nem rastro | 🔵 ABERTO |

## Aviso de usuário cadastrado

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [10 A cópia de usuário cadastrado sai do nome do Ricardo, e ganha espaço no Chat](../../tarefas-a-executar/2026_09_16_copia-do-usuario-cadastrado.md) | Pedido dela em 16/09, ao receber `[PSA - COPIA COORDENACAO]`. O e-mail abre com "Olá, Ricardo!" e diz "vinculado à sua área": vai virar texto sem nome próprio, para o grupo `coordenacao@psaconsultores.com.br` (**D1 decidido por ela em 16/09**, entre quatro opções medidas; criar o grupo é a T0), e ganha um espaço no Chat. Medido em produção: **6 cadastros em 30 dias**, e **6 dos 13 de 90 dias são `client` sem área nenhuma**, ou seja, a frase da área mente em quase metade dos casos. O e-mail não nasce no banco nem em edge function: sai do front, de **três** pontos, para o webhook do n8n, e a saudação mora dentro do fluxo de lá. Dois bugs junto: o webhook é o **mesmo** no sandbox e em produção (usuário de teste manda e-mail com senha e cópia à coordenação), e a senha temporária viaja no payload, a um clique do nó do Chat | **Não.** Nem migração, nem RPC. O que muda é o payload do POST e o fluxo do n8n | 🔵 ABERTO |

## A caixa de tabela: branca ou tingida

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [11 A caixa de tabela: branca ou tingida, e o padrão muda junto](../../tarefas-executadas/2026_09_16_caixa-de-tabela-branca-ou-tingida.md) | Pergunta dela em 16/09, ao ler que a tabela do Adm & Fin virou **exceção** no inventário da catraca: "então não é padrão ser branco? Tem que me avisar quando não for o padrão, porque aí tem que mudar o padrão". Medido: **53 caixas de tabela em 49 arquivos, e só 1 branca** — a do Adm & Fin, que ficou branca porque ela mandou em 15/09 ("tá tudo verde"). As outras 52 são tingidas **sem ninguém ter escolhido isso para tabela**: herdaram a classe base do `<Card>`. A decisão já estava desenhada e nunca teve resposta — a seção 6 de [`o-branco-que-sobrou.html`](../../geral/comparacoes-de-cor/o-branco-que-sobrou.html) marca "tabela branca, porque tabela se lê pelas linhas" como **recomendada** desde 12/09, e a seção 8 diz que o conserto é variante do `<Card>`, **não exceção**. **A T1 saiu em 16/09 e o achado dela mudou a pergunta: o hover de linha tem TETO.** A zebra perdida sobre o cartão se recupera subindo o alfa de 25% para 38%; o hover não, porque é feito de `--muted` e o cartão já é 35% dele — mesmo a **100%, sem transparência**, chega a 1,154:1 contra os 1,175:1 que tem sobre o branco. Não é calibração, é fim de escala, e vale nas três áreas. Como o hover é o único dos dois que serve para **agir**, ele decide. O custo do branco também está medido: `--card` e `--background` têm o mesmo valor, então caixa branca sobre a página fica a **1,000:1** e só a borda a segura — mas onde há casca tingida atrás (o Adm & Fin) o custo some e o branco ganha nos dois eixos. Faltam o caminho de código conforme a resposta e inverter a catraca de lado nesse recorte, senão a próxima tabela nasce tingida de novo | **Não.** Superfície de tela; nem migração, nem RPC, nem policy | ✅ **FEITO (16/09).** Ela escolheu **B, tabela branca** diante da [comparação](../../geral/comparacoes-de-cor/a-caixa-da-tabela.html), e as três subtarefas saíram no mesmo dia: a variante `tabela` no `<Card>`, os **45 cartões em 42 arquivos** (não 53 em 49 — a contagem do plano somava tabela que estava fora de cartão) e a catraca `caixaDeTabela.test.ts`, que cobra o contrário da `cartaoTingido`. Quatro commits, um por raio de revert; o visual reverte sozinho em `f66e5476`. **Falta só a conferência na tela, e é dela:** com a caixa branca sobre a página a 1,000:1, quem segura a caixa é a borda |

## O Board acompanha o cartão tingido

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [12 O Board acompanha: o cartão dele desce para tingido](../../tarefas-executadas/2026_09_17_board-acompanha-o-cartao-tingido.md) | Decisão dela em 17/09 ("o board acompanha então"), com a ressalva "só os gráficos do board que eu gosto deles, acho moderno e clean". O Board ficou branco em 12/09 **por omissão, não por escolha**: a tinta entrou no `<Card>` e ele não passa por lá — pinta com CSS à mão no `index.css` (`.v3-card`, `.v4-card`, `.kpi`, `.mc`) lendo `--bd-surface`, que é `hsl(var(--card))`. Alcance maior que o nome: **19 arquivos**, incluindo `/gerencial/desempenho` e `/gerencial/performance`. Dos **48** tokens `--bd-*`, 23 já derivam do contrato e **25 são cravados**. **A medição desfez o argumento que segurava a frente:** descer a superfície não reprova nenhum degrau de TEXTO — pior caso `--bd-warn-d` na OSG, **4,98 → 4,64:1** contra piso de 4,5 —, então a medição de 21/08 sobrevive e não precisa ser refeita. Quebram **três**: a **zebra inverte de SINAL** (`--bd-surface2` passa de mais escuro para mais claro que a superfície nas três áreas, com a razão quase inalterada — catraca que medisse só a razão daria verde nas três), a divisória `--bd-line2` perde ~70% do degrau, e **a grade tracejada do gráfico é esse mesmo token** (`GRID_STYLE.stroke`), ou seja, o descuido apaga metade do que ela gosta. O que os gráficos **não** perdem está inventariado: paleta categórica já derivada dos `--tag-*`, forma (`BAR_RADIUS`, raio 16/12/9), eixo em `--bd-ink3` e tooltip, que fica branco por flutuar sobre conteúdo. Quatro commits por raio de revert, com a tinta isolada dos degraus, e catraca `superficieDoBoard.test.ts` que cobra o **sinal**, não só a razão | **Não.** Superfície de tela; nem migração, nem RPC, nem policy | ✅ **FEITO e validado por ela em 17/09.** Os cinco passos estão marcados no arquivo da tarefa e o código confirma: `--bd-surface` é `hsl(var(--muted) / .35)`, não mais branco. Esta linha dizia ABERTO até a triagem de 23/09 |

## O `bg-white` cru em caixa

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [13 O `bg-white` cru: a caixa que nenhuma catraca vê](../../tarefas-executadas/2026_09_17_bg-white-cru-em-caixa.md) | Frente achada em 12/09 **medindo outra coisa**, aberta em 17/09 quando o número do índice foi remedido e estava errado. `bg-white` é o branco literal do Tailwind: não acompanha tema (no escuro continua branco) e não pega a temperatura da área (a OSG é areia, a Tax é cinza-azulado, e ele é branco puro e frio no meio das duas). **Nenhuma das duas catracas enxerga** — a `cartaoTingido` procura `bg-card`, e a de cor crua só dispara em sobrescrita de componente do `ui/`; `div` solta passa pelas duas. **O 142 do índice estava errado**: era o total bruto, não o recorte de caixa. Remedido com o scanner da própria `cartaoTingido` (expressão de classe, não linha): **139 em 78** no total e **60 em 43** em caixa arredondada. Inventário por motivo fecha em 60: **13 ficam** (site público 8, véu sobre escuro 2, `iframe` de PDF 2 — a página do PDF *é* branca —, tooltip 1) e **47 convertem** (4 pílulas de controle segmentado, que viram `bg-card`, e 43 caixas de conteúdo). **O argumento visual está na OSG:** 12 das 43 são de tela dela, e essas 12 têm `border-osg-200/70` e `shadow-[…--osg-700…]` na **mesma string** do `bg-white` — metade da caixa acompanha a área, a outra metade não. É o achado do `acentoArea.tsx` de 11/09 outra vez. **Achado que não é de cor e não se decide sozinho:** `ChecklistDocumentosCliente` (cliente) e `ChecklistPendentes` (OSG) são a **mesma tela escrita duas vezes**, com o token da área cravado no componente em vez de resolvido pelo `<html>` — 7 das 60 ocorrências estão nessa duplicação. Registrado com o número dos dois lados; unificar é decisão dela | **Não.** Superfície de tela; nem migração, nem RPC, nem policy | ✅ **FEITO (17/09).** Os 47 converteram em dois lotes e a fila caiu de **60 para 13**. O lote 1 (20) saiu sem decisão dela, e **a catraca do cartão pegou sozinha** — os `bg-card` novos caem no inventário dela, que exige o motivo de cada caixa clara: reprovou antes da classificação e passou depois, prova nos dois sentidos sem fabricar defeito. O lote 2 (27) ela decidiu olhando [`o-branco-literal-das-27.html`](../../geral/comparacoes-de-cor/o-branco-literal-das-27.html) e escolheu **claro nos quatro papéis**. **O achado que mudou o lote 2:** na OSG `--card` e `--background` são o mesmo valor, então `bg-card` ali fica a **1,000:1** contra a página e quem segura a caixa é a borda — o literal estava a 1,031:1, ou seja, **a conversão perdeu separação de propósito**, o mesmo custo aceito na tabela em 16/09. Catraca `filaDoBranco.test.ts` com três asserções, incluindo o **total fora do recorte de caixa**, que existe porque confundir os dois recortes foi o erro do "142". A varredura por expressão de classe subiu para o `medirCorCrua.ts` ao virar a segunda consumidora |

## Ordem de serviço editável de qualquer tela

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [8 A OS passa a ser editável de qualquer tela](../../tarefas-a-executar/2026_09_16_os-editavel-de-qualquer-tela.md) | `ordem_servico` é gravada **num lugar só**, dentro do `useSaveClientTransaction` (1344 linhas), e não como hook de entidade: editar uma OS de outra tela hoje só duplicando a escrita. Extrai `useUpsertOrdemServico` e cria o `OrdemServicoModal` no molde do `PessoaModal`, que já é montado por **cinco** telas da OSG Work com uma escrita só. Cinco subtarefas, começando por teste de caracterização. **Rateio e produtos contratados entram no hook** (decidido em 16/09): ~233 linhas a extrair, e as duas amarras a travar antes são o `filhosDeOsAlterados` (ligado em 6 pontos, lido pelo "nada mudou" do cliente inteiro) e a reconciliação do rateio, que existe por um defeito de 100%→200%→300%. Raio medido: **1** arquivo escreve as três tabelas, 16 só leem, **1** componente monta o transaction. Nasceu do Controle de Projetos: OS sem data recusa a criação do projeto e obriga a ir ao cadastro do cliente e voltar. **O gatilho não é o volume** (2 de 84 OS da OSG sem data), **é a segunda tela pedindo a mesma coisa** | **Não.** Refatoração de código; schema e policies intactos, e a permissão continua sendo a RLS mais o `podeEditarCadastroCliente` | 🔵 ABERTO |

## Faturamento: os campos novos da OS

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [9 Os campos novos da OS para o faturamento](../../tarefas-a-executar/2026_09_16_faturamento-campos-novos-da-os.md) | As **quatro frentes** que sobraram da validação do financeiro em 15/09, depois de a tela já ter entregue tudo que existia no banco: parcela com **competência e vencimento** (16 das 155 OS são parceladas e ninguém sabe quando vencem), **texto que vai na NF**, **N contribuintes por OS** com regra de divisão (30 clientes já têm duas ou mais pessoas físicas cadastradas) e **reembolso por tipo** em tabela, no lugar das duas colunas fixas. Dois cuidados escritos na tarefa: o rateio por centro de custo **não** é a divisão da nota entre CNPJs do cliente (tabelas separadas), e a `os_parcela` é a **mesma tabela** da tarefa do ERP da Centro Oeste, onde o parcelamento são doze bits de mês — quem desenhar uma desenha a outra | Sim, **3 a 4 ⚠️ MIGRAÇÕES**, e duas delas mudam de forma conforme a resposta | ⛔ **Bloqueada nas 7 respostas da Letícia**, enviadas em 15/09. Perguntas desenhadas em [`planos/perguntas-faturamento-leticia.html`](../../planos/perguntas-faturamento-leticia.html) |

## Avisos de prazo de tarefa

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| **[6 A redação dos avisos de prazo vai para produção](../../tarefas-a-executar/2026_09_02_redacao-dos-avisos-de-prazo.md)** 🔴 | A GES-01A subiu a produção em 02/09 **com o texto de trabalho**, e o cron está **ativo**: toda manhã às 7h a equipe recebe `Tarefa atrasada:` com corpo `Prazo em …`, no futuro. Leva a redação fechada pela Patricia, os acentos, e o gestor passa a receber só o atraso. | Sim, **1 ⚠️ MIGRAÇÃO** (`20260902210245`), só duas funções, nada de schema. **Não aplicada** | 🔴 **Urgente pelo cron**: escrita, aguarda o passo humano no Lovable |

## Relatórios e Apresentações

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [15 Relatórios e Apresentações](../../tarefas-executadas/2026_09_18_relatorios-e-apresentacoes.md) | Textos aprovados, alternador horizontal e vertical do diagrama, impressão e confirmação individual de cada arquivo gerado. | Sim, **⚠️ MUDANÇA DE RPC**: publicar `gerar-apresentacao` e `gerar-slides-tributarios`; o sandbox também precisa dos três modelos `.pptx` no bucket privado `osg-templates`. | 🟡 **Código pronto; validação sandbox pendente** |

## O padrão único das explicações contextuais

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [14 O padrão único das explicações contextuais](../../tarefas-executadas/2026_09_17_padrao-de-texto-explicativo.md) | Decidir **antes das próximas rotas** como a ferramenta explica a si mesma: tooltip, texto de apoio, placeholder, rótulo e mensagem contextual, hoje escritos com estruturas e vozes diferentes em cada tela. Medido em 17/09: **dois mecanismos de tooltip** convivem sem regra — 117 `<Tooltip>` do shadcn contra **151 `title=` nativos** (54 deles em `<button>`), e o nativo, que é o maior, não aparece no toque nem tem estilo; **metade do que se chama tooltip é rótulo, não explicação** (a mediana do texto literal é 1 caractere, e os curtos são "Editar OS", "Remover contribuinte" — o único nome que o botão de ícone tem), enquanto 39 dos 117 são explicação de verdade, atrás de um ícone (i); **o tamanho já estourou** em 15 casos acima de 80 caracteres, e o maior, de **521**, começa com "Como ler esta tabela" e é nota de leitura da tela, papel que hoje não existe; o placeholder tem padrão não escrito (`Selecione…` 130 × `Selecionar…` 23, `Ex:` 57 × `ex:` 18) e a pontuação é sorteada (23 com ponto, 94 sem). **Metade do vocabulário já está decidida** e não é lida fora de onde nasceu — o catálogo de recusa da sprint 12 e a palavra única de status. Entrega um padrão de uma tela e meia em `geral/texto-explicativo-na-tela.md` mais catraca `textoDeAjuda.test.ts`; **a conversão dos 143 `title=` fica para tarefa própria**, depois do padrão | **Não.** Documento e catraca; nem migração, nem RPC, nem policy | 🟡 **PARCIAL (17/09).** O padrão saiu em [`geral/texto-explicativo-na-tela.md`](../../geral/texto-explicativo-na-tela.md), com as três decisões dela fechadas: o **degrau 0** (botão de ícone não tem rótulo para repetir — o texto dele **é** o nome, e ali tooltip e nome acessível cumprem funções diferentes), `title=` **fora** dos mecanismos permitidos para explicação nova (os 143 viram dívida inventariada, e o documento existe para impedir o 144º) e o texto de apoio como papel oficial, com `FormDescription` na composição de formulário e o mesmo papel fora dela — redigido assim por um número que só apareceu na hora de escrever: **10 arquivos usam `FormItem`, contra 645 `<Label>` soltos**. **A etapa 7 passou em 17/09**, feita como teste de uso e não releitura: três dry-runs, e o veredito confirmou tirar placeholder e mensagem contextual dos degraus — a árvore passou a responder uma pergunta só. Quatro correções vieram do uso, três delas contradições internas que só aparecem aplicando (infinitivo contra imperativo no rótulo de controle; texto de apoio mandando começar pela consequência com exemplo que começa pela condição; e o `rlsMessages.ts`, catálogo de **recusa**, parecendo virar repositório universal de microcopy). A quarta fechou o `Todos`/`Todas` com o código conferido: são "Todos os clientes", "Todas as OS", e já existem **58 `SelectItem value="all"`** com esse rótulo — não é placeholder, é o rótulo da opção, e tem de casar com ele. **A catraca `textoDeAjuda.test.ts` está no ar**, com três asserções congeladas (143 `title=`, os 3 tooltips acima do teto, 226 placeholders fora do cânone) e vista reprovando antes de passar: a do `title` imprime "Agora: 144 em 81", que é o objetivo do documento dito pelo teste. Achado da execução: **medir o tooltip bruto superestima 17×** (52 casos contra 3 reais), porque conta markup — por isso aquela asserção lê o texto, não a regex. **A conversão saiu em 17/09, em quatro lotes por raio de revert** (`d1980d59`, `147bfa1d`, `4488f524`, `9809b16b`), depois de ela aprovar as sete mudanças diante de [`comparacoes-de-texto/as-conversoes.html`](../../geral/comparacoes-de-texto/as-conversoes.html): **a dívida do `title` fechou em zero** (215 → 89 → 8 → 0), sobrando só os 8 `<iframe>` que o padrão mantém, e a catraca passou a congelar zero — `title=` novo em tag nativa agora é regressão. **Falta o maior lote, os 226 placeholders**, e é o único que não se automatiza: cada caso escolhe entre `Selecione…`, `Buscar…` e `Ex: …`, e alguns viram texto de apoio. ⚠️ **Um commit a resolver antes:** o `9809b16b` levou junto três arquivos da frente de Faturamento, por `git add -A` com trabalho de outra sessão no tree — nada se perdeu, a mensagem é que está errada |

## Como usar esta pasta

- **Uma tarefa = um arquivo** `TAREFA_<slug>.md` nesta pasta.
- Planos de design/arquitetura mais longos continuam em `docs/planos/`, e a tarefa linka para
  eles em vez de duplicar.
- Cada tarefa traz subtarefas numeradas (`T1`, `T2`, …) e bugs achados no caminho (`B1`, `B2`,
  …), com marcação explícita de **⚠️ MIGRAÇÃO** ou **⚠️ MUDANÇA DE RPC** quando depende do
  Lovable.
- Ao concluir uma subtarefa, marcar `✅ CONCLUÍDO (data)` dentro do arquivo da tarefa e
  atualizar a coluna Status desta tabela.

## As planilhas desta pasta

Não são versões da mesma coisa: a fila da sprint 13 foi **cortada progressivamente**, e cada
arquivo é um escopo diferente. Medido em 23/09/2026.

| Arquivo | O que é |
|---|---|
| `Tarefas_Sprint_13_OSG_para_importacao.xlsx` | **O escopo completo antes dos cortes: 62 tarefas.** 40 delas não sobreviveram ao corte e só existem aqui com descrição longa |
| `Tarefas_Sprint_13_OSG_para_importacao_V7.xlsx` | 38 tarefas, e é a única que traz `TIP-01..04`, `CAD-T1..T5`, `GOV-C/F/G`, `GO-06` e `GO-08` |
| `Tarefas_Sprint_13_OSG_para_importacao_V8.xlsx` | **O escopo final: 29 tarefas.** É o que a sprint efetivamente levou |
| `Tarefas_Sprint_13_OSG_resumido.xlsx` | As 62 da lista completa, com descrição curta — bom para ver a fila inteira de relance |
| `Planejamento_Sprint_13.xlsx` | 76 linhas de "fica ou sai", com horas e a âncora de cada uma na sprint 12 |

As versões V2 a V6 foram apagadas em 23/09 depois de provado que **não trazem nenhum ID nem
texto** que os cinco arquivos acima não tenham. Estão no histórico do git.
