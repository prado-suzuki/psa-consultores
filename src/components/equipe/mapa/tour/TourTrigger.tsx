// Botão reutilizável para (re)abrir um tour. Sem `tourId`, abre o tour da rota
// atual (uso no header — o "?"). Com `tourId`, abre o mini-tour da página.

import { HelpCircle } from 'lucide-react';
import { useMapaTour } from './useMapaTour';
import type { TourId } from './tours';

interface Props {
  /** Tour específico. Se omitido, abre o tour da rota atual. */
  tourId?: TourId;
  className?: string;
  label?: string;
  /** Valor do atributo data-tour (ex.: "help" para virar passo do welcome). */
  dataTour?: string;
}

export default function TourTrigger({
  tourId,
  className = 'mapa-tour-trigger',
  label = 'Ver tour da página',
  dataTour,
}: Props) {
  const { startTour, startForRoute } = useMapaTour();

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
      <HelpCircle size={18} strokeWidth={2} />
    </button>
  );
}
