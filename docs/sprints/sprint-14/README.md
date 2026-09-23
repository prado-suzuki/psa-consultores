# Tarefas da sprint 14

Índice das tarefas delegáveis desta sprint. Uma linha por tarefa; o detalhe (contexto,
subtarefas Tn, aceite, referências de código) vive no arquivo `TAREFA_*.md` correspondente.

## Onde estão as solicitações de documentos

As duas nascem da mesma pergunta dela em **21/09/2026**, testando o módulo de onboarding
como quem entrou na OSG naquele dia: *"e onde que está a lista geral das solicitações?"*

**A resposta é que não existe** — e a varredura foi exaustiva: uma única página cita
solicitação (`Onboarding.tsx`), uma única leitura da tabela em todo o `src/`
(`useDomainSolicitacao.ts`, sempre `.eq('cliente_id', …)`), nenhuma view nas migrations. A
única RPC que busca sem receber cliente é do portal, resolvida por `auth.uid()`.

São **dois problemas diferentes**, e por isso duas tarefas: uma é não haver visão de
conjunto, a outra é não haver como voltar no que já foi pedido a um cliente.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [1 A lista geral de solicitações](TAREFA_lista-geral-de-solicitacoes.md) | Tela que responde "quais clientes têm solicitação, em que estado e desde quando", hoje só descobrível abrindo cliente por cliente. **A leitura já está autorizada**: a policy `cluster can view solicitacao` recorta por `cliente_visivel_para`, então nada de policy nova. ⚠️ **O risco é ambiente:** `solicitacao` não tem a coluna e não está em `ambienteScope.ts` — nunca precisou, porque a tela lê uma por vez; uma lista que atravessa clientes mistura sandbox e produção se o recorte manual não for feito | **Não.** Nem migração, nem RPC, nem policy | 🔵 ABERTO |
| [2 O histórico de solicitações de um cliente](TAREFA_historico-de-solicitacoes-do-cliente.md) | `buscarSolicitacaoDoCliente` faz `.limit(1)`: traz a ativa ou a última encerrada. Como `abrirNovaSolicitacao` cria quantas forem ao longo do tempo, **as anteriores estão no banco e não têm porta na ferramenta**. Tem uma decisão de produto antes do código (**D1: só informar ou navegar**), e a T0 é medir quantos clientes têm mais de uma — pode encerrar a tarefa | **Não.** As linhas já existem e a leitura já é autorizada | 🔵 ABERTO, **bloqueada na D1** |

### Ordem sugerida

Independentes. As duas começam medindo em produção por SELECT (MCP do Lovable, **só
SELECT**), e na tarefa 2 essa medição pode encerrar a frente antes de virar trabalho.

As duas **consomem** o plano de UX
[`osg/ajustes-ux-solicitacao-de-documentos.md`](../../osg/ajustes-ux-solicitacao-de-documentos.md)
e não redecidem nada dele: o selo sai de `solicitacaoStatusColors.ts` (fatia 5) e o estado
derivado — finalizada × cancelada — de `estadoDaSolicitacao()` (§0 e §1.7). Uma lista que
chamasse de "Finalizada" um rascunho cancelado reintroduziria o defeito que aquele plano
existe para corrigir.

## Estrutura do Cliente — as cinco telas do cadastro

Nascem do teste de uso dela em **21/09/2026** nas cinco rotas do agrupamento: *"botões
repetidos, falta de padrão, tooltips que não explicam ou que faltam"*. A leitura confirmou
isso **e encontrou duas coisas maiores embaixo**, que não são de UX: dois diálogos de
exclusão descrevem menos do que a exclusão faz.

Por isso **duas tarefas**, e a ordem entre elas importa: uma é correção de fato, a outra é
consistência.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [3 As exclusões apagam mais do que dizem](TAREFA_exclusoes-que-apagam-mais-do-que-dizem.md) | Excluir um bem apaga em cascata os movimentos de quota pagos com ele — reescreve o capital social registrado — e o diálogo fala só de matrículas; em produção o bem `PS-BARR-01` tem **0 matrículas e 42 movimentos**, e o diálogo dele diz "Nenhuma matrícula vinculada". Excluir uma pessoa lista um vínculo de sete, e para **19 titulares e 53 pessoas com movimento de quota** simplesmente **falha**, imprimindo Postgres em inglês na tela. Quatro defeitos (B1-B4), oito subtarefas, três PRs sugeridos | **Não.** As regras de FK já estão em produção e não mudam; os dois hooks novos são `SELECT` | 🔵 ABERTO |
| [4 As cinco telas falam a mesma língua](TAREFA_consistencia-das-telas-de-estrutura-do-cliente.md) | As dez fatias de consistência: falha de consulta deixando de ser lista vazia, nome acessível em todo botão de ícone (`ButtonTooltip` no lugar de `title=` e de nada), o lápis saindo da coluna de Ações (a linha já abre o modal — é o "botão repetido" relatado), a regra de elegibilidade do bem visível na lista, "Papel" com um nome e uma fonte no lugar de quatro cópias, o Quadro Societário dizendo por que uma PJ não virou aba, "participa da estruturação" desfazendo a colisão com "integralizado", "órfã" dita uma vez em vez de três, o botão de criar no mesmo lugar nas cinco, e rótulo de verdade nos filtros. **Dez subtarefas independentes** — qualquer ordem, qualquer corte de PR | **Não.** Tudo deriva de dado que as telas já carregam | 🔵 ABERTO |

### Ordem sugerida

**A 3 antes da 4.** Não há dependência técnica — nenhuma subtarefa da 4 precisa da 3 —, mas
as duas tocam `QualificacaoDasPartes.tsx` e `DiagnosticoPatrimonial.tsx`, e a 3 é a que
impede alguém de apagar o capital social de uma empresa clicando numa lixeira. Se forem em
paralelo, combinar propriedade por arquivo antes de começar.

As duas **consomem** a especificação
[`osg/ajustes-ux-estrutura-do-cliente.md`](../../osg/ajustes-ux-estrutura-do-cliente.md) e
não redecidem nada dela: as doze fatias foram aprovadas por ela em 21/09, o texto está
escrito, e **redação aprovada não se reescreve no PR** (§6 de
`geral/texto-explicativo-na-tela.md`). A evidência de produção e as regras de FK estão no
apêndice A; a conferência contra os padrões da casa, no apêndice B — inclusive os quatro
pontos em que a árvore **derrubou** o tooltip que o relato pedia.

Três achados transversais ficaram **registrados e deliberadamente fora** das duas: ampliar a
catraca de `<Button title>` ao repositório (acende cinco arquivos fora deste módulo), a
flexão dos `(s)` (mesmo lote da Solicitação de Documentos), e os outros 13 `error.message`
em toast dos dois hooks.

## O painel de notificações enviadas

Nasce do alinhamento com a Mariana (IAplicada) em **18/09/2026**, ao ver o acompanhamento de
disparos do sistema dela: *"onde que eu vejo onde foi enviado o e-mail da solicitação do
cliente? quando? quantos dias? (…) é enviado um monte de notificação, mas eu não tenho um
painel central pra eu ver o que que tá rodando."*

**A premissa estava errada, e isso encurta a tarefa.** O painel existe — por solicitação,
dentro do `ModalAvisarCliente`. O que não existe é a visão de conjunto: as **duas** leituras
de `notificacao_envio` em todo o `src/` são recortadas por entidade, e **nenhuma página**
cita a tabela.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [5 O painel de notificações enviadas](TAREFA_painel-de-notificacoes-enviadas.md) | Tela que responde "quais avisos saíram, para quem, por qual canal e quando", hoje só descobrível abrindo solicitação por solicitação. **A leitura já está autorizada**: a policy `equipe e destinatario can view notificacao_envio` libera `team_member` e acima sem recorte por entidade. O achado que decide a tela: o hook de hoje filtra `['enviado','entregue','lido']` **no banco**, de propósito — *"tentativa que falhou fica no banco para o Digital investigar"*. O painel dela é o do Digital, e é justamente a falha que ele precisa mostrar. ⚠️ **O risco é ambiente:** `notificacao_envio` não tem a coluna e não está em `ambienteScope.ts`, e aqui é pior que na 1 — `entidade_tipo` é `text` livre, então o recorte passa pela entidade de origem de cada tipo | **Não.** Nem migração, nem RPC, nem policy. A escrita continua exclusiva da chave de serviço | 🔵 ABERTO, **bloqueada na D1** |

### Ordem sugerida

Independente das quatro anteriores, mas **irmã da 1**: mesmo formato de problema (dado
autorizado, leitura sempre por uma entidade, nenhuma visão geral) e **o mesmo risco de
ambiente**. Se as duas forem em paralelo, o recorte de ambiente é a peça compartilhada —
combinar quem escreve antes de começar.

A **D1 vem antes do código** e é de produto: o painel é do Digital (mostra o que falhou) ou
do consultor (só o que chegou)? A recomendação é o do Digital, porque o do consultor já
existe. A T0 mede em produção quantos disparos têm `sucesso = false` e quantos ficaram
`pendente` há mais de uma hora — e esse número muda o peso da decisão.

## As duas que nasceram da varredura das reuniões de 18 a 22/09

Não vieram de teste de tela: vieram de **seis reuniões gravadas** entre 18 e 22/09/2026,
lidas por transcrição e depois conferidas contra o repositório. **Nas duas, a varredura
contradisse o que foi dito na reunião** — e é essa contradição que define a tarefa.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [6 As notificações que "não estão rodando"](TAREFA_crons-de-notificacao-em-producao.md) | O levantamento apresentado em 18/09 concluiu que cinco notificações não funcionam porque *"o código existe, mas não há agendamento ativo"*. **Metade dessa conclusão está errada:** o cron `20260825132757_cron_cobrar_solicitacoes_vencidas.sql` traz uma seção chamada `-- NASCE DESATIVADO, E ISSO NAO E CAUTELA EXCESSIVA`, porque a migration roda nos dois bancos e ativo cobraria cliente em dev no dia seguinte, apontando para o e-mail real do Alexandre. Não é código faltando; é job que precisa ser ligado **em produção**, de propósito. A T0 mede `cron.job` e `cron.job_run_details` e **pode encerrar a frente**; a T1 separa o que está desativado por decisão do que nunca foi agendado — o levantamento de 18/09 juntou os dois num grupo só | **Não** para medir e classificar. ⚠️ **Ligar o job em produção é PASSO HUMANO pelo chat do Lovable** — agente não executa, nem por MCP | 🔵 ABERTO |
| [7 O prefixo `[TESTE]` nos cadastros de dev](TAREFA_prefixo-teste-nos-cadastros-de-dev.md) | Ele disse em 22/09, mostrando o feed, que ia tirar os prefixos *"porque o banco tá completamente separado"*; ela respondeu *"só dar uma olhada e apaga os clientes que têm nome igual"* — aceite condicional a uma conferência que ninguém fez. **A medição desmontou o risco:** ninguém no `src/` filtra pelo texto do prefixo, os cinco usos são **comentário**, nenhuma migration o escreve, e o recorte de ambiente é por `cliente.ambiente` nos dois hooks que importam. O que se perde é a rede de segurança que o `AGENTS.md` descreve — e o argumento dele responde ao vazamento **entre bancos**, enquanto a regra fala do vazamento **dentro** de um. Traz um achado com dono próprio: **o `AGENTS.md` cita `20260814190000_dev_clientes_prefixo_teste.sql`, que não existe no repositório** | **Não.** Quase não é código: é uma decisão dela mais uma correção no `AGENTS.md` | 🔵 ABERTO, **bloqueada na D1** |

### Ordem sugerida

**A 6 antes da 5.** Não há dependência de código, mas a 5 mostra *o que saiu* e a 6 diz *o
que deveria ter saído*. Sem a 6, a tela da 5 mostraria silêncio e ninguém saberia se é
porque não há o que enviar ou porque o job está dormindo.

A **7 é independente das outras três** e não toca arquivo que elas tocam. A recomendação
registrada nela é **esconder o prefixo na renderização do feed** em vez de remover do dado:
responde ao incômodo real sem perder o canário nas outras telas, e é reversível numa linha.
A decisão é dela.

## A porta de entrada do backlog

Decisão dela em **22/09/2026**, no fim da varredura das seis reuniões: as tarefas que
nascem dessa leitura terminam aqui em `docs/sprints/`, e **só entram no backlog da
ferramenta se alguém digitar à mão**. As sete acima são a prova — foram escritas hoje e
nenhuma está em `/equipe/backlog`.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [8 Criar item de backlog por fora do app](TAREFA_criar-item-de-backlog-por-fora-do-app.md) | Uma edge function que expõe por HTTP o que `useCriarDemandasBacklog` já faz por dentro, para que agente, script ou n8n criem item em `sprint_backlog_items`. **Metade já existe:** a tabela, o payload (`useCriarDemandasBacklog.ts:35-43`), a tela (`/equipe/backlog`) e o molde de autenticação (`gerar-demandas-sprint/index.ts:36-57`). **O problema de desenho não é a inserção, é a auditoria:** o `AGENTS.md` exige `useAuditLog` em todo CUD, `useAuditLog` é hook React, e **nenhuma edge function grava auditoria hoje** — esta seria a primeira. Daí a **D1**, que é de verdade: `performed_by` e `suggested_by` são FK para `profiles.id`, e quando quem cria é um robô não há pessoa. Três saídas (token de gente real, perfil de serviço, nulo com origem no `details`), recomendação de **perfil de serviço**. A **D2** é quem pode chamar: a função escreve com `SERVICE_ROLE_KEY` e **atravessa a RLS**, então o papel tem de ser conferido no código | **Não.** A tabela e as colunas existem. ⚠️ Mas a entrada em `supabase/config.toml` é **passo humano** (arquivo que o `AGENTS.md` proíbe editar) e publicar em produção é **pelo Lovable** | 🔵 ABERTO, **bloqueada na D1 e D2** |

### Ordem sugerida

**Independente das sete**, e a única que não é da OSG: entra no balde de **ajustes gerais
da plataforma** que esta sprint já tem (campo de horas da revisão, OS editável de qualquer
tela, abrir rotas de auditoria e jurídico, migrar digital dev, integração com a RP). Pode
ir em paralelo com qualquer uma.

**Nasceu fora do planejamento de 19/09 e não tem hora reservada** — decisão dela em 22/09
de mantê-la nesta sprint mesmo assim. A conta de horas precisa ser refeita com o Bernardo.

O teste de aceitação dela **são as tarefas 5, 6 e 7**: criar as três como itens de backlog,
com o caminho do `.md` no `description`, e conferir que aparecem em `/equipe/backlog`
ordenadas por prioridade e que há três linhas novas em `audit_logs`.

**Se a T3 (auditoria) for cortada por tempo, corte a tarefa inteira junto.** Porta de
escrita sem trilha é pior que não ter porta.

## A IA no sandbox

Nasce de 23/09/2026: o botão **Ditar tarefas** do backlog foi publicado no sandbox e
respondeu 503, porque lá não há chave de IA. Ela preferiu que o Bernardo avaliasse as
opções antes de alguém colar uma chave.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [9 A IA não responde no sandbox](TAREFA_chave-de-ia-no-sandbox.md) | A `LOVABLE_API_KEY` não pode ser obtida fora de um projeto do Lovable (`planos/agente-psa-assistente.md` §6.0), e **sete das nove** funções de IA leem só ela. Uma chave Anthropic própria destrava as outras duas, entre elas `gerar-demandas-sprint`. Quatro opções (chave própria, helper com fallback, resposta simulada, testar só em produção) e três decisões: qual opção, de quem é a chave e se o mesmo provedor serve à transcrição de áudio. A **T0** confere se `gerar-demandas-sprint` está publicada em produção com o modo `ditado` | **Não.** Configuração de ambiente e, na opção B, um helper nas edge functions | 🔵 ABERTO, **com o Bernardo** |

## Como usar esta pasta

Uma tarefa = um arquivo, com subtarefas numeradas (`T1`, `T2`, …), bugs achados (`B1`, …) e
marcação explícita de ⚠️ **MIGRAÇÃO** / ⚠️ **MUDANÇA DE RPC** quando depender do Lovable. O
plano de design longo mora em `docs/planos/` ou na pasta do módulo — a tarefa **linka**,
não duplica.
