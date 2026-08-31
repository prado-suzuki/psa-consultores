import type { OrgTaskStatus } from '@/hooks/useOrgTasks';
import type { PAPEIS_DE_STATUS } from '@/lib/paletaDeArea';

export interface StatusColorConfig {
  key: OrgTaskStatus;
  label: string;
  /** O papel de status por trás das classes abaixo, para quem precisa do nome
      e não da classe — o Gantt comum monta a barra a partir dele. */
  papel: (typeof PAPEIS_DE_STATUS)[number];
  bg: string;         // fundo suave da pílula
  text: string;       // cor cheia, para texto sobre o fundo suave
  bgSolid: string;    // cor cheia como fundo (ponto, barra, badge de texto branco)
  combined: string;   // "bg + text" para a pílula inteira
}

/**
 * Cada status aponta para um PAPEL de status (`--status-<papel>` em `index.css`),
 * não para uma cor. Quem define o tom é o tema da área: teal na Tax (:root),
 * verde musgo na OSG (`.osg-theme`). Antes as cores eram Tailwind cru
 * (azul + âmbar + roxo + rosa + esmeralda), que não pertenciam a paleta nenhuma.
 */
export const statusColors: Record<OrgTaskStatus, StatusColorConfig> = {
  backlog:        { key: 'backlog', papel: 'neutro',        label: 'Backlog',           bg: 'bg-status-neutro-soft',     text: 'text-status-neutro',     bgSolid: 'bg-status-neutro',     combined: 'bg-status-neutro-soft text-status-neutro' },
  waiting_client: { key: 'waiting_client', papel: 'espera', label: 'Pendente Cliente',  bg: 'bg-status-espera-soft',     text: 'text-status-espera',     bgSolid: 'bg-status-espera',     combined: 'bg-status-espera-soft text-status-espera' },
  todo:           { key: 'todo', papel: 'fila',           label: 'A Fazer',           bg: 'bg-status-fila-soft',       text: 'text-status-fila',       bgSolid: 'bg-status-fila',       combined: 'bg-status-fila-soft text-status-fila' },
  in_progress:    { key: 'in_progress', papel: 'andamento',    label: 'Em Progresso',      bg: 'bg-status-andamento-soft',  text: 'text-status-andamento',  bgSolid: 'bg-status-andamento',  combined: 'bg-status-andamento-soft text-status-andamento' },
  review:         { key: 'review', papel: 'revisao',         label: 'Revisão',           bg: 'bg-status-revisao-soft',    text: 'text-status-revisao',    bgSolid: 'bg-status-revisao',    combined: 'bg-status-revisao-soft text-status-revisao' },
  em_ajuste:      { key: 'em_ajuste', papel: 'ajuste',      label: 'Em Ajuste',         bg: 'bg-status-ajuste-soft',     text: 'text-status-ajuste',     bgSolid: 'bg-status-ajuste',     combined: 'bg-status-ajuste-soft text-status-ajuste' },
  done:           { key: 'done', papel: 'feito',           label: 'Concluído',         bg: 'bg-status-feito-soft',      text: 'text-status-feito',      bgSolid: 'bg-status-feito',      combined: 'bg-status-feito-soft text-status-feito' },
};

/** Ordered array for rendering lists/KPIs */
export const statusList: StatusColorConfig[] = [
  statusColors.backlog,
  statusColors.waiting_client,
  statusColors.todo,
  statusColors.in_progress,
  statusColors.review,
  statusColors.em_ajuste,
  statusColors.done,
];
