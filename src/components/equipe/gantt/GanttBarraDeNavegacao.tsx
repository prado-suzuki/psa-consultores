import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BarraDePeriodo } from '@/components/shared/BarraDePeriodo';
import { ESCALAS_DO_GANTT, type GanttEscala } from '@/lib/ganttTimeline';

interface GanttBarraDeNavegacaoProps {
  titulo: string;
  escala: GanttEscala;
  onEscala: (escala: GanttEscala) => void;
  onPasso: (direcao: 1 | -1) => void;
  onHoje: () => void;
}

/**
 * A `BarraDePeriodo` com o que é só do Gantt: a escala. Ela ocupa o slot entre
 * `Hoje` e as setas, que é onde estava antes de a barra virar componente
 * compartilhado com o Calendário.
 */
export function GanttBarraDeNavegacao({
  titulo,
  escala,
  onEscala,
  onPasso,
  onHoje,
}: GanttBarraDeNavegacaoProps) {
  return (
    <BarraDePeriodo titulo={titulo} onPasso={onPasso} onHoje={onHoje}>
      <Select value={escala} onValueChange={(valor) => onEscala(valor as GanttEscala)}>
        <SelectTrigger className="h-8 w-[132px] border-0 bg-transparent px-2 text-sm font-medium shadow-none focus:ring-0">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {ESCALAS_DO_GANTT.map((opcao) => (
            <SelectItem key={opcao.valor} value={opcao.valor}>
              {opcao.rotulo}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </BarraDePeriodo>
  );
}
