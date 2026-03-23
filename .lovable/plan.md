

## Plano: Refatoração do módulo Auditoria Cruzada

### 1. Store Global com Context API

Zustand não está instalado no projeto. Usaremos React Context para evitar dependência extra.

**Novo arquivo: `src/contexts/AuditoriaContext.tsx`** (~60 linhas)
- Context + Provider com estados: `clienteId`, `contribuinteId`, `dataInicio`, `dataFim`, `hasQueried`
- Funções: `setClienteId` (reseta contribuinte), `setContribuinteId`, `setDataInicio`, `setDataFim`, `setHasQueried`, `handleLimpar`
- Hook `useAuditoriaStore()` que consome o context

**Impacto em `AuditoriaCruzada.tsx`**:
- Envolve conteúdo com `<AuditoriaProvider>`
- Remove os 5 `useState` locais e funções `handleLimpar`/`handleClienteChange`
- Filtros e hooks consomem `useAuditoriaStore()`

**Impacto nos hooks** (`useBalanceteEfd`, `useEfdcIcms`, `useEfdcXml`):
- Mantêm a interface de params via props (não consomem context diretamente — hooks de dados devem ser puros)
- O context elimina prop drilling apenas nos componentes de abas que recebem `hasQueried` via props; agora consomem direto do context

**Impacto nos tabs** (`BalanceteEfdTab`, `EfdcIcmsTab`, `EfdcXmlTab`):
- Removem `hasQueried` das props — consomem via `useAuditoriaStore()`
- Props de dados (`itens`, `notas`, `lotes`, `isLoading`, `error`) permanecem, pois vêm do useQuery na página

### 2. Paginação Client-Side (40 itens/página)

**Novo componente: `src/components/equipe/dev/auditoria/TablePagination.tsx`** (~50 linhas)
- Props: `currentPage`, `totalPages`, `onPageChange`
- Renderiza: Primeira, Anterior, numeração com ellipsis, Próximo, Última
- Usa os componentes do `src/components/ui/pagination.tsx` já existente no projeto

**Impacto nos 3 componentes de aba**:
- Cada um adiciona estado `currentPage` (resetado quando dados/filtros mudam)
- Após filtrar, aplica `.slice(page * 40, (page + 1) * 40)` sobre os dados filtrados
- Exibe `<TablePagination>` abaixo da tabela com contagem de registros
- Na aba XMLs, a paginação conta lotes (linhas master), não CT-es individuais

### 3. Tratamento de Erros

**Nos 3 componentes de aba**:
- Adicionam prop `error?: Error | null`
- Se `error` presente e `hasQueried`, exibem card de estado de erro com mensagem amigável + botão "Tentar novamente" (opcional)
- Disparam `toast.error('Falha ao carregar os dados. Tente novamente.')` via `sonner` (já importado no projeto) usando `useEffect` ao detectar `error`

**Em `AuditoriaCruzada.tsx`**:
- Passa `error={query.error as Error | null}` para cada tab component

### Resumo de arquivos

| Arquivo | Ação | Descrição |
|---|---|---|
| `src/contexts/AuditoriaContext.tsx` | Novo | Context + Provider + hook `useAuditoriaStore` |
| `src/components/equipe/dev/auditoria/TablePagination.tsx` | Novo | Componente de paginação reutilizável (40/página) |
| `src/pages/equipe/dev/AuditoriaCruzada.tsx` | Editar | Wrappa com Provider, remove useState locais, passa `error` |
| `src/components/equipe/dev/auditoria/BalanceteEfdTab.tsx` | Editar | Paginação + erro + consome context |
| `src/components/equipe/dev/auditoria/EfdcIcmsTab.tsx` | Editar | Paginação + erro + consome context |
| `src/components/equipe/dev/auditoria/EfdcXmlTab.tsx` | Editar | Paginação (por lote) + erro + consome context |

6 arquivos (2 novos + 4 editados), ~250 linhas de alteração.

