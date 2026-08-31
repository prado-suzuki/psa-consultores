import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { GanttEixo } from '@/lib/ganttTimeline';

interface GanttFaixaDoTempoProps {
  eixo: GanttEixo;
  /** Px da linha do agora dentro desta faixa, ou `null` fora da janela. */
  agora: number | null;
  altura: string;
  children?: ReactNode;
}

/**
 * A grade de uma linha: uma coluna por unidade do eixo, fim de semana marcado,
 * a coluna de hoje realçada e a linha do agora por cima. As barras entram como
 * `children`, posicionadas em px sobre esta mesma faixa.
 */
export function GanttFaixaDoTempo({ eixo, agora, altura, children }: GanttFaixaDoTempoProps) {
  return (
    <div className={cn('relative flex-shrink-0', altura)} style={{ width: eixo.largura }}>
      <div className="absolute inset-0 flex">
        {eixo.unidades.map((unidade) => (
          <div
            key={unidade.inicio.toISOString()}
            className={cn(
              'flex-shrink-0 border-r border-border last:border-r-0',
              unidade.fimDeSemana && 'bg-muted/50',
              unidade.contemHoje && 'bg-primary/5',
            )}
            style={{ width: eixo.larguraDaUnidade }}
          />
        ))}
      </div>
      {agora !== null && (
        <div
          className="pointer-events-none absolute inset-y-0 w-px bg-destructive"
          style={{ left: agora }}
          aria-hidden
        />
      )}
      {children}
    </div>
  );
}
