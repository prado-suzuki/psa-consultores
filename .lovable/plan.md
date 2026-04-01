

## Plan: Substituir expand/collapse por Modal de detalhes CT-e

### Arquivo: `src/components/equipe/dev/auditoria/EfdcXmlTab.tsx`

### O que sai
- Estado `expandedRows` e função `toggleRow`
- Coluna com ícone chevron (primeira coluna do header e das linhas)
- Linha expandida inline (`isExpanded && <TableRow>...</TableRow>`)
- Imports `ChevronRight`, `ChevronDown`

### O que entra

**1. Estado do modal**
```typescript
const [selectedLote, setSelectedLote] = useState<EfdcXmlLote | null>(null);
const [cteSearch, setCteSearch] = useState('');
```

**2. Clique na linha** abre o modal em vez de expandir:
```tsx
<TableRow className="cursor-pointer" onClick={() => setSelectedLote(lote)}>
```
Remove a primeira `<TableCell>` com chevron e o `<TableHead>` correspondente.

**3. Modal (Dialog)** renderizado no final do componente:
- `Dialog` controlado por `selectedLote !== null`
- Header: Emitente, CFOP, Data Lote, Intervalo (dados do lote selecionado)
- Resumo: Valor Lote | Soma CT-es | Diferença (com destaque vermelho se > 0.05)
- Campo de busca por chave CT-e (filtra `CHV_CTE` e `NR_CTE`)
- Tabela de CT-es filtrados: Chave CT-e, Número, Valor
- `DialogContent` com `max-w-2xl` e tabela com `max-h-[400px] overflow-y-auto`

**4. Imports**: Adicionar `Dialog, DialogContent, DialogHeader, DialogTitle`. Remover `ChevronRight, ChevronDown`.

**5. ColSpan**: Header passa de 8 para 7 colunas (sem coluna chevron).

### Nenhum outro arquivo afetado

