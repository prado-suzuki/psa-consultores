import { ReactNode } from "react";
import { HelpCircle } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * FieldTooltip — wrapper que renderiza um label de filtro com ícone
 * de ajuda ao lado, exibindo um tooltip (portalizado) na hover.
 *
 * Mesmo padrão usado em `ApuracaoPisCofins.tsx` / `ControlePerdcomp.tsx`.
 */
export const FieldTooltip = ({ children, text }: { children: ReactNode; text: string }) => (
  <span className="inline-flex items-center gap-1">
    {children}
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Ajuda"
        >
          <HelpCircle className="h-3 w-3" />
        </button>
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
  </span>
);

/** Tooltips reutilizados pelos filtros principais e internos das abas. */
export const AUDITORIA_TOOLTIPS = {
  // Filtros principais
  cliente: "Cliente cuja base fiscal será analisada.",
  contribuinte:
    "CNPJ/contribuinte específico do cliente. Quando há apenas um, é selecionado automaticamente.",
  dataInicio: "Data inicial do período a ser cruzado entre as fontes (Balancete, EFD, XML).",
  dataFim: "Data final do período a ser cruzado entre as fontes (Balancete, EFD, XML).",
  // Filtros internos
  contaContabil: "Filtra a árvore de contas pelo código ou descrição.",
  periodoFechado: "Quando ativo, mostra apenas o saldo do último mês acumulado.",
  chaveNfe: "Filtra os documentos pela chave de acesso da NFe (44 dígitos).",
  cfopIntervalo: "Filtra os lotes pelo CFOP ou pelo intervalo de numeração informado.",
} as const;
