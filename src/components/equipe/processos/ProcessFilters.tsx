import { Filter, Layers, Search } from 'lucide-react';
import type { Cluster } from '@/hooks/useClusters';
import { SEM_CLUSTER } from '@/lib/clusterFilter';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const PROCESS_STAGES = [
  { value: 'discovery', label: 'Descoberta', color: 'bg-muted text-gray-700' },
  { value: 'mapping', label: 'Mapeamento', color: 'bg-blue-100 text-blue-700' },
  { value: 'analysis', label: 'Análise', color: 'bg-purple-100 text-purple-700' },
  { value: 'improvement', label: 'Melhoria', color: 'bg-orange-100 text-orange-700' },
  { value: 'automation', label: 'Automação', color: 'bg-teal-100 text-teal-700' },
  { value: 'completed', label: 'Concluído', color: 'bg-green-100 text-green-700' },
];

interface ProcessFiltersProps {
  searchTerm: string;
  stageFilter: string;
  clusterFilter: string;
  clusters: Cluster[];
  onSearchTermChange: (value: string) => void;
  onStageFilterChange: (value: string) => void;
  onClusterFilterChange: (value: string) => void;
}

export function ProcessFilters(props: ProcessFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 mb-6">
      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar processos..."
          value={props.searchTerm}
          onChange={(event) => props.onSearchTermChange(event.target.value)}
          className="pl-10"
        />
      </div>
      <Select
        value={props.clusterFilter === '' ? '__todos__' : props.clusterFilter}
        onValueChange={(value) => props.onClusterFilterChange(value === '__todos__' ? '' : value)}
      >
        <SelectTrigger className="w-[180px]">
          <Filter className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Cluster" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__todos__">Todos os clusters</SelectItem>
          <SelectItem value={SEM_CLUSTER}>— Sem cluster</SelectItem>
          {props.clusters
            .filter((cluster) => cluster.ativo)
            .map((cluster) => (
              <SelectItem key={cluster.id} value={cluster.id}>
                {cluster.nome}
              </SelectItem>
            ))}
        </SelectContent>
      </Select>
      <Select value={props.stageFilter} onValueChange={props.onStageFilterChange}>
        <SelectTrigger className="w-[180px]">
          <Layers className="h-4 w-4 mr-2" />
          <SelectValue placeholder="Fase" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Todas as Fases</SelectItem>
          {PROCESS_STAGES.map((stage) => (
            <SelectItem key={stage.value} value={stage.value}>
              {stage.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
