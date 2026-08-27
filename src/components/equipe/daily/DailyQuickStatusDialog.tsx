import { useEffect, useMemo, useState, type ComponentType, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  CheckCircle2,
  Circle,
  Clock3,
  ListChecks,
  Loader2,
  Search,
  Sparkles,
  TimerReset,
} from 'lucide-react';
import { AvisoHorasDigitadas } from '@/components/equipe/AvisoHorasDigitadas';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { DailySprintTask, DailyTaskStatus } from '@/hooks/useDailySprintTasks';
import { filterDailyTasksBySearch, parseDailyActualHours } from '@/lib/equipeDaily';
import { avaliarHorasApontadas } from '@/lib/horasApontamento';
import { cn } from '@/lib/utils';

interface DailyQuickStatusDialogProps {
  open: boolean;
  sprintName?: string;
  tasks: DailySprintTask[];
  loading: boolean;
  updating: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: (task: DailySprintTask, status: DailyTaskStatus, actualHours?: number) => Promise<boolean>;
}

const STATUS_OPTIONS: Array<{
  value: DailyTaskStatus;
  label: string;
  shortLabel: string;
  icon: ComponentType<{ className?: string }>;
  activeClass: string;
}> = [
  {
    value: 'pending',
    label: 'A fazer',
    shortLabel: 'Fazer',
    icon: Circle,
    activeClass: 'border-border bg-muted text-foreground shadow-sm',
  },
  {
    value: 'in_progress',
    label: 'Em progresso',
    shortLabel: 'Fazendo',
    icon: Clock3,
    activeClass: 'border-primary/30 bg-primary/5 text-primary shadow-sm shadow-primary/10',
  },
  {
    value: 'completed',
    label: 'Concluído',
    shortLabel: 'Concluir',
    icon: CheckCircle2,
    activeClass: 'border-primary/50 bg-primary/10 text-primary shadow-sm shadow-primary/10',
  },
];

export function DailyQuickStatusDialog({
  open,
  sprintName,
  tasks,
  loading,
  updating,
  onOpenChange,
  onUpdate,
}: DailyQuickStatusDialogProps) {
  const [search, setSearch] = useState('');
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
  const [actualHours, setActualHours] = useState('');
  const [hoursError, setHoursError] = useState(false);
  // Aviso de digitação já confirmado por quem está apontando as horas.
  const [hoursAck, setHoursAck] = useState(false);

  useEffect(() => {
    if (open) return;
    setSearch('');
    setCompletingTaskId(null);
    setActualHours('');
    setHoursError(false);
    setHoursAck(false);
  }, [open]);

  const visibleTasks = useMemo(
    () => filterDailyTasksBySearch(tasks, search),
    [tasks, search],
  );
  const taskGroups = useMemo(() => [
    { status: 'pending' as const, label: 'A fazer', icon: Circle, tasks: visibleTasks.filter((task) => task.status === 'pending') },
    { status: 'in_progress' as const, label: 'Em progresso', icon: Clock3, tasks: visibleTasks.filter((task) => task.status === 'in_progress') },
    { status: 'completed' as const, label: 'Concluídas', icon: CheckCircle2, tasks: visibleTasks.filter((task) => task.status === 'completed') },
  ].filter((group) => group.tasks.length > 0), [visibleTasks]);
  const completedCount = tasks.filter((task) => task.status === 'completed').length;

  const selectStatus = async (task: DailySprintTask, status: DailyTaskStatus) => {
    if (status === 'completed') {
      setCompletingTaskId(task.id);
      setActualHours(task.actual_hours === null ? '' : String(task.actual_hours));
      setHoursError(false);
      setHoursAck(false);
      return;
    }
    setCompletingTaskId(null);
    await onUpdate(task, status);
  };

  const finishTask = async (event: FormEvent, task: DailySprintTask) => {
    event.preventDefault();
    const hours = parseDailyActualHours(actualHours);
    if (hours === null) {
      setHoursError(true);
      return;
    }
    // Horas fora do padrão só passam depois de confirmadas no aviso ao lado.
    if (!hoursAck && avaliarHorasApontadas({ realizadas: hours, estimadas: task.estimated_hours })) {
      return;
    }
    const updated = await onUpdate(task, 'completed', hours);
    if (updated) {
      setCompletingTaskId(null);
      setActualHours('');
      setHoursError(false);
      setHoursAck(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1.5rem)] gap-0 overflow-hidden border-0 p-0 sm:max-w-3xl sm:rounded-2xl">
        <div className="relative overflow-hidden border-b border-primary/15 bg-gradient-to-br from-primary/5 via-card to-primary/5 px-5 py-5 sm:px-7">
          <div className="pointer-events-none absolute -right-12 -top-16 h-40 w-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-32 w-32 rounded-full bg-primary/10 blur-3xl" />
          <DialogHeader className="relative pr-8 text-left">
            <div className="mb-1 flex items-center gap-3">
              <motion.div
                initial={{ rotate: -12, scale: 0.8 }}
                animate={{ rotate: 0, scale: 1 }}
                className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-white shadow-lg shadow-primary/20"
              >
                <ListChecks className="h-5 w-5" />
              </motion.div>
              <div>
                <DialogTitle className="flex items-center gap-2 text-xl text-foreground">
                  Atualização rápida
                  <Sparkles className="h-4 w-4 text-primary motion-safe:animate-pulse" />
                </DialogTitle>
                <DialogDescription className="mt-1">
                  {sprintName ? `Suas tarefas em ${sprintName}` : 'Selecione uma sprint na Daily para começar.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {sprintName && (
            <div className="relative mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
                <Input
                  autoFocus
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Pesquisar por nome ou código..."
                  className="h-11 border-background/80 bg-card/85 pl-9 shadow-sm backdrop-blur focus-visible:ring-primary"
                />
              </div>
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                <Badge variant="secondary" className="h-7 bg-card/80 px-2.5 text-muted-foreground">
                  {tasks.length} {tasks.length === 1 ? 'tarefa' : 'tarefas'}
                </Badge>
                <Badge className="h-7 bg-primary/10 px-2.5 text-primary hover:bg-primary/10">
                  <Check className="mr-1 h-3.5 w-3.5" /> {completedCount} concluída{completedCount === 1 ? '' : 's'}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <div className="h-[min(32rem,58vh)] min-w-0 overflow-y-auto overflow-x-hidden bg-muted/60">
          <div className="w-full min-w-0 max-w-full space-y-2.5 p-4 sm:p-5">
            {loading && <TaskListSkeleton />}

            {!loading && !sprintName && (
              <EmptyState
                icon={TimerReset}
                title="Escolha uma sprint"
                description="Feche este modal e use “Ajustar contexto” para selecionar a sprint da Daily."
              />
            )}

            {!loading && sprintName && tasks.length === 0 && (
              <EmptyState
                icon={CheckCircle2}
                title="Nenhuma tarefa atribuída a você"
                description="Quando uma tarefa desta sprint for atribuída a você, ela aparecerá aqui."
              />
            )}

            {!loading && tasks.length > 0 && visibleTasks.length === 0 && (
              <EmptyState
                icon={Search}
                title="Nenhuma tarefa encontrada"
                description="Tente pesquisar usando outra parte do nome ou o código da tarefa."
              />
            )}

            {taskGroups.map((group) => {
              const GroupIcon = group.icon;
              return (
                <section key={group.status} className="space-y-2.5 pt-3 first:pt-0">
                  <div className="flex items-center gap-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <GroupIcon className="h-3.5 w-3.5" />
                    <span>{group.label}</span>
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                      {group.tasks.length}
                    </span>
                    <span className="h-px flex-1 bg-border" aria-hidden />
                  </div>
                  <AnimatePresence initial={false}>
              {group.tasks.map((task, index) => {
                const isCompleting = completingTaskId === task.id;
                const avisoHoras = isCompleting
                  ? avaliarHorasApontadas({
                      realizadas: actualHours,
                      estimadas: task.estimated_hours,
                    })
                  : null;
                return (
                  <motion.article
                    layout
                    key={task.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(index * 0.035, 0.2), duration: 0.22 }}
                    className={cn(
                      'w-full min-w-0 max-w-full overflow-hidden rounded-xl border bg-card shadow-sm transition-colors',
                      task.status === 'completed'
                        ? 'border-border bg-muted/70 opacity-70 shadow-none'
                        : 'border-primary/25 hover:border-primary/40',
                      isCompleting && 'border-primary/40 ring-2 ring-primary/20',
                    )}
                  >
                    <div className="flex min-w-0 flex-col gap-3 overflow-hidden p-3.5 sm:flex-row sm:items-center sm:justify-between sm:p-4">
                      <div className="min-w-0 max-w-full flex-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          {task.task_code && (
                            <span className={cn(
                              'shrink-0 font-mono text-[11px] font-semibold uppercase tracking-wide',
                              task.status === 'completed' ? 'text-muted-foreground/70' : 'text-primary',
                            )}>
                              {task.task_code}
                            </span>
                          )}
                          {task.parent_id && <Badge variant="outline" className="h-5 px-1.5 text-[10px] text-muted-foreground">Subtarefa</Badge>}
                        </div>
                        <p className={cn(
                          'mt-1 block max-w-full truncate text-sm font-medium text-foreground sm:text-[15px]',
                          task.status === 'completed' && 'text-muted-foreground line-through decoration-primary/60',
                        )}>
                          {task.title}
                        </p>
                      </div>

                      {task.status === 'completed' ? (
                        <Badge className="h-8 shrink-0 gap-1.5 border border-border bg-muted px-3 text-muted-foreground shadow-none hover:bg-muted">
                          <CheckCircle2 className="h-4 w-4" />
                          Concluído
                        </Badge>
                      ) : (
                        <div className="grid shrink-0 grid-cols-3 gap-1 rounded-lg bg-muted p-1 sm:w-[20rem]">
                          {STATUS_OPTIONS.map((option) => {
                            const Icon = option.icon;
                            const active = task.status === option.value;
                            return (
                              <button
                                key={option.value}
                                type="button"
                                disabled={updating || active}
                                onClick={() => void selectStatus(task, option.value)}
                                className={cn(
                                  'flex h-9 items-center justify-center gap-1.5 rounded-md border border-transparent px-1 text-[11px] font-semibold transition-all duration-200 hover:-translate-y-0.5 hover:bg-card hover:text-foreground disabled:pointer-events-none sm:text-xs',
                                  active ? option.activeClass : 'text-muted-foreground',
                                )}
                                aria-label={`Alterar ${task.title} para ${option.label}`}
                              >
                                <Icon className="h-3.5 w-3.5" />
                                <span className="sm:hidden">{option.shortLabel}</span>
                                <span className="hidden sm:inline">{option.label}</span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <AnimatePresence>
                      {isCompleting && (
                        <motion.form
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.22 }}
                          onSubmit={(event) => void finishTask(event, task)}
                          className="overflow-hidden border-t border-primary/15 bg-gradient-to-r from-primary/10 to-primary/5"
                        >
                          <div className="flex flex-col gap-3 p-3.5 sm:flex-row sm:items-end sm:px-4">
                            <div className="flex-1 space-y-1.5">
                              <Label htmlFor={`actual-hours-${task.id}`} className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                                <Clock3 className="h-3.5 w-3.5" /> Horas realizadas <span className="text-destructive">*</span>
                              </Label>
                              <div className="flex flex-wrap items-center gap-2">
                                <Input
                                  id={`actual-hours-${task.id}`}
                                  autoFocus
                                  type="number"
                                  min="0"
                                  step="0.5"
                                  inputMode="decimal"
                                  value={actualHours}
                                  onChange={(event) => {
                                    setActualHours(event.target.value);
                                    setHoursError(false);
                                    setHoursAck(false);
                                  }}
                                  placeholder="Ex.: 3,5"
                                  className={cn(
                                    'h-9 bg-card focus-visible:border-primary/40 focus-visible:ring-0 focus-visible:ring-offset-0 sm:max-w-44',
                                    hoursError && 'border-destructive/50 focus-visible:border-destructive/50',
                                  )}
                                />
                                <div className="flex h-9 items-center gap-1.5 rounded-md border border-primary/25 bg-card/70 px-3 text-xs text-primary">
                                  <TimerReset className="h-3.5 w-3.5 text-primary" />
                                  {task.estimated_hours === null
                                    ? 'Sem estimativa'
                                    : `${task.estimated_hours.toLocaleString('pt-BR')}h estimadas`}
                                </div>
                              </div>
                              {hoursError && <p className="text-xs font-medium text-destructive">Informe um valor igual ou maior que zero.</p>}
                              <AvisoHorasDigitadas
                                aviso={avisoHoras}
                                confirmado={hoursAck}
                                className="bg-card/70"
                                onConfirmar={() => setHoursAck(true)}
                                onUsarSugestao={(horas) => {
                                  setActualHours(String(horas));
                                  setHoursAck(false);
                                }}
                              />
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="ghost"
                                disabled={updating}
                                onClick={() => setCompletingTaskId(null)}
                              >
                                Cancelar
                              </Button>
                              <Button
                                type="submit"
                                size="sm"
                                disabled={updating || (!!avisoHoras && !hoursAck)}
                                className="bg-primary hover:bg-primary/90"
                              >
                                {updating ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-4 w-4" />}
                                Concluir tarefa
                              </Button>
                            </div>
                          </div>
                        </motion.form>
                      )}
                    </AnimatePresence>
                  </motion.article>
                );
                    })}
                  </AnimatePresence>
                </section>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex min-h-56 flex-col items-center justify-center px-6 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-card text-muted-foreground/70 shadow-sm ring-1 ring-border">
        <Icon className="h-5 w-5" />
      </div>
      <p className="font-semibold text-foreground">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
    </motion.div>
  );
}

function TaskListSkeleton() {
  return (
    <div className="space-y-2.5" aria-label="Carregando tarefas">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex h-[74px] animate-pulse items-center justify-between rounded-xl border border-border bg-card px-4">
          <div className="space-y-2"><div className="h-2.5 w-16 rounded bg-border" /><div className="h-3.5 w-44 rounded bg-border" /></div>
          <div className="hidden h-10 w-72 rounded-lg bg-muted sm:block" />
        </div>
      ))}
    </div>
  );
}
