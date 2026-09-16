import { Fragment, type ReactNode } from "react";
import { Info, type LucideIcon } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AVISO_CAIXA, AVISO_CAIXA_ACENTO, AVISO_CAIXA_TEXTO } from "@/components/equipe/dev/classesDoAviso";

interface DevPageHeaderProps {
  /** Texto descritivo principal. Suporta `**negrito**`. */
  description: string;
  /**
   * Título da caixa. Default: "Visão Geral".
   *
   * Existe porque telas de ação (ex.: "Solicitar nova ferramenta") explicam
   * COMO FUNCIONA, não dão visão geral de um relatório — e por não ter esta
   * prop elas acabavam montando um `<Alert>` cru, que herda os tokens padrão e
   * sai branco/âmbar em vez do verde-água do módulo. Mesma caixa, mesmo tom, só
   * o título muda.
   */
  title?: string;
  /** Ícone da caixa. Default: `Info`. */
  icon?: LucideIcon;
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
 *
 * NÃO leva link de manual. Ele já existe uma vez por tela, como botão "Acessar
 * manual" no cabeçalho do `DevLayout`, resolvido pela rota — dois acessos na
 * mesma página é o que a revisão de conteúdo pediu para acabar.
 *
 * Aplica `mb-6` para preservar o respiro até o Card de Filtros logo abaixo.
 */
export const DevPageHeader = ({
  description,
  title = "Visão Geral",
  icon: Icone = Info,
}: DevPageHeaderProps) => {
  return (
    // A superfície mora em `classesDoAviso.ts`, com as três formas que ela teve
    // em 10/09/2026 e a medição de cada uma. Resumo: o "verde-água do módulo" que
    // o docstring acima descreve era hex cravado; virou token e continuou
    // invisível; virou faixa escura e passou a ganhar do título da tela; e agora é
    // caixa branca e leve, que é apoio e se comporta como apoio. A causa do
    // primeiro defeito não era a cor clara, era a caixa não ter ARESTA — a borda
    // tinha o valor do próprio fundo. Está tudo escrito lá, com os números.
    <Alert className={`mb-6 ${AVISO_CAIXA}`}>
      <Icone className="h-5 w-5" />
      <AlertTitle className="text-[13px] font-semibold">
        {title}
      </AlertTitle>
      <AlertDescription className={`${AVISO_CAIXA_TEXTO} mt-1`}>
        {renderBoldSegments(description)}
      </AlertDescription>
    </Alert>
  );
};

export default DevPageHeader;
