import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BLOCK_DESCRIPTIONS, REG_DESCRIPTIONS } from '@/constants/efdConfig';
import type { BlocoRegistro } from '@/types/efd';

interface EFDBlockTreeProps {
  blocosDisponiveis: Record<string, BlocoRegistro[]>;
  selectedRegistro: string;
  onSelectRegistro: (registro: string) => void;
  className?: string;
}

export function EFDBlockTree({
  blocosDisponiveis,
  selectedRegistro,
  onSelectRegistro,
  className,
}: EFDBlockTreeProps) {
  // Árvore inicia colapsada
  const [expandedBlocks, setExpandedBlocks] = useState<Set<string>>(new Set());

  const toggleBlock = (bloco: string) => {
    setExpandedBlocks(prev => {
      const next = new Set(prev);
      if (next.has(bloco)) {
        next.delete(bloco);
      } else {
        next.add(bloco);
      }
      return next;
    });
  };

  const blocos = Object.keys(blocosDisponiveis);

  return (
    <div 
      className={cn(
        "space-y-2 overflow-y-auto",
        "[&::-webkit-scrollbar]:w-2",
        "[&::-webkit-scrollbar-track]:bg-muted",
        "[&::-webkit-scrollbar-thumb]:bg-muted",
        "[&::-webkit-scrollbar-thumb]:rounded-full",
        className
      )}
    >
      {blocos.map(bloco => {
        const isExpanded = expandedBlocks.has(bloco);
        const registros = blocosDisponiveis[bloco] || [];
        const blockName = BLOCK_DESCRIPTIONS[bloco] || `Bloco ${bloco}`;

        return (
          <div key={bloco} className="mb-1">
            {/* Header do Bloco */}
            <button
              onClick={() => toggleBlock(bloco)}
              className={cn(
                "flex items-center w-full px-3 py-2.5 text-sm font-bold rounded-lg transition-colors",
                "bg-white border border-border shadow-sm",
                "hover:bg-muted",
                "text-foreground"
              )}
            >
              <ChevronRight 
                className={cn(
                  "w-4 h-4 mr-2 text-primary transition-transform duration-300",
                  isExpanded && "rotate-90"
                )} 
              />
              {blockName}
            </button>

            {/* Registros do Bloco */}
            <div 
              className={cn(
                "overflow-hidden transition-all duration-300",
                isExpanded ? "max-h-[2000px] opacity-100" : "max-h-0 opacity-0"
              )}
            >
              <div className="pl-4 mt-1 border-l-2 border-border ml-4 space-y-1">
                {registros.map(reg => {
                  const regCode = reg.codigo.replace('REG_', '');
                  const isSelected = selectedRegistro === reg.codigo;
                  const description = REG_DESCRIPTIONS[regCode] || reg.descricao || 'Registro';

                  return (
                    <button
                      key={reg.codigo}
                      onClick={() => onSelectRegistro(reg.codigo)}
                      className={cn(
                        "flex items-center w-full px-2 py-1.5 text-xs font-medium rounded-md transition-colors text-left",
                        isSelected 
                          ? "bg-primary/10 text-primary border border-primary/20" 
                          :"text-muted-foreground hover:text-primary hover:bg-muted"
                      )}
                    >
                      <span 
                        className={cn(
                          "font-mono px-1.5 py-0.5 rounded text-[10px] mr-2 min-w-[40px] text-center border",
                          isSelected 
                            ? "bg-primary/10 text-primary border-primary/30" 
                            :"bg-muted text-foreground border-border"
                        )}
                      >
                        {regCode}
                      </span>
                      <span className="truncate">{description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
