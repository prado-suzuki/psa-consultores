# Ledger - Fase 3 da refatoracao de god-components

Data: 2026-07-21

## Resultado global

- Baseline: 24.160 linhas nos 20 arquivos originais.
- Resultado apos sincronizacao com `origin/main`: 2.017 linhas nos 20 arquivos originais, reducao de 22.143 linhas.
- Todas as 20 fachadas estao abaixo de 400 linhas e do teto obrigatorio de 600.
- Maior novo `.tsx` de producao: `src/components/equipe/osg/gerar/PainelConferencia.tsx`, 444 linhas.
- Verify automatizado: 20 arquivos de teste, 182 testes aprovados.
- Suite global: 133 arquivos, 1.181 testes aprovados.
- `bun run typecheck`: aprovado.
- `bun run lint`: zero erros e 604 warnings preexistentes ou provenientes de `origin/main`; nenhum warning nos arquivos da Fase 3.
- `bun run build`: aprovado.
- `git diff --check`: aprovado.
- Nenhum diff em banco, migrations, RLS, RPCs, rotas, permissoes, tipos Supabase, CSS congelado ou `package-lock.json`.
- Nenhuma chamada direta nova a Supabase ou `fetch` nos componentes/paginas tocados.
- `/verify` interativo nao esta disponivel neste ambiente. Os equivalentes automatizados foram executados; verificacoes visuais e de navegador real permanecem explicitamente pendentes abaixo.

## Unidades

| Unidade | Status | Owner | Arquivos permitidos | Testes | Linhas antes | Linhas depois | Review | Verify |
|---|---|---|---|---:|---:|---:|---|---|
| M1 | feito | `ses_07b43bcf8ffekVbIIKrcbS1YDg` | `DashboardRoiPage.tsx/test`; `dashboard-roi/**`; `dashboardRoi*.ts` | 8 | 1.609 | 93 | frontend + dados, sem blocker | auto aprovado; visual pendente |
| M2 | feito | `ses_07b43bcabffeconN1b9ekoGgM1` | `MapearProcessoPage.tsx/test`; `mapear-processo/**`; `mapearProcesso*.ts` | 16 | 1.252 | 135 | frontend + dados, sem blocker | auto aprovado; DnD/visual pendente |
| M3 | feito | `ses_07b43bca0ffeISMOQFXF75ah9J` | `WizardRoi.tsx/test`; `wizard-roi/**`; `wizardRoi*.ts` | 6 | 1.064 | 132 | frontend, sem blocker | auto aprovado; visual pendente |
| M4 | feito | `ses_07b43bc97ffe6zMcRXFqYzqboA` | `AbaPorEstado.tsx/test`; `por-estado/**`; `porEstadoIbsCbs*.ts` | 15 | 999 | 91 | frontend + dados, sem blocker | auto aprovado; Sankey/visual pendente |
| P1 | feito | `ses_07b43bc7dffej7JgMXvRuTDYGl` | `EquipeSprintDetalhes.tsx/test`; `sprint-detalhes/**`; `equipeSprintDetalhes*.ts`; `useEquipeSprintDetalhes*.ts` | 18 | 2.437 | 66 | frontend + dados, sem blocker da refatoracao | auto aprovado; realtime/arquivos/visual pendente |
| P2 | feito | `ses_07b43bc5bffezn4HSJTdTdm7l8` | `EquipeDaily.tsx/test`; `daily/**`; `equipeDaily*.ts`; `useEquipeDaily*.ts` | 10 | 880 | 63 | frontend + dados, sem blocker | auto aprovado; XLSX/visual pendente |
| P3 | feito | `ses_07b43bc4cffe6tfkjW2k9q3YRW` | `ProcessImprovementModal.tsx/test`; `process-improvement/**`; `processImprovement*.ts` | 5 | 934 | 317 | frontend + dados, sem blocker | auto aprovado; visual pendente |
| P4 | feito | `ses_07b43bc39ffe7nc9kKL6BTNbIr` | `GestaoChamadosDashboard.tsx/test`; `chamados-dashboard/**`; `gestaoChamadosDashboard*.ts` | 8 | 864 | 101 | frontend, sem blocker | auto aprovado; visual/permissoes pendente |
| P5 | feito | `ses_07b43bc2fffeo9oFVtQcKHgrAQ` | `EquipeChamados.tsx/test`; `chamados/equipe/**`; `equipeChamados*.ts` | 9 | 830 | 130 | frontend, sem blocker | auto aprovado; SLA/permissoes pendente |
| O1 | feito | `ses_07b43bc24ffepoXdZPzOPe66lS` | `GerarDocumento.tsx/test`; `osg/gerar/**`; `gerarDocumento*.ts`; `useGerarDocumento*.ts` | 8 | 2.078 | 40 | frontend + dados, sem blocker | auto aprovado; DOCX/snapshots/visual pendente |
| O2 | feito | `ses_07b43bc19ffegfPoeTDAuisWOV` | `PessoaModal.tsx/test`; `qualificacao-das-partes/pessoa/**`; `pessoaModal*.ts` | 13 | 1.241 | 186 | frontend + dados, sem blocker | auto aprovado; backend/visual pendente |
| O3 | feito | `ses_07b43bc0fffeMkqR0Doc5P4btv` | `BemModal/MatriculaModal.tsx/test`; `bem/**`; `matricula/**`; `impedimentos/**`; `titularidade/**`; `diagnosticoPatrimonialModal*.ts` | 11 | 862 + 1.297 | 87 + 103 | frontend + dados, sem blocker | auto aprovado; backend/visual pendente |
| F1 | feito | `ses_07b43bc03ffeB4DnRPo7Rqwcc0` | `FiscalProjetosCadastro.tsx/test`; `projetos-cadastro/**`; `projetosCadastro*.ts`; `useProjetosCadastro*.ts` | 8 | 1.555 | 11 | frontend + dados, sem blocker | auto aprovado; Tax/OSG visual pendente |
| F2 | feito | `ses_07b43bbf8ffeWjkENnEPyL0abq` | `ApuracaoPisCofins.tsx/test`; `pis-cofins/**`; `pisCofinsPresentation*.ts`; `useApuracaoPisCofins*.ts` | 10 | 1.456 | 19 | frontend + dados, sem blocker | auto aprovado; visual pendente |
| F3 | feito | `ses_07b43bbeeffeLXajESD2lZAnmA` | `ConsultaXMLs/ExportDialog.tsx/test`; `consulta-xmls/**`; `export-dialog/**`; hooks/libs/tipo exclusivos | 10 | 1.210 + 899 | 86 + 111 | frontend + dados, sem blocker | auto aprovado; downloads/perfis/visual pendente |
| F4 | feito | `ses_07b43bbe3ffeTFzDSTM452wTEv` | `ConsultaEFDICMS/EFDExportDialog.tsx/test`; `consulta-efd-icms/**`; `efd-export/**`; hooks/libs exclusivos | 19 | 991 + 891 | 81 + 154 | frontend + dados, sem blocker | auto aprovado; polling/streaming real pendente |
| F5 | feito | `ses_07b43bbd9ffeykV9tb06xElnpY` | `FiscalDashboard.tsx/test`; `area-dashboard/**`; `areaDashboard*.ts`; `useAreaDashboard*.ts` | 8 | 811 | 11 | frontend + dados, sem blocker | auto aprovado; Tax/OSG visual pendente |

## Reviews e correcoes

- Foram executados 17 frontend reviews independentes.
- O executor especializado `data-reviewer` falhou antes da analise porque estava configurado para o modelo indisponivel `gpt-5.6-sol-pro`. As 14 revisoes obrigatorias foram repetidas por revisores gerais independentes com o mesmo checklist de dados.
- O executor `final-reviewer` apresentou a mesma indisponibilidade. A aprovacao final completa foi executada por um revisor geral independente, que aprovou explicitamente a Fase 3 sem findings bloqueantes.
- Findings corrigidos pelos owners originais: M1, M2, P1, O3, F2, F3 e F4.
- Os mesmos revisores confirmaram o fechamento. Nao restam findings bloqueantes da refatoracao.
- O review de P1 reencontrou gaps preexistentes em tenancy, auditoria, limpeza de anexos, importacao e realtime no hook congelado `useDomainEquipeSprintDetalhes.ts`. Nao houve diff nesse hook e os gaps permanecem fora desta fase.

## Verify pendente

- M1: arquivos HTML/PDF reais e falha terminal da captura. A rejeicao nao tratada foi preservada como no `HEAD`; automatiza-la alteraria a semantica.
- M2/M3/M4: DnD real, snapshots standalone, Sankey, drill-down, tooltips e responsividade.
- P1/P2/P3: realtime real, importacao/exportacao de arquivos, dialogs, dirty close e responsividade.
- P4/P5: RLS/permissoes reais, SLA na virada do dia, rankings e navegacao.
- O1: documento vivo/congelado, snapshots antigos, versoes e DOCX real.
- O2/O3: create/edit, dirty close, tabs e CRUDs imediatos com backend real.
- F1/F5: contextos Tax/OSG e deep-links em navegador autenticado.
- F2: comparacao visual das cinco abas com fixtures fiscais conhecidas.
- F3/F4: downloads reais, perfis, cache hit, polling e streaming contra API.
- Todas as unidades: responsividade desktop/mobile, foco, teclado e leitura por tecnologia assistiva.

## Excecao serial

- `src/test/setup.ts` recebeu uma correcao minima de infraestrutura: o polyfill de Web Storage agora e instalado antes dos imports dos modulos de teste. Sem isso, dois testes preexistentes capturavam o `localStorage` quebrado do Node e a suite global encerrava com rejeicoes Supabase. Nao ha impacto em producao.

## Escopo preservado

- Itens funcionais da secao 14 do plano-fonte nao foram misturados a esta refatoracao.
- `.opencode/` e `docs/planos/plano-refatoracao-god-components-fase-3.md` ja estavam nao rastreados no inicio e nao foram alterados por workers.
- Nenhum commit, push ou PR foi criado.
