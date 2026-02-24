import type { FiscalTaskStatus } from '@/hooks/useFiscalTasks';

export interface StatusColorConfig {
  key: FiscalTaskStatus;
  label: string;
  bg: string;        // bg-{color}-100
  text: string;       // text-{color}-700
  bgSolid: string;    // bg-{color}-500 (for dots, indicators)
  combined: string;   // "bg-{x}-100 text-{x}-700" shorthand
}

export const statusColors: Record<FiscalTaskStatus, StatusColorConfig> = {
  backlog:        { key: 'backlog',        label: 'Backlog',           bg: 'bg-slate-100',   text: 'text-slate-700',   bgSolid: 'bg-slate-400',   combined: 'bg-slate-100 text-slate-700' },
  waiting_client: { key: 'waiting_client', label: 'Pendente Cliente',  bg: 'bg-orange-100',  text: 'text-orange-700',  bgSolid: 'bg-orange-500',  combined: 'bg-orange-100 text-orange-700' },
  todo:           { key: 'todo',           label: 'A Fazer',           bg: 'bg-blue-100',    text: 'text-blue-700',    bgSolid: 'bg-blue-500',    combined: 'bg-blue-100 text-blue-700' },
  in_progress:    { key: 'in_progress',    label: 'Em Progresso',      bg: 'bg-amber-100',   text: 'text-amber-700',   bgSolid: 'bg-amber-500',   combined: 'bg-amber-100 text-amber-700' },
  review:         { key: 'review',         label: 'Revisão',           bg: 'bg-purple-100',  text: 'text-purple-700',  bgSolid: 'bg-purple-500',  combined: 'bg-purple-100 text-purple-700' },
  done:           { key: 'done',           label: 'Concluído',         bg: 'bg-emerald-100', text: 'text-emerald-700', bgSolid: 'bg-emerald-500', combined: 'bg-emerald-100 text-emerald-700' },
};

/** Ordered array for rendering lists/KPIs */
export const statusList: StatusColorConfig[] = [
  statusColors.backlog,
  statusColors.waiting_client,
  statusColors.todo,
  statusColors.in_progress,
  statusColors.review,
  statusColors.done,
];
