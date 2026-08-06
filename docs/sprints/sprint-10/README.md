# Sprint 10 — tarefas

Índice das tarefas delegáveis desta sprint. Uma linha por tarefa; o detalhe (contexto, subtarefas Tn, aceite, referências de código) vive no arquivo `TAREFA_*.md` correspondente.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [Área do Cliente: solicitação de documentos por temática](TAREFA_area-cliente_documentos-por-tematica.md) — *explicativo* | Contexto, decisões (DEC-01 a DEC-08), SQL e armadilhas. **Ler antes de executar.** | Sim — T7 muda RPC · T8 coluna `prazo` · T9 enum + 2 RPCs + tela da equipe | A fazer |
| [↳ Lista de tarefas para importar](TAREFAS_area-cliente_documentos-por-tematica.md) — *executável* | 5 tarefas-mãe, 20 subtarefas, ~66h, já nas colunas do `Importar Sprint do Excel`. **Tarefa 0 é a prioridade** (0.1 e 0.2 não dependem de nada). | idem | A fazer |

## Como usar esta pasta

- **Uma tarefa = um arquivo** `TAREFA_<slug>.md` nesta pasta.
- Planos de design/arquitetura mais longos continuam em `docs/planos/` — a tarefa linka para eles em vez de duplicar. Ex.: esta sprint referencia `docs/planos/area-cliente-documentos-por-tematica.md`.
- Cada tarefa traz subtarefas numeradas (`T1`, `T2`, …) e bugs achados no caminho (`B1`, `B2`, …), com marcação explícita de **⚠️ MIGRAÇÃO** ou **⚠️ MUDANÇA DE RPC** quando depende do Lovable.
- Ao concluir uma subtarefa, marcar `✅ CONCLUÍDO (data)` dentro do arquivo da tarefa e atualizar a coluna Status desta tabela.
