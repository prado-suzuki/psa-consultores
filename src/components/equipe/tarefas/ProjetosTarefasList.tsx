import { Fragment, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CalendarDays,
  Building2,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Edit3,
  FilterX,
  FolderInput,
  FolderKanban,
  MoreHorizontal,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { AreaKey } from '@/config/areaCategories';
import { toast } from 'sonner';
import { AreaLoader } from '@/components/equipe/AreaLoader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { OrgProject } from '@/hooks/useOrgProjects';
import { type OrgTask, type OrgTaskStatus, useUpdateOrgTask } from '@/hooks/useOrgTasks';
import { cn } from '@/lib/utils';
import { parseDate } from '@/lib/dateUtils';
import { STATUS_LABELS } from '@/lib/projetosCadastro';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import {
  buildProjetosTarefasHierarchy,
  type ProjetosTarefasTaskNode,
} from '@/lib/projetosTarefasHierarchy';
import { TaskStatusDot } from '@/components/equipe/tarefas/TaskStatusDot';
import type { ProjetosTarefasOs } from '@/lib/projetosTarefasHierarchy';

interface ProjetosTarefasListProps {
  area: AreaKey;
  projects: OrgProject[];
  tasks: OrgTask[];
  osRows: ProjetosTarefasOs[];
  search: string;
  /** Dados da lista (projetos/tarefas/escopo) ainda em resolução. */
  isLoading?: boolean;
  hideEmpty?: boolean;
  onClearFilters?: () => void;
  onEditProject: (project: OrgProject) => void;
  onDeleteProject: (projectId: string) => void;
  onNewTask: (projectId?: string) => void;
  onEditTask: (task: OrgTask) => void;
  onDeleteTask: (taskId: string) => void;
  onReassignTask: (task: OrgTask) => void;
  onMoveTask: (task: OrgTask) => void;
  onAddSubtask: (task: OrgTask) => void;
  currentUserId?: string | null;
}

const GRID = 'grid grid-cols-[minmax(320px,1fr)_150px_180px_130px_160px_44px] min-w-[1060px]';

const projectStatusStyles: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

function dateLabel(date: string | null) {
  return date ? format(parseDate(date), 'dd MMM yyyy', { locale: ptBR }) : 'Sem prazo';
}

function completedTasksLabel(completed: number, total: number) {
  return `${completed}/${total} concluídas`;
}

function completionPercentage(completed: number, total: number) {
  return total > 0 ? Math.round(completed / total * 100) : 0;
}

export function ProjetosTarefasList({
  area,
  projects,
  tasks,
  osRows,
  search,
  isLoading = false,
  hideEmpty = false,
  onClearFilters,
  onEditProject,
  onDeleteProject,
  onNewTask,
  onEditTask,
  onDeleteTask,
  onReassignTask,
  onMoveTask,
  onAddSubtask,
  currentUserId,
}: ProjetosTarefasListProps) {
  const hierarchy = useMemo(
    () => buildProjetosTarefasHierarchy(projects, tasks, osRows, search, hideEmpty),
    [projects, tasks, osRows, search, hideEmpty],
  );
  const updateTask = useUpdateOrgTask(area);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ column: 'prazo' | 'progresso' | null; dir: 'asc' | 'desc' }>({ column: null, dir: 'asc' });

  const cycleSort = (column: 'prazo' | 'progresso') => setSort(previous => {
    if (previous.column !== column) return { column, dir: 'asc' };
    if (previous.dir === 'asc') return { column, dir: 'desc' };
    return { column: null, dir: 'asc' };
  });

  const sortIcon = (column: 'prazo' | 'progresso') => {
    if (sort.column !== column) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sort.dir === 'asc'
      ? <ArrowUp className="h-3 w-3 text-primary" />
      : <ArrowDown className="h-3 w-3 text-primary" />;
  };

  const sortedHierarchy = useMemo(() => {
    if (!sort.column) return hierarchy;
    const factor = sort.dir === 'asc' ? 1 : -1;
    const groupValue = (group: (typeof hierarchy)[number]) => sort.column === 'prazo'
      ? (group.os?.data_fim ? parseDate(group.os.data_fim).getTime() : null)
      : completionPercentage(group.completedTaskCount, group.taskCount);
    const compareGroups = (a: (typeof hierarchy)[number], b: (typeof hierarchy)[number]) => {
      const av = groupValue(a);
      const bv = groupValue(b);
      if (av === null && bv === null) return 0;
      if (av === null) return 1;
      if (bv === null) return -1;
      return (av - bv) * factor;
    };
    // Ordena globalmente (entre clientes), reordenando também os divisores.
    return [...hierarchy].sort(compareGroups).map(group => sort.column === 'progresso'
      ? { ...group, projects: [...group.projects].sort((a, b) => (completionPercentage(a.completedTaskCount, a.taskCount) - completionPercentage(b.completedTaskCount, b.taskCount)) * factor) }
      : group);
  }, [hierarchy, sort]);

  const toggle = (id: string) => setCollapsed(previous => {
    const next = new Set(previous);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const updateStatus = (task: OrgTask, status: OrgTaskStatus) => {
    if (status === 'done' && isDelegatedOrgTaskReviewer(task, currentUserId)) {
      toast.error('O revisor não pode concluir a tarefa. Devolva-a para ajustes.');
      return;
    }
    updateTask.mutate({ id: task.id, status });
  };

  const renderTask = (node: ProjetosTarefasTaskNode, depth: number): React.ReactNode => {
    const { task, children } = node;
    const rowId = `task:${task.id}`;
    const isCollapsed = collapsed.has(rowId);
    return <Fragment key={task.id}>
      <div className={cn(GRID, 'group border-t border-border/60 bg-background text-sm hover:bg-muted/30')}>
        <div className="flex min-w-0 items-center gap-2 px-4 py-2" style={{ paddingLeft: `${44 + depth * 24}px` }}>
          {children.length > 0 ? (
            <button type="button" onClick={() => toggle(rowId)} className="-ml-7 rounded p-1 text-muted-foreground hover:bg-muted" aria-label={isCollapsed ? 'Expandir tarefa' : 'Recolher tarefa'}>
              {isCollapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            </button>
          ) : <span className="-ml-6 w-6" />}
          <TaskStatusDot status={task.status} />
          <button type="button" className="truncate text-left font-medium text-foreground hover:underline" onClick={() => onEditTask(task)}>
            {task.title}
          </button>
          {children.length > 0 && <span className="text-xs text-muted-foreground">{children.length}</span>}
        </div>
        <div className="flex items-center px-3 py-1.5">
          <Select value={task.status} onValueChange={value => updateStatus(task, value as OrgTaskStatus)}>
            <SelectTrigger className="h-6 w-[138px] border-0 bg-transparent px-1 shadow-none focus:ring-0 [&>span]:!line-clamp-none [&>span]:whitespace-nowrap [&>span]:overflow-visible">
              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-normal', statusColors[task.status].combined)}>{statusColors[task.status].label}</span>
            </SelectTrigger>
            <SelectContent>{statusList.map(status => <SelectItem key={status.key} value={status.key}>{status.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center px-3 py-1.5 text-muted-foreground">
          <span className="truncate text-xs">{task.assigned_to_name || 'Não atribuído'}</span>
        </div>
        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs', task.due_date && parseDate(task.due_date) < new Date() && task.status !== 'done' ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          <CalendarDays className="h-3.5 w-3.5" />{dateLabel(task.due_date)}
        </div>
        <div />
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditTask(task)}><Edit3 className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
              {!task.parent_task_id && <DropdownMenuItem onClick={() => onAddSubtask(task)}><Plus className="mr-2 h-4 w-4" />Adicionar subtarefa</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => onReassignTask(task)}><UserPlus className="mr-2 h-4 w-4" />Reatribuir</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMoveTask(task)}><FolderInput className="mr-2 h-4 w-4" />Mover para outro projeto</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDeleteTask(task.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {!isCollapsed && children.map(child => renderTask(child, depth + 1))}
    </Fragment>;
  };

  if (hierarchy.length === 0) {
    // Carregando vem ANTES dos vazios: a lista depende de várias consultas em
    // cadeia (escopo de cluster → projetos → tarefas → OS) e, sem este ramo,
    // o usuário lia "Nenhum projeto ou tarefa encontrado" durante toda a espera.
    // Só entra aqui quando não há NADA para mostrar — com dados parciais a lista
    // é renderizada normalmente e vai se completando.
    if (isLoading) {
      return <div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        <AreaLoader area={area} size={72} className="mx-auto block" />
        <p className="mt-3 font-medium">Carregando projetos e tarefas…</p>
      </div>;
    }
    // Com filtros ativos, o vazio é resultado da filtragem — ensina o comportamento
    // (grupos sem tarefas ficam ocultos) e oferece limpar os filtros de uma vez.
    if (hideEmpty) {
      return <div className="rounded-xl border border-dashed py-16 text-center">
        <FilterX className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
        <p className="font-medium">Nenhuma tarefa corresponde aos filtros</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Clientes, OS e projetos sem tarefas correspondentes ficam ocultos. Limpe os filtros para ver toda a estrutura.</p>
        {onClearFilters && <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={onClearFilters}><FilterX className="h-4 w-4" />Limpar filtros</Button>}
      </div>;
    }
    return <div className="rounded-xl border border-dashed py-16 text-center"><FolderKanban className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" /><p className="font-medium">Nenhum projeto ou tarefa encontrado</p><p className="mt-1 text-sm text-muted-foreground">Crie um novo projeto para começar.</p></div>;
  }

  const allCollapsed = sortedHierarchy.every(group => collapsed.has(`os:${group.id}`));
  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsed(new Set());
      return;
    }
    setCollapsed(new Set(sortedHierarchy.map(group => `os:${group.id}`)));
  };

  return <div className="space-y-2">
    <div className="flex justify-end">
      <Button variant="outline" size="sm" onClick={toggleAll} className="gap-2">
        {allCollapsed ? <ChevronsDown className="h-4 w-4" /> : <ChevronsUp className="h-4 w-4" />}
        {allCollapsed ? 'Expandir tudo' : 'Recolher tudo'}
      </Button>
    </div>
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
    <div className={cn(GRID, 'border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground')}>
      <div className="px-4 py-2.5">Nome</div><div className="px-3 py-2.5">Status</div><div className="px-3 py-2.5">Responsável</div>
      <button type="button" onClick={() => cycleSort('prazo')} className={cn('flex items-center gap-1 px-3 py-2.5 uppercase tracking-wider transition-colors hover:text-foreground', sort.column === 'prazo' ? 'text-foreground' : '')}>Prazo{sortIcon('prazo')}</button>
      <button type="button" onClick={() => cycleSort('progresso')} className={cn('flex items-center justify-end gap-1 px-3 py-2.5 uppercase tracking-wider transition-colors hover:text-foreground', sort.column === 'progresso' ? 'text-foreground' : '')}>Progresso{sortIcon('progresso')}</button>
      <div />
    </div>
    {sortedHierarchy.map((group, index) => {
      const groupId = `os:${group.id}`;
      const isCollapsed = collapsed.has(groupId);
      const showClientDivider = index === 0 || sortedHierarchy[index - 1].clientKey !== group.clientKey;
      return <Fragment key={group.id}>
        {showClientDivider && <div className="flex min-w-[1010px] items-center gap-2 border-b border-t bg-muted/60 px-4 py-2.5 first:border-t-0">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{group.clientName}</span>
          <span className="text-xs text-muted-foreground">{sortedHierarchy.filter(item => item.clientKey === group.clientKey).length} OS/grupo(s)</span>
        </div>}
        <section>
        <div className={cn(GRID, 'border-b bg-primary/[0.045]')}>
          <div className="flex min-w-0 items-center gap-3 px-3 py-3">
            <button type="button" onClick={() => toggle(groupId)} className="rounded p-1 text-muted-foreground hover:bg-primary/10">{isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
            <div className="h-5 w-1 rounded-full bg-primary" />
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate font-semibold">{group.os?.numero_os ? `${group.os.numero_os}${group.os.produtos ? ` - ${group.os.produtos}` : ''}` : (group.hasLinkedOs ? 'OS vinculada' : 'Sem OS')}</span><Badge variant="outline" className="shrink-0 font-normal">{group.projects.length} {group.projects.length === 1 ? 'projeto' : 'projetos'}</Badge></div><p className="truncate text-xs text-muted-foreground">{group.os ? group.os.cliente_nome : group.hasLinkedOs ? 'Carregando dados da ordem de serviço vinculada' : 'Projetos e tarefas agrupados sem ordem de serviço'}</p></div>
          </div>
          <div />
          <div />
          <div className="flex items-center gap-1.5 px-3 text-xs text-muted-foreground">{group.os?.data_fim ? <><CalendarDays className="h-3.5 w-3.5" />{dateLabel(group.os.data_fim)}</> : 'Sem prazo'}</div>
          <div className="flex items-center justify-end gap-2 px-3 text-xs font-medium text-muted-foreground">
            <Progress value={completionPercentage(group.completedTaskCount, group.taskCount)} className="h-1.5 w-16 bg-primary/15" />
            <span className="shrink-0">{completedTasksLabel(group.completedTaskCount, group.taskCount)}</span>
          </div>
          <div />
        </div>
        {!isCollapsed && group.projects.map(projectNode => {
          const projectId = `project:${projectNode.project?.id || '__without_project__'}`;
          const projectCollapsed = collapsed.has(projectId);
          return <div key={projectId}>
            <div className={cn(GRID, 'group relative z-10 bg-muted/30 text-sm shadow-md hover:bg-muted/45')}>
              <div className="flex min-w-0 items-center gap-2 px-4 py-2.5 pl-9">
                <button type="button" onClick={() => toggle(projectId)} className="rounded p-1 text-muted-foreground hover:bg-muted">{projectCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
                <FolderKanban className="h-4 w-4 shrink-0 text-primary" />
                <button type="button" disabled={!projectNode.project} onClick={() => projectNode.project && onEditProject(projectNode.project)} className="truncate text-left font-semibold hover:underline disabled:no-underline">{projectNode.project?.name || 'Sem projeto'}</button>
                <span className="text-xs text-muted-foreground">{projectNode.taskCount}</span>
              </div>
              <div className="flex items-center px-3">{projectNode.project && <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', projectStatusStyles[projectNode.project.status] || 'bg-muted text-muted-foreground')}>{STATUS_LABELS[projectNode.project.status] || projectNode.project.status}</span>}</div>
              <div className="flex items-center px-3 text-xs text-muted-foreground"><span className="truncate">{projectNode.project?.responsible ? `${projectNode.project.responsible.first_name} ${projectNode.project.responsible.last_name}`.trim() : 'Não atribuído'}</span></div>
              <div />
              <div className="flex items-center justify-end gap-2 px-3 text-xs font-medium text-muted-foreground">
                <Progress value={completionPercentage(projectNode.completedTaskCount, projectNode.taskCount)} className="h-1.5 w-16 bg-primary/15" />
                <span className="shrink-0">{completedTasksLabel(projectNode.completedTaskCount, projectNode.taskCount)}</span>
              </div>
              <div className="flex items-center justify-center">{projectNode.project && <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onNewTask(projectNode.project!.id)}><Plus className="mr-2 h-4 w-4" />Nova tarefa</DropdownMenuItem><DropdownMenuItem onClick={() => onEditProject(projectNode.project!)}><Edit3 className="mr-2 h-4 w-4" />Editar projeto</DropdownMenuItem><DropdownMenuSeparator /><DropdownMenuItem className="text-destructive" onClick={() => onDeleteProject(projectNode.project!.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir projeto</DropdownMenuItem></DropdownMenuContent></DropdownMenu>}</div>
            </div>
            {!projectCollapsed && <>{projectNode.tasks.map(node => renderTask(node, 0))}{projectNode.project && <button type="button" onClick={() => onNewTask(projectNode.project!.id)} className="flex min-w-[1010px] items-center gap-2 border-t px-14 py-2 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground"><Plus className="h-3.5 w-3.5" />Adicionar tarefa</button>}</>}
          </div>;
        })}
        </section>
      </Fragment>;
    })}
    </div>
  </div>;
}
