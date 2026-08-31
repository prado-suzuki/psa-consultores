import { addMonths, format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseDate } from '@/lib/dateUtils';
import type { OrgTask } from '@/hooks/useOrgTasks';

/**
 * O mês como recorte das abas do painel de tarefas.
 *
 * Lista, Tabela e Calendário passaram a andar no tempo pela mesma barra, e o
 * mês é um só entre elas: trocar de aba não devolve a pessoa para o mês
 * corrente. O Gantt fica fora — ele tem âncora e escala próprias
 * (semana/mês/trimestre), e forçá-lo a compartilhar o mês tiraria a escala.
 */

/** "Agosto de 2026" — o mesmo formato do título do Gantt na escala de mês. */
export function tituloDoMes(mes: Date): string {
  return format(mes, "MMMM 'de' yyyy", { locale: ptBR });
}

export function passoDeMes(mes: Date, direcao: 1 | -1): Date {
  return addMonths(mes, direcao);
}

/**
 * As tarefas que o mês mostra.
 *
 * **Tarefa sem prazo entra em todo mês.** Não é descuido: ela não pertence a
 * mês nenhum, e Calendário e Gantt já a ignoram por construção (os dois
 * dependem de `due_date`). Se a Lista e a Tabela também a escondessem, ela não
 * apareceria em ABA NENHUMA do painel — trabalho sumindo da tela por causa de
 * um controle de navegação. O prazo dela aparece como "Sem prazo" na coluna.
 *
 * Subtarefa cujo pai caiu fora do mês continua visível: `buildTaskTree` promove
 * a filha a raiz quando não acha o pai no conjunto. Ela perde o aninhamento, não
 * a existência.
 */
export function tarefasNoPeriodo(tasks: OrgTask[], mes: Date): OrgTask[] {
  return tasks.filter(task => !task.due_date || isSameMonth(parseDate(task.due_date), mes));
}
