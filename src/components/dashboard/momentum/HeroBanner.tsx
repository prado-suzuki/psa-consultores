import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ArrowRight } from 'lucide-react';

interface HeroBannerProps {
  title: string;
  description?: string;
  ctaLabel?: string;
  onCta?: () => void;
  icon?: ReactNode;
  className?: string;
  /** Subtítulo curto acima do título (eyebrow) */
  eyebrow?: string;
}

/**
 * Banner de destaque dark com efeito orgânico/blur,
 * inspirado no card "Maximize Human Productivity" do Momentum.
 * Usa a paleta PSA (slate escuro com accent teal).
 */
export function HeroBanner({
  title,
  description,
  ctaLabel,
  onCta,
  icon,
  className,
  eyebrow,
}: HeroBannerProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl p-6 md:p-8',
        'bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900',
        'text-white shadow-md',
        className
      )}
    >
      {/* Efeito orgânico de blur (decorativo) */}
      <div
        aria-hidden
        className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30"
        style={{ background: 'radial-gradient(circle, #0d9488 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full blur-3xl opacity-25"
        style={{ background: 'radial-gradient(circle, #5eead4 0%, transparent 70%)' }}
      />

      <div className="relative z-10 max-w-2xl">
        {eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-widest text-teal-300 mb-2">
            {eyebrow}
          </div>
        )}
        <div className="flex items-start gap-3">
          {icon && (
            <div className="h-12 w-12 rounded-xl bg-teal-500/20 backdrop-blur flex items-center justify-center flex-shrink-0">
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
            className="mt-5 bg-white text-slate-900 hover:bg-teal-50 hover:text-teal-700 font-semibold"
          >
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
