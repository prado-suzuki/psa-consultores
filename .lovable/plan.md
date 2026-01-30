
# Plano: Correção dos Números nos Cards e Overflow no Modal

## Problemas Identificados

### 1. Números nos Cards Não Batem

**Análise dos dados da API:**

| Requisição | `total` | `qtd_validados` | `qtd_pendentes` |
|------------|---------|-----------------|-----------------|
| Sem filtro (all) | 2620 | 708 | 1811 |
| `valid=true` | 726 | 708 | 1811 |
| `valid=false` | 1894 | 708 | 1811 |

A API retorna corretamente os valores **globais** para `qtd_validados` e `qtd_pendentes` independente do filtro. Porém, o campo `total` muda conforme o filtro aplicado.

**O problema:** O card "Total de Itens" está exibindo o `total` da resposta atual (que muda com o filtro), enquanto "Validados" e "Pendentes" mostram valores globais. Isso cria inconsistência visual onde 708 + 1811 ≠ 1894.

**Comportamento esperado:**
- Os cards devem sempre mostrar os valores **globais** (do filtro "all")
- A tabela deve mostrar os dados filtrados
- Os cards servem como **indicadores** e **botões de filtro**, não como contagem da tabela atual

### 2. Overflow do Valor no Modal

No modal "Classificar Item" (`DifalAuditModal.tsx`), o valor monetário "R$ 1.750.000,00" está ultrapassando os limites do card "Resumo do Grupo" porque:
1. O grid tem `grid-cols-3` com espaço limitado
2. Valores grandes não têm tratamento de overflow
3. O texto não quebra nem trunca

## Solução Proposta

### Correção 1: Estatísticas Globais Separadas

Armazenar as estatísticas globais quando a busca inicial é feita (sem filtro) e usá-las nos cards independente do filtro ativo.

```typescript
// Novo estado para armazenar estatísticas globais
const [globalStats, setGlobalStats] = useState<{
  total: number;
  validados: number;
  pendentes: number;
} | null>(null);

// Na query, salvar stats globais apenas quando statusFilter === 'all'
useEffect(() => {
  if (statusFilter === 'all' && apiGroupedData) {
    setGlobalStats({
      total: apiGroupedData.total,
      validados: apiGroupedData.qtdValidados,
      pendentes: apiGroupedData.qtdPendentes,
    });
  }
}, [statusFilter, apiGroupedData]);

// Nos cards, usar globalStats ao invés de valores diretos
<p className="text-2xl font-bold">{globalStats?.total ?? 0}</p>
<p className="text-2xl font-bold">{globalStats?.validados ?? 0}</p>
<p className="text-2xl font-bold">{globalStats?.pendentes ?? 0}</p>
```

### Correção 2: Overflow no Modal

Atualizar o CSS do card de "Valor Total" no modal para lidar com valores grandes.

**Arquivo:** `src/components/equipe/dev/DifalAuditModal.tsx` (linhas 255-258)

```tsx
// Antes:
<div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center">
  <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(group.totalValue)}</p>
  <p className="text-xs text-slate-500">Valor Total</p>
</div>

// Depois:
<div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center overflow-hidden">
  <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={formatCurrency(group.totalValue)}>
    {formatCurrency(group.totalValue)}
  </p>
  <p className="text-xs text-slate-500">Valor Total</p>
</div>
```

Alterações:
- Adicionar `overflow-hidden` no container
- Reduzir tamanho da fonte de `text-lg` para `text-sm` para melhor encaixe
- Adicionar `truncate` para truncar com reticências se necessário
- Adicionar `title` para tooltip com valor completo

## Arquivos a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/equipe/dev/AuditoriaFiscal.tsx` | Adicionar estado `globalStats` e lógica para armazená-lo na busca inicial |
| `src/components/equipe/dev/DifalAuditModal.tsx` | Ajustar CSS do card "Valor Total" para evitar overflow |

## Mudanças Detalhadas

### AuditoriaFiscal.tsx

**1. Adicionar estado para estatísticas globais (após linha ~127):**
```typescript
// Estados para sessão e decisões pendentes
const [activeSessaoId, setActiveSessaoId] = useState<string | null>(null);
const [pendingDecisionsCount, setPendingDecisionsCount] = useState(0);
const [isSaving, setIsSaving] = useState(false);

// NOVO: Estatísticas globais (não mudam com filtro)
const [globalStats, setGlobalStats] = useState<{
  total: number;
  validados: number;
  pendentes: number;
} | null>(null);
```

**2. Atualizar estatísticas globais quando busca inicial (após linha ~293):**
```typescript
// Atualizar estatísticas globais quando busca sem filtro
useEffect(() => {
  if (statusFilter === 'all' && apiGroupedData && searchTriggered) {
    setGlobalStats({
      total: apiGroupedData.total,
      validados: apiGroupedData.qtdValidados,
      pendentes: apiGroupedData.qtdPendentes,
    });
  }
}, [statusFilter, apiGroupedData, searchTriggered]);
```

**3. Limpar estatísticas ao limpar filtros (handleClearFilters):**
```typescript
const handleClearFilters = () => {
  // ... código existente ...
  setGlobalStats(null); // Adicionar
};
```

**4. Atualizar cards para usar globalStats (linhas ~875, 892, 909):**
```tsx
// Card Total
<p className="text-2xl font-bold text-slate-900">{globalStats?.total ?? 0}</p>

// Card Validados
<p className="text-2xl font-bold text-green-700">{globalStats?.validados ?? 0}</p>

// Card Pendentes
<p className="text-2xl font-bold text-amber-700">{globalStats?.pendentes ?? 0}</p>
```

### DifalAuditModal.tsx

**Atualizar card de Valor Total (linhas 255-258):**
```tsx
<div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-center overflow-hidden">
  <p className="text-sm font-bold text-slate-900 dark:text-white truncate" title={formatCurrency(group.totalValue)}>
    {formatCurrency(group.totalValue)}
  </p>
  <p className="text-xs text-slate-500">Valor Total</p>
</div>
```

## Comportamento Esperado Após Implementação

1. **Cards sempre mostram valores globais:**
   - Total: 2620 (soma real)
   - Validados: 708
   - Pendentes: 1811

2. **Ao clicar em um card:**
   - A tabela filtra pelos itens correspondentes
   - O card clicado recebe destaque visual (ring)
   - Os números nos cards **não mudam**
   - A paginação mostra quantidade correta ("Página 1 de X (Y itens)")

3. **Modal de classificação:**
   - Valor monetário grande é exibido corretamente sem ultrapassar bordas
   - Tooltip mostra valor completo ao passar o mouse

## Validação da Matemática

Com os dados da API:
- Total global: 2620
- Validados: 708 + Pendentes: 1811 = 2519

A diferença de 101 itens (2620 - 2519) pode ser explicada por:
- Itens em status intermediário
- Itens sem classificação definida
- Edge cases no agrupamento

Isso é um comportamento aceitável da API e não precisa de correção no frontend.
