import { Fragment, useMemo, useState, type ReactNode } from 'react';
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
  ListPlus,
  MoreHorizontal,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react';
import type { AreaKey } from '@/config/areaCategories';
import { toast } from 'sonner';
import { AreaLoader } from '@/components/equipe/AreaLoader';
import { Badge } from '@/components/ui/badge';
import { BulkActionBar } from '@/components/ui/bulk-action-bar';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { OrgProject } from '@/hooks/useOrgProjects';
import type { ProjectAssignee } from '@/hooks/useOrgProjectAssignees';
import { type OrgTask, type OrgTaskStatus, useUpdateOrgTask } from '@/hooks/useOrgTasks';
import { cn } from '@/lib/utils';
import { parseDate } from '@/lib/dateUtils';
import { projectStatusConfig } from '@/lib/projetoStatusColors';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import { prazoDaFilhaEstoura } from '@/lib/orgTaskPrazo';
import {
  buildProjetosTarefasHierarchy,
  shortProjectName,
  type ProjetosTarefasTaskNode,
} from '@/lib/projetosTarefasHierarchy';
import { TaskCompletionHoursDialog } from '@/components/equipe/fiscal/tasks/TaskCompletionHoursDialog';
import { TaskStatusTransitionDialog } from '@/components/equipe/fiscal/tasks/TaskStatusTransitionDialog';
 import { useTaskCompletionHours } from '@/hooks/useTaskCompletionHours';
 import { useTaskStatusTransition } from '@/hooks/useTaskStatusTransition';
import { BarraDeMes } from '@/components/shared/BarraDeMes';
import type { PeriodoDeTarefas } from '@/hooks/usePeriodoDeTarefas';
import { mensagemDoVazio } from '@/lib/periodoDeTarefas';
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
  /**
   * Redisparo da geração de tarefas do produto num projeto que já existe.
   *
   * A geração acontece sozinha ao criar o projeto; isto é para o projeto criado
   * antes de o catálogo do produto existir, e para o catálogo que ganhou item
   * novo depois. A chamada é idempotente: rodar de novo não duplica nada.
   */
  onGerarTarefas: (project: OrgProject) => void;
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
  /** O mes e do painel: ele atravessa Lista, Tabela e Calendario. */
  periodo: PeriodoDeTarefas;
  /**
   * Candidatos do seletor de responsável, por projeto: só a gente do projeto
   * (membros, responsável e líder), nunca o quadro inteiro da área — ver
   * `useOrgProjectAssignees`. Projeto sem candidatos: a célula só lê.
   */
  assigneesByProject?: Record<string, ProjectAssignee[]>;
  /**
   * Responsável e prazo são campos fora do trio status/horas/revisor: quem não
   * criou a tarefa e não é líder não consegue gravá-los (RLS-06). Sem o gate a
   * lista ofereceria um seletor que o banco recusa. Ver `canEditOrgTaskFields`.
   */
  canEditTaskFields?: (task: OrgTask) => boolean;
}

/**
 * A grade das quatro linhas (OS, projeto, tarefa, subtarefa).
 *
 * No desktop são sete colunas somando 1.200px de piso. Num celular de 358px
 * úteis cabia a PRIMEIRA — o nome — e status, responsável, prazo, esforço e
 * progresso ficavam todos fora, alcançáveis só arrastando de lado.
 *
 * Abaixo de `md` a linha deixa de ser grade e vira **faixa de chips**: o nome
 * ocupa a largura inteira e as outras seis células fluem em `flex-wrap`, cada
 * uma do tamanho do seu conteúdo. O cartão sai do refluxo, sem remontar JSX
 * nenhum — e a borda que já separava as linhas passa a separar os cartões.
 *
 *   ▸ ☐ ● Título da tarefa
 *   [A FAZER]  usuario teste  📅 18 set  1h est.  ⋯
 *
 * Duas colunas foi a primeira tentativa, e foi reprovada: cada célula ocupava
 * metade da largura e o conteúdo dela ficava na borda esquerda, então sobrava um
 * vão morto no meio de cada linha — o `⌄` do seletor de status pousava a 90px do
 * chip. Somando os três pares, a tarefa gastava ~140px de altura para mostrar
 * seis campos curtos. Nas palavras dela: "as tarefas estão muito grandes, sem
 * definir bem a formatação, o contorno".
 *
 * Nada é escondido: o gestor vê os seis campos sem arrastar. O cabeçalho de
 * coluna é que sai (`max-md:hidden` na linha dele) — rótulo de coluna não
 * significa nada depois do refluxo, e cada célula se explica: o status é chip
 * colorido, o prazo tem ícone de calendário, o esforço traz o "h".
 */
const GRID =
  'grid grid-cols-[minmax(320px,1fr)_150px_180px_130px_140px_160px_44px] min-w-[1200px]' +
  ' max-md:flex max-md:min-w-0 max-md:flex-wrap max-md:items-center' +
  // `gap-y` também, e não só `gap-x`: quando os chips não cabem numa linha eles
  // quebram, e sem folga vertical as duas linhas se encostam. É a diferença que
  // faltava para a tela bater com o espécime A escolhido em 09/09.
  ' max-md:gap-x-1.5 max-md:gap-y-1 max-md:py-1' +
  // Aperta o recuo de TODAS as células de uma vez, em vez de caçar cada uma:
  // `px-3 py-1.5` por célula é o que engordava o cartão.
  ' max-md:[&>*]:px-2 max-md:[&>*]:py-0.5';

/** A célula do nome ocupa a largura inteira; as outras encolhem para o conteúdo. */
const CELULA_NOME = 'max-md:w-full';
/** Radix Select não aceita valor vazio: o "não atribuído" precisa de sentinela. */
const SEM_RESPONSAVEL = '_none';
/** Faixas que atravessam a tabela inteira (divisor de cliente, "adicionar tarefa"). */
const FULL_ROW_MIN_WIDTH = 'min-w-[1150px] max-md:min-w-0';

/**
 * Recuos da coluna Nome, em px, e slots de largura fixa para seta e caixa de
 * seleção. Cada nível reserva os mesmos slots ainda que estejam vazios: era a
 * caixa de seleção condicional (só aparece em projeto com tarefa) que empurrava
 * a linha 24px para a direita e fazia o projeto parecer filho do de cima.
 */
const PROJECT_INDENT = 36;
const TASK_INDENT = 60;
const INDENT_STEP = 24;
/**
 * Os mesmos recuos em tela estreita. 60px de base sobre 358px de tela é um sexto
 * da largura gasto antes da primeira letra, e cada nível comeria 24px a mais —
 * a subtarefa de segundo nível começaria em 108px.
 *
 * A primeira tentativa (8/12/+10) foi rejeitada na validação: "parece que está
 * tudo no mesmo nível, não tem profundidade". Ela estava certa, e por dois
 * motivos somados — o degrau curto quase não se via, E as guias verticais
 * tinham sido escondidas no celular. Recuo sozinho já é ambíguo no desktop (é o
 * que o comentário do `LevelGuide` diz); sem guia nenhuma e com degrau de 4px de
 * diferença, os quatro níveis viram um.
 *
 * Agora os degraus se distinguem a olho e as guias voltam, com posição própria.
 */
const PROJECT_INDENT_ESTREITO = 10;
const TASK_INDENT_ESTREITO = 26;
/**
 * 20px, e não 14: com 14 a subtarefa ficava a um empurrão da mãe e lia como
 * tarefa irmã — "eu abro a tarefa e as subtarefas parecem outras tarefas"
 * (09/09). Degrau sozinho não resolve, mas degrau pequeno garante que nada
 * resolva; o que fecha o caso é o `CotoveloDaFilha`, abaixo.
 */
const INDENT_STEP_ESTREITO = 20;
const TOGGLE_SLOT = 'flex h-5 w-5 shrink-0 items-center justify-center';
/**
 * A caixa de seleção em massa (mover várias tarefas de uma vez) é cromo de
 * EDIÇÃO, e no celular esta tela é superfície de leitura — decisão de 09/09.
 * `max-md:hidden`: ela ocupava um glifo à esquerda de cada título, somava com a
 * seta e com o ponto de status, e não serve para quem só olha.
 */
const CHECK_SLOT = 'flex h-4 w-4 shrink-0 items-center justify-center max-md:hidden';
/** x das guias verticais: o centro da seta do nível imediatamente acima. */
const OS_GUIDE = 24;
const PROJECT_GUIDE = PROJECT_INDENT + 10;
/** As mesmas guias no degrau curto: o centro da seta do nível acima. */
const OS_GUIDE_ESTREITO = 4;
const PROJECT_GUIDE_ESTREITO = PROJECT_INDENT_ESTREITO + 6;

/**
 * Guia vertical do nível. Recuo sozinho é ambíguo — a linha indentada parece
 * filha da linha de cima; a guia mostra de qual bloco ela desce.
 */
function LevelGuide({ left, leftEstreito }: { left: number; leftEstreito: number }) {
  // Duas posições, uma por breakpoint: o `left` do desktop é medido contra o
  // recuo largo e cairia por cima do texto no degrau curto. Esconder a guia no
  // celular foi a primeira tentativa, e é o que tirou a profundidade da tela.
  return (
    <span
      aria-hidden
      // No celular o fio também sobe de tinta: `border/60` dava 1,14:1, que não
      // é linha, é nada. `/35` dá 1,62:1 — perceptível, e um degrau bem abaixo
      // do 4,29:1 do cotovelo, de propósito: o fio é contexto, o cotovelo é a
      // informação.
      className="pointer-events-none absolute inset-y-0 border-l border-border/60 max-md:border-muted-foreground/35 left-[var(--guia)] max-md:left-[var(--guia-estreita)]"
      style={{ '--guia': `${left}px`, '--guia-estreita': `${leftEstreito}px` } as React.CSSProperties}
    />
  );
}

/**
 * O cotovelo que entra na linha da subtarefa, saindo do fio da mãe.
 *
 * Fio reto diz "existe um bloco aqui"; cotovelo diz "ESTA linha desce
 * daquela". É a diferença que faltava no celular: com recuo curto e a mesma
 * superfície branca, subtarefa lia como tarefa irmã. Mesmo idioma do painel de
 * comentários, que resolve o mesmo problema para resposta dentro de comentário
 * (ver `data-thread-connector` em `OrgCommentsPanel`).
 *
 * Só abaixo de `md`. No desktop há 24px de degrau e as guias inteiras, e a
 * hierarquia já se lê — e este plano promete não mexer no desktop.
 */
function CotoveloDaFilha({ nivel }: { nivel: number }) {
  return (
    <span
      aria-hidden
      /*
        A cor saiu de `border` e a opacidade é MEDIDA, não escolhida.

        Na Tax o `--border` é `170 16% 89%`, quase branco: o cotovelo original
        dava **1,25:1** de contraste sobre a superfície branca da tarefa, o que
        é invisível de fato — "esse cantinho tá muito claro, não consigo
        enxergar" (09/09). O `--muted-foreground` da área é `185 8% 40.5%`,
        tinta de texto.

        `/90` porque o piso da WCAG para elemento gráfico que CARREGA
        informação é 3:1, e o cotovelo carrega — ele é quem diz de que linha
        esta desce. A 70% dá 2,90:1 e não passa (foi a primeira tentativa deste
        conserto); a 90% dá **4,29:1**. Os números estão no teste, que é o único
        jeito de isto não voltar a apagar em silêncio.

        Este elemento só existe abaixo de `md` (`hidden max-md:block`), então a
        cor não precisa de prefixo: ela nunca alcança o desktop.
      */
      className="pointer-events-none absolute top-0 hidden h-[13px] rounded-bl-md border-b-2 border-l-2 border-muted-foreground/90 max-md:block left-[var(--cotovelo)] w-[var(--cotovelo-largura)]"
      style={{
        // Sai do fio da MÃE, um nível acima.
        '--cotovelo': `${PROJECT_GUIDE_ESTREITO + (nivel - 1) * INDENT_STEP_ESTREITO}px`,
        // E entra até 4px antes de onde o conteúdo da filha começa. A conta é
        // `recuo da filha − fio da mãe`, e dá o mesmo em qualquer nível porque
        // os dois andam com o mesmo degrau: cotovelo curto sobrava um vão de
        // 14px entre o fio e a linha, e o vão desfaz o "desce daqui".
        '--cotovelo-largura': `${TASK_INDENT_ESTREITO + INDENT_STEP_ESTREITO - PROJECT_GUIDE_ESTREITO - 4}px`,
      } as React.CSSProperties}
    />
  );
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

/**
 * Texto da linha de OS: número mais produtos. Sai daqui e não do JSX porque o
 * mesmo texto vai no tooltip — a linha corta em duas e o resto se lê no hover.
 */
function tituloDaOs(group: { os: ProjetosTarefasOs | null; hasLinkedOs: boolean }) {
  if (group.os?.numero_os) return `${group.os.numero_os}${group.os.produtos ? ` - ${group.os.produtos}` : ''}`;
  return group.hasLinkedOs ? 'OS vinculada' : 'Sem OS';
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
  onGerarTarefas,
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
  periodo,
  assigneesByProject = {},
  canEditTaskFields = () => true,
}: ProjetosTarefasListProps) {
  const hierarchy = useMemo(
    () => buildProjetosTarefasHierarchy(projects, tasks, osRows, search, hideEmpty),
    [projects, tasks, osRows, search, hideEmpty],
  );
  const updateTask = useUpdateOrgTask(area);
  const conclusao = useTaskCompletionHours();
  const transicao = useTaskStatusTransition();
  // Expansao opt-in: abrir uma linha revela apenas os filhos diretos, ja fechados.
  // Assim expandir uma OS mostra os projetos sem despejar tarefas e subtarefas.
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [sort, setSort] = useState<{ column: 'prazo' | 'progresso' | null; dir: 'asc' | 'desc' }>({ column: null, dir: 'asc' });
  // Só um calendário aberto por vez, e ele fecha ao escolher a data — o Popover
  // não fecha sozinho no clique de dentro.
  const [prazoAberto, setPrazoAberto] = useState<string | null>(null);

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
    if (status === task.status) return;
    // Revisão e ajuste passam pelo diálogo (revisor e detalhamento obrigatórios),
    // igual ao quadro: é ele quem grava.
    if (!transicao.pedirDetalhes(task, status)) return;
    if (status === 'done' && isDelegatedOrgTaskReviewer(task, currentUserId)) {
      toast.error('O revisor não pode concluir a tarefa. Devolva-a para ajustes.');
      return;
    }
    if (status === 'done' && !conclusao.pedirHoras(task)) return;
    updateTask.mutate({ id: task.id, status });
  };

  const updateResponsavel = (task: OrgTask, value: string, candidatos: ProjectAssignee[]) => {
    const member = value === SEM_RESPONSAVEL ? null : candidatos.find(item => item.id === value);
    if (value !== SEM_RESPONSAVEL && !member) return;
    if ((member?.id ?? null) === task.assigned_to) return;
    updateTask.mutate({
      id: task.id,
      assigned_to: member?.id ?? null,
      assigned_to_name: member?.name ?? null,
    });
  };

  /**
   * Candidatos da linha: a gente do projeto, mais quem já está com a tarefa. O
   * responsável atual entra porque tarefa antiga (ou movida de projeto) pode
   * estar com alguém que saiu da equipe do projeto — sem ele o seletor abriria
   * sem o próprio valor selecionado.
   */
  const candidatosDeResponsavel = (task: OrgTask): ProjectAssignee[] => {
    const doProjeto = (task.project_id && assigneesByProject[task.project_id]) || [];
    // Projeto sem gente (ou tarefa sem projeto) não vira seletor de uma opção só:
    // oferecer apenas "não atribuído" não é escolher responsável.
    if (doProjeto.length === 0) return [];
    if (!task.assigned_to || doProjeto.some(item => item.id === task.assigned_to)) return doProjeto;
    return [...doProjeto, { id: task.assigned_to, name: task.assigned_to_name || 'Responsável atual' }];
  };

  const updatePrazo = (task: OrgTask, date: Date | undefined) => {
    setPrazoAberto(null);
    if (!date) return;
    const iso = format(date, 'yyyy-MM-dd');
    if (iso === task.due_date) return;
    updateTask.mutate({ id: task.id, due_date: iso });
  };

  /**
   * `prazoDaMae` desce na recursão porque a regra é local: a filha não vence
   * depois da MÃE dela, e não depois da raiz da árvore. Na linha ele só apaga
   * os dias no calendário — quem recusa de verdade é `useUpdateOrgTask`, que
   * busca a mãe no banco (a lista da tela vem recortada por mês).
   */
  const renderTask = (node: ProjetosTarefasTaskNode, depth: number, prazoDaMae?: string | null): React.ReactNode => {
    const { task, children } = node;
    const rowId = `task:${task.id}`;
    const isExpanded = expanded.has(rowId);
    const isSelected = selectedTaskIds.has(task.id);
    const podeEditar = canEditTaskFields(task);
    const candidatos = candidatosDeResponsavel(task);
    const atrasada = !!task.due_date && parseDate(task.due_date) < new Date() && task.status !== 'done';
    return <Fragment key={task.id}>
      {/* A tarefa fica BRANCA de propósito: é o contraste contra as duas
          superfícies tintas acima dela que diz que ela é o nível de baixo. */}
      <div className={cn(GRID, 'group border-t border-border/60 text-sm hover:bg-muted/30', isSelected ? 'bg-primary/5' : 'bg-background')}>
        {/* O recuo vai por variável CSS, e não por `paddingLeft` direto: estilo
            inline não tem breakpoint, e o número do desktop é largura demais
            para um celular. */}
        <div
          className={cn(CELULA_NOME, 'relative flex min-w-0 items-center gap-2 px-4 py-2 pl-[var(--recuo)] max-md:pl-[var(--recuo-estreito)]')}
          style={{
            '--recuo': `${TASK_INDENT + depth * INDENT_STEP}px`,
            '--recuo-estreito': `${TASK_INDENT_ESTREITO + depth * INDENT_STEP_ESTREITO}px`,
          } as React.CSSProperties}
        >
          {/* As guias verticais são posicionadas em px contra o recuo largo, e
              no degrau curto elas cairiam no meio do texto. A hierarquia no
              celular fica com as linhas de OS e de projeto, que são cabeçalho
              de bloco, mais o recuo. */}
          {Array.from({ length: depth + 1 }, (_, level) => (
            <LevelGuide
              key={level}
              left={PROJECT_GUIDE + level * INDENT_STEP}
              leftEstreito={PROJECT_GUIDE_ESTREITO + level * INDENT_STEP_ESTREITO}
            />
          ))}
          {depth > 0 && <CotoveloDaFilha nivel={depth} />}
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
          {/* `max-md:hidden`: o chip de status na faixa de chips já nomeia o
              estado. Ponto colorido MAIS chip colorido é a mesma informação
              duas vezes, e num telefone dois sinais de cor por linha viram
              poluição. No desktop o ponto vale: lá o chip está longe, na coluna
              de status, a 320px de distância do título. */}
          <TaskStatusDot status={task.status} className="max-md:hidden" />
          {/* A filha pesa menos que a mãe: no celular ela vem um degrau abaixo
              no tamanho e sem o `font-medium`. É a terceira pista da escadinha,
              junto do recuo e do cotovelo — e a única que funciona mesmo quando
              a subtarefa é a primeira coisa que se vê ao rolar. O desktop
              mantém as duas iguais, que é como sempre foi. */}
          <button
            type="button"
            title={task.title}
            className={cn(
              'line-clamp-2 break-words text-left text-foreground hover:underline',
              depth > 0 ? 'font-medium max-md:text-[0.8125rem] max-md:font-normal' : 'font-medium',
            )}
            onClick={() => onEditTask(task)}
          >
            {task.title}
          </button>
          <ContadorTarefas total={children.length} concluidas={children.filter(child => child.task.status === 'done').length} />
        </div>
        <div className="flex items-center px-3 py-1.5">
          <Select value={task.status} onValueChange={value => updateStatus(task, value as OrgTaskStatus)}>
            {/* `max-md:w-auto`: os 138px fixos punham o `⌄` na borda oposta do
                chip, com um vão morto no meio. Na faixa de chips o seletor
                encolhe para o próprio conteúdo. */}
            {/* `max-md:[&>svg]:hidden` esconde o chevron, não o seletor: o chip
                continua abrindo no toque, e o que sai é o glifo. Dois chevrons
                por linha, vezes as tarefas da tela, era metade da poluição. */}
            <SelectTrigger className="h-6 w-[138px] max-md:w-auto max-md:[&>svg]:hidden border-0 bg-transparent px-1 shadow-none focus:ring-0 [&>span]:!line-clamp-none [&>span]:whitespace-nowrap [&>span]:overflow-visible">
              <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-normal', statusColors[task.status].combined)}>{statusColors[task.status].label}</span>
            </SelectTrigger>
            <SelectContent>{statusList.map(status => <SelectItem key={status.key} value={status.key}>{status.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="flex min-w-0 items-center px-3 py-1.5">
          {podeEditar && candidatos.length > 0
            ? <Select value={task.assigned_to ?? SEM_RESPONSAVEL} onValueChange={value => updateResponsavel(task, value, candidatos)}>
                <SelectTrigger aria-label={`Responsável por ${task.title}`} className="h-6 max-md:[&>svg]:hidden border-0 bg-transparent px-1 text-xs shadow-none focus:ring-0">
                  <span title={task.assigned_to_name || 'Não atribuído'} className={cn('truncate', !task.assigned_to && 'text-muted-foreground')}>{task.assigned_to_name || 'Não atribuído'}</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SEM_RESPONSAVEL}>Não atribuído</SelectItem>
                  {candidatos.map(member => <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>)}
                </SelectContent>
              </Select>
            : <span title={task.assigned_to_name || 'Não atribuído'} className="truncate text-xs text-muted-foreground">{task.assigned_to_name || 'Não atribuído'}</span>}
        </div>
        <div className={cn('flex items-center px-3 py-1.5 text-xs', atrasada ? 'font-medium text-destructive' : 'text-muted-foreground')}>
          {podeEditar
            ? <Popover open={prazoAberto === task.id} onOpenChange={open => setPrazoAberto(open ? task.id : null)}>
                <PopoverTrigger asChild>
                  <button type="button" aria-label={`Prazo de ${task.title}`} className="-mx-1 flex items-center gap-1.5 whitespace-nowrap rounded px-1 py-0.5 hover:bg-muted">
                    <CalendarDays className="h-3.5 w-3.5" />{dateLabel(task.due_date)}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-auto p-0">
                  <Calendar
                    selected={task.due_date ? parseDate(task.due_date) : undefined}
                    onSelect={date => updatePrazo(task, date)}
                    disabled={prazoDaMae
                      ? (date: Date) => prazoDaFilhaEstoura(format(date, 'yyyy-MM-dd'), prazoDaMae)
                      : undefined}
                  />
                </PopoverContent>
              </Popover>
            : <span className="flex items-center gap-1.5 whitespace-nowrap"><CalendarDays className="h-3.5 w-3.5" />{dateLabel(task.due_date)}</span>}
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
      {isExpanded && children.map(child => renderTask(child, depth + 1, task.due_date))}
    </Fragment>;
  };

  if (hierarchy.length === 0) {
    // A barra do mes fica POR CIMA do vazio: sem ela, um mes sem tarefas
    // prenderia a pessoa ali — o controle que a trouxe desapareceria junto.
    const comBarra = (conteudo: ReactNode) => <div className="space-y-2">
      <div className="overflow-hidden rounded-xl border bg-card shadow-sm"><BarraDeMes periodo={periodo} /></div>
      {conteudo}
    </div>;
    // Carregando vem ANTES dos vazios: a lista depende de várias consultas em
    // cadeia (escopo de cluster → projetos → tarefas → OS) e, sem este ramo,
    // o usuário lia "Nenhum projeto ou tarefa encontrado" durante toda a espera.
    // Só entra aqui quando não há NADA para mostrar — com dados parciais a lista
    // é renderizada normalmente e vai se completando.
    if (isLoading) {
      return comBarra(<div className="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
        <AreaLoader area={area} size={72} className="mx-auto block" />
        <p className="mt-3 font-medium">Carregando projetos e tarefas…</p>
      </div>);
    }
    // O RECORTE vem antes dos filtros porque ele também liga o `hideEmpty`, e a
    // causa mais específica é a que ajuda: "Nenhuma tarefa corresponde aos
    // filtros" com o drawer vazio faz a pessoa procurar filtro que não existe.
    // Dizer "crie um projeto" aqui seria pior ainda — o projeto está ali, fora
    // do recorte.
    const vazioDoRecorte = mensagemDoVazio(periodo);
    if (hideEmpty && !vazioDoRecorte) {
      return comBarra(<div className="rounded-xl border border-dashed py-16 text-center">
        <FilterX className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
        <p className="font-medium">Nenhuma tarefa corresponde aos filtros</p>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Clientes, OS e projetos sem tarefas correspondentes ficam ocultos. Limpe os filtros para ver toda a estrutura.</p>
        {onClearFilters && <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={onClearFilters}><FilterX className="h-4 w-4" />Limpar filtros</Button>}
      </div>);
    }
    if (vazioDoRecorte) {
      return comBarra(<div className="rounded-xl border border-dashed py-16 text-center">
        <FolderKanban className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" />
        <p className="font-medium">{vazioDoRecorte}</p>
        {/* Sem botão aqui: o "Ver tudo" da barra está logo acima, e duas saídas
            com o mesmo nome na mesma tela não são duas saídas. */}
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">O recorte está no título. Use "Ver tudo", na barra acima, para o projeto inteiro.</p>
      </div>);
    }
    return comBarra(<div className="rounded-xl border border-dashed py-16 text-center"><FolderKanban className="mx-auto mb-3 h-9 w-9 text-muted-foreground/50" /><p className="font-medium">Nenhum projeto ou tarefa encontrado</p><p className="mt-1 text-sm text-muted-foreground">Crie um novo projeto para começar.</p></div>);
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
      <BulkActionBar
        count={selectedTaskIds.size}
        label={n => `${n} tarefa(s) selecionada(s)`}
        onClear={() => onToggleSelection([...selectedTaskIds], false)}
        actions={[{
          label: 'Mover para outro projeto',
          icon: <FolderInput className="h-3.5 w-3.5" />,
          onClick: onMoveSelected,
        }]}
      />
      <Button variant="outline" size="sm" onClick={toggleAll} className="ml-auto gap-2">
        {allOsExpanded ? <ChevronsUp className="h-4 w-4" /> : <ChevronsDown className="h-4 w-4" />}
        {allOsExpanded ? 'Recolher tudo' : 'Expandir tudo'}
      </Button>
    </div>
    <div className="overflow-x-auto overflow-y-hidden rounded-xl border bg-card">
    <BarraDeMes periodo={periodo} />
    {/* Rótulo de coluna não significa nada depois do refluxo em duas colunas. */}
    <div className={cn(GRID, 'max-md:hidden border-b bg-muted/40 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground')}>
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
        {/* A faixa do cliente carrega a ÂNCORA da área, e não o neutro. Ela era
            `bg-muted/60` e a linha da OS logo abaixo era `bg-primary/[0.045]`:
            compostas sobre o card ficavam a 1,02:1 uma da outra — menos que o
            1,24:1 com que a borda de 1px se separa do card. A faixa é o
            cabeçalho do bloco, então é ela que recebe a cor da área e a linha
            da OS volta ao card limpo. */}
        {showClientDivider && <div className={cn('flex items-center gap-2 border-b border-t border-primary/20 bg-primary/10 px-4 py-2.5 first:border-t-0', FULL_ROW_MIN_WIDTH)}>
          <Building2 className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold uppercase tracking-wider text-foreground">{group.clientName}</span>
          <span className="text-xs text-muted-foreground">{sortedHierarchy.filter(item => item.clientKey === group.clientKey).length} OS/grupo(s)</span>
        </div>}
        <section>
{/* No celular a tinta sobe e ganha trilho: `primary/[0.045]` é
            invisível num telefone, e sem separar as superfícies os quatro
            níveis leem como um. Trilho grosso na âncora = o nível mais alto. */}
        <div className={cn(GRID, 'border-b bg-primary/[0.045]', 'max-md:border-l-4 max-md:border-l-primary max-md:bg-primary/10')}>
          <div className={cn(CELULA_NOME, 'flex min-w-0 items-center gap-3 px-3 py-3')}>
            <button type="button" onClick={() => toggle(groupId)} className="rounded p-1 text-muted-foreground hover:bg-primary/10" aria-label={isExpanded ? 'Recolher OS' : 'Expandir OS'}>{isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}</button>
            <div className="h-5 w-1 rounded-full bg-primary" />
            <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><span title={tituloDaOs(group)} className="line-clamp-2 break-words font-semibold">{tituloDaOs(group)}</span><Badge variant="outline" className="shrink-0 font-normal">{group.projects.length} {group.projects.length === 1 ? 'projeto' : 'projetos'}</Badge></div><p title={group.os?.cliente_nome} className="truncate text-xs text-muted-foreground">{group.os ? group.os.cliente_nome : group.hasLinkedOs ? 'Carregando dados da ordem de serviço vinculada' : 'Projetos e tarefas agrupados sem ordem de serviço'}</p></div>
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
{/* O fundo sai do neutro e vai para a âncora, na mesma família da
                faixa do cliente. Na OSG a superfície é bege (matiz 32) e a
                âncora é musgo (149): com a faixa verde logo acima, o neutro
                quente encostado nela era lido como ROSA — contraste simultâneo,
                o mesmo efeito do `--muted-foreground` matiz 220 sobre marfim.
                `bg-primary/5` é o degrau que a linha de tarefa selecionada já
                usa. No celular a tinta sobe e ganha trilho mais discreto que o
                da OS. */}
            {/* A sombra saiu junto com o `z-10`, que só existia para levantá-la
                acima dos vizinhos: quem separa a linha agora é o preenchimento,
                e a sombra virava reforço de uma coisa já dita — sombra preta
                neutra sobre superfície quente ainda por cima acinzenta. */}
            <div className={cn(GRID, 'group bg-primary/5 text-sm hover:bg-primary/10', 'max-md:border-l-4 max-md:border-l-primary/35 max-md:bg-muted/70')}>
              <div
                className={cn(CELULA_NOME, 'relative flex min-w-0 items-center gap-2 px-4 py-2.5 pl-[var(--recuo)] max-md:pl-[var(--recuo-estreito)]')}
                style={{
                  '--recuo': `${PROJECT_INDENT}px`,
                  '--recuo-estreito': `${PROJECT_INDENT_ESTREITO}px`,
                } as React.CSSProperties}
              >
                <LevelGuide left={OS_GUIDE} leftEstreito={OS_GUIDE_ESTREITO} />
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
                <button type="button" disabled={!projectNode.project} onClick={() => projectNode.project && onEditProject(projectNode.project)} title={projectNode.project?.name} className="line-clamp-2 break-words text-left font-semibold hover:underline disabled:no-underline">{projectNode.project ? shortProjectName(projectNode.project.name, group.clientName, group.os?.numero_os) : 'Sem projeto'}</button>
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
                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" aria-label="Ações do projeto" className="h-7 w-7 opacity-0 group-hover:opacity-100"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onNewTask(projectNode.project!.id)}><Plus className="mr-2 h-4 w-4" />Nova tarefa</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onEditProject(projectNode.project!)}><Edit3 className="mr-2 h-4 w-4" />Editar projeto</DropdownMenuItem>
                  {/* Redisparo da geração de tarefas do produto. Existe porque a
                      geração automática só alcança projeto criado DEPOIS dela —
                      e porque o catálogo do produto ganha item novo com o tempo.
                      Idempotente: a segunda chamada não cria nada. */}
                  <DropdownMenuItem onClick={() => onGerarTarefas(projectNode.project!)}>
                    <ListPlus className="mr-2 h-4 w-4" />Gerar tarefas do produto
                  </DropdownMenuItem>
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
            {projectExpanded && <>{projectNode.tasks.map(node => renderTask(node, 0))}{projectNode.project && <button type="button" onClick={() => onNewTask(projectNode.project!.id)} className={cn('flex items-center gap-2 border-t py-2 pl-[60px] pr-4 text-xs text-muted-foreground hover:bg-muted/30 hover:text-foreground max-md:pl-3', FULL_ROW_MIN_WIDTH)}><Plus className="h-3.5 w-3.5" />Adicionar tarefa</button>}</>}
          </div>;
        })}
        </section>
      </Fragment>;
    })}
    </div>
    <TaskCompletionHoursDialog task={conclusao.taskPendente} area={area} onClose={conclusao.fechar} />
    <TaskStatusTransitionDialog
      open={!!transicao.transicaoPendente}
      onOpenChange={nextOpen => { if (!nextOpen) transicao.fechar(); }}
      task={transicao.transicaoPendente?.task || null}
      status={transicao.transicaoPendente?.status || 'review'}
      area={area}
    />
  </div>;
}
