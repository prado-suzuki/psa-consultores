import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * `bg-superficie-cartao` e NÃO `bg-card`, desde 12/09/2026.
 *
 * A página ficou branca, e com ela o cartão e o campo — três superfícies no
 * mesmo valor, separadas só por uma linha a 1,23:1. A tinta voltou para o
 * OBJETO: o cartão desce 35% de `--muted` e o campo dentro dele fica branco.
 * A receita, o porquê de não ser o token `--card` e as exceções estão no
 * `tailwind.config.ts` (cor `superficie-cartao`) e na catraca
 * `src/lib/cartaoTingido.test.ts`.
 *
 * Esta linha alcança 365 usos de `<Card>` em 173 arquivos de uma vez — é o
 * motivo pelo qual ela existe. Um `className="bg-card"` no consumidor a
 * CANCELA (o `cn` deixa a última classe vencer), e cinco faziam isso sem
 * querer; a catraca cobre esse caso à parte.
 */
const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("rounded-lg border bg-superficie-cartao text-card-foreground shadow-sm", className)}
    {...props}
  />
));
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };
