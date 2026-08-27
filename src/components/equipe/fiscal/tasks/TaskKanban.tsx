import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

import { TaskKanbanCard } from '@/components/equipe/fiscal/tasks/kanban/TaskKanbanCard';
import { TaskCompletionHoursDialog } from '@/components/equipe/fiscal/tasks/TaskCompletionHoursDialog';
 import { useTaskCompletionHours } from '@/hooks/useTaskCompletionHours';
import { useTaskStatusTransition } from '@/hooks/useTaskStatusTransition';
import { TaskStatusTransitionDialog } from '@/components/equipe/fiscal/tasks/TaskStatusTransitionDialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AreaKey } from '@/config/areaCategories';
import { OrgTask, OrgTaskStatus, useUpdateOrgTask } from '@/hooks/useOrgTasks';
import { useTeamProfilesSafe } from '@/hooks/useTaxReferenceData';
import { canUpdateOrgTaskStatus, isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import { resolveActiveReviewerName } from '@/lib/orgTaskReviewer';
import {
  buildTaskKanbanColumns,
  keyToRevealAfterStatusChange,
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
 * A subtarefa aparece na coluna do STATUS DELA, e não na da mãe — antes só a
 * mãe era arrastável e as filhas iam todas juntas no card dela, então não havia
 * como puxar uma para "Em Progresso" e deixar as irmãs em "A Fazer".
 *
 * Para isso o card da mãe se repete em cada coluna onde ela tem filha, como
 * cópia marcada com o status real dela, levando junto a lista daquelas filhas.
 * Um formato só de card no quadro inteiro: uma mãe com 9 subtarefas espalhadas
 * ocupa quatro cards em vez de dez, e nenhuma filha aparece solta.
 *
 * O contador do cabeçalho conta TAREFAS, então bate com os KPIs do topo da
 * página; o "+N" ao lado diz quantas estão dentro da lista de algum card e
 * expande esses cards.
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
  const conclusao = useTaskCompletionHours();
  const transicao = useTaskStatusTransition();
  // Guarda ids de card de tarefa E chaves de card de agrupamento (ver
  // taskKanbanGroupKey) — os dois abrem e fecham do mesmo jeito.
  const [expandedKeys, setExpandedKeys] = useState<Set<string>>(new Set());
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());
  const highlightTimeout = useRef<number | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const autoScroll = useRef<{ speed: number; frame: number | null }>({ speed: 0, frame: null });
  const updateTask = useUpdateOrgTask(area);
  // A tarefa guarda o id do revisor; o nome vem de `profiles_safe`. É uma
  // consulta só para o quadro inteiro, resolvida aqui e repassada como função
  // para o card não repetir a busca por linha.
  const { data: profiles = [] } = useTeamProfilesSafe();
  const reviewerName = useCallback(
    (task: OrgTask) => resolveActiveReviewerName(task, profiles),
    [profiles],
  );

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

  const toggleExpanded = (key: string) =>
    setExpandedKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const expandCard = (key: string) => setExpandedKeys((previous) => new Set(previous).add(key));

  /**
   * Destaca as tarefas pedidas e traz a primeira para a área visível.
   *
   * É a resposta ao "vejo que a mãe tem 2 subtarefas e não sei onde elas
   * estão": a coluna de destino pode estar fora da tela (são 7 colunas com
   * rolagem horizontal), então destacar sem rolar não resolveria nada. O card é
   * procurado no DOM porque quem rola é o contêiner do quadro, e não este
   * componente. Quando o alvo é uma filha, o card que a guarda é informado em
   * `entryKey` — a filha em si pode estar dentro de uma lista fechada, e o
   * destaque dela abre esse card (ver `isExpanded` na renderização).
   */
  const revealTasks = (taskIds: string[], entryKey?: string) => {
    if (taskIds.length === 0) return;
    setHighlightedTaskIds(new Set(taskIds));
    if (highlightTimeout.current) window.clearTimeout(highlightTimeout.current);
    highlightTimeout.current = window.setTimeout(() => setHighlightedTaskIds(new Set()), 3000);
    if (entryKey) expandCard(entryKey);
    const seletor = entryKey
      ? `[data-task-entry="${entryKey}"]`
      : `[data-task-card="${taskIds[0]}"]`;
    // Em quadro grande a rolagem só acerta depois que o card destino existir.
    window.requestAnimationFrame(() => {
      document
        .querySelector(seletor)
        ?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    });
  };

  const applyStatusChange = (task: OrgTask, nextStatus: OrgTaskStatus) => {
    if (task.status === nextStatus) return;
    if (!canChangeStatus(task)) {
      toast.error('Você não tem permissão para mover esta tarefa.', {
        description: 'Apenas o responsável, o criador ou um líder pode alterar o status.',
      });
      return;
    }
    // A filha pode perder o card próprio no destino: volta ao ninho da mãe (se
    // for para a coluna dela) ou entra num agrupamento com as irmãs que já
    // estão lá. Nos dois casos o aninhamento nasce fechado, então abrimos para
    // não parecer que o card sumiu do quadro.
    const chaveParaAbrir = keyToRevealAfterStatusChange(task, nextStatus, tasks);
    if (chaveParaAbrir) expandCard(chaveParaAbrir);

    // Revisão e ajuste passam pelo diálogo: revisor e detalhamento são
    // obrigatórios, e é ele quem grava.
    if (!transicao.pedirDetalhes(task, nextStatus)) return;
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
          const cardsDeTarefa = column.entries.filter((entry) => !entry.isCopy).length;
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
                {/* Um número só, igual à régua de KPIs do topo: são a mesma
                    conta. O detalhe de quantas estão dentro de uma lista fica
                    no title, sem virar um segundo número na tela. */}
                <span
                  title={`${column.taskCount} tarefa(s) neste status: ${cardsDeTarefa} card(s) + ${column.hiddenCount} dentro de listas`}
                  className="rounded-full bg-card/60 px-2 py-0.5 text-xs tabular-nums"
                >
                  {column.taskCount}
                </span>
              </div>

              <ScrollArea className="flex-1 p-1">
                <div className="space-y-3 p-1">
                  {column.entries.map((entry) => (
                    <TaskKanbanCard
                      key={entry.key}
                      entry={entry}
                      draggedTaskId={draggedTask?.id}
                      highlightedTaskIds={highlightedTaskIds}
                      // Destacar uma filha abre o card que a guarda: de nada
                      // adianta rolar até um card que não a mostra.
                      isExpanded={
                        expandedKeys.has(entry.key) ||
                        entry.children.some((child) => highlightedTaskIds.has(child.id))
                      }
                      currentUserId={currentUserId}
                      canChangeStatus={canChangeStatus}
                      reviewerName={reviewerName}
                      onToggleExpanded={toggleExpanded}
                      onOpen={onEdit}
                      onReveal={revealTasks}
                      onDragStart={setDraggedTask}
                      onDragEnd={handleDragEnd}
                      onStatusChange={applyStatusChange}
                    />
                  ))}
                  {column.entries.length === 0 && (
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
        open={!!transicao.transicaoPendente}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) transicao.fechar();
        }}
        task={transicao.transicaoPendente?.task || null}
        status={transicao.transicaoPendente?.status || 'review'}
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
