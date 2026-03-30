import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check, ChevronsUpDown, X, Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface MultiSelectContasProps {
  options: Option[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
}

export function MultiSelectContas({
  options,
  selected,
  onChange,
  placeholder = "Filtrar por conta...",
}: MultiSelectContasProps) {
  const [open, setOpen] = useState(false);

  const toggle = (value: string) => {
    onChange(
      selected.includes(value)
        ? selected.filter((v) => v !== value)
        : [...selected, value]
    );
  };

  const remove = (value: string) => onChange(selected.filter((v) => v !== value));

  const selectedLabels = selected.map((v) => {
    const opt = options.find((o) => o.value === v);
    return { value: v, label: opt?.label ?? v };
  });

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-w-[280px] justify-between h-auto min-h-[36px] py-1.5 font-normal"
          >
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : (
              <div className="flex flex-wrap gap-1 mr-2">
                {selectedLabels.map((item) => (
                  <Badge
                    key={item.value}
                    variant="secondary"
                    className="text-xs font-normal max-w-[200px] truncate gap-1"
                  >
                    <span className="truncate">{item.label}</span>
                    <X
                      className="h-3 w-3 shrink-0 cursor-pointer hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(item.value);
                      }}
                    />
                  </Badge>
                ))}
              </div>
            )}
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[350px] p-0" align="start">
          <Command>
            <CommandInput placeholder="Buscar conta..." />
            <CommandList>
              <CommandEmpty>Nenhuma conta encontrada.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        selected.includes(opt.value) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate text-sm">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {selected.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onChange([])}
          className="h-8 px-2 text-xs text-muted-foreground gap-1"
        >
          <Eraser className="h-3.5 w-3.5" />
          Limpar
        </Button>
      )}
    </div>
  );
}
