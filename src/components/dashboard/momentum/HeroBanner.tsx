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
 * Escurecimento do banner: preto com alpha por cima do `--primary` da área.
 *
 * O banner precisa de um degradê "quase preto → tom da área", e é o único jeito
 * de escurecer um token sem saber qual é o matiz dele. Preto não tem matiz, então
 * o resultado nunca troca a identidade: na Tax escurece o teal, na OSG escurece o
 * musgo, e numa área nova escurece o que ela declarar. É o mesmo recurso que o
 * `.osg-theme .kpi-hero-solid` já usa no `index.css`.
 *
 * O que estava aqui antes era um `if (area === 'osg')` escolhendo entre dois
 * degradês fixos: slate escuro para teal de um lado, musgo do outro. Além de a Tax
 * vazar para toda área que não caísse no `if`, o padrão obriga a editar este
 * arquivo a cada área nova.
 */
const VEU_ESCURO =
  'linear-gradient(135deg, hsl(0 0% 0% / 0.92) 0%, hsl(0 0% 0% / 0.62) 45%, hsl(0 0% 0% / 0.12) 100%)';

/**
 * Banner de destaque dark com efeito orgânico/blur.
 *
 * Não recebe (nem precisa de) a área: a superfície é `bg-primary` e quem resolve
 * o `--primary` é a classe de tema que o layout da área põe no `<html>`. Montado
 * no `FiscalLayout` sai teal, no `OsgLayout` sai musgo, sem condicional.
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
        'bg-primary text-white shadow-md',
        className
      )}
      style={{ backgroundImage: VEU_ESCURO }}
    >
      {/* Efeito orgânico de blur (decorativo). O primeiro blob devolve o tom cheio
          da área no canto escuro; o segundo é só luz (branco), sem matiz próprio. */}
      <div
        aria-hidden
        className="absolute -top-20 -right-20 h-64 w-64 rounded-full blur-3xl opacity-30"
        style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="absolute -bottom-16 -left-10 h-52 w-52 rounded-full blur-3xl opacity-25"
        style={{ background: 'radial-gradient(circle, hsl(0 0% 100% / 0.6) 0%, transparent 70%)' }}
      />

      <div className="relative z-10 max-w-2xl">
        {eyebrow && (
          <div className="text-xs font-semibold uppercase tracking-widest mb-2 text-white/70">
            {eyebrow}
          </div>
        )}
        <div className="flex items-start gap-3">
          {icon && (
            <div className="h-12 w-12 rounded-xl backdrop-blur flex items-center justify-center flex-shrink-0 bg-white/15">
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
          // O banner é sempre escuro, então o botão é branco com texto escuro
          // neutro — `gray-900`, não o tom de nenhuma área.
          <Button
            onClick={onCta}
            className="mt-5 font-semibold bg-white text-gray-900 hover:bg-white/90"
          >
            {ctaLabel}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
