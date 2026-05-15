import { Info } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * FieldTooltip — ícone de informação (`<Info>`) ao lado de um label que,
 * ao hover, exibe o texto explicativo (portalizado, com `z-[100]`).
 */
export const FieldTooltip = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help flex-shrink-0" />
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
