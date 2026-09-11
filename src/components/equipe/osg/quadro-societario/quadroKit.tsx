import type { ReactNode } from 'react';
import { CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

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
// primeiro.

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
 */
export function CabecalhoDoCard({ icone, titulo, acoes, apoio, className }: CabecalhoDoCardProps) {
  return (
    <CardHeader className={cn('space-y-2 pb-3', className)}>
      <div className="flex flex-col justify-between gap-2 md:flex-row md:items-center">
        <CardTitle className="flex items-center gap-2 text-base">
          {icone}
          <span className="relative pb-1.5">
            {titulo}
            <span aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-osg-moss/70" />
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
  valor: string;
  /** Ícone de ajuda ao lado do valor, quando o número precisa de ressalva. */
  ajuda?: ReactNode;
}

/**
 * A faixa de resumo do quadro: capital, quotas e valor nominal em uma linha.
 * Quebra em várias linhas em tela estreita, sem encolher número nem rótulo.
 */
export function FaixaDeResumo({ itens, nota }: { itens: ItemDoResumo[]; nota?: ReactNode }) {
  return (
    <div className="rounded-md border border-osg-200/80 bg-osg-50/40 px-3 py-2.5">
      <dl className="flex flex-wrap items-baseline gap-x-6 gap-y-1.5">
        {itens.map((i) => (
          <div key={i.rotulo} className="flex items-baseline gap-1.5">
            <dt className="text-xs font-medium text-muted-foreground">{i.rotulo}:</dt>
            <dd className="flex items-center gap-1 text-sm font-semibold tabular-nums text-osg-700">
              {i.valor}
              {i.ajuda}
            </dd>
          </div>
        ))}
      </dl>
      {nota && <p className="mt-1.5 text-xs text-muted-foreground">{nota}</p>}
    </div>
  );
}
