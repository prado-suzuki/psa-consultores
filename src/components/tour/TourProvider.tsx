// Provider genérico do tour guiado (React Joyride v3), usado pelo layout de cada
// área. Nasceu do provider do Digital MAPA: a mecânica é a mesma, e o que muda
// por área são os passos, o mapa de rotas e o prefixo da chave de "já viu".
//
// Modo NÃO-controlado: cada tour roda num <TourRunner> remontado via
// `key={tourAtivo}`, o que garante reset limpo entre tours sem mexer em
// `reset()`/stepIndex.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { STATUS, useJoyride, type EventData, type Step } from 'react-joyride';
import { TourContext, type TourApi } from './useTour';
import { TOUR_LOCALE, TOUR_OPTIONS, TOUR_STYLES } from './tourTheme';
import { marcarTourVisto, tourVisto } from './tourStorage';

export interface RegistroDeTour {
  /** Prefixo da chave de localStorage. Um por módulo (ex.: 'taxTourSeen'). */
  chave: string;
  tours: Record<string, Step[]>;
  /** Tour da rota, ou null quando aquela rota não tem tour próprio. */
  resolve: (pathname: string) => string | null;
  /** Tour aberto pelo "?" numa rota sem tour próprio. */
  fallback?: string;
}

function TourRunner({ passos, onEnd }: { passos: Step[]; onEnd: () => void }) {
  const { Tour } = useJoyride({
    steps: passos,
    run: passos.length > 0,
    continuous: true,
    scrollToFirstStep: true,
    options: TOUR_OPTIONS,
    styles: TOUR_STYLES,
    locale: TOUR_LOCALE,
    onEvent: (data: EventData) => {
      if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) onEnd();
    },
  });

  // Nenhuma âncora presente → encerra sem renderizar nada.
  useEffect(() => {
    if (passos.length === 0) onEnd();
  }, [passos.length, onEnd]);

  return passos.length > 0 ? Tour : null;
}

export function TourProvider({
  registro,
  children,
}: {
  registro: RegistroDeTour;
  children: ReactNode;
}) {
  const location = useLocation();
  const [tourAtivo, setTourAtivo] = useState<string | null>(null);

  const startTour = useCallback((id: string) => setTourAtivo(id), []);
  const startForRoute = useCallback(
    (pathname: string) => {
      const id = registro.resolve(pathname) ?? registro.fallback ?? null;
      if (id) setTourAtivo(id);
    },
    [registro],
  );

  // Auto-abre na 1ª visita de cada rota. Marca como visto no momento da abertura
  // → só auto-abre uma vez. O atraso cobre o carregamento assíncrono da tela.
  useEffect(() => {
    const id = registro.resolve(location.pathname);
    if (!id || tourVisto(registro.chave, id)) return;
    const timer = window.setTimeout(() => {
      setTourAtivo((atual) => {
        if (atual) return atual; // já há tour rodando — não interrompe
        marcarTourVisto(registro.chave, id);
        return id;
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [location.pathname, registro]);

  const handleEnd = useCallback(() => setTourAtivo(null), []);

  /**
   * Só entram os passos cuja âncora já está no DOM. Sem esse filtro, um alvo
   * condicional (lista vazia, aba que o papel não vê, modal fechado) faz o
   * Joyride v3 falhar e pular para o último passo. Na Tax isso é o que faz o
   * mesmo tour servir para líder e para sublíder: quem não vê a aba de OS
   * simplesmente não recebe os passos dela.
   */
  const passos = useMemo(() => {
    if (!tourAtivo) return [];
    return (registro.tours[tourAtivo] ?? []).filter((passo) => {
      if (typeof passo.target !== 'string') return true;
      try {
        return !!document.querySelector(passo.target);
      } catch {
        return true;
      }
    });
  }, [tourAtivo, registro]);

  const api = useMemo<TourApi>(() => ({ startTour, startForRoute }), [startTour, startForRoute]);

  return (
    <TourContext.Provider value={api}>
      {children}
      {tourAtivo && <TourRunner key={tourAtivo} passos={passos} onEnd={handleEnd} />}
    </TourContext.Provider>
  );
}
