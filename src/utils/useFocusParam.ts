import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

/**
 * Lê o `focusId` passado por navegação (ex.: do diagnóstico de ROI, ao clicar
 * em "ver erro") e o consome uma única vez. A página chamadora usa o valor para
 * abrir automaticamente o modal de detalhe do item correspondente.
 *
 * Contrato: a origem navega com `navigate(rota, { state: { focusId } })`.
 * O state é limpo logo após a leitura para não reabrir o modal em re-renders
 * ou ao voltar pelo histórico.
 */
export function useFocusParam(): string | undefined {
  const loc = useLocation();
  const nav = useNavigate();
  const [focusId] = useState<string | undefined>(
    () => (loc.state as { focusId?: string } | null)?.focusId,
  );
  useEffect(() => {
    if (focusId) nav(loc.pathname, { replace: true, state: null });
    // Executa só na montagem — consome o focusId uma vez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return focusId;
}
