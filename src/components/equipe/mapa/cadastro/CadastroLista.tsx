// Container da lista compacta de cadastro + roteamento dos empty states:
// sem registros → convite ao cadastro; busca sem resultado → versão compacta.

import type { ReactNode } from 'react';

interface Props {
  /** Nenhum registro no escopo atual (independente da busca). */
  vazio: boolean;
  /** Há registros, mas a busca não encontrou nenhum. */
  semResultadoBusca: boolean;
  emptyState: ReactNode;
  semResultados: ReactNode;
  children: ReactNode;
}

export default function CadastroLista({ vazio, semResultadoBusca, emptyState, semResultados, children }: Props) {
  if (vazio) return <>{emptyState}</>;
  if (semResultadoBusca) return <>{semResultados}</>;
  return <div className="cadastro-lista list-stagger">{children}</div>;
}
