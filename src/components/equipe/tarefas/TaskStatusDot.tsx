import { Check } from 'lucide-react';

import type { OrgTaskStatus } from '@/hooks/useOrgTasks';
import { statusColors } from '@/lib/taskStatusColors';
import { cn } from '@/lib/utils';

/** Quanto do círculo cada status preenche — leitura de progresso, não de tempo. */
const taskStatusProgress: Record<OrgTaskStatus, number> = {
  backlog: 0,
  todo: 0,
  waiting_client: 25,
  in_progress: 25,
  review: 75,
  em_ajuste: 75,
  done: 100,
};

/**
 * Bolinha de progresso do status, usada na lista de projetos/tarefas e na
 * lista de subtarefas do modal.
 */
export function TaskStatusDot({ status, className }: { status: OrgTaskStatus; className?: string }) {
  const progress = taskStatusProgress[status];
  return (
    <span
      role="img"
      aria-label={`${statusColors[status].label}: ${progress}%`}
      className={cn(
        'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border border-current p-px',
        statusColors[status].text,
        className,
      )}
    >
      <span
        className="flex h-full w-full items-center justify-center rounded-full"
        style={{
          background:
            progress === 100
              ? 'currentColor'
              : `conic-gradient(currentColor ${progress * 3.6}deg, transparent 0deg)`,
        }}
      >
        {progress === 100 && <Check className="h-2 w-2 stroke-[3] text-white" />}
      </span>
    </span>
  );
}
