import type { STAGE_TO_STATUS } from '@/hooks/useProcessMapping';

/**
 * Status de processo mapeado, nos papéis de status da área — espelha
 * `taskStatusColors`, `projetoStatusColors` e `chamadoStatusColors`
 * (ver `docs/geral/paleta-por-area.md`).
 *
 * Por que centralizar: o mesmo trio vivia em QUATRO lugares da tela de
 * mapeamento, e nenhum deles concordava com o outro. "Não Iniciado" era
 * `text-amber-500` no acordeão de área, `bg-amber-100 text-amber-700` na
 * planilha e `text-amber-500` sobre `bg-amber-50` no KPI; "Concluído" era
 * `text-teal-600` num, `bg-accent/10 text-teal-700` no outro. Quem já estava
 * centralizado era só o `STAGE_TO_STATUS`, em `useProcessMapping` — a etapa
 * virava status num lugar só, e aí cada tela pintava do seu jeito.
 *
 * O papel de cada um sai do vocabulário do contrato: `neutro` é "não começou /
 * sem carga", `andamento` é "está andando", `feito` é "acabou".
 */
export interface MapeamentoStatusConfig {
  key: MapeamentoStatus;
  label: string;
  /** Pílula clara: fundo suave, texto na cor cheia, borda do próprio tom. */
  badge: string;
  /** Cor cheia como texto — ícone, número de KPI. */
  text: string;
  /** Fundo suave sozinho, para o quadrado do ícone do KPI. */
  soft: string;
}

export type MapeamentoStatus = (typeof STAGE_TO_STATUS)[string];

function papel(key: MapeamentoStatus, label: string, nome: string): MapeamentoStatusConfig {
  return {
    key,
    label,
    badge: `bg-status-${nome}-soft text-status-${nome} border-status-${nome}/15`,
    text: `text-status-${nome}`,
    soft: `bg-status-${nome}-soft`,
  };
}

export const mapeamentoStatusColors: Record<MapeamentoStatus, MapeamentoStatusConfig> = {
  not_started: papel('not_started', 'Não Iniciado', 'neutro'),
  in_progress: papel('in_progress', 'Em Andamento', 'andamento'),
  completed: papel('completed', 'Concluído', 'feito'),
};

/**
 * Configuração com fallback em `in_progress`, que é o mesmo fallback que as
 * telas já aplicavam ao ler `STAGE_TO_STATUS[p.stage] ?? 'in_progress'`.
 */
export function mapeamentoStatusConfig(status: string | null | undefined): MapeamentoStatusConfig {
  if (status && status in mapeamentoStatusColors) {
    return mapeamentoStatusColors[status as MapeamentoStatus];
  }
  return mapeamentoStatusColors.in_progress;
}

/** Ordem de exibição: do começo ao fim do ciclo. */
export const mapeamentoStatusList: MapeamentoStatusConfig[] = [
  mapeamentoStatusColors.not_started,
  mapeamentoStatusColors.in_progress,
  mapeamentoStatusColors.completed,
];
