// Seletor global de EMPRESA (entidade: cluster) do Board — vive numa faixa acima
// do conteúdo, igual ao OSG Work e ao MAPA, e recorta as páginas que o honram.
// '' = todas as empresas.
//
// O contexto e o hook `useBoardCluster` vivem em @/hooks/useBoardCluster (este
// arquivo exporta só o Provider, por causa do Fast Refresh).

import { useEffect, useState, type ReactNode } from 'react';
import { BoardClusterContext } from '@/hooks/useBoardCluster';

const STORAGE_KEY = 'boardClusterGlobal';

export function BoardClusterProvider({ children }: { children: ReactNode }) {
  const [cluster, setCluster] = useState<string>(() => {
    try { return localStorage.getItem(STORAGE_KEY) || ''; } catch { return ''; }
  });

  useEffect(() => {
    try {
      if (cluster) localStorage.setItem(STORAGE_KEY, cluster);
      else localStorage.removeItem(STORAGE_KEY);
    } catch { /* ignore quota/private mode */ }
  }, [cluster]);

  return (
    <BoardClusterContext.Provider value={{ cluster, setCluster }}>
      {children}
    </BoardClusterContext.Provider>
  );
}
