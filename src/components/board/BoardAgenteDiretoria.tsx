/**
 * Publica o snapshot único do Board. Montado no shell — não em cada menu.
 */
import { useContextoAgenteDiretoria } from '@/hooks/useContextoAgenteDiretoria';
import { useRegistrarContextoAgente } from '@/hooks/useAgenteContexto';
import { ESCOPO_DIRETORIA } from '@/lib/agenteEscopos';

export function BoardAgenteDiretoria() {
  const { contexto, carregando } = useContextoAgenteDiretoria();
  useRegistrarContextoAgente(ESCOPO_DIRETORIA, contexto, carregando);
  return null;
}
