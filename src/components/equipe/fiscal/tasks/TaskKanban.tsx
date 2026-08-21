import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { TaskKanbanCard } from '@/components/equipe/fiscal/tasks/kanban/TaskKanbanCard';
import { TaskCompletionHoursDialog } from '@/components/equipe/fiscal/tasks/TaskCompletionHoursDialog';
 import { useTaskCompletionHours } from '@/hooks/useTaskCompletionHours';
import { TaskStatusTransitionDialog } from '@/components/equipe/fiscal/tasks/TaskStatusTransitionDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AreaKey } from '@/config/areaCategories';
import { OrgTask, OrgTaskStatus, useUpdateOrgTask } from '@/hooks/useOrgTasks';
import { canUpdateOrgTaskStatus, isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import {
  buildTaskKanbanColumns,
  parentToRevealAfterStatusChange,
} from '@/lib/taskKanbanHierarchy';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import { cn } from '@/lib/utils';

const BOARD_STATUSES = statusList.map((status) => status.key);

interface TaskKanbanProps {
  tasks: OrgTask[];
  area: AreaKey;
  onEdit: (task: OrgTask) => void;
  currentUserId?: string | null;
  isAdmin?: boolean;
  isLider?: boolean;
  isSublider?: boolean;
}

/**
 * Quadro de tarefas.
 *
 * A subtarefa é cidadã do quadro: quando o status dela difere do da mãe, ela
 * ganha card próprio na SUA coluna (ancorado no nome da mãe); quando está no
 * mesmo status, segue aninhada no card da mãe — que está naquela mesma coluna.
 * Assim é possível puxar uma filha para "Em Progresso" e deixar as irmãs em
 * "A Fazer", que era o que faltava: antes só a mãe era arrastável e todas as
 * filhas apareciam na coluna dela, qualquer que fosse o status delas.
 *
 * O contador do cabeçalho conta TAREFAS (cards + aninhadas), então bate com os
 * KPIs do topo da página; o "+N" ao lado diz quantas estão aninhadas e expande
 * os cards que as guardam.
 */
export const TaskKanban = ({
  tasks,
  area,
  onEdit,
  currentUserId,
  isAdmin,
  isLider,
  isSublider,
}: TaskKanbanProps) => {
  const [draggedTask, setDraggedTask] = useState<OrgTask | null>(null);
  const [dragOverStatus, setDragOverStatus] = useState<OrgTaskStatus | null>(null);
  const [pendingTransition, setPendingTransition] = useState<{
    task: OrgTask;
    status: 'review' | 'em_ajuste';
  } | null>(null);
  const conclusao = useTaskCompletionHours();
  const [expandedTasks, setExpandedTasks] = useState<Set<string>>(new Set());
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());
  const highlightTimeout = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef<{ speed: number; frame: number | null }>({ speed: 0, frame: null });
  const updateTask = useUpdateOrgTask(area);

  const stopAutoScroll = () => {
    if (autoScroll.current.frame !== null) window.cancelAnimationFrame(autoScroll.current.frame);
    autoScroll.current = { speed: 0, frame: null };
  };

  useEffect(
    () => () => {
      if (highlightTimeout.current) window.clearTimeout(highlightTimeout.current);
      stopAutoScroll();
    },
    [],
  );

  /**
   * Rola o quadro na horizontal quando o arrasto chega perto de uma borda.
   *
   * São 7 colunas em rolagem horizontal, e o arrasto HTML5 não rola o
   * contêiner: sem isso, não havia como levar um card da última coluna para a
   * primeira — a coluna de destino simplesmente não estava na tela. A rolagem
   * roda em requestAnimationFrame porque `dragover` dispara de forma irregular
   * (e continua disparando com o cursor parado), o que deixaria o movimento aos
   * trancos.
   */
  const stepAutoScroll = () => {
    const board = boardRef.current;
    if (!board || autoScroll.current.speed === 0) {
      autoScroll.current.frame = null;
      return;
    }
    board.scrollLeft += autoScroll.current.speed;
    autoScroll.current.frame = window.requestAnimationFrame(stepAutoScroll);
  };

  const updateAutoScroll = (clientX: number) => {
    const board = boardRef.current;
    if (!board) return;
    const { left, right } = board.getBoundingClientRect();
    const ZONA = 96;
    const VELOCIDADE_MAX = 22;
    // Quanto mais fundo na zona da borda, mais rápido rola.
    const proporcao = clientX < left + ZONA
      ? -(left + ZONA - clientX) / ZONA
      : clientX > right - ZONA
        ? (clientX - (right - ZONA)) / ZONA
        : 0;
    autoScroll.current.speed = Math.round(
      Math.max(-1, Math.min(1, proporcao)) * VELOCIDADE_MAX,
    );
    if (autoScroll.current.speed !== 0 && autoScroll.current.frame === null) {
      autoScroll.current.frame = window.requestAnimationFrame(stepAutoScroll);
    }
  };

  const actor = useMemo(
    () => ({ userId: currentUserId, isAdmin, isLider, isSublider }),
    [currentUserId, isAdmin, isLider, isSublider],
  );
  const columns = useMemo(() => buildTaskKanbanColumns(tasks, BOARD_STATUSES), [tasks]);

  const canChangeStatus = (task: OrgTask) => canUpdateOrgTaskStatus(task, actor);

  const toggleTaskExpanded = (taskId: string) =>
    setExpandedTasks((previous) => {
      const next = new Set(previous);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });

  const expandCards = (taskIds: string[]) =>
    setExpandedTasks((previous) => new Set([...previous, ...taskIds]));

  /**
   * Destaca as tarefas pedidas e traz a primeira para a área visível.
   *
   * É a resposta ao "vejo que a mãe tem 2 subtarefas e não sei onde elas
   * estão": a coluna de destino pode estar fora da tela (são 7 colunas com
   * rolagem horizontal), então destacar sem rolar não resolveria nada. O card é
   * procurado pelo `data-task-card` porque quem rola é o contêiner do quadro, e
   * não este componente.
   */
  const revealTasks = (taskIds: string[]) => {
    if (taskIds.length === 0) return;
    setHighlightedTaskIds(new Set(taskIds));
    if (highlightTimeout.current) window.clearTimeout(highlightTimeout.current);
    highlightTimeout.current = window.setTimeout(() => setHighlightedTaskIds(new Set()), 3000);
    const alvo = document.querySelector(`[data-task-card="${taskIds[0]}"]`);
    alvo?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };

  const applyStatusChange = (task: OrgTask, nextStatus: OrgTaskStatus) => {
    if (task.status === nextStatus) return;
    if (!canChangeStatus(task)) {
      toast.error('Você não tem permissão para mover esta tarefa.', {
        description: 'Apenas o responsável, o criador ou um líder pode alterar o status.',
      });
      return;
    }
    // A filha que passa a ter o status da mãe volta a ficar aninhada no card
    // dela — e o aninhamento nasce fechado. Abrir a mãe evita a impressão de
    // que o card desapareceu do quadro.
    const parentToReveal = parentToRevealAfterStatusChange(task, nextStatus, tasks);
    if (parentToReveal) expandCards([parentToReveal]);

    if (nextStatus === 'review' || nextStatus === 'em_ajuste') {
      setPendingTransition({ task, status: nextStatus });
      return;
    }
    if (nextStatus === 'done' && isDelegatedOrgTaskReviewer(task, currentUserId)) {
      toast.error('O revisor não pode concluir a tarefa. Devolva-a para ajustes.');
      return;
    }
    // Concluir arrastando o card também passa pelo apontamento de horas: sem
    // hora, `useUpdateOrgTask` recusaria a conclusão sem dar onde digitar.
    if (nextStatus === 'done' && !conclusao.pedirHoras(task)) return;
    updateTask.mutate({ id: task.id, status: nextStatus });
  };

  const handleDragOver = (event: React.DragEvent, status: OrgTaskStatus) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    setDragOverStatus(status);
  };

  const handleDragLeave = (event: React.DragEvent, status: OrgTaskStatus) => {
    // dragleave dispara ao passar de um filho para outro dentro da mesma coluna.
    const proximo = event.relatedTarget as Node | null;
    if (proximo && event.currentTarget.contains(proximo)) return;
    setDragOverStatus((atual) => (atual === status ? null : atual));
  };

  const handleDrop = (event: React.DragEvent, status: OrgTaskStatus) => {
    event.preventDefault();
    setDragOverStatus(null);
    stopAutoScroll();
    const task = draggedTask;
    setDraggedTask(null);
    if (task) applyStatusChange(task, status);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
    setDragOverStatus(null);
    stopAutoScroll();
  };

  return (
    <>
      <div
        ref={boardRef}
        className="flex h-[calc(100vh-300px)] gap-4 overflow-x-auto pb-4"
        // O dragover das colunas borbulha até aqui, então a borda é vigiada num
        // lugar só. Sair do quadro (ou soltar) para a rolagem.
        onDragOver={(event) => updateAutoScroll(event.clientX)}
        onDragLeave={(event) => {
          const proximo = event.relatedTarget as Node | null;
          if (proximo && event.currentTarget.contains(proximo)) return;
          stopAutoScroll();
        }}
        onDrop={stopAutoScroll}
      >
        {columns.map((column) => {
          const config = statusColors[column.status];
          return (
            <div
              key={column.status}
              className={cn(
                'flex w-[340px] flex-shrink-0 flex-col overflow-visible rounded-lg bg-muted/30',
                dragOverStatus === column.status && 'ring-2 ring-primary/40',
              )}
              onDragOver={(event) => handleDragOver(event, column.status)}
              onDragLeave={(event) => handleDragLeave(event, column.status)}
              onDrop={(event) => handleDrop(event, column.status)}
            >
              <div
                className={cn(
                  'flex items-center justify-between rounded-t-lg px-3 py-2',
                  config.bg,
                )}
              >
                <span className="text-sm font-medium">{config.label}</span>
                <div className="flex items-center gap-1">
                  {column.nestedCount > 0 && (
                    <button
                      type="button"
                      onClick={() => expandCards(column.cardIdsWithNested)}
                      title={`${column.nestedCount} subtarefa(s) aninhadas em cards desta coluna — clique para expandir`}
                      className="rounded-full bg-card/60 px-2 py-0.5 text-xs tabular-nums hover:bg-card"
                    >
                      +{column.nestedCount}
                    </button>
                  )}
                  <span
                    title={`${column.taskCount} tarefa(s) neste status: ${column.cards.length} card(s) + ${column.nestedCount} aninhada(s)`}
                    className="rounded-full bg-card/60 px-2 py-0.5 text-xs tabular-nums"
                  >
                    {column.taskCount}
                  </span>
                </div>
              </div>

              <ScrollArea className="flex-1 p-1">
                <div className="space-y-3 p-1">
                  {column.cards.map((card) => (
                    <TaskKanbanCard
                      key={card.task.id}
                      card={card}
                      draggedTaskId={draggedTask?.id}
                      highlightedTaskIds={highlightedTaskIds}
                      isExpanded={expandedTasks.has(card.task.id)}
                      currentUserId={currentUserId}
                      canChangeStatus={canChangeStatus}
                      onToggleExpanded={toggleTaskExpanded}
                      onOpen={onEdit}
                      onReveal={revealTasks}
                      onDragStart={setDraggedTask}
                      onDragEnd={handleDragEnd}
                      onStatusChange={applyStatusChange}
                    />
                  ))}
                  {column.cards.length === 0 && (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Arraste tarefas aqui
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          );
        })}
      </div>
      <TaskStatusTransitionDialog
        open={!!pendingTransition}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPendingTransition(null);
        }}
        task={pendingTransition?.task || null}
        status={pendingTransition?.status || 'review'}
        area={area}
      />
      <TaskCompletionHoursDialog
        task={conclusao.taskPendente}
        area={area}
        onClose={conclusao.fechar}
      />
    </>
  );
};
