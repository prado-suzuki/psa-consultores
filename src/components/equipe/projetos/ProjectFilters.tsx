import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ProjectCluster } from '@/components/equipe/projetos/types';
import { SEM_CLUSTER } from '@/lib/clusterFilter';

interface ProjectFiltersProps {
  statusFilter: string;
  clusterFilter: string;
  clusters: ProjectCluster[];
  onStatusFilterChange: (value: string) => void;
  onClusterFilterChange: (value: string) => void;
}

export const ProjectFilters = ({
  statusFilter,
  clusterFilter,
  clusters,
  onStatusFilterChange,
  onClusterFilterChange,
}: ProjectFiltersProps) => (
  <div className="flex items-center gap-4 mb-6">
    <div className="flex items-center gap-2">
      <Filter className="h-4 w-4 text-gray-500" />
      <span className="text-sm text-gray-600">Filtros:</span>
    </div>
    <Select
      value={clusterFilter === '' ? '__todos__' : clusterFilter}
      onValueChange={(value) => onClusterFilterChange(value === '__todos__' ? '' : value)}
    >
      <SelectTrigger className="w-48">
        <SelectValue placeholder="Todos os clusters" />
      </SelectTrigger>
      <SelectContent className="border-gray-200">
        <SelectItem value="__todos__">Todos os clusters</SelectItem>
        <SelectItem value={SEM_CLUSTER}>— Sem cluster</SelectItem>
        {clusters
          .filter((cluster) => cluster.ativo)
          .map((cluster) => (
            <SelectItem key={cluster.id} value={cluster.id}>
              {cluster.nome}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
    <Select value={statusFilter} onValueChange={onStatusFilterChange}>
      <SelectTrigger className="w-40">
        <SelectValue placeholder="Todos status" />
      </SelectTrigger>
      <SelectContent className="border-gray-200">
        <SelectItem value="all">Todos status</SelectItem>
        <SelectItem value="active">Ativo</SelectItem>
        <SelectItem value="completed">Concluído</SelectItem>
        <SelectItem value="blocked">Bloqueado</SelectItem>
        <SelectItem value="archived">Arquivado</SelectItem>
      </SelectContent>
    </Select>
    {(statusFilter !== 'all' || clusterFilter !== '') && (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          onStatusFilterChange('all');
          onClusterFilterChange('');
        }}
        className="text-gray-500"
      >
        Limpar filtros
      </Button>
    )}
  </div>
);
