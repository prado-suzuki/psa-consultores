# MAPA — Refator pra padrão Supabase nativo

**Status**: em execução
**Objetivo**: eliminar a camada de tradução (`dbMappers.ts`) que sobrou da herança SQLite/standalone do MAPA, unificando tipos em EN snake_case espelhando o DB. Resultado: MAPA vira uma feature como qualquer outra do PSA, sem ginástica.

---

## 1. Estado final desejado

### Tipos (`src/types.ts`)
- Interfaces refletem 1:1 as colunas do DB pós-migration EN.
- `Processo.nome` → `Processo.name`
- `Processo.descricao` → `Processo.description`
- `Processo.projetoId` → `Processo.project_id`
- `Processo.statusAvaliacao` → `Processo.evaluation_status`
- `Processo.horasTreinamento` → `Processo.training_hours`
- `Processo.mapeadoEm` → `Processo.mapped_at`
- `Processo.complexidade` → `Processo.complexity_level`
- `Processo.frequencia` → `Processo.frequency`
- `Processo.ordem` → `Processo.order_index`
- `Processo.entregavel` → `Processo.deliverable`
- (mesmo padrão pra `Projeto`, `Etapa`, `Responsavel`, `Melhoria`, `Gargalo`, `Sistema`, `Documento`, `ProcessSnapshot`)

### Mappers
- **`src/utils/mapa/dbMappers.ts`: DELETADO.**
- Cluster name continua via PostgREST relation `select=*, estrutura_clusters(name)`, mas o tipo passa a expor `cluster_id` (UUID) e um campo opcional `cluster` (string, name via JOIN) — sem função intermediária.

### Hooks
- `_createEntityHooks` perde `fromDb`/`toDb` (apenas `selectClause`).
- `useProjetos`, `useProcessos`, `useEtapas`, `useResponsaveis`, `useMelhorias`, `useGargalos`, `useSistemas`, `useDocumentos`, `useSnapshots`, `useEtapaToBe`, `useDominioListas` viram thin wrappers Supabase + React Query — sem mapeamento.

### Pages/Componentes
- Todo acesso `processo.nome` vira `process.name`. Idem pros demais campos.
- Forms (state shape, payload de save) usam EN snake_case.
- Filtros e agrupamentos comparam `process.cluster_id` (já era assim depois do último refator).

---

## 2. Invariantes — o que NÃO muda

- **Rotas**: `/equipe/digital/mapa/*` permanecem idênticas.
- **Layout das páginas**: JSX, classes CSS, componentes filhos (Modal, FormField, Select, etc.) intocados.
- **Comportamento do usuário**: criar, editar, excluir, filtrar, agrupar funcionam **exatamente** como antes do refator.
- **Schema do DB**: zero migration nova. Tudo o que muda é o lado TypeScript.
- **Outras áreas do PSA** (Daily, Sprints, Kanban, Tax, Digital Rotina): não tocadas.
- **Cluster strategy**: continua `cluster_id` (UUID) pra save/filter + `cluster` (name) pra display.

---

## 3. Validação visual (Lovable preview)

Marcar conforme você confirma:

- [ ] **Projetos** (`/equipe/digital/mapa`): mostra 17 cards (11 Rotina + 6 OSG). Card OSG mostra "Cluster: **PSA OSG**" (nome, não UUID).
- [ ] **Projetos — filtro cluster**: selecionar OSG → lista mostra só os 6 OSG.
- [ ] **Processos** (`/equipe/digital/mapa/processos`): mostra 60 cards. Cards OSG têm **nome visível** ("P1.01 Diagnóstico Patrimonial Inicial" etc.) e **descrição** (não "Sem descrição").
- [ ] **Melhorias** (`/equipe/digital/mapa/melhorias`): **abre sem crash** (nem `Cannot read properties of undefined (reading 'length')`).
- [ ] **Gargalos**: lista os 91 com nome e descrição.
- [ ] **Documentos**: lista os 120 com tipo/formato.
- [ ] **Sistemas**: lista os 16 com nome e custo.
- [ ] **Responsáveis**: lista cargos PSA + cargos OSG mapeados.
- [ ] **Mapear processo** (clica "Mapear" num card): abre tela, mostra abas Etapas/ROI/etc.
- [ ] **Cascata**: abre página sem crash.
- [ ] **Dashboard ROI**: abre sem crash, KPIs aparecem.
- [ ] **Evolução do Setor**: abre sem crash.
- [ ] **CRUD smoke**: criar 1 projeto novo, editar e deletar — funciona.

---

## 4. Critérios de pronto

- `bun run typecheck` — zero erros.
- `bun run build` — sucesso.
- 12 testes-âncora — todos verdes.
- Checklist visual acima — todos marcados.
- `src/utils/mapa/dbMappers.ts` — não existe mais.
- `grep -r "fromDb\|toDb" src/` — zero hits no MAPA.
