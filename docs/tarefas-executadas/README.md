# Tarefas executadas

**Histórico.** Tarefa que saiu da fila: entregue, ou cancelada sem ser feita. Nada aqui é
trabalho a fazer — para isso, [`tarefas-a-executar/`](../tarefas-a-executar/README.md).

Mesma convenção de nome da fila: `yyyy_mm_dd_<o-que-a-tarefa-faz>.md`, com a data de **criação**.
Ela não muda quando a tarefa é entregue — é a idade da demanda que interessa no histórico, não a
data em que alguém a fechou. Tarefa cancelada leva `_CANCELADA` no fim do nome, para não ser lida
como entrega.

**Por que não fica na pasta da sprint:** para existir um lugar só onde se pergunta "isto já foi
feito?" sem abrir cinco pastas. A sprint que entregou está na coluna abaixo e dentro do arquivo;
[`sprints/`](../sprints/README.md) guarda o registro da sprint — índice, planilhas de
planejamento, relatórios de teste e os documentos de contexto.

**Critério:** executada = o trabalho está no código da `develop`. A coluna **Produção** diz o que
ainda depende do passo humano no chat do Lovable, que é outra fila. Tudo abaixo foi conferido em
23/09/2026 contra o banco de produção por SELECT, e **seis status estavam errados** — a apuração
está em [`sprints/TRIAGEM-DE-TAREFAS-2026-09-23.md`](../sprints/TRIAGEM-DE-TAREFAS-2026-09-23.md).

---

## As 16

| Tarefa | Sprint | Produção |
|---|---|---|
| [2026_08_11 · Correções do e2e de geração de contrato](2026_08_11_correcoes-e2e-de-geracao-de-contrato.md) | 11 | Mesclada na `develop` (`3d6ed730`). A conferência pós-correção de 12/08 fechou **12 corrigidos, 0 não corrigidos, 0 não aplicados no banco**. Restam **B7 bloqueada por decisão do Bernardo**, 2 ressalvas e 2 achados novos. O andamento detalhado está no [handoff](../sprints/sprint-11/HANDOFF_mutirao-correcoes-e2e.md) |
| [2026_08_13 · Parcelamento da OS e valor do projeto](2026_08_13_parcelamento-da-os-e-valor-do-projeto.md) | 11 | ✅ `numero_parcelas` e `valor_entrada` **existem em produção** |
| [2026_08_25 · Cobrar solicitação sem nenhum documento (GES-04)](2026_08_25_cobrar-solicitacao-sem-documento.md) | 12 | ✅ enum `solicitacao_vencida` e cron `cobrar-solicitacoes-vencidas-diario` **ATIVO em produção** |
| [2026_09_02 · Registrar no cadastro por cargo](2026_09_02_registrar-no-cadastro-por-cargo.md) | 12 | ✅ policies por cargo em produção · falta a Layara validar cadastrando (T3) |
| [2026_09_02 · As mensagens de recusa do cadastro](2026_09_02_mensagens-de-recusa-do-cadastro.md) | 12 | Só código. T1–T5 feitas · **falta a T6, a conferência da Patricia** |
| [2026_09_02 · Alterar no cadastro por cargo](2026_09_02_alterar-no-cadastro-por-cargo.md) | 13 | ✅ **em produção** — as quatro policies de UPDATE não pedem mais cluster |
| [2026_09_02 · Excluir cliente e contribuinte por cargo](2026_09_02_excluir-cliente-e-contribuinte-por-cargo.md) | 13 | ✅ **em produção** — as duas policies de DELETE não pedem mais cluster |
| [2026_09_02 · Soft delete de cliente e contribuinte](2026_09_02_soft-delete-de-cliente-e-contribuinte.md) | 13 | ✅ `soft_delete_cliente` e `soft_delete_contribuinte` **existem em produção** |
| [2026_09_02 · Representante e rateio apagam de vez](2026_09_02_representante-e-rateio-apagam-de-vez.md) | 13 | ✅ **em produção, inclusive a fase 2** — a coluna `excluido` não existe mais em `representante` nem em `distribuicao_receita` |
| [2026_09_02 · Ordem de serviço apaga de vez](2026_09_02_ordem-de-servico-apaga-de-vez.md) | 13 | ✅ **em produção** — `distribuicao_receita` e `os_produtos_contratados` em `CASCADE`, `solicitacao` em `RESTRICT`, `org_projects` em `NO ACTION`, e a coluna `excluido` saiu |
| [2026_09_16 · A caixa de tabela: branca ou tingida](2026_09_16_caixa-de-tabela-branca-ou-tingida.md) | 13 | Só front. Feita em 16/09; ela escolheu **B, tabela branca**. 45 cartões em 42 arquivos |
| [2026_09_17 · O `bg-white` cru em caixa](2026_09_17_bg-white-cru-em-caixa.md) | 13 | Só front. 47 convertidos em dois lotes; a fila caiu de 60 para 13 |
| [2026_09_17 · O Board acompanha o cartão tingido](2026_09_17_board-acompanha-o-cartao-tingido.md) | 13 | Só front. Feita e **validada por ela em 17/09**. O índice da sprint dizia ABERTO até a triagem de 23/09 |
| [2026_09_17 · O padrão de texto explicativo](2026_09_17_padrao-de-texto-explicativo.md) | 13 | O padrão saiu e está **em vigor** em [`geral/texto-explicativo-na-tela.md`](../geral/texto-explicativo-na-tela.md). Aplicá-lo às rotas é outra frente, e está na fila |
| [2026_09_18 · Relatórios e Apresentações](2026_09_18_relatorios-e-apresentacoes.md) | 13 | Código pronto. **⚠️ MUDANÇA DE RPC pendente**: publicar `gerar-apresentacao` e `gerar-slides-tributarios`, e subir os 3 `.pptx` ao bucket `osg-templates` |
| ⛔ [2026_09_02 · Exclusão em cascata da OS](2026_09_02_exclusao-em-cascata-da-os-CANCELADA.md) | 13 | **CANCELADA em 02/09.** Fazia por trigger o que a exclusão física faz sozinha. A limpeza dos órfãos migrou para "Ordem de serviço apaga de vez", que já está em produção. **Não executar** |

## Quatro que ainda dependem de alguém

Estão entregues em código, mas não fecharam de ponta a ponta. Não voltam para a fila — só
precisam de uma pessoa, não de trabalho de desenvolvimento:

- **Registrar por cargo** — a Layara validar cadastrando um cliente real (T3).
- **Mensagens de recusa** — a conferência da Patricia (T6).
- **Relatórios e Apresentações** — publicar as duas edge functions e subir os modelos.
- **Correções do e2e** — a B7, parada em decisão de produto do Bernardo.
