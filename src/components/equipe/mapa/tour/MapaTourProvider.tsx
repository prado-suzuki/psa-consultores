// Provider que hospeda o React Joyride no Layout do MAPA.
//
// Modo NÃO-controlado (recomendado pela skill): cada tour é executado por um
// <TourRunner> remontado via `key={activeTour}`, o que garante reset limpo de
// estado entre tours sem mexer em `reset()`/stepIndex. Cada rota auto-abre o
// seu tour na 1ª visita (marca como visto na abertura — só auto-abre uma vez).

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { STATUS, useJoyride, type EventData } from 'react-joyride';
import { MapaTourContext, type MapaTourApi } from './useMapaTour';
import { resolveTour, TOURS, type TourId } from './tours';
import { TOUR_LOCALE, TOUR_OPTIONS, TOUR_STYLES } from './tourTheme';
import { isTourSeen, markTourSeen } from './tourStorage';

function TourRunner({ tour, onEnd }: { tour: TourId; onEnd: () => void }) {
  // Só roda os passos cujo alvo já existe no DOM neste momento. Sem isto, um
  // alvo condicional (lista vazia, nada selecionado, aba inativa) faz o Joyride
  // v3 falhar e auto-avançar o índice — é exatamente o "aparece o 1º, dá erro e
  // pula pro último". Filtrar de antemão deixa o tour cobrir só o que existe.
  const steps = useMemo(
    () =>
      TOURS[tour].filter((s) => {
        if (typeof s.target !== 'string') return true;
        try {
          return !!document.querySelector(s.target);
        } catch {
          return true;
        }
      }),
    [tour],
  );

  const { Tour } = useJoyride({
    steps,
    run: steps.length > 0,
    continuous: true,
    scrollToFirstStep: true,
    options: TOUR_OPTIONS,
    styles: TOUR_STYLES,
    locale: TOUR_LOCALE,
    onEvent: (data: EventData) => {
      if (data.status === STATUS.FINISHED || data.status === STATUS.SKIPPED) {
        onEnd();
      }
    },
  });

  // Nenhuma âncora presente → encerra sem renderizar nada.
  useEffect(() => {
    if (steps.length === 0) onEnd();
  }, [steps.length, onEnd]);

  return steps.length > 0 ? Tour : null;
}

export function MapaTourProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const [activeTour, setActiveTour] = useState<TourId | null>(null);

  const startTour = useCallback((id: TourId) => setActiveTour(id), []);
  const startForRoute = useCallback(
    (pathname: string) => setActiveTour(resolveTour(pathname) ?? 'welcome'),
    [],
  );

  // Auto-open: na 1ª visita de cada rota, abre o tour daquela página. Marca como
  // visto no momento da abertura → só auto-abre uma vez por tour. O pequeno
  // atraso + o targetWaitTimeout do Joyride cobrem o carregamento async.
  useEffect(() => {
    const id = resolveTour(location.pathname);
    if (!id || isTourSeen(id)) return;
    const timer = window.setTimeout(() => {
      setActiveTour((cur) => {
        if (cur) return cur; // já há um tour ativo — não interrompe
        markTourSeen(id);
        return id;
      });
    }, 600);
    return () => window.clearTimeout(timer);
  }, [location.pathname]);

  const handleEnd = useCallback(() => setActiveTour(null), []);

  const api = useMemo<MapaTourApi>(
    () => ({ startTour, startForRoute }),
    [startTour, startForRoute],
  );

  return (
    <MapaTourContext.Provider value={api}>
      {children}
      {activeTour && <TourRunner key={activeTour} tour={activeTour} onEnd={handleEnd} />}
    </MapaTourContext.Provider>
  );
}
