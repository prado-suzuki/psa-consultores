import type { ReactNode } from "react";
import { ArrowRight, HelpCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export function HelpHint({ children }: { children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <HelpCircle className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600 cursor-help inline-block" />
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-xs text-xs leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  sub?: ReactNode;
  accent: string;
  icon?: ReactNode;
  hint?: ReactNode;
}

export function KpiCard({ label, value, sub, accent, icon, hint }: KpiCardProps) {
  return (
    <Card className="relative overflow-hidden border-slate-200">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
            {label}{hint && <HelpHint>{hint}</HelpHint>}
          </p>
          {icon && <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>{icon}</div>}
        </div>
        <p className="text-2xl font-bold text-slate-900 leading-none mb-1 tabular-nums">{value}</p>
        {sub && <div className="text-xs text-slate-500 mt-2 space-y-0.5">{sub}</div>}
      </CardContent>
    </Card>
  );
}

interface InsightCardProps {
  icon: ReactNode;
  accent: string;
  titulo: string;
  texto: ReactNode;
  acao: string;
}

export function InsightCard({ icon, accent, titulo, texto, acao }: InsightCardProps) {
  return (
    <Card className="border-slate-200 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[3px]" style={{ background: accent }} />
      <CardContent className="p-5">
        <div className="flex items-start gap-3 mb-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: `${accent}15`, color: accent }}>{icon}</div>
          <h4 className="text-sm font-bold text-slate-900 leading-tight pt-1">{titulo}</h4>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed mb-3">{texto}</p>
        <div className="flex items-start gap-1.5 pt-3 border-t border-slate-100">
          <ArrowRight className="h-3.5 w-3.5 mt-0.5 shrink-0" style={{ color: accent }} />
          <p className="text-[11px] font-semibold text-slate-700">{acao}</p>
        </div>
      </CardContent>
    </Card>
  );
}
