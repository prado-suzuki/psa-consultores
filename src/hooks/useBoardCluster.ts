// Contexto + hook do seletor global CLUSTER -> ÁREA -> EQUIPE da área Board.
// O Provider vive em @/contexts/BoardClusterContext (arquivo separado por
// causa do Fast Refresh: arquivo de componente deve exportar só componentes).
//
// Espelha `useClusterGlobal` do MAPA de propósito — mesmo contrato, mesma
// semântica de '' = todos, mesma tolerância a viver fora do provider (testes de
// página isolada renderizam sem filtro em vez de quebrar).
//
// NOME: a entidade do nível 1 é `estrutura_clusters` — daí `cluster` aqui. Não
// é "Empresa" (ver comentário de `BoardClusterBar.tsx`: os campos que
// projetariam isso, `nome_empresa`/`cnpj`, foram populados por script de
// semente, não por cadastro real). É rotulado "Cluster" na tela, porque a
// cascata (Bloco G, 21/08) introduz um nível 2 chamado "Área"
// (`estrutura_areas`) e um nível 3 chamado "Equipe" (`estrutura_equipes`) —
// usar "Área" nos dois níveis 1 e 2 confundiria. Não renomear hook, contexto
// nem coluna.
//
// area/equipe RESETAM ao trocar o nível de cima (ver `BoardClusterContext`).
// Os três valores vivem também na URL (query params `cluster`/`area`/
// `equipe`), para o sócio poder mandar o link do recorte.

import { createContext, useContext } from 'react';

export interface BoardClusterValue {
  /** UUID do cluster selecionado. '' = todos. */
  cluster: string;
  setCluster: (id: string) => void;
  /** UUID da área selecionada (dentro do cluster). '' = todas as do cluster. */
  area: string;
  setArea: (id: string) => void;
  /** UUID da equipe selecionada (dentro da área). '' = todas as da área. */
  equipe: string;
  setEquipe: (id: string) => void;
}

export const BoardClusterContext = createContext<BoardClusterValue>({
  cluster: '',
  setCluster: () => {},
  area: '',
  setArea: () => {},
  equipe: '',
  setEquipe: () => {},
});

export function useBoardCluster(): BoardClusterValue {
  return useContext(BoardClusterContext);
}
