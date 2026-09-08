// O chip "Modelo · baixar" de um documento que a PSA manda em branco.
//
// Mora em `shared` porque aparece nos DOIS lados da mesma solicitação: na tela do
// analista (Solicitação Inicial) e no portal do cliente, nas duas fases. Um
// componente só é o que garante que o cliente baixa exatamente o arquivo que o
// analista viu — se fossem dois, divergiriam na primeira troca de modelo.
//
// A paleta vem por prop porque as duas áreas têm identidade própria: a equipe usa
// o marrom-areia da OSG, o portal usa o teal. O resto (forma, texto, ícone) é
// deliberadamente igual nos dois.
import { Download, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useModeloDocumento } from '@/hooks/useModeloDocumento';
import type { ModeloDocumento } from '@/lib/solicitacao';

/**
 * Onde o botão está sendo desenhado — e os dois são formas diferentes, não só
 * cores diferentes.
 *
 * `osg` é BOTÃO: mora no canto direito da linha, ao lado de editar e remover, e
 * copia a assinatura do "Incluir" que já existe nos Opcionais. Ao lado do título
 * ele era lido como etiqueta do documento, e não como coisa em que se clica.
 *
 * `portal` é LINK discreto: a gaveta do cliente é caixa de ENTRADA, e um botão
 * sólido ali competiria com o alvo de upload, que é a ação principal do card.
 */
export type TomDoModelo = 'osg' | 'portal';

const TONS: Record<TomDoModelo, string> = {
  osg: cn(
    'h-7 gap-1 rounded-md border border-osg-200/80 bg-white px-2 text-xs font-medium text-osg-700',
    'hover:border-osg-moss/40 hover:bg-osg-moss/[0.07] hover:text-osg-moss',
    'focus-visible:ring-2 focus-visible:ring-osg-moss/40',
  ),
  // `primary`, e não a escala teal crua: a primitiva mora no :root e nenhum tema
  // a sobrescreve, então ela não acompanha a área. O token é o que faz o chip
  // seguir o portal se a cor dele mudar.
  portal: cn(
    'gap-1 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-primary ring-1 ring-primary/20',
    'hover:ring-primary/40 hover:bg-accent/5',
    'focus-visible:ring-2 focus-visible:ring-primary/40',
  ),
};

interface BotaoModeloProps {
  /** Nulo é o caso comum — 2 dos 68 tipos do catálogo têm modelo. */
  modelo: ModeloDocumento | null | undefined;
  tom: TomDoModelo;
  className?: string;
}

/**
 * Baixa o modelo, ou não renderiza nada.
 *
 * O `return null` é o comportamento principal, não a exceção: documento sem
 * modelo não ganha botão desabilitado nem espaço reservado — a linha fica
 * exatamente como era antes desta feature. É o que impede a tela de encher de
 * affordance morta em 66 dos 68 tipos.
 */
export function BotaoModelo({ modelo, tom, className }: BotaoModeloProps) {
  const baixar = useModeloDocumento();

  if (!modelo) return null;

  return (
    <button
      type="button"
      onClick={() => baixar.mutate(modelo)}
      disabled={baixar.isPending}
      title={`Baixar o modelo: ${modelo.nome}`}
      className={cn(
        'inline-flex shrink-0 items-center transition-colors focus-visible:outline-none',
        TONS[tom],
        baixar.isPending && 'cursor-wait opacity-70',
        className,
      )}
    >
      {baixar.isPending
        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
        : <Download className="h-3.5 w-3.5" />}
      Modelo
    </button>
  );
}

export default BotaoModelo;
