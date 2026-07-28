import { STATUS_LABELS } from '@/lib/projetosCadastro';

/**
 * Cores e rótulos de status de projeto — espelha `taskStatusColors`, para que a
 * pílula de status do modal de projeto seja lida do mesmo jeito que a da tarefa.
 *
 * Os rótulos vêm de `STATUS_LABELS` (`src/lib/projetosCadastro.ts`), que já é a
 * fonte usada pela tabela de projetos: aqui entram apenas as cores.
 */
export interface ProjectStatusConfig {
  key: string;
  label: string;
  /** `bg` do ponto indicador. */
  dot: string;
  /** `bg + text + border` para pílula/badge. */
  badge: string;
}

export const projectStatusColors: Record<string, ProjectStatusConfig> = {
  planned: {
    key: 'planned',
    label: STATUS_LABELS.planned,
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:border-slate-800',
  },
  active: {
    key: 'active',
    label: STATUS_LABELS.active,
    dot: 'bg-emerald-500',
    badge:
      'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-200 dark:border-emerald-900',
  },
  on_hold: {
    key: 'on_hold',
    label: STATUS_LABELS.on_hold,
    dot: 'bg-amber-500',
    badge:
      'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-200 dark:border-amber-900',
  },
  completed: {
    key: 'completed',
    label: STATUS_LABELS.completed,
    dot: 'bg-blue-500',
    badge:
      'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-200 dark:border-blue-900',
  },
  cancelled: {
    key: 'cancelled',
    label: STATUS_LABELS.cancelled,
    dot: 'bg-rose-500',
    badge:
      'bg-rose-100 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-200 dark:border-rose-900',
  },
};

/** Ordem de exibição no select: do começo ao fim do ciclo de vida do projeto. */
export const projectStatusList: ProjectStatusConfig[] = [
  projectStatusColors.planned,
  projectStatusColors.active,
  projectStatusColors.on_hold,
  projectStatusColors.completed,
  projectStatusColors.cancelled,
];

/**
 * Configuração de um status, com fallback neutro. `org_projects.status` é `text`
 * livre no banco — um valor fora da lista não pode quebrar o render.
 */
export function projectStatusConfig(status: string | null | undefined): ProjectStatusConfig {
  if (status && projectStatusColors[status]) return projectStatusColors[status];
  return {
    key: status || '',
    label: status || 'Sem status',
    dot: 'bg-muted-foreground',
    badge: 'bg-muted text-muted-foreground border-border',
  };
}
