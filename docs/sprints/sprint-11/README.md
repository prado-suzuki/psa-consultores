# Sprint 11 — tarefas

Índice das tarefas delegáveis desta sprint. Uma linha por tarefa; o detalhe (contexto, subtarefas Tn, aceite, referências de código) vive no arquivo `TAREFA_*.md` correspondente.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [Notificações da coleta de documentos (OSG · P1)](TAREFA_notificacoes-coleta-documentos.md) | 15 avisos (cliente, time e gestor), em 4 entregas: sino, botão de solicitar, aprovar/recusar, varredura. O "como" é do tech lead. | Sim — 5 dos 15 avisos dependem de campo novo (marcados na tarefa) | A fazer |

## Como usar esta pasta

- **Uma tarefa = um arquivo** `TAREFA_<slug>.md` nesta pasta.
- Planos de design/arquitetura mais longos continuam em `docs/planos/` — a tarefa linka para eles em vez de duplicar. Esta sprint referencia `docs/planos/notificacoes-osg-coleta-documentos.md`.
- Cada tarefa traz subtarefas numeradas (`T1`, `T2`, …) e bugs achados no caminho (`B1`, `B2`, …), com marcação explícita de **⚠️ MIGRAÇÃO** ou **⚠️ MUDANÇA DE RPC** quando depende do Lovable.
- Ao concluir uma subtarefa, marcar `✅ CONCLUÍDO (data)` dentro do arquivo da tarefa e atualizar a coluna Status desta tabela.
