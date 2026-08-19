import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiHeroProps {
  label: string;
  value: string | number;
  variation?: { value?: number; label: string };
  icon?: ReactNode;
  onRefresh?: () => void;
  onViewAll?: () => void;
  variant?: 'light' | 'solid';
  className?: string;
  loading?: boolean;
}

/**
 * Card de KPI com hierarquia Momentum: número grande + variação colorida.
 *
 * `variant="solid"` usa `bg-primary` com `text-primary-foreground`: quem decide se
 * o fundo é teal (Tax) ou musgo (OSG) é a classe de tema no `<html>`, não este
 * componente. O par `primary`/`primary-foreground` anda junto — trocar o contraste
 * por `text-white` cru só funciona enquanto todo tema declarar branco ali.
 */
export function KpiHero({
  label,
  value,
  variation,
  icon,
  onRefresh,
  onViewAll,
  variant = 'light',
  className,
  loading = false,
}: KpiHeroProps) {
  const isSolid = variant === 'solid';
  const hasTrendValue = variation?.value !== undefined;
  const trendUp = hasTrendValue && (variation!.value as number) > 0;
  const trendDown = hasTrendValue && (variation!.value as number) < 0;

  return (
    <div
      className={cn(
        'group relative rounded-2xl p-5 shadow-sm transition-all hover:shadow-md',
        isSolid
          ? 'kpi-hero-solid bg-primary text-primary-foreground'
          : 'bg-card border border-border/70 text-foreground',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div
              className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center',
                isSolid ? 'bg-primary-foreground/20 text-primary-foreground' : 'bg-tool-icon-bg text-tool-icon'
              )}
            >
              {icon}
            </div>
          )}
          <span
            className={cn(
              'text-xs font-medium uppercase tracking-wide',
              isSolid ? 'text-primary-foreground/80' : 'text-muted-foreground'
            )}
          >
            {label}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onViewAll && (
            <button
              onClick={onViewAll}
              className={cn(
                'text-[10px] font-medium px-2 py-0.5 rounded-md',
                isSolid ? 'text-primary-foreground/80 hover:bg-primary-foreground/15' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              View all
            </button>
          )}
          {onRefresh && (
            <button
              onClick={onRefresh}
              className={cn(
                'h-6 w-6 rounded-md flex items-center justify-center',
                isSolid ? 'text-primary-foreground/80 hover:bg-primary-foreground/15' : 'text-muted-foreground hover:bg-muted'
              )}
            >
              <RefreshCw className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      <div
        className={cn(
          'font-bold leading-none tracking-tight tabular-nums',
          isSolid ? 'text-primary-foreground text-5xl' : 'text-foreground text-4xl',
        )}
        style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
      >
        {loading ? <span className="opacity-50">—</span> : value}
      </div>

      {variation && (
        <div className="mt-3 flex items-center gap-1.5">
          {trendUp && <TrendingUp className={cn('h-3.5 w-3.5', isSolid ? 'text-primary-foreground/90' : 'text-primary')} />}
          {trendDown && <TrendingDown className={cn('h-3.5 w-3.5', isSolid ? 'text-primary-foreground/90' : 'text-destructive')} />}
          <span
            className={cn(
              'text-xs font-medium',
              isSolid
                ? 'text-primary-foreground/90'
                : trendUp
                ? 'text-primary'
                : trendDown
                ? 'text-destructive'
                : 'text-muted-foreground'
            )}
          >
            {hasTrendValue && (
              <>
                {trendUp ? '+' : ''}
                {variation.value}%{' '}
              </>
            )}
            {variation.label}
          </span>
        </div>
      )}
    </div>
  );
}
