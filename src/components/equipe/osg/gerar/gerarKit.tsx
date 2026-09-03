import type { ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
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
    {/* <div>, não <header>: o mapa.css tem um `header{...}` global que vazaria
        fundo, padding e borda para cá. */}
    <div className="flex items-center gap-4 px-5 py-4">
      <NumeroPasso numero={numero} estado={estado} />
      <div className="min-w-0 flex-1">
        <h2 className="text-[15px] font-semibold text-foreground">{titulo}</h2>
        {estado === 'concluido' && resumo ? (
          <div className="mt-0.5 truncate text-xs text-muted-foreground">{resumo}</div>
        ) : descricao ? (
          <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>
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
    </div>
    {estado === 'aberto' && children && (
      <div className="border-t border-osg-100 p-5">{children}</div>
    )}
  </section>
);

interface SeletorRailProps {
  titulo: string;
  /** Escolha atual, exibida sob o título. */
  resumo?: ReactNode;
  aberto: boolean;
  onAbertoChange: (aberto: boolean) => void;
  children: ReactNode;
}

/**
 * Seletor compacto do rail ao lado da folha: depois que o documento está em
 * cena, trocar o modelo ou a empresa vira uma lista expansível discreta — as
 * escolhas saem do caminho sem deixar de estar à mão.
 */
export const SeletorRail = ({
  titulo,
  resumo,
  aberto,
  onAbertoChange,
  children,
}: SeletorRailProps) => (
  <Collapsible open={aberto} onOpenChange={onAbertoChange}>
    <div className="rounded-md border border-osg-300/60 bg-card shadow-sm shadow-osg-300/30">
      <CollapsibleTrigger asChild>
        <button type="button" className="flex w-full items-center gap-2 px-3 py-2.5 text-left">
          <span className="min-w-0 flex-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {titulo}
            </span>
            <span className="block truncate text-xs font-semibold text-foreground">
              {resumo || 'Selecionar…'}
            </span>
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200',
              aberto && 'rotate-180',
            )}
          />
        </button>
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-osg-100 p-1.5">{children}</CollapsibleContent>
    </div>
  </Collapsible>
);

/** Uma opção da lista do SeletorRail; a selecionada ganha fundo e check musgo. */
export const OpcaoRail = ({
  selecionado,
  onEscolher,
  children,
}: {
  selecionado: boolean;
  onEscolher: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    aria-pressed={selecionado}
    onClick={onEscolher}
    className={cn(
      'flex w-full items-center gap-2 rounded px-2.5 py-2 text-left text-xs transition-colors',
      selecionado
        ? 'bg-osg-moss/10 font-semibold text-osg-700'
        : 'text-muted-foreground hover:bg-osg-50 hover:text-foreground',
    )}
  >
    <span className="min-w-0 flex-1 truncate">{children}</span>
    {selecionado && <Check className="h-3.5 w-3.5 shrink-0 text-osg-moss" />}
  </button>
);
