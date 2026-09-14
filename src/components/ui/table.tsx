import * as React from "react";

import { cn } from "@/lib/utils";

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {
  containerRef?: React.Ref<HTMLDivElement>;
  containerClassName?: string;
}

const Table = React.forwardRef<HTMLTableElement, TableProps>(
  ({ className, containerRef, containerClassName, ...props }, ref) => (
    <div ref={containerRef} className={cn("relative w-full overflow-auto", containerClassName)}>
      <table ref={ref} className={cn("w-full caption-bottom text-sm", className)} {...props} />
    </div>
  ),
);
Table.displayName = "Table";

const TableHeader = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => <thead ref={ref} className={cn("[&_tr]:border-b", className)} {...props} />,
);
TableHeader.displayName = "TableHeader";

const TableBody = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tbody ref={ref} className={cn("[&_tr:last-child]:border-0", className)} {...props} />
  ),
);
TableBody.displayName = "TableBody";

/**
 * `bg-superficie-realce` e NÃO o `/50` cru, nos dois lugares deste arquivo — a
 * faixa de totais e o hover da linha —, desde 12/09/2026.
 *
 * O degrau não mudou por gosto: mudou porque o CHÃO subiu. O `<Card>` deixou de
 * ser branco e passou a `bg-superficie-cartao` (35% de `--muted`), e toda tabela
 * do produto vive dentro de um. Os dois degraus aqui eram feitos do MESMO
 * `--muted` que agora está no fundo, então eles encolheram por tabela:
 *
 *     casa  1,112:1 → 1,073:1     Tax  1,120:1 → 1,078:1     OSG  1,106:1 → 1,069:1
 *
 * A classe recompõe o que havia contra o cartão branco, e recompõe EXATO nas três
 * áreas — os mesmos três números da coluna da esquerda. O alfa dela mora no
 * `tailwind.config.ts`, num lugar só, junto com o porquê; a conta está travada em
 * `cartaoTingido.test.ts`, que RECALCULA os dois lados a partir do `index.css` e
 * do `tailwind.config.ts` em vez de olhar o número.
 *
 * É o mesmo defeito do par de cenários da calculadora de ITCD, no mesmo dia:
 * **quando uma superfície se move, todo degrau construído sobre ela se move
 * junto, e nada falha.**
 *
 * O `data-[state=selected]` da linha ficou como estava: nenhum consumidor do
 * produto o liga (procurei), é herança do shadcn e mexer nele seria calibrar
 * um estado que ninguém vê.
 */
const TableFooter = React.forwardRef<HTMLTableSectionElement, React.HTMLAttributes<HTMLTableSectionElement>>(
  ({ className, ...props }, ref) => (
    <tfoot ref={ref} className={cn("border-t bg-superficie-realce font-medium [&>tr]:last:border-b-0", className)} {...props} />
  ),
);
TableFooter.displayName = "TableFooter";

const TableRow = React.forwardRef<HTMLTableRowElement, React.HTMLAttributes<HTMLTableRowElement>>(
  ({ className, ...props }, ref) => (
    <tr
      ref={ref}
      className={cn("border-b transition-colors data-[state=selected]:bg-muted hover:bg-superficie-realce", className)}
      {...props}
    />
  ),
);
TableRow.displayName = "TableRow";

const TableHead = React.forwardRef<HTMLTableCellElement, React.ThHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <th
      ref={ref}
      className={cn(
        "h-12 px-4 text-left align-middle !font-bold text-muted-foreground [&:has([role=checkbox])]:pr-0",
        className,
      )}
      {...props}
    />
  ),
);
TableHead.displayName = "TableHead";

const TableCell = React.forwardRef<HTMLTableCellElement, React.TdHTMLAttributes<HTMLTableCellElement>>(
  ({ className, ...props }, ref) => (
    <td ref={ref} className={cn("p-4 align-middle [&:has([role=checkbox])]:pr-0", className)} {...props} />
  ),
);
TableCell.displayName = "TableCell";

const TableCaption = React.forwardRef<HTMLTableCaptionElement, React.HTMLAttributes<HTMLTableCaptionElement>>(
  ({ className, ...props }, ref) => (
    <caption ref={ref} className={cn("mt-4 text-sm text-muted-foreground", className)} {...props} />
  ),
);
TableCaption.displayName = "TableCaption";

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
