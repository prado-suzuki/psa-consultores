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

/**
 * Mesmos papéis de status da tarefa (`--status-<papel>`), aplicados ao ciclo de
 * vida do projeto: quem manda no tom é o tema da área. Projeto ativo compartilha
 * o papel `andamento` com a tarefa em progresso de propósito — na mesma tela, a
 * mesma ideia não deve ter duas cores.
 */
export const projectStatusColors: Record<string, ProjectStatusConfig> = {
  planned: {
    key: 'planned',
    label: STATUS_LABELS.planned,
    dot: 'bg-status-neutro',
    badge: 'bg-status-neutro-soft text-status-neutro border-status-neutro/15',
  },
  active: {
    key: 'active',
    label: STATUS_LABELS.active,
    dot: 'bg-status-andamento',
    badge: 'bg-status-andamento-soft text-status-andamento border-status-andamento/15',
  },
  on_hold: {
    key: 'on_hold',
    label: STATUS_LABELS.on_hold,
    dot: 'bg-status-espera',
    badge: 'bg-status-espera-soft text-status-espera border-status-espera/15',
  },
  completed: {
    key: 'completed',
    label: STATUS_LABELS.completed,
    dot: 'bg-status-feito',
    badge: 'bg-status-feito-soft text-status-feito border-status-feito/15',
  },
  cancelled: {
    key: 'cancelled',
    label: STATUS_LABELS.cancelled,
    dot: 'bg-status-ajuste',
    badge: 'bg-status-ajuste-soft text-status-ajuste border-status-ajuste/15',
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
