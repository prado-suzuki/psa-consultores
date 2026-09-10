// Provider do tour do MAPA: hoje é só o registro daqui em cima da mecânica
// compartilhada (`@/components/tour`), que nasceu deste arquivo quando a Tax
// passou a ter os seus próprios tours. O comportamento é o mesmo de antes:
// auto-abre na 1ª visita de cada rota, roda só os passos cuja âncora existe, e
// reabre pelo "?".

import type { ReactNode } from 'react';
import { TourProvider, type RegistroDeTour } from '@/components/tour/TourProvider';
import { resolveTour, TOURS } from './tours';

const REGISTRO_MAPA: RegistroDeTour = {
  // Chave preservada: quem já viu os tours do MAPA não vai vê-los de novo.
  chave: 'mapaTourSeen',
  tours: TOURS,
  resolve: resolveTour,
  fallback: 'welcome',
};

export function MapaTourProvider({ children }: { children: ReactNode }) {
  return <TourProvider registro={REGISTRO_MAPA}>{children}</TourProvider>;
}
