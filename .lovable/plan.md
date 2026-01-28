
# Plano: Implementar Agregacao de Produtos na Tabela DIFAL

## Problema Atual

A tabela mostra itens individuais duplicados:
- ETANOL HIDRATADO (Cod: 1004) aparece 2x com valores diferentes
- OLEO DIESEL BS 500 (Cod: 36390) aparece multiplas vezes
- Coluna "Valor" ainda presente

## Alteracoes Necessarias

### 1. Criar Novo Tipo `DifalGroupedItem` em `src/types/difal.ts`

Adicionar interface para representar grupos de produtos:

```typescript
export interface DifalGroupedItem {
  groupKey: string;           // "nome|codigo|ncm"
  xProd: string;
  cod_produto: string;
  cod_ncm: string;
  id_contribuinte: string;
  
  // Dados do primeiro item (para exibicao na tabela)
  uf_emit: string;
  cst_icms: string | null;
  aliq_icms: number | null;
  
  // Agregacoes (para o modal)
  count: number;
  totalValue: number;
  nfesCount: number;
  items: DifalItem[];
  
  // Status
  status: 'validado' | 'pendente';
  classificacao?: ClassificacaoExistente | null;
}
```

---

### 2. Modificar `src/pages/equipe/dev/AuditoriaFiscal.tsx`

#### 2.1 Adicionar funcao de agregacao (apos linha ~316)

```typescript
// Agrupar itens por nome + codigo + NCM
const groupItems = (items: DifalItem[]): DifalGroupedItem[] => {
  const groups = new Map<string, DifalItem[]>();
  
  items.forEach(item => {
    const key = `${item.xProd}|${item.cod_produto}|${item.cod_ncm}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });
  
  return Array.from(groups.entries()).map(([key, groupItems]) => {
    const first = groupItems[0];
    const uniqueNFes = new Set(groupItems.map(i => i.chave_nfe));
    
    return {
      groupKey: key,
      xProd: first.xProd,
      cod_produto: first.cod_produto,
      cod_ncm: first.cod_ncm,
      id_contribuinte: first.id_contribuinte,
      uf_emit: first.uf_emit,
      cst_icms: first.cst_icms,
      aliq_icms: first.aliq_icms,
      count: groupItems.length,
      totalValue: groupItems.reduce((sum, i) => sum + i.vProd, 0),
      nfesCount: uniqueNFes.size,
      items: groupItems,
      status: 'pendente' as const,
      classificacao: null,
    };
  });
};
```

#### 2.2 Substituir `itemsWithStatus` por `groupedItems` (linhas 351-376)

Trocar logica para agrupar e depois aplicar status:

```typescript
const groupedItems = useMemo(() => {
  const grouped = groupItems(flatItems);
  
  return grouped.map((group) => {
    const classifChave = `${group.id_contribuinte}|${group.cod_produto}|${group.cod_ncm}`;
    const classificacao = classificacoes?.[classifChave];
    
    // Verificar decisoes locais em qualquer item do grupo
    const isLocallyDecided = group.items.some(item => {
      const chave = `${item.id_contribuinte}|${item.cod_produto}|${item.cod_ncm}`;
      return localDecisions.has(chave);
    });
    
    return {
      ...group,
      status: (isLocallyDecided || classificacao) ? 'validado' : 'pendente',
      classificacao,
    };
  });
}, [flatItems, classificacoes, localDecisions]);
```

#### 2.3 Atualizar estado do item selecionado (linha 125)

Trocar tipo de `DifalItem` para `DifalGroupedItem`:

```typescript
const [selectedItem, setSelectedItem] = useState<DifalGroupedItem | null>(null);
```

#### 2.4 Atualizar handler de clique (funcao handleItemClick)

Receber grupo ao inves de item individual:

```typescript
const handleItemClick = (group: DifalGroupedItem) => {
  if (group.status === 'pendente') {
    setSelectedItem(group);
    setModalOpen(true);
  }
};
```

#### 2.5 Atualizar handleDecisionSaved (linhas ~580-590)

Marcar TODOS os itens do grupo como decididos:

```typescript
const handleDecisionSaved = (group: DifalGroupedItem) => {
  setPendingDecisionsCount(prev => prev + 1);
  
  setLocalDecisions(prev => {
    const newSet = new Set(prev);
    group.items.forEach(item => {
      newSet.add(`${item.id_contribuinte}|${item.cod_produto}|${item.cod_ncm}`);
    });
    return newSet;
  });
};
```

#### 2.6 Atualizar estatisticas (useMemo stats)

Usar `groupedItems` ao inves de `itemsWithStatus`:

```typescript
const stats = useMemo(() => {
  const validados = groupedItems.filter((g) => g.status === 'validado').length;
  const pendentes = groupedItems.filter((g) => g.status === 'pendente').length;
  return { total: groupedItems.length, validados, pendentes };
}, [groupedItems]);
```

#### 2.7 Atualizar paginacao

Usar `groupedItems`:

```typescript
const totalPages = Math.ceil(groupedItems.length / ITEMS_PER_PAGE);

const paginatedItems = useMemo(() => {
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  return groupedItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
}, [groupedItems, currentPage]);
```

#### 2.8 REMOVER coluna Valor da tabela (linhas 921-930)

De:
```typescript
<TableHead className="w-[120px] text-right">Valor</TableHead>
<TableHead className="w-[150px]">Tributação Entrada</TableHead>
```

Para:
```typescript
<TableHead className="w-[150px]">Tributação</TableHead>
```

#### 2.9 REMOVER celula Valor das linhas (linhas 970-972)

Remover completamente:
```typescript
<TableCell className="text-right font-medium">
  {formatCurrency(item.vProd)}
</TableCell>
```

#### 2.10 Atualizar key das linhas (linha 935)

Usar groupKey ao inves de chave_nfe:

```typescript
<TableRow key={group.groupKey}>
```

---

### 3. Atualizar `DifalAuditModal.tsx`

#### 3.1 Alterar props para receber grupo

```typescript
interface DifalAuditModalProps {
  group: DifalGroupedItem | null;  // Antes: item: DifalItem | null
  onDecisionSaved: (group: DifalGroupedItem) => void;
  // ... resto igual
}
```

#### 3.2 Adicionar secao de resumo na coluna esquerda

Apos os dados do produto, adicionar:

```typescript
{/* Resumo do Grupo */}
<div className="pt-4 border-t border-slate-100">
  <span className="text-xs text-slate-500 uppercase font-medium">
    Resumo do Grupo
  </span>
  <div className="grid grid-cols-3 gap-4 mt-3">
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-2xl font-bold">{group.count}</p>
      <p className="text-xs text-slate-500">Itens</p>
    </div>
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-2xl font-bold">{group.nfesCount}</p>
      <p className="text-xs text-slate-500">NFes</p>
    </div>
    <div className="bg-slate-50 rounded-lg p-3 text-center">
      <p className="text-lg font-bold">{formatCurrency(group.totalValue)}</p>
      <p className="text-xs text-slate-500">Valor Total</p>
    </div>
  </div>
</div>
```

---

## Resultado Visual Esperado

### Tabela (agrupada, sem Valor):

```
| Status   | Item              | NCM      | Origem | Tributação    | MVA/ST |
|----------|-------------------|----------|--------|---------------|--------|
| Pendente | ETANOL HIDRATADO  | 22071010 | MT     | CST: 41       | —      |
|          | Cod: 1004         |          |        |               |        |
| Pendente | OLEO DIESEL BS500 | 27101921 | MT     | CST: 41       | —      |
|          | Cod: 36390        |          |        |               |        |
```

- ETANOL HIDRATADO: 1 linha (antes eram 2)
- OLEO DIESEL: 1 linha (antes eram multiplas)
- Coluna Valor: Removida

### Modal (com resumo):

```
┌─────────────────────┬───────────────────────────────────────────┐
│ DADOS DO PRODUTO    │ REGRAS DISPONIVEIS                        │
│ (30%)               │ (70%)                                     │
│                     │                                           │
│ Produto: ETANOL...  │ [Regra 1] [Regra 2] ...                   │
│ Codigo: 1004        │                                           │
│ NCM: 22071010       │                                           │
│                     │                                           │
│ RESUMO DO GRUPO     │                                           │
│ ┌─────┬─────┬─────┐ │                                           │
│ │ 2   │ 2   │R$64 │ │                                           │
│ │Itens│NFes │Total│ │                                           │
│ └─────┴─────┴─────┘ │                                           │
└─────────────────────┴───────────────────────────────────────────┘
```

---

## Ordem de Implementacao

1. **Tipos** (`difal.ts`): Adicionar `DifalGroupedItem`
2. **Modal** (`DifalAuditModal.tsx`): Alterar props e adicionar resumo
3. **Pagina** (`AuditoriaFiscal.tsx`):
   - Funcao `groupItems`
   - Substituir `itemsWithStatus` por `groupedItems`
   - Atualizar handlers, stats, paginacao
   - Remover coluna Valor da tabela
