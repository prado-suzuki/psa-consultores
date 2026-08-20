// Contexto + hook do seletor global de cliente (cluster) da área Board. O
// Provider vive em @/contexts/BoardClusterContext (arquivo separado por causa
// do Fast Refresh: arquivo de componente deve exportar só componentes).
//
// Espelha `useClusterGlobal` do MAPA de propósito — mesmo contrato, mesma
// semântica de '' = todos, mesma tolerância a viver fora do provider (testes de
// página isolada renderizam sem filtro em vez de quebrar).
//
// NOME: a entidade é `estrutura_clusters` — daí `cluster` aqui. Na tela ela se
// chama "Empresa": a linha TEM `nome_empresa` e `cnpj`, é uma pessoa jurídica
// (ver `docs/geral/decisoes/empresa-de-faturamento-vive-no-cluster.md`), e o
// cadastro da OS já chama o mesmo campo de "Empresa / Faturamento". Não
// renomear hook, contexto nem coluna.

import { createContext, useContext } from 'react';

export interface BoardClusterValue {
  /** UUID do cluster selecionado. '' = todas as empresas. */
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
