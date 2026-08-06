// A marca de campo obrigatório em falta: moldura vermelha e frase curta.
//
// Existe como peça própria porque a mesma marca aparece em quatro abas e em
// campos de tipos diferentes (texto, lista suspensa, seleção por diálogo). Se
// cada aba escrevesse a sua, o vermelho de uma não seria o vermelho da outra.
//
// A frase vem de `camposObrigatorios`, que é quem sabe onde está a falta. Aqui
// só se decide como ela aparece. Nada é exibido antes da primeira tentativa de
// salvar: marcar de vermelho um cadastro recém-começado é castigar quem começou.
import { AlertCircle } from 'lucide-react';

/** Aplicada ao campo (Input, SelectTrigger, área de seleção) que está em falta. */
export const CLASSE_CAMPO_PENDENTE = 'border-destructive focus-visible:ring-destructive';

export interface MarcaPendenciaProps {
  /** A frase da falta. Sem ela nada é renderizado, e o chamador não precisa de `&&`. */
  children?: string;
}

export default function MarcaPendencia({ children }: MarcaPendenciaProps) {
  if (!children) return null;
  return (
    <p className="mt-1 flex items-start gap-1.5 text-xs text-destructive">
      <AlertCircle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}
