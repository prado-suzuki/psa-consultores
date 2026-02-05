
# Plano: Adicionar Filtros e Visao de Tabela no Impacto Digital

## Resumo

Adicionar ao componente `ImpactDashboard.tsx` uma barra de filtros interativa e uma nova visao de tabela detalhada com todas as melhorias implementadas.

---

## Novas Funcionalidades

### 1. Barra de Filtros

Adicionar filtros para refinar os dados exibidos:

```text
+-------------------------------------------------------------------------+
| Filtros                                                                 |
+-------------------------------------------------------------------------+
| Processo: [Todos         v]  Projeto: [Todos         v]                 |
| Responsavel: [Todos      v]  Area: [Todas           v]                  |
| [Limpar Filtros]                                                        |
+-------------------------------------------------------------------------+
```

**Filtros disponiveis:**
- **Processo**: Lista de processos com melhorias
- **Projeto**: P2 - Automacao SPED, P3 - Automacao Consultas, etc.
- **Responsavel**: Lista de membros da equipe (profiles)
- **Area de Atuacao**: Fiscal, Fixos, Transversal, Consultoria

### 2. Visao de Tabela com Melhorias Implementadas

Nova aba ou secao com tabela detalhada:

```text
+-------------------------------------------------------------------------+
| Melhorias Implementadas                                    [Cards|Tabela] |
+-------------------------------------------------------------------------+
| Processo      | Projeto    | Area      | ROI   | Economia  | Tempo     |
|---------------|------------|-----------|-------|-----------|-----------|
| Conciliacao   | P2 - Auto  | Fiscal    | 245%  | R$ 3.200  | 15h/mes   |
| Apuracao ICMS | P4 - PIS   | Fiscal    | 180%  | R$ 2.800  | 12h/mes   |
| Folha Pgto    | P6 - Dash  | Fixos     | 120%  | R$ 1.500  |  8h/mes   |
+-------------------------------------------------------------------------+
```

**Colunas da tabela:**
- Processo (nome)
- Projeto vinculado
- Area de atuacao
- ROI (%)
- Economia mensal (R$)
- Tempo economizado (h/mes)
- Responsavel pela avaliacao
- Data da melhoria

---

## Secao Tecnica

### Arquivo a Modificar

**src/components/equipe/ImpactDashboard.tsx**

### Novos Estados

```typescript
// Filtros
const [filters, setFilters] = useState({
  processId: '',
  projectId: '',
  responsibleId: '',
  area: ''
});

// Dados para filtros
const [processes, setProcesses] = useState<{id: string, name: string}[]>([]);
const [projects, setProjects] = useState<{id: string, name: string}[]>([]);
const [profiles, setProfiles] = useState<{id: string, first_name: string, last_name: string}[]>([]);
const areas = ['Fiscal', 'Fixos', 'Transversal', 'Consultoria'];

// Toggle de visualizacao
const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

// Dados completos das melhorias para tabela
const [allImprovements, setAllImprovements] = useState<ImprovementDetail[]>([]);
```

### Interface para Tabela

```typescript
interface ImprovementDetail {
  id: string;
  process_name: string;
  project_name: string | null;
  area: string | null;
  roi_percentage: number;
  cost_saved_monthly: number;
  time_saved_hours: number;
  evaluated_by_name: string | null;
  created_at: string;
}
```

### Busca de Dados para Filtros

```typescript
// Na funcao fetchImpactData()
const { data: processesData } = await supabase
  .from('processes')
  .select('id, name')
  .order('name');
setProcesses(processesData || []);

const { data: projectsData } = await supabase
  .from('projects')
  .select('id, name')
  .eq('status', 'active')
  .order('name');
setProjects(projectsData || []);

const { data: profilesData } = await supabase
  .from('profiles')
  .select('id, first_name, last_name')
  .order('first_name');
setProfiles(profilesData || []);
```

### Aplicacao de Filtros

```typescript
// Filtrar melhorias baseado nos filtros selecionados
const filteredImprovements = useMemo(() => {
  return allImprovements.filter(imp => {
    if (filters.processId && imp.process_id !== filters.processId) return false;
    if (filters.projectId && imp.project_id !== filters.projectId) return false;
    if (filters.responsibleId && imp.evaluated_by !== filters.responsibleId) return false;
    if (filters.area && imp.area !== filters.area) return false;
    return true;
  });
}, [allImprovements, filters]);
```

### Componente de Filtros

```tsx
<Card className="bg-white border-gray-200 mb-6">
  <CardContent className="pt-4">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-medium text-gray-700">Filtros</h3>
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={() => setFilters({processId: '', projectId: '', responsibleId: '', area: ''})}
      >
        <X className="h-4 w-4 mr-1" />
        Limpar
      </Button>
    </div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <Select value={filters.processId} onValueChange={(v) => setFilters({...filters, processId: v})}>
        <SelectTrigger><SelectValue placeholder="Processo" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos</SelectItem>
          {processes.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      
      <Select value={filters.projectId} onValueChange={(v) => setFilters({...filters, projectId: v})}>
        <SelectTrigger><SelectValue placeholder="Projeto" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos</SelectItem>
          {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
        </SelectContent>
      </Select>
      
      <Select value={filters.responsibleId} onValueChange={(v) => setFilters({...filters, responsibleId: v})}>
        <SelectTrigger><SelectValue placeholder="Responsavel" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todos</SelectItem>
          {profiles.map(p => (
            <SelectItem key={p.id} value={p.id}>
              {p.first_name} {p.last_name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select value={filters.area} onValueChange={(v) => setFilters({...filters, area: v})}>
        <SelectTrigger><SelectValue placeholder="Area" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="">Todas</SelectItem>
          {areas.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  </CardContent>
</Card>
```

### Componente de Tabela

```tsx
<Card className="bg-white border-gray-200">
  <CardHeader className="pb-2">
    <div className="flex items-center justify-between">
      <CardTitle className="text-gray-900 text-base font-medium">
        Melhorias Implementadas ({filteredImprovements.length})
      </CardTitle>
      <div className="flex items-center gap-2">
        <Button 
          variant={viewMode === 'cards' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('cards')}
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button 
          variant={viewMode === 'table' ? 'default' : 'outline'} 
          size="sm"
          onClick={() => setViewMode('table')}
        >
          <TableIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  </CardHeader>
  <CardContent>
    {viewMode === 'table' ? (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Processo</TableHead>
            <TableHead>Projeto</TableHead>
            <TableHead>Area</TableHead>
            <TableHead className="text-right">ROI</TableHead>
            <TableHead className="text-right">Economia/mes</TableHead>
            <TableHead className="text-right">Tempo/mes</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredImprovements.map((imp) => (
            <TableRow key={imp.id}>
              <TableCell className="font-medium">{imp.process_name}</TableCell>
              <TableCell>{imp.project_name || '-'}</TableCell>
              <TableCell>
                <Badge variant="outline">{imp.area || '-'}</Badge>
              </TableCell>
              <TableCell className="text-right text-green-600 font-semibold">
                {imp.roi_percentage?.toFixed(0)}%
              </TableCell>
              <TableCell className="text-right">
                R$ {imp.cost_saved_monthly?.toLocaleString('pt-BR')}
              </TableCell>
              <TableCell className="text-right">
                {imp.time_saved_hours?.toFixed(0)}h
              </TableCell>
              <TableCell className="text-sm text-gray-500">
                {new Date(imp.created_at).toLocaleDateString('pt-BR')}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    ) : (
      /* Manter visualizacao atual de cards */
    )}
  </CardContent>
</Card>
```

### Imports Adicionais

```typescript
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { X, LayoutGrid, Table as TableIcon } from 'lucide-react';
```

---

## Fluxo de Dados

```text
1. Ao carregar ImpactDashboard
   ↓
2. Busca processos, projetos, profiles para popular filtros
   ↓
3. Busca todas as melhorias com joins para process, project, evaluator
   ↓
4. Usuario seleciona filtros
   ↓
5. useMemo recalcula filteredImprovements
   ↓
6. Metricas e graficos atualizam com base nos dados filtrados
   ↓
7. Tabela exibe detalhes das melhorias filtradas
```

---

## Resumo das Alteracoes

| Componente | Alteracao |
|------------|-----------|
| `ImpactDashboard.tsx` | Adicionar barra de filtros (processo, projeto, responsavel, area) |
| `ImpactDashboard.tsx` | Adicionar toggle cards/tabela |
| `ImpactDashboard.tsx` | Adicionar tabela detalhada com melhorias |
| `ImpactDashboard.tsx` | Metricas atualizam com base nos filtros |

## Beneficios

1. **Analise detalhada**: Usuarios podem filtrar e analisar melhorias por diferentes dimensoes
2. **Visibilidade**: Tabela mostra todas as melhorias com dados consolidados
3. **Flexibilidade**: Toggle entre visualizacao de cards e tabela
4. **Rastreabilidade**: Dados de ROI, economia e tempo por melhoria individual
