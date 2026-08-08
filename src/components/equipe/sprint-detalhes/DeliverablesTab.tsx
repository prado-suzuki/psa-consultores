import {
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Download,
  Edit2,
  Plus,
  Upload,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { TabsContent } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { isPastBrazil, isTodayBrazil, isTomorrowBrazil, parseDate } from '@/lib/dateUtils';
import type { EquipeSprintDetalhesController } from '@/hooks/useEquipeSprintDetalhesController';

function DateBadge({ date }: { date: string }) {
  const parsedDate = parseDate(date);
  if (isTodayBrazil(parsedDate)) {
    return <Badge className="bg-primary text-primary-foreground text-xs">Hoje</Badge>;
  }
  if (isTomorrowBrazil(parsedDate)) {
    return (
      <Badge variant="outline" className="text-xs">
        Amanhã
      </Badge>
    );
  }
  if (isPastBrazil(parsedDate)) {
    return (
      <Badge variant="secondary" className="text-xs">
        Passado
      </Badge>
    );
  }
  return null;
}

export function DeliverablesTab({ controller: c }: { controller: EquipeSprintDetalhesController }) {
  return (
    <TabsContent value="deliverables" className="space-y-4">
      <div className="flex justify-end gap-2">
        <input
          ref={c.fileInputRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={c.handleFileSelect}
          className="hidden"
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            c.fileInputRef.current?.click();
            c.closeImport(true);
          }}
        >
          <Upload className="h-4 w-4 mr-2" />
          Importar Excel
        </Button>
        <Button variant="outline" size="sm" onClick={c.handleExportExcel}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
        <Button size="sm" onClick={c.openCreateModal}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Tarefa
        </Button>
      </div>
      {!c.filteredDeliverables.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            {c.hasActiveFilters
              ? 'Nenhum entregável encontrado com os filtros selecionados.'
              : 'Nenhum entregável cadastrado para esta sprint.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {c.hierarchicalTasks.map((task) => {
            const expanded = c.expandedTasks.has(task.id);
            const hasChildren = task.subtaskCount > 0;
            return (
              <div key={task.id}>
                <Card
                  className={`${task.status === 'completed' ? 'bg-gray-50' : 'bg-white'} cursor-pointer border-gray-200`}
                  onClick={() => c.toggleTask(task.id)}
                >
                  <CardContent className="py-3">
                    <div className="flex items-center gap-2">
                      {hasChildren ? (
                        <button
                          onClick={(event) => {
                            event.stopPropagation();
                            c.toggleTask(task.id);
                          }}
                          className="p-1 hover:bg-gray-100 rounded"
                        >
                          {expanded ? (
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-gray-500" />
                          )}
                        </button>
                      ) : (
                        <div className="w-6" />
                      )}
                      <Checkbox
                        checked={task.status === 'completed'}
                        onClick={(event) => event.stopPropagation()}
                        onCheckedChange={(checked) =>
                          c.updateStatus(task.id, checked ? 'completed' : 'pending')
                        }
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {task.task_code && (
                            <span className="text-xs font-mono text-gray-400">
                              {task.task_code}
                            </span>
                          )}
                          <span
                            className={`font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}
                          >
                            {task.title}
                          </span>
                          {hasChildren && (
                            <Badge variant="outline" className="text-xs">
                              {task.completedSubtasks}/{task.subtaskCount} subtarefas
                            </Badge>
                          )}
                          <DateBadge date={task.due_date} />
                        </div>
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                          <span>{c.getProfileName(task.assigned_to)}</span>
                          <span>{format(parseDate(task.due_date), 'dd/MM')}</span>
                          {task.totalHours > 0 && <span>{task.totalHours}h</span>}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          c.openCreateSubtaskModal(task);
                        }}
                        title="Criar subtarefa vinculada"
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(event) => {
                          event.stopPropagation();
                          c.openEditModal(task);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      {c.canMoveDeliverable && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(event) => {
                            event.stopPropagation();
                            c.openMoveModal(task);
                          }}
                          title="Mover para outra sprint"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
                      )}
                      <Badge variant="outline">
                        {task.status === 'completed'
                          ? 'Concluído'
                          : task.status === 'in_progress'
                            ? 'Em Progresso'
                            : 'Pendente'}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
                {hasChildren && expanded && (
                  <div className="ml-8 mt-1 space-y-1 border-l-2 border-gray-200 pl-4">
                    {task.subtasks.map((subtask) => (
                      <Card
                        key={subtask.id}
                        className="cursor-pointer border-gray-100"
                        onClick={() => c.openEditModal(subtask)}
                      >
                        <CardContent className="py-2">
                          <div className="flex items-center gap-3">
                            <Checkbox
                              checked={subtask.status === 'completed'}
                              onClick={(event) => event.stopPropagation()}
                              onCheckedChange={(checked) =>
                                c.updateStatus(subtask.id, checked ? 'completed' : 'pending')
                              }
                            />
                            <div className="flex-1">
                              <div>
                                {subtask.task_code && (
                                  <span className="text-xs font-mono text-gray-400 mr-2">
                                    {subtask.task_code}
                                  </span>
                                )}
                                <span
                                  className={
                                    subtask.status === 'completed'
                                      ? 'line-through text-gray-400'
                                      : 'text-gray-700'
                                  }
                                >
                                  {subtask.title}
                                </span>
                              </div>
                              <div className="text-xs text-gray-500">
                                {c.getProfileName(subtask.assigned_to)} ·{' '}
                                {format(parseDate(subtask.due_date), 'dd/MM')}
                                {subtask.estimated_hours ? ` · ${subtask.estimated_hours}h` : ''}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(event) => {
                                event.stopPropagation();
                                c.openEditModal(subtask);
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                            {c.canMoveDeliverable && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  c.openMoveModal(subtask);
                                }}
                                title="Mover para outra sprint (deixa de ser subtarefa)"
                              >
                                <ArrowRightLeft className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </TabsContent>
  );
}
