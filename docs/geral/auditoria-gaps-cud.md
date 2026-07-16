# Gaps de auditoria — mutations CUD sem `useAuditLog`

**Origem:** achado durante a refatoração da camada de dados (ver `refatoracao-camada-dados-ledger.md`, Fase 0).
**Fato:** a auditoria só é gravada quando o frontend chama `src/hooks/useAuditLog.ts`. **Não há trigger no banco.**
As mutations abaixo (encontradas nos 42 arquivos com `supabase.from/rpc` direto) **não gravam em `audit_logs` hoje**.

**Escopo deste arquivo:** apenas *inventariar* o gap. A refatoração da camada de dados **preserva o
comportamento atual** (não adiciona auditoria). Fechar estes gaps é uma **tarefa futura, revisada à parte**,
pois muda comportamento (novas linhas em `audit_logs`) e exige `changed_fields` campo-a-campo por operação.

> Os agentes que executarem a Fase 1/2 devem **acrescentar** aqui cada mutation que moverem, marcando a
> tabela e o tipo de operação. Não remover linhas.

## Inventário (preencher durante a execução)

| Arquivo (origem) | Hook destino | Tabela | Operação | Observação |
|---|---|---|---|---|
| `components/ContactSection.tsx` | — | `contatos` | insert | form público (talvez não deva auditar — decidir na tarefa) |
| `components/equipe/dev/correcoes-sped/CorrecoesActionButtons.tsx` | `useCorrecoesSped` | `efd_correcoes` | delete | limpar tudo |
| `components/equipe/dev/correcoes-sped/TabD100.tsx` | `useCorrecoesSped` | `efd_correcoes` | update, insert | |
| `components/equipe/dev/correcoes-sped/TabF100.tsx` | `useCorrecoesSped` | `efd_correcoes` | update, insert | |
| `components/equipe/dev/correcoes-sped/TabF120.tsx` | `useCorrecoesSped` | `efd_correcoes` | update, insert | |
| `components/equipe/dev/correcoes-sped/TabF130.tsx` | `useCorrecoesSped` | `efd_correcoes` | update, insert | |
| `components/equipe/dev/perdcomp/CargaPerdcompCSV.tsx` | (hook perdcomp) | `per`, `per_situacao`, `dcomp` | upsert, insert | carga em massa |
| `components/equipe/dev/perdcomp/PerFormModal.tsx` | (hook perdcomp) | `per`, `per_situacao` | insert | |
| `components/equipe/dev/perdcomp/SituacaoFormModal.tsx` | (hook perdcomp) | `per_situacao` | insert | |
| `components/equipe/dev/perdcomp/PerDetailModal.tsx` | (hook perdcomp) | `per_situacao`, `per` | insert, update | god-component |
| `components/equipe/dev/perdcomp/DcompFormModal.tsx` | (hook perdcomp) | `distribuicao_dcomp`, `dcomp` | delete, insert | god-component |
| `pages/equipe/EquipeControleAcessos.tsx` | — | `catalog_clients` | insert, update, delete | |
| `pages/equipe/EquipeNovaTarefa.tsx` | — | `tasks` | insert | |
| `pages/equipe/EquipeRotinas.tsx` | — | `routines` | insert | |
| `pages/equipe/EquipeSprints.tsx` | — | `sprints` | insert | |
| `pages/equipe/EquipeDemandas.tsx` | — | `routines`, `demand_items` | insert, delete | god-component |
| `pages/equipe/EquipeProjetos.tsx` | — | `projects`, `processes` | insert | god-component |
| `pages/equipe/EquipeProcessos.tsx` | — | `processes` | insert | god-component |
| `pages/equipe/dev/ProcessoDifal.tsx` | — | `difal_decisao` | delete | god-component |
| `pages/gestao/GestaoNovidades.tsx` | — | `novidades` | insert, update, delete | |
| `pages/gerencial/desempenho/DesempenhoDecisoes.tsx` | — | `metas` | update | |
| `components/equipe/dev/correcoes-sped/CorrecoesActionButtons.tsx` | `useLimparCorrecoesSped` | `efd_correcoes` | delete | limpeza global; filtro `created_at >= 1970-01-01` preservado |
| `components/equipe/dev/correcoes-sped/TabD100.tsx` | `useAtualizarCorrecaoSpedPorId` | `efd_correcoes` | update | reversão por ID; snapshot e campos alterados preservados |
| `components/equipe/dev/correcoes-sped/TabD100.tsx` | `useDesativarCorrecaoSped` | `efd_correcoes` | update | filtros por tipo, registro original e `ativo = true` preservados |
| `components/equipe/dev/correcoes-sped/TabD100.tsx` | `useInserirCorrecaoSped` | `efd_correcoes` | insert | payload integral preservado |
| `components/equipe/dev/correcoes-sped/TabF100.tsx` | `useAtualizarCorrecaoSpedPorId` | `efd_correcoes` | update | reversão por ID; snapshot e campos alterados preservados |
| `components/equipe/dev/correcoes-sped/TabF100.tsx` | `useDesativarCorrecaoSped` | `efd_correcoes` | update | filtros por tipo, registro original e `ativo = true` preservados |
| `components/equipe/dev/correcoes-sped/TabF100.tsx` | `useInserirCorrecaoSped` | `efd_correcoes` | insert | payload integral preservado |
| `components/equipe/dev/correcoes-sped/TabF120.tsx` | `useAtualizarCorrecaoSpedPorId` | `efd_correcoes` | update | reversão por ID |
| `components/equipe/dev/correcoes-sped/TabF120.tsx` | `useAtualizarCorrecaoSpedPorId` | `efd_correcoes` | update | substituição in-place preservando UUID |
| `components/equipe/dev/correcoes-sped/TabF120.tsx` | `useInserirCorrecaoSped` | `efd_correcoes` | insert | payload integral preservado |
| `components/equipe/dev/correcoes-sped/TabF130.tsx` | `useAtualizarCorrecaoSpedPorId` | `efd_correcoes` | update | reversão por ID |
| `components/equipe/dev/correcoes-sped/TabF130.tsx` | `useAtualizarCorrecaoSpedPorId` | `efd_correcoes` | update | substituição in-place preservando UUID |
| `components/equipe/dev/correcoes-sped/TabF130.tsx` | `useInserirCorrecaoSped` | `efd_correcoes` | insert | payload integral preservado |
| `components/equipe/dev/perdcomp/CargaPerdcompCSV.tsx` | `useUpsertPersEmLote` | `per` | upsert | carga em lote; conflito por `nr_per` preservado |
| `components/equipe/dev/perdcomp/CargaPerdcompCSV.tsx` | `useInserirSituacoesPerEmLote` | `per_situacao` | insert | carga em lote; erro parcial continua tratado pelo consumidor |
| `components/equipe/dev/perdcomp/CargaPerdcompCSV.tsx` | `useInserirDcomps` | `dcomp` | insert | carga em lote |
| `components/equipe/dev/perdcomp/PerFormModal.tsx` | `useInserirPer` | `per` | insert | payload permanece em array |
| `components/equipe/dev/perdcomp/PerFormModal.tsx` | `useInserirSituacaoPerComRetorno` | `per_situacao` | insert | situação inicial com retorno `.select().single()` |
| `components/equipe/dev/perdcomp/PerFormModal.tsx` | `useInserirSituacaoPer` | `per_situacao` | insert | marca o PER original como retificado; erro best-effort preservado |
| `components/equipe/dev/perdcomp/PerFormModal.tsx` | `useAtualizarPerPorNumero` | `per` | update | filtro por `nr_per` preservado |
| `components/equipe/dev/perdcomp/SituacaoFormModal.tsx` | `useInserirSituacaoPerComRetorno` | `per_situacao` | insert | retorna `.select().single()` |
| `components/equipe/dev/perdcomp/SituacaoFormModal.tsx` | `useAtualizarSituacaoPerPorId` | `per_situacao` | update | precheck no consumidor e retorno `.select().single()` preservados |
| `components/ContactSection.tsx` | `useInserirContato` | `contatos` | insert | formulário público sem auditoria, conforme decisão explícita |
| `pages/equipe/EquipeNovaTarefa.tsx` | `useCriarNovaTarefa` | `tasks` | insert | payload e IDs preservados |
| `pages/equipe/EquipeRotinas.tsx` | `useCreateRoutine` | `routines` | insert | payload integral preservado |
| `pages/equipe/EquipeSprints.tsx` | `useDomainSprintMutations.createSprint` | `sprints` | insert | payload integral preservado |
| `pages/equipe/EquipeSprints.tsx` | `useDomainSprintMutations.updateSprint` | `sprints` | update | precheck e filtro por ID preservados |
| `pages/equipe/EquipeSprints.tsx` | `useDomainSprintMutations.deleteSprint` | `sprints` | delete | precheck e filtro por ID preservados |
| `pages/equipe/EquipeSprints.tsx` | `useDomainSprintMutations.updateSprintStatus` | `sprints` | update | alteração de status; tratamento best-effort preservado |
| `pages/equipe/EquipeControleAcessos.tsx` | `useControleAcessosCatalogMutations.createCatalogClient` | `catalog_clients` | insert | payload integral preservado |
| `pages/equipe/EquipeControleAcessos.tsx` | `useControleAcessosCatalogMutations.updateCatalogClient` | `catalog_clients` | update | precheck e filtro por ID preservados |
| `pages/equipe/EquipeControleAcessos.tsx` | `useControleAcessosCatalogMutations.toggleCatalogClient` | `catalog_clients` | update | alternância de `is_active`; precheck e filtro por ID preservados |
| `pages/equipe/EquipeControleAcessos.tsx` | `useControleAcessosCatalogMutations.deleteCatalogClient` | `catalog_clients` | delete | precheck, filtro por ID e erro `23503` preservados |
| `pages/gestao/GestaoNovidades.tsx` | `useDomainNovidades.createMutation` | `novidades` | insert | payload e normalizações preservados |
| `pages/gestao/GestaoNovidades.tsx` | `useDomainNovidades.updateMutation` | `novidades` | update | precheck e filtro por ID preservados |
| `pages/gestao/GestaoNovidades.tsx` | `useDomainNovidades.deleteMutation` | `novidades` | delete | precheck e filtro por ID preservados |
| `pages/gestao/GestaoNovidades.tsx` | `useDomainNovidades.toggleAtivoMutation` | `novidades` | update | atualização de `ativo` por ID preservada |
| `pages/gerencial/desempenho/DesempenhoDecisoes.tsx` | `useRegistrarDecisaoMetas` | `metas` | update | updates sequenciais de `recomendacao_decisao` por meta preservados |
| `pages/equipe/EquipeBacklog.tsx` | `useCreateDomainBacklogItem` | `sprint_backlog_items` | insert | retorno `.select().single()` preservado |
| `pages/equipe/EquipeBacklog.tsx` | `useUpdateDomainBacklogItem` | `sprint_backlog_items` | update | precheck, payload e filtro por ID preservados |
| `pages/equipe/EquipeBacklog.tsx` | `useDeleteDomainBacklogItem` | `sprint_backlog_items` | delete | precheck e filtro por ID preservados |
| `pages/equipe/EquipeBacklog.tsx` | `useCreateDomainBacklogDeliverable` | `sprint_deliverables` | insert | primeira etapa da movimentação; retorno preservado |
| `pages/equipe/EquipeBacklog.tsx` | `useMoveDomainBacklogItem` | `sprint_backlog_items` | update | segunda etapa sequencial da movimentação preservada |
| `pages/equipe/EquipeTarefas.tsx` | `useDomainEquipeTarefas.updateTask` | `tasks` | update | precheck, payload e filtro por ID preservados |
| `pages/equipe/EquipeTarefas.tsx` | `useDomainEquipeTarefas.deleteTask` | `tasks` | delete | precheck e filtro por ID preservados |
