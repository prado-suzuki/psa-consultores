import { useMemo, useState } from 'react';
import { passoDeMes, tarefasNoPeriodo } from '@/lib/periodoDeTarefas';
import type { OrgTask } from '@/hooks/useOrgTasks';

export interface PeriodoDeTarefas {
  mes: Date;
  /** As tarefas do mês, já recortadas. */
  tarefas: OrgTask[];
  onPasso: (direcao: 1 | -1) => void;
  onHoje: () => void;
}

/**
 * O mês das abas do painel, num lugar só.
 *
 * Vive aqui e não dentro de cada aba porque o mês é COMPARTILHADO: quem estava
 * vendo setembro na Lista e abre o Calendário continua em setembro. Antes o
 * Calendário guardava o mês dele e as outras abas não tinham mês nenhum.
 */
export function usePeriodoDeTarefas(tasks: OrgTask[]): PeriodoDeTarefas {
  const [mes, setMes] = useState(() => new Date());
  const tarefas = useMemo(() => tarefasNoPeriodo(tasks, mes), [tasks, mes]);

  return {
    mes,
    tarefas,
    onPasso: direcao => setMes(atual => passoDeMes(atual, direcao)),
    onHoje: () => setMes(new Date()),
  };
}
