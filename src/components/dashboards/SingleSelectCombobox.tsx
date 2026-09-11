import { useState } from 'react';
import { defaultFilter } from 'cmdk';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Check, ChevronsUpDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { casaSemAcento } from '@/lib/buscaEmCombobox';
import type { ComboOption } from './MultiSelectCombobox';

/** Single-select com busca (Popover + Command). Para usuário/cliente no preview. */
interface SingleSelectComboboxProps {
  id?: string;
  options: ComboOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * As palavras que a busca enxerga: o rótulo sempre, mais o que a opção pedir.
 * O `value` da opção (um id) fica DE FORA de propósito — id casando com trecho
 * digitado traz cliente que não tem nada a ver com o que se procurou.
 */
function palavrasDaOpcao(option: ComboOption): string[] {
  return [option.label, ...(option.keywords ?? [])];
}

export function SingleSelectCombobox({
  id,
  options,
  value,
  onChange,
  placeholder = 'Selecionar…',
  searchPlaceholder = 'Buscar…',
  emptyText = 'Nenhum item encontrado.',
  disabled,
  className,
}: SingleSelectComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn('min-w-[260px] justify-between h-9 font-normal', className)}
        >
          <span className={cn('truncate', !selected && 'text-muted-foreground text-xs')}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        {/* A UNIÃO dos dois filtros, e a ordem importa só para o curto-circuito:
            trecho contínuo sem acento OU a pontuação por proximidade do cmdk.
            Sozinho, o do cmdk não acha "São" por "sao"; sozinho, o daqui perde
            a letra salteada que as telas que já usavam isto tinham. */}
        <Command
          filter={(_value, search, keywords) =>
            casaSemAcento(keywords ?? [], search) ? 1 : defaultFilter((keywords ?? []).join(' '), search)
          }
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  keywords={palavrasDaOpcao(opt)}
                  onSelect={() => {
                    onChange(opt.value === value ? null : opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4 shrink-0', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                  <span className="truncate text-sm">{opt.label}</span>
                  {opt.hint && <span className="ml-auto pl-2 shrink-0 text-xs text-muted-foreground">{opt.hint}</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
