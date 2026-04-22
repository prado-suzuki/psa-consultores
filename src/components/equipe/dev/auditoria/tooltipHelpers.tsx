import { Info } from "lucide-react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * FieldTooltip — ícone de informação (`<Info>`) ao lado de um label que,
 * ao hover, exibe o texto explicativo (portalizado, com `z-[100]`).
 *
 * Mesmo padrão visual de `ConsultaXMLs.tsx` / `ApuracaoPisCofins.tsx`.
 * Uso: `<Label>Cliente <RequiredMark /> <FieldTooltip text="..." /></Label>`.
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

/** Tooltips reutilizados pelos filtros principais e internos das abas. */
export const AUDITORIA_TOOLTIPS = {
  // Filtros principais (obrigatórios)
  cliente: "Cliente cuja base fiscal será analisada. Obrigatório.",
  contribuinte:
    "CNPJ/contribuinte específico do cliente. Quando há apenas um, é selecionado automaticamente. Obrigatório.",
  dataInicio: "Data inicial do período a ser cruzado entre as fontes (Balancete, EFD, XML). Obrigatório.",
  dataFim: "Data final do período a ser cruzado entre as fontes (Balancete, EFD, XML). Obrigatório.",
  // Filtros internos (opcionais)
  contaContabil: "Filtra a árvore de contas pelo código ou descrição.",
  periodoFechado: "Quando ativo, mostra apenas o saldo do último mês acumulado.",
  chaveNfe: "Filtra os documentos pela chave de acesso da NFe (44 dígitos).",
  cfopIntervalo: "Filtra os lotes pelo CFOP ou pelo intervalo de numeração informado.",
} as const;
