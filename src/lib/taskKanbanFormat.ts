import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Prazo curto do card do quadro de tarefas (dd/MM).
 *
 * O `T00:00:00` é obrigatório: `due_date` é `date` no banco, e `new Date('2026-08-31')`
 * seria lido como UTC — em fuso negativo o card mostraria o dia anterior.
 */
export function formatKanbanDate(date: string | null) {
  if (!date) return '';
  return format(new Date(`${date}T00:00:00`), 'dd/MM', { locale: ptBR });
}
