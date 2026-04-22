import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Tooltip helper for column headers. Wraps the label with a dotted underline
 * and renders the tooltip text on hover, matching the `MapaNCMPisCofins` pattern.
 */
export const ColumnTooltip = ({ label, text }: { label: string; text: string }) => (
  <Tooltip>
    <TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4 decoration-slate-400">
      {label}
    </TooltipTrigger>
    <TooltipContent
      side="top"
      className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]"
    >
      {text}
    </TooltipContent>
  </Tooltip>
);

/** Renders the label, optionally wrapped in a ColumnTooltip when a tooltip text is provided. */
export const renderColumnLabel = (label: string, tooltip?: string) =>
  tooltip ? <ColumnTooltip label={label} text={tooltip} /> : label;
