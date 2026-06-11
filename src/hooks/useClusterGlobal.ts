// Contexto + hook do seletor global de Cluster do MAPA. O Provider vive em
// @/contexts/MapaClusterContext (arquivo separado para o Fast Refresh:
// arquivos de componente devem exportar só componentes).
//
// Fora do provider (ex.: testes de página isolada) o hook devolve o default
// ('' + noop), então as páginas continuam renderizando sem filtro.

import { createContext, useContext } from 'react';

export interface MapaClusterValue {
  /** UUID do cluster selecionado globalmente. '' = todos. */
  cluster: string;
  setCluster: (id: string) => void;
}

export const MapaClusterContext = createContext<MapaClusterValue>({
  cluster: '',
  setCluster: () => {},
});

export function useClusterGlobal(): MapaClusterValue {
  return useContext(MapaClusterContext);
}
