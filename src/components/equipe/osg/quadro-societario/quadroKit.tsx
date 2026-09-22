import type { ReactNode } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useContagemAnimada } from './animacaoDoQuadro';

// O VOCABULÁRIO VISUAL do Quadro Societário, compartilhado entre a Controladora
// (na página) e a Proprietária (QuadroEmpresaProprietaria).
// Formatadores e avatar ficam em quadroFmt.ts (arquivo só de funções, para o
// fast refresh não reclamar).
//
// Aqui havia um `KpiCard`: três cartões grandes no topo, um deles com fundo
// verde-musgo cheio e contagem animada, repetindo capital, quotas e valor
// nominal antes de a tabela começar. Eram três molduras concorrendo com a tarefa
// da tela, que é registrar o movimento — e o próprio quadro logo abaixo já traz
// os mesmos três números no rodapé da tabela. Viraram uma FAIXA dentro do card
// principal: os números continuam, a hierarquia deixa de obrigar a lê-los
// primeiro. A contagem animada voltou, mas dentro da faixa: é o mesmo tempo de
// entrada da rosca e das linhas, e não um cartão pedindo atenção.

/** Superfície de card da área: borda definida, sombra tonal discreta. */
export const cardDoQuadroCls = 'border-osg-300/60 shadow-[0_1px_2px_rgba(16,24,40,0.04)]';

interface CabecalhoDoCardProps {
  icone: ReactNode;
  titulo: ReactNode;
  /** Comandos à direita do título. */
  acoes?: ReactNode;
  /** Linha de apoio abaixo do título. */
  apoio?: ReactNode;
  className?: string;
}

/**
 * Cabeçalho de card da área: título com traço verde-musgo por baixo, comandos à
 * direita, linha de apoio embaixo. O traço é o acento — o fundo do card
 * continua neutro, para dois cards vizinhos não disputarem a atenção.
 *
 * O traço cresce da esquerda na entrada do card: é o mesmo gesto da rosca e das
 * barras, e dura o que a entrada do card dura.
 */
export function CabecalhoDoCard({ icone, titulo, acoes, apoio, className }: CabecalhoDoCardProps) {
  return (
    <CardHeader className={cn('space-y-2 pb-3', className)}>
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <CardTitle className="flex items-center gap-2 text-base">
          {icone}
          <span className="relative pb-1.5">
            {titulo}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-0.5 origin-left rounded-full bg-osg-moss/70 animate-osg-bar-grow [animation-duration:700ms] motion-reduce:animate-none"
            />
          </span>
        </CardTitle>
        {acoes}
      </div>
      {apoio}
    </CardHeader>
  );
}

export interface ItemDoResumo {
  rotulo: string;
  /** O número cru: a faixa o conta até chegar lá. Nulo imprime o travessão. */
  valor: number | null;
  formatar: (n: number) => string;
  /** Ícone de ajuda ao lado do valor, quando o número precisa de ressalva. */
  ajuda?: ReactNode;
}

const NumeroDoResumo = ({ item }: { item: ItemDoResumo }) => {
  const contado = useContagemAnimada(item.valor);

  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {item.rotulo}
      </dt>
      <dd className="flex items-center gap-1 text-[17px] font-semibold leading-tight tabular-nums text-osg-700">
        {contado == null ? '—' : item.formatar(contado)}
        {item.ajuda}
      </dd>
    </div>
  );
};

/**
 * A faixa de resumo do quadro: a rosca de participação à esquerda, capital,
 * quotas e valor nominal à direita. Quebra em duas linhas em tela estreita, sem
 * encolher número nem rótulo.
 */
export function FaixaDeResumo({ itens, nota, grafico, destaque }: {
  itens: ItemDoResumo[];
  nota?: ReactNode;
  /** A rosca de participação, quando há quadro a desenhar. */
  grafico?: ReactNode;
  /** O sócio de maior fatia, encostado na borda direita da faixa. */
  destaque?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-osg-200/80 bg-gradient-to-br from-osg-50/80 via-osg-50/40 to-transparent px-4 py-3.5 sm:flex-row sm:items-center sm:gap-6">
      {grafico}
      <div className="min-w-0 flex-1">
        <dl className="flex flex-wrap items-start gap-x-7 gap-y-3">
          {itens.map((i) => (
            <NumeroDoResumo key={i.rotulo} item={i} />
          ))}
        </dl>
        {nota && <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">{nota}</p>}
      </div>
      {destaque}
    </div>
  );
}
