// Botão "?" do MAPA. O componente é o compartilhado
// (`@/components/tour/TourTrigger`); aqui ficam os padrões daqui: a classe do
// CSS do módulo e o rótulo, além do tipo estreito do id.

import TourTriggerBase from '@/components/tour/TourTrigger';
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
  return (
    <TourTriggerBase tourId={tourId} className={className} label={label} dataTour={dataTour} />
  );
}
