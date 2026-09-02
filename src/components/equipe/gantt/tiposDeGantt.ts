import type { PAPEIS_DE_STATUS } from '@/lib/paletaDeArea';

/**
 * O contrato que o Gantt comum aceita. Ele não conhece tarefa nem entregável:
 * cada tela traduz o que tem para cá, e é essa tradução que permite as duas
 * viverem no mesmo componente sem uma carregar o vocabulário da outra.
 *
 * `papel` é PAPEL DE STATUS, nunca cor — quem resolve o tom é o tema da área
 * aplicado no `<html>`. Ver `docs/geral/paleta-por-area.md`.
 */
export type GanttPapel = (typeof PAPEIS_DE_STATUS)[number];

export interface GanttItem {
  id: string;
  titulo: string;
  inicio: Date;
  /** Inclusivo: um item de um dia tem `inicio` igual a `fim`. */
  fim: Date;
  papel: GanttPapel;
  /** Risca o título e apaga a barra um pouco. */
  concluido?: boolean;
  /** 0 a 100, escrito ao lado da barra. `null` esconde. */
  progresso?: number | null;
  /** Linha secundária do nome — a tela decide o que vale citar. */
  detalhe?: string | null;
}

export interface GanttGrupo {
  id: string;
  nome: string;
  /** Linha de baixo do nome: `3 tarefas • 1/3 concluídas`. */
  resumo: string;
  itens: GanttItem[];
}
