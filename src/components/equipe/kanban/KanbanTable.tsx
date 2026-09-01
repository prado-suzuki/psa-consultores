import { Fragment, type MouseEvent } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  formatEquipeKanbanDueDate,
  hasOpenSubtasksUnderCompletedParent,
  type EquipeKanbanDeliverable,
  type HierarchicalEquipeKanbanDeliverable,
} from '@/lib/equipeKanban';
import { formatBlockerTooltip, type DeliverableBlocker } from '@/hooks/useDeliverableBlockers';

interface KanbanTableProps {
  deliverables: HierarchicalEquipeKanbanDeliverable[];
  expandedTasks: Set<string>;
  getProfileName: (profileId: string | null) => string;
  getBlocker: (deliverable: EquipeKanbanDeliverable) => DeliverableBlocker | undefined;
  /** Nome da tarefa-mãe quando ela não está na visão (linha promovida pelo filtro por pessoa). */
  getGroupLabel: (deliverable: EquipeKanbanDeliverable) => string | null;
  getStatusBadgeColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  onToggleExpanded: (taskId: string, event?: MouseEvent) => void;
  onToggleSubtask: (subtask: EquipeKanbanDeliverable, event: MouseEvent) => void;
  onOpenDeliverable: (deliverable: EquipeKanbanDeliverable) => void;
}

export function KanbanTable(props: KanbanTableProps) {
  return (
    <Card className="border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-foreground w-8"></TableHead>
            <TableHead className="text-foreground">Título</TableHead>
            <TableHead className="text-foreground">Status</TableHead>
            <TableHead className="text-foreground">Responsável</TableHead>
            <TableHead className="text-foreground">Data Limite</TableHead>
            <TableHead className="text-foreground text-right">Horas Est.</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {props.deliverables.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                Nenhum entregável encontrado
              </TableCell>
            </TableRow>
          ) : (
            props.deliverables.map((deliverable) => (
              <Fragment key={deliverable.id}>
                <TableRow
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => props.onOpenDeliverable(deliverable)}
                >
                  <TableCell className="w-8">
                    {deliverable.subtaskCount > 0 && (
                      <button
                        onClick={(event) => props.onToggleExpanded(deliverable.id, event)}
                        className="p-0.5 hover:bg-muted rounded"
                      >
                        {props.expandedTasks.has(deliverable.id) ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-gray-900 font-medium">
                    <div className="flex items-center gap-2">
                      {props.getGroupLabel(deliverable) && (
                        <span
                          className="max-w-[16rem] truncate text-xs font-normal text-gray-400"
                          title={props.getGroupLabel(deliverable) ?? undefined}
                        >
                          {props.getGroupLabel(deliverable)} ·
                        </span>
                      )}
                      {deliverable.task_code && (
                        <span className="text-gray-500 font-normal">{deliverable.task_code}</span>
                      )}
                      {deliverable.title}
                      {deliverable.subtaskCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {deliverable.completedSubtasks}/{deliverable.subtaskCount}
                        </Badge>
                      )}
                      {hasOpenSubtasksUnderCompletedParent(deliverable) && (
                        <Badge
                          variant="outline"
                          className="border-amber-300 bg-amber-50 text-xs text-amber-800"
                          title="Tarefa concluída, mas ainda tem subtarefa aberta aqui dentro"
                        >
                          {deliverable.openSubtasks} aberta
                          {deliverable.openSubtasks > 1 ? 's' : ''}
                        </Badge>
                      )}
                      {props.getBlocker(deliverable) && (
                        <span
                          title={formatBlockerTooltip(props.getBlocker(deliverable)!)}
                          className="inline-flex items-center gap-1 rounded border border-red-200 bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700"
                        >
                          🚩 Bloqueada
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={props.getStatusBadgeColor(deliverable.status)}>
                      {props.getStatusLabel(deliverable.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {props.getProfileName(deliverable.assigned_to)}
                  </TableCell>
                  <TableCell className="text-gray-600">
                    {formatEquipeKanbanDueDate(deliverable.due_date)}
                  </TableCell>
                  <TableCell className="text-gray-600 text-right">
                    {deliverable.subtaskCount > 0
                      ? deliverable.subtaskHoursTotal > 0
                        ? deliverable.subtaskHoursTotal
                        : '-'
                      : deliverable.estimated_hours || '-'}
                  </TableCell>
                </TableRow>

                {props.expandedTasks.has(deliverable.id) &&
                  deliverable.subtasks.map((subtask) => (
                    <TableRow
                      key={subtask.id}
                      className={cn(
                        'cursor-pointer hover:bg-gray-50 bg-gray-50/50',
                        subtask.status === 'completed' && 'opacity-60',
                      )}
                      onClick={() => props.onOpenDeliverable(subtask)}
                    >
                      <TableCell className="w-8 pl-8">
                        <Checkbox
                          checked={subtask.status === 'completed'}
                          onCheckedChange={() => {}}
                          onClick={(event) => props.onToggleSubtask(subtask, event)}
                        />
                      </TableCell>
                      <TableCell
                        style={{ paddingLeft: 32 + subtask.depth * 18 }}
                        className={cn(
                          'text-gray-700',
                          subtask.status === 'completed' && 'line-through',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {subtask.task_code && (
                            <span className="text-gray-400">{subtask.task_code}</span>
                          )}
                          {subtask.title}
                          {props.getBlocker(subtask) && (
                            <span title={formatBlockerTooltip(props.getBlocker(subtask)!)}>🚩</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(props.getStatusBadgeColor(subtask.status), 'text-xs')}>
                          {props.getStatusLabel(subtask.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {props.getProfileName(subtask.assigned_to)}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm">
                        {formatEquipeKanbanDueDate(subtask.due_date)}
                      </TableCell>
                      <TableCell className="text-gray-500 text-sm text-right">
                        {subtask.hoursDisplay || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
              </Fragment>
            ))
          )}
        </TableBody>
      </Table>
    </Card>
  );
}
