# Inventário de paletas por tela

**Levantamento de 2026-08-18** (branch `develop`). Documento de leitura, não de decisão:
mede onde a arquitetura de `docs/geral/paleta-por-area.md` já chega e onde ainda não.

O mecanismo está descrito lá; aqui só o que importa para ler a tabela:

- O componente nomeia um **papel** (`bg-status-andamento`); quem resolve o tom é a classe de
  tema no `<html>`, posta pelo layout da área.
- Hoje existem **três blocos de paleta** em `src/index.css`: `:root` (base), `.tax-theme` e
  `.osg-theme`.
- **Apenas três layouts** tocam o `<html>`: `FiscalLayout` (`tax-theme`), `OsgLayout`
  (`osg-theme`) e `EquipeLayout` (`rotina-theme` — que **não** é paleta: troca só o
  `--ring`). Todos os demais layouts (`BoardLayout`, `DevLayout`, `GestaoLayout`,
  `AdminLayout`, `FixosLayout`, `mapa/Layout`) não aplicam nada, e as telas que rodam neles
  caem na base.

---

## Comando de auditoria (para refazer este levantamento)

```bash
# 1) cor de estoque do Tailwind — todas as ocorrências
grep -rnoE '(bg|text|border|ring|fill|stroke|from|to|via)-(slate|zinc|neutral|stone|gray|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]{2,3}' \
  src --include=*.tsx --include=*.ts > all.txt

# 2) tirar os degraus que SÃO token do design system (declarados em tailwind.config.ts)
grep -vE '\-(teal-(500|600|700)|lime-(400|500|600)|gray-(50|400|500|600|700|800|900))$' all.txt > stock.txt

# 3) uso de papéis e de tons de tag
grep -rnoE '(bg|text|border)-(status-[a-z]+|tag-[a-d])' src --include=*.tsx --include=*.ts > roles.txt

# 4) vazamento de token de área em código compartilhado
grep -rnoE '(bg|text|border|ring|from|to|via|fill|stroke)-(tax|osg)-[a-z0-9]+' src --include=*.tsx --include=*.ts > areatok.txt

# 5) quem aplica tema no <html>
grep -rn 'document.documentElement.classList' src
```

### O passo 2 não é detalhe: `teal-600` e `teal-100` são coisas diferentes

`tailwind.config.ts` **redefine** três famílias inteiras para tokens do design system:

| Família | Degraus que são **token do DS** (`hsl(var(--…))`) | Todos os outros degraus |
|---|---|---|
| `teal` | `500`, `600`, `700` | cor de estoque |
| `lime` | `400`, `500`, `600` | cor de estoque |
| `gray` | `50`, `400`, `500`, `600`, `700`, `800`, `900` | cor de estoque |

Ou seja: `bg-teal-600` resolve para `--teal-600` (o teal da marca, controlado pelo CSS) e é
**legítimo**; `bg-teal-100` não existe como token, cai na paleta padrão do Tailwind e é cor
de estoque. O mesmo vale para `gray-500` (token) contra `gray-300` (estoque). Contar as duas
juntas infla o problema em ~26%.

**Números do dia:** 5.453 ocorrências brutas → **1.144 são token do DS** e **4.309 são cor
de estoque**, em 313 arquivos.

### Segunda leitura: neutro de chrome × matiz semântica

Nem toda cor de estoque compete com a paleta. `slate`/`zinc`/`neutral`/`stone`/`gray` fora
dos degraus-token são quase sempre **chrome** (borda de card, texto secundário, fundo de
barra lateral) — feio de manter, mas não disputa significado com o papel de status. As
famílias de **matiz** (`red`, `green`, `blue`, `amber`, `emerald`, …) são as que estão
dizendo "isto está em andamento / deu erro / acabou" por fora do sistema. As duas contagens
aparecem separadas na tabela.

---

## Tabela principal

Situações: **A** = paleta própria declarada · **B** = na base, por decisão, já consumindo
papéis · **C** = na base e ainda pintando por fora · **D** = módulo compartilhado.

| Área | Rotas | Layout | Tema no `<html>` | Sit. | Estoque (ocorr./arq.) | dos quais matiz | Veredito |
|---|---|---|---|---|---|---|---|
| **Tax** | `/equipe/tax/*` | `FiscalLayout` | `tax-theme` | **A** | 13 / 3 | 12 | Paleta declarada e consumida; resíduo em 3 arquivos, um deles nem roda sob o layout. |
| **OSG** | `/equipe/osg/*` | `OsgLayout` | `osg-theme` | **A** | 304 / 53 | 65 | Paleta declarada; o corpo usa tokens `osg-*` (1.059 ocorrências). O que sobra é chrome `slate` e as folhas de impressão. |
| **Digital · Rotina e Daily** | `/equipe/rotinas`, `/equipe/daily` | `EquipeLayout` | `rotina-theme` (só `--ring`) | **B** | 0 / 0 | 0 | Convertido de verdade: 39 usos de papel, zero cor de estoque. É a referência do que "estar na base" deve parecer. |
| **Digital · Kanban, Sprints, Backlog** | `/equipe/kanban`, `/equipe/sprints`, `/equipe/sprints/:id`, `/equipe/backlog` | `EquipeLayout` | `rotina-theme` | **C** | 244 / 24 | 145 | Status de entregável, risco e prioridade ainda em `bg-green-100`/`bg-red-100`. Zero papéis. |
| **Digital · Projetos, Processos, Mapeamento, Biblioteca** | `/equipe/projetos`, `/equipe/processos`, `/equipe/mapeamento`, `/equipe/biblioteca` | `EquipeLayout` | `rotina-theme` | **C** | 477 / 42 | 261 | O maior bolo do Digital. Zero papéis. Não confundir com o módulo de projetos/tarefas da Tax/OSG, que é outro código. |
| **Digital · Dashboards e Relatórios** | `/equipe/dashboard`, `/equipe/dashboards`, `/equipe/dashboards/analise-inteligente`, `/equipe/relatorios` | `EquipeLayout` | `rotina-theme` | **C** | 134 / 9 | 64 | KPI e análise pintam por matiz fixa. |
| **Digital · Mapa** | `/equipe/digital/mapa/*` | `mapa/Layout` | **nenhum** | **C** | 0 / 0 | 0 | **Falso negativo do grep.** Não usa Tailwind: 8.022 linhas de CSS próprio com 925 cores hex, mais 183 hex em `.tsx`. Declara `--status-mapping/-diagnostic/-improvement/-roi` — nomes que colidem com os papéis do sistema sem serem eles. |
| **Digital · seletor e chrome** | `/equipe/digital`, `/equipe`, `/equipe/chamados` | `EquipeLayout` / nenhum | `rotina-theme` / nenhum | **C** | 56 / 4 | 9 | `EquipeLayout` sozinho tem 35 (chrome `slate`). `/equipe/chamados` roda **sem layout algum**. |
| **Acessos** | `/equipe/acessos`, `/gestao/acessos` | nenhum / `GestaoLayout` | **nenhum** | **C/D** | 396 / 14 | 108 | As páginas em si têm zero; os 13 componentes de `src/components/acessos/` mais o `EstruturaManager` concentram tudo. Módulo montado em 2 rotas ativas, com cor fixa. |
| **Dev** | `/equipe/dev/*` (25 rotas) | `DevLayout` | **nenhum** | **C** | 1.990 / 89 | 622 | **Maior passivo do sistema, 46% do total.** Tabelas fiscais, modais de auditoria e abas de correção SPED pintam status linha a linha. |
| **Board / Gerencial** | `/equipe/board/*` (incl. `desempenho/*` e `performance`) | `BoardLayout` | **nenhum** | **C/D** | 83 / 9 | 55 | Número enganosamente baixo: o Board é quase todo feito de módulos compartilhados (`AreaDashboardContent`, `AuditTabs`, `ChamadosGestaoContent`). O passivo dele está em D, não aqui. Gráficos com hex fixo em `board-chart-defaults.ts` e `clientes-os/shared.ts`. |
| **Gestão (Marketing)** | `/gestao`, `/gestao/contatos`, `/gestao/acessos` | `GestaoLayout` | **nenhum** | **C** | 17 / 1 | 8 | Só o `GestaoAccessGate`. As telas de chamados que moravam aqui viraram módulo compartilhado (ver D). |
| **Portal do cliente** | `/cliente`, `/cliente/novo-chamado`, `/cliente/chamados`, `/cliente/chamados/:id` | **nenhum** | **nenhum** | **C** | 151 / 5 | 68 | Nenhuma das 4 telas tem layout — não há onde pendurar tema hoje. `ChecklistDocumentosCliente` sozinho tem 103. |
| **Público / institucional** | `/`, `/missao`, `/novidades`, `/novidades/:slug`, `/ajuda`, `/auth`, `/reset-password`, `/primeiro-acesso` | **nenhum** | **nenhum** | **C** | 65 / 18 | 19 | Site de marca, quase todo neutro. Fora do escopo de papéis de status por natureza. |
| **Compartilhados** | — | — | herda de quem hospeda | **D** | 300 / 36 | 114 | Ver detalhamento abaixo. |
| **Telas não roteadas** | — (não estão no `App.tsx`) | `AdminLayout` / `FixosLayout` | **nenhum** | — | 77 / 5 | 32 | `src/pages/administracao/*`, `EquipeUsuarios`, `EquipeDemandas`, `FiscalDemandasClientes`, `equipe/fixos/*`. Código morto; não entra em fila de trabalho. |

> Soma com sobreposição de 8 ocorrências: `board/dashboard-uso-envio/GerencialFiltros.tsx`
> conta em Board e em Compartilhados.

---

## Situação D — módulos compartilhados, um por um

Um módulo compartilhado é o teste de fogo da arquitetura: se ele nomeia papel, sai teal na
Tax e musgo na OSG sem uma linha de condicional; se nomeia cor, mostra a mesma cor em toda
parte.

| Módulo | Onde é montado | Sensível à área? | Evidência |
|---|---|---|---|
| `components/equipe/tarefas/` + `components/equipe/fiscal/tasks/` | Tax, OSG (e o modal de subtarefa) | **Sim** | 68 + 6 usos de papel, **zero** cor de estoque. `taskStatusColors.ts` e `projetoStatusColors.ts` centralizam. |
| `components/equipe/area-dashboard/` | Board (`/capacidade`), Tax | **Sim** | Zero estoque; consome `taskStatusColors`. |
| `lib/taskPriorityColors.ts` | módulo de tarefas (via `TaskPropertyBar`) | **Não** | Ficou em `bg-info` / `bg-warning` / `bg-destructive` enquanto o resto virou papel. Prioridade Baixa/Média/Urgente já tem papel definido no doc (`neutro`/`fila`/`ajuste`). O próprio arquivo admite cópias locais em `TaskCard`, `TaskTable` e `TaskTodayView`. |
| `components/equipe/client-form/acentoArea.tsx` | Tax (`GestaoClientes`), OSG (5 telas), lote | **Sim, mas errado** | É sensível por **`if` de área**, não por papel: `area === 'osg' ? OSG : TEAL`. Contém 14 usos de `osg-*` e 12 de `teal-*` fixos. Qualquer terceira área que monte o modal sai vestindo a identidade da Tax. É exatamente o que a condição 1 do doc proíbe. |
| `components/equipe/audit/` (`AuditTabs`) | Board, Tax, OSG | **Não** | 144 ocorrências de estoque em 12 arquivos. As mesmas seis abas mostram a mesma cor nas três áreas. |
| `pages/gestao/GestaoChamados.tsx` → `ChamadosGestaoContent` | Gestão, Tax, OSG, Board | **Não** | `statusColors` local em `bg-info`/`bg-warning`/`bg-success`. Token semântico é melhor que `bg-blue-500`, mas continua fixo: não muda com a área. |
| `pages/gestao/GestaoDetalhesChamado.tsx` → `ChamadoDetalheContent` | Gestão, Tax, OSG, Board | **Não** | Mesmo mapa duplicado. |
| `components/chamados/equipe/` | `/equipe/chamados` | **Sim** | Já usa `chamadoStatusColors.ts` (19 usos de papel). 6 ocorrências residuais de estoque em `EquipeChamadosStats`. |
| `components/acessos/` | `/equipe/acessos`, `/gestao/acessos` | **Não** | 346 ocorrências. `pageCategoryStyles.ts` e `roleOptions.ts` são tabelas de cor fixa (53 juntas). |
| `components/dashboards/` (embeds) | Board, Dev, Tax, OSG | **Não** | 71 ocorrências; `DashboardOverviewDialog` com 48. |
| `components/notifications/` + `lib/notificacoesInternas.ts` | os 6 layouts | **Não** | 17 ocorrências; mapa de cor por tipo de notificação. |
| `components/ui/` (shadcn) | tudo | n/a | 15 ocorrências residuais (`calendar`, `toast`, pickers). Baixa prioridade. |
| Gráficos Recharts (`lib/board-chart-defaults.ts`, `equipe/board/clientes-os/shared.ts`) | Board, Dev, Digital | **Não** | 116 cores hex em 21 arquivos com Recharts. Recharts pinta SVG por prop, não por classe — é uma exceção legítima ao "não nomeie cor", mas a paleta é da marca, não da área. Se o Board ganhar tema, esses hex não seguem. |

### O estado real dos chamados (confirmado, não assumido)

A conversão está **pela metade**, como suspeitado — com o recorte exato abaixo.

Já convertido:
- `src/lib/chamadoStatusColors.ts` (novo) — status, prioridade, atividade e escada de prazo,
  todos em papéis.
- `src/components/chamados/equipe/EquipeChamadosTable.tsx` e `PrazoBadge.tsx` consomem.
- `src/lib/equipeChamados.ts` reexporta.

Ainda com mapa de cor duplicado (5 cópias, o próprio comentário do lib menciona seis
originais):

| Arquivo | Linha | O que tem |
|---|---|---|
| `src/pages/cliente/MeusChamados.tsx` | 19 | `bg-blue-500` / `bg-yellow-500` / `bg-green-500` / `bg-gray-500` + mapa de prioridade |
| `src/pages/cliente/DetalhesChamado.tsx` | 20 | idem |
| `src/pages/equipe/EquipeDetalhesChamado.tsx` | 22 | idem |
| `src/pages/gestao/GestaoChamados.tsx` | 54 | `bg-info` / `bg-warning` / `bg-success` / `bg-muted-foreground` |
| `src/pages/gestao/GestaoDetalhesChamado.tsx` | 25 | idem |

As duas últimas são as que mais custam: são o miolo compartilhado que a Tax, a OSG e o Board
montam nas rotas `/equipe/tax/gerencial/chamados`, `/equipe/osg/gerencial/chamados` e
`/equipe/board/chamados`. Enquanto ficarem fixas, a Gerencial da OSG mostra chamado com a
mesma cor da Gerencial da Tax, dentro de layouts com paletas diferentes.

O Digital Rotina e o Acessos: **Rotina confirmado convertido** (`/equipe/rotinas` e
`/equipe/daily`, 39 usos de papel, zero estoque). **Acessos não** — a página
`EquipeControleAcessos.tsx` está limpa, mas os 13 componentes de `src/components/acessos/`
que ela monta somam 346 ocorrências de cor de estoque.

---

## Filas de trabalho — áreas em situação C

Ordenadas por ocorrências de cor de estoque, do maior para o menor. Só arquivos de produção;
`.test.tsx` incluído quando aparece, mas não é prioridade.

### C1 — Dev (1.990 ocorrências / 89 arquivos) — `/equipe/dev/*`

| Ocorr. | Arquivo |
|---:|---|
| 92 | `src/components/equipe/dev/correcoes-sped/TabC170.tsx` |
| 87 | `src/components/equipe/dev/DifalAuditModal.tsx` |
| 78 | `src/pages/equipe/dev/ConsultaEFD.tsx` |
| 78 | `src/components/equipe/dev/IbsCbsAuditModal.tsx` |
| 67 | `src/pages/equipe/dev/ConsultaECF.tsx` |
| 67 | `src/pages/equipe/dev/ConsultaECD.tsx` |
| 65 | `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` |
| 62 | `src/components/equipe/dev/correcoes-sped/TabF100.tsx` |
| 62 | `src/components/equipe/dev/correcoes-sped/TabA170.tsx` |
| 52 | `src/components/equipe/dev/correcoes-sped/TabF130.tsx` |
| 52 | `src/components/equipe/dev/correcoes-sped/TabF120.tsx` |
| 50 | `src/components/equipe/dev/correcoes-sped/TabD100.tsx` |
| 47 | `src/pages/equipe/dev/DevDashboard.tsx` |
| 45 | `src/pages/equipe/dev/ControleBalancetes.tsx` |
| 40 | `src/components/equipe/dev/calculadora-ibs-cbs/UfDrillDown.tsx` |
| 40 | `src/components/equipe/dev/calculadora-ibs-cbs/AbaPorProduto.tsx` |
| 39 | `src/components/equipe/dev/calculadora-ibs-cbs/AbaResumo.tsx` |
| 39 | `src/components/equipe/dev/EFDFiscalTable.tsx` |
| 36 | `src/pages/equipe/dev/MapaNCMPisCofins.tsx` |
| 36 | `src/components/equipe/dev/perdcomp/per-detail/PerDetailSituationSidebar.tsx` |
| 33 | `src/components/equipe/dev/icms-saidas/familias/FamiliaSaidaTab.tsx` |
| 32 | `src/components/equipe/dev/balancete/UploadBalanceteModal.tsx` |
| 32 | `src/components/equipe/dev/EFDAnalysisModal.tsx` |
| 31 | `src/components/equipe/dev/dashboard-uso-envio/primitivos.tsx` |
| 31 | `src/components/equipe/dev/DevLayout.tsx` |
| 30 | `src/components/equipe/dev/perdcomp/per-detail/PerDetailHeader.tsx` |
| 30 | `src/components/equipe/dev/icms-saidas/T01ApuracaoTab.tsx` |
| 29 | `src/components/equipe/dev/procedimentos/ProcedimentoCard.tsx` |
| 26 | `src/pages/equipe/dev/IcmsSaidas.tsx` |
| 24 | `src/components/equipe/dev/efd-export/EFDRecordSelector.tsx` |
| … | mais 59 arquivos abaixo de 24 |

Observação: 1.368 das 1.990 são neutros de chrome (`slate`/`zinc`/`gray` fora dos degraus-
token). As 622 de matiz são as que realmente disputam significado — e vivem sobretudo nos
seis `Tab*.tsx` de `correcoes-sped` e nos dois `*AuditModal.tsx`.

### C2 — Digital · Projetos, Processos, Mapeamento (477 / 42)

| Ocorr. | Arquivo |
|---:|---|
| 50 | `src/components/equipe/produto-servico/ProdutosVinculoPanel.tsx` |
| 33 | `src/components/equipe/produto-servico/ServicosVinculoPanel.tsx` |
| 31 | `src/components/equipe/projetos/projectPresentation.tsx` |
| 28 | `src/components/equipe/ImpactDashboard.tsx` |
| 27 | `src/components/equipe/projetos/ProjectInfoTab.tsx` |
| 24 | `src/components/equipe/mapeamento/ScenarioList.tsx` |
| 23 | `src/components/equipe/mapeamento/ScenarioCreateModal.tsx` |
| 17 | `src/components/equipe/mapeamento/ScenarioComparator.tsx` |
| 16 | `src/components/equipe/projetos/ProcessDialogs.tsx` |
| 16 | `src/components/equipe/ImprovementHistoryModal.tsx` |
| 15 | `src/components/equipe/StageEditCard.tsx` |
| 14 | `src/components/equipe/process-improvement/SavingsSections.tsx` |
| 14 | `src/components/equipe/EmpresasTab.tsx` |
| 13 | `src/components/equipe/processos/ProcessList.tsx` |
| 12 | `src/components/equipe/mapeamento/MetricsCards.tsx` |
| 10 | `src/components/equipe/projetos/constants.ts` |
| 10 | `src/components/equipe/processos/ProcessInfoTab.tsx` |
| 10 | `src/components/equipe/processos/ProcessFilters.tsx` |
| 10 | `src/components/equipe/process-improvement/TeamComparison.tsx` |
| 10 | `src/components/equipe/mapeamento/ProcessSpreadsheet.tsx` |
| … | mais 22 arquivos abaixo de 10 |

`projetos/constants.ts` e `projectPresentation.tsx` são tabelas de cor por status — o alvo
óbvio: converter os dois converte a maior parte das telas de uma vez.

### C3 — Acessos + Estrutura (396 / 14)

| Ocorr. | Arquivo |
|---:|---|
| 77 | `src/components/acessos/DashboardsTab.tsx` |
| 50 | `src/components/equipe/estrutura/EstruturaManager.tsx` |
| 40 | `src/components/acessos/UsersRolesView.tsx` |
| 39 | `src/components/acessos/CreateUserDialog.tsx` |
| 35 | `src/components/acessos/UsersTab.tsx` |
| 33 | `src/components/acessos/pageCategoryStyles.ts` |
| 33 | `src/components/acessos/PagesTab.tsx` |
| 28 | `src/components/acessos/EditUserDialog.tsx` |
| 20 | `src/components/acessos/roleOptions.ts` |
| 15 | `src/components/acessos/AccessStatsCards.tsx` |
| 10 | `src/components/acessos/PermissionsTree.tsx` |
| 8 | `src/components/acessos/DeleteUserDialog.tsx` |
| 4 | `src/components/acessos/ManageAccessLink.tsx` |
| 4 | `src/components/acessos/EquipesEstruturaField.tsx` |

`pageCategoryStyles.ts` + `roleOptions.ts` = 53 ocorrências em dois arquivos de tabela; é o
começo barato.

### C4 — Digital · Kanban, Sprints, Backlog (244 / 24)

| Ocorr. | Arquivo |
|---:|---|
| 33 | `src/pages/equipe/EquipeSprints.tsx` |
| 25 | `src/components/equipe/demandas/DemandDialogs.tsx` |
| 20 | `src/components/equipe/kanban/KanbanDeliverableDialog.tsx` |
| 18 | `src/pages/equipe/EquipeBacklog.tsx` |
| 15 | `src/components/equipe/demandas/DemandList.tsx` |
| 14 | `src/components/equipe/kanban/KanbanBoard.tsx` |
| 13 | `src/pages/equipe/EquipeKanban.tsx` |
| 13 | `src/components/equipe/sprint-detalhes/AgendaTab.tsx` |
| 13 | `src/components/equipe/kanban/KanbanFilters.tsx` |
| 12 | `src/components/sprint/SprintCalendar.tsx` |
| 12 | `src/components/equipe/sprint-detalhes/SprintHeaderFilters.tsx` |
| 10 | `src/components/equipe/sprint-detalhes/RisksTab.tsx` |
| … | mais 12 arquivos abaixo de 10 |

O Kanban é o caso mais barato do sistema: as colunas já são os papéis do doc
(`neutro`/`fila`/`andamento`/`revisao`/`feito`), só falta trocar as classes.

### C5 — Portal do cliente (151 / 5)

| Ocorr. | Arquivo |
|---:|---|
| 103 | `src/components/cliente/ChecklistDocumentosCliente.tsx` |
| 21 | `src/pages/cliente/ClienteDashboard.tsx` |
| 17 | `src/components/cliente/CardGrupoColeta.tsx` |
| 7 | `src/pages/cliente/MeusChamados.tsx` |
| 3 | `src/pages/cliente/DetalhesChamado.tsx` |

Bloqueio estrutural: nenhuma das 4 rotas de `/cliente` tem componente de layout. Antes de
falar em paleta do portal é preciso um `ClienteLayout` — hoje não há onde pôr o `useEffect`.

### C6 — Digital · Dashboards e Relatórios (134 / 9)

| Ocorr. | Arquivo |
|---:|---|
| 35 | `src/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteAnalysis.tsx` |
| 27 | `src/components/equipe/dashboards/ControleUsoEnvio.tsx` |
| 26 | `src/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteKpis.tsx` |
| 10 | `src/pages/equipe/dashboards/AnaliseInteligente.tsx` |
| 9 | `src/pages/equipe/EquipeDashboard.tsx` |
| 9 | `src/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteFilters.tsx` |
| 9 | `src/components/equipe/dashboards/analise-inteligente/AnaliseInteligenteCharts.tsx` |
| 8 | `src/pages/equipe/EquipeRelatorios.tsx` |
| 1 | `src/pages/equipe/dashboards/Dashboards.tsx` |

### C7 — Board / Gerencial (83 / 9)

| Ocorr. | Arquivo |
|---:|---|
| 15 | `src/pages/gerencial/desempenho/DesempenhoMetas.tsx` |
| 15 | `src/pages/gerencial/desempenho/DesempenhoCiclos.tsx` |
| 14 | `src/pages/gerencial/desempenho/DesempenhoReunioes1a1.tsx` |
| 11 | `src/pages/equipe/board/DashboardUsoEnvioGerencial.tsx` |
| 9 | `src/pages/gerencial/desempenho/DesempenhoEvolucao.tsx` |
| 8 | `src/components/equipe/board/dashboard-uso-envio/GerencialFiltros.tsx` |
| 7 | `src/pages/gerencial/desempenho/DesempenhoFeedbacks.tsx` |
| 2 | `src/pages/gerencial/desempenho/MinhaEvolucao.tsx` |
| 2 | `src/pages/gerencial/desempenho/DesempenhoRelatorios.tsx` |

Fila curta, mas enganosa: o que o Board mostra vem em maioria dos módulos em D — logo,
declarar a paleta do Board sem antes converter `AuditTabs` e `ChamadosGestaoContent` deixa
metade da área com a cor errada.

### C8 — Digital · Mapa (0 pelo grep, mas fora do sistema)

Não tem fila de arquivo Tailwind porque não usa Tailwind. Números para dimensionar:

- `src/pages/equipe/mapa/mapa.css` — 3.004 linhas
- `src/pages/equipe/mapa/styles/roi.css` — 2.633 linhas
- `src/pages/equipe/mapa/styles/cadastro.css` — 1.602 linhas
- `src/pages/equipe/mapa/styles/cascata.css` — 783 linhas
- `src/components/equipe/mapa/tour/tour.css`
- **925 cores hex** nesses CSS, **183 hex** nos `.tsx` do módulo
- variáveis próprias colidindo em nome: `--status-mapping`, `--status-diagnostic`,
  `--status-improvement`, `--status-roi` (`mapa.css:49-52`)

É um segundo design system dentro do repositório. Converter o Mapa não é trocar classes: é
decidir se ele passa a viver no sistema.

### Residual — Gestão, público e `ui/`

| Ocorr. | Arquivo |
|---:|---|
| 17 | `src/components/gestao/GestaoAccessGate.tsx` |
| 12 | `src/pages/Auth.tsx` |
| 8 | `src/components/OfficesSection.tsx` |
| 8 | `src/components/ErrorBoundary.tsx` |
| 6 | `src/pages/ResetPassword.tsx` |
| 6 | `src/pages/PrimeiroAcesso.tsx` |
| 6 | `src/components/ui/calendar.tsx` |
| … | 15 arquivos com 4 ou menos |

---

## Paletas que faltam criar

Recomendação em três blocos. A ordem importa: paleta declarada sobre módulo que pinta por
fora não muda nada na tela — só cria a ilusão de que a área foi atendida.

### 1. Antes de qualquer paleta nova: fechar o que já está pela metade

Nenhuma paleta nova rende enquanto estes quatro pontos estiverem abertos, porque são o
caminho pelo qual a paleta chega na tela:

1. **`ChamadosGestaoContent` e `ChamadoDetalheContent`** (`src/pages/gestao/GestaoChamados.tsx`,
   `GestaoDetalhesChamado.tsx`) → trocar os `statusColors` locais por
   `chamadoStatusColors.ts`. Um arquivo cada, e isso já faz a Gerencial da OSG sair musgo e a
   da Tax sair teal, hoje, sem paleta nova nenhuma.
2. **As 3 cópias restantes** — `pages/cliente/MeusChamados.tsx`,
   `pages/cliente/DetalhesChamado.tsx`, `pages/equipe/EquipeDetalhesChamado.tsx`.
3. **`lib/taskPriorityColors.ts`** → papéis `neutro`/`fila`/`alerta`/`ajuste`, e remover as
   cópias locais de `TaskCard`, `TaskTable`, `TaskTodayView`.
4. **`client-form/acentoArea.tsx`** → o `if (area === 'osg')` deveria ser desnecessário. O
   acento é `primary` + papéis; o tema do `<html>` já resolve. Enquanto o `if` existir, toda
   área futura nasce vestindo a Tax.

### 2. Paletas de área a criar — recomendadas, em ordem

| Paleta | Classe | Aplicada por | Telas que cobriria | Por quê |
|---|---|---|---|---|
| **Dev** | `.dev-theme` | `DevLayout` | as 25 rotas `/equipe/dev/*` | Maior superfície do sistema e maior passivo (1.990 ocorrências). É uma área real, com identidade própria já sugerida no `CHART_COLORS.dev` (`#6B46E8`, roxo). Declarar a paleta dá o alvo para a conversão dos `correcoes-sped/Tab*.tsx` e dos modais de auditoria — hoje não há para onde converter. |
| **Board** | `.board-theme` | `BoardLayout` | `/equipe/board/*` — dashboard, relatórios, uso-envio, clientes-os, clientes, chamados, capacidade, logs-equipe, performance, os 9 de desempenho | É o consolidado da empresa: a única área que mostra Tax e OSG lado a lado, e por isso a que mais precisa de uma cor neutra e própria em vez de emprestar a de uma das duas. **Depende do bloco 1** (chamados) e da conversão de `AuditTabs` — sem isso, metade das telas do Board ignora a paleta. |
| **Digital** | `.digital-theme` (substituindo o `.rotina-theme` de meia declaração) | `EquipeLayout` | `/equipe/kanban`, `/equipe/sprints`, `/equipe/backlog`, `/equipe/projetos`, `/equipe/processos`, `/equipe/mapeamento`, `/equipe/biblioteca`, `/equipe/dashboard(s)`, `/equipe/relatorios`, `/equipe/rotinas`, `/equipe/daily`, `/equipe/acessos` | Hoje o `.rotina-theme` declara **só** `--ring` — exatamente a "meia declaração" que o doc chama de pior que nenhuma. Ou vira paleta inteira, ou o Digital assume ficar na base e o `.rotina-theme` é absorvido. A decisão atual ("Digital fica na base") é defensável e está documentada; o que **não** é defensável é o meio-termo atual. |

### 3. Paletas que **não** recomendo criar agora

| Área | Por quê não |
|---|---|
| **Portal do cliente** | Bloqueado por estrutura, não por cor: as 4 rotas de `/cliente` não têm layout algum. O passo é criar um `ClienteLayout` (que resolve também header, nav e `PendingTicketsAlert` duplicados) — e aí a decisão de paleta fica trivial. Enquanto isso, a base é o lugar certo. |
| **Gestão / Marketing** | Área de 3 rotas com 17 ocorrências de estoque em 1 arquivo. Não paga uma paleta. Fica na base, como o doc já prevê. |
| **Digital Mapa** | Precisa de uma decisão de arquitetura antes de uma de cor: 8 mil linhas de CSS próprio e 1.100 hex. Enquanto for um design system paralelo, uma `.mapa-theme` não seria lida por ninguém. |
| **Público / institucional** | Site de marca, sem status de trabalho para pintar. Fora do escopo dos papéis. |
| **Acessos** | Não é área: é módulo montado em duas áreas diferentes. O caminho é converter para papéis (situação D), não declarar paleta. |

### Resumo em uma linha

Duas paletas de área faltam de verdade — **Dev** e **Board** —, uma terceira (**Digital**)
precisa de decisão explícita entre "paleta inteira" e "base, e some com o `.rotina-theme`", e
o **portal do cliente** está bloqueado por não ter layout. Todas as três dependem de fechar
antes os chamados e o `acentoArea`, que são o caminho por onde a paleta chega na tela.

---

## Adendo de 2026-08-20 — o que mudou, e o que sobrou em `/equipe/acessos`

Desde o levantamento de 18/08 três coisas mudaram a leitura da tabela acima:

1. **O tema agora vem da ROTA, não do layout.** `src/lib/areaTheme.ts` mapeia rota → área e
   `AreaThemeProvider` aplica as classes no `<html>`, acima dos gates de acesso. Nenhuma tela
   roda sem tema. Os três layouts que aplicavam classe por conta própria pararam de aplicar.
2. **Existe `.base-theme`** (o contrato completo, 43 variáveis) e **`.sistema-theme`** (delta
   de 9: acento grafite quente para Board, Dev, Digital e Acessos). Tax, OSG e Rotina foram
   *congeladas* no contrato inteiro — nenhuma herda mais do piso.
3. **`--teal-500/600/700` são primitivas**, não token de componente: elas geram
   `bg-teal-*` no Tailwind, o que as fazia parecer cor crua e passar em toda revisão, mas
   moram no `:root` e nenhum tema as sobrescreve. Há regra de lint (`warn`) em
   `src/components` e `src/pages` — 164 avisos hoje, e o número só deve cair.

### Passivo de `/equipe/acessos`, medido em 20/08/2026

O acento do módulo foi convertido (92 → 0). O que sobrou, em ordem de tamanho:

| Categoria | Ocorrências | Situação |
|---|---:|---|
| **Neutros** (`slate-*`, `gray-*`) | **300** em 17 arquivos | O maior bloco, e o que ainda impede a tela de ser coerente: há borda `slate-200` ao lado de botão grafite. Piores: `border-slate-200` (62), `text-slate-500` (58), `text-slate-900` (35), `text-slate-600` (35), `text-slate-400` (26), `bg-slate-50` (23). **Fora de escopo por decisão**, não por esquecimento: neutro não muda com o tema, e misturar essa massa com a migração de acento tornaria o diff irrevisável. |
| **Badges de papel de usuário** | 7 famílias | `ROLE_BADGE_CLASSES` em `src/components/acessos/roleOptions.ts` usa `red` para Admin, `amber` para Líder, `orange` para Sublíder, `cyan` para Time Cliente, `violet` para Marketing, `slate` para Cliente. Só `team_member` está em token. **Antes de tokenizar há uma decisão de design**: são níveis de uma hierarquia e pedem progressão, não cores avulsas — e vermelho para "Admin" comunica erro, não privilégio. |
| **Hex de cor categórica de gráfico** | 26 | `#3B82F6`, `#10B981`, `#F59E0B`… Assunto separado: paleta de série, não acento. O contrato tem `--tag-a…d` para isso. |
| **`estrutura_areas.color`** | 10 linhas no banco | **NÃO é passivo de cor.** É campo editável pelo usuário (`<Input type="color">` + 8 presets) cujo valor está persistido: 7 áreas em `#10b981`, e `#3b82f6`, `#ef4444`, `#f59e0b` em uma cada. Tokenizar exigiria remover o seletor de cor ou migrar a coluna — decisão de produto, não de design system. |

### O controle segmentado da aba

O filtro `Todos | Vinculados | Disponíveis` e a pílula de "Estrutura" sinalizavam o estado
ativo por **matiz** (teal contra cinza). Com o acento grafite a distinção passou a depender só
de luminosidade, que o olho não pega sem comparar. O conserto não é devolver cor: é trocar o
sinal para **elevação** — trilho cinza, item ativo em `bg-card` com borda sutil e `shadow-sm`,
que é o desenho que o `ui/tabs` já usa e que não depende de cor nenhuma.
