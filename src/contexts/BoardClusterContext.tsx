// Seletor global CLUSTER -> ÁREA -> EQUIPE do Board — vive numa faixa acima
// do conteúdo, igual ao OSG Work e ao MAPA, e recorta as páginas que o honram.
// '' = todos, em qualquer nível.
//
// O contexto e o hook `useBoardCluster` vivem em @/hooks/useBoardCluster (este
// arquivo exporta só o Provider, por causa do Fast Refresh).
//
// NÃO persiste em localStorage entre carregamentos de página (decisão de
// 21/08, Bloco D/D4.1): persistia, e um recorte esquecido de uma sessão
// anterior abria o Estratégico já filtrado sem nenhum aviso visível. O board
// sempre abre em "Todos" -- mas os TRÊS níveis vivem na URL (query params
// `boardCluster`/`boardArea`/`boardEquipe`, prefixados de propósito: `?area=`
// sozinho já é usado pelo espelhamento de tema em `/equipe/chamados` e
// afins, ver `src/lib/areaTheme.ts` -- reaproveitar o mesmo nome aqui
// colidiria), então o sócio pode mandar o link do recorte, e a URL sobrevive
// a um F5 (o que o localStorage tentava fazer, do jeito errado).
//
// Trocar um nível RESETA os de baixo (cluster novo esvazia área e equipe;
// área nova esvazia equipe) -- ver Bloco G, 21/08.

import { type ReactNode, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { BoardClusterContext } from '@/hooks/useBoardCluster';

const PARAM_CLUSTER = 'boardCluster';
const PARAM_AREA = 'boardArea';
const PARAM_EQUIPE = 'boardEquipe';
const PARAM_CLIENTE = 'boardCliente';
const PARAM_ANO = 'boardAno';
const PARAM_MES = 'boardMes';

export function BoardClusterProvider({ children }: { children: ReactNode }) {
  const [params, setParams] = useSearchParams();

  const cluster = params.get(PARAM_CLUSTER) ?? '';
  const area = params.get(PARAM_AREA) ?? '';
  const equipe = params.get(PARAM_EQUIPE) ?? '';
  const cliente = params.get(PARAM_CLIENTE) ?? '';
  const ano = params.get(PARAM_ANO) ?? '';
  const mes = params.get(PARAM_MES) ?? '';

  const setCluster = useCallback((id: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set(PARAM_CLUSTER, id); else next.delete(PARAM_CLUSTER);
      next.delete(PARAM_AREA);
      next.delete(PARAM_EQUIPE);
      next.delete(PARAM_CLIENTE);
      return next;
    }, { replace: true });
  }, [setParams]);

  const setArea = useCallback((id: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set(PARAM_AREA, id); else next.delete(PARAM_AREA);
      next.delete(PARAM_EQUIPE);
      return next;
    }, { replace: true });
  }, [setParams]);

  const setEquipe = useCallback((id: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set(PARAM_EQUIPE, id); else next.delete(PARAM_EQUIPE);
      return next;
    }, { replace: true });
  }, [setParams]);

  const setCliente = useCallback((id: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set(PARAM_CLIENTE, id); else next.delete(PARAM_CLIENTE);
      return next;
    }, { replace: true });
  }, [setParams]);

  const setAno = useCallback((id: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set(PARAM_ANO, id); else next.delete(PARAM_ANO);
      if (!id) next.delete(PARAM_MES);
      return next;
    }, { replace: true });
  }, [setParams]);

  const setMes = useCallback((id: string) => {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set(PARAM_MES, id); else next.delete(PARAM_MES);
      return next;
    }, { replace: true });
  }, [setParams]);

  const value = useMemo(
    () => ({
      cluster, setCluster, area, setArea, equipe, setEquipe,
      cliente, setCliente, ano, setAno, mes, setMes,
    }),
    [cluster, setCluster, area, setArea, equipe, setEquipe, cliente, setCliente, ano, setAno, mes, setMes],
  );

  return (
    <BoardClusterContext.Provider value={value}>
      {children}
    </BoardClusterContext.Provider>
  );
}
