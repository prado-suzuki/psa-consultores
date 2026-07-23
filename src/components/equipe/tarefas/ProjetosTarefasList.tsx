import { Fragment, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  CalendarDays,
  Building2,
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsDown,
  ChevronsUp,
  Edit3,
  Flag,
  FolderKanban,
  MoreHorizontal,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { AreaKey } from '@/config/areaCategories';
import { toast } from 'sonner';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { type OrgTask, type OrgTaskPriority, type OrgTaskStatus, useUpdateOrgTask } from '@/hooks/useOrgTasks';
import { cn } from '@/lib/utils';
import { parseDate } from '@/lib/dateUtils';
import { STATUS_LABELS } from '@/lib/projetosCadastro';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import {
  buildProjetosTarefasHierarchy,
  type ProjetosTarefasTaskNode,
} from '@/lib/projetosTarefasHierarchy';
import type { ProjetosTarefasOs } from '@/lib/projetosTarefasHierarchy';

interface ProjetosTarefasListProps {
  area: AreaKey;
  projects: OrgProject[];
  tasks: OrgTask[];
  osRows: ProjetosTarefasOs[];
  search: string;
  onEditProject: (project: OrgProject) => void;
  onDeleteProject: (projectId: string) => void;
  onNewTask: (projectId?: string) => void;
  onEditTask: (task: OrgTask) => void;
  onDeleteTask: (taskId: string) => void;
  onReassignTask: (task: OrgTask) => void;
  onAddSubtask: (task: OrgTask) => void;
  currentUserId?: string | null;
}

const GRID = 'grid grid-cols-[minmax(320px,1fr)_90px_170px_180px_130px_44px] min-w-[1010px]';

const projectStatusStyles: Record<string, string> = {
  planned: 'bg-slate-100 text-slate-700',
  active: 'bg-blue-100 text-blue-700',
  completed: 'bg-emerald-100 text-emerald-700',
  on_hold: 'bg-amber-100 text-amber-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

const priorityConfig: Record<OrgTaskPriority, { label: string; className: string }> = {
  urgent: { label: 'Urgente', className: 'text-red-600' },
  high: { label: 'Alta', className: 'text-orange-500' },
  medium: { label: 'Média', className: 'text-blue-500' },
  low: { label: 'Baixa', className: 'text-slate-400' },
};

function initials(name: string | null) {
  return name ? name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() : '?';
}

function dateLabel(date: string | null) {
  return date ? format(parseDate(date), 'dd MMM yyyy', { locale: ptBR }) : 'Sem prazo';
}

const taskStatusProgress: Record<OrgTaskStatus, number> = {
  backlog: 0,
  todo: 0,
  waiting_client: 25,
  in_progress: 25,
  review: 75,
  em_ajuste: 75,
  done: 100,
};

function TaskStatusDot({ status }: { status: OrgTaskStatus }) {
  const progress = taskStatusProgress[status];
  return <span
    role="img"
    aria-label={`${statusColors[status].label}: ${progress}%`}
    className={cn('flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current p-px', statusColors[status].text)}
  >
    <span
      className="flex h-full w-full items-center justify-center rounded-full"
      style={{ background: progress === 100 ? 'currentColor' : `conic-gradient(currentColor ${progress * 3.6}deg, transparent 0deg)` }}
    >
      {progress === 100 && <Check className="h-2 w-2 stroke-[3] text-white" />}
    </span>
  </span>;
}

export function ProjetosTarefasList({
  area,
  projects,
  tasks,
  osRows,
  search,
  onEditProject,
  onDeleteProject,
  onNewTask,
  onEditTask,
  onDeleteTask,
  onReassignTask,
  onAddSubtask,
  currentUserId,
}: ProjetosTarefasListProps) {
  const hierarchy = useMemo(
    () => buildProjetosTarefasHierarchy(projects, tasks, osRows, search),
    [projects, tasks, osRows, search],
  );
  const updateTask = useUpdateOrgTask(area);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

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
    const priority = priorityConfig[task.priority] || priorityConfig.medium;
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
          <span title={priority.label}>
            <Flag className={cn('h-4 w-4 fill-current', priority.className)} aria-label={`Prioridade ${priority.label}`} />
          </span>
        </div>
        <div className="flex items-center px-3 py-1.5">
          <Select value={task.status} onValueChange={value => updateStatus(task, value as OrgTaskStatus)}>
            <SelectTrigger className="h-7 w-[150px] border-0 bg-transparent px-1 shadow-none focus:ring-0">
              <span className={cn('rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide', statusColors[task.status].combined)}>{statusColors[task.status].label}</span>
            </SelectTrigger>
            <SelectContent>{statusList.map(status => <SelectItem key={status.key} value={status.key}>{status.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 text-muted-foreground">
          <Avatar className="h-6 w-6"><AvatarFallback className="bg-primary/10 text-[10px] text-primary">{initials(task.assigned_to_name)}</AvatarFallback></Avatar>
          <span className="truncate text-xs">{task.assigned_to_name || 'Não atribuído'}</span>
        </div>
        <div className={cn('flex items-center gap-1.5 px-3 py-1.5 text-xs', task.due_date && parseDate(task.due_date) < new Date() && task.status !== 'done' ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          <CalendarDays className="h-3.5 w-3.5" />{dateLabel(task.due_date)}
        </div>
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditTask(task)}><Edit3 className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
              {!task.parent_task_id && <DropdownMenuItem onClick={() => onAddSubtask(task)}><Plus className="mr-2 h-4 w-4" />Adicionar subtarefa</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => onReassignTask(task)}><UserPlus className="mr-2 h-4 w-4" />Reatribuir</DropdownMenuItem>
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
    return <div className="rounded-xl border border-dashed py-16 text-center"><FolderKanban className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" /><p className="font-medium">Nenhum projeto ou tarefa encontrado</p><p className="mt-1 text-sm text-muted-foreground">Ajuste os filtros ou crie um novo projeto.</p></div>;
  }

  const allCollapsed = hierarchy.every(group => collapsed.has(`os:${group.id}`));
  const toggleAll = () => {
    if (allCollapsed) {
      setCollapsed(new Set());
      return;
    }
    setCollapsed(new Set(hierarchy.map(group => `os:${group.id}`)));
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
      <div className="px-4 py-2.5">Nome</div><div className="px-3 py-2.5">Prioridade</div><div className="px-3 py-2.5">Status</div><div className="px-3 py-2.5">Responsável</div><div className="px-3 py-2.5">Prazo</div><div />
    </div>
    {hierarchy.map((group, index) => {
      const groupId = `os:${group.id}`;
      const isCollapsed = collapsed.has(groupId);
      const progress = group.taskCount ? Math.round(group.completedTaskCount / group.taskCount * 100) : 0;
      const showClientDivider = index === 0 || hierarchy[index - 1].clientKey !== group.clientKey;
      return <Fragment key={group.id}>
        {showClientDivider && <div className="flex min-w-[1010px] items-center gap-2 border-b border-t bg-muted/60 px-4 py-2.5 first:border-t-0">
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{group.clientName}</span>
          <span className="text-xs text-muted-foreground">{hierarchy.filter(item => item.clientKey === group.clientKey).length} OS/grupo(s)</span>
        </div>}
        <section>
        <div className="flex min-w-[1010px] items-center gap-3 border-b bg-primary/[0.045] px-3 py-3">
          <button type="button" onClick={() => toggle(groupId)} className="rounded p-1 text-muted-foreground hover:bg-primary/10">{isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
          <div className="h-5 w-1 rounded-full bg-primary" />
          <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate font-semibold">{group.os?.numero_os ? `${group.os.numero_os}${group.os.produtos ? ` - ${group.os.produtos}` : ''}` : (group.hasLinkedOs ? 'OS vinculada' : 'Sem OS')}</span><Badge variant="outline" className="shrink-0 font-normal">{group.projects.length} {group.projects.length === 1 ? 'projeto' : 'projetos'}</Badge></div><p className="truncate text-xs text-muted-foreground">{group.os ? group.os.cliente_nome : group.hasLinkedOs ? 'Carregando dados da ordem de serviço vinculada' : 'Projetos e tarefas agrupados sem ordem de serviço'}</p></div>
          <div className="flex w-44 items-center gap-2"><Progress value={progress} className="h-1.5" /><span className="w-9 text-right text-xs font-medium text-muted-foreground">{progress}%</span></div>
          <span className="w-28 text-right text-xs text-muted-foreground">{group.completedTaskCount}/{group.taskCount} concluídas</span>
        </div>
        {!isCollapsed && group.projects.map(projectNode => {
          const projectId = `project:${projectNode.project?.id || '__without_project__'}`;
          const projectCollapsed = collapsed.has(projectId);
          const projectProgress = projectNode.taskCount ? Math.round(projectNode.completedTaskCount / projectNode.taskCount * 100) : 0;
          return <div key={projectId}>
            <div className={cn(GRID, 'group border-b bg-muted/10 text-sm hover:bg-muted/30')}>
              <div className="flex min-w-0 items-center gap-2 px-4 py-2.5 pl-9">
                <button type="button" onClick={() => toggle(projectId)} className="rounded p-1 text-muted-foreground hover:bg-muted">{projectCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}</button>
                <FolderKanban className="h-4 w-4 shrink-0 text-primary" />
                <button type="button" disabled={!projectNode.project} onClick={() => projectNode.project && onEditProject(projectNode.project)} className="truncate text-left font-semibold hover:underline disabled:no-underline">{projectNode.project?.name || 'Sem projeto'}</button>
                <span className="text-xs text-muted-foreground">{projectNode.taskCount}</span>
              </div>
              <div />
              <div className="flex items-center px-3">{projectNode.project && <span className={cn('rounded-md px-2 py-1 text-[11px] font-semibold uppercase tracking-wide', projectStatusStyles[projectNode.project.status] || 'bg-muted text-muted-foreground')}>{STATUS_LABELS[projectNode.project.status] || projectNode.project.status}</span>}</div>
              <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground"><Avatar className="h-6 w-6"><AvatarFallback className="bg-primary/10 text-[10px] text-primary">{initials(projectNode.project?.responsible ? `${projectNode.project.responsible.first_name} ${projectNode.project.responsible.last_name}` : null)}</AvatarFallback></Avatar><span className="truncate">{projectNode.project?.responsible ? `${projectNode.project.responsible.first_name} ${projectNode.project.responsible.last_name}`.trim() : 'Não atribuído'}</span></div>
              <div className="flex items-center gap-2 px-3"><Progress value={projectProgress} className="h-1.5 w-14" /><span className="text-xs text-muted-foreground">{projectProgress}%</span></div>
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
