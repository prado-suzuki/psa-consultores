

## Diagnóstico: Clientes duplicados nos filtros — falta filtro `.eq('ambiente', currentAmbiente)`

### Causa raiz
Queries à tabela `cliente` sem o filtro `.eq('ambiente', currentAmbiente)` retornam registros de ambos os ambientes (prod e dev), causando duplicatas visíveis nos dropdowns.

### Arquivos com problema (3 arquivos, 2 queries precisam de correção completa, 1 parcial)

**1. `src/components/equipe/fiscal/tasks/TaskFilters.tsx` (linha 58-63)**
- Query `clients-for-task-filters`: **falta `.eq('ambiente', currentAmbiente)`**
- Este é o filtro mostrado no screenshot do usuário
- Adicionar import de `currentAmbiente` e o filtro na query

**2. `src/pages/equipe/EquipeProjetos.tsx` (linha 398-402)**
- Função `fetchExternalClients`: **falta `.eq('ambiente', currentAmbiente)` e `.eq('excluido', false)`**
- Adicionar import de `currentAmbiente` e ambos os filtros

**3. `src/pages/equipe/dev/ConsultaEFDICMS.tsx` (linha 76-81)**
- Query `clientes-efd-icms`: **falta `.eq('excluido', false)`** (ambiente já está presente)
- Adicionar o filtro de excluido

### Arquivos já corretos (sem alteração necessária)
- `TaskModal.tsx` ✅
- `PerFormModal.tsx` ✅
- `useDevClients.ts` ✅
- `useFiscalClients.ts` ✅
- `ConsultaEFD.tsx` ✅
- `ConsultaECD.tsx` ✅
- `ConsultaXMLs.tsx` ✅
- `ApuracaoPisCofins.tsx` ✅
- `ControleBalancetes.tsx` ✅
- `ProcessoDifal.tsx` ✅
- `CalculadoraIbsCbs.tsx` ✅
- `AuditLogTable.tsx` ✅
- `GestaoClientes.tsx` ✅
- `FiscalDashboard.tsx` ✅
- `useOrgProjects.ts` — busca por IDs específicos, não lista dropdown, OK

### Alterações por arquivo

| Arquivo | Alteração |
|---------|-----------|
| `TaskFilters.tsx` | Importar `currentAmbiente`, adicionar `.eq('ambiente', currentAmbiente)` na query |
| `EquipeProjetos.tsx` | Importar `currentAmbiente`, adicionar `.eq('ambiente', currentAmbiente)` e `.eq('excluido', false)` |
| `ConsultaEFDICMS.tsx` | Adicionar `.eq('excluido', false)` na query de clientes |

