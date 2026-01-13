import { LucideIcon } from "lucide-react";
import {
  CardHoverReveal,
  CardHoverRevealMain,
  CardHoverRevealContent,
} from "@/components/ui/card-hover-reveal";
import { cn } from "@/lib/utils";

interface Servico {
  nome: string;
  descricao: string;
}

interface PilarCardProps {
  titulo: string;
  descricao: string;
  imagem: string;
  servicos: Servico[];
  icone: LucideIcon;
  className?: string;
}

export const PilarCard = ({
  titulo,
  descricao,
  imagem,
  servicos,
  icone: Icon,
  className,
}: PilarCardProps) => {
  return (
    <CardHoverReveal
      className={cn(
        "h-[420px] md:h-[480px] w-full rounded-2xl border border-border/50 shadow-lg",
        className
      )}
    >
      {/* Background Image with zoom effect */}
      <CardHoverRevealMain>
        <img
          src={imagem}
          alt={titulo}
          className="size-full object-cover"
        />
        {/* Gradient overlay - always visible */}
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/60 to-gray-900/20" />
      </CardHoverRevealMain>

      {/* Always visible title at bottom */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-lg bg-primary/20 backdrop-blur-sm">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-xl md:text-2xl font-bold text-white">
            {titulo}
          </h3>
        </div>
        <p className="text-sm text-gray-300 line-clamp-2 group-hover:opacity-0 transition-opacity duration-300">
          {descricao}
        </p>
      </div>

      {/* Revealed content on hover */}
      <CardHoverRevealContent className="rounded-2xl bg-gray-900/90 backdrop-blur-md border-t border-primary/30">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/20">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">{titulo}</h3>
              <p className="text-xs text-gray-400">{descricao}</p>
            </div>
          </div>

          <div className="space-y-3 max-h-[220px] overflow-y-auto pr-2 scrollbar-thin">
            {servicos.map((servico, index) => (
              <div
                key={index}
                className="p-3 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-primary/30 transition-colors"
              >
                <h4 className="text-sm font-semibold text-white mb-1">
                  {servico.nome}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  {servico.descricao}
                </p>
              </div>
            ))}
          </div>
        </div>
      </CardHoverRevealContent>
    </CardHoverReveal>
  );
};
