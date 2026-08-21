import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Building2, ChevronDown, ChevronRight, CornerDownRight, Crosshair } from 'lucide-react';

import { TaskStatusDot } from '@/components/equipe/tarefas/TaskStatusDot';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger } from '@/components/ui/select';
import type { OrgTask, OrgTaskStatus } from '@/hooks/useOrgTasks';
import { isDelegatedOrgTaskReviewer } from '@/lib/orgTaskPermissions';
import { statusColors, statusList } from '@/lib/taskStatusColors';
import type { TaskKanbanCard as TaskKanbanCardModel } from '@/lib/taskKanbanHierarchy';
import { cn } from '@/lib/utils';

const formatKanbanDate = (date: string | null) =>
  date ? format(new Date(`${date}T00:00:00`), 'dd/MM', { locale: ptBR }) : '';

interface TaskKanbanCardProps {
  card: TaskKanbanCardModel<OrgTask>;
  /** Card (ou linha aninhada) que está sendo arrastado agora. */
  draggedTaskId?: string | null;
  /** Cards em destaque momentâneo — o "onde está" da relação mãe/filha. */
  highlightedTaskIds: Set<string>;
  isExpanded: boolean;
  currentUserId?: string | null;
  canChangeStatus: (task: OrgTask) => boolean;
  onToggleExpanded: (taskId: string) => void;
  onOpen: (task: OrgTask) => void;
  onReveal: (taskIds: string[]) => void;
  onDragStart: (task: OrgTask) => void;
  onDragEnd: () => void;
  onStatusChange: (task: OrgTask, status: OrgTaskStatus) => void;
}

/**
 * Um card do quadro de tarefas — tarefa-raiz ou subtarefa promovida (quando o
 * status dela difere do da mãe). As filhas que estão no MESMO status seguem
 * aninhadas aqui dentro, e cada uma pode ser arrastada para fora ou ter o
 * status trocado pela bolinha, sem mexer nas irmãs.
 *
 * Duas leituras precisam ser imediatas, e eram justamente o que faltava:
 * - **é pai ou é filha?** o card de subtarefa tem faixa "SUBTAREFA DE", fundo
 *   apagado, recuo e borda lateral — quatro sinais redundantes, porque a borda
 *   sozinha se confundia com a linha do projeto;
 * - **para onde foram as filhas?** o card da mãe lista as colunas onde elas
 *   estão, e clicar leva o olho até lá (ver `onReveal`).
 */
export function TaskKanbanCard({
  card,
  draggedTaskId,
  highlightedTaskIds,
  isExpanded,
  currentUserId,
  canChangeStatus,
  onToggleExpanded,
  onOpen,
  onReveal,
  onDragStart,
  onDragEnd,
  onStatusChange,
}: TaskKanbanCardProps) {
  const { task, parent, nested, elsewhere, subtaskCount, completedSubtasks } = card;
  const canDrag = canChangeStatus(task);
  const isSubtarefa = !!parent;

  const handleDragStart = (event: React.DragEvent, alvo: OrgTask) => {
    // A linha aninhada é arrastável dentro de um card arrastável: sem parar a
    // propagação, o dragstart do card sobrescreveria a tarefa arrastada.
    event.stopPropagation();
    event.dataTransfer.effectAllowed = 'move';
    onDragStart(alvo);
  };

  return (
    <div className={cn(isSubtarefa && 'ml-3')}>
      <Card
        data-task-card={task.id}
        className={cn(
          'overflow-hidden border-border transition-shadow hover:shadow-md',
          canDrag ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
          draggedTaskId === task.id && 'opacity-50',
          // Card de subtarefa: recuo + faixa + fundo apagado + borda lateral.
          // Mesmo tom que a Tabela usa na linha de subtarefa (bg-muted/30).
          isSubtarefa ? 'border-l-2 border-l-primary bg-muted/30' : 'bg-card',
          highlightedTaskIds.has(task.id) && 'ring-2 ring-primary ring-offset-1',
        )}
        draggable={canDrag}
        onDragStart={(event) => canDrag && handleDragStart(event, task)}
        onDragEnd={onDragEnd}
        onClick={() => onOpen(task)}
      >
        {parent && (
          <div className="border-b border-border/60 bg-primary/5 px-3 py-1.5">
            <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-primary/80">
              <CornerDownRight className="h-3 w-3 shrink-0" />
              Subtarefa de
            </div>
            {/* Botão de verdade, não texto sublinhado no hover: o nome da mãe
                precisa parecer clicável em repouso — é o atalho para achar a
                mãe no quadro. */}
            <button
              type="button"
              title="Mostrar a tarefa-pai no quadro"
              onClick={(event) => {
                event.stopPropagation();
                onReveal([parent.id]);
              }}
              className="mt-1 flex w-full items-center gap-1 rounded border border-border/70 bg-background/80 px-1.5 py-0.5 text-left text-xs font-medium text-foreground transition-colors hover:border-primary hover:bg-background"
            >
              <Crosshair className="h-3 w-3 shrink-0 text-primary" />
              <span className="min-w-0 flex-1 truncate">{parent.title}</span>
            </button>
          </div>
        )}

        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            {nested.length > 0 && (
              <button
                type="button"
                aria-label={isExpanded ? 'Recolher subtarefas' : 'Expandir subtarefas'}
                onClick={(event) => {
                  event.stopPropagation();
                  onToggleExpanded(task.id);
                }}
                className="mt-0.5 flex-shrink-0 rounded p-0.5 hover:bg-muted"
              >
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                )}
              </button>
            )}
            <div className="min-w-0 flex-1">
              <h4 className="mb-2 line-clamp-3 break-words text-sm font-medium text-foreground">
                {task.title}
              </h4>
              {task.project?.name && (
                <span className="mb-1 block break-words line-clamp-2 text-xs text-info">
                  {task.project.name}
                </span>
              )}
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="break-words">{task.assigned_to_name || 'Não atribuído'}</span>
                <span className="ml-1 flex-shrink-0">{formatKanbanDate(task.due_date)}</span>
              </div>
              {task.contribuinte?.nome_razao_social && (
                <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3 flex-shrink-0" />
                  <span className="break-words line-clamp-2">
                    {task.contribuinte.nome_razao_social}
                  </span>
                </div>
              )}
              {subtaskCount > 0 && (
                <div className="mt-2 flex flex-wrap items-center justify-between gap-1">
                  {/* Onde estão as filhas que não aparecem aqui dentro. */}
                  <div className="flex flex-wrap items-center gap-1">
                    {elsewhere.map((grupo) => (
                      <button
                        key={grupo.status}
                        type="button"
                        title={`Mostrar no quadro: ${grupo.count} subtarefa(s) em ${statusColors[grupo.status].label}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          onReveal(grupo.taskIds);
                        }}
                        className={cn(
                          'flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-shadow hover:ring-1 hover:ring-current',
                          statusColors[grupo.status].combined,
                        )}
                      >
                        <Crosshair className="h-2.5 w-2.5 shrink-0" />
                        {grupo.count} {statusColors[grupo.status].label}
                      </button>
                    ))}
                  </div>
                  <Badge
                    variant="secondary"
                    className={cn(
                      'text-xs',
                      completedSubtasks === subtaskCount && 'bg-success/10 text-success',
                    )}
                  >
                    {completedSubtasks}/{subtaskCount} subtarefas
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {isExpanded && nested.length > 0 && (
        <div className="ml-4 mt-2 space-y-1 border-l-2 border-border pl-3">
          {nested.map((subtask) => {
            const podeMover = canChangeStatus(subtask);
            const opcoes = statusList.filter(
              (status) =>
                !(status.key === 'done' && isDelegatedOrgTaskReviewer(subtask, currentUserId)),
            );
            return (
              <div
                key={subtask.id}
                data-task-card={subtask.id}
                draggable={podeMover}
                onDragStart={(event) => podeMover && handleDragStart(event, subtask)}
                onDragEnd={onDragEnd}
                onClick={() => onOpen(subtask)}
                className={cn(
                  'flex items-center gap-2 rounded-md border border-border bg-muted/30 p-2 text-sm hover:bg-muted',
                  podeMover ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer',
                  draggedTaskId === subtask.id && 'opacity-50',
                  highlightedTaskIds.has(subtask.id) && 'ring-2 ring-primary ring-offset-1',
                  subtask.status === 'done' && 'opacity-60',
                )}
              >
                <Select
                  value={subtask.status}
                  onValueChange={(value) => onStatusChange(subtask, value as OrgTaskStatus)}
                  disabled={!podeMover}
                >
                  <SelectTrigger
                    aria-label={`Status de ${subtask.title}`}
                    onClick={(event) => event.stopPropagation()}
                    className="h-5 w-5 shrink-0 justify-center border-0 bg-transparent p-0 shadow-none focus:ring-0 disabled:opacity-100 [&>span]:!flex [&>span]:items-center [&>svg]:hidden"
                  >
                    <span>
                      <TaskStatusDot status={subtask.status} />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {opcoes.map((status) => (
                      <SelectItem key={status.key} value={status.key}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span
                  className={cn(
                    'min-w-0 flex-1 truncate text-foreground',
                    subtask.status === 'done' && 'line-through',
                  )}
                >
                  {subtask.title}
                </span>
                {subtask.due_date && (
                  <span className="flex-shrink-0 text-xs text-muted-foreground">
                    {formatKanbanDate(subtask.due_date)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
