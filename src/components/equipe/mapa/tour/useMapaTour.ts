// Contexto + hook de consumo do tour do MAPA. Vive num módulo SEM componentes
// (evita o aviso do eslint react-refresh ao exportar context + componente do
// mesmo arquivo). O provider (MapaTourProvider.tsx) preenche este contexto.

import { createContext, useContext } from 'react';
import type { TourId } from './tours';

export interface MapaTourApi {
  /** Abre um tour específico. */
  startTour: (id: TourId) => void;
  /** Abre o tour mapeado para a rota informada (fallback: welcome). */
  startForRoute: (pathname: string) => void;
}

export const MapaTourContext = createContext<MapaTourApi | null>(null);

// Fallback no-op para quando o gatilho é renderizado fora do provider (ex.:
// páginas testadas em isolamento). No app real, o provider vive no Layout do
// MAPA, então o "?" sempre funciona.
const NOOP_API: MapaTourApi = {
  startTour: () => {},
  startForRoute: () => {},
};

export function useMapaTour(): MapaTourApi {
  return useContext(MapaTourContext) ?? NOOP_API;
}
