import { useState } from 'react';
import { Filter, FolderKanban, Search, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  type OrgTaskPriority,
  type OrgTaskStatus,
  type TaskFilters as TaskFiltersType,
} from '@/hooks/useOrgTasks';

interface TaskFiltersProps {
  filters: TaskFiltersType;
  onFiltersChange: (filters: TaskFiltersType) => void;
  teamMembers: { id: string; name: string }[];
  projects?: { id: string; name: string }[];
}

const statusOptions: { value: OrgTaskStatus; label: string }[] = [
  { value: 'backlog', label: 'Backlog' },
  { value: 'waiting_client', label: 'Pendente Cliente' },
  { value: 'todo', label: 'A Fazer' },
  { value: 'in_progress', label: 'Em Progresso' },
  { value: 'review', label: 'Revisão' },
  { value: 'em_ajuste', label: 'Em Ajuste' },
  { value: 'done', label: 'Concluído' },
];

const priorityOptions: { value: OrgTaskPriority; label: string }[] = [
  { value: 'urgent', label: 'Urgente' },
  { value: 'high', label: 'Alta' },
  { value: 'medium', label: 'Média' },
  { value: 'low', label: 'Baixa' },
];

export const TaskFilters = ({ filters, onFiltersChange, teamMembers, projects = [] }: TaskFiltersProps) => {
  const [open, setOpen] = useState(false);

  const toggleStatus = (status: OrgTaskStatus) => {
    const current = filters.status || [];
    const updated = current.includes(status) ? current.filter(item => item !== status) : [...current, status];
    onFiltersChange({ ...filters, status: updated.length ? updated : undefined });
  };

  const togglePriority = (priority: OrgTaskPriority) => {
    const current = filters.priority || [];
    const updated = current.includes(priority) ? current.filter(item => item !== priority) : [...current, priority];
    onFiltersChange({ ...filters, priority: updated.length ? updated : undefined });
  };

  const activeCount = (filters.status?.length || 0)
    + (filters.priority?.length || 0)
    + (filters.assignedTo ? 1 : 0)
    + (filters.projectId ? 1 : 0);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1 sm:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar tarefas..."
          value={filters.search || ''}
          onChange={event => onFiltersChange({ ...filters, search: event.target.value || undefined })}
          className="h-9 pl-9"
        />
      </div>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-2">
            <Filter className="h-4 w-4" />Filtros
            {activeCount > 0 && <Badge variant="secondary" className="h-5 min-w-5 justify-center px-1.5">{activeCount}</Badge>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[min(92vw,420px)]" align="start">
          <div className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Responsável</Label>
                <Select value={filters.assignedTo || 'all'} onValueChange={value => onFiltersChange({ ...filters, assignedTo: value === 'all' ? undefined : value })}>
                  <SelectTrigger><User className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as pessoas</SelectItem>
                    <SelectItem value="mine">Minhas tarefas</SelectItem>
                    {teamMembers.map(member => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Projeto</Label>
                <Select value={filters.projectId || 'all'} onValueChange={value => onFiltersChange({ ...filters, projectId: value === 'all' ? undefined : value })}>
                  <SelectTrigger><FolderKanban className="mr-2 h-4 w-4" /><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os projetos</SelectItem>
                    {projects.map(project => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Status</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {statusOptions.map(option => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={filters.status?.includes(option.value)} onCheckedChange={() => toggleStatus(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Prioridade</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {priorityOptions.map(option => (
                  <label key={option.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={filters.priority?.includes(option.value)} onCheckedChange={() => togglePriority(option.value)} />
                    {option.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {activeCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-1 text-muted-foreground"
          onClick={() => onFiltersChange({ search: filters.search })}
        >
          <X className="h-3.5 w-3.5" />Limpar
        </Button>
      )}
    </div>
  );
};
