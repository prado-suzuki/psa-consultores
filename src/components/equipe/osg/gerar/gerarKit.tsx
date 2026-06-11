import type { ReactNode } from 'react';
import { Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Kit visual da tela Gerar Documento — o fluxo guiado em "passos" da etapa
// final da oficina de contratos. Segue o padrão de card aprovado da área OSG
// (borda marrom-areia atenuada + sombra tonal + acento verde-musgo em detalhe).

export type EstadoPasso = 'bloqueado' | 'aberto' | 'concluido';

export const NumeroPasso = ({ numero, estado }: { numero: number; estado: EstadoPasso }) => (
  <span
    className={cn(
      'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-bold transition-colors',
      estado === 'concluido' && 'bg-osg-moss text-white',
      estado === 'aberto' && 'border-2 border-osg-moss bg-osg-moss/5 text-osg-moss',
      estado === 'bloqueado' && 'bg-osg-100 text-osg-500/70',
    )}
  >
    {estado === 'concluido' ? <Check className="h-4 w-4" /> : numero}
  </span>
);

interface PassoCardProps {
  numero: number;
  titulo: string;
  /** Orientação curta exibida enquanto o passo está aberto ou bloqueado. */
  descricao?: string;
  estado: EstadoPasso;
  /** Resumo da escolha, exibido quando o passo está concluído. */
  resumo?: ReactNode;
  /** Reabre o passo para trocar a escolha (botão "Trocar"). */
  onTrocar?: () => void;
  /** Atraso da entrada (ms) — cascata dos passos. */
  delay?: number;
  children?: ReactNode;
}

/**
 * Um passo do fluxo guiado: número + título no cabeçalho; o corpo só aparece
 * enquanto o passo está aberto. Concluído, colapsa num resumo com "Trocar" —
 * o usuário sempre vê uma decisão de cada vez.
 */
export const PassoCard = ({
  numero,
  titulo,
  descricao,
  estado,
  resumo,
  onTrocar,
  delay = 0,
  children,
}: PassoCardProps) => (
  <section
    className={cn(
      'rounded-md border bg-card shadow-sm animate-osg-rise motion-reduce:animate-none',
      estado === 'bloqueado'
        ? 'border-osg-200/60 shadow-osg-300/20 opacity-60'
        : 'border-osg-300/60 shadow-osg-300/30',
    )}
    style={{ animationDelay: `${delay}ms` }}
  >
    <header className="flex items-center gap-4 px-5 py-4">
      <NumeroPasso numero={numero} estado={estado} />
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold text-slate-900">{titulo}</h2>
        {estado === 'concluido' && resumo ? (
          <div className="mt-0.5 truncate text-xs text-slate-600">{resumo}</div>
        ) : descricao ? (
          <p className="mt-0.5 text-xs text-slate-500">{descricao}</p>
        ) : null}
      </div>
      {estado === 'concluido' && onTrocar && (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 shrink-0 text-xs font-semibold text-osg-700 hover:bg-osg-50 hover:text-osg-700"
          onClick={onTrocar}
        >
          Trocar
        </Button>
      )}
    </header>
    {estado === 'aberto' && children && (
      <div className="border-t border-osg-100 p-5">{children}</div>
    )}
  </section>
);
