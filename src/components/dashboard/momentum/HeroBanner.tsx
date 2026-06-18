import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';
import type { AreaKey } from '@/config/areaCategories';

interface HeroBannerProps {
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  icon?: ReactNode;
  className?: string;
  /** Subtítulo curto acima do título (eyebrow) */
  eyebrow?: string;
  /** Área atual — define a paleta do banner (Tax = teal/slate, OSG = verde moss). */
  area?: AreaKey;
}

/**
 * Banner de destaque dark com efeito orgânico/blur.
 * Tax mantém a paleta original (slate escuro + accent teal). OSG usa o mesmo
 * estilo de degradê, porém em verde (osg-moss), sem tons de azul.
 */
export function HeroBanner({
  title,
  description,
  ctaLabel,
  onCta,
  icon,
  className,
  eyebrow,
  area = 'tax',
}: HeroBannerProps) {
  const isOsg = area === 'osg';
  // Cores dos "blobs" de blur — em CSS inline porque são radial-gradients.
  const blob1 = isOsg ? 'hsl(var(--osg-moss))' : '#0d9488';
  const blob2 = isOsg ? 'hsl(149 45% 42%)' : '#5eead4';

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 md:p-8',
        isOsg
          ? 'bg-gradient-to-br from-[hsl(149_55%_8%)] via-[hsl(149_60%_13%)] to-[hsl(var(--osg-moss))]'
          : 'bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900',
        'text-white shadow-md',
        className
      )}
    >
      {/* Efeito orgânico de blur (decorativo) */}
      <div
        aria-hidden
        className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30"
        style={{ background: `radial-gradient(circle, ${blob1} 0%, transparent 70%)` }}
      />
      <div
        aria-hidden
        className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full blur-3xl opacity-25"
        style={{ background: `radial-gradient(circle, ${blob2} 0%, transparent 70%)` }}
      />

      <div className="relative z-10 max-w-2xl">
        {eyebrow && (
          <div
            className={cn(
              'text-xs font-semibold uppercase tracking-widest mb-2',
              isOsg ? 'text-white/70' : 'text-teal-300'
            )}
          >
            {eyebrow}
          </div>
        )}
        <div className="flex items-start gap-3">
          {icon && (
            <div
              className={cn(
                'h-12 w-12 rounded-xl backdrop-blur flex items-center justify-center flex-shrink-0',
                isOsg ? 'bg-white/15' : 'bg-teal-500/20'
              )}
            >
              {icon}
            </div>
          )}
          <div className="flex-1">
            <h2
              className="text-2xl md:text-3xl font-bold leading-tight tracking-tight"
              style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
            >
              {title}
            </h2>
            {description && (
              <p className="text-sm text-white/80 mt-2 leading-relaxed">{description}</p>
            )}
          </div>
        </div>

        {ctaLabel && onCta && (
          <Button
            onClick={onCta}
            className={cn(
              'mt-5 font-semibold',
              isOsg
                ? 'bg-white text-gray-900 hover:bg-white/90'
                : 'bg-white text-slate-900 hover:bg-teal-50 hover:text-teal-700'
            )}
          >
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
