import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";
import { parseDate } from "@/lib/dateUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDateMask, parseDateMask, isoToMasked } from "./constants";
import { CLASSE_CAMPO_PENDENTE, acessibilidadeObrigatorio } from "./MarcaPendencia";

interface DateFieldWithInputProps {
  value: string;
  onChange: (iso: string) => void;
  label?: string;
  /** A frase da falta, quando o campo obrigatório está vazio ou inválido. */
  falta?: string;
  /** Id da frase da falta, para o `aria-describedby`. Ver `MarcaPendencia`. */
  idFalta?: string;
}

const DateFieldWithInput = ({ value, onChange, label, falta, idFalta }: DateFieldWithInputProps) => {
  const [textValue, setTextValue] = useState(isoToMasked(value));

  useEffect(() => {
    setTextValue(isoToMasked(value));
  }, [value]);

  const handleTextChange = (raw: string) => {
    const masked = formatDateMask(raw);
    setTextValue(masked);
    const parsed = parseDateMask(masked);
    if (parsed) onChange(parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key.toLowerCase() === "h" && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      const today = new Date();
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, "0");
      const d = String(today.getDate()).padStart(2, "0");
      const iso = `${y}-${m}-${d}`;
      setTextValue(isoToMasked(iso));
      onChange(iso);
    }
  };

  const handleTextBlur = () => {
    if (textValue && textValue.replace(/\D/g, "").length === 8) {
      const parsed = parseDateMask(textValue);
      if (!parsed) {
        toast.error("Data inválida");
        setTextValue(isoToMasked(value));
      }
    } else if (textValue && textValue.replace(/\D/g, "").length > 0) {
      setTextValue(isoToMasked(value));
    }
  };

  return (
    <div className="flex items-center gap-1 max-w-[220px]">
      <Input
        value={textValue}
        onChange={(e) => handleTextChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleTextBlur}
        placeholder="DD/MM/AAAA"
        {...(idFalta ? acessibilidadeObrigatorio(idFalta, falta) : {})}
        className={cn("h-8 font-mono text-sm", falta && CLASSE_CAMPO_PENDENTE)}
        maxLength={10}
      />
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 pointer-events-auto" align="start">
          <Calendar
            selected={value ? parseDate(value) : undefined}
            onSelect={(date) => {
              if (date) {
                const y = date.getFullYear();
                const m = String(date.getMonth() + 1).padStart(2, "0");
                const d = String(date.getDate()).padStart(2, "0");
                onChange(`${y}-${m}-${d}`);
              }
            }}
            disabled={(date) => date.getFullYear() < 2000 || date.getFullYear() > 2060}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default DateFieldWithInput;
