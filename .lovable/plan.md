
# Plano: Filtro por Status na Ferramenta DIFAL Inteligente

## Objetivo

Adicionar interatividade aos cards de estatísticas (Total, Validados, Pendentes) para que funcionem como filtros. Ao clicar em um card, a tabela deve recarregar usando o parâmetro `valid` da API.

## Comportamento Esperado

| Card Clicado | Parâmetro API | Resultado |
|--------------|---------------|-----------|
| **Total** | sem `valid` | Todos os itens (comportamento atual) |
| **Validados** | `valid=true` | Apenas itens já classificados |
| **Pendentes** | `valid=false` | Apenas itens pendentes de classificação |

## Mudanças Técnicas

### 1. Novo Estado para Filtro de Status

Adicionar estado para controlar qual filtro está ativo:

```typescript
// Tipos de filtro de status
type StatusFilter = 'all' | 'validated' | 'pending';

// Estado do filtro
const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
```

### 2. Atualizar Query da API

Modificar a URL da query para incluir o parâmetro `valid` quando necessário:

```typescript
// Linha ~258-280
const {
  data: apiGroupedData,
  isLoading: isLoadingItems,
} = useQuery({
  queryKey: ['difal-grouped-items', selectedContribuinte, dataInicio, dataFim, currentPage, statusFilter],
  queryFn: async () => {
    // Construir URL base
    let url = `${API_BASE_URL}/api/v1/query/contribuintes/${selectedContribuinte}/nfes/agrupado-item?data_inicio=${dataInicio}&data_fim=${dataFim}&tipo_mov=Entrada&page=${currentPage}&page_size=${ITEMS_PER_PAGE}`;
    
    // Adicionar filtro de validação se necessário
    if (statusFilter === 'validated') {
      url += '&valid=true';
    } else if (statusFilter === 'pending') {
      url += '&valid=false';
    }
    // statusFilter === 'all' não adiciona parâmetro (retorna todos)
    
    const response = await fetchWithAuth(url);
    // ...
  },
  enabled: searchTriggered && !!selectedContribuinte,
});
```

### 3. Cards de Estatísticas Clicáveis

Transformar os cards em elementos interativos com visual feedback:

```typescript
// Card Total (linhas ~843-854)
<Card 
  className={cn(
    "border-slate-200 cursor-pointer transition-all hover:shadow-md",
    statusFilter === 'all' && "ring-2 ring-primary ring-offset-2"
  )}
  onClick={() => handleStatusFilterChange('all')}
>
  ...
</Card>

// Card Validados (linhas ~855-865)
<Card 
  className={cn(
    "border-green-200 bg-green-50/50 cursor-pointer transition-all hover:shadow-md",
    statusFilter === 'validated' && "ring-2 ring-green-500 ring-offset-2"
  )}
  onClick={() => handleStatusFilterChange('validated')}
>
  ...
</Card>

// Card Pendentes (linhas ~866-876)
<Card 
  className={cn(
    "border-amber-200 bg-amber-50/50 cursor-pointer transition-all hover:shadow-md",
    statusFilter === 'pending' && "ring-2 ring-amber-500 ring-offset-2"
  )}
  onClick={() => handleStatusFilterChange('pending')}
>
  ...
</Card>
```

### 4. Handler para Mudança de Filtro

Criar função para tratar clique nos cards:

```typescript
const handleStatusFilterChange = (filter: StatusFilter) => {
  setStatusFilter(filter);
  setCurrentPage(1); // Resetar para primeira página ao mudar filtro
};
```

### 5. Resetar Filtro ao Limpar ou Nova Busca

Garantir que o filtro seja resetado em ações relevantes:

```typescript
// Em handleClearFilters (~443-451)
const handleClearFilters = () => {
  // ... código existente ...
  setStatusFilter('all'); // Adicionar
};

// Em handleSearch - ao mudar contribuinte/período
// O filtro pode manter-se ou resetar conforme preferência
```

## Estrutura Visual

```text
┌─────────────────────────────────────────────────────────────────────┐
│  FILTROS DE BUSCA                                                   │
│  [Cliente] [Contribuinte] [Data Início] [Data Fim]  [Buscar]       │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ○ Total          │  │   Validados      │  │   Pendentes      │
│ 150 itens        │  │   87 itens       │  │   63 itens       │
│ [SELECIONADO]    │  │                  │  │                  │
└──────────────────┘  └──────────────────┘  └──────────────────┘
        ↑                     ↑                     ↑
   Clique filtra         Clique filtra        Clique filtra
   por TODOS            por valid=true       por valid=false

┌─────────────────────────────────────────────────────────────────────┐
│ TABELA DE ITENS (filtrada conforme seleção)                        │
│ Status | Item | NCM | CFOP | Tributação | MVA/ST                   │
│ ...                                                                │
└─────────────────────────────────────────────────────────────────────┘
```

## Arquivo a Modificar

| Arquivo | Alterações |
|---------|------------|
| `src/pages/equipe/dev/AuditoriaFiscal.tsx` | Adicionar estado `statusFilter`, modificar query para incluir `valid`, tornar cards clicáveis |

## Considerações de UX

1. **Feedback Visual**: Card selecionado terá borda destacada (ring)
2. **Hover Effect**: Cards terão efeito de sombra ao passar o mouse
3. **Cursor Pointer**: Indicar que são clicáveis
4. **Reset de Página**: Ao trocar filtro, volta para página 1
5. **Carregamento por Padrão**: Ao buscar, carrega "Total" (todos os itens)
