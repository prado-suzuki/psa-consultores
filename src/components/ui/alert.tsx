import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "bg-background text-foreground",
        destructive: "border-destructive/50 text-destructive dark:border-destructive [&>svg]:text-destructive",
        /* Painel de aviso — o papel `alerta`.

           O texto fica em `foreground`, não em `text-warning`, e a diferença é
           medida: `--warning` é `var(--status-alerta)` (`20 72% 32%`, ferrugem
           escura), calibrado para RECEBER texto claro. Um parágrafo inteiro
           nessa cor lê como bloco tingido; o ícone basta para dar o significado.

           O alvo é o semântico com alfa e NÃO `bg-status-alerta-soft`: o `.dark`
           não declara nenhum `--status-*`, então o painel cairia no valor do
           tema claro quando o escuro entrar. `--warning` o `.dark` declara. É
           também a recomendação registrada em
           `docs/geral/comparacoes-de-cor/superficie-de-estado.html`, e o padrão
           que a casa já usava à mão antes desta variante existir. */
        warning: "border-warning/40 bg-warning/10 text-foreground [&>svg]:text-warning",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h5 ref={ref} className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
  ),
);
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("text-sm [&_p]:leading-relaxed", className)} {...props} />
  ),
);
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
