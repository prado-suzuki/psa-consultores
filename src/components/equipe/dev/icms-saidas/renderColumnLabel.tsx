import { ColumnTooltip } from './tooltipHelpers';

export const renderColumnLabel = (label: string, tooltip?: string) =>
  tooltip ? <ColumnTooltip label={label} text={tooltip} /> : label;
