import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * O aviso: superfície de CARTÃO, com a cor na faixa e no ícone.
 *
 * ## A decisão (dela, 11/09/2026 — opção C)
 *
 * As duas primeiras propostas foram recusadas: o fundo tingido no papel (a
 * mancha de cor lavada, que era o desenho anterior desta variante) e o neutro
 * com o significado só no ícone — porque **tirar a cor não é opção**: o aviso
 * tem que se ver na tela.
 *
 * A saída é a terceira: a superfície volta a ser a do cartão, e a cor vira
 * **faixa de 4px na esquerda mais o ícone**. O aviso continua se vendo de longe
 * pela faixa, e o texto sai do tom — lê a 14,2:1 em vez dos ~6,8:1 que o texto
 * colorido sobre o próprio fundo dava.
 *
 * O custo, que ela aceitou olhando: dois avisos seguidos viram uma pilha de
 * listras.
 *
 * ## A armadilha do ícone, que continua valendo
 *
 * A string base tem `[&>svg]:text-foreground`, que é especificidade 0,1,1
 * (classe + elemento). Classe de cor posta no próprio `<svg>` é 0,1,0 e PERDE,
 * sem erro de build e sem aviso de lint. Por isso cada variante repõe a cor do
 * ícone como `[&>svg]:...`, na mesma forma — aí o `tailwind-merge` do `cn()`
 * descarta a da base.
 */
const alertVariants = cva(
  "relative w-full rounded-lg border border-l-4 bg-card text-card-foreground p-4 [&>svg~*]:pl-7 [&>svg+div]:translate-y-[-3px] [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
  {
    variants: {
      variant: {
        default: "border-l-border",
        destructive: "border-l-destructive [&>svg]:text-destructive",
        /* Painel de aviso — o papel `alerta`.

           O fundo a 10% e o texto em `text-warning` saíram em 11/09/2026: eram
           o desenho que ela recusou, e o motivo está no docstring acima. A cor
           continua semântica (`--warning` é `var(--status-alerta)`) e continua
           vindo do semântico e não de `bg-status-alerta-soft`, porque o `.dark`
           não declara nenhum `--status-*` e o painel cairia no valor do tema
           claro quando o escuro entrar — `--warning` o `.dark` declara. */
        warning: "border-l-warning [&>svg]:text-warning",
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
