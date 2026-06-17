import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Cartões de KPI do Quadro Societário, compartilhados entre a visão manual
// (CN, na página) e a visão derivada da Proprietária (QuadroEmpresaProprietaria).
// Formatadores/avatar em quadroFmt.ts (arquivo só de componentes p/ fast refresh).

export interface KpiCardProps {
  icone: React.ReactNode;
  titulo: string;
  valor: string;
  destaque?: boolean;
  // Atraso da entrada (ms) — cascata: KPIs primeiro, tabela depois.
  delay?: number;
}

// Cartão indicador no topo: o primeiro (Capital Social Total) ganha fundo
// verde-musgo de destaque, os demais ficam na superfície padrão.
export const KpiCard = ({ icone, titulo, valor, destaque, delay = 0 }: KpiCardProps) => (
  <Card
    className={cn(
      'animate-osg-rise motion-reduce:animate-none',
      destaque && 'border-osg-moss bg-osg-moss text-white',
    )}
    style={{ animationDelay: `${delay}ms` }}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-2.5">
        <div
          className={cn(
            'h-8 w-8 rounded-lg flex items-center justify-center shrink-0',
            destaque ? 'bg-white/15 text-white' : 'bg-osg-100 text-osg-600',
          )}
        >
          {icone}
        </div>
        <p
          className={cn(
            'text-[11px] font-bold uppercase tracking-[0.14em]',
            destaque ? 'text-white/80' : 'text-slate-500',
          )}
        >
          {titulo}
        </p>
      </div>
      <p className={cn('mt-4 text-xl font-bold tabular-nums', destaque ? 'text-white' : 'text-osg-700')}>
        {valor}
      </p>
    </CardContent>
  </Card>
);
