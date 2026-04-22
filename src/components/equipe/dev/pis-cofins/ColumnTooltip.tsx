import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Tooltip helper for column headers. Wraps the label with a dotted underline
 * and renders the tooltip text on hover, matching the `MapaNCMPisCofins` pattern.
 *
 * Uses Radix Portal so the tooltip card escapes the table's `overflow-x-auto`
 * container and any sticky column stacking contexts, preventing it from being
 * clipped by neighbouring columns.
 */
export const ColumnTooltip = ({ label, text }: { label: string; text: string }) => (
  <Tooltip>
    <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4 decoration-slate-400">
      {label}
    </TooltipTrigger>
    <TooltipPrimitive.Portal>
      <TooltipContent
        side="top"
        sideOffset={6}
        collisionPadding={12}
        className="font-normal normal-case tracking-normal text-xs text-center max-w-[260px] z-[100]"
      >
        {text}
      </TooltipContent>
    </TooltipPrimitive.Portal>
  </Tooltip>
);

/** Renders the label, optionally wrapped in a ColumnTooltip when a tooltip text is provided. */
export const renderColumnLabel = (label: string, tooltip?: string) =>
  tooltip ? <ColumnTooltip label={label} text={tooltip} /> : label;
