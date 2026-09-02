/**
 * Provider do Agente PSA — vive acima das rotas, no `App.tsx`.
 *
 * Ele guarda o snapshot publicado pela tela atual e renderiza o balão. Só o
 * Provider fica aqui; o contexto e os hooks vivem em `@/hooks/useAgenteContexto`
 * (Fast Refresh — mesmo arranjo do `BoardClusterProvider`).
 *
 * O balão aparece SOMENTE onde alguma tela publicou contexto. É por isso que o
 * Provider pode ser global sem o agente vazar para a home pública ou para o
 * portal do cliente: sem `useRegistrarContextoAgente`, não há escopo, e sem
 * escopo não há balão.
 */
import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react';
import { AgenteContexto, type ContextoTela } from '@/hooks/useAgenteContexto';
import { AgentePsaWidget } from '@/components/agente/AgentePsaWidget';

interface Publicado {
  escopo: string;
  contexto: ContextoTela;
  carregando: boolean;
}

export function AgenteProvider({ children }: { children: ReactNode }) {
  const [publicado, setPublicado] = useState<Publicado | null>(null);
  // A tela que SAI chega ao cleanup DEPOIS da que ENTROU publicar. Escopo
  // igual (as quatro leituras do Board) não basta — o dono tem que ser o
  // mesmo registro, senão a saída apaga o snapshot novo.
  const escopoVigente = useRef<string | null>(null);
  const donoVigente = useRef<symbol | null>(null);

  const publicar = useCallback((escopo: string, contexto: ContextoTela, carregando: boolean, dono?: symbol) => {
    escopoVigente.current = escopo;
    donoVigente.current = dono ?? null;
    setPublicado({ escopo, contexto, carregando });
  }, []);

  const despublicar = useCallback((escopo: string, dono?: symbol) => {
    if (escopoVigente.current !== escopo) return;
    if (dono && donoVigente.current && dono !== donoVigente.current) return;
    escopoVigente.current = null;
    donoVigente.current = null;
    setPublicado(null);
  }, []);

  const valor = useMemo(() => ({
    escopo: publicado?.escopo ?? null,
    contexto: publicado?.contexto ?? null,
    carregando: publicado?.carregando ?? false,
    publicar,
    despublicar,
  }), [publicado, publicar, despublicar]);

  return (
    <AgenteContexto.Provider value={valor}>
      {children}
      <AgentePsaWidget />
    </AgenteContexto.Provider>
  );
}

export default AgenteProvider;
