

## Plan: Adicionar filtros Excel-style nas tabelas de Auditoria Cruzada

### Contexto

A `ApuracaoPisCofins` usa o componente `ColumnFilterDropdown` dentro da `ApuracaoDataTable` para oferecer filtro/ordenação por coluna estilo Excel. As duas tabelas flat da Auditoria Cruzada — **EfdcIcmsTab** e **EfdcXmlTab** — usam `<Table>` simples sem nenhum filtro por coluna. A **BalanceteEfdTab** usa `BalanceteTreeTable` (estrutura em árvore), onde o filtro por coluna não se aplica da mesma forma.

### Escopo

Adicionar `ColumnFilterDropdown` nos cabeçalhos das tabelas **EfdcIcmsTab** e **EfdcXmlTab**, com sort e filtro por valores únicos nas colunas relevantes.

### Alterações

**1. `src/components/equipe/dev/auditoria/EfdcIcmsTab.tsx`**

- Importar `ColumnFilterDropdown`
- Adicionar estado de `sortConfig` e `columnFilters` (mesmo padrão da `ApuracaoDataTable`)
- Extrair valores únicos de colunas filtráveis: CFOP EFD ICMS, CFOP EFD Contrib, Conta Contábil EFD ICMS, Conta Contábil EFD Contrib
- Aplicar filtros e ordenação sobre `filteredNotas` antes da paginação
- Colocar `ColumnFilterDropdown` ao lado de cada `<TableHead>` filtrável

Colunas filtráveis:
| Coluna | Chave | Valor extraído |
|---|---|---|
| CFOP (EFD ICMS) | `cfop_icms` | `nota.EFD_ICMS.CFOP.join(', ')` |
| Conta (EFD ICMS) | `cta_icms` | `nota.EFD_ICMS.COD_CTA.filter(Boolean).join(', ')` |
| CFOP (EFD Contrib) | `cfop_contrib` | `nota.EFD_CONTRIB.CFOP.join(', ')` |
| Conta (EFD Contrib) | `cta_contrib` | `nota.EFD_CONTRIB.COD_CTA.filter(Boolean).join(', ')` |

**2. `src/components/equipe/dev/auditoria/EfdcXmlTab.tsx`**

- Mesma abordagem: importar `ColumnFilterDropdown`, adicionar estado de sort/filter
- Colunas filtráveis:

| Coluna | Chave | Valor extraído |
|---|---|---|
| Emitente | `emitente` | `lote.NOME_EMIT` |
| CFOP | `cfop` | `lote.CFOP` |

**3. Fix do runtime error (TabC170.tsx)**

O erro `Cannot read properties of undefined (reading 'toLocaleString')` já está corrigido no código atual (`v ?? 0`). A próxima build resolverá.

### Resultado

- Cada coluna filtrável terá o ícone de funil no cabeçalho
- Clicar no funil abre dropdown com ordenação Asc/Desc e lista de checkboxes com valores únicos
- Filtros em cascata: valores disponíveis refletem filtros de outras colunas
- Paginação recalculada após aplicação dos filtros
- Padrão visual idêntico ao da ApuracaoPisCofins

