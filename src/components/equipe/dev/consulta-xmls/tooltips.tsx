import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function FieldTooltip({ text }: { text: string }) {
  return <Tooltip><TooltipTrigger asChild><Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" /></TooltipTrigger><TooltipContent side="top" className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]">{text}</TooltipContent></Tooltip>;
}

export function ColumnTooltip({ label, text }: { label: string; text: string }) {
  return <Tooltip><TooltipTrigger className="cursor-help underline decoration-dotted underline-offset-4 decoration-slate-400">{label}</TooltipTrigger><TooltipContent side="top" className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]">{text}</TooltipContent></Tooltip>;
}

export function ButtonTooltip({ text, children }: { text: string; children: ReactNode }) {
  return <Tooltip><TooltipTrigger asChild><span className="inline-flex">{children}</span></TooltipTrigger><TooltipContent side="top" className="font-normal normal-case tracking-normal text-xs text-center max-w-[220px]">{text}</TooltipContent></Tooltip>;
}
