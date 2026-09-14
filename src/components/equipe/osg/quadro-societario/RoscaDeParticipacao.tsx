import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { useEntrouEmCena } from './animacaoDoQuadro';
import type { FatiaDaRosca } from './fatiasDoQuadro';

// A ROSCA de participação no capital: a forma do quadro societário, à esquerda
// dos números do resumo.
//
// Não repete o que a tabela escreve — responde outra pergunta. A coluna de
// percentual diz quanto cada sócio tem; a rosca diz de que tamanho é a maior
// fatia antes de se ler qualquer número, que é a primeira coisa que se quer
// saber ao abrir o quadro de uma sociedade. E ela é a LEGENDA da tabela: o
// ponto colorido de cada linha é a fatia correspondente, e passar o mouse em
// uma destaca a outra nos dois sentidos.
//
// Além de oito sócios as fatias viram fatia só: um anel de 42 fios não tem
// forma nenhuma, e o cliente Barralcool tem exatamente isso.

const RAIO = 42;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;
/** Respiro entre fatias, em unidades do perímetro (~1,2°). */
const FOLGA = CIRCUNFERENCIA * 0.003;

interface RoscaDeParticipacaoProps {
  fatias: FatiaDaRosca[];
  /** Chave da fatia em destaque, vinda da tabela ou da própria rosca. */
  emFoco?: string | null;
  onFoco?: (chave: string | null) => void;
  /** Frase do miolo quando nada está em foco (ex.: "5 sócios"). */
  legenda: string;
  className?: string;
}

export const RoscaDeParticipacao = ({
  fatias, emFoco, onFoco, legenda, className,
}: RoscaDeParticipacaoProps) => {
  const entrou = useEntrouEmCena();

  // Cada fatia carrega onde começa: o desenho é um arco só por sócio, girado
  // até o seu lugar, e não um caminho acumulado.
  const arcos = useMemo(() => {
    const total = fatias.reduce((s, f) => s + f.percentual, 0);
    if (total <= 0) return [];
    let acumulado = 0;
    return fatias.map((f) => {
      const inicio = acumulado / total;
      acumulado += f.percentual;
      return { ...f, inicio, fracao: f.percentual / total };
    });
  }, [fatias]);

  const destacada = arcos.find((a) => a.chave === emFoco) ?? null;

  if (arcos.length === 0) return null;

  return (
    <div
      className={cn('relative h-[116px] w-[116px] shrink-0', className)}
      onMouseLeave={() => onFoco?.(null)}
    >
      <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90 overflow-visible">
        {/* Trilho: o anel continua legível enquanto as fatias crescem. */}
        <circle
          cx="50" cy="50" r={RAIO}
          fill="none"
          stroke="hsl(var(--osg-100))"
          strokeWidth="11"
        />
        {arcos.map((a) => {
          const comprimento = Math.max(a.fracao * CIRCUNFERENCIA - FOLGA, 0.5);
          const foco = emFoco === a.chave;
          const outroEmFoco = emFoco != null && !foco;
          return (
            <circle
              key={a.chave}
              cx="50" cy="50" r={RAIO}
              fill="none"
              stroke={a.cor}
              strokeWidth={foco ? 15 : 11}
              strokeLinecap="butt"
              strokeDasharray={`${comprimento} ${CIRCUNFERENCIA}`}
              // O deslocamento empurra o traço para fora da janela visível; ele
              // volta a zero na montagem e a fatia CRESCE a partir do seu
              // início, uma depois da outra.
              strokeDashoffset={entrou ? 0 : comprimento}
              transform={`rotate(${a.inicio * 360} 50 50)`}
              opacity={outroEmFoco ? 0.35 : 1}
              className="cursor-pointer motion-reduce:transition-none"
              style={{
                // O atraso é declarado NA transição do `stroke-dashoffset`, e
                // não em `transition-delay`: este último atrasaria também o
                // destaque do hover, e zerá-lo junto com a entrada não
                // funcionaria — as duas mudanças chegam no mesmo commit do
                // React, e o atraso já teria sumido quando a entrada começa.
                transition: [
                  `stroke-dashoffset 700ms cubic-bezier(0.22,1,0.36,1) ${(a.inicio * 420).toFixed(0)}ms`,
                  'stroke-width 180ms ease-out',
                  'opacity 180ms ease-out',
                ].join(', '),
              }}
              onMouseEnter={() => onFoco?.(a.chave)}
            />
          );
        })}
      </svg>

      {/* O miolo troca de conteúdo com o foco, sem mudar de tamanho: é onde o
          nome do sócio apontado aparece por extenso. */}
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-3 text-center">
        {destacada ? (
          <>
            <span className="text-base font-semibold tabular-nums text-osg-700">
              {destacada.percentual.toLocaleString('pt-BR', {
                minimumFractionDigits: 1, maximumFractionDigits: 1,
              })}%
            </span>
            <span className="line-clamp-2 text-[10px] leading-tight text-muted-foreground">
              {destacada.nome}
            </span>
          </>
        ) : (
          <span className="text-[11px] font-medium leading-tight text-muted-foreground">
            {legenda}
          </span>
        )}
      </div>
    </div>
  );
};
