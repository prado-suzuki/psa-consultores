# Índice dos planos — o que já foi executado e o que ainda é trabalho

**Triagem de 01/09/2026, na `develop`.** Este arquivo existe para uma coisa só: **ninguém
abrir um plano de 700 linhas para descobrir, no fim, que ele foi executado em junho** — ou
pior, executar de novo algo que foi revertido de propósito.

## Como usar

Leia a tabela da sua frente, não o repositório inteiro. Cada linha diz o que fazer com o
arquivo:

| marca | significa | o que fazer |
|---|---|---|
| ✅ **FEITO** | o trabalho está no código da `develop` | **não abra para decidir trabalho.** Só como histórico de "por que está assim" |
| 🟡 **PARCIAL** | parte entregue, e a linha diz **o que falta** | abra só a parte que falta |
| 🔵 **ABERTO** | é trabalho a fazer | abra inteiro |
| ⛔ **MORTO** | cancelado, revertido ou superado por decisão posterior | **não execute.** Abrir só para não repetir a decisão |
| 📘 **REF** | não é plano: é decisão, medição, especificação ou texto em vigor | consulta pontual |

**Como cada status foi apurado:** marcador interno do documento + existência do código/da
migration correspondente na `develop` + `git log` do arquivo. Onde o documento diz uma coisa
e o código diz outra, **vale o código**, e a divergência está anotada na coluna de observação.
A seção "Documentos cujo status interno mente" reúne as divergências, porque são exatamente as
que custam tempo.

**Uma ressalva que vale para a tabela inteira:** ✅ aqui quer dizer *está na `develop`*.
Produção é outro banco e recebe migration por passo humano no chat do Lovable (ver
`CLAUDE.md` §"Qual banco esta na sua frente"). Onde a diferença importa, a linha diz.

**E a ressalva vale nos dois sentidos — esta é a lacuna do método acima.** As três fontes de
apuração moram no repositório, e dívida de schema, policy ou dado às vezes é paga **só no
banco**: a migration de produção é aplicada à mão e não deixa rastro aqui, e a
`supabase_migrations.schema_migrations` de lá não registra tudo. Então *não existe migration na
`develop` fechando isso* **não** significa *está aberto em produção*. Quando o assunto da linha
é schema, policy ou contagem de dado, o repositório não decide: confira produção por SELECT
(MCP do Lovable, **só SELECT**) antes de marcar 🟡 ou 🔵. Em 01/09 isso mudou duas apurações —
o P1 do RLS, e o `color_index`, que uma fila de agosto dava como pendente e em produção já é
`NOT NULL`.

---

## OSG — geração de documentos e alteração contratual

| Documento | Status | Observação |
|---|---|---|
| [`planos/override-blocos.md`](planos/override-blocos.md) | ✅ FEITO | Entregue em 16/06/2026 junto com os três abaixo, no mesmo commit |
| [`planos/render-from-snapshot.md`](planos/render-from-snapshot.md) | ✅ FEITO | `gerar/renderizarVersao.ts` |
| [`planos/notificacoes-mudanca-variavel.md`](planos/notificacoes-mudanca-variavel.md) | ✅ FEITO | — |
| [`planos/historico-alteracoes-cadastros.md`](planos/historico-alteracoes-cadastros.md) | ✅ FEITO | — |
| [`osg/plano-binding-namespaced.md`](osg/plano-binding-namespaced.md) | ✅ FEITO | `src/lib/templates/binding.ts` já é namespaced e trata o legado plano |
| [`planos/plano-osg-documentos-recebidos.md`](planos/plano-osg-documentos-recebidos.md) | ✅ FEITO | v1 no ar (`useDocumentoArquivo`). O arquivo é enorme e não tem mais uso decisório |
| [`osg/tela-gerar-descarte-visivel.md`](osg/tela-gerar-descarte-visivel.md) | ✅ FEITO | O próprio documento se declara implementado |
| [`osg/memorial-georref-por-imovel.md`](osg/memorial-georref-por-imovel.md) | ✅ FEITO | ⚠️ **o documento diz "não corrigida" e está vencido**: a migration `20260831093000` e o commit de 31/08 fecharam o B15 |
| [`planos/formato-real-da-alteracao-contratual.md`](planos/formato-real-da-alteracao-contratual.md) | ✅ FEITO | Frentes A a F entregues — migrations `20260826142819` e `..1435xx` a `..1439xx`. Aplicado no sandbox |
| [`planos/ledger-societario-e-alteracao-derivada.md`](planos/ledger-societario-e-alteracao-derivada.md) | ✅ FEITO | F0 a F5 concluídas, F6 executada em 26/08. Ficou aberta uma decisão de projeto na F2 (`quadroEm` por evento) |
| [`planos/derivacao-de-eventos-e-carimbo.md`](planos/derivacao-de-eventos-e-carimbo.md) | 🟡 PARCIAL | Os cinco defeitos corrigidos em 27/08 (§7). **Falta** o que a §"O que NÃO foi feito" lista: congelar `pessoa.id` no snapshot e a redação da consolidação do Agro. Perguntas abertas na §6 |
| [`planos/alteracao-contratual-caminho-b.md`](planos/alteracao-contratual-caminho-b.md) | 📘 REF | Handoff que abriu a frente. Os três planos acima são a execução dele |
| [`osg/contrato-l2-l3-motor-e-blocos.md`](osg/contrato-l2-l3-motor-e-blocos.md) | 📘 REF | **Normativo e em vigor.** Quem mexe no motor de templates lê antes |
| [`osg/ensaio-fluxo-alteracao-contratual.md`](osg/ensaio-fluxo-alteracao-contratual.md) | 📘 REF | Roteiro de demonstração; o script vive em `e2e/demos/` |
| [`osg/ensaio-reorganizacao-societaria.md`](osg/ensaio-reorganizacao-societaria.md) | 📘 REF | idem |
| [`planos/validacao-quadro-societario-roteiro.md`](planos/validacao-quadro-societario-roteiro.md) | 📘 REF | Roteiro de validação da troca de fonte, já executada |
| [`osg/filiacao-derivada-do-parentesco.md`](osg/filiacao-derivada-do-parentesco.md) | ⛔ MORTO | **Revertida de propósito** — a versão implementada destruía dado em produção. A migration foi removida do repo. Não reimplementar sem os requisitos listados lá |
| [`osg/plano-metadados-blob-georreferenciamento.md`](osg/plano-metadados-blob-georreferenciamento.md) | 🔵 ABERTO | **Executa no `psa-backend-api`, não aqui.** Nada a fazer neste repo |
| [`osg/arquitetura-sintese.md`](osg/arquitetura-sintese.md), [`osg/catalogo-familias-e-flags.md`](osg/catalogo-familias-e-flags.md), [`osg/briefing-geracao-documentos.md`](osg/briefing-geracao-documentos.md) | 📘 REF | Documentação de design, declarada como tal. Não são backlog |
| [`osg/ale-27-conferencia-catalogo.md`](osg/ale-27-conferencia-catalogo.md) | ✅ FEITO | Corrigido na migration `20260803235000` |

---

## Coleta de documentos, portal do cliente e avisos

| Documento | Status | Observação |
|---|---|---|
| [`planos/fluxo-solicitacao-documentos.md`](planos/fluxo-solicitacao-documentos.md) | 📘 REF | Decisões de 31/07 — **e duas delas já foram revertidas** pelo `checklist-por-subtracao.md`. Ler os dois juntos ou nenhum |
| [`planos/checklist-por-subtracao.md`](planos/checklist-por-subtracao.md) | 🟡 PARCIAL | Fases 1 e 2 implementadas em 13/08. **Faltam** a válvula do §3.4 e as notificações |
| [`planos/cadastro-vinculo-documentos.md`](planos/cadastro-vinculo-documentos.md) | 🟡 PARCIAL | Direção de desenho da frente do Bernardo. O item 3 do §12 foi fechado pelo checklist por subtração; o resto do §12 segue aberto |
| ~~`planos/area-cliente-documentos-por-tematica.md`~~ e as duas tarefas da [`sprints/sprint-10/`](sprints/sprint-10/) | 🗑️ **APAGADOS** (01/09/2026) | Frente superada pelas 4 gavetas. O lote de banco que nunca rodou (RPC do checklist, coluna `prazo`, enum de status, fluxo de aprovação) **não migrou para lugar nenhum** — se importar, nasce como tarefa nova medida contra o desenho de hoje. Tumba com o porquê em `sprints/sprint-10/README.md` |
| [`planos/notificacoes-osg-coleta-documentos.md`](planos/notificacoes-osg-coleta-documentos.md) | 📘 REF | Mapa dos disparos. Catálogo, não plano |
| [`sprints/sprint-11/TAREFA_notificacoes-coleta-documentos.md`](sprints/sprint-11/TAREFA_notificacoes-coleta-documentos.md) | 🔵 ABERTO | Catálogo de 15 avisos, marcado "A fazer". Só o aviso 8 saiu, virando o GES-04 abaixo |
| [`sprints/sprint-12/TAREFA_cobrar-solicitacao-sem-documento.md`](sprints/sprint-12/TAREFA_cobrar-solicitacao-sem-documento.md) | 🟡 PARCIAL | T1 a T5 fechadas, modelo aprovado na Meta. **Produção não recebeu nada** — nem enum, nem função, nem cron, nem a borda |
| [`sprints/sprint-12/VALIDACAO_aviso-sem-documento.md`](sprints/sprint-12/VALIDACAO_aviso-sem-documento.md) | 📘 REF | Validação do texto do aviso 4 |
| [`sprints/sprint-12/TAREFA_registrar-por-cargo.md`](sprints/sprint-12/TAREFA_registrar-por-cargo.md) | 🟡 PARCIAL | Registrar no cadastro de cliente passou a exigir só cargo. **Em produção** (migração `20260902192547`, commit `3d4c03d5`), conferido no banco e no código. **Falta a validação de uso:** o cadastro que funcionou em 02/09 levou o cluster da própria usuária — falta cadastrar marcando só um cluster que não é dela |
| [`sprints/sprint-12/TAREFA_mensagens-de-recusa.md`](sprints/sprint-12/TAREFA_mensagens-de-recusa.md) | 🟡 PARCIAL | T1–T5 concluídas em 02/09 com testes; D1–D5 fechadas. **Falta a T6, a conferência da Patricia.** A chave `RECUSA_DE_ESCRITA_E_SO_POR_CARGO` segue `false` de propósito — vira `true` quando as migrações da sprint 13 estiverem em produção |
| [`sprints/sprint-13/README.md`](sprints/sprint-13/README.md) e as **5 tarefas** de permissão do cadastro de cliente | 🔵 ABERTO | Auditoria das 32 operações do módulo (02/09/2026). Regra decidida: gravar exige só cargo `sublider`+; ler segue por cluster; linha excluída só em `cliente` e `contribuinte`. Nenhuma migração aplicada. Ordem: 1 → 3; as outras são independentes |
| ~~[`sprints/sprint-13/TAREFA_exclusao-em-cascata-da-os.md`](sprints/sprint-13/TAREFA_exclusao-em-cascata-da-os.md)~~ | ⛔ APOSENTADA (02/09/2026) | Fazia por trigger o que a exclusão física faz sozinha. Com a OS passando a apagar de verdade, a cascata volta a ser nativa da chave estrangeira. A limpeza dos 26 rateios fantasma e 40 produtos presos migrou para a tarefa 5 da sprint 13. **Mantida só como registro do diagnóstico — não executar** |
| [`geral/avisos-cliente.md`](geral/avisos-cliente.md), [`geral/avisos-cliente-validacao.md`](geral/avisos-cliente-validacao.md), [`geral/whatsapp-templates.md`](geral/whatsapp-templates.md) | 📘 REF | **Textos em vigor**, redação da Patrícia. Não são plano e não se reescrevem sem ela |
| [`geral/avisos-prazo-tarefa.md`](geral/avisos-prazo-tarefa.md) | 📘 REF | **Texto em vigor** dos avisos de prazo no sino (GES-01A), redação fechada pela Patrícia em 02/09/2026. A migração `20260902210245` implementa e **ainda não foi aplicada em banco nenhum**; produção não tem nem os dois tipos do enum. Falta também o rótulo dos dois tipos no front, que só compila quando o enum chegar a produção — o texto dele está no documento |
| [`planos/ia-extracao-documentos.md`](planos/ia-extracao-documentos.md) | 🔵 ABERTO | Frente futura, sem tarefas escritas. O próprio documento manda começar pelo experimento da §7, não pela infraestrutura |
| [`sprints/ale-31-teste-integracao-fluxo-solicitacao.md`](sprints/ale-31-teste-integracao-fluxo-solicitacao.md) | 📘 REF | Relatório de teste. Os bugs B3a e vizinhos **não têm status registrado** — conferir no código antes de citar |
| [`ALE-1-registro-notificacao-tipo-chamado.md`](ALE-1-registro-notificacao-tipo-chamado.md) | ✅ FEITO | Registro do enum, commitado em 13/08 |
| [`geral/notificacoes-chamados.md`](geral/notificacoes-chamados.md) | 📘 REF | Descreve o que existe |
| [`planos/correcao-duplicata-mensagens-chamados.md`](planos/correcao-duplicata-mensagens-chamados.md) | ✅ FEITO | Corrigido em 07/08 |

---

## Sprint 11 — mutirão do e2e de geração de contrato

| Documento | Status | Observação |
|---|---|---|
| [`sprints/sprint-11/HANDOFF_mutirao-correcoes-e2e.md`](sprints/sprint-11/HANDOFF_mutirao-correcoes-e2e.md) | 🟡 PARCIAL | **Esta é a fonte de verdade do andamento**, e ela mesma diz isso. L1 a L7 integradas; **L8/B7 bloqueada por decisão do Bernardo**; falta o Lovable aplicar as migrations e a reexecução manual P00–P26 |
| [`sprints/sprint-11/TAREFA_correcoes-e2e-geracao-contrato.md`](sprints/sprint-11/TAREFA_correcoes-e2e-geracao-contrato.md) | 🟡 PARCIAL | ⚠️ **Os marcadores `✅ CONCLUÍDO` bug a bug não foram mantidos** — quase nenhum B está marcado, embora as raias tenham sido integradas. **Não conclua nada da ausência de marca aqui; leia o HANDOFF** |
| [`sprints/sprint-11/TAREFA_os-parcelamento-valor-projeto.md`](sprints/sprint-11/TAREFA_os-parcelamento-valor-projeto.md) | 🟡 PARCIAL | Tela e migração `20260814170000` prontas. Falta aplicar em produção |

---

## Equipe, tarefas e sprints

| Documento | Status | Observação |
|---|---|---|
| [`planos/delegar-revisao-tarefas.md`](planos/delegar-revisao-tarefas.md) | ✅ FEITO | Entregue em 15/07. O "Aprovar devolve para Em Ajuste" **é o comportamento decidido**, não é bug — ver `geral/achados-taskmodal.md` §1 |
| [`planos/plano-comentarios-mencoes-feed.md`](planos/plano-comentarios-mencoes-feed.md) | 🟡 PARCIAL | Fases 1 e 2 implementadas. **Reações e follow/unfollow seguem só propostas** |
| [`geral/divida-tipos-org-comments.md`](geral/divida-tipos-org-comments.md) | 🟡 PARCIAL | **A causa acabou**: o `types.ts` regerado em 31/08 já conhece `org_comments_feed`, `criar_org_comment` e `org_comment_mentions`. Os `as unknown as` nos três hooks viraram peso morto e podem sair — é a única coisa que resta deste documento |
| [`equipe/TAREFA_proxima-sprint_unificacao-tarefas-e-conexao-telas.md`](equipe/TAREFA_proxima-sprint_unificacao-tarefas-e-conexao-telas.md) | 🟡 PARCIAL | T1 e T6 concluídos, banco concluído (`tasks` dropada). **T2/T3, T4 e T5 seguem abertos** |
| [`equipe/TAREFA_proxima-sprint_atrito-cadastro-clientes.md`](equipe/TAREFA_proxima-sprint_atrito-cadastro-clientes.md) | 🔵 ABERTO | A1 a A11 e B1 a B3, nenhum marcado. Não achei validação de CNPJ/UF/e-mail no cadastro — o grupo A parece intacto |
| [`geral/achados-taskmodal.md`](geral/achados-taskmodal.md) | 📘 REF | Quirks travados em teste, **de propósito**. O §1 já foi decidido como correto. Os demais são candidatos a tarefa, não tarefas |
| [`sprints/auditoria-modulo-sprint-2026-07-09.md`](sprints/auditoria-modulo-sprint-2026-07-09.md) | 📘 REF | Foto de 09/07. Números envelhecidos |
| [`sprints/sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md`](sprints/sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md) | 🔵 ABERTO | **Planejamento vivo da sprint 12.** É daqui que sai trabalho novo |
| [`sprints/sprint-12/CONTEXTO_TEMP_PLANEJAMENTO_SPRINT_12.md`](sprints/sprint-12/CONTEXTO_TEMP_PLANEJAMENTO_SPRINT_12.md) | 🔵 ABERTO | Handoff temporário do planejamento |
| [`sprints/sprint-12/NOTA_DECISAO_MATRIZ_ALCADAS_AC.md`](sprints/sprint-12/NOTA_DECISAO_MATRIZ_ALCADAS_AC.md) | ⛔ MORTO *(por ora)* | **Decisão pendente, e o documento proíbe virar especificação.** Não gerar tarefa a partir dele |

---

## MAPA (Digital)

| Documento | Status | Observação |
|---|---|---|
| [`mapa/mapa-refactor.md`](mapa/mapa-refactor.md) | ✅ FEITO | ⚠️ **diz "em execução" e está vencido**: `dbMappers` só sobrevive em fixture de teste, e `Processo` já espelha as colunas do banco |
| [`mapa/mapa-seletor-cluster-global.md`](mapa/mapa-seletor-cluster-global.md) | ✅ FEITO | `src/components/equipe/mapa/ClusterBar.tsx` |
| [`mapa/plan.md`](mapa/plan.md) | 🟡 PARCIAL | Edição cruzada: a de melhoria existe em `ProcessosPage`; **`ProjetosPage` não tem nem `procEmEdicao` nem `melEmEdicao`** |
| [`mapa/checklist-melhorias-preenchimento.md`](mapa/checklist-melhorias-preenchimento.md) | ✅ FEITO | Fechado pelo diagnóstico de 31/07. O auto-select inline foi **descartado pela Patrícia** — não reimplementar |
| [`mapa/2026-07-31-diagnostico-fechamento-tarefas.md`](mapa/2026-07-31-diagnostico-fechamento-tarefas.md) | 📘 REF | O relatório que fechou o checklist acima |
| [`mapa/relatorio-teste-uso-asis.md`](mapa/relatorio-teste-uso-asis.md) | 📘 REF | Relato de teste de uso |

---

## Refatoração, lint e custo de IA

| Documento | Status | Observação |
|---|---|---|
| [`geral/refatoracao-camada-dados-ledger.md`](geral/refatoracao-camada-dados-ledger.md) | ✅ FEITO | **Aceite verificado agora**: `supabase.from/rpc` em `src/pages`/`src/components` = zero |
| [`geral/refatoracao-ui-god-components-ledger.md`](geral/refatoracao-ui-god-components-ledger.md) | ✅ FEITO | As 20 fachadas originais estão abaixo do teto |
| [`geral/reducao-custo-ia-tarefas.md`](geral/reducao-custo-ia-tarefas.md) | 🟡 PARCIAL | T1, T3 e T4 feitos. **Abertos: T2** (migrations de import legado — mas ver a decisão de ignorá-las nas buscas, que já resolveu o sintoma), **T5/T6** (o aceite "nenhum `.tsx` de UI acima de 600 linhas" ainda não é verdade — medir com `find src -name '*.tsx' -not -name '*.test.tsx' -exec wc -l {} + \| awk '$1>600'`) e **T7** (`docs/geral/mapa-navegacao.md` não existe) |
| [`geral/lint-warnings-roadmap.md`](geral/lint-warnings-roadmap.md) | 🟡 PARCIAL | Fases 0 e 1 concluídas; **fases 2 a 10 abertas**. ⚠️ **A contagem do documento está vencida** — ele parou em 763 e o `bunx eslint .` de hoje dá outro número. Medir antes de citar |
| [`geral/auditoria-gaps-cud.md`](geral/auditoria-gaps-cud.md) | 🔵 ABERTO | Inventário que **nunca foi preenchido**. Fechar os gaps continua sendo tarefa futura, e muda comportamento |
| [`rls/Divida_Tecnica_RLS_Eduardo.md`](rls/Divida_Tecnica_RLS_Eduardo.md) | 🟡 PARCIAL | **O P1 inteiro está fechado em produção** — não só processos e gargalos. Conferido policy por policy em 01/09: as 8 tabelas de melhorias, sistemas e `projeto_justificativas` já checam papel e cluster (`melhoria_cluster_visivel`, `sistema_cluster_visivel`, `resolve_user_cluster_ids`), com DELETE em `lider+`. No schema todo sobraram **2** policies `USING(true)` (SELECT em `agente_config` e `agente_aprendizados`), contra as 49 da auditoria de julho. O repositório não mostra isso: o que existe na `develop` é o esqueleto marcado "rascunho", com as 3 decisões A/B/C em aberto dentro do arquivo — foi por ele que esta linha nasceu 🟡. **Abertos de verdade:** as 3 decisões formais do P2 (a de `cliente_clusters` é real — **3 policies `ALL` convivendo com o CRUD separado**, que é exatamente o risco que o doc levantou) e o DROP de `sprint_deliverables_backup_20260809` (80 kB, sem policy nenhuma) |
| [`geral/divida-tipos-org-comments.md`](geral/divida-tipos-org-comments.md) | 🔵 ABERTO | ver linha em "Equipe" |

---

## Cor, tema e identidade visual

Esta frente andou muito em 08/2026 e os documentos de 18–20/08 **descrevem um mecanismo que
mudou**. O estado corrente é `geral/paleta-por-area.md`; os outros são história.

| Documento | Status | Observação |
|---|---|---|
| [`geral/paleta-por-area.md`](geral/paleta-por-area.md) | 📘 REF | **O contrato em vigor.** Papel de status, tom de tag, quem resolve o quê |
| [`geral/fase-3a-cor-crua-na-mao.md`](geral/fase-3a-cor-crua-na-mao.md) | ✅ FEITO | A fase 3a (Mapa e Board), executada em 31/08 e escrita em 01/09. **Registra o que ficou de fora de propósito**: a 3b (gráfico → PNG) depende da decisão 4, sem resposta |
| [`geral/cor-o-que-falta.md`](geral/cor-o-que-falta.md) | 🔵 ABERTO | **O ponto de retomada da frente de cor.** Atualizado em 03/09, com o motivo de cada parada. **Fecharam** o §4 inteiro (rótulos de chamado, e a palavra única masculina dos três pares), o estado de documento — que virou o sexto mapa do contrato — e o `osg-red` do §7, com catraca própria. A lista "se você for retomar por um só item" já começa no próximo, e diz por que `red`/`emerald` NÃO são conversão por mapa. Contém o achado de `projects.status`, que **não é dívida de cor e sim defeito que o cliente vê**: três mapas, nenhum casa com o dado, e todo projeto aparece como "Em Planejamento" a 0% |
| [`geral/design-system-board-v5.md`](geral/design-system-board-v5.md) | ✅ FEITO | Refatoração visual do Board, 21/08 |
| [`geral/decisoes-tema-e-cor.md`](geral/decisoes-tema-e-cor.md) | ⛔ MORTO | Registro de 20/08. **Três decisões foram revertidas** e os endereços `index.css:NNN` não valem mais |
| ~~`geral/inventario-paletas-por-tela.md`~~ | 🗑️ **APAGADO** (01/09/2026) | Foto de 18/08 de um mecanismo que já havia mudado; as recomendações de criar `.board-theme` e `.dev-theme` estavam superadas |
| ~~`geral/estado-do-sistema-2026-08-20.md`~~ | 🗑️ **APAGADO** (01/09/2026) | Auto-arquivado pelo autor em 21/08 |
| [`geral/levantamentos-2026-08-21.md`](geral/levantamentos-2026-08-21.md) | 📘 REF | Três medições, sem decisão. Medidas no dev, e três perguntas eram sobre produção |
| [`geral/comparacoes-de-cor/LEIA.md`](geral/comparacoes-de-cor/LEIA.md) | 🟡 PARCIAL | **Três decisões tomadas, três em aberto** (porta de entrada, superfície de estado, e o resto dos tokens escritos à mão). As páginas HTML são autocontidas — abrir no navegador |
| [`geral/inventario-telas-por-cluster.md`](geral/inventario-telas-por-cluster.md) | 📘 REF | Metade da resposta; a outra metade é conversa com quem usa |

---

## Dashboards, dados e infraestrutura

| Documento | Status | Observação |
|---|---|---|
| [`HANDOFF-dashboard-uso-envio.md`](HANDOFF-dashboard-uso-envio.md) | 🟡 PARCIAL | Técnico e gerencial construídos **e rodando com fixtures**. Falta a troca fixture → endpoint da §6 |
| [`SPEC-endpoints-analytics-uso.md`](SPEC-endpoints-analytics-uso.md) | 🔵 ABERTO | **Executa fora deste repo** (engenharia de dados). É o par do handoff acima |
| [`planos/agente-psa-assistente.md`](planos/agente-psa-assistente.md) | ✅ FEITO | ⚠️ **o cabeçalho diz "pendente de migration" e está vencido**: o PR #65, que era o que faltava, foi mergeado em 25/08. Confirmar o schema de produção pelo MCP antes de afirmar o contrário |
| [`geral/sidebar-recolhe-em-tela-larga.md`](geral/sidebar-recolhe-em-tela-larga.md) | 📘 REF | Padrão implementado; o documento ensina como uma tela nova adere |
| [`ambiente-de-desenvolvimento.md`](ambiente-de-desenvolvimento.md) | 📘 REF | **Leitura obrigatória** antes de qualquer coisa sobre banco |
| [`rls/mapa-do-banco.md`](rls/mapa-do-banco.md) | 📘 REF | **Gerado.** É por aqui que se consulta o schema, nunca pelo `types.ts` inteiro |
| [`AI_CONTEXT.md`](AI_CONTEXT.md) | 📘 REF | Regras do projeto. Sobreposto em parte pelo `AGENTS.md`, que é a fonte única |
| [`geral/validar-no-app-rodando.md`](geral/validar-no-app-rodando.md) | 📘 REF | Como pôr um navegador logado na frente do app |
| [`geral/decisoes/`](geral/decisoes/) | 📘 REF | Duas decisões aceitas e em vigor |
| [`skills/GIF-gerador/`](skills/GIF-gerador/) | 📘 REF | Skill pronta. Ler `references/safety.md` antes de rodar |

---

## Documentos cujo status interno mente

Estes seis são a razão de este índice existir. O que está escrito neles contradiz o código
da `develop` — e o custo de descobrir isso é abrir o arquivo inteiro.

| Documento | O que ele diz | O que é verdade |
|---|---|---|
| `mapa/mapa-refactor.md` | "Status: em execução" | Concluído — `dbMappers` só existe em fixture de teste |
| `osg/memorial-georref-por-imovel.md` | "lacuna registrada, não corrigida" | Corrigido pela migration `20260831093000` |
| `planos/agente-psa-assistente.md` | "pendente de migration nos dois bancos" | O PR #65, que era o bloqueio declarado, foi mergeado em 25/08 |
| `sprints/sprint-11/TAREFA_correcoes-e2e-geracao-contrato.md` | quase nenhum B marcado como concluído | As raias L1–L7 foram integradas; só B7 segue bloqueada. **O HANDOFF é a fonte** |
| `sprints/sprint-10/README.md` | as duas tarefas "A fazer" | Resolvido: as tarefas e o plano foram apagados, e o README virou a tumba que explica o porquê |
| `geral/lint-warnings-roadmap.md` | 763 warnings | Outro número hoje. O documento pede para manter a contagem sincronizada e ela não foi |

## O que foi apagado em 01/09/2026, e por quê

A triagem virou faxina no mesmo dia. Sete arquivos saíram; estão todos no histórico do git.

| Apagado | Por quê |
|---|---|
| `scratch-tables.json` (raiz, rastreado) | Dump do schema de 13/07 que ninguém referenciava. O jeito de consultar schema é `rls/mapa-do-banco.md`, que é gerado |
| `geral/estado-do-sistema-2026-08-20.md` | Auto-arquivado pelo autor em 21/08 |
| `geral/inventario-paletas-por-tela.md` | Foto de 18/08 de um mecanismo que já havia mudado |
| `geral/refatoracao-camada-dados-INSTRUCOES-opencode.md` | Orquestração de uma fase concluída, para outra ferramenta |
| `plano-revisao-delegada-tarefas.md` (era local, no `.gitignore`) | Duplicata de `planos/delegar-revisao-tarefas.md`, executado em 15/07 |
| `planos/area-cliente-documentos-por-tematica.md` + as duas tarefas da sprint 10 | Frente superada pelas 4 gavetas |

**Ficaram de propósito**, embora marcados morto ou vencido:

- `osg/filiacao-derivada-do-parentesco.md` — registra que a implementação **destrói dado em
  produção**. Apagar isso é convidar alguém a refazer.
- `geral/decisoes-tema-e-cor.md` — é o único lugar que guarda o raciocínio de cada decisão de
  cor, inclusive o das três que foram revertidas.
- `sprints/sprint-12/NOTA_DECISAO_MATRIZ_ALCADAS_AC.md` — decisão pendente, não morta.
- `mapa/checklist-melhorias-preenchimento.md` — registra o que a Patrícia descartou.
- Os cinco handoffs de implementação da OSG já executados. O índice desvia deles; custam zero.

**Três ponteiros para arquivos que nunca existiram** foram corrigidos na mesma passada:
`docs/geral/clientes-de-teste-dev.md` e `docs/planos/plano-refatoracao-god-components-fase-3.md`
(citados no `AGENTS.md`, que é a fonte única de verdade) e `whatsapp-meta-onboarding.md`
(citado no `whatsapp-templates.md`).

---

## Manutenção deste índice

Ele envelhece igual aos outros — a diferença é que envelhecer aqui custa uma linha, e não
um plano inteiro. Ao fechar uma frente, mude a marca da linha **no mesmo commit** em que o
código entra. Ao abrir um plano novo em `docs/planos/`, acrescente a linha dele antes de
começar a executar.
