import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

export const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        /* Pílula de aviso — o papel `alerta`.

           Ela é SUAVE enquanto o `destructive` acima é CHEIO, e isso não é
           descuido: as pílulas âmbar que esta variante veio absorver eram
           todas `bg-amber-100 text-amber-700`, ou seja fundo pálido com texto
           escuro. Um `bg-warning` cheio seria lajota de ferrugem com texto
           branco onde hoje há um chip claro — mudança de peso que a migração de
           papel não pede.

           A forma é a que a casa já usa em pílula de status (`combined` de
           `taskStatusColors`, `badge` de `projetoStatusColors`): fundo suave,
           tom cheio no texto, borda do próprio tom. A diferença é a origem do
           fundo suave — aqui é alfa sobre o semântico, e não `--warning-soft`,
           porque esse token não existe e o `.dark` não declara `--status-*`. */
        warning: "border-warning/15 bg-warning/10 text-warning hover:bg-warning/20",
        outline: "text-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}
