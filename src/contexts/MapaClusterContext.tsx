// Seletor global de Cluster do MAPA — vive no header do Layout e filtra
// todas as páginas (Projetos, Responsáveis, Gargalos, Processos, Melhorias,
// Cascata, Dashboard ROI, Evolução do Setor). '' = todos os clusters.
//
// Fora do provider (ex.: testes de página isolada) o hook devolve o default
// ('' + noop), então as páginas continuam renderizando sem filtro.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

const STORAGE_KEY = 'mapaClusterGlobal';

interface MapaClusterValue {
  /** UUID do cluster selecionado globalmente. '' = todos. */
  cluster: string;
  setCluster: (id: string) => void;
}

const MapaClusterContext = createContext<MapaClusterValue>({
  cluster: '',
  setCluster: () => {},
});

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

export function useClusterGlobal(): MapaClusterValue {
  return useContext(MapaClusterContext);
}
