import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown, X, Eraser, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ComboOption {
  value: string;
  label: string;
}

/**
 * Multiselect com busca (Popover + Command). Escala para listas grandes
 * (clusters/clientes) sem virar uma parede de checkboxes. Genérico — labels
 * configuráveis.
 */
interface MultiSelectComboboxProps {
  options: ComboOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  /** Texto do atalho "+ adicionar" que indica que dá pra incluir mais itens. */
  addLabel?: string;
  className?: string;
}

export function MultiSelectCombobox({
  options,
  selected,
  onChange,
  placeholder = 'Clique para adicionar…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Nenhum item encontrado.',
  addLabel = 'adicionar',
  className,
}: MultiSelectComboboxProps) {
  const [open, setOpen] = useState(false);

  const toggle = (value: string) =>
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  const remove = (value: string) => onChange(selected.filter((v) => v !== value));

  const selectedLabels = selected.map((v) => ({ value: v, label: options.find((o) => o.value === v)?.label ?? v }));

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-[260px] justify-between h-auto min-h-[34px] py-1.5 font-normal hover:bg-background"
          >
            {selected.length === 0 ? (
              <span className="text-muted-foreground text-xs inline-flex items-center gap-1">
                <Plus className="h-3.5 w-3.5" />{placeholder}
              </span>
            ) : (
              <div className="flex flex-wrap items-center gap-1 mr-2">
                {selectedLabels.map((item) => (
                  <Badge key={item.value} variant="secondary" className="text-xs font-normal max-w-[180px] truncate gap-1">
                    <span className="truncate">{item.label}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label={`Remover ${item.label}`}
                      className="inline-flex cursor-pointer items-center justify-center"
                      onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); remove(item.value); }}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); remove(item.value); } }}
                    >
                      <X className="h-3 w-3 shrink-0 hover:text-destructive" />
                    </span>
                  </Badge>
                ))}
                <span className="inline-flex items-center gap-0.5 text-[11px] font-medium text-teal-600">
                  <Plus className="h-3 w-3" />{addLabel}
                </span>
              </div>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[320px] p-0" align="start">
          <Command>
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList>
              <CommandEmpty>{emptyText}</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem key={opt.value} value={opt.label} onSelect={() => toggle(opt.value)}>
                    <Check className={cn('mr-2 h-4 w-4 shrink-0', selected.includes(opt.value) ? 'opacity-100' : 'opacity-0')} />
                    <span className="truncate text-sm">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => onChange([])} className="h-8 px-2 text-xs text-muted-foreground gap-1">
          <Eraser className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
