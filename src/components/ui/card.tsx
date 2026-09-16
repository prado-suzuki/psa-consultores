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
/**
 * A VARIANTE `tabela`, decidida pela Patricia em 16/09/2026.
 *
 * O cartão que envolve uma tabela fica BRANCO, e não tingido. Não é exceção:
 * é a regra para esse recorte, e a catraca cobra os dois lados (ver
 * `src/lib/caixaDeTabela.test.ts`).
 *
 * O que decidiu, medido em `docs/geral/comparacoes-de-cor/a-caixa-da-tabela.html`:
 * **o hover de linha tem teto.** A zebra que a tabela perde sobre o cartão
 * tingido se recupera subindo o alfa; o hover não, porque é feito de `--muted` e
 * a superfície do cartão já é 35% de `--muted`. Mesmo a 100%, sem transparência,
 * ele chega a 1,154:1 contra os 1,175:1 que tem sobre o branco — não é
 * calibração, é fim de escala. E o hover é o único dos dois que serve para
 * AGIR: saber em qual linha se vai clicar.
 *
 * O custo é real e está aceito: `--card` e `--background` têm o mesmo valor, então
 * o cartão de tabela apoiado direto na página fica a 1,000:1 dela e quem o segura
 * é a borda. Onde há superfície tingida atrás, o custo some.
 */
type CardProps = React.HTMLAttributes<HTMLDivElement> & {
  /** `tabela` = o cartão envolve uma `<Table>` e fica branco. Ver acima. */
  variant?: "tabela";
};

/**
 * ⚠️ A STRING BASE FICA INTEIRA, LITERAL E COLADA NO `cn(`, e a variante
 * SOBREPÕE. Não é estilo: **dois testes leem este arquivo como TEXTO.**
 *
 * · `cartaoTingido.test.ts` casa a string inteira para provar que o cartão
 *   padrão continua tingido.
 * · `eslint-rules/token-nao-sobrescrito.test.ts` deriva o token de cada
 *   componente do `ui/` com `/\b(?:cn|cva)\(\s*"([^"]+)"/` — ou seja, exige o
 *   literal **imediatamente** depois do `cn(`, só com espaço no meio.
 *
 * A primeira tentativa pôs as duas superfícies num ternário, e a segunda pôs um
 * comentário entre o `cn(` e o literal. As duas derrubaram a derivação, e a
 * segunda de um jeito que só aparece em teste: o `<Card>` sumiu do mapa da regra
 * de ESLint, que é o que impede consumidor de repintar token.
 *
 * `cn` deixa a última classe vencer — é o mesmo mecanismo pelo qual um
 * `className="bg-card"` no consumidor cancela a tinta, documentado acima.
 */
const Card = React.forwardRef<HTMLDivElement, CardProps>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      "rounded-lg border bg-superficie-cartao text-card-foreground shadow-sm",
      variant === "tabela" && "bg-card",
      className,
    )}
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
