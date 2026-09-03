import type { ReactNode } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

/**
 * A maiúscula da primeira letra, e só dela.
 *
 * Quem monta o título usa date-fns em ptBR, que devolve mês em minúscula
 * ("agosto de 2026"). `capitalize` transformaria cada palavra, e o título do
 * Gantt na escala de semana é "23 ago – 29 ago". Quem manda um NÓ como título
 * já traz o rótulo pronto.
 */
const rotuloDoPeriodo = (titulo: string) => titulo.charAt(0).toUpperCase() + titulo.slice(1);

interface BarraDePeriodoProps {
  /**
   * O período desenhado agora: "Agosto de 2026", "23 ago – 29 ago 2026".
   *
   * Texto ganha a maiúscula e o estilo de título aqui. Nó vem pronto — é como
   * o painel de tarefas põe o seletor de recorte no lugar do título, que é
   * onde a pessoa clica para escolher entre um mês e tudo.
   */
  titulo: ReactNode;
  onHoje: () => void;
  onPasso: (direcao: 1 | -1) => void;
  rotuloAnterior?: string;
  rotuloProximo?: string;
  /**
   * Controle que é só daquela tela, entre `Hoje` e as setas. A escala do Gantt
   * (semana/mês/trimestre) entra aqui; o Calendário não passa nada, porque mês
   * é a única escala que ele tem.
   */
  children?: ReactNode;
  className?: string;
}

/**
 * A barra das telas que andam no tempo.
 *
 * Duas telas fazem a mesma coisa — Calendário e Gantt — e não se pareciam. O
 * Gantt já tinha esta barra: `Hoje · escala · ‹ › · título`, tudo à esquerda. O
 * Calendário tinha o título solto à esquerda e os controles jogados na direita,
 * grudados na legenda de status. Agora a barra é uma só, e a legenda saiu da
 * linha de controles — legenda não é controle.
 *
 * `Hoje` nunca desabilita. O Gantt o desabilitava quando o dia já estava na
 * janela desenhada; botão cinza lê como quebrado, e voltar para hoje continua
 * fazendo algo mesmo com o dia à vista — ele recentra a janela e a rolagem.
 */
export function BarraDePeriodo({
  titulo,
  onHoje,
  onPasso,
  rotuloAnterior = 'Período anterior',
  rotuloProximo = 'Próximo período',
  children,
  className,
}: BarraDePeriodoProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 border-b border-border px-3 py-2',
        className,
      )}
    >
      <Button variant="ghost" size="sm" onClick={onHoje}>
        Hoje
      </Button>

      {children}

      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPasso(-1)}
          aria-label={rotuloAnterior}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => onPasso(1)}
          aria-label={rotuloProximo}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {typeof titulo === 'string'
        ? <span className="text-base font-semibold text-foreground">{rotuloDoPeriodo(titulo)}</span>
        : titulo}
    </div>
  );
}
