import { Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

export interface PersonOption {
  id: string;
  first_name: string;
  last_name: string;
}

interface PeopleMultiSelectProps {
  options: PersonOption[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  onSelectAll?: () => void;
  placeholder?: string;
  emptyText?: string;
  badgeClassName?: string;
}

/** Seleção múltipla de pessoas (líderes/membros) via popover com busca. */
export function PeopleMultiSelect({
  options, selectedIds, onToggle, onSelectAll,
  placeholder = 'Selecionar...', emptyText = 'Ninguém encontrado.', badgeClassName,
}: PeopleMultiSelectProps) {
  const selectedSet = new Set(selectedIds);
  const allSelected = options.length > 0 && options.every(option => selectedSet.has(option.id));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" className="w-full justify-between h-auto min-h-9 hover:bg-background hover:text-foreground">
          {selectedIds.length > 0
            ? <div className="flex flex-wrap gap-1">{options.filter(option => selectedSet.has(option.id)).map(option => (
                <Badge key={option.id} variant="outline" className={badgeClassName}>{option.first_name} {option.last_name}</Badge>
              ))}</div>
            : <span className="text-muted-foreground text-sm">{placeholder}</span>}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Buscar..." />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {onSelectAll && options.length > 0 && (
                <CommandItem value="__select_all__" onSelect={onSelectAll}>
                  <Check className={`mr-2 h-4 w-4 ${allSelected ? 'opacity-100' : 'opacity-0'}`} />
                  <span className="font-medium">Selecionar todos</span>
                </CommandItem>
              )}
              {options.map(option => (
                <CommandItem key={option.id} value={`${option.first_name} ${option.last_name}`} onSelect={() => onToggle(option.id)}>
                  <Check className={`mr-2 h-4 w-4 ${selectedSet.has(option.id) ? 'opacity-100' : 'opacity-0'}`} />
                  {option.first_name} {option.last_name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
