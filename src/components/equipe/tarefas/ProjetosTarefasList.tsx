import { Fragment, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { projectStatusConfig } from '@/lib/projetoStatusColors';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import {
  buildProjetosTarefasHierarchy,
  shortProjectName,
  type ProjetosTarefasTaskNode,
} from '@/lib/projetosTarefasHierarchy';
import { TaskStatusDot } from '@/components/equipe/tarefas/TaskStatusDot';
import {
  esforcoDaTarefa,
  resumoEsforco,
  type EsforcoAgregado,
  type EsforcoTarefa,
} from '@/lib/projetosTarefasEsforco';
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
  /** Tarefas marcadas para ação em lote (hoje: mover de projeto). */
  selectedTaskIds: Set<string>;
  onToggleSelection: (taskIds: string[], selected: boolean) => void;
  onMoveSelected: () => void;
  /** Marca todas as tarefas do projeto e abre o movimento em lote. */
  onMoveProjectTasks: (taskIds: string[]) => void;
  currentUserId?: string | null;
}

const GRID = 'grid grid-cols-[minmax(320px,1fr)_150px_180px_130px_140px_160px_44px] min-w-[1200px]';
/** Faixas que atravessam a tabela inteira (divisor de cliente, "adicionar tarefa"). */
const FULL_ROW_MIN_WIDTH = 'min-w-[1150px]';

/**
 * Recuos da coluna Nome, em px, e slots de largura fixa para seta e caixa de
 * seleção. Cada nível reserva os mesmos slots ainda que estejam vazios: era a
 * caixa de seleção condicional (só aparece em projeto com tarefa) que empurrava
 * a linha 24px para a direita e fazia o projeto parecer filho do de cima.
 */
const PROJECT_INDENT = 36;
const TASK_INDENT = 60;
const INDENT_STEP = 24;
const TOGGLE_SLOT = 'flex h-5 w-5 shrink-0 items-center justify-center';
const CHECK_SLOT = 'flex h-4 w-4 shrink-0 items-center justify-center';
/** x das guias verticais: o centro da seta do nível imediatamente acima. */
const OS_GUIDE = 24;
const PROJECT_GUIDE = PROJECT_INDENT + 10;

/**
 * Guia vertical do nível. Recuo sozinho é ambíguo — a linha indentada parece
 * filha da linha de cima; a guia mostra de qual bloco ela desce.
 */
function LevelGuide({ left }: { left: number }) {
  return <span aria-hidden className="pointer-events-none absolute inset-y-0 border-l border-border/60" style={{ left }} />;
}

/**
 * Contadores da linha: em aberto e concluídas. Substitui o número solto, que não
 * dizia de quê era.
 */
function ContadorTarefas({ total, concluidas }: { total: number; concluidas: number }) {
  if (total === 0) return null;
  const abertas = total - concluidas;
  return <span className="flex shrink-0 items-center gap-1">
    {abertas > 0 && <span title={`${abertas} em aberto`} className="rounded bg-status-neutro-soft px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-status-neutro">{abertas}</span>}
    {concluidas > 0 && <span title={`${concluidas} concluída(s)`} className="rounded bg-status-feito-soft px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-status-feito">{concluidas}</span>}
  </span>;
}

/** Ids de uma subárvore de tarefas — a marcação de um projeto pega tudo dentro dele. */
function collectNodeTaskIds(nodes: ProjetosTarefasTaskNode[]): string[] {
  return nodes.flatMap(node => [node.task.id, ...collectNodeTaskIds(node.children)]);
}

function initials(name: string | null) {
  return name ? name.split(' ').map(part => part[0]).join('').slice(0, 2).toUpperCase() : '?';
}


function dateLabel(date: string | null) {
  return date ? format(parseDate(date), 'dd MMM yyyy', { locale: ptBR }) : 'Sem prazo';
}

function completedTasksLabel(completed: number, total: number) {
  return `${completed}/${total} concluídas`;
}

function completionPercentage(completed: number, total: number) {
  return total > 0 ? Math.round(completed / total * 100) : 0;
}

/**
 * Célula de esforço. O estado `sem_apontamento` — concluído sem horas — vem em
 * pílula de alerta porque é o único que exige ação de alguém.
 */
function EsforcoCell({ esforco, className }: { esforco: EsforcoTarefa; className?: string }) {
  if (esforco.estado === 'sem_apontamento') {
    return <div className={cn('flex items-center px-3', className)}>
      <span title={esforco.descricao} className="inline-flex items-center gap-1 rounded bg-status-alerta-soft px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-status-alerta">
        <AlertTriangle className="h-3 w-3 shrink-0" />{esforco.label}
      </span>
    </div>;
  }
  return <div className={cn('flex items-center px-3 text-xs', esforco.estado === 'apontado' ? 'text-foreground' : 'text-muted-foreground', className)}>
    <span title={esforco.descricao} className="truncate">{esforco.label}</span>
  </div>;
}

function EsforcoAgregadoCell({ esforco, className }: { esforco: EsforcoAgregado; className?: string }) {
  return <EsforcoCell esforco={resumoEsforco(esforco)} className={className} />;
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
  selectedTaskIds,
  onToggleSelection,
  onMoveSelected,
  onMoveProjectTasks,
  currentUserId,
}: ProjetosTarefasListProps) {
  const hierarchy = useMemo(
    () => buildProjetosTarefasHierarchy(projects, tasks, osRows, search, hideEmpty),
    [projects, tasks, osRows, search, hideEmpty],
  );
  const updateTask = useUpdateOrgTask(area);
  // Expansao opt-in: abrir uma linha revela apenas os filhos diretos, ja fechados.
  // Assim expandir uma OS mostra os projetos sem despejar tarefas e subtarefas.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
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

  const toggle = (id: string) => setExpanded(previous => {
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
    const isExpanded = expanded.has(rowId);
    const isSelected = selectedTaskIds.has(task.id);
    return <Fragment key={task.id}>
      <div className={cn(GRID, 'group border-t border-border/60 text-sm hover:bg-muted/30', isSelected ? 'bg-primary/5' : 'bg-background')}>
        <div className="relative flex min-w-0 items-center gap-2 px-4 py-2" style={{ paddingLeft: `${TASK_INDENT + depth * INDENT_STEP}px` }}>
          {Array.from({ length: depth + 1 }, (_, level) => <LevelGuide key={level} left={PROJECT_GUIDE + level * INDENT_STEP} />)}
          <span className={TOGGLE_SLOT}>
            {children.length > 0 && (
              <button type="button" onClick={() => toggle(rowId)} className="rounded p-0.5 text-muted-foreground hover:bg-muted" aria-label={isExpanded ? 'Recolher tarefa' : 'Expandir tarefa'}>
                {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            )}
          </span>
          <span className={CHECK_SLOT}>
            <Checkbox
              checked={isSelected}
              onCheckedChange={checked => onToggleSelection([task.id], checked === true)}
              aria-label={`Selecionar tarefa ${task.title}`}
            />
          </span>
          <TaskStatusDot status={task.status} />
          <button type="button" className="truncate text-left font-medium text-foreground hover:underline" onClick={() => onEditTask(task)}>
            {task.title}
          </button>
          <ContadorTarefas total={children.length} concluidas={children.filter(child => child.task.status === 'done').length} />
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
        <EsforcoCell esforco={esforcoDaTarefa(task)} className="py-1.5" />
        <div />
        <div className="flex items-center justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEditTask(task)}><Edit3 className="mr-2 h-4 w-4" />Editar</DropdownMenuItem>
              {!task.parent_task_id && <DropdownMenuItem onClick={() => onAddSubtask(task)}><Plus className="mr-2 h-4 w-4" />Adicionar subtarefa</DropdownMenuItem>}
              <DropdownMenuItem onClick={() => onReassignTask(task)}><UserPlus className="mr-2 h-4 w-4" />Reatribuir</DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMoveTask(task)}><FolderInput className="mr-2 h-4 w-4" />Mover para outro projeto</DropdownMenuItem>
              {/* Atalho do lote no menu da própria linha: quem marcou várias
                  tarefas e abre os 3 pontinhos espera mover todas de uma vez. */}
              {isSelected && selectedTaskIds.size > 1 && (
                <DropdownMenuItem onClick={onMoveSelected}>
                  <FolderInput className="mr-2 h-4 w-4" />Mover {selectedTaskIds.size} tarefas selecionadas
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={() => onDeleteTask(task.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {isExpanded && children.map(child => renderTask(child, depth + 1))}
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

  const allOsExpanded = sortedHierarchy.every(group => expanded.has(`os:${group.id}`));
  const toggleAll = () => {
    if (allOsExpanded) {
      setExpanded(new Set());
      return;
    }
    // Abre somente o nivel das OS; projetos, tarefas e subtarefas seguem fechados.
    setExpanded(previous => {
      const next = new Set(previous);
      sortedHierarchy.forEach(group => next.add(`os:${group.id}`));
      return next;
    });
  };

  return <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      {selectedTaskIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-primary/5 px-3 py-1.5">
          <span className="text-sm font-medium">{selectedTaskIds.size} tarefa(s) selecionada(s)</span>
          <Button size="sm" variant="secondary" className="h-7 gap-2" onClick={onMoveSelected}>
            <FolderInput className="h-3.5 w-3.5" />Mover para outro projeto
          </Button>
          <Button size="sm" variant="ghost" className="h-7" onClick={() => onToggleSelection([...selectedTaskIds], false)}>
            Limpar seleção
          </Button>
        </div>
      )}
      <Button variant="outline" size="sm" onClick={toggleAll} className="ml-auto gap-2">
        {allOsExpanded ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}
        {allOsExpanded ? 'Recolher tudo' : 'Expandir tudo'}
      </Button>
    </div>
    <div className="overflow-x-auto rounded-xl border bg-card shadow-sm">
    <div className={cn(GRID, 'border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground')}>
      <div className="px-4 py-2.5">Nome</div><div className="px-3 py-2.5">Status</div><div className="px-3 py-2.5">Responsável</div>
      <button type="button" onClick={() => cycleSort('prazo')} className={cn('flex items-center gap-1 px-3 py-2.5 uppercase tracking-wider transition-colors hover:text-foreground', sort.column === 'prazo' ? 'text-foreground' : '')}>Prazo{sortIcon('prazo')}</button>
      <div className="px-3 py-2.5" title="Horas realizadas/estimadas. Alerta nas tarefas concluídas sem horas apontadas.">Esforço</div>
      <button type="button" onClick={() => cycleSort('progresso')} className={cn('flex items-center justify-end gap-1 px-3 py-2.5 uppercase tracking-wider transition-colors hover:text-foreground', sort.column === 'progresso' ? 'text-foreground' : '')}>Progresso{sortIcon('progresso')}</button>
      <div />
    </div>
    {sortedHierarchy.map((group, index) => {
      const groupId = `os:${group.id}`;
      const isExpanded = expanded.has(groupId);
      const showClientDivider = index === 0 || sortedHierarchy[index - 1].clientKey !== group.clientKey;
      return <Fragment key={group.id}>
        {showClientDivider && <div className={cn('flex items-center gap-2 border-b border-t bg-muted/60 px-4 py-2.5 first:border-t-0', FULL_ROW_MIN_WIDTH)}>
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold uppercase tracking-wider text-foreground">{group.clientName}</span>
          <span className="text-xs text-muted-foreground">{sortedHierarchy.filter(item => item.clientKey === group.clientKey).length} OS/grupo(s)</span>
        </div>}
        <section>
        <div className={cn(GRID, 'border-b bg-primary/[0.045]')}>
          <div className="flex min-w-0 items-center gap-3 px-3 py-3">
            <button type="button" onClick={() => toggle(groupId)} className="rounded p-1 text-muted-foreground hover:bg-primary/10" aria-label={isExpanded ? 'Recolher OS' : 'Expandir OS'}>{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
            <div className="h-5 w-1 rounded-full bg-primary" />
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span className="truncate font-semibold">{group.os?.numero_os ? `${group.os.numero_os}${group.os.produtos ? ` - ${group.os.produtos}` : ''}` : (group.hasLinkedOs ? 'OS vinculada' : 'Sem OS')}</span><Badge variant="outline" className="shrink-0 font-normal">{group.projects.length} {group.projects.length === 1 ? 'projeto' : 'projetos'}</Badge></div><p className="truncate text-xs text-muted-foreground">{group.os ? group.os.cliente_nome : group.hasLinkedOs ? 'Carregando dados da ordem de serviço vinculada' : 'Projetos e tarefas agrupados sem ordem de serviço'}</p></div>
          </div>
          <div />
          <div />
          <div className="flex items-center gap-1.5 px-3 text-xs text-muted-foreground">{group.os?.data_fim ? <><CalendarDays className="h-3.5 w-3.5" />{dateLabel(group.os.data_fim)}</> : 'Sem prazo'}</div>
          <EsforcoAgregadoCell esforco={group.esforco} />
          <div className="flex items-center justify-end gap-2 px-3 text-xs font-medium text-muted-foreground">
            <Progress value={completionPercentage(group.completedTaskCount, group.taskCount)} className="h-1.5 w-16 bg-primary/15" />
            <span className="shrink-0">{completedTasksLabel(group.completedTaskCount, group.taskCount)}</span>
          </div>
          <div />
        </div>
        {isExpanded && group.projects.map(projectNode => {
          const projectId = `project:${projectNode.project?.id || '__without_project__'}`;
          const projectExpanded = expanded.has(projectId);
          const projectTaskIds = collectNodeTaskIds(projectNode.tasks);
          const selectedInProject = projectTaskIds.filter(id => selectedTaskIds.has(id)).length;
          return <div key={projectId}>
            <div className={cn(GRID, 'group relative z-10 bg-muted/30 text-sm shadow-md hover:bg-muted/45')}>
              <div className="relative flex min-w-0 items-center gap-2 px-4 py-2.5" style={{ paddingLeft: `${PROJECT_INDENT}px` }}>
                <LevelGuide left={OS_GUIDE} />
                <span className={TOGGLE_SLOT}>
                  <button type="button" onClick={() => toggle(projectId)} className="rounded p-0.5 text-muted-foreground hover:bg-muted" aria-label={projectExpanded ? 'Recolher projeto' : 'Expandir projeto'}>{projectExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
                </span>
                <span className={CHECK_SLOT}>
                  {projectTaskIds.length > 0 && <Checkbox
                    checked={selectedInProject === 0 ? false : selectedInProject === projectTaskIds.length ? true : 'indeterminate'}
                    onCheckedChange={checked => onToggleSelection(projectTaskIds, checked === true)}
                    aria-label={`Selecionar as ${projectTaskIds.length} tarefa(s) do projeto`}
                  />}
                </span>
                <FolderKanban className="h-4 w-4 shrink-0 text-primary" />
                <button type="button" disabled={!projectNode.project} onClick={() => projectNode.project && onEditProject(projectNode.project)} title={projectNode.project?.name} className="truncate text-left font-semibold hover:underline disabled:no-underline">{projectNode.project ? shortProjectName(projectNode.project.name, group.clientName, group.os?.numero_os) : 'Sem projeto'}</button>
                <ContadorTarefas total={projectNode.taskCount} concluidas={projectNode.completedTaskCount} />
              </div>
              {/* Pílula de status do projeto: a mesma fonte do modal de projeto
                  (projectStatusConfig). O mapa local que existia aqui divergia
                  dela — pintava "Ativo" de azul e "Concluído" de verde, o oposto. */}
              <div className="flex items-center px-3">{projectNode.project && <span className={cn('rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide', projectStatusConfig(projectNode.project.status).badge)}>{projectStatusConfig(projectNode.project.status).label}</span>}</div>
              <div className="flex items-center px-3 text-xs text-muted-foreground"><span className="truncate">{projectNode.project?.responsible ? `${projectNode.project.responsible.first_name} ${projectNode.project.responsible.last_name}`.trim() : 'Não atribuído'}</span></div>
              <div />
              <EsforcoAgregadoCell esforco={projectNode.esforco} />
              <div className="flex items-center justify-end gap-2 px-3 text-xs font-medium text-muted-foreground">
                <Progress value={completionPercentage(projectNode.completedTaskCount, projectNode.taskCount)} className="h-1.5 w-16 bg-primary/15" />
                <span className="shrink-0">{completedTasksLabel(projectNode.completedTaskCount, projectNode.taskCount)}</span>
              </div>
              <div className="flex items-center justify-center">{projectNode.project && <DropdownMenu>
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onNewTask(projectNode.project!.id)}><Plus className="mr-2 h-4 w-4" />Nova tarefa</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditProject(projectNode.project!)}><Edit3 className="mr-2 h-4 w-4" />Editar projeto</DropdownMenuItem>
                  {/* Consolidar projeto legado no projeto certo: leva a carteira
                      inteira de uma vez, sem marcar tarefa por tarefa. */}
                  {projectTaskIds.length > 0 && <DropdownMenuItem onClick={() => onMoveProjectTasks(projectTaskIds)}>
                    <FolderInput className="mr-2 h-4 w-4" />Mover as {projectTaskIds.length} tarefas para outro projeto
                  </DropdownMenuItem>}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-destructive" onClick={() => onDeleteProject(projectNode.project!.id)}><Trash2 className="mr-2 h-4 w-4" />Excluir projeto</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>}</div>
            </div>
            {projectExpanded && <>{projectNode.tasks.map(node => renderTask(node, 0))}{projectNode.project && <button type="button" onClick={() => onNewTask(projectNode.project!.id)} className={cn('flex items-center gap-2 border-t py-2 pl-[60px] pr-4 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground', FULL_ROW_MIN_WIDTH)}><Plus className="h-3.5 w-3.5" />Adicionar tarefa</button>}</>}
          </div>;
        })}
        </section>
      </Fragment>;
    })}
    </div>
  </div>;
}
