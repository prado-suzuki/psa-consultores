

## Plan: Refatoração PERDCOMP — Soft Delete, Renomeação `nr_per` e Modal Interativo

### Escopo
Refatoração exclusivamente no código da aplicação (TypeScript/React). Sem scripts SQL — a engenharia de dados fará as alterações de banco separadamente. A coluna `numero_processo_per` será renomeada para `nr_per` no banco; as colunas `excluido` (CHAR(1)) e `nr_cancelamento` (TEXT) já existirão nas tabelas `per` e `dcomp`.

---

### Etapa 1 — Modelagem e Interfaces

**Arquivos:** `src/lib/syncPerdcomp.ts`, `supabase/functions/sync-perdcomp/index.ts`, `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` (interface `PerData`), `src/components/equipe/dev/perdcomp/CargaPerdcompCSV.tsx` (interface `ParsedPer`), `src/hooks/useSelicDataPerPer.ts` (interface `PerInput`)

- Renomear **todas** as ocorrências de `numero_processo_per` para `nr_per` em interfaces, payloads, queries e referências inline (`item.numero_processo_per` → `item.nr_per`).
- Adicionar `excluido?: string` e `nr_cancelamento?: string` às interfaces `PerSync`, `DcompSync`, `PerData`, `PerRecord`, `DcompRecord`, `ParsedPer`, `ParsedDcomp`.
- Nota: o arquivo `types.ts` (auto-gerado) não será editado; os tipos inline nas queries usarão `as any` ou cast local com comentário justificativo até a regeneração.

**Arquivos impactados (renomeação `nr_per`):**
1. `ControlePerdcomp.tsx` — ~30 ocorrências (queries, maps, filters, renders)
2. `PerFormModal.tsx` — schema zod, form fields, mutations, sync payload
3. `PerDetailModal.tsx` — interface, queries, mutations, header render
4. `DcompFormModal.tsx` — queries de PER para select (`per.numero_processo_per`)
5. `SituacaoFormModal.tsx` — query de PERs para select
6. `CargaPerdcompCSV.tsx` — interfaces, parsing, upsert
7. `syncPerdcomp.ts` — interfaces PerSync
8. `sync-perdcomp/index.ts` — interface PerRecord
9. `useSelicDataPerPer.ts` — interface PerInput

---

### Etapa 2 — Novo Modal Interativo de Exclusão/Cancelamento

**Novo arquivo:** `src/components/equipe/dev/perdcomp/SoftDeleteModal.tsx`

Componente Dialog com:
- Prop `type: 'per' | 'dcomp'` e `identifier: string` (nr_per ou nr_documento)
- Duas opções via RadioGroup:
  - **Excluir** (`excluido = 'E'`) — descrição: "Para processos cadastrados equivocamente na ferramenta."
  - **Cancelar** (`excluido = 'C'`) — descrição: "Selecione para processos cancelados no PERDCOMP WEB."
- Input de texto condicional `nr_cancelamento` (visível apenas quando "Cancelar" selecionado, opcional)
- Botão de confirmar que dispara a mutation correspondente

---

### Etapa 3 — Botão de Exclusão de PER + Substituição do Delete DCOMP

**`ControlePerdcomp.tsx`:**
- Adicionar botão/ícone `Trash2` na coluna de ações da tabela de PER (ao lado do "Editar")
- Ao clicar, abrir `SoftDeleteModal` com `type='per'`
- Remover o `AlertDialog` de confirmação de exclusão de DCOMP existente; substituir pela abertura do `SoftDeleteModal` com `type='dcomp'`

**`PerDetailModal.tsx`:**
- Substituir o `AlertDialog` de exclusão de DCOMP pelo `SoftDeleteModal`
- Adicionar botão de exclusão de PER no header do modal (próximo ao botão de fechar)

---

### Etapa 4 — Mutations (Cascata e Soft Delete)

**`SoftDeleteModal.tsx` (mutations internas):**

**Mutation PER:**
1. `UPDATE per SET excluido = valor, nr_cancelamento = valor WHERE nr_per = identifier`
2. Cascata: `UPDATE dcomp SET excluido = valor, nr_cancelamento = (se 'C', mesmo nr_cancelamento) WHERE nr_per_orig = identifier AND (excluido IS NULL OR excluido = '')`
3. **NÃO** alterar `per_situacao`
4. **NÃO** reverter status de PER original se o retificador for cancelado
5. **NÃO** chamar `syncPerdcompToDW` (requisito explícito)
6. Invalidar queries: `perdcomp-per`, `perdcomp-dcomp`, `per-dcomps`, `per-detail`

**Mutation DCOMP:**
1. `UPDATE dcomp SET excluido = valor, nr_cancelamento = valor WHERE nr_documento = identifier`
2. Sem cascata
3. Invalidar queries: `perdcomp-dcomp`, `per-dcomps`, `dcomps-existentes`

---

### Etapa 5 — Limpeza das Listas de Situação (UI)

**`PerDetailModal.tsx` — `SITUACAO_OPTIONS`:**
- Remover: `{ value: 'Cancelado', label: 'Cancelado' }` e `{ value: 'Pedido de cancelamento deferido', label: 'Pedido de cancelamento deferido' }`

**`SituacaoFormModal.tsx` — `SITUACOES`:**
- Remover: `'Cancelado'`

**`ControlePerdcomp.tsx` — `PREDEFINED_SITUACOES`:**
- Remover: `'Cancelado'` e `'Pedido de cancelamento deferido'`

---

### Etapa 6 — Queries (Filtros de Soft Delete)

Todas as queries de leitura de `per` e `dcomp` devem adicionar filtro para excluir registros com `excluido = 'E'` ou `excluido = 'C'`. Implementação: `.or('excluido.is.null,excluido.eq.')` ou equivalente `.not('excluido', 'in', '("E","C")')`.

**Queries afetadas:**

| Arquivo | Query Key | Tabela |
|---|---|---|
| `ControlePerdcomp.tsx` | `perdcomp-per` | `per_with_contribuinte` |
| `ControlePerdcomp.tsx` | `per-situacoes` (fetch PER numbers) | `per` |
| `ControlePerdcomp.tsx` | `perdcomp-dcomp` | `dcomp` |
| `PerDetailModal.tsx` | `per-dcomps` | `dcomp` |
| `PerFormModal.tsx` | `pers-existentes` | `per` |
| `DcompFormModal.tsx` | `pers-for-dcomp` | `per` |
| `DcompFormModal.tsx` | `dcomps-existentes` | `dcomp` |
| `SituacaoFormModal.tsx` | `pers-for-situacao` | `per` |
| `CargaPerdcompCSV.tsx` | upsert de PER | `per` (sem filtro, mas manter atenção) |

Para selects e combos (PER disponíveis para DCOMP, PER para retificação, PER para situação), o filtro garante que registros soft-deleted não apareçam como opções.

Para cálculos de saldo e Selic, o filtro na query principal já garante que registros excluídos/cancelados não entram nos totalizadores.

---

### Etapa 7 — Ajustes na Edge Function `sync-perdcomp`

- Renomear `numero_processo_per` → `nr_per` na interface `PerRecord`
- Adicionar `excluido?: string` e `nr_cancelamento?: string` às interfaces (para compatibilidade futura, mesmo que o sync não seja chamado no soft delete)

---

### Resumo de Arquivos Modificados

| # | Arquivo | Alterações |
|---|---|---|
| 1 | `src/pages/equipe/dev/ControlePerdcomp.tsx` | Renomeação nr_per, filtros soft-delete, botão excluir PER, remoção AlertDialog DCOMP, limpeza situações |
| 2 | `src/components/equipe/dev/perdcomp/PerFormModal.tsx` | Renomeação nr_per, filtro soft-delete em queries |
| 3 | `src/components/equipe/dev/perdcomp/PerDetailModal.tsx` | Renomeação nr_per, filtro soft-delete, botão excluir PER, substituir AlertDialog DCOMP, limpeza situações |
| 4 | `src/components/equipe/dev/perdcomp/DcompFormModal.tsx` | Renomeação nr_per, filtro soft-delete em queries |
| 5 | `src/components/equipe/dev/perdcomp/SituacaoFormModal.tsx` | Renomeação nr_per, limpeza "Cancelado", filtro soft-delete |
| 6 | `src/components/equipe/dev/perdcomp/CargaPerdcompCSV.tsx` | Renomeação nr_per em interfaces e parsing |
| 7 | **NOVO** `src/components/equipe/dev/perdcomp/SoftDeleteModal.tsx` | Modal interativo Excluir/Cancelar com cascata |
| 8 | `src/lib/syncPerdcomp.ts` | Renomeação nr_per, campos excluido/nr_cancelamento nas interfaces |
| 9 | `supabase/functions/sync-perdcomp/index.ts` | Renomeação nr_per na interface PerRecord |
| 10 | `src/hooks/useSelicDataPerPer.ts` | Renomeação nr_per na interface PerInput |

