import { cn } from '@/lib/utils';
import type { GanttEixo } from '@/lib/ganttTimeline';

interface GanttCabecalhoDoEixoProps {
  eixo: GanttEixo;
  larguraDoNome: number;
  rotuloDaColuna: string;
}

/**
 * Cabeçalho de dois níveis: o grupo em cima (semana, ou mês no trimestre) e a
 * unidade embaixo. A coluna de nome fica grudada à esquerda pelo `sticky`, que
 * é o que deixa o eixo rolar sem levar o responsável junto.
 */
export function GanttCabecalhoDoEixo({ eixo, larguraDoNome, rotuloDaColuna }: GanttCabecalhoDoEixoProps) {
  return (
    <div className="sticky top-0 z-20 bg-muted/50 backdrop-blur-sm">
      <div className="flex border-b border-border">
        <div
          className="sticky left-0 z-10 flex flex-shrink-0 items-end border-r border-border bg-muted px-4 py-2 text-sm font-medium"
          style={{ width: larguraDoNome }}
        >
          {rotuloDaColuna}
        </div>
        <div>
          <div className="flex border-b border-border" style={{ width: eixo.largura }}>
            {eixo.grupos.map((grupo) => (
              <div
                key={grupo.chave}
                className="flex-shrink-0 truncate border-r border-border px-2 py-1.5 text-xs font-medium text-muted-foreground last:border-r-0"
                style={{ width: grupo.unidades * eixo.larguraDaUnidade }}
              >
                {grupo.rotulo}
              </div>
            ))}
          </div>
          <div className="flex" style={{ width: eixo.largura }}>
            {eixo.unidades.map((unidade) => (
              <div
                key={unidade.inicio.toISOString()}
                className={cn(
                  'flex-shrink-0 border-r border-border px-1 py-1 text-center last:border-r-0',
                  unidade.fimDeSemana && 'bg-muted',
                )}
                style={{ width: eixo.larguraDaUnidade }}
              >
                <div className="text-[10px] uppercase text-muted-foreground">{unidade.legenda}</div>
                <div
                  className={cn(
                    'mx-auto mt-0.5 w-fit rounded-full px-1.5 text-xs font-medium',
                    unidade.contemHoje ? 'bg-primary text-primary-foreground' : 'text-foreground',
                  )}
                >
                  {unidade.rotulo}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
