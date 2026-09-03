import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { DialogPortal } from "@/components/ui/dialog";

// Variante OSG do DialogContent. Igual ao shadcn em estrutura, comportamento E
// ANIMAÇÃO: os mesmos handlers de foco e clique-fora, o mesmo botão de fechar, e
// desde 03/09/2026 o mesmo fade com zoom de 200ms.
//
// A entrada própria que existia aqui (subida de 28px, escala passando do ponto,
// 0,42s) foi retirada por parecer lenta em uso: bonita na primeira vez, arrastada
// na terceira. As keyframes `osg-modal-*` continuam no tailwind.config sem uso
// por este componente.
//
// O que ainda justifica o componente próprio: o overlay mais claro com desfoque
// leve, o `clip-path` que conserta o scrollbar desenhando por cima do raio no
// Chrome/Linux, e o tratamento de `onInteractOutside` que deixa fechar por clique
// mas ignora o dismiss disparado por troca de aba. O twMerge não deduplica as
// classes do tailwindcss-animate, por isso o class string é escrito inteiro aqui.

const OsgDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      // Animação PADRÃO do shadcn, igual à do `ui/dialog`. A entrada própria da
      // OSG (0,42s com passagem do ponto e volta) foi retirada em 03/09/2026 por
      // parecer lenta e pesada em uso. O que continua diferente daqui é só o
      // `bg-black/60` mais claro e o desfoque leve do fundo.
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] " +
        "data-[state=open]:animate-in data-[state=closed]:animate-out " +
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
OsgDialogOverlay.displayName = "OsgDialogOverlay";

const OsgDialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <DialogPortal>
    <OsgDialogOverlay />
    <DialogPrimitive.Content
      ref={ref}
      onFocusOutside={(e) => e.preventDefault()}
      onInteractOutside={(e) => {
        // Permite fechar pelo clique no overlay (PointerEvent), mas bloqueia o
        // dismiss disparado por foco/blur do SO (ex.: troca de aba).
        const original = e.detail?.originalEvent;
        if (original && !(original instanceof PointerEvent)) {
          e.preventDefault();
        }
      }}
      className={cn(
        "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] " +
          // bg-background herda o tom levemente amarronzado de .osg-theme (no <html>).
          // SEM `will-change`, e isso e correcao de 01/09/2026: ele promovia o
          // modal a uma camada propria E A MANTINHA LA depois da animacao. Junto
          // com o translate(-50%,-50%), que cai em meio pixel quando a largura da
          // numero impar, o texto renderizava borrado o tempo todo. A animacao de
          // entrada dura fracao de segundo e o navegador da conta sem a dica.
          "gap-4 border bg-background p-6 shadow-lg sm:rounded-lg duration-200 " +
          // Igual ao `ui/dialog`: fade mais zoom curto, 200ms. Substitui a
          // entrada própria da OSG, que subia 28px e passava do ponto antes de
          // assentar. Bonita no papel, arrastada na terceira vez que se abre.
          "data-[state=open]:animate-in data-[state=closed]:animate-out " +
          "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 " +
          "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 " +
          "data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] " +
          "data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] " +
          // Em Chrome/Linux o scrollbar de hover "sobe de layer" e desenha por
          // cima do border-radius. clip-path força o recorte visual no raio do
          // modal, independente da camada do scrollbar.
          "sm:[clip-path:inset(0_round_0.75rem)]",
        className,
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
));
OsgDialogContent.displayName = "OsgDialogContent";

// Reexporta o restante das partes do diálogo sem alteração, de modo que os
// modais OSG troquem apenas o caminho do import. Exportamos OsgDialogContent
// como DialogContent para manter o JSX dos modais inalterado.
export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export { OsgDialogContent as DialogContent };
