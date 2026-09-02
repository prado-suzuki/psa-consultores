# Sprint 13 — tarefas

Índice das tarefas delegáveis desta sprint. Uma linha por tarefa; o detalhe (contexto,
subtarefas Tn, aceite, referências de código) vive no arquivo `TAREFA_*.md` correspondente.

## Permissões do cadastro de cliente

Todas nascem da [auditoria das 32 operações do módulo](../sprint-12/TAREFA_registrar-por-cargo.md),
feita em 02/09/2026 depois de a Layara (papel `lider`) não conseguir cadastrar um cliente.

**A regra decidida pela Patricia em 02/09:**

> **Gravar** — registrar, alterar e excluir — exige apenas papel `sublider` ou acima.
> **Ler** continua recortado pelo cluster do cliente.
> **Guardar linha excluída** só em `cliente` e `contribuinte`; todo o resto apaga de vez.

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| [1 Alterar por cargo](TAREFA_alterar-por-cargo.md) | `UPDATE` no cadastro exige só papel `sublider` ou acima, nas quatro tabelas que ainda pedem cluster. **Destrava também a exclusão lógica** de cliente e contribuinte, que é um UPDATE. | Sim — **1 ⚠️ MIGRAÇÃO**: 4 policies de UPDATE | Plano escrito · aguarda aplicação |
| [2 Apagar cliente e contribuinte por cargo](TAREFA_excluir-por-cargo.md) | As duas permissões de `DELETE` das tabelas que continuam com exclusão lógica. **Conserta o desfazer** do salvamento, que hoje falha calado e deixou 9 clientes órfãos em 01/09. | Sim — **1 ⚠️ MIGRAÇÃO**: 2 policies de DELETE | Plano escrito · aguarda aplicação |
| [3 Soft delete de cliente e contribuinte](TAREFA_soft-delete-cliente-e-contribuinte.md) | Os **dois que continuam** guardando linha excluída. Hoje excluir contribuinte recusa todo não-admin: a linha some da vista no meio da própria gravação. **Depende da 1.** | Sim — **1 ⚠️ MIGRAÇÃO** + front | Plano escrito · aguarda aplicação |
| [4 Representante e rateio passam a apagar de vez](TAREFA_representante-e-rateio-hard-delete.md) | Conversão de soft para hard delete nas **duas tabelas sem dependentes**. Duas fases: a 1 muda o comportamento e é reversível; a 2 apaga as 196 linhas já marcadas e derruba a coluna, e não tem volta. | Sim — **2 ⚠️ MIGRAÇÕES** (a 2ª opcional) + front | Plano escrito · aguarda aplicação |
| [5 Ordem de serviço passa a apagar de vez](TAREFA_os-hard-delete.md) | Duas travas: **projeto vinculado** e **solicitação de documentos** impedem a exclusão, cada uma com sua frase. Sem elas, apaga tudo em cascata — rateio e produtos vão junto. Leva a limpeza dos **26 rateios fantasma (1800%) e 40 produtos presos**. | Sim — **4 ⚠️ MIGRAÇÕES** + front | Plano escrito · aguarda aplicação |
| ~~[Rateio e produtos saem junto com a OS](TAREFA_exclusao-em-cascata-da-os.md)~~ | ⛔ **APOSENTADA (02/09).** Fazia por trigger o que a exclusão física faz sozinha. A limpeza dos órfãos migrou para a tarefa 5. | — | ⛔ Não executar |

### Ordem sugerida

`1 → 3` (a 3 depende da 1) · `2`, `4` e `5` são independentes entre si e podem ir em qualquer
ponto. A `5` é a mais pesada e a que mais mexe em dado histórico.

### O que já saiu, na sprint 12

- [Registrar por cargo](../sprint-12/TAREFA_registrar-por-cargo.md) — ✅ aplicada em
  02/09/2026 (migração `20260902192547`, commit `3d4c03d5`). **Ainda sem validação real:** o
  cadastro que funcionou em 02/09 levou os clusters "TAX, OSG", ou seja, passou pelo cluster da
  própria Layara. Falta cadastrar marcando **só** um cluster que não é dela.
- [Mensagens de recusa](../sprint-12/TAREFA_mensagens-de-recusa.md) — catálogo de textos
  fechado e implementado.

## Avisos de prazo de tarefa

| Tarefa | Escopo | Banco? | Status |
|---|---|---|---|
| **[6 A redação dos avisos de prazo vai para produção](TAREFA_redacao-dos-avisos-de-prazo.md)** 🔴 | A GES-01A subiu a produção em 02/09 **com o texto de trabalho**, e o cron está **ativo**: toda manhã às 7h a equipe recebe `Tarefa atrasada:` com corpo `Prazo em …`, no futuro. Leva a redação fechada pela Patricia, os acentos, e o gestor passa a receber só o atraso. | Sim — **1 ⚠️ MIGRAÇÃO** (`20260902210245`), só duas funções, nada de schema. **Não aplicada** | 🔴 **Urgente pelo cron** — escrita, aguarda o passo humano no Lovable |

## Como usar esta pasta

- **Uma tarefa = um arquivo** `TAREFA_<slug>.md` nesta pasta.
- Planos de design/arquitetura mais longos continuam em `docs/planos/` — a tarefa linka para
  eles em vez de duplicar.
- Cada tarefa traz subtarefas numeradas (`T1`, `T2`, …) e bugs achados no caminho (`B1`, `B2`,
  …), com marcação explícita de **⚠️ MIGRAÇÃO** ou **⚠️ MUDANÇA DE RPC** quando depende do
  Lovable.
- Ao concluir uma subtarefa, marcar `✅ CONCLUÍDO (data)` dentro do arquivo da tarefa e
  atualizar a coluna Status desta tabela.
