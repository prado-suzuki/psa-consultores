import type { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';
import TaxLoader from '@/components/equipe/fiscal/TaxLoader';
import type { AreaKey } from '@/config/areaCategories';
import { cn } from '@/lib/utils';

/**
 * Contrato de um glifo de carregamento de área.
 *
 * Regras para escrever um glifo novo:
 * - `size` é o lado do quadrado em px — o glifo tem que ser legível de ~16px
 *   (spinner dentro de botão) até ~72px (bloco de página vazia).
 * - a cor é do glifo, não do call site: pinte com `currentColor` sobre uma classe
 *   de texto PRÓPRIA (como `TaxLoader` faz), para que a cor do container não o
 *   descaracterize.
 * - anuncie o estado com `role="status"` + `aria-label={label}`.
 * - respeite `prefers-reduced-motion` (`motion-reduce:animate-none`).
 */
export interface AreaLoaderGlyphProps {
  size?: number;
  /** Só layout (margem, alinhamento). Cor é responsabilidade do glifo. */
  className?: string;
  label?: string;
}

export type AreaLoaderGlyph = ComponentType<AreaLoaderGlyphProps>;

/** Spinner padrão — herda `currentColor` do container, como o Loader2 solto que substitui. */
export const DefaultAreaLoader: AreaLoaderGlyph = ({
  size = 16,
  className,
  label = 'Carregando',
}) => (
  <Loader2
    role="status"
    aria-label={label}
    style={{ width: size, height: size }}
    className={cn('shrink-0 animate-spin motion-reduce:animate-none', className)}
  />
);

/**
 * Glifo de carregamento POR ÁREA — o ponto único de troca.
 *
 * Para dar ícone próprio a uma área: escreva o componente seguindo
 * `AreaLoaderGlyphProps` e registre-o aqui. Todos os loaders daquela área
 * (blocos, listas, botões) passam a usá-lo sem tocar em nenhum call site, porque
 * os call sites chamam sempre `<AreaLoader area={...} />`.
 *
 * Área ausente do mapa — ou call site que não sabe a área — cai no
 * `DefaultAreaLoader`.
 */
const AREA_LOADER_GLYPHS: Partial<Record<AreaKey, AreaLoaderGlyph>> = {
  tax: TaxLoader,
  // osg: <OsgLoader> quando o ícone da OSG existir. Até lá, spinner padrão.
};

export interface AreaLoaderProps extends AreaLoaderGlyphProps {
  /** Área da tela. Ausente ou sem glifo registrado → spinner padrão. */
  area?: AreaKey;
}

/** Indicador de carregamento da área — resolve o glifo pelo registro acima. */
export function AreaLoader({ area, size = 16, className, label }: AreaLoaderProps) {
  const Glyph = (area && AREA_LOADER_GLYPHS[area]) || DefaultAreaLoader;
  return <Glyph size={size} className={className} label={label} />;
}

export default AreaLoader;
