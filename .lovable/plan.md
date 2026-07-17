## OSG-BE-02 — adicionar `solicitado` e `nao_solicitado` ao checklist

### Passo 1 — Pré-voo
Rodar via `supabase--read_query`:
```sql
SELECT e.enumlabel FROM pg_type t JOIN pg_enum e ON e.enumtypid=t.oid
WHERE t.typname='osg_checklist_status' ORDER BY e.enumsortorder;
```
Esperado: 4 valores (`pendente`, `recebido`, `dispensado`, `nao_aplicavel`).

### Passo 2 — Migration (schema-only, aditivo)
Arquivo: `supabase/migrations/<ts>_osg_be_02_checklist_status_add_values.sql`
```sql
ALTER TYPE public.osg_checklist_status ADD VALUE IF NOT EXISTS 'solicitado' AFTER 'pendente';
ALTER TYPE public.osg_checklist_status ADD VALUE IF NOT EXISTS 'nao_solicitado' AFTER 'nao_aplicavel';
```
Ordem final esperada: `pendente, solicitado, recebido, dispensado, nao_aplicavel, nao_solicitado`.
Sem tocar em RLS, políticas, dados ou outras tabelas. `types.ts` é regenerado após aplicar.

### Passo 3 — Frontend

**`src/hooks/useOsgChecklist.ts`**
- L12: estender `ChecklistStatus` para `'pendente' | 'solicitado' | 'recebido' | 'dispensado' | 'nao_aplicavel' | 'nao_solicitado'` (tipo escrito à mão, mantido).
- L101-104 (`itemRecebido`): incluir `'nao_solicitado'` no ramo que retorna `false`, junto de `dispensado`/`nao_aplicavel`. `solicitado` cai no `return itemRecebido…` → como não tem arquivo, resulta em "aberto" (tratado pelo `efetivo`).

**`src/pages/equipe/osg/Relatorios.tsx`**
- L72: `StatusEfetivo` passa a incluir `'solicitado' | 'nao_solicitado'`.
- L73-77 (`efetivo`): antes do fallback, retornar diretamente `'solicitado'` e `'nao_solicitado'` quando `r.status` for esses valores.
- L181-190 (`totais`):
  - Contar `solicitados` (efetivo === 'solicitado') e `naoSolicitados` (efetivo === 'nao_solicitado') separados.
  - `pendentes` continua contando efetivo === 'pendente'.
  - **Base do progresso** = `recebidos + pendentes + solicitados` (solicitado conta como aberto). Excluir `dispensado`, `nao_aplicavel`, `nao_solicitado`.
  - `pct = base ? round(recebidos/base*100) : 0`.
  - Retornar também `solicitados` e `naoSolicitados` para o `ResumoStrip`.
- L266 (`pendN` do painel): contar itens com efetivo em `{'pendente','solicitado'}` (ambos são "aberto").
- L453-457 (Pill do `ItemRow`): render por efetivo:
  - `recebido` → `ok` "Recebido"
  - `pendente` → `pend` "Pendente"
  - `solicitado` → `info` "Solicitado"
  - `dispensado` → `neutral` "Dispensado"
  - `nao_aplicavel` → `neutral` "Não aplicável"
  - `nao_solicitado` → `neutral` "Não solicitado"
- L622-633 (`Pill`): adicionar tom `info: 'border-blue-200 bg-blue-50 text-blue-700'` no union `tone`.
- L589-620 (`ResumoStrip`): manter Pendentes + Recebidos e acrescentar uma linha compacta "N solicitados · M não solicitados" (não entra em "Pendentes"). "Solicitados" aparece como sub-info dentro do bloco Pendentes ou linha separada abaixo; **`nao_solicitado` sempre fora da base**.
- L458-476 (área de ações no `ItemRow`): substituir os botões `Dispensar/Reativar` por um `DropdownMenu` (shadcn) com opções manuais: `Pendente`, `Solicitado`, `Dispensado`, `Não aplicável`, `Não solicitado`. Cada item chama `setStatus.mutate({id, status})`. Manter botões `Vincular documento` (Link2) e `Remover item` (Trash2, só para `origem === 'manual'`).
  - Assinatura do `ItemRow` passa a receber `onSetStatus: (s: ChecklistStatus)=>void` no lugar de `onDispensar/onReativar`.
  - `renderPanel` (L293-297) passa `onSetStatus={(s)=>setStatus.mutate({id:it.id,status:s})}`.

### Passo 4 — GATE de validação
1. `SELECT enumlabel …` retorna 6 valores na ordem `pendente, solicitado, recebido, dispensado, nao_aplicavel, nao_solicitado`.
2. Em `/equipe/osg/work/relatorios`: dropdown por item permite marcar `Solicitado` e `Não solicitado`; Pills azul/cinza aparecem corretamente.
3. Ao marcar `solicitado`, item continua contando em "aberto" (pendN do painel sobe/mantém) e base do `pct` inclui ele; ao marcar `nao_solicitado`, o item sai da base do `pct` e do painel "pendentes", aparecendo somente na contagem própria do `ResumoStrip`.

### Fora de escopo
`FiscalReport.tsx`, tornar `ChecklistStatus` derivado do enum, RLS/policies, qualquer outra tabela.