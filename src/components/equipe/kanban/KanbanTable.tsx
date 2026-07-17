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
  type EquipeKanbanDeliverable,
  type HierarchicalEquipeKanbanDeliverable,
} from '@/lib/equipeKanban';

interface KanbanTableProps {
  deliverables: HierarchicalEquipeKanbanDeliverable[];
  expandedTasks: Set<string>;
  getProfileName: (profileId: string | null) => string;
  getStatusBadgeColor: (status: string) => string;
  getStatusLabel: (status: string) => string;
  onToggleExpanded: (taskId: string, event?: MouseEvent) => void;
  onToggleSubtask: (subtask: EquipeKanbanDeliverable, event: MouseEvent) => void;
  onOpenDeliverable: (deliverable: EquipeKanbanDeliverable) => void;
}

export function KanbanTable(props: KanbanTableProps) {
  return (
    <Card className="bg-white border-gray-200">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="text-gray-700 w-8"></TableHead>
            <TableHead className="text-gray-700">Título</TableHead>
            <TableHead className="text-gray-700">Status</TableHead>
            <TableHead className="text-gray-700">Responsável</TableHead>
            <TableHead className="text-gray-700">Data Limite</TableHead>
            <TableHead className="text-gray-700 text-right">Horas Est.</TableHead>
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
                        className="p-0.5 hover:bg-gray-100 rounded"
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
                      {deliverable.task_code && (
                        <span className="text-gray-500 font-normal">{deliverable.task_code}</span>
                      )}
                      {deliverable.title}
                      {deliverable.subtaskCount > 0 && (
                        <Badge variant="secondary" className="text-xs">
                          {deliverable.completedSubtasks}/{deliverable.subtaskCount}
                        </Badge>
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
                    {deliverable.estimated_hours || '-'}
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
                        className={cn(
                          'text-gray-700 pl-8',
                          subtask.status === 'completed' && 'line-through',
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {subtask.task_code && (
                            <span className="text-gray-400">{subtask.task_code}</span>
                          )}
                          {subtask.title}
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
                        {subtask.estimated_hours || '-'}
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
