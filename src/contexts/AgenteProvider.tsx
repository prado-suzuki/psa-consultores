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
  // Guarda o escopo vigente sem entrar no estado: a limpeza da tela que SAIU
  // chega depois da publicação da que ENTROU (ordem dos efeitos do React), e
  // sem esta checagem a navegação entre duas telas com agente apagaria o balão.
  const escopoVigente = useRef<string | null>(null);

  const publicar = useCallback((escopo: string, contexto: ContextoTela, carregando: boolean) => {
    escopoVigente.current = escopo;
    setPublicado({ escopo, contexto, carregando });
  }, []);

  const despublicar = useCallback((escopo: string) => {
    if (escopoVigente.current !== escopo) return;
    escopoVigente.current = null;
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
