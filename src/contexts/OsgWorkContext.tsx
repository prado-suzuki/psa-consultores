import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';

interface OsgWorkState {
  clienteId: string;
  setClienteId: (id: string) => void;
}

const OsgWorkContext = createContext<OsgWorkState | null>(null);
const PARAM_CLIENTE = 'cliente';

export const OsgWorkProvider = ({ children }: { children: ReactNode }) => {
  const [params, setParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();

  const clienteNaUrl = params.get(PARAM_CLIENTE) ?? '';

  /**
   * CD-11: a URL é a fonte persistente do cliente do OSG Work.
   *
   * Não há useState nem localStorage. O ref abaixo existe só para uma transição
   * de rota já iniciada dentro do módulo: vários links antigos usam
   * `navigate(path)` e, por isso, o React Router entrega por um render o novo
   * pathname sem a query anterior. O ref transporta o cliente por esse único
   * PUSH/REPLACE e o grava de volta imediatamente na URL.
   *
   * Ele não sobrevive a reload e não vence navegação POP (voltar/avançar):
   * nesses casos a própria URL decide o estado, como a decisão exige.
   */
  const ultimoClienteDaRota = useRef(clienteNaUrl);
  const pathnameAnterior = useRef(location.pathname);
  const mudouDeRota = pathnameAnterior.current !== location.pathname;

  const clienteId =
    clienteNaUrl
    || (mudouDeRota && navigationType !== 'POP' ? ultimoClienteDaRota.current : '');

  useEffect(() => {
    const mudou = pathnameAnterior.current !== location.pathname;
    pathnameAnterior.current = location.pathname;

    if (clienteNaUrl) {
      ultimoClienteDaRota.current = clienteNaUrl;
      return;
    }

    // Voltar/avançar respeita exatamente a URL histórica. Também cobre o
    // primeiro carregamento, cujo tipo é POP.
    if (!mudou || navigationType === 'POP') {
      if (navigationType === 'POP') ultimoClienteDaRota.current = '';
      return;
    }

    const clienteAnterior = ultimoClienteDaRota.current;
    if (!clienteAnterior) return;

    setParams((atuais) => {
      const proximos = new URLSearchParams(atuais);
      proximos.set(PARAM_CLIENTE, clienteAnterior);
      return proximos;
    }, { replace: true });
  }, [clienteNaUrl, location.pathname, navigationType, setParams]);

  const setClienteId = useCallback((id: string) => {
    ultimoClienteDaRota.current = id;
    setParams((atuais) => {
      const proximos = new URLSearchParams(atuais);
      if (id) proximos.set(PARAM_CLIENTE, id);
      else proximos.delete(PARAM_CLIENTE);
      return proximos;
    }, { replace: true });
  }, [setParams]);

  const value = useMemo(
    () => ({ clienteId, setClienteId }),
    [clienteId, setClienteId],
  );

  return (
    <OsgWorkContext.Provider value={value}>
      {children}
    </OsgWorkContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useOsgWork = () => {
  const ctx = useContext(OsgWorkContext);
  if (!ctx) throw new Error('useOsgWork must be used within OsgWorkProvider');
  return ctx;
};
