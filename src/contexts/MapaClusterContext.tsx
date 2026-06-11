// Seletor global de Cluster do MAPA — vive no header do Layout e filtra
// todas as páginas (Projetos, Responsáveis, Gargalos, Processos, Melhorias,
// Cascata, Dashboard ROI, Evolução do Setor). '' = todos os clusters.
//
// O contexto e o hook useClusterGlobal vivem em @/hooks/useClusterGlobal
// (este arquivo exporta só o Provider, por causa do Fast Refresh).

import { useEffect, useState, type ReactNode } from 'react';
import { MapaClusterContext } from '@/hooks/useClusterGlobal';

const STORAGE_KEY = 'mapaClusterGlobal';

export function MapaClusterProvider({ children }: { children: ReactNode }) {
  const [cluster, setCluster] = useState<string>(() => localStorage.getItem(STORAGE_KEY) || '');

  useEffect(() => {
    if (cluster) localStorage.setItem(STORAGE_KEY, cluster);
    else localStorage.removeItem(STORAGE_KEY);
  }, [cluster]);

  return (
    <MapaClusterContext.Provider value={{ cluster, setCluster }}>
      {children}
    </MapaClusterContext.Provider>
  );
}
