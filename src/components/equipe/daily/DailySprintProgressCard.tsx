import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type {
  DailySprintProgress,
  SprintProgressPerson,
  SprintProgressTaskStatus,
} from '@/lib/dailySprintProgress';

interface DailySprintProgressCardProps {
  sprintName: string;
  progress: DailySprintProgress;
  loading: boolean;
}

const PERSON_COLORS = [
  '#0d9488',
  '#2563eb',
  '#7c3aed',
  '#ea580c',
  '#db2777',
  '#0891b2',
  '#65a30d',
  '#dc2626',
];

const STATUS_PRESENTATION: Record<SprintProgressTaskStatus, {
  label: string;
  className: string;
}> = {
  pending: { label: 'A fazer', className: 'border-slate-200 bg-slate-50 text-slate-600' },
  in_progress: { label: 'Em progresso', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  completed: { label: 'Concluída', className: 'border-teal-200 bg-teal-50 text-teal-700' },
};

export function DailySprintProgressCard({
  sprintName,
  progress,
  loading,
}: DailySprintProgressCardProps) {
  const [selectedPerson, setSelectedPerson] = useState<SprintProgressPerson | null>(null);

  if (loading) {
    return (
      <Card aria-label="Carregando progresso da sprint" className="overflow-hidden border-border shadow-none">
        <CardContent className="space-y-4 p-5">
          <div className="flex justify-between gap-4">
            <Skeleton className="h-6 w-56" />
            <Skeleton className="h-8 w-16" />
          </div>
          <Skeleton className="h-5 w-full rounded-full" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-border shadow-none">
        <CardContent className="p-4 sm:p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-muted-foreground">Progresso da sprint</p>
              <h2 className="mt-0.5 text-base font-semibold text-slate-800">{sprintName}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {progress.total === 0
                  ? 'Nenhuma tarefa cadastrada.'
                  : `${progress.completed} de ${progress.total} concluídas · ${progress.inProgress} em andamento`}
              </p>
            </div>
            <strong className="text-2xl font-semibold tabular-nums text-slate-700">{progress.percentage}%</strong>
          </div>

          {progress.total > 0 && (
            <>
              <TooltipProvider delayDuration={150}>
                <div
                  className="mt-5 flex h-5 overflow-hidden rounded-full bg-slate-200 ring-1 ring-slate-200"
                  role="group"
                  aria-label={`Progresso coletivo: ${progress.percentage}%`}
                >
                  {progress.people.map((person, index) => {
                    if (person.completed === 0) return null;
                    const color = PERSON_COLORS[index % PERSON_COLORS.length];
                    return (
                      <Tooltip key={person.id}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="h-full shrink-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-inset"
                            style={{
                              width: `${(person.completed / progress.completed) * progress.percentage}%`,
                              backgroundColor: color,
                            }}
                            aria-label={`${person.name}: ${person.completed} de ${person.total} concluídas, ${person.inProgress} em andamento`}
                            onClick={() => setSelectedPerson(person)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold">{person.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Contribuição: {person.completed} de {progress.total} tarefas da sprint
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {person.completed}/{person.total} próprias concluídas · {person.inProgress} em andamento
                          </p>
                          <p className="mt-1 text-[11px] text-muted-foreground">Clique para ver as tarefas</p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                </div>
              </TooltipProvider>

              <div className="mt-4 flex flex-wrap gap-x-5 gap-y-3">
                {progress.people.map((person, index) => (
                  <button
                    key={person.id}
                    type="button"
                    className="group flex items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-2"
                    onClick={() => setSelectedPerson(person)}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: PERSON_COLORS[index % PERSON_COLORS.length] }}
                    >
                      {person.initials}
                    </span>
                    <span>
                      <span className="block text-xs font-medium text-slate-700">{person.name}</span>
                      <span className="block text-[11px] tabular-nums text-muted-foreground">{person.completed}/{person.total} · {person.percentage}%</span>
                    </span>
                  </button>
                ))}
              </div>

              <p className="mt-3 text-[11px] text-muted-foreground">
                {progress.percentage === 100
                  ? 'Sprint concluída.'
                  : `Próximo marco: ${progress.nextMilestone}%`}
              </p>
            </>
          )}
        </CardContent>
      </Card>

      <PersonTasksDialog
        sprintName={sprintName}
        person={selectedPerson}
        onOpenChange={(open) => !open && setSelectedPerson(null)}
      />
    </>
  );
}

function PersonTasksDialog({
  sprintName,
  person,
  onOpenChange,
}: {
  sprintName: string;
  person: SprintProgressPerson | null;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={Boolean(person)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-hidden sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Tarefas de {person?.name}</DialogTitle>
          <DialogDescription>{sprintName} · {person?.completed ?? 0} de {person?.total ?? 0} concluídas</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {person?.tasks.map((task) => {
            const status = STATUS_PRESENTATION[task.status];
            return (
              <div key={task.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                <div className="min-w-0">
                  {task.task_code && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{task.task_code}</p>}
                  <p className="text-sm font-medium text-slate-800">{task.title}</p>
                </div>
                <Badge variant="outline" className={`shrink-0 ${status.className}`}>
                  {status.label}
                </Badge>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
