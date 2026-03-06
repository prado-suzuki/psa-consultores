

# Auditoria de roteamento de tabelas por ambiente

## Ocorrências encontradas

| # | Arquivo | Tabela | Tipo | Linha |
|---|---------|--------|------|-------|
| 1 | `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | `cliente` | `.from()` | 242 |
| 2 | `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | `contribuinte` | `.from()` | 257 |
| 3 | `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | `cliente` | Join FK | 325 |
| 4 | `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx` | `contribuinte` | Join FK | 327 |
| 5 | `src/components/equipe/fiscal/tasks/TaskModal.tsx` | `cliente` | `.from()` | 119 |
| 6 | `src/components/equipe/fiscal/tasks/TaskModal.tsx` | `contribuinte` | `.from()` | 164 |
| 7 | `src/components/equipe/fiscal/tasks/TaskFilters.tsx` | `cliente` | `.from()` | 59 |
| 8 | `src/components/equipe/fiscal/tasks/TaskFilters.tsx` | `contribuinte` | `.from()` | 72 |
| 9 | `src/components/equipe/audit/AuditLogTable.tsx` | `cliente` | `.from()` | 96 |
| 10 | `src/components/equipe/audit/AuditLogTable.tsx` | `contribuinte` | `.from()` | 106 |
| 11 | `src/pages/equipe/EquipeProjetos.tsx` | `cliente` | `.from()` | 398 |
| 12 | `src/components/equipe/fiscal/FiscalClients.tsx` | `cliente` | `.from()` | Já roteado |

**Nota:** `FiscalClients.tsx` já faz o roteamento corretamente. Os demais 11 pontos precisam de correção.

---

## Plano de alterações por arquivo

### 1. `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`
- `isProductionEnvironment` já importado (linha 3)
- Adicionar `clienteTable` e `contribuinteTable` no início do componente
- **Linha 242**: `.from('cliente')` → `.from(clienteTable)`; queryKey incluir `clienteTable`
- **Linha 257**: `.from('contribuinte')` → `.from(contribuinteTable)`; queryKey incluir `contribuinteTable`
- **Linhas 325-327**: Remover joins `external_client:cliente!...` e `contribuinte:contribuinte!...` do select. Após obter os projetos, coletar IDs únicos e fazer 2 lookups separados via `clienteTable` / `contribuinteTable`. Montar maps `id→nome` e injetar nos objetos de projeto
- QueryKey da listagem: incluir `clienteTable, contribuinteTable`

### 2. `src/components/equipe/fiscal/tasks/TaskModal.tsx`
- Adicionar import de `isProductionEnvironment` de `@/config/api`
- Criar `clienteTable` e `contribuinteTable` no início do componente
- **Linha 119**: `.from('cliente')` → `.from(clienteTable)`; queryKey: `['clients-for-tasks', clienteTable]`
- **Linha 164**: `.from('contribuinte')` → `.from(contribuinteTable)`; queryKey: `['contribuintes-for-task', contribuinteTable, watchedClientId]`

### 3. `src/components/equipe/fiscal/tasks/TaskFilters.tsx`
- Adicionar import de `isProductionEnvironment`
- Criar `clienteTable` e `contribuinteTable`
- **Linha 59**: `.from('cliente')` → `.from(clienteTable)`; queryKey: `['clients-for-task-filters', clienteTable]`
- **Linha 72**: `.from('contribuinte')` → `.from(contribuinteTable)`; queryKey: `['contribuintes-for-task-filters', contribuinteTable, filters.clientId]`

### 4. `src/components/equipe/audit/AuditLogTable.tsx`
- Adicionar import de `isProductionEnvironment`
- Criar `clienteTable` e `contribuinteTable` dentro de `useLookupMaps`
- **Linha 96**: `.from('cliente')` → `.from(clienteTable)`; queryKey: `['audit-lookup-clients', clienteTable]`
- **Linha 106**: `.from('contribuinte')` → `.from(contribuinteTable)`; queryKey: `['audit-lookup-contribuintes', contribuinteTable]`

### 5. `src/pages/equipe/EquipeProjetos.tsx`
- Adicionar import de `isProductionEnvironment`
- Criar `clienteTable` dentro do componente
- **Linha 398**: `.from('cliente')` → `.from(clienteTable)`

---

## Resumo
- **5 arquivos** a alterar
- **11 queries** a corrigir (6 de `cliente`, 4 de `contribuinte`, 1 join duplo)
- **1 arquivo** já correto (`FiscalClients.tsx`)
- Nenhuma alteração de banco de dados

