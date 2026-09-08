// Provider genérico do tour guiado (React Joyride v3), usado pelo layout de cada
// área. Nasceu do provider do Digital MAPA: a mecânica é a mesma, e o que muda
// por área são os passos, o mapa de rotas e o prefixo da chave de "já viu".
//
// Modo NÃO-controlado: cada tour roda num <TourRunner> remontado via
// `key={tourAtivo}`, o que garante reset limpo entre tours sem mexer em
// `reset()`/stepIndex.

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { STATUS, useJoyride, type EventData, type Options, type Step } from 'react-joyride';
import { TourContext, type TourApi } from './useTour';
import { TOUR_LOCALE, TOUR_OPTIONS, TOUR_STYLES } from './tourTheme';
import { marcarTourVisto, tourVisto } from './tourStorage';

/**
 * Passo com uma condição própria de entrada.
 *
 * `exige` existe para o passo que ABRE o que ele explica: o guia do cadastro
 * troca de aba sozinho, então a âncora do campo ainda não está no DOM quando o
 * guia começa. Nesses passos, quem decide se o passo entra é a existência da
 * ABA (que está sempre na fita), e não a do campo.
 */
export type PassoDeTour = Step & {
  /** Seletor consultado no lugar do alvo, para decidir se o passo entra. */
  exige?: string;
};

export interface RegistroDeTour {
  /** Prefixo da chave de localStorage. Um por módulo (ex.: 'taxTourSeen'). */
  chave: string;
  tours: Record<string, PassoDeTour[]>;
  /** Tour da rota, ou null quando aquela rota não tem tour próprio. */
  resolve: (pathname: string) => string | null;
  /** Tour aberto pelo "?" numa rota sem tour próprio. */
  fallback?: string;
  /**
   * Ajustes de opção do Joyride para este módulo, mesclados sobre o tema comum.
   *
   * Existe por causa do `skipBeacon`: por padrão o Joyride abre o primeiro passo
   * como um ponto pulsante, que só vira tooltip no clique. Para um guia que abre
   * sozinho isso é a tela "não acontecer nada", então a Tax pula o beacon. O
   * MAPA fica como está: lá o guia já é conhecido assim.
   */
  opcoes?: Partial<Options>;
}

function TourRunner({
  passos,
  opcoes,
  onEnd,
}: {
  passos: PassoDeTour[];
  opcoes?: Partial<Options>;
  onEnd: () => void;
}) {
  const { Tour } = useJoyride({
    steps: passos,
    run: passos.length > 0,
    continuous: true,
    scrollToFirstStep: true,
    options: { ...TOUR_OPTIONS, ...opcoes },
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

  // Abre uma vez só. `setTourAtivo(atual => atual ?? id)` é o que garante que um
  // tour em andamento não seja interrompido por outro que acabou de nascer.
  const startTourOnce = useCallback(
    (id: string) => {
      if (tourVisto(registro.chave, id)) return;
      marcarTourVisto(registro.chave, id);
      setTourAtivo((atual) => atual ?? id);
    },
    [registro],
  );
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
    const timer = window.setTimeout(() => startTourOnce(id), 700);
    return () => window.clearTimeout(timer);
  }, [location.pathname, registro, startTourOnce]);

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
      const seletor = passo.exige ?? passo.target;
      if (typeof seletor !== 'string') return true;
      try {
        return !!document.querySelector(seletor);
      } catch {
        return true;
      }
    });
  }, [tourAtivo, registro]);

  const api = useMemo<TourApi>(
    () => ({
      startTour,
      startTourOnce,
      startForRoute,
      disponivel: true,
      emAndamento: tourAtivo !== null,
    }),
    [startTour, startTourOnce, startForRoute, tourAtivo],
  );

  return (
    <TourContext.Provider value={api}>
      {children}
      {tourAtivo && (
        <TourRunner key={tourAtivo} passos={passos} opcoes={registro.opcoes} onEnd={handleEnd} />
      )}
    </TourContext.Provider>
  );
}
