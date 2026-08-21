import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Barra de ação em massa: aparece acima da lista quando há itens marcados e
 * some quando a seleção zera.
 *
 * Extraída de `equipe/tarefas/ProjetosTarefasList`, onde vivia inline. O
 * levantamento do design system achou três idiomas concorrentes para a mesma
 * coisa — barra inline, botões desabilitados no cabeçalho do card e uma
 * contagem solta em texto —, e só o primeiro oferecia "limpar seleção". Este é
 * o primeiro.
 *
 * Duas decisões de forma:
 *
 * 1. FUNDO DE ACENTO, não `bg-primary/5`. O fundo lavado do original ficava a um
 *    fio do fundo das próprias linhas selecionadas: a barra que comanda a
 *    seleção lia igual ao que ela comanda. Com o acento cheio ela vira o único
 *    elemento saturado da tela enquanto a seleção existe, que é exatamente o
 *    peso que ela deve ter — e libera o neutro para a linha marcada (ver
 *    `src/lib/listRowStates.ts`).
 *
 * 2. INLINE, empurrando o conteúdo. Nada de flutuar sobre a lista: barra
 *    sobreposta tapa justamente as linhas que a pessoa acabou de marcar.
 *
 * Sobre o acento nada de `bg-white`: `primary-foreground` é branco puro em todos
 * os temas do arquivo e mantém o par acento/contraste como uma coisa só.
 */

export interface BulkAction {
  label: string;
  onClick: () => void;
  /** Ícone à esquerda do rótulo. Opcional. */
  icon?: ReactNode;
  /**
   * `default` fica sobre o acento (branco a 18%). `destructive` sai do acento e
   * usa o vermelho do tema — ação que apaga precisa destoar da barra, não
   * combinar com ela.
   */
  variant?: "default" | "destructive";
  disabled?: boolean;
}

export interface BulkActionBarProps {
  /** Quantidade selecionada. Em 0 (ou menos) a barra não renderiza nada. */
  count: number;
  onClear: () => void;
  actions: BulkAction[];
  /**
   * Texto da contagem. Recebe `count` para resolver plural e o substantivo da
   * tela ("3 tarefas selecionadas", "3 arquivos marcados").
   */
  label?: (count: number) => string;
  clearLabel?: string;
  className?: string;
}

const rotuloPadrao = (count: number) =>
  `${count} ${count === 1 ? "item selecionado" : "itens selecionados"}`;

export function BulkActionBar({
  count,
  onClear,
  actions,
  label = rotuloPadrao,
  clearLabel = "Limpar seleção",
  className,
}: BulkActionBarProps) {
  if (count <= 0) return null;

  return (
    <div
      // `role="status"` + `aria-live` para a contagem ser anunciada a cada
      // mudança da seleção: quem navega por teclado marca linha a linha e não
      // tem como conferir o total de outro jeito.
      role="status"
      aria-live="polite"
      className={cn(
        "flex flex-wrap items-center gap-2 rounded-lg bg-primary px-3 py-[7px]",
        "text-primary-foreground shadow-sm",
        className,
      )}
    >
      <span className="text-sm font-medium">{label(count)}</span>

      {actions.map((action) => (
        <Button
          key={action.label}
          type="button"
          size="sm"
          variant="ghost"
          disabled={action.disabled}
          onClick={action.onClick}
          className={cn(
            "h-7 gap-2 focus-visible:ring-primary-foreground focus-visible:ring-offset-primary",
            action.variant === "destructive"
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90 hover:text-destructive-foreground"
              : "bg-primary-foreground/[0.18] text-primary-foreground hover:bg-primary-foreground/[0.28] hover:text-primary-foreground",
          )}
        >
          {action.icon}
          {action.label}
        </Button>
      ))}

      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={onClear}
        className="h-7 text-primary-foreground/[0.78] hover:bg-primary-foreground/[0.12] hover:text-primary-foreground focus-visible:ring-primary-foreground focus-visible:ring-offset-primary"
      >
        {clearLabel}
      </Button>
    </div>
  );
}
