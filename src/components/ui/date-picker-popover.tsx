import * as React from "react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export interface DatePickerPopoverProps {
  selected?: Date;
  onSelect?: (date: Date | undefined) => void;
  disabled?: boolean | ((date: Date) => boolean);
  placeholder?: string;
  triggerClassName?: string;
  align?: "start" | "center" | "end";
  formatStr?: string;
  children?: React.ReactNode;
  /** Extra class on PopoverContent */
  contentClassName?: string;
}

function DatePickerPopover({
  selected,
  onSelect,
  disabled,
  placeholder = "Selecione...",
  triggerClassName,
  align = "start",
  formatStr,
  children,
  contentClassName,
}: DatePickerPopoverProps) {
  const [open, setOpen] = useState(false);

  const handleSelect = (date: Date | undefined) => {
    onSelect?.(date);
    setOpen(false);
  };

  const formattedDate = selected
    ? format(selected, formatStr || "dd/MM/yyyy", { locale: ptBR })
    : null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      {children ? (
        <PopoverTrigger asChild>{children}</PopoverTrigger>
      ) : (
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full pl-3 text-left font-normal justify-start",
              !selected && "text-muted-foreground",
              triggerClassName,
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
            {formattedDate || <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
      )}
      <PopoverContent className={cn("w-auto p-0", contentClassName)} align={align}>
        <Calendar
          selected={selected}
          onSelect={handleSelect}
          disabled={disabled}
        />
      </PopoverContent>
    </Popover>
  );
}

DatePickerPopover.displayName = "DatePickerPopover";

export { DatePickerPopover };
