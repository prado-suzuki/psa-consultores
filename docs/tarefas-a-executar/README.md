# Tarefas a executar

**Tudo nesta pasta é trabalho que ainda falta fazer.** Não há aqui tarefa entregue, tarefa
cancelada nem documento de consulta — é isso que permite abrir a pasta e confiar no que se vê.

Ao ser entregue, a tarefa **sai daqui** e vai para
[`docs/tarefas-executadas/`](../tarefas-executadas/README.md), onde vira histórico. A apuração de tudo que já saiu está em
[`sprints/TRIAGEM-DE-TAREFAS-2026-09-23.md`](../sprints/TRIAGEM-DE-TAREFAS-2026-09-23.md).
As regras de onde cada coisa mora estão no [manual do `docs/`](../README.md).

## Convenção de nome

`yyyy_mm_dd_<o-que-a-tarefa-faz>.md` — a data é a de **criação**, não a de entrega. A pasta
ordena sozinha por idade, e tarefa velha aparece velha. Toda tarefa nova nasce aqui, com esse
nome, e ganha uma linha na tabela abaixo.

## Para subir ao backlog

[`PARA-O-BACKLOG.md`](PARA-O-BACKLOG.md), no formato que o botão **Importar tarefas** de
`/equipe/backlog` lê. Selecione **esse arquivo sozinho**, não a pasta: os arquivos de tarefa
também são importáveis um a um e a pasta inteira traria cada tarefa duas vezes.

---

## As 31 tarefas

Ordenadas por idade. A coluna **Produção** diz o que depende do passo humano no chat do Lovable;
traço quer dizer que a tarefa não toca o banco.

### Dívida técnica e custo — vieram das auditorias de julho

| Tarefa | Estado | Produção |
|---|---|---|
| [2026_07_10 · Botões de edição cruzada no Digital MAPA](2026_07_10_botoes-de-edicao-cruzada-no-mapa.md) | Parcial: a edição de melhoria existe em `ProcessosPage`; **`ProjetosPage` não tem nem `procEmEdicao` nem `melEmEdicao`** | — |
| [2026_07_10 · Dívida técnica de RLS](2026_07_10_divida-tecnica-de-rls.md) | Auditoria de 138 tabelas, dono Eduardo. **O P1 inteiro fechou em produção** (conferido policy por policy em 01/09); sobrou o resto do schema | Já aplicado no P1 |
| [2026_07_10 · Eliminar os warnings do ESLint](2026_07_10_eliminar-warnings-do-eslint.md) | Fases 0 e 1 concluídas, **fases 2 a 10 abertas**. ⚠️ A contagem do documento está vencida — meça com `bunx eslint .` antes de citar | — |
| [2026_07_13 · Reduzir o custo de IA no repositório](2026_07_13_reducao-de-custo-de-ia-no-repositorio.md) | T1, T3 e T4 feitos. **Abertos: T2, T5/T6 e T7.** Medido em 23/09: **31 arquivos de UI acima de 600 linhas** (o aceite é zero) e `docs/geral/mapa-navegacao.md` não existe | — |
| [2026_07_28 · Os casts de tipo nos comentários](2026_07_28_casts-de-tipo-nos-comentarios.md) | **A causa acabou**: o `types.ts` regerado em 31/08 já conhece as três estruturas. Os `as unknown as` nos três hooks viraram peso morto e podem sair — é a única coisa que resta | — |

### Notificações e canais

| Tarefa | Estado | Produção |
|---|---|---|
| [2026_08_06 · Notificações da coleta de documentos (OSG · P1)](2026_08_06_notificacoes-da-coleta-de-documentos.md) | Catálogo de 15 avisos, em 4 entregas. Nenhuma iniciada | 5 dos 15 dependem de campo novo |
| [2026_09_02 · A redação dos avisos de prazo vai para produção](2026_09_02_redacao-dos-avisos-de-prazo.md) | Escrita, migration `20260902210245` pronta | 🔴 **Conferido em 23/09: produção ainda manda o texto antigo** (`Tarefa atrasada:` / `Prazo em …`, no futuro) e o cron `alertar-tarefas-prazo-diario` está **ATIVO**. Erra todo dia às 7h |
| [2026_09_14 · Coleta e menção no Google Chat](2026_09_14_coleta-e-mencao-no-google-chat.md) | Conferido: `avisos_para_o_chat` existe em produção e **não cita** `solicitacao_enviada` nem `org_comment_mentions` | Canal do Chat já existe; o cron `despachar-avisos-do-chat` está **desativado** |
| [2026_09_16 · A cópia de "novo usuário cadastrado"](2026_09_16_copia-do-usuario-cadastrado.md) | T0 é criar o grupo `coordenacao@`. ~10 horas | Não depende de migração |
| [2026_09_22 · As notificações que "não estão rodando"](2026_09_22_crons-de-notificacao-em-producao.md) | **Medido em 23/09:** dos 7 jobs de produção, 6 estão ativos e **`despachar-avisos-do-chat` está desativado** — é job para ligar, não código faltando | Ligar job **em produção** |
| [2026_09_22 · O painel de notificações enviadas](2026_09_22_painel-de-notificacoes-enviadas.md) | **Bloqueada na D1** (painel do Digital ou do consultor) | Leitura já autorizada; risco é recorte de ambiente |

### Solicitação de documentos e OSG Work

| Tarefa | Estado | Produção |
|---|---|---|
| [2026_09_18 · Pendências de validação TIP-02 e TIP-03](2026_09_18_pendencias-de-validacao-tip02-tip03.md) | 5 TODOs de validação abertos; o resto dos dois anexos foi executado em 18/09 | — |
| [2026_09_23 · As cinco telas da Estrutura do Cliente falam a mesma língua](2026_09_23_consistencia-das-telas-de-estrutura-do-cliente.md) | Dez fatias de consistência, especificação já aprovada por ela em 21/09 | — |
| [2026_09_23 · As exclusões apagam mais do que dizem](2026_09_23_exclusoes-que-apagam-mais-do-que-dizem.md) | Excluir um bem reescreve o capital social registrado; 4 defeitos, 8 subtarefas | — |
| [2026_09_23 · O histórico de solicitações de um cliente](2026_09_23_historico-de-solicitacoes-do-cliente.md) | **Bloqueada na D1**. A T0 mede e pode encerrar a tarefa | — |
| [2026_09_23 · A lista geral de solicitações de documentos](2026_09_23_lista-geral-de-solicitacoes.md) | Não existe tela que mostre todas as solicitações | — |
| [2026_09_23 · Nomenclaturas e tooltips do OSG Work](2026_09_23_nomenclaturas-e-tooltips-conferencia.md) | 35 a fazer, 6 já no código, **5** decisões dela; remedido em 24/09: A-02 são 15 telas e não dez, E-09 são 13 pontos e não sete, P-06 deixou de ser decisão. **63,5 h de execução + 14 h de varredura**. Tem roteiro de validação em tela por sessão de cliente, medido por SELECT em 24/09 | Só B-14, que é `tmpl_documento.descricao` |

### Ordem de serviço, faturamento e cadastro

| Tarefa | Estado | Produção |
|---|---|---|
| [2026_08_11 · Atrito de uso no cadastro de clientes (Tax)](2026_08_11_atrito-de-uso-no-cadastro-de-clientes.md) | A1–A11 e B1–B3, nenhum marcado. Validação de CNPJ/UF/e-mail não existe no cadastro | — |
| [2026_09_16 · Os campos novos da OS para o faturamento](2026_09_16_faturamento-campos-novos-da-os.md) | ⛔ **Bloqueada nas 7 respostas da Letícia**, enviadas em 15/09 | 4 das frentes mudam o banco |
| [2026_09_16 · A OS editável de qualquer tela](2026_09_16_os-editavel-de-qualquer-tela.md) | Extrair `useUpsertOrdemServico` de dentro do `useSaveClientTransaction` (1344 linhas) | — |

### Plataforma, feed e equipe

| Tarefa | Estado | Produção |
|---|---|---|
| [2026_07_21 · Unificar modelo de tarefa e conectar as telas do /equipe](2026_07_21_unificar-modelo-de-tarefa-e-conectar-telas-do-equipe.md) | Parcial: T1 e T6 feitos, `tasks` dropada. **T2/T3, T4 e T5 abertos** | — |
| [2026_08_07 · Dashboard "Controle de uso e envio"](2026_08_07_dashboard-controle-de-uso-e-envio.md) | Técnico e gerencial construídos **e rodando com fixtures**. Falta a troca fixture → endpoint da §6 | **Depende de fora deste repo**: os dois endpoints são da engenharia de dados, especificados em [`geral/spec-endpoints-analytics-uso.md`](../geral/spec-endpoints-analytics-uso.md) |
| [2026_09_10 · A conta do usuário em página própria](2026_09_10_conta-do-usuario-pagina-propria.md) | Fase 1 feita em 10/09 (o cartão da barra virou porta). **Aberta a fase 2**: página `/conta`, abas Perfil e Segurança — sem migration, as colunas e o `reautenticar()` já existem | — |
| [2026_09_15 · O teto de instanciações do TypeScript](2026_09_15_teto-de-instanciacoes-do-typescript.md) | O `bun run typecheck` está **vermelho na `develop`** em quatro arquivos e nenhum tem defeito: o programa estoura o teto global. A recomendação é a fachada nos três arquivos agora, e decidir depois entre dividir o programa ou varrer as ~760 consultas | — |
| [2026_09_21 · Melhorias do Feed](2026_09_21_melhorias-do-feed.md) | Lista fechada em 21/09, saída da comparação com o Slack da OSG. Oito itens ordenados por dor dividida por custo | — |
| [2026_09_22 · Criar item de backlog por fora do app](2026_09_22_criar-item-de-backlog-por-fora-do-app.md) | **Bloqueada na D1 e D2** (auditoria em edge function — seria a primeira) | Edge function nova |
| [2026_09_22 · O prefixo `[TESTE]` nos cadastros de dev](2026_09_22_prefixo-teste-nos-cadastros-de-dev.md) | **Bloqueada na D1** (decisão dela) | — |
| [2026_09_23 · A IA não responde no sandbox](2026_09_23_chave-de-ia-no-sandbox.md) | **Com o Bernardo**: 4 opções, 3 decisões | Configuração de ambiente |
| [2026_09_24 · O acesso por papel na área de Projetos](2026_09_24_acessos-por-papel-na-area-de-projetos.md) | Ser responsável por um projeto não concede acesso: `rls_projects_select` lê papel e criador, e `leader_id` não entra em policy nenhuma. Daí a promoção a Líder Geral. **T3 é decisão dela** | — |
| [2026_09_24 · Varredura de acesso por papel no banco](2026_09_24_varredura-de-acesso-por-papel-em-todo-o-banco.md) | 130 tabelas com policy por papel, de 532 policies. Depende do método da tarefa acima. Não é a dívida de `USING (true)` de julho, é o problema inverso | — |
| [2026_09_24 · A âncora da Auditoria e do Jurídico](2026_09_24_ancora-da-auditoria-e-do-juridico.md) | `ancorasDeArea.test.ts` está **vermelho na `develop`** desde `03332a09`: as duas áreas ancoram num tom da paleta de pontinhos, e casa × auditoria dá ΔE 8,7 contra um piso de 10. **T1 é decisão dela** — as duas não têm cor de marca escrita em lugar nenhum | — |

---

## Três frentes sem arquivo próprio

Vêm de [`sprints/sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md`](../sprints/sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md),
que é fonte de tarefas e não tarefa, por isso ficou na pasta da sprint. Os três estão
especificados lá, **nunca foram construídos** (zero arquivos em `src/`, medido em 23/09) e
entraram no `PARA-O-BACKLOG.md` como itens próprios: `GES-02` (resumo semanal aos gestores),
`GES-05A/B` (indicadores gerenciais do sócio) e `SUC-03A/B` (testamento).

A especificação é de 31/08/2026 — remeça contra o produto de hoje antes de executar.

## Duas fontes que ficaram fora

Não são tarefa e não entraram aqui, mas contêm trabalho real e cada uma precisa de uma
triagem própria antes de virar fila:

- [`geral/auditoria-gaps-cud.md`](../geral/auditoria-gaps-cud.md) — inventário das mutations que
  não gravam auditoria. O próprio documento diz que fechá-las é "tarefa futura, revisada à
  parte", porque muda comportamento.
- [`geral/cor-o-que-falta.md`](../geral/cor-o-que-falta.md) — 700 linhas de medição de cor, com a
  lista de retomada no fim. É registro de por que cada coisa parou onde parou, não fila.
