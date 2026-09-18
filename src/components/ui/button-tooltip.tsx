import type { ReactElement, ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * A dica de um controle sem texto visível — o degrau 0 da árvore de decisão
 * (`docs/geral/texto-explicativo-na-tela.md`).
 *
 * Botão só de ícone não tem rótulo para repetir: o texto daqui **é** o nome dele. Por
 * isso o mesmo texto vai nos dois lugares — `aria-label` no botão, para quem navega, e
 * este balão, para quem olha. Os dois cumprem funções diferentes, e repetir está certo.
 *
 * Substitui o `title=` nativo, que não aparece no toque, espera cerca de um segundo e
 * não acompanha o tema.
 *
 * ⚠️ **Já existiam duas cópias disto** quando este arquivo nasceu, em 17/09/2026:
 * `equipe/dev/consulta-xmls/tooltips.tsx` e `equipe/dev/icms-saidas/tooltipHelpers.tsx`,
 * as duas com a mesma assinatura e estilos próprios. Não foram tocadas aqui — unificar é
 * decisão dela, e está registrada na tarefa 14 da sprint 13 com o número dos dois lados.
 * Código novo usa **este**.
 */
export function ButtonTooltip({
  text,
  side = "top",
  children,
}: {
  /** O nome do controle. Curto, no infinitivo, sem ponto final: "Editar OS". */
  text: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  /** Um único elemento que aceite `ref` — o botão. */
  children: ReactElement;
}) {
  // Sem texto não há balão. O `title` vazio ou `undefined` simplesmente não
  // aparecia; um `<Tooltip>` sem esta guarda abriria um balão em branco no hover,
  // e vários textos convertidos são condicionais (`cond ? texto : undefined`).
  if (text === null || text === undefined || text === "") return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{text}</TooltipContent>
    </Tooltip>
  );
}

/**
 * A mesma dica, para um elemento que **não é controle** — a célula que corta o texto, o
 * selo, o número que precisa dizer de onde veio.
 *
 * Existe separado do `ButtonTooltip` porque o papel é outro, e a diferença é acessível:
 * no botão de ícone o texto **é o nome** e precisa de `aria-label`; aqui o texto já está
 * na tela (ou é explicação do que está), e um `aria-label` sobreporia o conteúdo que o
 * leitor de tela já lê. Por isso este não põe `aria-label` nenhum.
 */
export function ElementTooltip({
  text,
  side = "top",
  children,
}: {
  text: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  children: ReactElement;
}) {
  if (text === null || text === undefined || text === "") return children;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side={side}>{text}</TooltipContent>
    </Tooltip>
  );
}
