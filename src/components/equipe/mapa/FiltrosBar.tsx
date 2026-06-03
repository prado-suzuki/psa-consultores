// Barra de filtros reutilizável para as páginas de cadastro.
// Renderiza uma linha de <Select> (label + dropdown) + botão "Limpar".
// O filtro de cluster é apenas mais um item na lista `filtros`.

import Select, { type SelectOption } from './Select';
import { DicaIcon } from './Tooltip';

export interface FiltroConfig {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  tooltip?: string;
}

interface FiltrosBarProps {
  filtros: FiltroConfig[];
  onLimpar: () => void;
  /** true quando algum filtro está ativo (controla a exibição do botão Limpar). */
  ativo?: boolean;
}

export default function FiltrosBar({ filtros, onLimpar, ativo }: FiltrosBarProps) {
  return (
    <div className="filtros-bar">
      {filtros.map((f) => (
        <div key={f.id} className="filtro">
          <label htmlFor={f.id}>{f.label}{f.tooltip && <DicaIcon text={f.tooltip} />}</label>
          <Select
            id={f.id}
            value={f.value}
            onChange={f.onChange}
            options={f.options}
            compact
          />
        </div>
      ))}
      {ativo && (
        <button type="button" className="btn-cancel filtros-bar-limpar" onClick={onLimpar}>
          Limpar
        </button>
      )}
    </div>
  );
}
