import { BarraDePeriodo } from '@/components/shared/BarraDePeriodo';
import { tituloDoMes } from '@/lib/periodoDeTarefas';
import type { PeriodoDeTarefas } from '@/hooks/usePeriodoDeTarefas';

/**
 * A `BarraDePeriodo` na escala de mês, que é a das abas do painel de tarefas.
 *
 * Existe para o formato do título e os rótulos das setas ficarem num lugar só —
 * Lista, Tabela e Calendário renderiam os mesmos cinco atributos, e a terceira
 * cópia é onde um deles começa a divergir. Não é wrapper passa-tudo: ele é o
 * que sabe que aqui o período é um mês.
 */
export function BarraDeMes({ periodo }: { periodo: PeriodoDeTarefas }) {
  return (
    <BarraDePeriodo
      titulo={tituloDoMes(periodo.mes)}
      onHoje={periodo.onHoje}
      onPasso={periodo.onPasso}
      rotuloAnterior="Mês anterior"
      rotuloProximo="Próximo mês"
    />
  );
}
