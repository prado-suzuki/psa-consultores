import type { ReactElement, ReactNode } from 'react';
import { Info } from 'lucide-react';
import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

type TooltipSide = 'top' | 'right' | 'bottom' | 'left';
type TooltipAlign = 'start' | 'center' | 'end';

const BASE_TOOLTIP_CLASS =
  'font-normal normal-case tracking-normal text-xs z-[100]';

interface PortalTooltipContentProps {
  children: ReactNode;
  className?: string;
  side?: TooltipSide;
  sideOffset?: number;
  align?: TooltipAlign;
}

const PortalTooltipContent = ({
  children,
  className,
  side = 'top',
  sideOffset = 6,
  align = 'center',
}: PortalTooltipContentProps) => (
  <TooltipPrimitive.Portal>
    <TooltipContent
      side={side}
      sideOffset={sideOffset}
      align={align}
      collisionPadding={12}
      className={cn(BASE_TOOLTIP_CLASS, className)}
    >
      {children}
    </TooltipContent>
  </TooltipPrimitive.Portal>
);

export const FieldTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
    </TooltipTrigger>
    <PortalTooltipContent className="max-w-[260px] text-center">
      {text}
    </PortalTooltipContent>
  </Tooltip>
);

export const ColumnTooltip = ({
  label,
  text,
}: {
  label: string;
  text: string;
}) => (
  <Tooltip>
    <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4 decoration-slate-400">
      {label}
    </TooltipTrigger>
    <PortalTooltipContent className="max-w-[260px] text-center">
      {text}
    </PortalTooltipContent>
  </Tooltip>
);


export const ButtonTooltip = ({
  text,
  children,
}: {
  text: string;
  children: ReactNode;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <span className="inline-flex">{children}</span>
    </TooltipTrigger>
    <PortalTooltipContent className="max-w-[260px] text-center">
      {text}
    </PortalTooltipContent>
  </Tooltip>
);

export const InlineTooltip = ({
  content,
  children,
  side = 'top',
  align = 'center',
  contentClassName,
}: {
  content: ReactNode;
  children: ReactElement;
  side?: TooltipSide;
  align?: TooltipAlign;
  contentClassName?: string;
}) => (
  <Tooltip>
    <TooltipTrigger asChild>{children}</TooltipTrigger>
    <PortalTooltipContent
      side={side}
      align={align}
      className={cn('max-w-[260px] text-center', contentClassName)}
    >
      {content}
    </PortalTooltipContent>
  </Tooltip>
);
