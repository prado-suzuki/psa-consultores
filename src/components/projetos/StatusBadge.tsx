import { cn } from '@/lib/utils';
import { STATUS_CONFIG, TYPE_CONFIG, PRIORITY_CONFIG, type WorkPackageStatus, type WorkPackageType, type WorkPackagePriority } from '@/types/workPackage';

interface StatusBadgeProps {
  status: WorkPackageStatus;
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        config.bgColor,
        config.color,
        size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'
      )}
    >
      {config.label}
    </span>
  );
}

interface TypeBadgeProps {
  type: WorkPackageType;
  size?: 'sm' | 'md';
}

export function TypeBadge({ type, size = 'md' }: TypeBadgeProps) {
  const config = TYPE_CONFIG[type];
  
  return (
    <span
      className={cn(
        'inline-flex items-center rounded font-bold uppercase tracking-wider',
        config.bgColor,
        config.color,
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-xs'
      )}
    >
      {config.label}
    </span>
  );
}

interface PriorityIndicatorProps {
  priority: WorkPackagePriority;
  showLabel?: boolean;
}

export function PriorityIndicator({ priority, showLabel = false }: PriorityIndicatorProps) {
  const config = PRIORITY_CONFIG[priority];
  
  return (
    <span className={cn('inline-flex items-center gap-1', config.color)}>
      <span>{config.icon}</span>
      {showLabel && <span className="text-sm">{config.label}</span>}
    </span>
  );
}
