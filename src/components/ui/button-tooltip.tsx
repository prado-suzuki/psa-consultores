import { forwardRef, type ComponentPropsWithoutRef, type ReactElement, type ReactNode, type Ref } from "react";
import { Slot } from "@radix-ui/react-slot";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * O BALÃO TRAZ O PRÓPRIO PROVEDOR, e isto não é zelo: sem ele o componente
 * DERRUBA quem o usa fora da árvore do `App`.
 *
 * O `TooltipProvider` do Radix é obrigatório, e existe um só, na raiz do
 * `App.tsx`. Enquanto a explicação era `title=` nativo isso não pesava; com a
 * conversão dos 126 botões de ícone (sprint 13, tarefa 14) passou a pesar, e o
 * preço apareceu no teste: **235 casos em cerca de 50 arquivos** quebraram com
 * "`Tooltip` must be used within `TooltipProvider`", porque teste de unidade
 * monta o componente sozinho, sem o `App`. A CI não acusou porque ela só roda
 * em PR e em push para a `main` — a conversão inteira viveu na `develop`, fora
 * do alcance dela.
 *
 * Aninhar provedor é o que a casa já faz em `Header`, `mapa/Tooltip`,
 * `itcmdKit` e outros cinco pontos. O da raiz não passa props, então este, sem
 * props também, repete a mesma configuração do Radix. A única diferença é o
 * `skipDelayDuration`, que deixa de agrupar balões vizinhos — e ele já não
 * agrupava nos pontos que aninham provedor com delay próprio.
 *
 * A alternativa era embrulhar cada teste na mão, arquivo por arquivo. Isso
 * conserta o sintoma e deixa de pé a armadilha: componente compartilhado que
 * só funciona debaixo de um ancestral específico volta a quebrar no próximo
 * lugar novo.
 */

interface DicaProps extends Omit<ComponentPropsWithoutRef<typeof Slot>, "children"> {
  /** O nome do controle. Curto, no infinitivo, sem ponto final: "Editar OS". */
  text: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  /** Um único elemento que aceite `ref` — o botão. */
  children: ReactElement;
}

/**
 * Props e `ref` extras seguem para o filho: um `DropdownMenuTrigger asChild` por fora
 * entrega aqui os handlers que abrem o menu, e sem repassá-los o menu não abre.
 */
const Dica = forwardRef<HTMLElement, DicaProps>(
  ({ text, side = "top", children, ...repasse }, ref) => {
    // Sem texto não há balão: um `<Tooltip>` vazio abriria em branco no hover, e vários
    // textos convertidos são condicionais (`cond ? texto : undefined`).
    if (text === null || text === undefined || text === "") {
      return (
        <Slot ref={ref} {...repasse}>
          {children}
        </Slot>
      );
    }
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger ref={ref as Ref<HTMLButtonElement>} asChild {...repasse}>
            {children}
          </TooltipTrigger>
          <TooltipContent side={side}>{text}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  },
);
Dica.displayName = "Dica";

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
export const ButtonTooltip = Dica;

/**
 * A mesma dica, para um elemento que **não é controle** — a célula que corta o texto, o
 * selo, o número que precisa dizer de onde veio.
 *
 * Existe separado do `ButtonTooltip` porque o papel é outro, e a diferença é acessível:
 * no botão de ícone o texto **é o nome** e precisa de `aria-label`; aqui o texto já está
 * na tela (ou é explicação do que está), e um `aria-label` sobreporia o conteúdo que o
 * leitor de tela já lê. Por isso este não põe `aria-label` nenhum.
 */
export const ElementTooltip = Dica;
