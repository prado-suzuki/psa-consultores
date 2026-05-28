import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";
import { DialogPortal } from "@/components/ui/dialog";

// Variante OSG do DialogContent. Igual ao shadcn em estrutura e comportamento
// (mesmos handlers de foco/clique-fora, mesmo botão de fechar), mas troca a
// animação padrão (fade + zoom seco) por uma entrada mais elegante: rise sutil
// + leve escala com easing ease-out-expo, e overlay com leve blur. Mantemos um
// componente próprio em vez de só sobrescrever className porque o twMerge não
// deduplica as classes do tailwindcss-animate, e o conteúdo controla 100% do
// class string assim. As keyframes osg-* ficam no tailwind.config.

const OsgDialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] " +
        "data-[state=open]:animate-osg-overlay-in data-[state=closed]:animate-osg-overlay-out " +
        "motion-reduce:animate-none",
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
          "gap-4 border bg-background p-6 shadow-lg will-change-[transform,opacity] sm:rounded-lg " +
          "data-[state=open]:animate-osg-modal-in data-[state=closed]:animate-osg-modal-out " +
          "motion-reduce:animate-none " +
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
