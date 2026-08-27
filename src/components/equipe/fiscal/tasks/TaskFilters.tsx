import { useState } from 'react';
import { Filter, Flag, ListChecks, Search, SlidersHorizontal, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { SingleSelectCombobox } from '@/components/dashboards/SingleSelectCombobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FilterMultiSelectField } from './FilterMultiSelectField';
import { type OrgTaskPriority, type OrgTaskStatus, type TaskFilters as TaskFiltersType } from '@/hooks/useOrgTasks';
import { useExternalClients } from '@/hooks/useTaxReferenceData';

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
  const [draftFilters, setDraftFilters] = useState<TaskFiltersType>(filters);
  const { data: clients = [] } = useExternalClients();

  const toggleStatus = (status: OrgTaskStatus) => {
    const current = draftFilters.status || [];
    const updated = current.includes(status) ? current.filter(item => item !== status) : [...current, status];
    setDraftFilters({ ...draftFilters, status: updated.length ? updated : undefined });
  };

  const togglePriority = (priority: OrgTaskPriority) => {
    const current = draftFilters.priority || [];
    const updated = current.includes(priority) ? current.filter(item => item !== priority) : [...current, priority];
    setDraftFilters({ ...draftFilters, priority: updated.length ? updated : undefined });
  };

  const activeCount = (filters.status?.length || 0)
    + (filters.priority?.length || 0)
    + (filters.assignedTo ? 1 : 0)
    + (filters.projectId ? 1 : 0)
    + (filters.clientId ? 1 : 0);

  const clearAppliedFilters = () => onFiltersChange({ search: filters.search });
  const handleDrawerChange = (nextOpen: boolean) => {
    if (nextOpen) setDraftFilters(filters);
    setOpen(nextOpen);
  };
  // A busca não é rascunho: ela filtra ao digitar, fora do drawer. O rascunho
  // carrega o `search` de quando o drawer abriu, então aplicar precisa devolver
  // o texto que está na caixa AGORA — senão a busca voltaria no tempo.
  const applyFilters = () => {
    onFiltersChange({ ...draftFilters, search: filters.search });
    setOpen(false);
  };
  // "Limpar" quer dizer a mesma coisa nos dois botões: some com os filtros de
  // verdade. Limpar só o rascunho fazia com que fechar no X devolvesse tudo,
  // sem o contador nunca ter se movido. O drawer fica aberto para escolher os
  // próximos filtros.
  const clearFilters = () => {
    setDraftFilters({ search: filters.search });
    clearAppliedFilters();
  };

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
      <div className="relative min-w-52 flex-1 sm:max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar tarefas..."
          value={filters.search || ''}
          onChange={event => onFiltersChange({ ...filters, search: event.target.value || undefined })}
          className="h-9 pl-9"
        />
      </div>

      <Sheet open={open} onOpenChange={handleDrawerChange}>
        <Button variant="outline" size="sm" className="h-9 shrink-0 gap-2 font-medium" onClick={() => handleDrawerChange(true)}>
          <SlidersHorizontal className="h-4 w-4" />Filtros
          {activeCount > 0 && <Badge className="h-5 min-w-5 justify-center rounded-full px-1.5 text-[11px]">{activeCount}</Badge>}
        </Button>
        <SheetContent
          side="right"
          hideCloseButton
          overlayClassName="bg-black/40"
          className="fixed right-0 top-0 flex h-screen w-[300px] max-w-[calc(100vw-1rem)] flex-col gap-0 border-l p-0 shadow-2xl"
        >
          <SheetHeader className="flex-row items-center justify-between space-y-0 border-b px-6 py-5 pr-4 text-left">
            <div className="flex items-center gap-2"><Filter className="h-4 w-4 text-primary" /><SheetTitle>Filtrar tarefas</SheetTitle></div>
            <SheetClose asChild><Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" aria-label="Fechar filtros"><X className="h-4 w-4" /></Button></SheetClose>
          </SheetHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <section className="space-y-3">
              <div><h3 className="text-sm font-semibold">Contexto</h3><p className="mt-0.5 text-xs text-muted-foreground">Refine por pessoa, projeto, cliente, status ou prioridade.</p></div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label htmlFor="task-filter-assignee">Responsável</Label>
                  <Select value={draftFilters.assignedTo || 'all'} onValueChange={value => setDraftFilters({ ...draftFilters, assignedTo: value === 'all' ? undefined : value })}>
                    <SelectTrigger id="task-filter-assignee" className="w-full"><User className="mr-2 h-4 w-4 shrink-0" /><SelectValue /></SelectTrigger>
                    <SelectContent><SelectItem value="all">Todas as pessoas</SelectItem><SelectItem value="mine">Minhas tarefas</SelectItem>{teamMembers.map(member => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-filter-project">Projeto</Label>
                  <SingleSelectCombobox
                    id="task-filter-project"
                    options={projects.map(project => ({ value: project.id, label: project.name }))}
                    value={draftFilters.projectId || null}
                    onChange={value => setDraftFilters({ ...draftFilters, projectId: value || undefined })}
                    placeholder="Todos os projetos"
                    searchPlaceholder="Buscar projeto..."
                    emptyText="Nenhum projeto encontrado."
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-filter-client">Cliente</Label>
                  <SingleSelectCombobox
                    id="task-filter-client"
                    options={clients.map(client => ({ value: client.id, label: client.nome }))}
                    value={draftFilters.clientId || null}
                    onChange={value => setDraftFilters({ ...draftFilters, clientId: value || undefined, contribuinteId: undefined })}
                    placeholder="Todos os clientes"
                    searchPlaceholder="Buscar cliente..."
                    emptyText="Nenhum cliente encontrado."
                    className="w-full min-w-0"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-filter-status">Status</Label>
                  <FilterMultiSelectField
                    id="task-filter-status"
                    icon={ListChecks}
                    options={statusOptions}
                    selected={draftFilters.status || []}
                    onToggle={toggleStatus}
                    allLabel="Todos os status"
                    manyLabel="status selecionados"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="task-filter-priority">Prioridade</Label>
                  <FilterMultiSelectField
                    id="task-filter-priority"
                    icon={Flag}
                    options={priorityOptions}
                    selected={draftFilters.priority || []}
                    onToggle={togglePriority}
                    allLabel="Todas as prioridades"
                    manyLabel="prioridades selecionadas"
                  />
                </div>
              </div>
            </section>
          </div>

          <div className="flex gap-2 border-t bg-background px-6 py-4">
            <Button variant="outline" className="flex-1" onClick={clearFilters}>Limpar filtros</Button>
            <Button className="flex-1" onClick={applyFilters}>Aplicar filtros</Button>
          </div>
        </SheetContent>
      </Sheet>

      {activeCount > 0 && <Button variant="ghost" size="sm" className="h-9 shrink-0 gap-1 text-muted-foreground" onClick={clearAppliedFilters}><X className="h-3.5 w-3.5" />Limpar</Button>}
    </div>
  );
};
