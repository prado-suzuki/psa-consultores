// Contexto + hook de consumo do tour guiado. Vive num módulo SEM componentes
// (evita o aviso do eslint react-refresh ao exportar contexto e componente do
// mesmo arquivo). Quem preenche é o `TourProvider`.

import { createContext, useContext } from 'react';

export interface TourApi<Id extends string = string> {
  /** Abre um tour específico. */
  startTour: (id: Id) => void;
  /** Abre o tour mapeado para a rota informada. */
  startForRoute: (pathname: string) => void;
}

export const TourContext = createContext<TourApi | null>(null);

// Fallback no-op para quando o gatilho é renderizado fora do provider (ex.:
// componente testado em isolamento). No app real o provider vive no layout da
// área, então o "?" sempre funciona.
const API_INERTE: TourApi = {
  startTour: () => {},
  startForRoute: () => {},
};

/**
 * O parâmetro de tipo estreita os ids para o módulo que chama (`useTour<TourId>()`),
 * mantendo um único contexto: os ids válidos são os do registro que montou o
 * provider daquela árvore, e é ele quem define o tipo do lado de fora.
 */
export function useTour<Id extends string = string>(): TourApi<Id> {
  return (useContext(TourContext) ?? API_INERTE) as TourApi<Id>;
}
