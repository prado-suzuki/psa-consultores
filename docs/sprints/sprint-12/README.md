# Sprint 12 — tarefas

Índice das tarefas delegáveis desta sprint. Uma linha por tarefa; o detalhe (contexto, subtarefas Tn, aceite, referências de código) vive no arquivo `TAREFA_*.md` correspondente.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| **[1 de 4 — Registrar por cargo](TAREFA_registrar-por-cargo.md)** 🔴 | `INSERT` no cadastro de cliente exige só papel `sublider` ou acima. **É a que fecha o erro relatado**: o 42501 em `contribuinte` que barrou a Layara em 01/09. Independente das outras três. | Sim — **1 ⚠️ MIGRAÇÃO**: 3 policies de INSERT (contribuinte, representante, ordem_servico). **Não aplicada** | 🔴 **Prioridade — aplicar primeiro** (definido pela Patricia em 02/09) |
| [2 de 4 — Alterar por cargo](TAREFA_alterar-por-cargo.md) | `UPDATE` no cadastro exige só papel `sublider` ou acima. **Destrava também a exclusão lógica** de contribuinte e representante, porque exclusão lógica é UPDATE. | Sim — **1 ⚠️ MIGRAÇÃO**: 4 policies de UPDATE (cliente, contribuinte, representante, ordem_servico). **Não aplicada** | Plano escrito · aguarda aplicação |
| [3 de 4 — Excluir por cargo](TAREFA_excluir-por-cargo.md) | Exclusão **física** (4 policies de DELETE) e **lógica** (4 funções SECURITY DEFINER: 2 reemitidas, 2 novas) por cargo. Conserta o desfazer que deixou 9 clientes órfãos, e o excluir de contribuinte/representante que hoje recusa todo não-admin. **Depende da tarefa 2.** | Sim — **3 ⚠️ MIGRAÇÕES** + mudança de front. **Nenhuma aplicada** | Plano escrito · aguarda aplicação |
| [4 de 4 — Mensagens de recusa](TAREFA_mensagens-de-recusa.md) | Uma tradução só para as recusas (hoje o funil decide por um teste de palavras **em inglês**, e rebaixa toda mensagem em português). Fecha as operações que recusam em silêncio e terminam em "sucesso". | Não — só código | Plano escrito · **texto das mensagens fechado** (02/09) · 3 decisões abertas (D1–D3) |
| [Rateio e produtos saem junto com a OS](TAREFA_exclusao-em-cascata-da-os.md) | A cascata da OS passa a ser do banco, por trigger, em vez de código de tela. Hoje há **26 rateios ativos (1800%) e 40 produtos** presos em OS excluída. Independente das quatro acima. | Sim — **2 ⚠️ MIGRAÇÕES**: trigger e limpeza do que já vazou. **Nenhuma aplicada** | Plano escrito · aguarda aplicação |
| [Cobrar solicitação sem nenhum documento (GES-04)](TAREFA_cobrar-solicitacao-sem-documento.md) | Aviso próprio, por job, para o cliente que não enviou **nenhum** documento desde o envio da solicitação; repete a cada 30 dias. Confirma e estreita o aviso 8 do catálogo da sprint 11. | Sim — a elegibilidade não pede coluna nova, mas há **quatro ⚠️ MIGRAÇÕES**: enum `notificacao_tipo` ganha `solicitacao_vencida` (`20260824143238`), `notificacao_envio.created_at` (`20260824205811`), função `solicitacoes_a_cobrar` (`20260824213938`) e o cron (`20260825132757`). **Aplicadas no sandbox, nenhuma em produção** | T1–T5 feitas · falta produção |

## Como usar esta pasta

- **Uma tarefa = um arquivo** `TAREFA_<slug>.md` nesta pasta.
- Planos de design/arquitetura mais longos continuam em `docs/planos/` — a tarefa linka para eles em vez de duplicar.
- Cada tarefa traz subtarefas numeradas (`T1`, `T2`, …) e bugs achados no caminho (`B1`, `B2`, …), com marcação explícita de **⚠️ MIGRAÇÃO** ou **⚠️ MUDANÇA DE RPC** quando depende do Lovable.
- Ao concluir uma subtarefa, marcar `✅ CONCLUÍDO (data)` dentro do arquivo da tarefa e atualizar a coluna Status desta tabela.
