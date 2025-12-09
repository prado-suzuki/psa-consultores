import { useEffect, useState, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { EquipeLayout } from '@/components/equipe/EquipeLayout';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { LayoutGrid, List, CalendarIcon, X, Filter } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Deliverable {
  id: string;
  title: string;
  description: string | null;
  status: string;
  assigned_to: string | null;
  sprint_id: string | null;
  estimated_hours: number | null;
  due_date: string | null;
  start_date: string | null;
}

interface Sprint {
  id: string;
  name: string;
  project_id: string | null;
}

interface Profile {
  id: string;
  first_name: string;
  last_name: string;
}

interface Project {
  id: string;
  name: string;
}

interface Process {
  id: string;
  name: string;
  project_id: string | null;
}

const columns = [
  { id: 'pending', title: 'A Fazer', color: 'bg-blue-500' },
  { id: 'in_progress', title: 'Em Progresso', color: 'bg-yellow-500' },
  { id: 'completed', title: 'Concluído', color: 'bg-green-500' },
];

const EquipeKanban = () => {
  const [deliverables, setDeliverables] = useState<Deliverable[]>([]);
  const [sprints, setSprints] = useState<Sprint[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);
  const [viewMode, setViewMode] = useState<'kanban' | 'table'>('kanban');
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterSprint, setFilterSprint] = useState<string>('all');
  const [filterResponsible, setFilterResponsible] = useState<string>('all');
  const [filterProject, setFilterProject] = useState<string>('all');
  const [filterProcess, setFilterProcess] = useState<string>('all');
  const [filterStartDate, setFilterStartDate] = useState<Date | undefined>();
  const [filterEndDate, setFilterEndDate] = useState<Date | undefined>();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [sprintsRes, profilesRes, projectsRes, processesRes, deliverablesRes] = await Promise.all([
        supabase.from('sprints').select('id, name, project_id').order('start_date', { ascending: false }),
        supabase.from('profiles').select('id, first_name, last_name'),
        supabase.from('projects').select('id, name').order('name'),
        supabase.from('processes').select('id, name, project_id').order('name'),
        supabase.from('sprint_deliverables').select('*')
      ]);
      
      setSprints(sprintsRes.data || []);
      setProfiles(profilesRes.data || []);
      setProjects(projectsRes.data || []);
      setProcesses(processesRes.data || []);
      setDeliverables(deliverablesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Aplica todos os filtros
  const filteredDeliverables = useMemo(() => {
    return deliverables.filter(d => {
      // Filtro por Sprint
      if (filterSprint !== 'all' && d.sprint_id !== filterSprint) return false;

      // Filtro por Responsável
      if (filterResponsible !== 'all' && d.assigned_to !== filterResponsible) return false;

      // Filtro por Projeto (via sprint.project_id)
      if (filterProject !== 'all') {
        const sprint = sprints.find(s => s.id === d.sprint_id);
        if (!sprint || sprint.project_id !== filterProject) return false;
      }

      // Filtro por Processo (via process.project_id)
      if (filterProcess !== 'all') {
        const process = processes.find(p => p.id === filterProcess);
        if (!process) return false;
        const sprint = sprints.find(s => s.id === d.sprint_id);
        if (!sprint || sprint.project_id !== process.project_id) return false;
      }

      // Filtro por Data Início (start_date >= filterStartDate)
      if (filterStartDate && d.start_date) {
        const startDate = new Date(d.start_date + 'T00:00:00');
        if (startDate < filterStartDate) return false;
      }

      // Filtro por Data Fim (due_date <= filterEndDate)
      if (filterEndDate && d.due_date) {
        const dueDate = new Date(d.due_date + 'T00:00:00');
        if (dueDate > filterEndDate) return false;
      }

      return true;
    });
  }, [deliverables, sprints, processes, filterSprint, filterResponsible, filterProject, filterProcess, filterStartDate, filterEndDate]);

  const hasActiveFilters = filterSprint !== 'all' || filterResponsible !== 'all' || filterProject !== 'all' || filterProcess !== 'all' || filterStartDate || filterEndDate;

  const clearFilters = () => {
    setFilterSprint('all');
    setFilterResponsible('all');
    setFilterProject('all');
    setFilterProcess('all');
    setFilterStartDate(undefined);
    setFilterEndDate(undefined);
  };

  const updateDeliverableStatus = async (id: string, newStatus: 'pending' | 'in_progress' | 'completed') => {
    try {
      const updateData: { status: string; completed_at?: string | null } = { status: newStatus };
      
      if (newStatus === 'completed') {
        updateData.completed_at = new Date().toISOString();
      } else {
        updateData.completed_at = null;
      }

      await supabase
        .from('sprint_deliverables')
        .update(updateData)
        .eq('id', id);
      
      setDeliverables(deliverables.map(d => 
        d.id === id ? { ...d, status: newStatus } : d
      ));
    } catch (error) {
      console.error('Error updating deliverable:', error);
    }
  };

  const getProfileName = (profileId: string | null) => {
    if (!profileId) return 'Não atribuído';
    const profile = profiles.find(p => p.id === profileId);
    return profile ? `${profile.first_name} ${profile.last_name}` : 'Desconhecido';
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in_progress': return 'bg-yellow-100 text-yellow-700';
      default: return 'bg-blue-100 text-blue-700';
    }
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'A Fazer',
      in_progress: 'Em Progresso',
      completed: 'Concluído'
    };
    return labels[status] || status;
  };

  const formatDueDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return format(date, 'dd/MM', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <EquipeLayout 
      title="Quadro Kanban" 
      subtitle="Visualize e gerencie os entregáveis das sprints"
      fullWidth={true}
      headerActions={
        <div className="flex items-center gap-3">
          <div className="flex items-center border border-gray-200 rounded-lg p-1 bg-white">
            <Button
              variant={viewMode === 'kanban' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('kanban')}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === 'table' ? 'secondary' : 'ghost'}
              size="icon"
              className="h-8 w-8"
              onClick={() => setViewMode('table')}
            >
              <List className="h-4 w-4" />
            </Button>
          </div>
        </div>
      }
    >
      {/* Barra de Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtros</span>
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="ml-auto text-gray-500 hover:text-gray-700 h-7"
            >
              <X className="h-3 w-3 mr-1" />
              Limpar
            </Button>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          {/* Filtro Sprint */}
          <Select value={filterSprint} onValueChange={setFilterSprint}>
            <SelectTrigger className="w-40 bg-white border-gray-300 text-gray-900 h-9">
              <SelectValue placeholder="Sprint" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">Todas Sprints</SelectItem>
              {sprints.map((sprint) => (
                <SelectItem key={sprint.id} value={sprint.id}>{sprint.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Responsável */}
          <Select value={filterResponsible} onValueChange={setFilterResponsible}>
            <SelectTrigger className="w-44 bg-white border-gray-300 text-gray-900 h-9">
              <SelectValue placeholder="Responsável" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">Todos Responsáveis</SelectItem>
              {profiles.map((profile) => (
                <SelectItem key={profile.id} value={profile.id}>
                  {profile.first_name} {profile.last_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Projeto */}
          <Select value={filterProject} onValueChange={setFilterProject}>
            <SelectTrigger className="w-44 bg-white border-gray-300 text-gray-900 h-9">
              <SelectValue placeholder="Projeto" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">Todos Projetos</SelectItem>
              {projects.map((project) => (
                <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Processo */}
          <Select value={filterProcess} onValueChange={setFilterProcess}>
            <SelectTrigger className="w-44 bg-white border-gray-300 text-gray-900 h-9">
              <SelectValue placeholder="Processo" />
            </SelectTrigger>
            <SelectContent className="bg-white border-gray-200">
              <SelectItem value="all">Todos Processos</SelectItem>
              {processes.map((process) => (
                <SelectItem key={process.id} value={process.id}>{process.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro Data Início */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 px-3 border-gray-300 bg-white",
                  filterStartDate && "text-gray-900"
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                {filterStartDate ? format(filterStartDate, "dd/MM/yyyy", { locale: ptBR }) : "Data Início"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={filterStartDate}
                onSelect={setFilterStartDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>

          {/* Filtro Data Fim */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "h-9 px-3 border-gray-300 bg-white",
                  filterEndDate && "text-gray-900"
                )}
              >
                <CalendarIcon className="h-4 w-4 mr-2 text-gray-500" />
                {filterEndDate ? format(filterEndDate, "dd/MM/yyyy", { locale: ptBR }) : "Data Fim"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-white" align="start">
              <Calendar
                mode="single"
                selected={filterEndDate}
                onSelect={setFilterEndDate}
                initialFocus
                className="pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Contador de resultados */}
        <div className="mt-3 text-xs text-gray-500">
          {filteredDeliverables.length} de {deliverables.length} entregáveis
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      ) : viewMode === 'kanban' ? (
        <div className="grid grid-cols-3 gap-4 w-full">
          {columns.map((column) => (
            <div key={column.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-3 h-3 rounded-full ${column.color}`} />
                <h3 className="text-gray-900 font-semibold text-sm">{column.title}</h3>
                <Badge variant="outline" className="ml-auto border-gray-300 text-gray-600">
                  {filteredDeliverables.filter(d => d.status === column.id).length}
                </Badge>
              </div>
              
              <div 
                className="space-y-3 min-h-[calc(100vh-420px)]"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const deliverableId = e.dataTransfer.getData('deliverableId');
                  updateDeliverableStatus(deliverableId, column.id as 'pending' | 'in_progress' | 'completed');
                }}
              >
                {filteredDeliverables
                  .filter(d => d.status === column.id)
                  .map((deliverable) => (
                    <Card 
                      key={deliverable.id}
                      className="bg-white border-gray-200 cursor-pointer hover:shadow-md transition-shadow"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('deliverableId', deliverable.id)}
                    >
                      <CardContent className="p-3">
                        <h4 className="text-gray-900 text-sm font-medium mb-2 line-clamp-2">{deliverable.title}</h4>
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>{getProfileName(deliverable.assigned_to)}</span>
                          <span>{formatDueDate(deliverable.due_date)}</span>
                        </div>
                        {deliverable.estimated_hours && (
                          <div className="mt-2 text-xs text-gray-400">
                            {deliverable.estimated_hours}h estimadas
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <Card className="bg-white border-gray-200">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-gray-700">Título</TableHead>
                <TableHead className="text-gray-700">Status</TableHead>
                <TableHead className="text-gray-700">Responsável</TableHead>
                <TableHead className="text-gray-700">Data Limite</TableHead>
                <TableHead className="text-gray-700 text-right">Horas Est.</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDeliverables.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                    Nenhum entregável encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredDeliverables.map((deliverable) => (
                  <TableRow key={deliverable.id} className="cursor-pointer hover:bg-gray-50">
                    <TableCell className="text-gray-900 font-medium">{deliverable.title}</TableCell>
                    <TableCell>
                      <Badge className={getStatusBadgeColor(deliverable.status)}>
                        {getStatusLabel(deliverable.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {getProfileName(deliverable.assigned_to)}
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDueDate(deliverable.due_date)}
                    </TableCell>
                    <TableCell className="text-right text-gray-600">
                      {deliverable.estimated_hours ? `${deliverable.estimated_hours}h` : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      )}
    </EquipeLayout>
  );
};

export default EquipeKanban;
