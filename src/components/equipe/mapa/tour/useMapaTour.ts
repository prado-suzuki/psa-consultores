// Hook de consumo do tour do MAPA. O contexto é o compartilhado
// (`@/components/tour/useTour`); aqui só se estreita o tipo dos ids para os
// tours do MAPA, para o `startTour` continuar recusando id inexistente.

import { useTour, type TourApi } from '@/components/tour/useTour';
import type { TourId } from './tours';

export type MapaTourApi = TourApi<TourId>;

export function useMapaTour(): MapaTourApi {
  return useTour<TourId>();
}
