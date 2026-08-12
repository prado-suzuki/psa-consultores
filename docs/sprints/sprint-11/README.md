# Sprint 11 — tarefas

Índice das tarefas delegáveis desta sprint. Uma linha por tarefa; o detalhe (contexto, subtarefas Tn, aceite, referências de código) vive no arquivo `TAREFA_*.md` correspondente.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [Notificações da coleta de documentos (OSG · P1)](TAREFA_notificacoes-coleta-documentos.md) | 15 avisos (cliente, time e gestor), em 4 entregas: sino, botão de solicitar, aprovar/recusar, varredura. O "como" é do tech lead. | Sim — 5 dos 15 avisos dependem de campo novo (marcados na tarefa) | A fazer |
| [Correções do fluxo de geração de contrato (OSG)](TAREFA_correcoes-e2e-geracao-contrato.md) | 21 bugs achados no teste e2e do caso MMS: 7 vermelhos e 14 amarelos. B7 continua bloqueada por decisão de produto; as demais raias foram integradas com testes generalizados. | Sim — migrations de identidade da matrícula, conteúdo dos blocos, vínculos de pessoa e preservação de nomes aguardam aplicação pelo Lovable | Em validação — falta aplicar migrations e reexecutar o e2e |

## Como usar esta pasta

- **Uma tarefa = um arquivo** `TAREFA_<slug>.md` nesta pasta.
- Planos de design/arquitetura mais longos continuam em `docs/planos/` — a tarefa linka para eles em vez de duplicar. Esta sprint referencia `docs/planos/notificacoes-osg-coleta-documentos.md`.
- Cada tarefa traz subtarefas numeradas (`T1`, `T2`, …) e bugs achados no caminho (`B1`, `B2`, …), com marcação explícita de **⚠️ MIGRAÇÃO** ou **⚠️ MUDANÇA DE RPC** quando depende do Lovable.
- Ao concluir uma subtarefa, marcar `✅ CONCLUÍDO (data)` dentro do arquivo da tarefa e atualizar a coluna Status desta tabela.
