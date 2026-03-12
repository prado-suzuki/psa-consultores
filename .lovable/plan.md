

## Plano: Adicionar useAuditLog + substituir confirm() em 3 componentes

### 1. Expandir tipos do useAuditLog

O hook atual aceita apenas `area: 'tax' | 'osg'` e `entity_type: 'project' | 'task' | 'subtask'`. Precisa suportar os novos domínios:

**`src/hooks/useAuditLog.ts`**:
- `area`: adicionar `'estrutura'`, `'cadastros'`, `'dev'`
- `entity_type`: adicionar `'cluster'`, `'area'`, `'equipe'`, `'membro'`, `'lider'`, `'produto_segmento'`, `'servico'`, `'centro_custo'`, `'empresa'`, `'cliente'`, `'contribuinte'`, `'participante'`, `'ordem_servico'`

---

### 2. EstruturaManager.tsx (~724 linhas)

**Auditoria** — adicionar `logAction` em 10 operações CUD:
- `saveCluster` (create/update)
- `deleteCluster`
- `saveArea` (create/update)
- `deleteArea`
- `setAreaLider` (update)
- `saveEquipe` (create/update)
- `deleteEquipe`
- `addMembro` (create)
- `removeMembro` (delete)

**Substituir confirm()** — 3 ocorrências (linhas 236, 268, 312):
- Adicionar estado `deleteConfirm: { type, id, label }` + um `AlertDialog` no JSX
- `deleteCluster`, `deleteArea`, `deleteEquipe` passam a abrir o dialog em vez de chamar `confirm()`

---

### 3. CadastroCategorias.tsx (~601 linhas, 4 sub-tabs)

**Auditoria** — adicionar `logAction` nos `onSuccess` das mutations de cada tab:
- `ProdutoSegmentoTab`: save (create/update), remove, toggleActive
- `ServicosTab`: save (create/update), remove
- `CentroCustoTab`: save (create/update), remove, toggleActive
- `EmpresaFaturamentoTab`: save (create/update), remove, toggleActive

**Substituir confirm()** — 4 ocorrências (linhas 115, 261, 395, 533):
- Cada sub-tab ganha estado `deleteTarget` + `AlertDialog` no JSX

**Desafio**: o hook `useAuditLog` usa `useAuth` internamente, mas as sub-tabs são componentes internos. Solução: chamar `useAuditLog()` no componente-pai `CadastroCategorias` e passar `logAction` via props para cada tab. Alternativa mais simples: chamar `useAuditLog()` dentro de cada sub-tab (são componentes React válidos).

---

### 4. NewClientModal.tsx (~4338 linhas)

**Auditoria** — adicionar `logAction` na função `handleSave` (que já é centralizada):
- Log ao criar/editar cliente
- Log ao criar/editar contribuintes
- Log ao criar/editar participantes
- Log ao criar/editar ordens de serviço
- Log ao soft-delete (excluido=true) de contribuintes, participantes, OS

O `area` será `'dev'` para este componente.

Este componente já usa `AlertDialog` (importado na linha 9), então **não precisa substituir confirm()**.

---

### Resumo de alterações por arquivo

| Arquivo | Alterações |
|---|---|
| `useAuditLog.ts` | Expandir union types de `area` e `entity_type` |
| `EstruturaManager.tsx` | +import useAuditLog, +import AlertDialog, +logAction em 10 ops, +estado deleteConfirm, +AlertDialog JSX, -3x confirm() |
| `CadastroCategorias.tsx` | +import useAuditLog, +import AlertDialog, +logAction em ~12 ops, +estado deleteTarget por tab, +AlertDialog JSX, -4x confirm() |
| `NewClientModal.tsx` | +import useAuditLog, +logAction em handleSave (~8 pontos de log) |

Nenhuma alteração em banco, RLS ou outras tabelas.

