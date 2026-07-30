import type { OrgTaskPriority } from '@/hooks/useOrgTasks';

/**
 * Cores e rótulos de prioridade das tarefas — espelha `taskStatusColors`.
 *
 * As telas antigas de tarefa (TaskCard, TaskTable, TaskTodayView) ainda mantêm
 * cópias locais desse mapa; migrá-las é uma limpeza separada.
 */
export interface TaskPriorityConfig {
  key: OrgTaskPriority;
  label: string;
  /** `bg + text + border` para Badge/pílula. */
  badge: string;
  /** `bg` do ponto indicador. */
  dot: string;
}

export const taskPriorityColors: Record<OrgTaskPriority, TaskPriorityConfig> = {
  urgent: {
    key: 'urgent',
    label: 'Urgente',
    badge: 'bg-destructive/10 text-destructive border-destructive/20',
    dot: 'bg-destructive',
  },
  high: {
    key: 'high',
    label: 'Alta',
    badge: 'bg-warning/10 text-warning border-warning/20',
    dot: 'bg-warning',
  },
  medium: {
    key: 'medium',
    label: 'Média',
    badge: 'bg-info/10 text-info border-info/20',
    dot: 'bg-info',
  },
  low: {
    key: 'low',
    label: 'Baixa',
    badge: 'bg-muted text-muted-foreground border-border',
    dot: 'bg-muted-foreground',
  },
};

/** Ordem de exibição no select: da menor para a maior urgência. */
export const taskPriorityList: TaskPriorityConfig[] = [
  taskPriorityColors.low,
  taskPriorityColors.medium,
  taskPriorityColors.high,
  taskPriorityColors.urgent,
];
