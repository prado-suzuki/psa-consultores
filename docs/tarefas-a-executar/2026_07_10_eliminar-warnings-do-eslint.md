# Roadmap — Eliminação de Warnings do ESLint

> Espelho de `mem://refactors/lint-warnings-roadmap` (memória do agente). Mantenha os dois sincronizados ao marcar progresso.

**Baseline (14/05/2026):** 791 warnings, 0 errors. CI verde.
- 700 `@typescript-eslint/no-explicit-any`
- 59  `react-hooks/exhaustive-deps`
- 25  `react-refresh/only-export-components`
- 4   `@typescript-eslint/no-unused-expressions`
- 2   `@typescript-eslint/ban-ts-comment`
- 1   `@typescript-eslint/no-require-imports`

**Princípios**
- 1 fase = 1 PR autônomo. Não misturar fases.
- Após cada fase: `bunx eslint .` e verificar contagem; smoke test da área afetada na preview.
- Nunca usar `as any` para "calar" o linter — tipar de verdade ou usar `unknown` + narrowing.
- Tipos de tabelas vêm de `Database['public']['Tables'][...]['Row']` (importar de `@/integrations/supabase/types`).

---

## Fase 0 — Quick wins (≤30 min) — [x]
Itens triviais que não geram impacto.

- [x] `@typescript-eslint/no-require-imports` (1) → `tailwind.config.ts`: trocar `require("tailwindcss-animate")` por `import animate from "tailwindcss-animate"` no topo.
- [x] `@typescript-eslint/ban-ts-comment` (2) → trocar `@ts-ignore` por `@ts-expect-error` com descrição.
- [x] `@typescript-eslint/no-unused-expressions` (4) → revisar 4 ocorrências; geralmente `cond && fn()` que vira `if (cond) fn()`.

**Resultado:** -7 warnings (791 → 784). ✅ Concluída em 14/05/2026.

---

## Fase 1 — `react-refresh/only-export-components` (25) — [x]
Arquivos `.tsx` que exportam um componente + utilitários (constants, helpers, contexts). O fast-refresh quebra quando o módulo exporta não-componentes junto.

**Padrão de fix:** mover não-componentes para arquivo irmão (`<Componente>.utils.ts` ou `<Componente>.context.ts`) e re-exportar.

- [x] Extraídos: variants UI (`badge`, `button`, `toggle`, `navigation-menu`), contexts (`sidebar.context`, `form.context`), utils de pickers, constants (`TablePagination`, `AUDITORIA_TOOLTIPS`, `SPED_TOOLTIPS`, `notasMetodologicas.constants`, `renderColumnLabel` em `pis-cofins` e `icms-saidas`).
- [x] `eslint-disable` justificado em 3 casos legítimos: `ui/sidebar.tsx` (shadcn), `contexts/AuditoriaContext.tsx` e `contexts/AuthContext.tsx` (hook + provider co-localizados).

**Resultado:** -25 warnings (784 → 763). ✅ Concluída em 15/05/2026.


---

## Fase 2 — `react-hooks/exhaustive-deps` (59) — [ ]
**Risco médio.** Cada caso precisa análise: a dep faltante é um bug latente ou intencional?

Atacar por arquivo (não por warning solto):

- [ ] `pages/gerencial/performance/PerformanceDashboard.tsx` (8)
- [ ] `pages/equipe/fiscal/FiscalProjetosCadastro.tsx` (5)
- [ ] `pages/equipe/EquipeSprintDetalhes.tsx` (3)
- [ ] `pages/equipe/fiscal/FiscalDashboard.tsx` (3)
- [ ] `components/equipe/NewClientModal.tsx` (2)
- [ ] `components/equipe/dev/icms-saidas/familias/FamiliaSaidaTab.tsx` (2)
- [ ] `components/equipe/fiscal/tasks/TaskFutureView.tsx` (2)
- [ ] `pages/equipe/board/BoardDashboard.tsx` (2)
- [ ] `pages/equipe/dev/ControlePerdcomp.tsx` (2)
- [ ] `pages/equipe/dev/MapaNCMPisCofins.tsx` (2)
- [ ] `pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` (2)
- [ ] Resto (1 cada): UsersTab, BoardFilterBar, CreateProcessModal, HorasAcumuladas, ImprovementHistoryModal, SOPConfigModal, EFDExportDialog, PerFormModal, SituacaoFormModal, CreateTicketDialog, useClientEditData, NovoChamado, EquipeBacklog, EquipeDaily, EquipeDashboard, EquipeProjetos, EquipeRotinas, EquipeSprints, EquipeTarefas.

**Regra:** se a dep é estável (setState, ref) → adicionar. Se é função recriada a cada render → envolver com `useCallback` na origem. Última opção: `// eslint-disable-next-line react-hooks/exhaustive-deps` com comentário justificando.

**Resultado esperado:** -59 warnings + possível bug fix.

---

## Fase 3 — `no-explicit-any`: hooks de cliente/CRUD (≈100) — [ ]
Bloco fortemente acoplado, vale tipar junto.

- [ ] `hooks/useSaveClientTransaction.ts` (51)
- [ ] `hooks/useClientEditData.ts` (32)
- [ ] `hooks/useClientFormOptions.ts` (7)
- [ ] `components/equipe/client-form/ContratosTab.tsx` (15)
- [ ] `components/equipe/client-form/ContribuintesTab.tsx` (10)
- [ ] `components/equipe/client-form/HistoricoTab.tsx` (7)

**Tática:** definir tipos consolidados em `src/types/clientForm.ts` (já existe). Usar `Database['public']['Tables']['cliente']['Row']`, etc., e compor.

---

## Fase 4 — `no-explicit-any`: PerDcomp/Dev (≈90) — [ ]
- [ ] `pages/equipe/dev/ControlePerdcomp.tsx` (29)
- [ ] `components/equipe/dev/perdcomp/PerDetailModal.tsx` (17)
- [ ] `components/equipe/dev/perdcomp/DcompFormModal.tsx` (14)
- [ ] `components/equipe/dev/perdcomp/PerFormModal.tsx` (10)
- [ ] `components/equipe/dev/perdcomp/SituacaoFormModal.tsx` (7)
- [ ] `components/equipe/dev/ExportDialog.tsx` (8)
- [ ] `components/equipe/dev/pis-cofins/NcmRegrasModal.tsx` (7)

**Tática:** criar `src/types/perdcomp.ts` consolidado (hoje os tipos vivem espalhados).

---

## Fase 5 — `no-explicit-any`: Desempenho/Performance/Board (≈110) — [ ]
- [ ] `hooks/useMinhaEvolucao.ts` (18)
- [ ] `hooks/useDecisoesData.ts` (16)
- [ ] `hooks/usePerformanceData.ts` (16)
- [ ] `hooks/useDesempenhoOverview.ts` (7)
- [ ] `pages/gerencial/performance/PerformanceDashboard.tsx` (15)
- [ ] `pages/gerencial/desempenho/MinhaEvolucao.tsx` (9)
- [ ] `pages/gerencial/desempenho/DesempenhoRelatorios.tsx` (8)
- [ ] `pages/gerencial/desempenho/DesempenhoVisaoGeral.tsx` (8)
- [ ] `pages/gerencial/desempenho/DesempenhoDecisoes.tsx` (7)
- [ ] `pages/equipe/board/BoardDashboard.tsx` (8)

---

## Fase 6 — `no-explicit-any`: Processos/Projetos/Procedimentos (≈80) — [ ]
- [ ] `hooks/useCategorias.ts` (17)
- [ ] `hooks/useProcedimentos.ts` (15)
- [ ] `hooks/useOrgProjects.ts` (11)
- [ ] `hooks/useProcessMapping.ts` (11)
- [ ] `hooks/useProcessScenarios.ts` (10)
- [ ] `pages/equipe/EquipeProcessos.tsx` (16)

---

## Fase 7 — `no-explicit-any`: Tickets/Sprints/Servicos (≈50) — [ ]
- [ ] `hooks/useTickets.ts` (13)
- [ ] `hooks/useTicketMutations.ts` (7)
- [ ] `hooks/useServicosContratados.ts` (7)
- [ ] `pages/equipe/EquipeSprintDetalhes.tsx` (12)
- [ ] `pages/equipe/fiscal/FiscalProjetosCadastro.tsx` (8)
- [ ] `lib/reportGenerator.ts` (7)

---

## Fase 8 — `no-explicit-any`: Edge Functions (≈30) — [ ]
Deno, sem tipos do Supabase. Tática: tipar payloads de input/output explicitamente; resposta da AI como `unknown` + parse com guard.

- [ ] `supabase/functions/analise-inteligente-sprints/index.ts` (19)
- [ ] `supabase/functions/gerar-recomendacoes-pessoas/index.ts` (9)
- [ ] Demais edge functions com any < 5 ocorrências.

---

## Fase 9 — `no-explicit-any`: cauda longa (≈240) — [ ]
Tudo restante (arquivos com 1–6 ocorrências). Atacar por diretório:

- [ ] `src/components/equipe/...` (varredura)
- [ ] `src/components/board/...`
- [ ] `src/components/dashboard/...`
- [ ] `src/hooks/...` restantes
- [ ] `src/pages/...` restantes
- [ ] `src/lib/...` restantes
- [ ] `src/contexts/...`

---

## Fase 10 — Endurecer regras — [ ]
Quando contagem global = 0:

- [ ] `eslint.config.js`: voltar `@typescript-eslint/no-explicit-any`, `ban-ts-comment`, `no-require-imports` para `error`.
- [ ] Adicionar `react-hooks/exhaustive-deps: "error"`.
- [ ] Considerar adicionar `@typescript-eslint/no-explicit-any` com `{ ignoreRestArgs: true }`.

---

## Como retomar

1. `bunx eslint . 2>&1 | tail -5` → contagem atual.
2. Achar a próxima fase com `[ ]`.
3. Depois de concluir, marcar `[x]` aqui **e** em `mem://refactors/lint-warnings-roadmap` (peça pro agente sincronizar).
