import { useMemo, useState } from 'react';
import { passoDeMes, tarefasNoPeriodo } from '@/lib/periodoDeTarefas';
import { getTodayBrazil } from '@/lib/dateUtils';
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
 *
 * `hoje` entra no recorte porque tarefa sem prazo fica parada em hoje: ela só
 * aparece enquanto o mês corrente está à vista.
 */
export function usePeriodoDeTarefas(tasks: OrgTask[]): PeriodoDeTarefas {
  const [mes, setMes] = useState(() => new Date());
  const hoje = getTodayBrazil();
  /* `getTodayBrazil` devolve um Date novo a cada render, e o que o recorte usa
     dele é o DIA. `diaDeHoje` é esse dia como número, e é ele que entra na
     dependência: com o Date, o memo recalcularia em todo render. */
  const diaDeHoje = hoje.getTime();
  const tarefas = useMemo(
    () => tarefasNoPeriodo(tasks, mes, hoje),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `diaDeHoje` representa `hoje`; ver o comentário acima.
    [tasks, mes, diaDeHoje],
  );

  return {
    mes,
    tarefas,
    onPasso: direcao => setMes(atual => passoDeMes(atual, direcao)),
    onHoje: () => setMes(new Date()),
  };
}
