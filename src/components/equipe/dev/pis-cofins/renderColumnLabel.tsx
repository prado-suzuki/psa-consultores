import { ColumnTooltip } from "./ColumnTooltip";

/** Renders the label, optionally wrapped in a ColumnTooltip when a tooltip text is provided. */
export const renderColumnLabel = (label: string, tooltip?: string) =>
  tooltip ? <ColumnTooltip label={label} text={tooltip} /> : label;
