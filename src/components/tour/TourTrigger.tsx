// Botão que (re)abre um tour. Sem `tourId`, abre o tour da rota atual — é o uso
// do "?" no header. Com `tourId`, abre o tour daquele modal ou daquele bloco.

import { HelpCircle } from 'lucide-react';
import { useTour } from './useTour';

export interface TourTriggerProps {
  /** Tour específico. Omitido, abre o da rota atual. */
  tourId?: string;
  className?: string;
  label?: string;
  /** Valor do `data-tour`, para o próprio botão poder ser passo de um tour. */
  dataTour?: string;
  tamanho?: number;
}

export default function TourTrigger({
  tourId,
  className,
  label = 'Ver o guia desta tela',
  dataTour,
  tamanho = 18,
}: TourTriggerProps) {
  const { startTour, startForRoute } = useTour();

  const handleClick = () => {
    if (tourId) startTour(tourId);
    else startForRoute(window.location.pathname);
  };

  return (
    <button
      type="button"
      className={className}
      onClick={handleClick}
      aria-label={label}
      title={label}
      data-tour={dataTour}
    >
      <HelpCircle size={tamanho} strokeWidth={2} />
    </button>
  );
}
