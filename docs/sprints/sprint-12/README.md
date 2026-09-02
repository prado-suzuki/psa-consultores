# Sprint 12 — tarefas

Índice das tarefas delegáveis desta sprint. Uma linha por tarefa; o detalhe (contexto, subtarefas Tn, aceite, referências de código) vive no arquivo `TAREFA_*.md` correspondente.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| **[Cadastro · 1 Registrar por cargo](TAREFA_registrar-por-cargo.md)** 🔴 | `INSERT` no cadastro de cliente exige só papel `sublider` ou acima. **É a que fecha o erro relatado**: o 42501 em `contribuinte` que barrou a Layara em 01/09. Independente das outras três. | Sim — **1 ⚠️ MIGRAÇÃO**: 3 policies de INSERT (contribuinte, representante, ordem_servico). **Não aplicada.** ⚠️ **Exige mudança de front na mesma entrega** (T2): os inserts de contribuinte e OS pedem a linha de volta, e o `RETURNING` faz a policy de leitura barrar a linha nova com o **mesmo 42501** — medido no sandbox em 02/09 | ✅ **CONCLUÍDO (02/09)** — migração `20260902192547` e commit `3d4c03d5`, conferidos no banco e no código · falta a Layara validar cadastrando o Frigobom (T3) |
| [Cadastro · 7 Mensagens de recusa](TAREFA_mensagens-de-recusa.md) | Uma tradução só para as recusas (hoje o funil decide por um teste de palavras **em inglês**, e rebaixa toda mensagem em português). Fecha as operações que recusam em silêncio e terminam em "sucesso". | Não — só código | **T1–T5 ✅ CONCLUÍDAS (02/09)** · D1–D5 fechadas · com testes · **falta só a T6, a conferência da Patricia** |
| [Cobrar solicitação sem nenhum documento (GES-04)](TAREFA_cobrar-solicitacao-sem-documento.md) | Aviso próprio, por job, para o cliente que não enviou **nenhum** documento desde o envio da solicitação; repete a cada 30 dias. Confirma e estreita o aviso 8 do catálogo da sprint 11. | Sim — a elegibilidade não pede coluna nova, mas há **quatro ⚠️ MIGRAÇÕES**: enum `notificacao_tipo` ganha `solicitacao_vencida` (`20260824143238`), `notificacao_envio.created_at` (`20260824205811`), função `solicitacoes_a_cobrar` (`20260824213938`) e o cron (`20260825132757`). **Aplicadas no sandbox, nenhuma em produção** | T1–T5 feitas · falta produção |

> **As tarefas de permissao do cadastro de cliente foram para a [sprint 13](../sprint-13/README.md)**
> em 02/09/2026. Ficaram aqui as duas que a sprint 12 entregou: `Registrar por cargo` e
> `Mensagens de recusa`.

## Como usar esta pasta

- **Uma tarefa = um arquivo** `TAREFA_<slug>.md` nesta pasta.
- Planos de design/arquitetura mais longos continuam em `docs/planos/` — a tarefa linka para eles em vez de duplicar.
- Cada tarefa traz subtarefas numeradas (`T1`, `T2`, …) e bugs achados no caminho (`B1`, `B2`, …), com marcação explícita de **⚠️ MIGRAÇÃO** ou **⚠️ MUDANÇA DE RPC** quando depende do Lovable.
- Ao concluir uma subtarefa, marcar `✅ CONCLUÍDO (data)` dentro do arquivo da tarefa e atualizar a coluna Status desta tabela.
