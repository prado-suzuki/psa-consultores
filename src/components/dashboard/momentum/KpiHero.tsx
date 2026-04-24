import { ReactNode } from 'react';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiHeroProps {
  label: string;
  value: string | number;
  variation?: { value: number; label: string };
  icon?: ReactNode;
  onRefresh?: () => void;
  onViewAll?: () => void;
  variant?: 'light' | 'solid';
  className?: string;
  loading?: boolean;
}

/**
 * Card de KPI com hierarquia Momentum: número grande + variação colorida.
 * variant="solid" usa fundo teal sólido com texto branco (big metric hero).
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
  const trendUp = variation && variation.value > 0;
  const trendDown = variation && variation.value < 0;

  return (
    <div
      className={cn(
        'group relative rounded-2xl p-5 shadow-sm transition-all hover:shadow-md',
        isSolid
          ? 'bg-teal-600 text-white'
          : 'bg-white border border-slate-200/70 text-slate-900',
        className
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          {icon && (
            <div
              className={cn(
                'h-7 w-7 rounded-full flex items-center justify-center',
                isSolid ? 'bg-white/20 text-white' : 'bg-teal-50 text-teal-600'
              )}
            >
              {icon}
            </div>
          )}
          <span
            className={cn(
              'text-xs font-medium uppercase tracking-wide',
              isSolid ? 'text-white/80' : 'text-slate-500'
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
                isSolid ? 'text-white/80 hover:bg-white/15' : 'text-slate-500 hover:bg-slate-100'
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
                isSolid ? 'text-white/80 hover:bg-white/15' : 'text-slate-400 hover:bg-slate-100'
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
          isSolid ? 'text-white text-5xl' : 'text-slate-900 text-4xl',
        )}
        style={{ fontFamily: "'Instrument Sans', system-ui, sans-serif" }}
      >
        {loading ? <span className="opacity-50">—</span> : value}
      </div>

      {variation && (
        <div className="mt-3 flex items-center gap-1.5">
          {trendUp && <TrendingUp className={cn('h-3.5 w-3.5', isSolid ? 'text-white/90' : 'text-teal-600')} />}
          {trendDown && <TrendingDown className={cn('h-3.5 w-3.5', isSolid ? 'text-white/90' : 'text-red-500')} />}
          <span
            className={cn(
              'text-xs font-medium',
              isSolid
                ? 'text-white/90'
                : trendUp
                ? 'text-teal-600'
                : trendDown
                ? 'text-red-500'
                : 'text-slate-500'
            )}
          >
            {trendUp ? '+' : ''}
            {variation.value}% {variation.label}
          </span>
        </div>
      )}
    </div>
  );
}
