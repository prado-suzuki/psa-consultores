import { Check, Copy, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface PainelAcoesProps {
  pronto: boolean;
  /** Linha de status (ex.: "41 blocos · preenchido do cadastro"). */
  info?: string;
  onCopiar: () => void;
  copiado: boolean;
  onBaixar: () => void;
  baixando: boolean;
  className?: string;
}

/**
 * Rail de ações ao lado da folha: baixar/copiar sempre à vista, sem competir
 * com o documento — que é o elemento central da etapa final.
 */
export const PainelAcoes = ({
  pronto,
  info,
  onCopiar,
  copiado,
  onBaixar,
  baixando,
  className,
}: PainelAcoesProps) => (
  <aside
    className={cn(
      'flex flex-wrap items-center gap-2 xl:sticky xl:top-4 xl:flex-col xl:items-stretch xl:gap-2.5',
      className,
    )}
  >
    <Button onClick={onBaixar} disabled={!pronto || baixando} className="flex-1 xl:flex-none">
      {baixando ? (
        <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
      ) : (
        <Download className="mr-1.5 h-4 w-4" />
      )}
      Baixar .docx
    </Button>
    <Button
      variant="outline"
      onClick={onCopiar}
      disabled={!pronto}
      className="flex-1 xl:flex-none"
    >
      {copiado ? <Check className="mr-1.5 h-4 w-4" /> : <Copy className="mr-1.5 h-4 w-4" />}
      {copiado ? 'Copiado' : 'Copiar texto'}
    </Button>
    {pronto && info && (
      <p className="basis-full text-center text-[11px] leading-relaxed text-slate-500 xl:basis-auto xl:pt-1">
        {info}
      </p>
    )}
  </aside>
);
