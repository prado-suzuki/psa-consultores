import { ReactNode } from "react";
import { Info, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface DevPageHeaderProps {
  title: string;
  subtitle?: string;
  infoTooltip?: string;
  sopUrl?: string;
  sopLabel?: string;
  actions?: ReactNode;
}

/**
 * Cabeçalho padronizado para páginas do módulo /equipe/dev.
 * - Título + subtítulo (Visão Geral)
 * - Ícone Info opcional com Tooltip
 * - Botão SOP opcional
 * - Slot livre para ações adicionais (ex: Badge "Beta")
 *
 * Observação: NÃO envolve em <TooltipProvider> próprio — o DevLayout
 * (e o app raiz) já fornecem o provider global. Aninhar criaria
 * conflitos de portal/z-index.
 */
export const DevPageHeader = ({
  title,
  subtitle,
  infoTooltip,
  sopUrl,
  sopLabel = "SOP",
  actions,
}: DevPageHeaderProps) => {
  return (
    <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground truncate">{title}</h1>
          {infoTooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Informações adicionais"
                  className="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                >
                  <Info className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="max-w-xs">
                {infoTooltip}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-muted-foreground mt-1 max-w-3xl">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {sopUrl && (
          <Button variant="outline" size="sm" asChild>
            <a href={sopUrl} target="_blank" rel="noopener noreferrer">
              <BookOpen className="h-4 w-4 mr-1.5" />
              {sopLabel}
            </a>
          </Button>
        )}
        {actions}
      </div>
    </div>
  );
};

export default DevPageHeader;
