import { ChevronDown } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface FilterMultiSelectFieldProps<T extends string> {
  id: string;
  icon: LucideIcon;
  options: { value: T; label: string }[];
  selected: T[];
  onToggle: (value: T) => void;
  /** Rótulo do gatilho quando nada está marcado (ex.: "Todos os status"). */
  allLabel: string;
  /** Complemento do gatilho com 2+ marcados (ex.: "status selecionados"). */
  manyLabel: string;
}

/**
 * Seleção múltipla em lista suspensa, com o gatilho na mesma altura fixa do
 * `SelectTrigger`: mantém o filtro multivalor sem empilhar uma checkbox por
 * opção dentro do painel.
 */
export const FilterMultiSelectField = <T extends string>({
  id, icon: Icon, options, selected, onToggle, allLabel, manyLabel,
}: FilterMultiSelectFieldProps<T>) => {
  const summary = selected.length === 0
    ? allLabel
    : selected.length === 1
      ? options.find(option => option.value === selected[0])?.label ?? allLabel
      : `${selected.length} ${manyLabel}`;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <Icon className="mr-2 h-4 w-4 shrink-0" />
          <span className="truncate">{summary}</span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="max-h-72 w-[--radix-popover-trigger-width] overflow-y-auto p-1">
        {options.map(option => (
          <label
            key={option.value}
            className="flex min-h-9 cursor-pointer items-center gap-3 rounded-sm px-2 text-sm transition-colors hover:bg-muted/70 has-[[data-state=checked]]:bg-primary/5"
          >
            <Checkbox checked={selected.includes(option.value)} onCheckedChange={() => onToggle(option.value)} />
            <span>{option.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
};
