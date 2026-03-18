import { useState } from 'react';
import { Search, Filter, X, User, FolderKanban, Building2, UserCheck } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { 
  TaskFilters as TaskFiltersType,
  FiscalTaskStatus,
  FiscalTaskPriority,
} from '@/hooks/useFiscalTasks';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';


interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  teamMembers: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
}

const statusOptions: { value: FiscalTaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'waiting_client', label: 'Pendente Cliente' },
  { value: 'todo', label: 'A Fazer' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'review', label: 'Revisão' },
  { value: 'done', label: 'Concluído' },
];

const priorityOptions: { value: FiscalTaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];


export const TaskFilters = ({ filters, onFiltersChange, teamMembers, projects = [] }: TaskFiltersProps) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const { data: clients = [] } = useQuery({
    queryKey: ['clients-for-task-filters'],
    queryFn: async () => {
      const { data } = await supabase
        .from('cliente')
        .select('id, nome')
        .eq('ativo', true)
        .order('nome');
      return data || [];
    },
  });

  const { data: contribuintes = [] } = useQuery({
    queryKey: ['contribuintes-for-task-filters', filters.clientId],
    queryFn: async () => {
      if (!filters.clientId) return [];
      const { data } = await supabase
        .from('contribuinte')
        .select('id, nome_razao_social')
        .eq('cliente_id', filters.clientId)
        .eq('excluido', false)
        .order('nome_razao_social');
      return data || [];
    },
    enabled: !!filters.clientId,
  });

  const handleSearchChange = (value: string) => {
    onFiltersChange({ ...filters, search: value || undefined });
  };

  const handleAssignedToChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      assignedTo: value === 'all' ? undefined : value as 'mine' | string 
    });
  };

  const handleProjectChange = (value: string) => {
    onFiltersChange({ ...filters, projectId: value === 'all' ? undefined : value });
  };

  const handleClientChange = (value: string) => {
    onFiltersChange({ 
      ...filters, 
      clientId: value === 'all' ? undefined : value,
      contribuinteId: undefined,
    });
  };

  const handleContribuinteChange = (value: string) => {
    onFiltersChange({ ...filters, contribuinteId: value === 'all' ? undefined : value });
  };

  const toggleStatusFilter = (status: FiscalTaskStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status)
      ? current.filter(s => s !== status)
      : [...current, status];
    onFiltersChange({ ...filters, status: updated.length > 0 ? updated : undefined });
  };

  const togglePriorityFilter = (priority: FiscalTaskPriority) => {
    const current = filters.priority || [];
    const updated = current.includes(priority)
      ? current.filter(p => p !== priority)
      : [...current, priority];
    onFiltersChange({ ...filters, priority: updated.length > 0 ? updated : undefined });
  };


  const removeFilter = (type: keyof TaskFiltersType, value?: string) => {
    if (type === 'status' && value) {
      toggleStatusFilter(value as FiscalTaskStatus);
    } else if (type === 'priority' && value) {
      togglePriorityFilter(value as FiscalTaskPriority);
    } else if (type === 'clientId') {
      onFiltersChange({ ...filters, clientId: undefined, contribuinteId: undefined });
    } else {
      onFiltersChange({ ...filters, [type]: undefined });
    }
  };

  const activeFiltersCount = 
    (filters.status?.length || 0) + 
    (filters.priority?.length || 0) + 
    (filters.projectId ? 1 : 0) +
    (filters.clientId ? 1 : 0) +
    (filters.contribuinteId ? 1 : 0) +
    (filters.startDate ? 1 : 0) +
    (filters.endDate ? 1 : 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar tarefas..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select
          value={filters.assignedTo || 'all'}
          onValueChange={handleAssignedToChange}
        >
          <SelectTrigger className="w-48">
            <User className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="mine">Minhas</SelectItem>
            {teamMembers.map(member => (
              <SelectItem key={member.id} value={member.id}>
                {member.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.projectId || 'all'}
          onValueChange={handleProjectChange}
        >
          <SelectTrigger className="w-52">
            <FolderKanban className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Projeto" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os projetos</SelectItem>
            {projects.map(project => (
              <SelectItem key={project.id} value={project.id}>
                {project.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.clientId || 'all'}
          onValueChange={handleClientChange}
        >
          <SelectTrigger className="w-52">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Cliente" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map(client => (
              <SelectItem key={client.id} value={client.id}>
                {client.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.contribuinteId || 'all'}
          onValueChange={handleContribuinteChange}
          disabled={!filters.clientId}
        >
          <SelectTrigger className="w-52">
            <UserCheck className="h-4 w-4 mr-2" />
            <SelectValue placeholder={filters.clientId ? "Contribuinte" : "Selecione cliente"} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {contribuintes.map(c => (
              <SelectItem key={c.id} value={c.id}>
                {c.nome_razao_social}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={showAdvanced} onOpenChange={setShowAdvanced}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Filter className="h-4 w-4" />
              Filtros
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Status</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {statusOptions.map(option => (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`status-${option.value}`}
                        checked={filters.status?.includes(option.value)}
                        onCheckedChange={() => toggleStatusFilter(option.value)}
                      />
                      <Label htmlFor={`status-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium">Prioridade</Label>
                <div className="grid grid-cols-2 gap-2 mt-2">
                  {priorityOptions.map(option => (
                    <div key={option.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`priority-${option.value}`}
                        checked={filters.priority?.includes(option.value)}
                        onCheckedChange={() => togglePriorityFilter(option.value)}
                      />
                      <Label htmlFor={`priority-${option.value}`} className="text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Active filters badges */}
      {(filters.status?.length || filters.priority?.length || filters.projectId || filters.clientId || filters.contribuinteId) && (
        <div className="flex flex-wrap gap-2">
          {filters.status?.map(status => (
            <Badge key={status} variant="secondary" className="gap-1">
              {statusOptions.find(o => o.value === status)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('status', status)} 
              />
            </Badge>
          ))}
          {filters.priority?.map(priority => (
            <Badge key={priority} variant="secondary" className="gap-1">
              {priorityOptions.find(o => o.value === priority)?.label}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('priority', priority)} 
              />
            </Badge>
          ))}
          {filters.projectId && (
            <Badge variant="secondary" className="gap-1">
              {projects.find(p => p.id === filters.projectId)?.name || 'Projeto'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('projectId')} 
              />
            </Badge>
          )}
          {filters.clientId && (
            <Badge variant="secondary" className="gap-1">
              {clients.find(c => c.id === filters.clientId)?.nome || 'Cliente'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('clientId')} 
              />
            </Badge>
          )}
          {filters.contribuinteId && (
            <Badge variant="secondary" className="gap-1">
              {contribuintes.find(c => c.id === filters.contribuinteId)?.nome_razao_social || 'Contribuinte'}
              <X 
                className="h-3 w-3 cursor-pointer" 
                onClick={() => removeFilter('contribuinteId')} 
              />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
};