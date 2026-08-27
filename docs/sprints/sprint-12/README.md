# Sprint 12 — tarefas

Índice das tarefas delegáveis desta sprint. Uma linha por tarefa; o detalhe (contexto, subtarefas Tn, aceite, referências de código) vive no arquivo `TAREFA_*.md` correspondente.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [Cobrar solicitação sem nenhum documento (GES-04)](TAREFA_cobrar-solicitacao-sem-documento.md) | Aviso próprio, por job, para o cliente que não enviou **nenhum** documento desde o envio da solicitação; repete a cada 30 dias. Confirma e estreita o aviso 8 do catálogo da sprint 11. | Sim — a elegibilidade não pede coluna nova, mas há **quatro ⚠️ MIGRAÇÕES**: enum `notificacao_tipo` ganha `solicitacao_vencida` (`20260824143238`), `notificacao_envio.created_at` (`20260824205811`), função `solicitacoes_a_cobrar` (`20260824213938`) e o cron (`20260825132757`). **Aplicadas no sandbox, nenhuma em produção** | T1–T5 feitas · falta produção |

## Como usar esta pasta

- **Uma tarefa = um arquivo** `TAREFA_<slug>.md` nesta pasta.
- Planos de design/arquitetura mais longos continuam em `docs/planos/` — a tarefa linka para eles em vez de duplicar.
- Cada tarefa traz subtarefas numeradas (`T1`, `T2`, …) e bugs achados no caminho (`B1`, `B2`, …), com marcação explícita de **⚠️ MIGRAÇÃO** ou **⚠️ MUDANÇA DE RPC** quando depende do Lovable.
- Ao concluir uma subtarefa, marcar `✅ CONCLUÍDO (data)` dentro do arquivo da tarefa e atualizar a coluna Status desta tabela.
