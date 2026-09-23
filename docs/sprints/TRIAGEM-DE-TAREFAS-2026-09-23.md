# Triagem das tarefas — 23/09/2026

Varredura de **todo documento de tarefa do repositório**, feita na `develop`, para separar o que
já foi executado do que ainda é trabalho. As 19 que sobraram como pendentes se mudaram para
[`docs/tarefas-a-executar/`](../tarefas-a-executar/README.md); tudo o mais está aqui.

**Este arquivo é registro, não fila.** Quem procura trabalho abre a pasta de tarefas a executar.
Quem quer saber *por que* uma tarefa não está lá abre este.

> **Segunda passada, no mesmo dia.** A primeira varreu `sprints/` e `equipe/`. A segunda varreu
> `geral/`, `mapa/`, `osg/`, `planos/`, `rls/`, `skills/` e a raiz de `docs/`, e achou **mais 9
> tarefas** misturadas a plano e a referência — entre elas o typecheck vermelho na `develop`, a
> dívida de RLS do Eduardo e o checklist do Feed. Todas se mudaram para a pasta de tarefas.
> `docs/equipe/` ficou vazia e foi removida: era pasta só de tarefa.
>
> **O que a segunda passada mostrou é por que o manual existe.** Nenhuma das nove estava
> escondida — estavam em pastas cujo nome não diz se o conteúdo é trabalho ou consulta. A regra
> nova ([`docs/README.md`](../README.md)) resolve isso pelo lugar, não pela leitura.

## O critério

**Executada = o trabalho está no código da `develop`.** Migration escrita e ainda não aplicada
em produção **não** torna a tarefa pendente: é outra fila, a do passo humano no chat do Lovable,
e está na coluna "Produção" das tabelas abaixo.

Três fontes, nesta ordem de autoridade: **o banco de produção** (SELECT pelo MCP do Lovable),
**o código da `develop`**, e só então o que o documento diz de si mesmo. Onde divergiram, valeu
a medição — e divergiram em seis casos.

---

## ✅ Executadas — ficam na pasta da sprint que as entregou

| Tarefa | Onde está | Produção |
|---|---|---|
| Correções do e2e de geração de contrato (21 bugs) | [`sprint-11/`](../tarefas-executadas/2026_08_11_correcoes-e2e-de-geracao-de-contrato.md) · [handoff](sprint-11/HANDOFF_mutirao-correcoes-e2e.md) | Mesclada na `develop` (`3d6ed730`). Conferência pós-correção de 12/08 fechou **12 corrigidos, 0 não corrigidos, 0 não aplicados no banco**. Restam **B7 bloqueada por decisão do Bernardo**, 2 ressalvas e 2 achados novos |
| Parcelamento da OS: nº de parcelas, entrada e valor | [`sprint-11/`](../tarefas-executadas/2026_08_13_parcelamento-da-os-e-valor-do-projeto.md) | ✅ `numero_parcelas` e `valor_entrada` **existem em produção** |
| Registrar no cadastro de cliente por cargo | [`sprint-12/`](../tarefas-executadas/2026_09_02_registrar-no-cadastro-por-cargo.md) | ✅ policies por cargo em produção · falta a Layara validar cadastrando (T3) |
| As mensagens de recusa do cadastro | [`sprint-12/`](../tarefas-executadas/2026_09_02_mensagens-de-recusa-do-cadastro.md) | Só código. T1–T5 feitas · **falta a T6, a conferência da Patricia** |
| Cobrar solicitação sem nenhum documento (GES-04) | [`sprint-12/`](../tarefas-executadas/2026_08_25_cobrar-solicitacao-sem-documento.md) | ✅ enum `solicitacao_vencida` e cron `cobrar-solicitacoes-vencidas-diario` **ATIVO em produção** |
| 1 Alterar no cadastro por cargo | [`sprint-13/`](../tarefas-executadas/2026_09_02_alterar-no-cadastro-por-cargo.md) | ✅ **em produção** — as policies não pedem mais cluster |
| 2 Apagar cliente e contribuinte por cargo | [`sprint-13/`](../tarefas-executadas/2026_09_02_excluir-cliente-e-contribuinte-por-cargo.md) | ✅ **em produção** |
| 3 Soft delete de cliente e contribuinte | [`sprint-13/`](../tarefas-executadas/2026_09_02_soft-delete-de-cliente-e-contribuinte.md) | ✅ `soft_delete_cliente` e `soft_delete_contribuinte` **existem em produção** |
| 4 Representante e rateio apagam de vez | [`sprint-13/`](../tarefas-executadas/2026_09_02_representante-e-rateio-apagam-de-vez.md) | ✅ **em produção**, inclusive a fase 2 — a coluna `excluido` não existe mais em `representante` nem em `distribuicao_receita` |
| 5 Ordem de serviço apaga de vez | [`sprint-13/`](../tarefas-executadas/2026_09_02_ordem-de-servico-apaga-de-vez.md) | ✅ **em produção** — `distribuicao_receita` e `os_produtos_contratados` em `CASCADE`, `solicitacao` em `RESTRICT`, `org_projects` em `NO ACTION`, coluna `excluido` fora |
| 11 A caixa de tabela: branca ou tingida | [`sprint-13/`](../tarefas-executadas/2026_09_16_caixa-de-tabela-branca-ou-tingida.md) | Só front. ✅ FEITO 16/09, 45 cartões em 42 arquivos |
| 12 O Board acompanha o cartão tingido | [`sprint-13/`](../tarefas-executadas/2026_09_17_board-acompanha-o-cartao-tingido.md) | Só front. ✅ FEITO e validado por ela em 17/09 |
| 13 O `bg-white` cru em caixa | [`sprint-13/`](../tarefas-executadas/2026_09_17_bg-white-cru-em-caixa.md) | Só front. ✅ FEITO 17/09, 47 convertidos, fila de 60 para 13 |
| 14 O padrão das explicações contextuais | [`sprint-13/`](../tarefas-executadas/2026_09_17_padrao-de-texto-explicativo.md) | O padrão saiu e está **em vigor** em [`geral/texto-explicativo-na-tela.md`](../geral/texto-explicativo-na-tela.md). Aplicá-lo às rotas é trabalho das auditorias TIP |
| 15 Relatórios e Apresentações | [`sprint-13/`](../tarefas-executadas/2026_09_18_relatorios-e-apresentacoes.md) | Código pronto 18/09. **⚠️ MUDANÇA DE RPC**: publicar `gerar-apresentacao` e `gerar-slides-tributarios`, e os 3 `.pptx` no bucket `osg-templates` |
| TIP-02 · Solicitação e Checklist | [`sprint-13/`](sprint-13/Ajustes_Solicitacao_e_Checklist_para_Tarefas.md) | Executado em 18/09 no que correspondia ao código. O que divergiu virou tarefa de pendências, que está na pasta a executar |
| TIP-03 · Demais rotas do OSG Work | [`sprint-13/`](sprint-13/Ajustes_Demais_Rotas_OSG_Work_para_Tarefas.md) | Idem |

---

## ⛔ Ultrapassadas — não executar

| Documento | Por quê |
|---|---|
| [`sprint-13/TAREFA_exclusao-em-cascata-da-os.md`](../tarefas-executadas/2026_09_02_exclusao-em-cascata-da-os-CANCELADA.md) | **Aposentada em 02/09.** Fazia por trigger o que a exclusão física faz sozinha. A limpeza dos órfãos migrou para a tarefa 5, que já está em produção |
| `sprint-10/` (pasta apagada) | A frente inteira foi substituída pelo desenho das 4 gavetas. As duas tarefas saíram em 01/09 e a pasta em 23/09 (`7a0801a5`). Está no histórico do git |

## Não são tarefas

Consulta, não trabalho — por isso não estão na pasta a executar:

- [`sprint-12/VALIDACAO_aviso-sem-documento.md`](sprint-12/VALIDACAO_aviso-sem-documento.md) — redação validada pela coordenação.
- [`sprint-13/AUDITORIA_TIP-02_documentos-do-cliente.md`](sprint-13/AUDITORIA_TIP-02_documentos-do-cliente.md) — especificação consumida pelos anexos TIP.
- [`sprint-12/NOTA_DECISAO_MATRIZ_ALCADAS_AC.md`](sprint-12/NOTA_DECISAO_MATRIZ_ALCADAS_AC.md) — **proíbe** virar especificação enquanto a decisão não sair.
- [`sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md`](sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md) — é **fonte** de tarefas, não uma tarefa. O que sobrou dela está na seção abaixo.
- [`sprint-12/CONTEXTO_TEMP_PLANEJAMENTO_SPRINT_12.md`](sprint-12/CONTEXTO_TEMP_PLANEJAMENTO_SPRINT_12.md) — o nome diz "temporário" e o papel de handoff acabou, mas **o conteúdo não é descartável**: guarda o mapeamento célula a célula do WP para o PPTX (`Cenario Atual!D39`, `D111:J117` e outros) e a decisão de excluir FIAGRO com as consequências. É a única fonte disso, e descreve código que existe (`src/lib/planejamento-tributario/mapa.ts`). **Referência, não lixo** — esta triagem o classificou como ultrapassado até 23/09, e estava errado.

---

## O que a medição desmentiu

Seis linhas de índice diziam uma coisa e o banco dizia outra. Todas foram corrigidas na origem,
no mesmo commit desta triagem.

| Onde | Dizia | Está |
|---|---|---|
| [`sprint-13/README.md`](sprint-13/README.md), tarefas 1 a 5 | 🔴 "Pendente em produção" nas cinco | **As cinco estão em produção.** As policies não pedem mais cluster, as duas funções de soft delete existem, e a coluna `excluido` saiu de `representante`, `distribuicao_receita` e `ordem_servico` |
| [`sprint-13/README.md`](sprint-13/README.md), tarefa 12 | 🔵 ABERTO | O próprio arquivo diz ✅ FEITO e validado por ela em 17/09, e o código confirma: `--bd-surface` é `hsl(var(--muted) / .35)`, não mais branco |

É o caso que o `AGENTS.md` nomeia: dívida paga **só no banco**, pelo chat do Lovable, não deixa
rastro no repositório, e `supabase_migrations.schema_migrations` de produção não registra tudo.
Quem lesse só o README refaria trabalho de banco já feito.

**A lição operacional:** antes de classificar qualquer tarefa que toque schema, policy, função,
trigger ou cron, conte no banco. `pg_policies`, `pg_proc`, `pg_constraint`,
`information_schema.columns` e `cron.job` respondem quase tudo numa consulta só.

## O que sobrou da análise da sprint 12

De [`sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md`](sprint-12/ANALISE_TAREFAS_A_DESTRINCHAR.md),
medido contra o `src/` em 23/09:

- **Entregues:** `SUC-01A/B/C` (calculadora de ITCMD, 52 arquivos), `GES-01A/B` (crons de prazo
  e inatividade, ativos em produção), `GES-04` (cobrança, ativa em produção).
- **Sem uma linha de código:** `GES-02` (resumo semanal aos gestores) e `GES-05A/B`
  (indicadores gerenciais do sócio) — zero arquivos em `src/`. `SUC-03A/B` (testamento)
  aparece só no catálogo de documentos, nunca como fluxo. **Os três entraram no
  [`PARA-O-BACKLOG.md`](../tarefas-a-executar/PARA-O-BACKLOG.md)** como itens próprios.
- **Precisa de triagem própria:** `AC-01A/B/C` e `AC-03`. O escopo migrou para
  [`osg/arquitetura-alteracoes-contratuais-por-eventos.md`](../osg/arquitetura-alteracoes-contratuais-por-eventos.md)
  (🟡 parcial) e [`planos/radar-de-alteracoes-contratuais.md`](../planos/radar-de-alteracoes-contratuais.md)
  (referência). Não dá para dizer o que falta sem ler os dois.

**A especificação é de 31/08/2026.** Antes de executar qualquer um dos três, remeça contra o
produto de hoje — foi assim que a sprint 14 descobriu que metade de uma conclusão sua estava
errada.
