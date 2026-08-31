import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ESCALAS_DO_GANTT, type GanttEscala } from '@/lib/ganttTimeline';

interface GanttBarraDeNavegacaoProps {
  titulo: string;
  escala: GanttEscala;
  /** Hoje já está na janela desenhada — o botão então não leva a lugar nenhum. */
  hojeVisivel: boolean;
  onEscala: (escala: GanttEscala) => void;
  onPasso: (direcao: 1 | -1) => void;
  onHoje: () => void;
}

/** Hoje · escala · ‹ › · título do período. A ordem é a da referência. */
export function GanttBarraDeNavegacao({
  titulo,
  escala,
  hojeVisivel,
  onEscala,
  onPasso,
  onHoje,
}: GanttBarraDeNavegacaoProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <Button variant="ghost" size="sm" onClick={onHoje} disabled={hojeVisivel}>
        Hoje
      </Button>

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

      <div className="flex items-center">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPasso(-1)} aria-label="Período anterior">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onPasso(1)} aria-label="Próximo período">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <span className="text-base font-semibold text-foreground">{titulo}</span>
    </div>
  );
}
