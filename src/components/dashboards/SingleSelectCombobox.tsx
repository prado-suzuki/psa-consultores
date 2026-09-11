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
      {/* A largura SEGUE o gatilho, e o piso tem teto dentro dele.
          Os 320px cravados de antes não acompanhavam nada: num campo de 410px
          a lista ficava estreita e truncava nome que caberia inteiro, e com a
          fonte do navegador aumentada o texto crescia e a caixa não. O
          `--radix-popover-trigger-width` é medido pelo Radix no gatilho, então
          a lista passa a ter a largura do campo em qualquer breakpoint.

          O piso de `20rem` é o mesmo 320px de antes na fonte padrão (nenhuma
          tela que já usava o componente fica com a lista MAIS estreita do que
          estava) e escala junto com a fonte. O teto mora DENTRO do `min()` e
          não num `max-w` separado porque, no CSS, `min-width` vence
          `max-width`: medido em 11/09/2026, `min-w-[20rem]` com fonte de 20px
          dava lista de 400px numa viewport de 390px, com `max-w` declarado e
          ignorado. */}
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[min(20rem,calc(100vw-2rem))] p-0" align="start">
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
                  className="group"
                  onSelect={() => {
                    onChange(opt.value === value ? null : opt.value);
                    setOpen(false);
                  }}
                >
                  <Check className={cn('mr-2 h-4 w-4 shrink-0', value === opt.value ? 'opacity-100' : 'opacity-0')} />
                  {/* O `hint` desce para a linha de baixo em vez de disputar a
                      largura com o rótulo: à direita, ele truncava o nome
                      (“Tapajós Participaçõ…”) justamente quando o nome é o que
                      distingue um item do outro. E ele TROCA de cor quando o
                      item está sob o cursor: `muted-foreground` é token de
                      superfície clara, e a linha ativa vira tom cheio — ali o
                      CNPJ ficava ilegível. */}
                  <div className="flex min-w-0 flex-col">
                    <span className="break-words text-sm">{opt.label}</span>
                    {opt.hint && (
                      <span className="truncate text-xs text-muted-foreground group-data-[selected=true]:text-accent-foreground/80">
                        {opt.hint}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
