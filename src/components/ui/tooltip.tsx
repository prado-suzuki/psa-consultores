import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * O balão só funciona com um provider acima dele, e o Radix não perdoa a falta:
 * `TooltipPrimitive.Root` lê um contexto do `Provider` e LANÇA em tempo de render
 * quando ele não existe, em vez de degradar. No app isso nunca aparece, porque o
 * `App.tsx` embrulha a aplicação inteira num provider só.
 *
 * Aparece no TESTE, que monta um pedaço da tela fora do `App.tsx`. E não aparece
 * como "faltou o balão": a montagem inteira do componente cai, o container volta
 * vazio, e o teste falha dizendo que não achou um botão que nunca chegou a
 * existir. Foi o que aconteceu com 37 arquivos de teste depois que a conversão de
 * `title=` para `<Tooltip>` trocou 126 botões de ícone, em 17/09/2026.
 *
 * Daí este contexto próprio, que responde uma pergunta que o Radix não expõe: já
 * existe um provider acima? Se existe, o `Tooltip` é o `Root` puro, que é
 * exatamente o que ele era antes desta mudança. Se não existe, ele providencia o
 * seu.
 *
 * NO APP NADA MUDA. O `App.tsx` marca o contexto como `true` na raiz, então a
 * árvore renderizada em produção é a mesma de sempre. O único efeito real é no
 * teste: com um provider por balão, cada um fica isolado e se perde o
 * `skipDelayDuration`, que faz o balão vizinho abrir sem espera. Nada afirma esse
 * comportamento, e no app ele continua valendo porque lá o provider é um só.
 *
 * ⚠️ Isto cobre TODOS os balões do sistema: os três arquivos que importam o Radix
 * direto (`ComAjuda`, `icms-saidas/tooltipHelpers`, `dashboard-uso-envio/primitivos`)
 * usam só o `Portal`, nunca o `Root`.
 */
const TemProvider = React.createContext(false);

function TooltipProvider({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Provider>) {
  return (
    <TemProvider.Provider value={true}>
      <TooltipPrimitive.Provider {...props}>{children}</TooltipPrimitive.Provider>
    </TemProvider.Provider>
  );
}

function Tooltip(props: React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>) {
  const temProvider = React.useContext(TemProvider);
  if (temProvider) return <TooltipPrimitive.Root {...props} />;
  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root {...props} />
    </TooltipPrimitive.Provider>
  );
}

const TooltipTrigger = TooltipPrimitive.Trigger;

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content> & {
    showArrow?: boolean;
  }
>(({ className, sideOffset = 4, showArrow = false, ...props }, ref) => (
  <TooltipPrimitive.Portal>
    <TooltipPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "relative z-50 max-w-[280px] rounded-lg border border-border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className,
      )}
      {...props}
    >
      {props.children}
      {showArrow && (
        <TooltipPrimitive.Arrow className="-my-px fill-popover drop-shadow-[0_1px_0_hsl(var(--border))]" />
      )}
    </TooltipPrimitive.Content>
  </TooltipPrimitive.Portal>
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
