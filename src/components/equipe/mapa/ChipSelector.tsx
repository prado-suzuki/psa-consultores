import Select from './Select';
import DecimalInput from './DecimalInput';
import type { DocRef, PessoaRef, ResponsavelEtapa } from '@/types';
import { IconTooltip } from '@/components/equipe/mapa/Tooltip';
import { dica } from '@/utils/tooltips';

type ChipItem = DocRef | PessoaRef | ResponsavelEtapa | string;

interface ChipSelectorProps {
  options: string[];
  value: ChipItem[];
  onChange: (items: ChipItem[]) => void;
  withVolume?: boolean;
  withHours?: boolean;
  compact?: boolean;
  addLabel?: string;
  /** Abre o cadastro da entidade direto da lista suspensa ("+ Cadastrar novo"). */
  onAddNew?: () => void;
  addNewLabel?: string;
}

const isString = (v: ChipItem): v is string => typeof v === 'string';
const isResponsavelEtapa = (v: ChipItem): v is ResponsavelEtapa =>
  !isString(v) && Object.prototype.hasOwnProperty.call(v, 'horas');
const isDocRef = (v: ChipItem): v is DocRef =>
  !isString(v) && Object.prototype.hasOwnProperty.call(v, 'volume');

function parseNumberLocale(str: string): number {
  return parseFloat(str.replace(/[^0-9,.-]/g, '').replace(',', '.')) || 0;
}

export default function ChipSelector({
  options,
  value,
  onChange,
  withVolume,
  withHours,
  compact,
  addLabel = 'Adicionar',
  onAddNew,
  addNewLabel = 'Cadastrar novo',
}: ChipSelectorProps) {
  const getNome = (item: ChipItem) => (isString(item) ? item : item.nome);

  const handleAdd = () => {
    if (withVolume) {
      onChange([...value, { nome: '', volume: 0 } as DocRef]);
    } else if (withHours) {
      onChange([...value, { nome: '', horas: 0 } as ResponsavelEtapa]);
    } else {
      onChange([...value, '']);
    }
  };

  const handleRemove = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
  };

  const handleChangeNome = (index: number, nome: string) => {
    if (!nome) return;
    const currentNames = value.map(getNome);
    const otherNames = currentNames.filter((_, i) => i !== index);
    if (otherNames.includes(nome)) return;
    const newValue = [...value];
    const item = newValue[index];
    if (withVolume && !isString(item)) {
      newValue[index] = { ...(item as DocRef), nome };
    } else if (withHours && !isString(item)) {
      newValue[index] = { ...(item as ResponsavelEtapa), nome };
    } else {
      newValue[index] = nome;
    }
    onChange(newValue);
  };

  const handleChangeVolume = (index: number, volumeStr: string) => {
    if (!withVolume) return;
    const newValue = [...value];
    const item = newValue[index];
    if (!isString(item)) {
      newValue[index] = { ...(item as DocRef), volume: parseNumberLocale(volumeStr) };
      onChange(newValue);
    }
  };

  const handleChangeHoras = (index: number, horasStr: string) => {
    if (!withHours) return;
    const newValue = [...value];
    const item = newValue[index];
    if (!isString(item)) {
      const num = parseNumberLocale(horasStr);
      newValue[index] = { ...(item as ResponsavelEtapa), horas: num };
      onChange(newValue);
    }
  };

  return (
    <div>
      <div className="chip-list-editable">
        {value.map((item, index) => {
          const nome = getNome(item);
          const currentNames = value.map(getNome);
          const otherNames = currentNames.filter((_, i) => i !== index);
          return (
            <div key={index} className="chip-editable-row">
              <Select
                value={nome}
                onChange={(v) => handleChangeNome(index, v)}
                options={options.map((o) => ({ value: o, label: o, disabled: otherNames.includes(o) }))}
                placeholder="Selecione..."
                compact={compact}
                footerAction={onAddNew ? { label: addNewLabel, onClick: onAddNew } : undefined}
              />
              {withVolume && isDocRef(item) && (
                <DecimalInput
                  className="chip-vol-input"
                  placeholder="Volume"
                  title={dica('comum.volume')}
                  value={item.volume}
                  onChange={(n) => handleChangeVolume(index, String(n))}
                />
              )}
              {withHours && isResponsavelEtapa(item) && (
                <DecimalInput
                  className="chip-vol-input"
                  placeholder="Horas"
                  title={dica('comum.horas')}
                  value={item.horas || 0}
                  onChange={(n) => handleChangeHoras(index, String(n))}
                />
              )}
              <IconTooltip label={`Remover ${nome || 'item'}`} side="bottom">
                <button
                  type="button"
                  className="btn-chip-remove"
                  onClick={() => handleRemove(index)}
                  aria-label={`Remover ${nome || 'item'}`}
                >
                  &times;
                </button>
              </IconTooltip>
            </div>
          );
        })}
      </div>
      <div className="chip-selector-add">
        <IconTooltip label={addLabel} side="bottom">
          <button
            type="button"
            className="btn-chip-add"
            onClick={handleAdd}
            disabled={options.length === 0 && !onAddNew}
          >
            {addLabel}
          </button>
        </IconTooltip>
      </div>
    </div>
  );
}
