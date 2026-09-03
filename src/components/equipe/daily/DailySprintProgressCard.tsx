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
import { entregavelStatusColors } from '@/lib/entregavelStatusColors';
import type {
  DailySprintProgress,
  SprintProgressPerson,
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

// Versões pastéis explícitas: usar `opacity` sobre o fundo cinza deixava o trecho
// de "em progresso" praticamente indistinguível da parte ainda não iniciada.
const PERSON_MUTED_COLORS = [
  '#8dd3cd',
  '#9bbcf4',
  '#c1a7ef',
  '#f4b183',
  '#eca6c8',
  '#91cfdb',
  '#bad787',
  '#eea1a1',
];

// A tarefa do daily tem as MESMAS três chaves do entregável de sprint, então
// rótulo e cor saem do mapa do domínio. A cópia que estava aqui divergia nas duas
// pontas: escrevia "Em progresso"/"Concluída" com caixa e gênero próprios, e
// pintava `in_progress` com o papel `alerta` (âmbar de urgência) em vez de
// `andamento`, o que fazia a mesma tarefa mudar de cor entre esta tela e o Gantt.

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
              <h2 className="mt-0.5 text-base font-semibold text-foreground">{sprintName}</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                {progress.total === 0
                  ? 'Nenhuma tarefa cadastrada.'
                  : `${progress.completed} de ${progress.total} concluídas · ${progress.inProgress} em andamento`}
              </p>
            </div>
            <strong className="text-2xl font-semibold tabular-nums text-foreground">{progress.percentage}%</strong>
          </div>

          {progress.total > 0 && (
            <>
              <TooltipProvider delayDuration={150}>
                <div
                  className="mt-5 flex h-5 overflow-hidden rounded-full bg-border ring-1 ring-border"
                  role="group"
                  aria-label={`Progresso coletivo: ${progress.percentage}%`}
                >
                  {progress.people.map((person, index) => {
                    if (person.completed === 0) return null;
                    const color = PERSON_COLORS[index % PERSON_COLORS.length];
                    return (
                      <Tooltip key={`completed-${person.id}`}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="h-full shrink-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
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
                  {progress.people.map((person, index) => {
                    if (person.inProgress === 0) return null;
                    const mutedColor = PERSON_MUTED_COLORS[index % PERSON_MUTED_COLORS.length];
                    return (
                      <Tooltip key={`in-progress-${person.id}`}>
                        <TooltipTrigger asChild>
                          <button
                            type="button"
                            className="h-full shrink-0 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-muted-foreground focus-visible:ring-inset"
                            style={{
                              width: `${(person.inProgress / progress.total) * 100}%`,
                              backgroundColor: mutedColor,
                            }}
                            aria-label={`${person.name}: ${person.inProgress} ${person.inProgress === 1 ? 'tarefa em progresso' : 'tarefas em progresso'}`}
                            onClick={() => setSelectedPerson(person)}
                          />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="font-semibold">{person.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {person.inProgress} {person.inProgress === 1 ? 'tarefa em progresso' : 'tarefas em progresso'}
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
                    className="group flex items-center gap-2 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    onClick={() => setSelectedPerson(person)}
                  >
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-sm transition-transform group-hover:scale-105"
                      style={{ backgroundColor: PERSON_COLORS[index % PERSON_COLORS.length] }}
                    >
                      {person.initials}
                    </span>
                    <span>
                      <span className="block text-xs font-medium text-foreground">{person.name}</span>
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
            const status = entregavelStatusColors[task.status];
            return (
              <div key={task.id} className="flex items-start justify-between gap-3 rounded-lg border bg-card p-3">
                <div className="min-w-0">
                  {task.task_code && <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{task.task_code}</p>}
                  <p className="text-sm font-medium text-foreground">{task.title}</p>
                </div>
                <Badge variant="outline" className={`shrink-0 ${status.badge}`}>
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
