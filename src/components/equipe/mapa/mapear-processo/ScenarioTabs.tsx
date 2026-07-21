import { motion } from 'framer-motion';
import { Tooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';

export type MapearAba = 'como-era' | 'como-ficou';

interface Props {
  aba: MapearAba;
  onAba: (aba: MapearAba) => void;
}

const ABAS = [
  { id: 'como-era', label: 'Como era' },
  { id: 'como-ficou', label: 'Como ficou' },
] as const;

export function ScenarioTabs({ aba, onAba }: Props) {
  return (
    <div className="mapear-tabs" role="tablist" data-tour="mapear-tabs">
      {ABAS.map(item => {
        const ativa = aba === item.id;
        return (
          <button
            key={item.id}
            role="tab"
            aria-selected={ativa}
            className={`mapear-tab${ativa ? ' ativa' : ''}`}
            onClick={() => onAba(item.id)}
          >
            <Tooltip text={dica(item.id === 'como-era' ? 'mapear.aba.comoEra' : 'mapear.aba.comoFicou')}>
              {item.label}
            </Tooltip>
            {ativa && (
              <motion.span
                layoutId="mapearTabInd"
                className="mapear-tab-ind"
                transition={{ type: 'spring', stiffness: 420, damping: 34 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
