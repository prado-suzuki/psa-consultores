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
 * **Tarefa sem prazo fica parada em hoje**, e só aparece enquanto o mês
 * corrente está à vista. Ela não pertence a mês nenhum, e as duas saídas ruins
 * eram: escondê-la (Calendário e Gantt já a ignoram porque dependem de
 * `due_date`, então ela não apareceria em ABA NENHUMA do painel — trabalho
 * sumindo da tela por causa de um controle de navegação) ou repeti-la em todo
 * mês (ela vira ruído permanente e ninguém arruma a data).
 *
 * Parada em hoje ela é uma cobrança: está no caminho de quem olha o mês
 * corrente, e sai de lá no instante em que alguém define o prazo. No Calendário
 * isso é literal — ela ocupa a célula de hoje, marcada como sem prazo.
 *
 * Subtarefa cujo pai caiu fora do mês continua visível: `buildTaskTree` promove
 * a filha a raiz quando não acha o pai no conjunto. Ela perde o aninhamento, não
 * a existência.
 */
export function tarefasNoPeriodo(tasks: OrgTask[], mes: Date, hoje: Date): OrgTask[] {
  const hojeEstaAVista = isSameMonth(mes, hoje);
  return tasks.filter(task =>
    task.due_date ? isSameMonth(parseDate(task.due_date), mes) : hojeEstaAVista,
  );
}

/**
 * Da mais próxima para a mais distante.
 *
 * A aba Futuras herdava a ordem em que as tarefas chegavam da consulta. Os
 * grupos de semana já saíam em ordem, mas DENTRO de cada um não: em "Esta
 * semana", uma que vencia na sexta podia aparecer antes de uma de segunda — e a
 * aba que existe justamente para responder "o que vem primeiro" não respondia.
 *
 * Tarefa sem prazo vai para o fim: ela não tem lugar na fila de vencimento.
 * Empate mantém a ordem de entrada, porque `Array.sort` é estável.
 */
export function ordenarPorVencimento(tasks: OrgTask[]): OrgTask[] {
  return [...tasks].sort((a, b) => {
    if (!a.due_date) return b.due_date ? 1 : 0;
    if (!b.due_date) return -1;
    return parseDate(a.due_date).getTime() - parseDate(b.due_date).getTime();
  });
}
