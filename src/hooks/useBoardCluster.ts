// Contexto + hook do seletor global de cliente (cluster) da área Board. O
// Provider vive em @/contexts/BoardClusterContext (arquivo separado por causa
// do Fast Refresh: arquivo de componente deve exportar só componentes).
//
// Espelha `useClusterGlobal` do MAPA de propósito — mesmo contrato, mesma
// semântica de '' = todos, mesma tolerância a viver fora do provider (testes de
// página isolada renderizam sem filtro em vez de quebrar).
//
// NOME: a entidade é `estrutura_clusters`; na tela ela se chama "Cliente",
// igual ao OSG Work e ao MAPA. Não renomear hook, contexto nem coluna.

import { createContext, useContext } from 'react';

export interface BoardClusterValue {
  /** UUID do cluster selecionado. '' = todos os clientes. */
  cluster: string;
  setCluster: (id: string) => void;
}

export const BoardClusterContext = createContext<BoardClusterValue>({
  cluster: '',
  setCluster: () => {},
});

export function useBoardCluster(): BoardClusterValue {
  return useContext(BoardClusterContext);
}
