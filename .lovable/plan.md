

# Limpeza de roteamento _dev — plano de execução

## Regra
Frontend **sempre** acessa `'cliente'` e `'contribuinte'` (hardcoded). Tabelas `_dev` são exclusivas do BigQuery.

## Alterações por arquivo

### 1. `src/hooks/useTaxReferenceData.ts`
- **L3**: remover import de `isProductionEnvironment`
- **`useExternalClients`** (L142-168): remover `clienteTable`/`fallbackTable`, buscar direto de `'cliente'`. Remover lógica de fallback (L157-163). QueryKey: `['external-clients-tax', editingClientId]`
- **`useContribuintes`** (L172-202): remover `contribuinteTable`/`fallbackTable`, buscar direto de `'contribuinte'`. Remover fallback vazio (L189-196). QueryKey: `['contribuintes-for-project', clientId, editingContribuinteId]`

### 2. `src/components/equipe/fiscal/tasks/TaskModal.tsx`
- **L52**: remover import de `isProductionEnvironment`
- **L99-100**: remover `clienteTable`, `contribuinteTable`
- **L147**: remover `fallbackClienteTable`
- **Query `clients-for-tasks`** (L148-161): buscar só de `'cliente'`, query simples. QueryKey: `['clients-for-tasks']`
- **Query `contribuintes-for-task`** (L182-195): substituir `contribuinteTable` por `'contribuinte'`. QueryKey: `['contribuintes-for-task', watchedClientId]`

### 3. `src/components/equipe/fiscal/tasks/TaskFilters.tsx`
- **L27**: remover import de `isProductionEnvironment`
- **L55-56**: remover `clienteTable`, `contribuinteTable`
- **Query L58-68**: `'cliente'` hardcoded. QueryKey: `['clients-for-task-filters']`
- **Query L70-83**: `'contribuinte'` hardcoded. QueryKey: `['contribuintes-for-task-filters', filters.clientId]`

### 4. `src/components/equipe/audit/AuditLogTable.tsx`
- **L20**: remover import de `isProductionEnvironment`
- **L53-54**: remover `clienteTable`, `contribuinteTable`
- **Query L95-103**: `'cliente'` hardcoded. QueryKey: `['audit-lookup-clients']`
- **Query L105-114**: `'contribuinte'` hardcoded. QueryKey: `['audit-lookup-contribuintes']`

### 5. `src/pages/equipe/EquipeProjetos.tsx`
- **L5**: remover import de `isProductionEnvironment`
- **L397**: remover variável local `clienteTable`, usar `'cliente'` direto na query (L400)

### 6. `src/pages/equipe/fiscal/FiscalProjetosCadastro.tsx`
- Nenhuma alteração direta (consome via hooks já corrigidos acima).

## Verificação final
Após edições, buscar `cliente_dev` e `contribuinte_dev` no projeto inteiro para confirmar que não resta nenhuma referência no frontend.

## Escopo
- 5 arquivos editados, ~30 linhas removidas/simplificadas
- Sem migração de banco
- Sem alteração de lógica de negócio

