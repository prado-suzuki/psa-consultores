// "Já viu o tour" do MAPA. A mecânica é compartilhada
// (`@/components/tour/tourStorage`); aqui fica fixo o prefixo da chave, que é o
// que mantém as flags de quem já rodou os tours do MAPA valendo
// (`mapaTourSeen:<id>:v1`).

import { marcarTourVisto, tourVisto } from '@/components/tour/tourStorage';

const PREFIXO = 'mapaTourSeen';

export function isTourSeen(id: string): boolean {
  return tourVisto(PREFIXO, id);
}

export function markTourSeen(id: string): void {
  marcarTourVisto(PREFIXO, id);
}
