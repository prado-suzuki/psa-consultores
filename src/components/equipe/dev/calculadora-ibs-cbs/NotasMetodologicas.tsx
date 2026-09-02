import type { ReactNode } from "react";
import { ShieldAlert } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export interface NotaMetodologica {
  titulo: string;
  texto: ReactNode;
}

interface NotasMetodologicasProps {
  notas: NotaMetodologica[];
}

export function NotasMetodologicas({ notas }: NotasMetodologicasProps) {
  if (notas.length === 0) return null;
  return (
    <Card className="border-border bg-muted">
      <CardContent className="p-5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground mb-3 flex items-center gap-1.5">
          <ShieldAlert className="h-3.5 w-3.5" />
          Notas metodológicas
        </h4>
        <ul className="text-[11px] text-muted-foreground space-y-1.5 leading-relaxed">
          {notas.map((n, i) => (
            <li key={i}>
              <strong className="text-foreground">{n.titulo}:</strong> {n.texto}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
