// Seletor global de EMPRESA (entidade: cluster) do Board — vive numa faixa acima
// do conteúdo, igual ao OSG Work e ao MAPA, e recorta as páginas que o honram.
// '' = todas as empresas.
//
// O contexto e o hook `useBoardCluster` vivem em @/hooks/useBoardCluster (este
// arquivo exporta só o Provider, por causa do Fast Refresh).
//
// NÃO persiste entre carregamentos de página (decisão de 21/08, Bloco D/D4.1):
// persistia em localStorage, e um recorte esquecido de uma sessão anterior
// abria o Estratégico já filtrado por uma empresa sem nenhum aviso visível —
// "Áreas em um olhar" mostrava "sem projeto" nas três áreas e o card de horas
// caía a zero, e nada na tela dizia que o motivo era um filtro escondido. O
// board sempre abre em "Todas as empresas"; a escolha ainda vale enquanto a
// pessoa navega dentro da mesma sessão (o Provider fica montado por cima das
// rotas do Board), só não sobrevive a um F5 ou a uma aba nova.

import { useState, type ReactNode } from 'react';
import { BoardClusterContext } from '@/hooks/useBoardCluster';

export function BoardClusterProvider({ children }: { children: ReactNode }) {
  const [cluster, setCluster] = useState<string>('');

  return (
    <BoardClusterContext.Provider value={{ cluster, setCluster }}>
      {children}
    </BoardClusterContext.Provider>
  );
}
