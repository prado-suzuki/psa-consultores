import { Fragment, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface DevPageHeaderProps {
  /** Texto descritivo principal. Suporta `**negrito**`. */
  description: string;
  /** URL do manual de uso desta ferramenta (abre em nova guia). Opcional quando `hideManualLink` é true. */
  manualUrl?: string;
  /** Quando true, omite a frase "Para acessar o manual..." e o link `aqui`. Default: false. */
  hideManualLink?: boolean;
}

/**
 * Renderiza um texto convertendo `**trecho**` em `<strong>`, sem usar
 * `dangerouslySetInnerHTML`. Cada nó recebe `key` para evitar warnings
 * de iteração do React.
 */
const renderBoldSegments = (text: string): ReactNode[] => {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    const match = part.match(/^\*\*([^*]+)\*\*$/);
    if (match) {
      return (
        <strong key={index} className="font-semibold">
          {match[1]}
        </strong>
      );
    }
    return <Fragment key={index}>{part}</Fragment>;
  });
};

/**
 * Cabeçalho oficial "Visão Geral" do módulo /equipe/dev.
 *
 * Renderiza um Alert verde-água padronizado com:
 *  - Ícone Info + título "Visão Geral"
 *  - Descrição (suporta `**negrito**`)
 *  - Frase fixa anexada contiguamente ao final: "Para acessar o manual
 *    de uso completo, clique aqui." — apenas "aqui" é hyperlink, abrindo
 *    em nova guia para `manualUrl`.
 *
 * Aplica `mb-6` para preservar o respiro até o Card de Filtros logo abaixo.
 */
export const DevPageHeader = ({ description, manualUrl, hideManualLink = false }: DevPageHeaderProps) => {
  return (
    <Alert className="mb-6 bg-[#E6F2F1]/80 border-[#E6F2F1] dark:bg-teal-950/30 dark:border-teal-800">
      <Info className="h-5 w-5 text-teal-700 dark:text-teal-400" />
      <AlertTitle className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Visão Geral
      </AlertTitle>
      <AlertDescription className="text-sm leading-relaxed text-slate-700 dark:text-slate-300 mt-1">
        {renderBoldSegments(description)}
        {!hideManualLink && manualUrl && (
          <>
            {" Para acessar o manual de uso completo, clique "}
            <a
              href={manualUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-emerald-600 dark:text-emerald-400 hover:underline"
            >
              aqui
            </a>
            .
          </>
        )}
      </AlertDescription>
    </Alert>
  );
};

export default DevPageHeader;
